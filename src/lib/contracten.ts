import type { Contract, ContractCategorie } from "@/generated/prisma/client";
import { dagenTussen } from "@/lib/format";

export const CONTRACT_CATEGORIEEN: ContractCategorie[] = [
  "Energie",
  "Verzekering",
  "Abonnement",
  "Overig",
];

export const CATEGORIE_TINT: Record<ContractCategorie, { bg: string; c: string }> = {
  Energie: { bg: "#F5E8CB", c: "#A9761C" },
  Verzekering: { bg: "#E4ECDD", c: "#5C7F55" },
  Abonnement: { bg: "#F6E3D7", c: "#C4633B" },
  Overig: { bg: "#EEE4F0", c: "#7E5F8C" },
};

export type Urgentie = "inactief" | "urgent" | "attentie" | "ok";

export function deadline(c: Pick<Contract, "opzegType" | "opzegDatum" | "einddatum" | "opzegMaanden">): Date | null {
  if (c.opzegType === "datum" && c.opzegDatum) return c.opzegDatum;
  if (!c.einddatum) return null;
  const d = new Date(c.einddatum);
  d.setMonth(d.getMonth() - (c.opzegMaanden || 1));
  return d;
}

export function urgentie(c: Contract, drempel: number): Urgentie {
  if (c.status !== "Actief") return "inactief";
  const dl = deadline(c);
  if (!dl) return "ok";
  const dgn = dagenTussen(dl, new Date());
  if (dgn <= 30) return "urgent";
  if (dgn <= drempel) return "attentie";
  return "ok";
}

export function urgentieKleur(u: Urgentie): { bg: string; c: string } {
  if (u === "urgent") return { bg: "#F7E0D5", c: "#BC4A26" };
  if (u === "attentie") return { bg: "#F5E8CB", c: "#A9761C" };
  if (u === "inactief") return { bg: "#EFE7DA", c: "#9A8776" };
  return { bg: "#F1E5D3", c: "#9A8776" };
}
