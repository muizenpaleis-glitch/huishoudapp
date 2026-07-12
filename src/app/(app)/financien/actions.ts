"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAsnCsv } from "@/lib/finance/asn";
import { seedFinance } from "@/lib/finance/seed";
import type { Override } from "@/lib/finance/engine";

function refresh() {
  revalidatePath("/financien");
}

// ── CSV upload (web only) ──────────────────────────────────────────────
// Parses one or more ASN exports (raw text passed from the browser), inserts
// only transactions whose composite id isn't already stored (dedup on re-upload).
export async function uploadCsv(texts: string[]): Promise<{ added: number }> {
  const existing = new Set(
    (await prisma.financeTx.findMany({ select: { id: true } })).map((r) => r.id),
  );
  const seen = new Set<string>();
  const toInsert = [];
  for (const text of texts) {
    for (const t of parseAsnCsv(text)) {
      if (existing.has(t.id) || seen.has(t.id)) continue;
      seen.add(t.id);
      toInsert.push({
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
      });
    }
  }
  if (toInsert.length) await prisma.financeTx.createMany({ data: toInsert });
  refresh();
  return { added: toInsert.length };
}

// ── Transaction triage overrides ───────────────────────────────────────
// The client computes the full override object for a row (mirroring the
// original's radio/select/bankcat logic); an empty object clears the override.
export async function saveOverride(txId: string, override: Override | null) {
  const isEmpty = !override || Object.keys(override).length === 0;
  if (isEmpty) {
    await prisma.financeOverride.deleteMany({ where: { txId } });
  } else {
    const data = {
      cls: override.cls ?? null,
      project: override.project ?? null,
      bankCat: override.bankCat ?? null,
      notInvestment: override.notInvestment ?? null,
      savingsInc: override.savingsInc ?? null,
    };
    await prisma.financeOverride.upsert({
      where: { txId },
      update: data,
      create: { txId, ...data },
    });
  }
  refresh();
}

export async function resetTriage() {
  await prisma.financeOverride.deleteMany();
  refresh();
}

export async function resetAllFinance() {
  await seedFinance(prisma);
  refresh();
}

// ── Settings (web only) ────────────────────────────────────────────────
export type SettingsPatch = Partial<{
  startNetWorth: number;
  returnRate: number;
  horizon: number;
  savingsGrowth: number;
  monthlyBudget: number;
  monthlyIncome: number;
  threshold: number;
  savingsAccounts: string[];
  investmentAccounts: string[];
  savingsIncidentalThreshold: number;
  personalSavings: number;
  investmentValue: number;
}>;

export async function updateSettings(patch: SettingsPatch) {
  await prisma.financeSettings.update({ where: { id: 1 }, data: patch });
  refresh();
}

export async function setCategoryBudget(cat: string, value: number | null) {
  const row = await prisma.financeSettings.findUniqueOrThrow({ where: { id: 1 } });
  const budgets = { ...((row.categoryBudgets as Record<string, number>) || {}) };
  if (value === null || Number.isNaN(value)) delete budgets[cat];
  else budgets[cat] = value;
  await prisma.financeSettings.update({ where: { id: 1 }, data: { categoryBudgets: budgets } });
  refresh();
}

// ── Project + yearly editors (web only) ────────────────────────────────
export async function updateProject(
  id: string,
  patch: Partial<{ naam: string; budget: number; jaar: number; done: boolean }>,
) {
  await prisma.financeProject.update({ where: { id }, data: patch });
  refresh();
}
export async function addProject() {
  const count = await prisma.financeProject.count();
  await prisma.financeProject.create({
    data: { naam: "Nieuw project", budget: 0, jaar: 2026, done: false, volgorde: count },
  });
  refresh();
}
export async function deleteProject(id: string) {
  await prisma.financeProject.delete({ where: { id } });
  refresh();
}

export async function updateYearly(id: string, patch: Partial<{ naam: string; budget: number }>) {
  await prisma.financeYearly.update({ where: { id }, data: patch });
  refresh();
}
export async function addYearly() {
  const count = await prisma.financeYearly.count();
  await prisma.financeYearly.create({ data: { naam: "Nieuwe post", budget: 0, volgorde: count } });
  refresh();
}
export async function deleteYearly(id: string) {
  await prisma.financeYearly.delete({ where: { id } });
  refresh();
}
