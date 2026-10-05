"use server";

import { compare } from "bcryptjs";
import { Prisma, type ChecklistPhase, type ChecklistResult, type PaymentMethod, Role, type ServiceOrderStatus } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { digits, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/rate-limit";
import { checklistItems } from "@/lib/service";

const loginLimit = { limit: 5, lockMs: 15 * 60 * 1000, windowMs: 15 * 60 * 1000 };

async function loginKey(email: string) {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip") || headerList.get("cf-connecting-ip") || "local";
  return `login:${ip}:${email}`;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const key = await loginKey(email || "empty");
  const limit = checkRateLimit(key, loginLimit);
  if (!limit.allowed) redirect("/login?erro=Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  if (!email || password.length < 8 || password.length > 128) {
    recordRateLimitFailure(key, loginLimit);
    redirect("/login?erro=Credenciais inválidas");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await compare(password, user.passwordHash))) {
    recordRateLimitFailure(key, loginLimit);
    redirect("/login?erro=Credenciais inválidas");
  }
  clearRateLimit(key);
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createCustomerAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = digits(formData.get("phone"));
  const cpf = digits(formData.get("cpf")) || null;
  if (name.length < 2 || phone.length < 8) redirect("/clientes?erro=Informe nome e telefone válidos");
  try {
    await prisma.customer.create({ data: { name, phone, cpf, email: String(formData.get("email") ?? "").trim() || null } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/clientes?erro=CPF já cadastrado");
    }
    throw error;
  }
  revalidatePath("/clientes");
  redirect("/clientes?ok=Cliente cadastrado");
}

export async function createInventoryAction(formData: FormData) {
  const user = await requireUser();
  const imei1 = digits(formData.get("imei1"));
  const serialNumber = String(formData.get("serialNumber") ?? "").trim().toUpperCase() || null;
  const model = String(formData.get("model") ?? "").trim();
  const storage = String(formData.get("storage") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const purchaseCost = money(formData.get("purchaseCost"));
  const salePrice = money(formData.get("salePrice"));
  if (imei1.length !== 15 || !model || !storage || !color || salePrice <= 0) {
    redirect("/estoque/novo?erro=Revise IMEI, produto e valores");
  }
  try {
    await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.upsert({
        where: { brand_model_storage_color: { brand: "Apple", model, storage, color } },
        update: {},
        create: { brand: "Apple", model, storage, color },
      });
      const internalCode = `IP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`;
      const unit = await tx.inventoryUnit.create({
        data: {
          productVariantId: variant.id,
          internalCode,
          imei1,
          serialNumber,
          condition: String(formData.get("condition")) === "USED" ? "USED" : "NEW",
          batteryHealth: Number(formData.get("batteryHealth")) || null,
          hasBox: formData.get("hasBox") === "on",
          purchaseCost,
          salePrice,
          notes: String(formData.get("notes") ?? "").trim() || null,
        },
      });
      await tx.inventoryMovement.create({
        data: { inventoryUnitId: unit.id, type: "MANUAL_ENTRY", toStatus: "AVAILABLE", userId: user.id },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", entityType: "InventoryUnit", entityId: unit.id },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/estoque/novo?erro=IMEI ou serial já cadastrado");
    }
    throw error;
  }
  revalidatePath("/estoque");
  redirect("/estoque?ok=Aparelho cadastrado");
}

const saleSchema = z.object({
  unitIds: z.array(z.string()).min(1),
  customerId: z.string().nullable(),
  discount: z.number().min(0),
  payments: z.array(z.object({ method: z.string(), amount: z.number().positive() })).min(1),
});

export async function completeSaleAction(input: z.infer<typeof saleSchema>) {
  const user = await requireUser();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados da venda inválidos." };
  try {
    const sale = await prisma.$transaction(async (tx) => {
      const units = await tx.inventoryUnit.findMany({
        where: { id: { in: parsed.data.unitIds }, status: "AVAILABLE", deletedAt: null },
        include: { productVariant: true },
      });
      if (units.length !== parsed.data.unitIds.length) throw new Error("Um aparelho não está mais disponível.");
      const gross = units.reduce((sum, unit) => sum + Number(unit.salePrice), 0);
      const maxDiscount = user.role === Role.ADMIN ? gross : gross * (user.role === Role.MANAGER ? 0.15 : 0.05);
      if (parsed.data.discount > maxDiscount) throw new Error("Desconto acima do permitido para seu perfil.");
      const net = Number((gross - parsed.data.discount).toFixed(2));
      const paid = Number(parsed.data.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
      if (Math.abs(paid - net) > 0.009) throw new Error("A soma dos pagamentos deve ser igual ao total.");

      const updated = await tx.inventoryUnit.updateMany({
        where: { id: { in: parsed.data.unitIds }, status: "AVAILABLE" },
        data: { status: "SOLD" },
      });
      if (updated.count !== units.length) throw new Error("Conflito de estoque. Atualize a página e tente novamente.");

      const created = await tx.sale.create({
        data: {
          number: `VEN-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          customerId: parsed.data.customerId || null,
          grossTotal: gross,
          discountTotal: parsed.data.discount,
          netTotal: net,
          createdById: user.id,
          items: {
            create: units.map((unit) => ({
              inventoryUnitId: unit.id,
              description: `${unit.productVariant.model} ${unit.productVariant.storage} ${unit.productVariant.color}`,
              imeiSnapshot: unit.imei1,
              costSnapshot: unit.purchaseCost,
              unitPrice: unit.salePrice,
              discount: 0,
              finalPrice: unit.salePrice,
            })),
          },
          payments: {
            create: parsed.data.payments.map((payment) => ({
              method: payment.method as PaymentMethod,
              amount: payment.amount,
              netAmount: payment.amount,
            })),
          },
        },
      });
      await tx.inventoryMovement.createMany({
        data: units.map((unit) => ({ inventoryUnitId: unit.id, type: "SALE", fromStatus: "AVAILABLE", toStatus: "SOLD", referenceType: "Sale", referenceId: created.id, userId: user.id })),
      });
      await tx.financialTransaction.create({ data: { saleId: created.id, type: "INCOME", description: `Venda ${created.number}`, amount: net } });
      await tx.auditLog.create({ data: { userId: user.id, action: "COMPLETE", entityType: "Sale", entityId: created.id, metadata: { unitIds: parsed.data.unitIds } } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/");
    revalidatePath("/estoque");
    revalidatePath("/vendas");
    return { ok: true, saleId: sale.id, number: sale.number };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível concluir a venda." };
  }
}

export async function cancelSaleAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === Role.SELLER) redirect("/vendas?erro=Somente gerente ou administrador pode cancelar");
  const saleId = String(formData.get("saleId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) redirect("/vendas?erro=Informe o motivo do cancelamento");
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale || sale.status !== "COMPLETED") throw new Error("Venda não pode ser cancelada.");
    await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELED", canceledAt: new Date(), canceledById: user.id, cancelReason: reason } });
    for (const item of sale.items) {
      await tx.inventoryUnit.update({ where: { id: item.inventoryUnitId }, data: { status: "AVAILABLE" } });
      await tx.inventoryMovement.create({ data: { inventoryUnitId: item.inventoryUnitId, type: "SALE_CANCELED", fromStatus: "SOLD", toStatus: "AVAILABLE", referenceType: "Sale", referenceId: sale.id, notes: reason, userId: user.id } });
    }
    await tx.financialTransaction.create({ data: { saleId: sale.id, type: "REVERSAL", description: `Estorno ${sale.number}`, amount: sale.netTotal.negated() } });
    await tx.auditLog.create({ data: { userId: user.id, action: "CANCEL", entityType: "Sale", entityId: sale.id, metadata: { reason } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/");
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  redirect("/vendas?ok=Venda cancelada e estoque estornado");
}

async function nextServiceOrderNumber(tx: Prisma.TransactionClient) {
  const count = await tx.serviceOrder.count();
  return `OS #${String(count + 1).padStart(6, "0")}`;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : null;
}

export async function createTechnicianAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (name.length < 2) redirect("/assistencia?erro=Informe o nome do técnico");
  const technician = await prisma.technician.create({
    data: { name, phone: optionalText(formData, "phone"), email: optionalText(formData, "email") },
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Technician", entityId: technician.id } });
  revalidatePath("/assistencia");
  redirect("/assistencia?ok=Técnico cadastrado");
}

export async function createServiceOrderAction(formData: FormData) {
  const user = await requireUser();
  const model = text(formData, "model");
  const issueList = formData.getAll("reportedIssues").map(String).filter(Boolean);
  if (!model || issueList.length === 0) redirect("/assistencia/nova?erro=Informe aparelho e defeito relatado");

  const created = await prisma.$transaction(async (tx) => {
    let customerId = text(formData, "customerId");
    if (!customerId) {
      const name = text(formData, "customerName");
      const phone = digits(formData.get("customerPhone"));
      const cpf = digits(formData.get("customerCpf")) || null;
      if (name.length < 2 || phone.length < 8) throw new Error("Informe cliente ou cadastre nome e telefone.");
      const customer = await tx.customer.upsert({
        where: cpf ? { cpf } : { id: `missing-${crypto.randomUUID()}` },
        update: { name, phone, email: optionalText(formData, "customerEmail") },
        create: { name, phone, cpf, email: optionalText(formData, "customerEmail") },
      }).catch(async () => tx.customer.create({ data: { name, phone, cpf, email: optionalText(formData, "customerEmail") } }));
      customerId = customer.id;
    }

    const order = await tx.serviceOrder.create({
      data: {
        number: await nextServiceOrderNumber(tx),
        publicToken: crypto.randomUUID().replace(/-/g, ""),
        customerId,
        createdById: user.id,
        technicianId: optionalText(formData, "technicianId"),
        status: "ENTRY",
        priority: text(formData, "priority") === "URGENT" ? "URGENT" : "NORMAL",
        category: text(formData, "category") || "Smartphone",
        brand: text(formData, "brand") || "Apple",
        model,
        color: optionalText(formData, "color"),
        capacity: optionalText(formData, "capacity"),
        imei: digits(formData.get("imei")) || null,
        imei2: digits(formData.get("imei2")) || null,
        serial: optionalText(formData, "serial")?.toUpperCase(),
        modelNumber: optionalText(formData, "modelNumber"),
        unlockPassword: optionalText(formData, "unlockPassword"),
        accessories: optionalText(formData, "accessories"),
        deviceNotes: optionalText(formData, "deviceNotes"),
        reportedIssues: issueList,
        customerDescription: optionalText(formData, "customerDescription"),
        internalNote: optionalText(formData, "internalNote"),
        expectedAt: optionalDate(formData, "expectedAt"),
        checklistItems: {
          create: checklistItems.map((item) => ({ phase: "ENTRY", item, result: "NOT_TESTED" })),
        },
      },
    });
    await tx.serviceOrderHistory.create({
      data: { serviceOrderId: order.id, userId: user.id, action: "OS criada", newStatus: "ENTRY", notes: "Abertura rápida de assistência" },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "ServiceOrder", entityId: order.id, metadata: { number: order.number } },
    });
    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/assistencia");
  redirect(`/assistencia/${created.id}?ok=OS criada`);
}

export async function updateServiceOrderStatusAction(serviceOrderId: string, status: ServiceOrderStatus) {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, select: { status: true } });
      if (!current) throw new Error("OS não encontrada.");
      if (current.status === status) return;
      await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status,
          readyAt: status === "READY_FOR_PICKUP" ? new Date() : undefined,
          deliveredAt: status === "DELIVERED" ? new Date() : undefined,
          canceledAt: status === "CANCELED" ? new Date() : undefined,
        },
      });
      await tx.serviceOrderHistory.create({
        data: { serviceOrderId, userId: user.id, action: "Status alterado", previousStatus: current.status, newStatus: status },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "STATUS_CHANGE", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { from: current.status, to: status } },
      });
    });
    revalidatePath("/assistencia");
    revalidatePath(`/assistencia/${serviceOrderId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao alterar status" };
  }
}

export async function changeServiceOrderStatusFormAction(formData: FormData) {
  const serviceOrderId = text(formData, "serviceOrderId");
  const status = text(formData, "status") as ServiceOrderStatus;
  const result = await updateServiceOrderStatusAction(serviceOrderId, status);
  if (!result.ok) redirect(`/assistencia/${serviceOrderId}?erro=${encodeURIComponent(result.error ?? "Falha ao alterar status")}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Status atualizado`);
}

export async function assignServiceTechnicianAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const technicianId = optionalText(formData, "technicianId");
  await prisma.$transaction([
    prisma.serviceOrder.update({ where: { id: serviceOrderId }, data: { technicianId } }),
    prisma.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: "Técnico atribuído", notes: technicianId ?? "Sem técnico" } }),
    prisma.auditLog.create({ data: { userId: user.id, action: "ASSIGN_TECHNICIAN", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { technicianId } } }),
  ]);
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Técnico atualizado`);
}

export async function saveChecklistAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const phase = text(formData, "phase") as ChecklistPhase;
  await prisma.$transaction(async (tx) => {
    for (const item of checklistItems) {
      const result = text(formData, `result:${item}`) as ChecklistResult || "NOT_TESTED";
      const notes = optionalText(formData, `notes:${item}`);
      await tx.serviceChecklistItem.upsert({
        where: { serviceOrderId_phase_item: { serviceOrderId, phase, item } },
        update: { result, notes },
        create: { serviceOrderId, phase, item, result, notes },
      });
    }
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: phase === "ENTRY" ? "Checklist de entrada salvo" : "Teste final salvo" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "SAVE_CHECKLIST", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { phase } } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Checklist salvo`);
}

export async function saveDiagnosticAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const foundIssue = text(formData, "foundIssue");
  if (foundIssue.length < 3) redirect(`/assistencia/${serviceOrderId}?erro=Informe o defeito encontrado`);
  await prisma.$transaction(async (tx) => {
    await tx.serviceDiagnostic.upsert({
      where: { serviceOrderId },
      update: {
        technicianId: optionalText(formData, "technicianId"),
        diagnosedById: user.id,
        foundIssue,
        probableCause: optionalText(formData, "probableCause"),
        recommendedService: optionalText(formData, "recommendedService"),
        technicalNote: optionalText(formData, "technicalNote"),
        estimatedTime: optionalText(formData, "estimatedTime"),
      },
      create: {
        serviceOrderId,
        technicianId: optionalText(formData, "technicianId"),
        diagnosedById: user.id,
        foundIssue,
        probableCause: optionalText(formData, "probableCause"),
        recommendedService: optionalText(formData, "recommendedService"),
        technicalNote: optionalText(formData, "technicalNote"),
        estimatedTime: optionalText(formData, "estimatedTime"),
      },
    });
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: "Diagnóstico salvo" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "SAVE_DIAGNOSTIC", entityType: "ServiceOrder", entityId: serviceOrderId } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Diagnóstico salvo`);
}

export async function saveQuoteAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const descriptions = formData.getAll("description").map(String);
  const types = formData.getAll("type").map(String);
  const quantities = formData.getAll("quantity").map((v) => Number(v) || 1);
  const costs = formData.getAll("cost").map(money);
  const prices = formData.getAll("price").map(money);
  const discount = money(formData.get("discount"));
  const items = descriptions.map((description, index) => ({
    description: description.trim(),
    type: types[index] === "PART" ? "PART" as const : "SERVICE" as const,
    quantity: Math.max(1, quantities[index] ?? 1),
    cost: costs[index] ?? 0,
    price: prices[index] ?? 0,
  })).filter((item) => item.description && item.price > 0);
  if (items.length === 0) redirect(`/assistencia/${serviceOrderId}?erro=Adicione ao menos um item ao orçamento`);
  const subtotalParts = items.filter((item) => item.type === "PART").reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalServices = items.filter((item) => item.type === "SERVICE").reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const total = Math.max(0, subtotalParts + subtotalServices - discount);
  const profit = total - totalCost;
  const margin = total > 0 ? (profit / total) * 100 : 0;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.serviceQuote.findUnique({ where: { serviceOrderId } });
    if (existing) {
      await tx.serviceQuoteItem.deleteMany({ where: { quoteId: existing.id } });
      await tx.serviceQuote.update({
        where: { id: existing.id },
        data: {
          subtotalParts,
          subtotalServices,
          discount,
          total,
          totalCost,
          profit,
          margin,
          responsibleId: user.id,
          items: { create: items },
        },
      });
    } else {
      await tx.serviceQuote.create({
        data: {
          serviceOrderId,
          subtotalParts,
          subtotalServices,
          discount,
          total,
          totalCost,
          profit,
          margin,
          responsibleId: user.id,
          items: { create: items },
        },
      });
    }
    await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { totalParts: subtotalParts, totalServices: subtotalServices, discountTotal: discount, totalCharged: total, totalCost },
    });
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: `Orçamento de R$ ${total.toFixed(2)} salvo` } });
    await tx.auditLog.create({ data: { userId: user.id, action: "SAVE_QUOTE", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { total } } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Orçamento salvo`);
}

export async function updateQuoteStatusAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const status = text(formData, "status");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.serviceQuote.update({
      where: { serviceOrderId },
      data: {
        status: status as never,
        sentAt: status === "SENT" ? now : undefined,
        approvedAt: status === "APPROVED" ? now : undefined,
        approvalMethod: status === "APPROVED" ? text(formData, "approvalMethod") || "Manual" : undefined,
        responsibleId: user.id,
      },
    });
    if (status === "APPROVED") {
      await tx.serviceOrder.update({ where: { id: serviceOrderId }, data: { status: "WAITING_PART" } });
    }
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: `Orçamento ${status}` } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Status do orçamento atualizado`);
}

export async function createPartAction(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const name = text(formData, "name");
  const quantity = Number(formData.get("quantity")) || 0;
  if (!sku || !name) redirect("/assistencia/pecas?erro=Informe SKU e nome da peça");
  await prisma.$transaction(async (tx) => {
    const part = await tx.part.create({
      data: {
        sku,
        barcode: optionalText(formData, "barcode"),
        name,
        category: text(formData, "category") || "Peça",
        brand: optionalText(formData, "brand"),
        compatibleModel: optionalText(formData, "compatibleModel"),
        quality: optionalText(formData, "quality"),
        supplier: optionalText(formData, "supplier"),
        cost: money(formData.get("cost")),
        price: money(formData.get("price")),
        quantity,
        minimumStock: Number(formData.get("minimumStock")) || 0,
        location: optionalText(formData, "location"),
      },
    });
    const models = text(formData, "compatibilities").split(",").map((model) => model.trim()).filter(Boolean);
    if (models.length) await tx.partCompatibility.createMany({ data: models.map((model) => ({ partId: part.id, model })), skipDuplicates: true });
    if (quantity > 0) await tx.partMovement.create({ data: { partId: part.id, type: "ENTRY", quantity, reason: "Cadastro inicial", userId: user.id } });
    await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Part", entityId: part.id } });
  });
  revalidatePath("/assistencia/pecas");
  redirect("/assistencia/pecas?ok=Peça cadastrada");
}

export async function addServiceOrderPartAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const partId = text(formData, "partId");
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);
  const mode = text(formData, "mode");
  await prisma.$transaction(async (tx) => {
    const part = await tx.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error("Peça não encontrada.");
    const available = part.quantity - part.reserved;
    if (mode === "RESERVE" && available < quantity) throw new Error("Estoque disponível insuficiente para reservar.");
    if (mode === "USE" && part.quantity < quantity) throw new Error("Estoque físico insuficiente para consumir.");
    if (mode === "RESERVE") {
      await tx.part.update({ where: { id: partId }, data: { reserved: { increment: quantity } } });
      await tx.serviceOrderPart.create({ data: { serviceOrderId, partId, quantity, unitCost: part.cost, unitPrice: part.price, status: "RESERVED" } });
      await tx.partMovement.create({ data: { partId, serviceOrderId, type: "RESERVE", quantity, reason: "Reserva para OS", userId: user.id } });
    } else {
      await tx.part.update({ where: { id: partId }, data: { quantity: { decrement: quantity }, reserved: { decrement: Math.min(Number(part.reserved), quantity) } } });
      await tx.serviceOrderPart.create({ data: { serviceOrderId, partId, quantity, unitCost: part.cost, unitPrice: part.price, status: "USED" } });
      await tx.partMovement.create({ data: { partId, serviceOrderId, type: "CONSUME_IN_SERVICE_ORDER", quantity, reason: "Consumo em OS", userId: user.id } });
    }
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: mode === "RESERVE" ? "Peça reservada" : "Peça consumida", notes: `${quantity}x ${part.name}` } });
    await tx.auditLog.create({ data: { userId: user.id, action: mode === "RESERVE" ? "RESERVE_PART" : "CONSUME_PART", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { partId, quantity } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  revalidatePath("/assistencia/pecas");
  redirect(`/assistencia/${serviceOrderId}?ok=Peça atualizada na OS`);
}

export async function recordServicePaymentAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const amount = money(formData.get("amount"));
  const method = text(formData, "method") as PaymentMethod;
  if (amount <= 0) redirect(`/assistencia/${serviceOrderId}?erro=Informe um valor de pagamento`);
  await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: { payments: true } });
    if (!order) throw new Error("OS não encontrada.");
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) + amount;
    const total = Number(order.totalCharged);
    await tx.serviceOrderPayment.create({ data: { serviceOrderId, amount, method, userId: user.id, notes: optionalText(formData, "notes") } });
    await tx.serviceOrder.update({ where: { id: serviceOrderId }, data: { paymentStatus: paid >= total && total > 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID" } });
    await tx.financialTransaction.create({ data: { type: "INCOME", description: `Pagamento ${order.number}`, amount } });
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: `Pagamento registrado: R$ ${amount.toFixed(2)}` } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  revalidatePath("/financeiro");
  redirect(`/assistencia/${serviceOrderId}?ok=Pagamento registrado`);
}

export async function deliverServiceOrderAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  await prisma.$transaction(async (tx) => {
    await tx.serviceOrder.update({ where: { id: serviceOrderId }, data: { status: "DELIVERED", deliveredAt: new Date(), deliveredBy: user.name, pickedUpBy: text(formData, "pickedUpBy") || "Cliente" } });
    await tx.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: "Aparelho entregue", newStatus: "DELIVERED" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "DELIVER", entityType: "ServiceOrder", entityId: serviceOrderId } });
  });
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Aparelho entregue`);
}

export async function createWarrantyAction(formData: FormData) {
  const user = await requireUser();
  const serviceOrderId = text(formData, "serviceOrderId");
  const days = Number(formData.get("warrantyDays")) || 90;
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  await prisma.$transaction([
    prisma.serviceOrder.update({ where: { id: serviceOrderId }, data: { warrantyDays: days, warrantyStartAt: start, warrantyEndAt: end, warrantyNotes: optionalText(formData, "warrantyNotes") } }),
    prisma.serviceOrderHistory.create({ data: { serviceOrderId, userId: user.id, action: `Garantia gerada por ${days} dias` } }),
    prisma.auditLog.create({ data: { userId: user.id, action: "CREATE_WARRANTY", entityType: "ServiceOrder", entityId: serviceOrderId, metadata: { days } } }),
  ]);
  revalidatePath(`/assistencia/${serviceOrderId}`);
  redirect(`/assistencia/${serviceOrderId}?ok=Garantia gerada`);
}
