import { prisma } from "@/lib/prisma";
import type { Tx, Overrides, Settings, Project, Yearly, BudgetJaarOverride, MjpJaarRow } from "./engine";
import { DEFAULT_SETTINGS } from "./engine";

export type ProjectRow = Project & { id: string };
export type YearlyRow = Yearly & { id: string; inflatie: number | null };

export type FinanceState = {
  transactions: Tx[];
  overrides: Overrides;
  settings: Settings;
  projects: ProjectRow[];
  yearly: YearlyRow[];
  budgetJaar: BudgetJaarOverride[];
  mjpJaar: MjpJaarRow[];
};

// Reads the full raw finance state from the database and normalises Decimals
// to numbers, so the client-side engine can recompute everything live.
export async function loadFinance(): Promise<FinanceState> {
  const [txRows, ovrRows, settingsRow, projectRows, yearlyRows, budgetJaarRows, mjpJaarRows] =
    await Promise.all([
      prisma.financeTx.findMany({ orderBy: { date: "desc" } }),
      prisma.financeOverride.findMany(),
      prisma.financeSettings.findUnique({ where: { id: 1 } }),
      prisma.financeProject.findMany({ orderBy: { volgorde: "asc" } }),
      prisma.financeYearly.findMany({ orderBy: { volgorde: "asc" } }),
      prisma.financeBudgetJaar.findMany(),
      prisma.financeMjpJaar.findMany({ orderBy: { jaar: "asc" } }),
    ]);

  const transactions: Tx[] = txRows.map((t) => ({
    id: t.id,
    date: t.date,
    iban: t.iban,
    name: t.naam,
    balanceBefore: Number(t.balanceBefore),
    amount: Number(t.amount),
    code: t.code,
    seq: t.seq,
    desc: t.descr,
    bankCat: t.bankCat,
  }));

  const overrides: Overrides = {};
  for (const o of ovrRows) {
    overrides[o.txId] = {
      ...(o.cls ? { cls: o.cls as Overrides[string]["cls"] } : {}),
      ...(o.project != null ? { project: o.project } : {}),
      ...(o.bankCat != null ? { bankCat: o.bankCat } : {}),
      ...(o.notInvestment != null ? { notInvestment: o.notInvestment } : {}),
      ...(o.savingsInc != null ? { savingsInc: o.savingsInc } : {}),
    };
  }

  const settings: Settings = settingsRow
    ? {
        startNetWorth: Number(settingsRow.startNetWorth),
        returnRate: Number(settingsRow.returnRate),
        horizon: settingsRow.horizon,
        savingsGrowth: Number(settingsRow.savingsGrowth),
        monthlyBudget: Number(settingsRow.monthlyBudget),
        monthlyIncome: Number(settingsRow.monthlyIncome),
        threshold: Number(settingsRow.threshold),
        savingsAccounts: settingsRow.savingsAccounts,
        investmentAccounts: settingsRow.investmentAccounts,
        savingsIncidentalThreshold: Number(settingsRow.savingsIncidentalThreshold),
        categoryBudgets: (settingsRow.categoryBudgets as Record<string, number>) || {},
        personalSavings: Number(settingsRow.personalSavings),
        investmentValue: Number(settingsRow.investmentValue),
        categoryInflatie: (settingsRow.categoryInflatie as Record<string, number>) || {},
        inflatieDefault: Number(settingsRow.inflatieDefault),
        inkomenGroei: Number(settingsRow.inkomenGroei),
      }
    : { ...DEFAULT_SETTINGS };

  const projects: ProjectRow[] = projectRows.map((p) => ({
    id: p.id,
    name: p.naam,
    budget: Number(p.budget),
    year: p.jaar,
    done: p.done,
  }));
  const yearly: YearlyRow[] = yearlyRows.map((y) => ({
    id: y.id,
    name: y.naam,
    budget: Number(y.budget),
    inflatie: y.inflatie == null ? null : Number(y.inflatie),
  }));
  const budgetJaar: BudgetJaarOverride[] = budgetJaarRows.map((b) => ({
    jaar: b.jaar,
    soort: b.soort as "categorie" | "jaarpost",
    naam: b.naam,
    bedrag: Number(b.bedrag),
  }));
  const mjpJaar: MjpJaarRow[] = mjpJaarRows.map((m) => ({
    jaar: m.jaar,
    inkomen: m.inkomen == null ? null : Number(m.inkomen),
    investeringen: m.investeringen == null ? null : Number(m.investeringen),
    opResultaat: m.opResultaat == null ? null : Number(m.opResultaat),
  }));

  return { transactions, overrides, settings, projects, yearly, budgetJaar, mjpJaar };
}
