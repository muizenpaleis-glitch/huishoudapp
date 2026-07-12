"use client";

import { useState } from "react";
import { fmtEUR0, signedEUR } from "@/lib/finance/format";
import {
  effective,
  projectSeries,
  CRITICAL_THRESHOLD,
  PROJECTION_START_YEAR,
  type Agg,
  type Tx,
  type Overrides,
  type Settings,
  type Project,
  type Yearly,
} from "@/lib/finance/engine";

// Local, deterministic analyst — a faithful Dutch port of the original
// "Ask your numbers" widget. Parses the question by keyword and computes an
// exact answer from the live aggregate. No network.

const SUGGESTIONS = [
  "Waarom zijn mijn uitgaven hoger dan budget?",
  "Hoeveel gaf ik uit aan Boodschappen?",
  "Hoeveel hebben we gespaard?",
  "Lopen we op schema?",
  "Grootste uitgaven",
];

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ChatWidget({
  agg,
  transactions,
  overrides,
  settings,
  investIbans,
  projects,
  yearly,
  investDetected,
}: {
  agg: Agg;
  transactions: Tx[];
  overrides: Overrides;
  settings: Settings;
  investIbans: Set<string>;
  projects: Project[];
  yearly: Yearly[];
  investDetected: { iban: string; term: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ role: "u" | "a"; html: string }[]>([]);

  function top(obj: Record<string, number>, n: number) {
    return Object.entries(obj)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n) as [string, number][];
  }
  function catRows(pairs: [string, number][], total: number) {
    return pairs
      .map(
        ([k, v]) =>
          `<div class="flex justify-between gap-3"><span class="opacity-70 truncate">${esc(k)}</span>` +
          `<span class="font-semibold">${fmtEUR0(v)}${total ? ` <span class="opacity-50">${((v / total) * 100).toFixed(0)}%</span>` : ""}</span></div>`,
      )
      .join("");
  }
  function biggest(filter: ((t: Tx) => boolean) | null, n: number) {
    return transactions
      .filter(
        (t) =>
          effective(t, overrides, settings, investIbans).cls !== "exclude" &&
          t.amount < 0 &&
          (!filter || filter(t)),
      )
      .sort((a, b) => a.amount - b.amount)
      .slice(0, n)
      .map(
        (t) =>
          `<div class="flex justify-between gap-3"><span class="opacity-70 truncate">${esc(t.date.slice(5))} ${esc(t.name || t.desc.slice(0, 30))}</span>` +
          `<span class="font-semibold" style="color:#B0512C">${fmtEUR0(-t.amount)}</span></div>`,
      )
      .join("");
  }
  function matchEntity(qq: string) {
    const cands: { type: "cat" | "project" | "yearly"; name: string }[] = [];
    for (const c of Object.keys(agg.spendByCat)) cands.push({ type: "cat", name: c });
    for (const p of projects) cands.push({ type: "project", name: p.name });
    for (const y of yearly) cands.push({ type: "yearly", name: y.name });
    let best: { type: "cat" | "project" | "yearly"; name: string } | null = null;
    for (const c of cands) {
      const nm = c.name.toLowerCase();
      if (nm.length >= 4 && qq.includes(nm) && (!best || c.name.length > best.name.length)) best = c;
    }
    return best;
  }

  function answer(rawq: string): string {
    if (!transactions.length) return "Er zijn nog geen transacties geladen — importeer eerst een afschrift.";
    const query = " " + rawq.toLowerCase() + " ";
    const has = (...ws: string[]) => ws.some((w) => query.includes(w));
    const months = agg.months.size;
    const range = [...agg.months].sort();
    const period = `${months} maand(en) geladen (${range[0]}…${range[range.length - 1]})`;

    if (has("spaar", "save", "saving", "gespaard")) {
      const s = agg.savings;
      return (
        `Over ${period} is de netto inleg naar sparen <b>${signedEUR(s.net)}</b> (${fmtEUR0(s.deposit)} ingelegd − ${fmtEUR0(s.withdraw)} teruggehaald). ` +
        `Zonder de grote eenmalige bewegingen is het <b>reguliere</b> ritme ${signedEUR(s.netReg)} (${signedEUR(s.netRegPerMonth)}/mnd).`
      );
    }
    if (has("beleg", "invest", "broker", "degiro", "meesman")) {
      const inv = agg.invest;
      if (!inv.total)
        return `Geen beleggingsstortingen gevonden in de geladen data. ${investDetected.length ? "Er is een beleggingsrekening herkend, maar er zijn nog geen stortingen." : "Voeg je beleggings-IBAN toe in de instellingen als stortingen niet worden opgepikt."}`;
      return (
        `Tot nu toe belegd: <b>${fmtEUR0(inv.total)}</b> in ${inv.count} storting(en)` +
        (Object.keys(inv.byYear).length
          ? " (" + Object.entries(inv.byYear).map(([y, v]) => y + ": " + fmtEUR0(v)).join(", ") + ")."
          : ".")
      );
    }
    if (has("schema", "track", "vermogen", "net worth", "projectie", "buffer", "grens", "kritiek")) {
      const { plan, actual } = projectSeries(agg, settings, projects, yearly);
      const endYear = PROJECTION_START_YEAR + settings.horizon;
      const diff = actual[actual.length - 1] - plan[plan.length - 1];
      let firstBelow = -1;
      for (let i = 1; i < actual.length; i++)
        if (actual[i] < CRITICAL_THRESHOLD) {
          firstBelow = PROJECTION_START_YEAR + i;
          break;
        }
      return (
        `Plan versus werkelijk: met de geladen maanden meegerekend is je verwachte buffer in ${endYear} <b>${fmtEUR0(actual[actual.length - 1])}</b>, ` +
        `${diff >= 0 ? signedEUR(diff) + " vóór op" : signedEUR(diff) + " achter op"} het MJP-plan. ` +
        (firstBelow > 0
          ? `⚠️ De buffer zakt rond <b>${firstBelow}</b> onder de €15k kritieke grens — beleggingen blijven veilig, maar de vrije buffer wordt krap.`
          : `De buffer blijft het hele traject boven de €15k kritieke grens.`) +
        ` Dit jaar sta je ${signedEUR(agg.deviationByYear[PROJECTION_START_YEAR] || 0)} versus budget op bruto waarde.`
      );
    }
    if (has("inkomen", "income", "salaris", "verdien")) {
      const actual = agg.recurringIncome;
      const budget = settings.monthlyIncome * months;
      const gap = actual - budget;
      const bySource: Record<string, number> = {};
      for (const t of transactions) {
        if (effective(t, overrides, settings, investIbans).cls === "recurring" && t.amount > 0) {
          const k = t.name || t.desc.slice(0, 24);
          bySource[k] = (bySource[k] || 0) + t.amount;
        }
      }
      return (
        `Over ${period} is het terugkerende inkomen <b>${fmtEUR0(actual)}</b> versus ${fmtEUR0(budget)} begroot — ${signedEUR(gap)} ` +
        `(${fmtEUR0(actual / months)}/mnd versus ${fmtEUR0(settings.monthlyIncome)}). ` +
        `Grootste bronnen:<div class="mt-1">${catRows(top(bySource, 4), actual)}</div>`
      );
    }
    if (has("grootste", "biggest", "duurste", "hoogste")) {
      return `Grootste uitgaven over ${period} (overboekingen uitgesloten):<div class="mt-1">${biggest(null, 8)}</div>`;
    }

    const ent = matchEntity(query);
    if (ent && !has("waarom", "hoger", "lager", "over budget")) {
      if (ent.type === "cat") {
        const tot = agg.spendByCat[ent.name] || 0;
        return (
          `<b>${esc(ent.name)}</b>: ${fmtEUR0(tot)} uitgegeven over ${period} (${fmtEUR0(tot / months)}/mnd). ` +
          `Grootste:<div class="mt-1">${biggest((t) => effective(t, overrides, settings, investIbans).bankCat === ent.name, 6)}</div>`
        );
      }
      if (ent.type === "project") {
        const p = projects.find((x) => x.name === ent.name)!;
        const spent = agg.incidentalByProject[ent.name] || 0;
        return `Incidenteel project <b>${esc(ent.name)}</b> (gepland ${p.year}${p.done ? ", afgerond" : ""}): ${fmtEUR0(spent)} van ${fmtEUR0(p.budget)} budget — ${signedEUR(p.budget - spent)} ${p.budget - spent >= 0 ? "over" : "te veel"}.`;
      }
      if (ent.type === "yearly") {
        const y = yearly.find((x) => x.name === ent.name)!;
        const spent = agg.yearlyByItem[ent.name] || 0;
        const expected = (y.budget || 0) * (months / 12);
        return `Jaarpost <b>${esc(ent.name)}</b>: ${fmtEUR0(spent)} van ${fmtEUR0(y.budget)}/jr (verwacht ${fmtEUR0(expected)} tot nu) — ${spent > expected ? signedEUR(spent - expected) + " vóór op pro-rata" : signedEUR(spent - expected) + " achter op pro-rata"}.`;
      }
    }

    if (has("uitgave", "uitgaven", "spend", "kosten", "hoger", "lager", "over budget")) {
      const actual = agg.recurringSpend;
      const budget = settings.monthlyBudget * months;
      const gap = actual - budget;
      const annual = (actual / months) * 12;
      const annualBudget = settings.monthlyBudget * 12;
      const cats = top(agg.recurringSpendByCat, 5);
      return (
        `Over ${period} is je <b>maandelijkse</b> (terugkerende) uitgave <b>${fmtEUR0(actual)}</b> versus ${fmtEUR0(budget)} begroot — ` +
        `<b>${gap > 0 ? fmtEUR0(gap) + " te veel" : fmtEUR0(-gap) + " onder"}</b> ` +
        `(${fmtEUR0(actual / months)}/mnd versus ${fmtEUR0(settings.monthlyBudget)}). ` +
        `In dit tempo landt het jaar op ~${fmtEUR0(annual)} versus ${fmtEUR0(annualBudget)} budget (${signedEUR(annual - annualBudget)}). ` +
        `Grootste categorieën:<div class="mt-1">${catRows(cats, actual)}</div>` +
        `<div class="mt-1.5 opacity-60">Apart begroot, niet in dit cijfer: jaarposten ${fmtEUR0(agg.yearlyTotal)} en incidentele projecten ${fmtEUR0(agg.incidentalTotal)}.</div>`
      );
    }

    const { actual } = projectSeries(agg, settings, projects, yearly);
    return (
      `Het beeld over ${period}: terugkerend inkomen ${fmtEUR0(agg.recurringIncome)} versus uitgaven ${fmtEUR0(agg.recurringSpend)} ` +
      `→ bruto waarde ${signedEUR(agg.recurringIncome - agg.recurringSpend)}. Jaarposten ${fmtEUR0(agg.yearlyTotal)}, incidenteel ${fmtEUR0(agg.incidentalTotal)}, netto gespaard ${signedEUR(agg.savings.net)}. ` +
      `Verwachte buffer in ${PROJECTION_START_YEAR + settings.horizon}: ${fmtEUR0(actual[actual.length - 1])}.`
    );
  }

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setLog((l) => [...l, { role: "u", html: esc(text) }, { role: "a", html: answer(text) }]);
    setQ("");
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 md:bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-ink text-accent-ink shadow-lg flex items-center justify-center text-[22px]"
        aria-label="Vraag je cijfers"
      >
        {open ? "×" : "€"}
      </button>
      {open && (
        <div className="fixed bottom-40 md:bottom-24 right-5 z-30 w-[min(92vw,380px)] max-h-[70vh] bg-card border border-card-border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-divider">
            <div className="text-[14px] font-bold">Vraag je cijfers</div>
            <div className="text-[11.5px] text-muted">Lokaal berekend — geen internet</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[120px]">
            {log.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-[11.5px] px-2.5 py-1.5 rounded-full border border-input-border text-ink-soft text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {log.map((m, i) =>
              m.role === "u" ? (
                <div key={i} className="self-end max-w-[85%] bg-ink text-accent-ink rounded-2xl px-3 py-2 text-[13px]">
                  <span dangerouslySetInnerHTML={{ __html: m.html }} />
                </div>
              ) : (
                <div
                  key={i}
                  className="self-start max-w-[92%] bg-cream rounded-2xl px-3 py-2 text-[13px] leading-relaxed [&_b]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: m.html }}
                />
              ),
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="p-2.5 border-t border-divider flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Stel een vraag…"
              className="flex-1 px-3 py-2 rounded-full border border-input-border bg-card text-[13px] outline-none"
            />
            <button type="submit" className="px-4 py-2 rounded-full bg-accent text-accent-ink text-[13px] font-semibold">
              Vraag
            </button>
          </form>
        </div>
      )}
    </>
  );
}
