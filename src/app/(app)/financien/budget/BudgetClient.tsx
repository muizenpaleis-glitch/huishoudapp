"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BackButton, Card } from "@/components/ui";
import { fmtEUR0, signedEUR } from "@/lib/finance/format";
import {
  rebuildInvestIbans,
  aggregate,
  budgetCategorieen,
  categorieBudgetVoorJaar,
  categorieInflatie,
  jaarpostVoorJaar,
  vasteLastenVoorJaar,
  jaarpostenVoorJaar,
  inkomenVoorJaar,
  opResultaatVoorJaar,
  plannedIncidentalForYear,
  PROJECTION_START_YEAR,
} from "@/lib/finance/engine";
import type { FinanceState } from "@/lib/finance/load";
import { setBudgetJaar, setCategorieInflatie, setJaarpostInflatie, updateMjpJaar } from "../actions";

export function BudgetClient({ state, jaarParam }: { state: FinanceState; jaarParam?: string }) {
  const { transactions, overrides, settings, projects, yearly, budgetJaar, mjpJaar } = state;
  const [, start] = useTransition();

  const jaren = useMemo(
    () => Array.from({ length: settings.horizon }, (_, i) => PROJECTION_START_YEAR + i),
    [settings.horizon],
  );
  const parsed = jaarParam ? parseInt(jaarParam, 10) : NaN;
  const [jaar, setJaar] = useState(jaren.includes(parsed) ? parsed : PROJECTION_START_YEAR);

  const { investIbans } = useMemo(
    () => rebuildInvestIbans(transactions, settings),
    [transactions, settings],
  );
  const agg = useMemo(
    () => aggregate(transactions, overrides, settings, investIbans),
    [transactions, overrides, settings, investIbans],
  );

  const categorieen = useMemo(() => budgetCategorieen(agg, settings), [agg, settings]);
  const opRes = opResultaatVoorJaar(jaar, agg, settings, yearly, budgetJaar, mjpJaar);
  const incidenteel = plannedIncidentalForYear(jaar, settings, projects);
  const jaarProjecten = projects.filter((p) => p.year === jaar);

  // "Vorig jaar werkelijk": only the base year has imported data, so this is a
  // reference column that stays empty for future years rather than a promise
  // the data can't keep.
  const werkelijkPerMaand = (cat: string) =>
    jaar === PROJECTION_START_YEAR ? (agg.recurringSpendByCat[cat] || 0) / agg.monthCount : null;

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[980px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton href="/financien" />
          <div>
            <div className="text-[21px] font-bold tracking-tight">Budgetteren</div>
            <div className="text-[13px] text-muted">
              Wat mag elke post kosten in {jaar}? Leeg laten = geïndexeerd doorrekenen.
            </div>
          </div>
        </div>

        {/* Jaarkiezer */}
        <div className="flex gap-1.5 flex-wrap">
          {jaren.map((y) => (
            <button
              key={y}
              onClick={() => setJaar(y)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border"
              style={{
                background: jaar === y ? "var(--color-ink)" : "var(--color-card)",
                color: jaar === y ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: jaar === y ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Samenvatting */}
        <Card className="p-4.5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Som label="Inkomen" waarde={opRes.inkomen} />
          <Som label="Vaste lasten" waarde={-opRes.vasteLasten} />
          <Som label="Jaarposten" waarde={-opRes.jaarposten} />
          <Som label="Operationeel resultaat" waarde={opRes.afgeleid} nadruk />
          <div className="col-span-2 md:col-span-4 text-[11.5px] text-muted border-t border-divider pt-2">
            {opRes.sheet != null ? (
              <>
                De oorspronkelijke MJP-sheet noemt voor {jaar} <b>{fmtEUR0(opRes.sheet)}</b> — een verschil van{" "}
                <b>{signedEUR(opRes.sheet - opRes.afgeleid)}</b> met deze opbouw.{" "}
              </>
            ) : null}
            Incidentele projecten dit jaar: <b>{fmtEUR0(incidenteel)}</b> (apart, telt niet mee in het
            operationeel resultaat).
          </div>
        </Card>

        {/* Categorieën */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Vaste lasten per categorie
            </div>
            <div className="text-[12.5px] text-muted">
              {fmtEUR0(vasteLastenVoorJaar(jaar, agg, settings, budgetJaar) / 12)}/mnd ·{" "}
              <b className="text-ink">{fmtEUR0(opRes.vasteLasten)}</b>/jaar
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[620px]">
              <thead>
                <tr className="text-left text-label border-b border-divider">
                  <th className="py-2 pr-3 font-semibold">Categorie</th>
                  <th className="py-2 pr-3 font-semibold text-right">Vorig jaar werkelijk</th>
                  <th className="py-2 pr-3 font-semibold text-right">Geïndexeerd</th>
                  <th className="py-2 pr-3 font-semibold text-right">Budget €/mnd</th>
                  <th className="py-2 font-semibold text-right">Inflatie %</th>
                </tr>
              </thead>
              <tbody>
                {categorieen.map((c) => {
                  const b = categorieBudgetVoorJaar(c, jaar, settings, budgetJaar);
                  const werkelijk = werkelijkPerMaand(c);
                  return (
                    <tr key={c} className="border-b border-divider/60">
                      <td className="py-1.5 pr-3">{c}</td>
                      <td className="py-1.5 pr-3 text-right text-muted">
                        {werkelijk == null ? "—" : fmtEUR0(werkelijk)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(b.afgeleid)}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <input
                          key={`${c}-${jaar}-${b.bron}`}
                          type="number"
                          step={25}
                          defaultValue={b.bron === "override" ? b.bedrag : ""}
                          placeholder={b.afgeleid.toFixed(0)}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const v = raw === "" ? null : parseFloat(raw);
                            if (raw === "" && b.bron === "afgeleid") return;
                            if (v !== null && b.bron === "override" && v === b.bedrag) return;
                            start(() => setBudgetJaar(jaar, "categorie", c, v));
                          }}
                          className="w-24 px-2 py-1 rounded-lg border bg-card text-[12.5px] text-right"
                          style={{
                            borderColor: b.bron === "override" ? "var(--color-accent)" : "var(--color-input-border)",
                          }}
                        />
                      </td>
                      <td className="py-1.5 text-right">
                        <input
                          key={`${c}-infl`}
                          type="number"
                          step={0.5}
                          defaultValue={categorieInflatie(c, settings)}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const v = raw === "" ? null : parseFloat(raw);
                            if (v === categorieInflatie(c, settings)) return;
                            start(() => setCategorieInflatie(c, v));
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px] text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[11.5px] text-muted">
            Budget leeg = het geïndexeerde bedrag telt. Een ingevuld bedrag geldt alleen voor {jaar} (oranje
            rand); leegmaken herstelt de indexatie. Zet inflatie op 0 voor posten die niet meestijgen, zoals
            een hypotheek met vaste rente.
          </div>
        </Card>

        {/* Jaarposten */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Jaarposten</div>
            <div className="text-[12.5px] text-muted">
              <b className="text-ink">{fmtEUR0(jaarpostenVoorJaar(jaar, yearly, settings, budgetJaar))}</b>/jaar
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left text-label border-b border-divider">
                  <th className="py-2 pr-3 font-semibold">Post</th>
                  <th className="py-2 pr-3 font-semibold text-right">Geïndexeerd</th>
                  <th className="py-2 pr-3 font-semibold text-right">Budget €/jaar</th>
                  <th className="py-2 font-semibold text-right">Inflatie %</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((y) => {
                  const b = jaarpostVoorJaar(y, jaar, settings, budgetJaar);
                  return (
                    <tr key={y.id} className="border-b border-divider/60">
                      <td className="py-1.5 pr-3">{y.name}</td>
                      <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(b.afgeleid)}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <input
                          key={`${y.id}-${jaar}-${b.bron}`}
                          type="number"
                          step={50}
                          defaultValue={b.bron === "override" ? b.bedrag : ""}
                          placeholder={b.afgeleid.toFixed(0)}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const v = raw === "" ? null : parseFloat(raw);
                            if (raw === "" && b.bron === "afgeleid") return;
                            if (v !== null && b.bron === "override" && v === b.bedrag) return;
                            start(() => setBudgetJaar(jaar, "jaarpost", y.name, v));
                          }}
                          className="w-24 px-2 py-1 rounded-lg border bg-card text-[12.5px] text-right"
                          style={{
                            borderColor: b.bron === "override" ? "var(--color-accent)" : "var(--color-input-border)",
                          }}
                        />
                      </td>
                      <td className="py-1.5 text-right">
                        <input
                          key={`${y.id}-infl`}
                          type="number"
                          step={0.5}
                          defaultValue={y.inflatie ?? settings.inflatieDefault}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const v = raw === "" ? null : parseFloat(raw);
                            if (v === (y.inflatie ?? settings.inflatieDefault)) return;
                            start(() => setJaarpostInflatie(y.id, v));
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px] text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Inkomen */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Inkomen</div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] text-muted">Inkomen {jaar} (€/jaar)</span>
              <input
                key={`ink-${jaar}`}
                type="number"
                step={100}
                defaultValue={mjpJaar.find((m) => m.jaar === jaar)?.inkomen ?? ""}
                placeholder={inkomenVoorJaar(jaar, settings, []).toFixed(0)}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const v = raw === "" ? null : parseFloat(raw);
                  const huidig = mjpJaar.find((m) => m.jaar === jaar)?.inkomen ?? null;
                  if (v === huidig) return;
                  start(() => updateMjpJaar(jaar, { inkomen: v }));
                }}
                className="w-36 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13.5px]"
              />
            </label>
            <div className="text-[11.5px] text-muted max-w-[420px]">
              Leeg = basisinkomen geïndexeerd met {settings.inkomenGroei}%/jaar (in te stellen bij
              Instellingen op de Financiën-pagina). Nu: {fmtEUR0(opRes.inkomen)}.
            </div>
          </div>
        </Card>

        {/* Projecten van dit jaar — read-only, bewerken blijft in de projecteneditor */}
        <Card className="p-4.5 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Incidentele projecten {jaar}
            </div>
            <Link href="/financien" className="text-[12px] font-semibold text-accent">
              Beheren op Financiën
            </Link>
          </div>
          {jaarProjecten.length === 0 ? (
            <div className="text-[12.5px] text-muted">Geen projecten gepland in {jaar}.</div>
          ) : (
            jaarProjecten.map((p) => (
              <div key={p.id} className="flex justify-between text-[12.5px] py-1 border-b border-divider/60">
                <span className="text-ink-soft">
                  {p.done && <span className="text-success">✓ </span>}
                  {p.name}
                </span>
                <span className="font-semibold">{fmtEUR0(p.budget)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function Som({ label, waarde, nadruk }: { label: string; waarde: number; nadruk?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={nadruk ? "text-[18px] font-bold" : "text-[15px] font-semibold"}
        style={{ color: nadruk ? (waarde >= 0 ? "#5C7F55" : "#B0512C") : "var(--color-ink)" }}
      >
        {nadruk ? signedEUR(waarde) : fmtEUR0(waarde)}
      </div>
    </div>
  );
}
