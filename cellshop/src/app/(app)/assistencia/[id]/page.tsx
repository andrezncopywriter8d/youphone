import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle, Printer, QrCode, Save, ShieldCheck } from "lucide-react";
import {
  addServiceOrderPartAction,
  assignServiceTechnicianAction,
  changeServiceOrderStatusFormAction,
  createWarrantyAction,
  deliverServiceOrderAction,
  recordServicePaymentAction,
  saveChecklistAction,
  saveDiagnosticAction,
  saveQuoteAction,
  updateQuoteStatusAction,
} from "@/app/actions";
import { Flash } from "@/components/flash";
import { brl, dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checklistItems, checklistResultLabel, quoteStatusLabel, serviceStatuses, statusBadgeClass, statusLabel, whatsappHref } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function ServiceOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [{ id }, { ok, erro }] = await Promise.all([params, searchParams]);
  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      technician: true,
      histories: { include: { user: true }, orderBy: { createdAt: "desc" } },
      checklistItems: { orderBy: [{ phase: "asc" }, { item: "asc" }] },
      diagnostic: true,
      quote: { include: { items: true } },
      parts: { include: { part: true }, orderBy: { createdAt: "desc" } },
      payments: { include: { user: true }, orderBy: { createdAt: "desc" } },
      attachments: true,
      warrantySource: true,
      warrantyReturns: true,
    },
  });
  if (!order) notFound();
  const [technicians, parts] = await Promise.all([
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.part.findMany({
      where: {
        active: true,
        OR: [
          { compatibleModel: { contains: order.model, mode: "insensitive" } },
          { compatibilities: { some: { model: { contains: order.model, mode: "insensitive" } } } },
          { compatibleModel: null },
        ],
      },
      include: { compatibilities: true },
      orderBy: [{ compatibleModel: "desc" }, { name: "asc" }],
      take: 120,
    }),
  ]);
  const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const total = Number(order.totalCharged);
  const warrantyActive = order.warrantyEndAt ? order.warrantyEndAt >= new Date() : false;
  const messageBase = `Olá ${order.customer.name}, sua OS ${order.number} (${order.model}) está com status: ${statusLabel[order.status]}.`;
  const readyMessage = `Olá ${order.customer.name}, seu ${order.model} da ${order.number} está pronto para retirada na CELLSHOP. Valor: ${brl.format(total)}.`;

  return (
    <>
      <div className="mb-7">
        <Link href="/assistencia" className="mb-4 inline-flex items-center gap-2 text-sm text-[#7d8295] hover:text-[#465fda]"><ArrowLeft size={16} />Voltar à assistência</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Ordem de serviço</p>
            <h1 className="page-title mt-1">{order.number}</h1>
            <p className="page-subtitle">{order.customer.name} · {order.model} · {order.imei ?? order.serial ?? "sem identificador"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={statusBadgeClass(order.status)}>{statusLabel[order.status]}</span>
            {order.priority === "URGENT" && <span className="badge badge-red">Urgente</span>}
            {order.warrantySourceId && <span className="badge badge-orange">Retorno em garantia</span>}
            {order.warrantyEndAt && <span className={warrantyActive ? "badge badge-green" : "badge badge-red"}>{warrantyActive ? "Garantia ativa" : "Fora da garantia"}</span>}
          </div>
        </div>
      </div>
      <Flash ok={ok} error={erro} />

      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        {[
          ["Cliente", order.customer.name],
          ["Entrada", dateTime.format(order.createdAt)],
          ["Técnico", order.technician?.name ?? "Não atribuído"],
          ["Previsão", order.expectedAt ? dateTime.format(order.expectedAt) : "Sem previsão"],
        ].map(([label, value]) => (
          <div key={label} className="card p-4"><p className="text-xs text-[#8b90a2]">{label}</p><strong className="mt-2 block text-sm">{value}</strong></div>
        ))}
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={`/assistencia/${order.id}/etiqueta`} className="btn-secondary"><QrCode size={17} />Imprimir etiqueta</Link>
        <button type="button" className="btn-secondary no-print"><Printer size={17} />Use ⌘P para OS</button>
        <a className="btn-secondary" target="_blank" href={whatsappHref(order.customer.phone, messageBase)}><MessageCircle size={17} />WhatsApp status</a>
        <a className="btn-primary" target="_blank" href={whatsappHref(order.customer.phone, readyMessage)}><MessageCircle size={17} />Avisar pronto</a>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Resumo</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><p className="label">Aparelho</p><p className="font-semibold">{order.brand} {order.model} {order.capacity ?? ""} {order.color ?? ""}</p></div>
              <div><p className="label">IMEI / serial</p><p className="font-mono text-sm">{order.imei ?? "—"} {order.serial ? `· ${order.serial}` : ""}</p></div>
              <div><p className="label">Defeitos relatados</p><p>{order.reportedIssues.join(", ")}</p></div>
              <div><p className="label">Acessórios</p><p>{order.accessories ?? "—"}</p></div>
              <div className="md:col-span-2"><p className="label">Descrição do cliente</p><p className="text-sm text-[#555b70]">{order.customerDescription ?? "—"}</p></div>
              <div className="md:col-span-2"><p className="label">Observação interna</p><p className="text-sm text-[#555b70]">{order.internalNote ?? "—"}</p></div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Checklist de entrada</h2>
            <form action={saveChecklistAction} className="mt-4">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <input type="hidden" name="phase" value="ENTRY" />
              <div className="grid gap-3 md:grid-cols-2">
                {checklistItems.map((item) => {
                  const current = order.checklistItems.find((row) => row.phase === "ENTRY" && row.item === item);
                  return (
                    <div key={item} className="rounded-2xl border border-[#e8eaf1] p-3">
                      <label className="label">{item}</label>
                      <select className="input min-h-10" name={`result:${item}`} defaultValue={current?.result ?? "NOT_TESTED"}>
                        {Object.entries(checklistResultLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input className="input mt-2 min-h-10 text-xs" name={`notes:${item}`} defaultValue={current?.notes ?? ""} placeholder="Observação" />
                    </div>
                  );
                })}
              </div>
              <button className="btn-primary mt-4"><Save size={16} />Salvar checklist</button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Diagnóstico técnico</h2>
            <form action={saveDiagnosticAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <div><label className="label">Técnico responsável</label><select className="input" name="technicianId" defaultValue={order.diagnostic?.technicianId ?? order.technicianId ?? ""}><option value="">Selecionar</option>{technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}</select></div>
              <div><label className="label">Tempo estimado</label><input className="input" name="estimatedTime" defaultValue={order.diagnostic?.estimatedTime ?? ""} placeholder="Ex.: 2 horas" /></div>
              <div className="md:col-span-2"><label className="label">Defeito encontrado *</label><textarea className="input min-h-20" name="foundIssue" defaultValue={order.diagnostic?.foundIssue ?? ""} required /></div>
              <div><label className="label">Causa provável</label><textarea className="input min-h-20" name="probableCause" defaultValue={order.diagnostic?.probableCause ?? ""} /></div>
              <div><label className="label">Serviço recomendado</label><textarea className="input min-h-20" name="recommendedService" defaultValue={order.diagnostic?.recommendedService ?? ""} /></div>
              <div className="md:col-span-2"><label className="label">Observação técnica</label><textarea className="input min-h-20" name="technicalNote" defaultValue={order.diagnostic?.technicalNote ?? ""} /></div>
              <button className="btn-primary md:col-span-2"><Save size={16} />Salvar diagnóstico</button>
            </form>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Orçamento</h2><p className="mt-1 text-xs text-[#8b90a2]">Serviços + peças, cálculo automático de custo, lucro e margem.</p></div>
              {order.quote && <span className="badge badge-orange">{quoteStatusLabel[order.quote.status]}</span>}
            </div>
            <form action={saveQuoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              {[0, 1, 2, 3, 4].map((index) => {
                const item = order.quote?.items[index];
                return (
                  <div key={index} className="grid gap-2 rounded-2xl border border-[#e8eaf1] p-3 md:grid-cols-[.7fr_1.5fr_.4fr_.6fr_.6fr]">
                    <select className="input min-h-10" name="type" defaultValue={item?.type ?? (index === 0 ? "SERVICE" : "PART")}><option value="SERVICE">Serviço</option><option value="PART">Peça</option></select>
                    <input className="input min-h-10" name="description" defaultValue={item?.description ?? ""} placeholder={index === 0 ? "Troca de tela" : "Item opcional"} />
                    <input className="input min-h-10" name="quantity" type="number" min="1" defaultValue={item?.quantity ?? 1} />
                    <input className="input min-h-10" name="cost" inputMode="decimal" defaultValue={item ? Number(item.cost) : ""} placeholder="Custo" />
                    <input className="input min-h-10" name="price" inputMode="decimal" defaultValue={item ? Number(item.price) : ""} placeholder="Cobrado" />
                  </div>
                );
              })}
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input className="input" name="discount" inputMode="decimal" defaultValue={Number(order.quote?.discount ?? order.discountTotal) || ""} placeholder="Desconto" />
                <button className="btn-primary"><Save size={16} />Salvar orçamento</button>
              </div>
            </form>
            {order.quote && (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="subtle-card p-3"><p className="text-xs text-[#8b90a2]">Total</p><strong>{brl.format(Number(order.quote.total))}</strong></div>
                <div className="subtle-card p-3"><p className="text-xs text-[#8b90a2]">Custo</p><strong>{brl.format(Number(order.quote.totalCost))}</strong></div>
                <div className="subtle-card p-3"><p className="text-xs text-[#8b90a2]">Lucro</p><strong>{brl.format(Number(order.quote.profit))}</strong></div>
                <div className="subtle-card p-3"><p className="text-xs text-[#8b90a2]">Margem</p><strong>{Number(order.quote.margin).toFixed(1)}%</strong></div>
              </div>
            )}
            {order.quote && (
              <form action={updateQuoteStatusAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="serviceOrderId" value={order.id} />
                <input type="hidden" name="approvalMethod" value="WhatsApp/manual" />
                {Object.entries(quoteStatusLabel).map(([value, label]) => <button key={value} name="status" value={value} className="btn-secondary min-h-10">{label}</button>)}
              </form>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Teste final</h2>
            <form action={saveChecklistAction} className="mt-4">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <input type="hidden" name="phase" value="FINAL" />
              <div className="grid gap-3 md:grid-cols-2">
                {checklistItems.slice(0, 12).map((item) => {
                  const current = order.checklistItems.find((row) => row.phase === "FINAL" && row.item === item);
                  return <div key={item} className="rounded-2xl border border-[#e8eaf1] p-3"><label className="label">{item}</label><select className="input min-h-10" name={`result:${item}`} defaultValue={current?.result ?? "NOT_TESTED"}>{Object.entries(checklistResultLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="input mt-2 min-h-10 text-xs" name={`notes:${item}`} defaultValue={current?.notes ?? ""} placeholder="Antes/depois" /></div>;
                })}
              </div>
              <button className="btn-primary mt-4"><ShieldCheck size={16} />Salvar teste final</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold">Ações da OS</h2>
            <form action={changeServiceOrderStatusFormAction} className="mt-4 space-y-3">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <select className="input" name="status" defaultValue={order.status}>{serviceStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
              <button className="btn-primary w-full">Alterar status</button>
            </form>
            <form action={assignServiceTechnicianAction} className="mt-4 space-y-3 border-t border-[#eceef3] pt-4">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <select className="input" name="technicianId" defaultValue={order.technicianId ?? ""}><option value="">Sem técnico</option>{technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}</select>
              <button className="btn-secondary w-full">Atribuir técnico</button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Peças compatíveis</h2>
            <form action={addServiceOrderPartAction} className="mt-4 space-y-3">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <select className="input" name="partId" required>
                <option value="">Selecionar peça</option>
                {parts.map((part) => <option key={part.id} value={part.id}>{part.name} · disp. {part.quantity - part.reserved}</option>)}
              </select>
              <input className="input" type="number" name="quantity" min="1" defaultValue={1} />
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary" name="mode" value="RESERVE">Reservar</button>
                <button className="btn-primary" name="mode" value="USE">Consumir</button>
              </div>
            </form>
            <div className="mt-4 space-y-2">
              {order.parts.length === 0 ? <p className="text-sm text-[#8b90a2]">Nenhuma peça vinculada.</p> : order.parts.map((row) => <div key={row.id} className="rounded-2xl border border-[#e8eaf1] p-3"><p className="text-sm font-semibold">{row.quantity}x {row.part.name}</p><p className="mt-1 text-xs text-[#8b90a2]">{row.status} · {brl.format(Number(row.unitPrice))}</p></div>)}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Financeiro</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="flex justify-between"><span>Total</span><strong>{brl.format(total)}</strong></p>
              <p className="flex justify-between"><span>Pago</span><strong>{brl.format(paid)}</strong></p>
              <p className="flex justify-between"><span>Saldo</span><strong>{brl.format(Math.max(0, total - paid))}</strong></p>
              <p className="flex justify-between"><span>Custo</span><strong>{brl.format(Number(order.totalCost))}</strong></p>
            </div>
            <form action={recordServicePaymentAction} className="mt-4 space-y-3">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <input className="input" name="amount" inputMode="decimal" placeholder="Valor pago" />
              <select className="input" name="method"><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="DEBIT_CARD">Débito</option><option value="CREDIT_CARD">Crédito</option><option value="TRANSFER">Transferência</option></select>
              <button className="btn-primary w-full">Registrar pagamento</button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Entrega e garantia</h2>
            <form action={deliverServiceOrderAction} className="mt-4 space-y-3">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <input className="input" name="pickedUpBy" placeholder="Quem retirou" defaultValue={order.customer.name} />
              <button className="btn-primary w-full">Entregar aparelho</button>
            </form>
            <form action={createWarrantyAction} className="mt-4 space-y-3 border-t border-[#eceef3] pt-4">
              <input type="hidden" name="serviceOrderId" value={order.id} />
              <select className="input" name="warrantyDays" defaultValue={90}><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={180}>180 dias</option></select>
              <textarea className="input min-h-20" name="warrantyNotes" placeholder="Serviços e peças cobertos" />
              <button className="btn-secondary w-full">Gerar garantia</button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Portal do cliente</h2>
            <Link href={`/os/consulta/${order.publicToken}`} target="_blank" className="mt-4 btn-secondary w-full"><ExternalLink size={16} />Abrir consulta pública</Link>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Histórico</h2>
            <div className="mt-4 space-y-3">
              {order.histories.map((history) => <div key={history.id} className="border-l-2 border-[#dfe5ff] pl-3"><p className="text-xs font-semibold">{history.action}</p><p className="mt-1 text-[11px] text-[#8b90a2]">{dateTime.format(history.createdAt)} · {history.user.name}</p>{history.previousStatus && history.newStatus && <p className="mt-1 text-[11px] text-[#8b90a2]">{statusLabel[history.previousStatus]} → {statusLabel[history.newStatus]}</p>}</div>)}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
