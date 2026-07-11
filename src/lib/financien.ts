export function eur(n: number, dec = false): string {
  const v = Math.round(Math.abs(n) * (dec ? 100 : 1)) / (dec ? 100 : 1);
  const s = v.toLocaleString("nl-NL", {
    minimumFractionDigits: dec ? 2 : 0,
    maximumFractionDigits: dec ? 2 : 0,
  });
  return (n < 0 ? "−" : "") + "€" + s;
}

export type MaandFactor = { maand: string; kort: string; lang: string; factor: number };
export type CategorieBudget = {
  id: string;
  label: string;
  budgetMaandelijks: number | null;
  actualMaandelijks: number;
  kleur: string | null;
  vast: boolean;
  inSpendOverzicht: boolean;
  inBudgetOverzicht: boolean;
};
export type IncidenteelProject = {
  id: string;
  naam: string;
  budget: number;
  jaar: number;
  done: boolean;
  besteed: number;
};
export type JaarlijksItem = {
  id: string;
  naam: string;
  budgetJaarlijks: number;
  besteed2026: number;
};
export type Transactie = {
  id: string;
  datum: string;
  naam: string;
  omschrijving: string;
  bankCategorie: string;
  bedrag: number;
  klasse: "recurring" | "yearly" | "incidental" | "exclude";
  projectId: string | null;
  jaarlijksItemId: string | null;
};
export type NetWorth = {
  buffer: number;
  spaargeld: number;
  beleggingen: number;
  startVermogen: number;
  kritiekeGrens: number;
  incomeMaand: number;
  spendBudgetMaand: number;
  spendActualMaand: number;
};
export type MjpResultaat = { jaar: number; opResultaat: number };

export function netWorthLine(nw: NetWorth, mjp: MjpResultaat[], projecten: IncidenteelProject[]) {
  const jaren = [2025, 2026, 2027, 2028, 2029, 2030, 2031];
  const opResult = Object.fromEntries(mjp.map((m) => [m.jaar, m.opResultaat]));
  const totaalVoorJaar = (y: number) => projecten.filter((p) => p.jaar === y).reduce((s, p) => s + p.budget, 0);
  const vals = [nw.startVermogen];
  for (let i = 1; i < jaren.length; i++) {
    const y = jaren[i];
    vals.push(vals[i - 1] + (opResult[y] || 0) - totaalVoorJaar(y));
  }
  return { jaren, vals };
}

export function barCol(spent: number, budget: number): string {
  const pc = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
  if (spent > budget && budget > 0) return "#BC4A26";
  if (pc > 80) return "#A9761C";
  return "#5C7F55";
}
