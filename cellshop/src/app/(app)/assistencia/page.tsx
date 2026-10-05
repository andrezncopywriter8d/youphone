import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, Plus, Search, ShieldCheck, Smartphone, UserRoundCog, Wrench } from "lucide-react";
import type { Prisma, ServiceOrderStatus } from "@prisma/client";
import { createTechnicianAction } from "@/app/actions";
import { Flash } from "@/components/flash";
import { ServiceKanban } from "@/components/service-kanban";
import { brl, dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { serviceStatuses, statusBadgeClass, statusLabel } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function AssistancePage({ searchParams }: { searchParams: Promise<{ q?: string; status?: ServiceOrderStatus; ok?: string; erro?: string }> }) {
  const { q = "", status, ok, erro } = await searchParams;
  const today = new Date();
  const where: Prisma.ServiceOrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { imei: { contains: q } },
            { serial: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q } } },
            { customer: { cpf: { contains: q } } },
            { technician: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [orders, counts, partsLow, finance] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      take: 120,
      orderBy: { updatedAt: "desc" },
      include: { customer: true, technician: true, payments: true, warrantyReturns: true },
    }),
    prisma.serviceOrder.groupBy({ by: ["status"], _count: true }),
    prisma.part.count({ where: { active: true, quantity: { lte: 3 } } }),
    prisma.serviceOrder.aggregate({ _sum: { totalCharged: true, totalCost: true }, where: { status: { not: "CANCELED" } } }),
  ]);
  const count = (value: ServiceOrderStatus) => counts.find((item) => item.status === value)?._count ?? 0;
  const late = await prisma.serviceOrder.count({ where: { status: { notIn: ["DELIVERED", "CANCELED"] }, expectedAt: { lt: today } } });
  const warrantyReturns = await prisma.serviceOrder.count({ where: { warrantySourceId: { not: null } } });
  const ready = orders.filter((order) => order.status === "READY_FOR_PICKUP");
  const openStatuses: ServiceOrderStatus[] = ["ENTRY", "WAITING_DIAGNOSIS", "WAITING_APPROVAL", "WAITING_PART", "IN_REPAIR", "IN_TESTING", "READY_FOR_PICKUP"];
  const indicators = [
    { label: "OS abertas", value: openStatuses.reduce((sum, value) => sum + count(value), 0), icon: ClipboardList, color: "#5977f4" },
    { label: "Aguard. diagnóstico", value: count("WAITING_DIAGNOSIS"), icon: Smartphone, color: "#8b6df3" },
    { label: "Aguard. aprovação", value: count("WAITING_APPROVAL"), icon: ShieldCheck, color: "#e8862d" },
    { label: "Aguard. peça", value: count("WAITING_PART"), icon: Boxes, color: "#ee7359" },
    { label: "Em reparo", value: count("IN_REPAIR"), icon: Wrench, color: "#20b978" },
    { label: "Em testes", value: count("IN_TESTING"), icon: ClipboardList, color: "#5977f4" },
    { label: "Prontas", value: count("READY_FOR_PICKUP"), icon: ShieldCheck, color: "#20b978" },
    { label: "Atrasadas", value: late, icon: AlertTriangle, color: "#ef5b6c" },
    { label: "Retornos garantia", value: warrantyReturns, icon: UserRoundCog, color: "#8b6df3" },
  ];
  const revenue = Number(finance._sum.totalCharged ?? 0);
  const cost = Number(finance._sum.totalCost ?? 0);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Central operacional</p>
          <h1 className="page-title mt-1">Assistência Técnica</h1>
          <p className="page-subtitle">OS, checklists, orçamento, peças, financeiro e garantia em um fluxo único.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assistencia/pecas" className="btn-secondary"><Boxes size={17} />Estoque de peças</Link>
          <Link href="/clientes" className="btn-secondary">Clientes</Link>
          <Link href="/assistencia/nova" className="btn-primary"><Plus size={17} />Nova OS</Link>
        </div>
      </div>
      <Flash ok={ok} error={erro} />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {indicators.map((item) => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-[#7f8495]">{item.label}</p>
              <item.icon size={18} strokeWidth={1.8} style={{ color: item.color }} />
            </div>
            <strong className="metric-value mt-3 block text-2xl">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-[#7d8295]">Faturamento assistência</p>
          <strong className="mt-2 block text-2xl">{brl.format(revenue)}</strong>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[#7d8295]">Lucro estimado</p>
          <strong className="mt-2 block text-2xl text-emerald-500">{brl.format(revenue - cost)}</strong>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[#7d8295]">Alertas de peças</p>
          <strong className="mt-2 block text-2xl text-[#ef5b6c]">{partsLow}</strong>
        </div>
      </section>

      <form className="card mb-6 flex flex-wrap gap-3 p-4">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0b1]" size={17} />
          <input className="input pl-11" name="q" defaultValue={q} placeholder="Buscar OS, cliente, telefone, CPF, IMEI, serial, modelo ou técnico..." />
        </div>
        <select className="input w-full sm:w-56" name="status" defaultValue={status ?? ""}>
          <option value="">Todos os status</option>
          {serviceStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button className="btn-secondary">Buscar</button>
      </form>

      <section className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Kanban das OS</h2>
          <p className="text-xs text-[#8b90a2]">Arraste o cartão para alterar status e registrar histórico.</p>
        </div>
        <ServiceKanban orders={orders.map((order) => ({ id: order.id, number: order.number, status: order.status, customer: order.customer.name, model: order.model, imei: order.imei, priority: order.priority }))} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-[#eceef3] px-5 py-4">
            <h2 className="font-semibold">OS recentes</h2>
            <p className="mt-1 text-xs text-[#8b90a2]">{orders.length} registros carregados</p>
          </div>
          {orders.length === 0 ? (
            <div className="grid min-h-56 place-items-center text-center text-[#8b90a2]">Nenhuma OS encontrada.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>OS</th><th>Cliente / aparelho</th><th>Status</th><th>Técnico</th><th>Previsão</th><th>Total</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><Link href={`/assistencia/${order.id}`} className="font-semibold text-[#465fda]">{order.number}</Link></td>
                      <td><p className="font-semibold text-[#222532]">{order.customer.name}</p><p className="mt-1 text-xs text-[#8b90a2]">{order.model} · {order.imei ?? "sem IMEI"}</p></td>
                      <td><span className={statusBadgeClass(order.status)}>{statusLabel[order.status]}</span></td>
                      <td>{order.technician?.name ?? "—"}</td>
                      <td>{order.expectedAt ? dateTime.format(order.expectedAt) : "—"}</td>
                      <td className="font-semibold">{brl.format(Number(order.totalCharged))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <form action={createTechnicianAction} className="card p-5">
            <h2 className="font-semibold">Cadastrar técnico</h2>
            <p className="mt-1 text-xs text-[#8b90a2]">Disponível para atribuição nas OS.</p>
            <div className="mt-4 space-y-3">
              <input className="input" name="name" placeholder="Nome do técnico" required />
              <input className="input" name="phone" placeholder="Telefone" />
              <input className="input" name="email" type="email" placeholder="E-mail" />
              <button className="btn-secondary w-full">Salvar técnico</button>
            </div>
          </form>
          <div className="card p-5">
            <h2 className="font-semibold">Prontas para retirada</h2>
            <div className="mt-4 space-y-3">
              {ready.length === 0 ? <p className="text-sm text-[#8b90a2]">Nenhuma OS pronta agora.</p> : ready.slice(0, 6).map((order) => (
                <Link key={order.id} href={`/assistencia/${order.id}`} className="block rounded-2xl border border-[#e8eaf1] p-3">
                  <p className="text-sm font-semibold">{order.number} · {order.customer.name}</p>
                  <p className="mt-1 text-[11px] text-[#8b90a2]">{order.readyAt ? `${Math.max(0, Math.floor((today.getTime() - order.readyAt.getTime()) / 86400000))} dia(s) aguardando` : "Pronto hoje"}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
