import { prisma } from "@/lib/prisma";
import { FinancienClient } from "./FinancienClient";

export default async function FinancienPage() {
  const [netWorthRow, mjpRows, maandenRows, categorieRows, projectRows, jaarlijksRows, transactieRows] =
    await Promise.all([
      prisma.financeNetWorth.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.financeMjpResultaat.findMany({ orderBy: { jaar: "asc" } }),
      prisma.financeMaandFactor.findMany({ orderBy: { maand: "asc" } }),
      prisma.financeCategorieBudget.findMany({ orderBy: { volgorde: "asc" } }),
      prisma.financeIncidenteelProject.findMany({ orderBy: [{ jaar: "asc" }, { naam: "asc" }] }),
      prisma.financeJaarlijksItem.findMany({ orderBy: { naam: "asc" } }),
      prisma.financeTransactie.findMany({ orderBy: { datum: "desc" } }),
    ]);

  const netWorth = {
    buffer: Number(netWorthRow.buffer),
    spaargeld: Number(netWorthRow.spaargeld),
    beleggingen: Number(netWorthRow.beleggingen),
    startVermogen: Number(netWorthRow.startVermogen),
    kritiekeGrens: Number(netWorthRow.kritiekeGrens),
    incomeMaand: Number(netWorthRow.incomeMaand),
    spendBudgetMaand: Number(netWorthRow.spendBudgetMaand),
    spendActualMaand: Number(netWorthRow.spendActualMaand),
  };
  const mjp = mjpRows.map((m) => ({ jaar: m.jaar, opResultaat: Number(m.opResultaat) }));
  const maanden = maandenRows.map((m) => ({ maand: m.maand, kort: m.kort, lang: m.lang, factor: Number(m.factor) }));
  const categorieen = categorieRows.map((c) => ({
    id: c.id,
    label: c.label,
    budgetMaandelijks: c.budgetMaandelijks ? Number(c.budgetMaandelijks) : null,
    actualMaandelijks: Number(c.actualMaandelijks),
    kleur: c.kleur,
    vast: c.vast,
    inSpendOverzicht: c.inSpendOverzicht,
    inBudgetOverzicht: c.inBudgetOverzicht,
  }));
  const projecten = projectRows.map((p) => ({
    id: p.id,
    naam: p.naam,
    budget: Number(p.budget),
    jaar: p.jaar,
    done: p.done,
    besteed: Number(p.besteed),
  }));
  const jaarlijks = jaarlijksRows.map((j) => ({
    id: j.id,
    naam: j.naam,
    budgetJaarlijks: Number(j.budgetJaarlijks),
    besteed2026: Number(j.besteed2026),
  }));
  const transacties = transactieRows.map((t) => ({
    id: t.id,
    datum: t.datum.toISOString(),
    naam: t.naam,
    omschrijving: t.omschrijving,
    bankCategorie: t.bankCategorie,
    bedrag: Number(t.bedrag),
    klasse: t.klasse,
    projectId: t.projectId,
    jaarlijksItemId: t.jaarlijksItemId,
  }));

  return (
    <FinancienClient
      netWorth={netWorth}
      mjp={mjp}
      maanden={maanden}
      categorieen={categorieen}
      projecten={projecten}
      jaarlijks={jaarlijks}
      transacties={transacties}
    />
  );
}
