import { prisma } from "@/lib/prisma";
import type { Tx, Overrides, Settings, Project, Yearly } from "./engine";
import { DEFAULT_SETTINGS } from "./engine";

export type ProjectRow = Project & { id: string };
export type YearlyRow = Yearly & { id: string };

export type FinanceState = {
  transactions: Tx[];
  overrides: Overrides;
  settings: Settings;
  projects: ProjectRow[];
  yearly: YearlyRow[];
};

// Reads the full raw finance state from the database and normalises Decimals
// to numbers, so the client-side engine can recompute everything live.
export async function loadFinance(): Promise<FinanceState> {
  const [txRows, ovrRows, settingsRow, projectRows, yearlyRows] = await Promise.all([
    prisma.financeTx.findMany({ orderBy: { date: "desc" } }),
    prisma.financeOverride.findMany(),
    prisma.financeSettings.findUnique({ where: { id: 1 } }),
    prisma.financeProject.findMany({ orderBy: { volgorde: "asc" } }),
    prisma.financeYearly.findMany({ orderBy: { volgorde: "asc" } }),
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
  }));

  return { transactions, overrides, settings, projects, yearly };
}
