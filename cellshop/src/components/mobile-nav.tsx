"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, ShoppingCart, Users } from "lucide-react";
const items=[{href:"/",label:"Início",icon:LayoutDashboard},{href:"/estoque",label:"Estoque",icon:Boxes},{href:"/vendas/nova",label:"Vender",icon:ShoppingCart},{href:"/clientes",label:"Clientes",icon:Users}];
export function MobileNav(){const pathname=usePathname();return <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-[#e3e6ee] bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(35,44,80,.14)] backdrop-blur-xl lg:hidden">{items.map(item=>{const active=item.href==="/"?pathname===item.href:pathname.startsWith(item.href);return <Link key={item.href} href={item.href} className={`mobile-nav-item ${active?"is-active":"text-[#8c91a2]"}`}><item.icon size={17} strokeWidth={1.8}/>{item.label}</Link>})}</nav>}
