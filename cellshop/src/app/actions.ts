"use server";

import { compare } from "bcryptjs";
import { Prisma, type PaymentMethod, Role } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { digits, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/rate-limit";

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
