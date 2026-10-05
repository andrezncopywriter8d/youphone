import { notFound } from "next/navigation";
import { Smartphone } from "lucide-react";
import { brl, dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { quoteStatusLabel, statusLabel } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function PublicServiceOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.serviceOrder.findUnique({
    where: { publicToken: token },
    include: { customer: true, quote: true },
  });
  if (!order) notFound();

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-8 text-[#171925]">
      <section className="mx-auto max-w-xl rounded-[28px] border border-[#e8eaf1] bg-white p-6 shadow-[0_16px_48px_rgba(24,35,70,.08)]">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#5977f4] to-[#8b6df3] text-white"><Smartphone size={24} /></span>
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-[#8b90a2]">CELLSHOP</p>
            <h1 className="text-2xl font-bold">{order.number}</h1>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-[#f7f8fc] p-5">
          <p className="text-xs text-[#8b90a2]">Status atual</p>
          <strong className="mt-2 block text-xl">{statusLabel[order.status]}</strong>
        </div>
        <div className="mt-6 grid gap-4 text-sm">
          <p className="flex justify-between gap-4"><span className="text-[#7d8295]">Cliente</span><strong>{order.customer.name}</strong></p>
          <p className="flex justify-between gap-4"><span className="text-[#7d8295]">Aparelho</span><strong>{order.model}</strong></p>
          <p className="flex justify-between gap-4"><span className="text-[#7d8295]">Entrada</span><strong>{dateTime.format(order.createdAt)}</strong></p>
          <p className="flex justify-between gap-4"><span className="text-[#7d8295]">Previsão</span><strong>{order.expectedAt ? dateTime.format(order.expectedAt) : "Em análise"}</strong></p>
          {order.quote && <p className="flex justify-between gap-4"><span className="text-[#7d8295]">Orçamento</span><strong>{quoteStatusLabel[order.quote.status]} · {brl.format(Number(order.quote.total))}</strong></p>}
        </div>
        <p className="mt-6 rounded-2xl border border-[#e8eaf1] p-4 text-xs leading-5 text-[#7d8295]">
          Esta página mostra apenas informações de acompanhamento. Custos internos, lucro, senha, observações administrativas e dados sensíveis não são exibidos.
        </p>
      </section>
    </main>
  );
}
