"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard, LogOut, ReceiptText, ShoppingCart, Users, Wrench } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Logo } from "@/components/logo";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendas/nova", label: "Nova venda", icon: ShoppingCart },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/assistencia", label: "Assistência", icon: Wrench },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/vendas", label: "Histórico", icon: ReceiptText },
  { href: "/financeiro", label: "Financeiro", icon: BarChart3 },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] shrink-0 flex-col border-r border-[#e8eaf1] bg-[#fbfbfd] px-4 py-5 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-9 flex min-h-0 flex-1 flex-col gap-1.5">
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.18em] text-[#a0a5b4]">Navegação</p>
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item group flex min-h-[56px] w-full items-center gap-3 rounded-[18px] px-3 py-3 text-[14px] font-semibold leading-none ${
                active
                  ? "is-active bg-[#eef2ff] text-[#465fda] shadow-[inset_0_0_0_1px_#e1e7ff]"
                  : "text-[#666c80] hover:bg-[#f2f4f8] hover:text-[#252838]"
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-[10px] transition ${
                  active
                    ? "bg-white text-[#5977f4] shadow-[0_3px_10px_rgba(54,70,130,.08)]"
                    : "text-[#858a9d] group-hover:text-[#5977f4]"
                }`}
              >
                <item.icon size={17} strokeWidth={1.8} />
              </span>
              <span className="relative z-10 min-w-0 flex-1 truncate whitespace-nowrap">{item.label}</span>
              {active && <span className="sidebar-active-rail" />}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-[#e8eaf1] bg-white p-3 shadow-[0_4px_16px_rgba(24,35,70,.04)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#e9eeff] to-[#f1ebff] text-xs font-bold text-[#5977f4]">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#292c3b]">{user.name}</p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-[#a0a5b4]">{user.role}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-medium text-[#8a8fa1] hover:bg-[#f4f5f8] hover:text-[#3d4152]">
            <LogOut size={14} strokeWidth={1.8} />
            Encerrar sessão
          </button>
        </form>
      </div>
    </aside>
  );
}
