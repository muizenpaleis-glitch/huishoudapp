const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MND_VOL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export function fmtKort(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${d.getDate()} ${MND[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtZonderJaar(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${d.getDate()} ${MND[d.getMonth()]}`;
}

export function maandVol(d: Date): string {
  return `${MND_VOL[d.getMonth()]} ${d.getFullYear()}`;
}

export function maandKort(d: Date): string {
  return MND[d.getMonth()];
}

export function dagenTussen(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function eur(n: number, dec = false): string {
  const v = Math.round(Math.abs(n) * (dec ? 100 : 1)) / (dec ? 100 : 1);
  const s = v.toLocaleString("nl-NL", {
    minimumFractionDigits: dec ? 2 : 0,
    maximumFractionDigits: dec ? 2 : 0,
  });
  return (n < 0 ? "−" : "") + "€" + s;
}
