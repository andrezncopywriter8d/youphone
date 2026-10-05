import { Smartphone } from "lucide-react";

export function Logo({ compact=false }: { compact?:boolean }) {
  return <div className="flex items-center gap-3">
    <span className="relative grid size-10 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#5977f4] to-[#8b6df3] text-white shadow-[0_8px_24px_rgba(75,100,218,.2)] before:absolute before:inset-px before:rounded-[13px] before:border before:border-white/20"><Smartphone className="relative" size={20} strokeWidth={2}/></span>
    {!compact&&<span><strong className="block text-[14px] font-bold tracking-[.12em] text-[#171925]">CELLSHOP</strong><small className="mt-0.5 block text-[10px] font-medium tracking-wide text-[#9297a7]">GESTÃO INTELIGENTE</small></span>}
  </div>;
}
