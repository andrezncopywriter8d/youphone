export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza",
  dateStyle: "short",
  timeStyle: "short",
});

export function digits(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function money(value: FormDataEntryValue | string | number | null) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "0").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
