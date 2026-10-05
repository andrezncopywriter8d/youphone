import Link from "next/link";
import { ArrowLeft, Boxes, Plus, Search } from "lucide-react";
import { createPartAction } from "@/app/actions";
import { Flash } from "@/components/flash";
import { brl, dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; erro?: string }> }) {
  const { q = "", ok, erro } = await searchParams;
  const parts = await prisma.part.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }, { compatibleModel: { contains: q, mode: "insensitive" } }] }
      : {},
    include: { compatibilities: true, movements: { take: 3, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
    take: 150,
  });

  return (
    <>
      <div className="mb-7">
        <Link href="/assistencia" className="mb-4 inline-flex items-center gap-2 text-sm text-[#7d8295] hover:text-[#465fda]"><ArrowLeft size={16} />Voltar à assistência</Link>
        <p className="eyebrow">Assistência</p>
        <h1 className="page-title mt-1">Estoque de peças</h1>
        <p className="page-subtitle">Controle físico, reservado, disponível, compatibilidade e movimentações.</p>
      </div>
      <Flash ok={ok} error={erro} />

      <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createPartAction} className="card h-fit p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="icon-tile size-10 rounded-xl"><Plus size={20} /></span>
            <div><h2 className="font-semibold">Nova peça</h2><p className="text-xs text-[#8b90a2]">Cadastro estruturado para iPhones.</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div><label className="label">SKU *</label><input className="input" name="sku" required /></div>
            <div><label className="label">Código de barras</label><input className="input" name="barcode" /></div>
            <div><label className="label">Nome *</label><input className="input" name="name" placeholder="Tela iPhone 13 OLED" required /></div>
            <div><label className="label">Categoria</label><input className="input" name="category" placeholder="Tela, bateria, conector..." /></div>
            <div><label className="label">Marca / qualidade</label><input className="input" name="quality" placeholder="JK OLED, Diamond, Original..." /></div>
            <div><label className="label">Modelo compatível principal</label><input className="input" name="compatibleModel" placeholder="iPhone 13" /></div>
            <div><label className="label">Compatibilidades extras</label><input className="input" name="compatibilities" placeholder="iPhone 13, iPhone 13 Pro" /></div>
            <div><label className="label">Fornecedor</label><input className="input" name="supplier" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="label">Custo</label><input className="input" name="cost" inputMode="decimal" /></div><div><label className="label">Preço</label><input className="input" name="price" inputMode="decimal" /></div></div>
            <div className="grid grid-cols-3 gap-3"><div><label className="label">Qtd.</label><input className="input" name="quantity" type="number" min="0" defaultValue={0} /></div><div><label className="label">Mínimo</label><input className="input" name="minimumStock" type="number" min="0" defaultValue={0} /></div><div><label className="label">Local</label><input className="input" name="location" /></div></div>
            <button className="btn-primary h-12">Cadastrar peça</button>
          </div>
        </form>

        <section className="card overflow-hidden">
          <form className="flex gap-3 border-b border-[#eceef3] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0b1]" size={17} />
              <input className="input pl-11" name="q" defaultValue={q} placeholder="Buscar SKU, peça, código ou modelo..." />
            </div>
            <button className="btn-secondary">Buscar</button>
          </form>
          {parts.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-center"><div><Boxes className="mx-auto text-[#c3c7d2]" size={38} /><p className="mt-3 font-semibold text-[#7d8295]">Nenhuma peça encontrada</p></div></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Peça</th><th>Compatibilidade</th><th>Estoque</th><th>Valores</th><th>Última mov.</th></tr></thead>
                <tbody>
                  {parts.map((part) => {
                    const available = part.quantity - part.reserved;
                    return (
                      <tr key={part.id}>
                        <td><p className="font-semibold text-[#222532]">{part.name}</p><p className="mt-1 text-xs text-[#8b90a2]">{part.sku} {part.barcode ? `· ${part.barcode}` : ""}</p></td>
                        <td><p>{part.compatibleModel ?? "Geral"}</p><p className="mt-1 text-xs text-[#8b90a2]">{part.compatibilities.map((item) => item.model).join(", ") || "—"}</p></td>
                        <td><span className={available <= part.minimumStock ? "badge badge-red" : "badge badge-green"}>{available} disp.</span><p className="mt-1 text-xs text-[#8b90a2]">{part.quantity} físico · {part.reserved} reservado</p></td>
                        <td><p>{brl.format(Number(part.price))}</p><p className="mt-1 text-xs text-[#8b90a2]">custo {brl.format(Number(part.cost))}</p></td>
                        <td>{part.movements[0] ? <><p className="text-xs">{part.movements[0].type}</p><p className="mt-1 text-xs text-[#8b90a2]">{dateTime.format(part.movements[0].createdAt)}</p></> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
