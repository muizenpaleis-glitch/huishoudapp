import type { OnderhoudCategorie, OnderhoudPrioriteit } from "@/generated/prisma/client";
import { dagenTussen } from "@/lib/format";

export const ONDERHOUD_CATEGORIEEN: OnderhoudCategorie[] = ["Huis", "Apparaten", "Auto", "Tuin", "Overig"];
export const PRIORITEITEN: OnderhoudPrioriteit[] = ["Hoog", "Gemiddeld", "Laag"];

export const CATEGORIE_TINT: Record<OnderhoudCategorie, { bg: string; c: string }> = {
  Huis: { bg: "#F6E3D7", c: "#C4633B" },
  Apparaten: { bg: "#F5E8CB", c: "#A9761C" },
  Auto: { bg: "#E7E3EE", c: "#6C5B8C" },
  Tuin: { bg: "#E4ECDD", c: "#5C7F55" },
  Overig: { bg: "#EFE7DA", c: "#7C6B5B" },
};

export const PRIO_RANG: Record<OnderhoudPrioriteit, number> = { Hoog: 0, Gemiddeld: 1, Laag: 2 };

export type Urgentie = "inactief" | "urgent" | "attentie" | "ok";

export function itemDatum(it: { type: string; volgende: Date | null; streefdatum: Date | null }): Date | null {
  return it.type === "periodiek" ? it.volgende : it.streefdatum;
}

export function urgentie(
  it: { type: string; status: string | null; volgende: Date | null; streefdatum: Date | null },
  drempel: number,
): Urgentie {
  if (it.type === "taak" && it.status === "Klaar") return "inactief";
  const d = itemDatum(it);
  if (!d) return "ok";
  const dgn = dagenTussen(d, new Date());
  if (dgn <= 7) return "urgent";
  if (dgn <= drempel) return "attentie";
  return "ok";
}

export function urgentieKleur(u: Urgentie): { bg: string; c: string } {
  if (u === "urgent") return { bg: "#F7E0D5", c: "#BC4A26" };
  if (u === "attentie") return { bg: "#F5E8CB", c: "#A9761C" };
  return { bg: "#F1E5D3", c: "#9A8776" };
}

export function isoPlusMaanden(d: Date, maanden: number): Date {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + maanden);
  return nd;
}

export function intervalLabel(maanden: number): string {
  if (maanden === 12) return "Elk jaar";
  if (maanden === 1) return "Elke maand";
  return `Elke ${maanden} maanden`;
}

export function taakStatusLabel(status: string): string {
  return status.replace("_", " ");
}
