import Link from "next/link";
import { AlertCircle, ArrowRight, Boxes, CircleDollarSign, CreditCard, PackagePlus, QrCode, ReceiptText, ShoppingCart, Smartphone, Users, WalletCards, Wrench } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";
import { brl, dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export default async function DashboardPage(){
  const start=new Date();start.setHours(0,0,0,0);
  const weekStart=new Date(start);weekStart.setDate(start.getDate()-6);
  const[available,customers,todaySales,stockValue,recent,payments,weekSales]=await Promise.all([
    prisma.inventoryUnit.count({where:{status:"AVAILABLE",deletedAt:null}}),prisma.customer.count(),
    prisma.sale.aggregate({where:{status:"COMPLETED",createdAt:{gte:start}},_count:true,_sum:{netTotal:true}}),
    prisma.inventoryUnit.aggregate({where:{status:"AVAILABLE",deletedAt:null},_sum:{purchaseCost:true}}),
    prisma.sale.findMany({take:5,orderBy:{createdAt:"desc"},include:{customer:true,items:true}}),
    prisma.payment.groupBy({by:["method"],where:{sale:{status:"COMPLETED",createdAt:{gte:start}}},_sum:{amount:true}}),
    prisma.sale.findMany({where:{status:"COMPLETED",createdAt:{gte:weekStart}},select:{createdAt:true,netTotal:true}}),
  ]);
  const payment=(method:string)=>Number(payments.find(p=>p.method===method)?._sum.amount??0);
  const chart=Array.from({length:7},(_,i)=>{const day=new Date(weekStart);day.setDate(weekStart.getDate()+i);const value=weekSales.filter(s=>s.createdAt.toDateString()===day.toDateString()).reduce((sum,s)=>sum+Number(s.netTotal),0);return{label:new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(day).replace(".",""),value};});
  const quick=[
    {href:"/estoque",label:"Estoque",detail:"Consultar unidades",icon:Boxes,color:"#5977f4",bg:"#eef2ff"},
    {href:"/clientes",label:"Clientes",detail:"Base de contatos",icon:Users,color:"#8b6df3",bg:"#f4f0ff"},
    {href:"/vendas/nova",label:"Nova venda",detail:"Abrir o PDV",icon:ShoppingCart,color:"#19ae73",bg:"#eaf9f2"},
    {href:"/assistencia",label:"Assistência",detail:"OS e reparos",icon:Wrench,color:"#5977f4",bg:"#eef2ff"},
    {href:"/estoque/novo",label:"Novo aparelho",detail:"Entrada por IMEI",icon:PackagePlus,color:"#e8862d",bg:"#fff5ea"},
    {href:"/vendas",label:"Histórico",detail:"Vendas e estornos",icon:ReceiptText,color:"#ec6172",bg:"#fff0f3"},
    {href:"/financeiro",label:"Financeiro",detail:"Entradas e saldo",icon:WalletCards,color:"#6d5bd0",bg:"#f2efff"},
  ];
  const metrics=[
    {label:"Vendas hoje",value:String(todaySales._count),detail:"operações concluídas",icon:ShoppingCart,color:"#18af72",bg:"linear-gradient(135deg,#effbf6,#ffffff)",border:"#d9f2e7"},
    {label:"Receita hoje",value:brl.format(Number(todaySales._sum.netTotal??0)),detail:"valor líquido",icon:CircleDollarSign,color:"#8b6df3",bg:"linear-gradient(135deg,#f7f1ff,#ffffff)",border:"#eadfff"},
    {label:"Em estoque",value:String(available),detail:"unidades disponíveis",icon:Boxes,color:"#5977f4",bg:"linear-gradient(135deg,#eef3ff,#ffffff)",border:"#dce5ff"},
    {label:"Total de clientes",value:String(customers),detail:brl.format(Number(stockValue._sum.purchaseCost??0))+" em custo",icon:Users,color:"#ee7359",bg:"linear-gradient(135deg,#fff3ee,#ffffff)",border:"#ffe1d7"},
  ];
  const noticeCount=(available<=5?1:0)+(Number(todaySales._sum.netTotal??0)===0?1:0);
  const urgentNotice=available<=5
    ? `${available} aparelhos disponíveis: revise a reposição`
    : Number(todaySales._sum.netTotal??0)===0
      ? "Nenhuma venda concluída hoje"
      : "Operação saudável, sem alertas críticos";
  return <>
    <div className="mb-7"><p className="eyebrow">Central de gestão</p><h1 className="page-title mt-1">Dashboard</h1><p className="page-subtitle">Tudo o que importa para sua operação, em uma única visão.</p></div>
    <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><div><div className="mb-4 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#eef2ff] text-[#5977f4]"><QrCode size={17} strokeWidth={1.8}/></span><h2 className="text-lg font-semibold">Acesso rápido</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{quick.map(item=><Link key={item.label} href={item.href} className="group flex min-h-[96px] items-center gap-4 rounded-[18px] border border-[#e7e9f0] bg-white p-4 shadow-[0_3px_12px_rgba(24,35,70,.035)] transition hover:-translate-y-0.5 hover:border-[#d5daeb] hover:shadow-[0_8px_24px_rgba(34,48,90,.08)]"><span className="grid size-11 shrink-0 place-items-center rounded-[13px]" style={{color:item.color,background:item.bg}}><item.icon size={22} strokeWidth={1.8}/></span><div><p className="text-sm font-semibold text-[#252837]">{item.label}</p><p className="mt-1 text-[10px] text-[#999ead]">{item.detail}</p></div></Link>)}</div></div>
      <div><div className="mb-4 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#fff4e9] text-[#ff6b2d]"><AlertCircle size={17} strokeWidth={1.8}/></span><h2 className="text-lg font-semibold">Avisos</h2></div><div className="relative flex h-[205px] items-center justify-between overflow-hidden rounded-[20px] border border-[#e7e9f0] bg-white p-6 shadow-[0_3px_12px_rgba(24,35,70,.035)]"><div className="absolute -right-16 -top-20 size-52 rounded-full bg-[#eef2ff]"/><div className="relative max-w-[320px]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#5977f4] to-[#8b6df3] text-xs font-semibold text-white shadow-[0_8px_18px_rgba(89,119,244,.28)]">AI</span><h3 className="text-xl font-semibold">Central Cellshop</h3></div><p className="mt-4 text-sm text-[#858a9c]">{noticeCount} pendência{noticeCount===1?"":"s"} em 2 áreas</p><p className="mt-2 text-sm font-semibold text-[#252837]">Mais urgente: {urgentNotice}</p></div><Link href="/estoque" aria-label="Abrir avisos" className="relative grid size-14 shrink-0 place-items-center rounded-full bg-[#ff6b2d] text-white shadow-[0_10px_22px_rgba(255,107,45,.24)] transition hover:-translate-y-0.5"><ArrowRight size={26} strokeWidth={1.9}/></Link></div></div>
    </section>
    <div className="mb-4 mt-8 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#f1efff] text-[#8267ec]"><CircleDollarSign size={17} strokeWidth={1.8}/></span><h2 className="text-lg font-semibold">Indicadores</h2></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric=><div key={metric.label} className="rounded-[20px] border p-5" style={{background:metric.bg,borderColor:metric.border}}><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-[#7f8495]">{metric.label}</p><strong className="metric-value mt-4 block text-[25px] font-semibold text-[#1c1e2a]">{metric.value}</strong></div><span className="grid size-12 place-items-center rounded-full bg-white/80 shadow-[0_5px_16px_rgba(30,40,80,.05)]" style={{color:metric.color}}><metric.icon size={23} strokeWidth={1.8}/></span></div><p className="mt-4 text-[10px] text-[#9ca1b0]">{metric.detail}</p></div>)}</section>
    <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      {label:"PIX hoje",value:payment("PIX"),icon:QrCode,color:"#20b978"},{label:"Cartão hoje",value:payment("CREDIT_CARD")+payment("DEBIT_CARD"),icon:CreditCard,color:"#5977f4"},{label:"Dinheiro hoje",value:payment("CASH"),icon:WalletCards,color:"#8b6df3"},{label:"Transferência",value:payment("TRANSFER"),icon:Smartphone,color:"#ee8b31"},
    ].map(item=><div key={item.label} className="flex items-center justify-between rounded-[18px] border border-[#e7e9f0] bg-white p-5 shadow-[0_3px_12px_rgba(24,35,70,.03)]"><div><p className="text-[11px] text-[#8e93a4]">{item.label}</p><strong className="metric-value mt-2 block text-base text-[#242633]">{brl.format(item.value)}</strong></div><item.icon size={21} strokeWidth={1.8} style={{color:item.color}}/></div>)}</section>
    <section className="card mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef3] px-6 py-5"><div><h2 className="text-base font-semibold">Desempenho de vendas</h2><p className="mt-1 text-[11px] text-[#9297a8]">Receita dos últimos sete dias</p></div><span className="rounded-xl border border-[#e4e6ed] bg-[#fafbfc] px-3 py-2 text-[10px] font-medium text-[#727789]">Últimos 7 dias</span></div><div className="px-4 pt-3"><SalesChart data={chart}/></div></section>
    <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-[#eceef3] px-6 py-5"><div><h2 className="text-base font-semibold">Vendas recentes</h2><p className="mt-1 text-[11px] text-[#9297a8]">Últimas movimentações registradas</p></div><Link href="/vendas" className="flex items-center gap-1.5 text-xs font-semibold text-[#5977f4]">Ver todas <ArrowRight size={14}/></Link></div>{recent.length===0?<div className="grid min-h-52 place-items-center text-center"><div><ShoppingCart className="mx-auto text-[#c3c7d2]" size={32} strokeWidth={1.6}/><p className="mt-3 text-sm font-medium">Nenhuma venda ainda</p></div></div>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Venda</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>{recent.map(sale=><tr key={sale.id}><td className="font-semibold text-[#222532]">{sale.number}</td><td>{sale.customer?.name??"Consumidor"}</td><td>{dateTime.format(sale.createdAt)}</td><td className="font-semibold">{brl.format(Number(sale.netTotal))}</td><td><span className={sale.status==="COMPLETED"?"badge badge-green":"badge badge-red"}>{sale.status==="COMPLETED"?"Concluída":"Cancelada"}</span></td></tr>)}</tbody></table></div>}</section>
  </>;
}
