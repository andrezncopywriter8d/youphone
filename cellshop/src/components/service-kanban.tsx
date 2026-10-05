"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ServiceOrderStatus } from "@prisma/client";
import { updateServiceOrderStatusAction } from "@/app/actions";
import { serviceStatuses, statusLabel } from "@/lib/service";

type KanbanOrder = {
  id: string;
  number: string;
  status: ServiceOrderStatus;
  customer: string;
  model: string;
  imei: string | null;
  priority: string;
};

export function ServiceKanban({ orders }: { orders: KanbanOrder[] }) {
  const [, startTransition] = useTransition();

  function move(orderId: string, status: ServiceOrderStatus) {
    startTransition(async () => {
      await updateServiceOrderStatusAction(orderId, status);
    });
  }

  return (
    <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-4 2xl:grid-cols-5">
      {serviceStatuses.filter((status) => !["DELIVERED", "CANCELED"].includes(status.value)).map((column) => {
        const columnOrders = orders.filter((order) => order.status === column.value);
        return (
          <section
            key={column.value}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const orderId = event.dataTransfer.getData("text/service-order-id");
              if (orderId) move(orderId, column.value);
            }}
            className="min-h-56 rounded-[20px] border border-[#e7e9f0] bg-[#fafbfe] p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#4a5065]">{column.label}</h3>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#8b90a2]">{columnOrders.length}</span>
            </div>
            <div className="space-y-2">
              {columnOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/assistencia/${order.id}`}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/service-order-id", order.id)}
                  className="block rounded-2xl border border-[#e8eaf1] bg-white p-3 shadow-[0_4px_14px_rgba(24,35,70,.04)] transition hover:-translate-y-0.5 hover:border-[#d7dced]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs text-[#242735]">{order.number}</strong>
                    {order.priority === "URGENT" && <span className="badge badge-red">Urgente</span>}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-[#363a4c]">{order.customer}</p>
                  <p className="mt-1 truncate text-[11px] text-[#8b90a2]">{order.model}</p>
                  <p className="mt-2 font-mono text-[10px] text-[#9aa0b1]">{order.imei ?? "Sem IMEI"}</p>
                </Link>
              ))}
              {columnOrders.length === 0 && <p className="rounded-2xl border border-dashed border-[#dfe3ee] p-4 text-center text-[11px] text-[#a0a6b8]">Arraste uma OS para {statusLabel[column.value].toLowerCase()}.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
