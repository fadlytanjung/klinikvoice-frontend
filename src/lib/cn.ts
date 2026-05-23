import clsx, { type ClassValue } from "clsx";

export const cn = (...args: ClassValue[]) => clsx(...args);

/** Format integer cents to a localized currency string, e.g. 17500000 → "IDR 175.000". */
export function formatPrice(cents: number | null | undefined, currency = "IDR"): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  return `${currency} ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}
