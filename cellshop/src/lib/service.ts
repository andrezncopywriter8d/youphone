import type { ChecklistPhase, ChecklistResult, QuoteStatus, ServiceOrderStatus, ServicePriority } from "@prisma/client";

export const serviceStatuses: { value: ServiceOrderStatus; label: string }[] = [
  { value: "ENTRY", label: "Entrada" },
  { value: "WAITING_DIAGNOSIS", label: "Aguard. diagnóstico" },
  { value: "WAITING_APPROVAL", label: "Aguard. aprovação" },
  { value: "WAITING_PART", label: "Aguard. peça" },
  { value: "IN_REPAIR", label: "Em reparo" },
  { value: "IN_TESTING", label: "Em testes" },
  { value: "READY_FOR_PICKUP", label: "Pronto retirada" },
  { value: "DELIVERED", label: "Entregue" },
  { value: "CANCELED", label: "Cancelado" },
];

export const statusLabel = Object.fromEntries(serviceStatuses.map((status) => [status.value, status.label])) as Record<ServiceOrderStatus, string>;

export const servicePriorityLabel: Record<ServicePriority, string> = {
  NORMAL: "Normal",
  URGENT: "Urgente",
};

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  APPROVED: "Aprovado",
  REFUSED: "Recusado",
  EXPIRED: "Expirado",
};

export const checklistResultLabel: Record<ChecklistResult, string> = {
  OK: "OK",
  DEFECTIVE: "Com defeito",
  NOT_TESTED: "Não testado",
  NOT_APPLICABLE: "Não se aplica",
};

export const checklistPhaseLabel: Record<ChecklistPhase, string> = {
  ENTRY: "Entrada",
  FINAL: "Teste final",
};

export const reportedIssueOptions = [
  "Tela quebrada",
  "Não liga",
  "Não carrega",
  "Bateria descarregando",
  "Face ID",
  "Câmera",
  "Áudio",
  "Conector",
  "Sinal",
  "Wi-Fi",
  "Dano por líquido",
  "Outro",
];

export const checklistItems = [
  "Tela",
  "Touch",
  "Face ID / Touch ID",
  "True Tone",
  "Câmera frontal",
  "Câmera traseira",
  "Flash",
  "Microfone",
  "Alto-falante",
  "Auricular",
  "Botões",
  "Vibração",
  "Wi-Fi",
  "Bluetooth",
  "Rede móvel",
  "Carregamento",
  "Carregamento sem fio",
  "Bateria",
  "Traseira",
  "Lentes",
  "Estrutura",
  "Sensores",
  "Conector",
];

export function statusBadgeClass(status: ServiceOrderStatus) {
  if (status === "DELIVERED") return "badge badge-green";
  if (status === "CANCELED") return "badge badge-red";
  if (status === "READY_FOR_PICKUP") return "badge badge-orange";
  return "badge badge-orange";
}

export function whatsappHref(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  const withCountry = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
