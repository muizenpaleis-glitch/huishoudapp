import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_SETTINGS, DEFAULT_PROJECTS, DEFAULT_YEARLY } from "./engine";
import { parseAsnCsv } from "./asn";
import { SAMPLE_CSV } from "./sample-csv";

// Seeds the finance module to the original dashboard's starting point:
// default settings/projects/yearly items + the embedded May-2026 ASN sample,
// so every computed figure matches finance_cockpit.html out of the box.
// Reused by the seed script, the "reset all data" action, and clear-demo.
export async function seedFinance(prisma: PrismaClient) {
  await prisma.financeOverride.deleteMany();
  await prisma.financeTx.deleteMany();
  await prisma.financeProject.deleteMany();
  await prisma.financeYearly.deleteMany();
  await prisma.financeSettings.deleteMany();

  await prisma.financeSettings.create({
    data: {
      id: 1,
      startNetWorth: DEFAULT_SETTINGS.startNetWorth,
      returnRate: DEFAULT_SETTINGS.returnRate,
      horizon: DEFAULT_SETTINGS.horizon,
      savingsGrowth: DEFAULT_SETTINGS.savingsGrowth,
      monthlyBudget: DEFAULT_SETTINGS.monthlyBudget,
      monthlyIncome: DEFAULT_SETTINGS.monthlyIncome,
      threshold: DEFAULT_SETTINGS.threshold,
      savingsAccounts: DEFAULT_SETTINGS.savingsAccounts,
      investmentAccounts: DEFAULT_SETTINGS.investmentAccounts,
      savingsIncidentalThreshold: DEFAULT_SETTINGS.savingsIncidentalThreshold,
      categoryBudgets: DEFAULT_SETTINGS.categoryBudgets,
      personalSavings: DEFAULT_SETTINGS.personalSavings,
      investmentValue: DEFAULT_SETTINGS.investmentValue,
    },
  });

  await prisma.financeProject.createMany({
    data: DEFAULT_PROJECTS.map((p, i) => ({
      naam: p.name,
      budget: p.budget,
      jaar: p.year,
      done: p.done,
      volgorde: i,
    })),
  });

  await prisma.financeYearly.createMany({
    data: DEFAULT_YEARLY.map((y, i) => ({ naam: y.name, budget: y.budget, volgorde: i })),
  });

  const txs = parseAsnCsv(SAMPLE_CSV);
  await prisma.financeTx.createMany({
    data: txs.map((t) => ({
      id: t.id,
      date: t.date,
      iban: t.iban,
      naam: t.name,
      balanceBefore: t.balanceBefore,
      amount: t.amount,
      code: t.code,
      seq: t.seq,
      descr: t.desc,
      bankCat: t.bankCat,
    })),
  });
}
