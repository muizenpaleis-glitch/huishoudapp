// Currency formatting matching the original finance_cockpit.html (nl-NL).
const fmt2 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const fmt0 = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function fmtEUR(v: number): string {
  return fmt2.format(v);
}
export function fmtEUR0(v: number): string {
  return fmt0.format(v);
}
export function signedEUR(v: number): string {
  return (v >= 0 ? "+" : "−") + fmt0.format(Math.abs(v));
}
