export const ROOM_ORDER = ["Woonkamer", "Keuken", "Slaapkamer", "Kantoor", "Tuin"];

export const KLEUR_TEMP_OPTS: { key: "warm" | "neutraal" | "koel"; label: string }[] = [
  { key: "warm", label: "Warm" },
  { key: "neutraal", label: "Neutraal" },
  { key: "koel", label: "Koel" },
];

export function kleurTempSwatch(key: string): { bg: string; c: string } {
  if (key === "warm") return { bg: "#F5E8CB", c: "#A9761C" };
  if (key === "koel") return { bg: "#E3ECF4", c: "#2F6E8F" };
  return { bg: "#EFE9DD", c: "#7C6B5B" };
}

export function fmtKwh(n: number): string {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kWh";
}

export function fmtKw(n: number): string {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kW";
}

export function fmtDuur(minuten: number): string {
  const u = Math.floor(minuten / 60);
  const m = minuten % 60;
  return u > 0 ? `${u}u ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

export function fmtTijd(d: Date): string {
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function fmtLeadenGeleden(d: Date): string {
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const uur = Math.round(min / 60);
  return `${uur} uur geleden`;
}

export const LAADPAAL_STATUS_LABEL: Record<string, { label: string; bg: string; c: string }> = {
  vrij: { label: "Vrij", bg: "#F1E5D3", c: "#7C6B5B" },
  laden: { label: "Laden", bg: "#E4ECDD", c: "#2F6E58" },
  gepauzeerd: { label: "Gepauzeerd", bg: "#F5E8CB", c: "#A9761C" },
  klaar: { label: "Klaar", bg: "#E4ECDD", c: "#2F6E58" },
};
