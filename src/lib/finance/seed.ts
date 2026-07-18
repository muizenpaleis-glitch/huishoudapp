import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_SETTINGS, DEFAULT_PROJECTS, DEFAULT_YEARLY } from "./engine";
import { parseAsnCsv } from "./asn";
import { SAMPLE_CSV } from "./sample-csv";

// Seeds just the budget structure (settings + default projects/yearly items),
// with zero transactions and no bank IBANs. Used for the friends-facing demo
// deployment, where no real spending history, net-worth position, or account
// number should be visible — only the reference budget model that ships with
// the app's code either way.
export async function seedFinanceStructure(prisma: PrismaClient) {
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
      savingsAccounts: [], // no real IBANs in the demo
      investmentAccounts: [],
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
}

// Seeds the finance module to the original dashboard's starting point:
// the structure above, plus the embedded May-2026 ASN sample transactions
// (which carry the real household's savings IBAN), so every computed figure
// matches finance_cockpit.html out of the box. Reused by the seed script and
// the "reset all data" action — NOT used for the demo deployment.
export async function seedFinance(prisma: PrismaClient) {
  await seedFinanceStructure(prisma);
  await prisma.financeSettings.update({
    where: { id: 1 },
    data: { savingsAccounts: DEFAULT_SETTINGS.savingsAccounts },
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
