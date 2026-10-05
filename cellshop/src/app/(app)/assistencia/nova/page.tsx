import Link from "next/link";
import { ArrowLeft, ScanLine, ShieldCheck, Smartphone, UserPlus } from "lucide-react";
import { createServiceOrderAction } from "@/app/actions";
import { Flash } from "@/components/flash";
import { prisma } from "@/lib/prisma";
import { reportedIssueOptions } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function NewServiceOrderPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const [{ erro }, customers, technicians] = await Promise.all([
    searchParams,
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="mb-7">
        <Link href="/assistencia" className="mb-4 inline-flex items-center gap-2 text-sm text-[#7d8295] hover:text-[#465fda]"><ArrowLeft size={16} />Voltar à assistência</Link>
        <p className="eyebrow">Cadastro expresso</p>
        <h1 className="page-title mt-1">Nova Ordem de Serviço</h1>
        <p className="page-subtitle">Cliente → aparelho → defeito → salvar. Os detalhes avançados ficam para depois.</p>
      </div>
      <Flash error={erro} />

      <form action={createServiceOrderAction} className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-tile size-10 rounded-xl"><UserPlus size={20} /></span>
              <div><h2 className="font-semibold">Cliente</h2><p className="text-xs text-[#8b90a2]">Busque um cliente existente ou cadastre sem sair da OS.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Cliente existente</label>
                <select className="input" name="customerId" defaultValue="">
                  <option value="">Criar novo cliente abaixo</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone} {customer.cpf ? `· ${customer.cpf}` : ""}</option>)}
                </select>
              </div>
              <div><label className="label">Nome do novo cliente</label><input className="input" name="customerName" placeholder="Nome completo" /></div>
              <div><label className="label">Telefone</label><input className="input" name="customerPhone" inputMode="tel" placeholder="(85) 99999-9999" /></div>
              <div><label className="label">CPF</label><input className="input" name="customerCpf" inputMode="numeric" /></div>
              <div><label className="label">E-mail</label><input className="input" name="customerEmail" type="email" /></div>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-tile size-10 rounded-xl"><Smartphone size={20} /></span>
              <div><h2 className="font-semibold">Aparelho</h2><p className="text-xs text-[#8b90a2]">O campo IMEI aceita leitor de código de barras.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label">Categoria</label><input className="input" name="category" defaultValue="Smartphone" /></div>
              <div><label className="label">Marca</label><input className="input" name="brand" defaultValue="Apple" /></div>
              <div><label className="label">Modelo *</label><input className="input" name="model" placeholder="iPhone 13" required /></div>
              <div><label className="label">Cor</label><input className="input" name="color" placeholder="Preto" /></div>
              <div><label className="label">Capacidade</label><select className="input" name="capacity"><option value="">Selecionar</option><option>64 GB</option><option>128 GB</option><option>256 GB</option><option>512 GB</option><option>1 TB</option></select></div>
              <div><label className="label">Número de modelo</label><input className="input uppercase" name="modelNumber" placeholder="A2633" /></div>
              <div className="md:col-span-2"><label className="label">IMEI / código lido</label><div className="relative"><ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0b1]" size={17} /><input className="input pl-11 font-mono" name="imei" inputMode="numeric" maxLength={18} autoFocus placeholder="Posicione aqui e leia o IMEI" /></div></div>
              <div><label className="label">IMEI 2</label><input className="input font-mono" name="imei2" inputMode="numeric" /></div>
              <div><label className="label">Serial</label><input className="input uppercase" name="serial" /></div>
              <div><label className="label">Senha de desbloqueio</label><input className="input" name="unlockPassword" placeholder="Opcional" /></div>
              <div><label className="label">Acessórios entregues</label><input className="input" name="accessories" placeholder="Capa, cabo, chip..." /></div>
              <div className="md:col-span-2"><label className="label">Observações do aparelho</label><textarea className="input min-h-20" name="deviceNotes" /></div>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-tile size-10 rounded-xl"><ShieldCheck size={20} /></span>
              <div><h2 className="font-semibold">Defeito relatado</h2><p className="text-xs text-[#8b90a2]">Selecione múltiplos sintomas sem digitação repetitiva.</p></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reportedIssueOptions.map((issue) => (
                <label key={issue} className="flex items-center gap-2 rounded-xl border border-[#e8eaf1] bg-white px-3 py-2 text-sm text-[#4a5065]">
                  <input type="checkbox" name="reportedIssues" value={issue} className="size-4 accent-[#5977f4]" />
                  {issue}
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><label className="label">Prioridade</label><select className="input" name="priority"><option value="NORMAL">Normal</option><option value="URGENT">Urgente</option></select></div>
              <div><label className="label">Previsão</label><input className="input" type="date" name="expectedAt" /></div>
              <div className="md:col-span-2"><label className="label">Descrição do cliente</label><textarea className="input min-h-24" name="customerDescription" placeholder="Relato livre do cliente" /></div>
              <div className="md:col-span-2"><label className="label">Observação interna</label><textarea className="input min-h-20" name="internalNote" placeholder="Visível apenas internamente" /></div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold">Responsável</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Técnico</label>
                <select className="input" name="technicianId" defaultValue="">
                  <option value="">Definir depois</option>
                  {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                </select>
              </div>
              <button className="btn-primary h-12 w-full">Abrir OS</button>
              <Link href="/assistencia" className="btn-secondary h-12 w-full">Cancelar</Link>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">Depois de salvar</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#7d8295]">
              <li>• OS numerada automaticamente</li>
              <li>• Checklist de entrada criado</li>
              <li>• Histórico/auditoria registrados</li>
              <li>• QR/etiqueta disponível</li>
            </ul>
          </div>
        </aside>
      </form>
    </>
  );
}
