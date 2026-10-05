import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ServiceLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { customer: true } });
  if (!order) notFound();
  const path = `/os/consulta/${order.publicToken}`;
  const qr = await QRCode.toDataURL(path, { margin: 1, width: 220 });
  const imeiEnd = order.imei ? order.imei.slice(-4) : order.serial?.slice(-4) ?? "----";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link href={`/assistencia/${order.id}`} className="inline-flex items-center gap-2 text-sm text-[#7d8295] hover:text-[#465fda]"><ArrowLeft size={16} />Voltar à OS</Link>
        <button type="button" className="btn-primary"><Printer size={17} />Use ⌘P para imprimir</button>
      </div>
      <section className="mx-auto w-[380px] rounded-2xl border border-[#111] bg-white p-5 text-black print:border-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.18em]">CELLSHOP</p>
            <h1 className="mt-2 text-3xl font-black">{order.number}</h1>
            <p className="mt-2 text-lg font-bold uppercase">{order.customer.name.split(" ")[0]}</p>
            <p className="mt-1 text-sm font-semibold">{order.model}</p>
            <p className="mt-1 font-mono text-xs">IMEI final: {imeiEnd}</p>
            <p className="mt-1 text-xs">{new Intl.DateTimeFormat("pt-BR").format(order.createdAt)}</p>
          </div>
          <Image src={qr} alt="QR Code da OS" width={112} height={112} unoptimized />
        </div>
      </section>
    </div>
  );
}
