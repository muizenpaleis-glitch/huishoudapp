"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlleenDesktop, BackButton, Card } from "@/components/ui";
import { fmtEUR0, signedEUR } from "@/lib/finance/format";
import {
  rebuildInvestIbans,
  aggregate,
  projectSeries,
  opResultaatVoorJaar,
  investeringVoorJaar,
  inkomenVoorJaar,
  plannedIncidentalForYear,
  PROJECTION_START_YEAR,
  PLAN_START_NET_WORTH,
  CRITICAL_THRESHOLD,
} from "@/lib/finance/engine";
import type { FinanceState } from "@/lib/finance/load";
import { ProjectionChart } from "../charts";
import { SettingsPanel } from "../Editors";
import { updateMjpJaar } from "../actions";

type Rij = {
  jaar: number;
  start: number;
  rendement: number;
  inkomen: number;
  vasteLasten: number;
  jaarposten: number;
  opResultaat: number;
  opBron: "afgeleid" | "override";
  opAfgeleid: number;
  investeringen: number;
  investAfgeleid: number;
  investBron: "afgeleid" | "override";
  projecten: number;
  eind: number;
  eindWerkelijk: number;
};

export function MjpClient({ state }: { state: FinanceState }) {
  const { transactions, overrides, settings, projects, yearly, budgetJaar, mjpJaar, inkomsten } =
    state;
  const [, start] = useTransition();
  const [pots, setPots] = useState({ buffer: true, persoonlijk: false, beleggingen: false });

  const { investIbans } = useMemo(
    () => rebuildInvestIbans(transactions, settings),
    [transactions, settings],
  );
  const agg = useMemo(
    () => aggregate(transactions, overrides, settings, investIbans),
    [transactions, overrides, settings, investIbans],
  );

  const { plan, actual, total } = useMemo(
    () => projectSeries(agg, settings, projects, yearly, budgetJaar, mjpJaar, inkomsten),
    [agg, settings, projects, yearly, budgetJaar, mjpJaar, inkomsten],
  );

  // One row per projected year. The start/end positions come straight out of
  // projectSeries (plan[i] = start of year i, plan[i+1] = its end), so the
  // table can never drift from the line above it. Everything in between is
  // the same derivation projectSeries itself runs.
  const rijen: Rij[] = useMemo(() => {
    const r = settings.returnRate / 100;
    // projectSeries carries an un-offset plan balance internally and only adds
    // the offset when it pushes a value, so undo it before applying the return.
    const offset = settings.startNetWorth - PLAN_START_NET_WORTH;
    return Array.from({ length: settings.horizon }, (_, i) => {
      const jaar = PROJECTION_START_YEAR + i;
      const op = opResultaatVoorJaar(jaar, agg, settings, yearly, budgetJaar, mjpJaar, inkomsten);
      const inv = mjpJaar.find((m) => m.jaar === jaar)?.investeringen;
      return {
        jaar,
        start: plan[i],
        rendement: (plan[i] - offset) * r,
        inkomen: op.inkomen,
        vasteLasten: op.vasteLasten,
        jaarposten: op.jaarposten,
        opResultaat: op.gebruikt,
        opBron: op.bron,
        opAfgeleid: op.afgeleid,
        investeringen: investeringVoorJaar(jaar, settings, mjpJaar),
        investAfgeleid: investeringVoorJaar(jaar, settings, []),
        investBron: inv != null ? "override" : "afgeleid",
        projecten: plannedIncidentalForYear(jaar, settings, projects),
        eind: plan[i + 1],
        eindWerkelijk: actual[i + 1],
      };
    });
  }, [plan, actual, agg, settings, yearly, budgetJaar, mjpJaar, projects, inkomsten]);

  const toonRendement = settings.returnRate !== 0;

  // ── Chart: same pot logic as the Financiën dashboard ──
  const jaren = useMemo(() => {
    const arr = [PROJECTION_START_YEAR - 1];
    for (let i = 0; i < settings.horizon; i++) arr.push(PROJECTION_START_YEAR + i);
    return arr;
  }, [settings.horizon]);

  const potSeries = useMemo(() => {
    const cumInvest = actual.map((a, i) => total[i] - a);
    return {
      persoonlijk: plan.map(() => settings.personalSavings),
      beleggingen: cumInvest.map((c) => settings.investmentValue + c),
    };
  }, [plan, actual, total, settings.personalSavings, settings.investmentValue]);

  const anyPot = pots.buffer || pots.persoonlijk || pots.beleggingen;
  const sumSeries = (bufferSide: number[]) =>
    bufferSide.map(
      (_, i) =>
        (pots.buffer ? bufferSide[i] : 0) +
        (pots.persoonlijk ? potSeries.persoonlijk[i] : 0) +
        (pots.beleggingen ? potSeries.beleggingen[i] : 0),
    );
  const bufferOnly = pots.buffer && !pots.persoonlijk && !pots.beleggingen;
  const potLabel = [
    pots.buffer && "gezamenlijk",
    pots.persoonlijk && "persoonlijk",
    pots.beleggingen && "beleggingen",
  ]
    .filter(Boolean)
    .join(" + ");

  const afwijking = actual[actual.length - 1] - plan[plan.length - 1];

  return (
    <AlleenDesktop
      titel="Meerjarenplan"
      uitleg="Het meerjarenplan is een tabel met elf kolommen per jaar, van startpositie tot eindpositie. Die is op een telefoon niet te overzien of te bewerken. Open deze pagina op een laptop of desktop."
    >
      <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
        <div className="max-w-[1180px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton href="/financien" />
          <div className="min-w-0">
            <div className="text-[21px] font-bold tracking-tight">Meerjarenplan</div>
            <div className="text-[13px] text-muted">
              {PROJECTION_START_YEAR}–{PROJECTION_START_YEAR + settings.horizon - 1} · startpositie,
              operationeel resultaat, investeringen en projecten per jaar
            </div>
          </div>
          <Link
            href="/financien/budget"
            className="ml-auto shrink-0 px-3.5 py-2 rounded-full border border-input-border text-[12.5px] font-semibold text-ink-soft"
          >
            Budgetteren
          </Link>
        </div>

        {/* Grafiek */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[11.5px] text-muted mr-0.5">Toon:</span>
            {(
              [
                { key: "buffer", label: "Gezamenlijk", kleur: "#C4633B" },
                { key: "persoonlijk", label: "Persoonlijk", kleur: "#5C7F55" },
                { key: "beleggingen", label: "Beleggingen", kleur: "#6C5B8C" },
              ] as const
            ).map((p) => {
              const on = pots[p.key];
              return (
                <button
                  key={p.key}
                  aria-pressed={on}
                  onClick={() => setPots((s) => ({ ...s, [p.key]: !s[p.key] }))}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border"
                  style={{
                    background: on ? p.kleur : "var(--color-card)",
                    color: on ? "var(--color-accent-ink)" : "var(--color-muted)",
                    borderColor: on ? p.kleur : "var(--color-input-border)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: on ? "var(--color-accent-ink)" : p.kleur }}
                  />
                  {p.label}
                </button>
              );
            })}
          </div>
          {anyPot ? (
            <ProjectionChart
              jaren={jaren}
              plan={sumSeries(plan)}
              actual={sumSeries(actual)}
              kritiekeGrens={bufferOnly ? CRITICAL_THRESHOLD : null}
              actualLabel={`Werkelijk · ${potLabel}`}
            />
          ) : (
            <div className="text-[13px] text-muted py-8 text-center">
              Kies hierboven minimaal één vermogenspot.
            </div>
          )}
        </Card>

        {/* Tabel */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Opbouw per jaar
            </div>
            <div className="text-[12px] text-muted">
              Oranje rand = handmatig ingevuld · leegmaken herstelt de berekening
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[1020px]">
              <thead>
                <tr className="text-left text-label border-b border-divider">
                  <th className="py-2 pr-3 font-semibold">Jaar</th>
                  <th className="py-2 pr-3 font-semibold text-right">Startpositie</th>
                  {toonRendement && <th className="py-2 pr-3 font-semibold text-right">Rendement</th>}
                  <th className="py-2 pr-3 font-semibold text-right">Inkomen</th>
                  <th className="py-2 pr-3 font-semibold text-right">Vaste lasten</th>
                  <th className="py-2 pr-3 font-semibold text-right">Jaarposten</th>
                  <th className="py-2 pr-3 font-semibold text-right">Op. resultaat</th>
                  <th className="py-2 pr-3 font-semibold text-right">Investeringen</th>
                  <th className="py-2 pr-3 font-semibold text-right">Projecten</th>
                  <th className="py-2 pr-3 font-semibold text-right">Eindpositie</th>
                  <th className="py-2 font-semibold">Toelichting</th>
                </tr>
              </thead>
              <tbody>
                {rijen.map((r) => (
                  <tr key={r.jaar} className="border-b border-divider/60">
                    <td className="py-1.5 pr-3 font-semibold">
                      <Link href={`/financien/budget?jaar=${r.jaar}`} className="text-accent">
                        {r.jaar}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(r.start)}</td>
                    {toonRendement && (
                      <td className="py-1.5 pr-3 text-right text-muted">{signedEUR(r.rendement)}</td>
                    )}
                    <td className="py-1.5 pr-3 text-right">
                      <Bedrag
                        waarde={mjpJaar.find((m) => m.jaar === r.jaar)?.inkomen ?? null}
                        afgeleid={inkomenVoorJaar(r.jaar, settings, [], inkomsten, budgetJaar)}
                        step={500}
                        onCommit={(v) => start(() => updateMjpJaar(r.jaar, { inkomen: v }))}
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <Link
                        href={`/financien/budget?jaar=${r.jaar}`}
                        className="text-ink-soft hover:text-accent"
                        title={`Categoriebudgetten ${r.jaar} bewerken`}
                      >
                        −{fmtEUR0(r.vasteLasten)}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <Link
                        href={`/financien/budget?jaar=${r.jaar}`}
                        className="text-ink-soft hover:text-accent"
                        title={`Jaarposten ${r.jaar} bewerken`}
                      >
                        −{fmtEUR0(r.jaarposten)}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <Bedrag
                        waarde={mjpJaar.find((m) => m.jaar === r.jaar)?.opResultaat ?? null}
                        afgeleid={r.opAfgeleid}
                        step={250}
                        breed
                        onCommit={(v) => start(() => updateMjpJaar(r.jaar, { opResultaat: v }))}
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <Bedrag
                        waarde={mjpJaar.find((m) => m.jaar === r.jaar)?.investeringen ?? null}
                        afgeleid={r.investAfgeleid}
                        step={250}
                        onCommit={(v) => start(() => updateMjpJaar(r.jaar, { investeringen: v }))}
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <Link href="/financien" className="text-ink-soft hover:text-accent" title="Projecten beheren">
                        −{fmtEUR0(r.projecten)}
                      </Link>
                    </td>
                    <td
                      className="py-1.5 pr-3 text-right font-bold"
                      style={{ color: r.eind < CRITICAL_THRESHOLD ? "#B0512C" : "var(--color-ink)" }}
                    >
                      {fmtEUR0(r.eind)}
                    </td>
                    <td className="py-1.5">
                      <input
                        key={`n-${r.jaar}`}
                        defaultValue={mjpJaar.find((m) => m.jaar === r.jaar)?.notitie ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const huidig = mjpJaar.find((m) => m.jaar === r.jaar)?.notitie ?? "";
                          if (v === huidig) return;
                          start(() => updateMjpJaar(r.jaar, { notitie: v === "" ? null : v }));
                        }}
                        className="w-40 px-2 py-1 rounded-lg border border-input-border bg-card text-[12px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11.5px] text-muted leading-relaxed">
            Eindpositie = startpositie{toonRendement ? " + rendement" : ""} + operationeel resultaat −
            investeringen − projecten. Het operationeel resultaat is <b>inkomen − vaste lasten −
            jaarposten</b>; klik op een bedrag in die kolommen om het jaar in Budgetteren te openen.
            Investeringen zijn de geplande stortingen naar de beleggingsrekening: ze verlaten de buffer
            maar verdwijnen niet — zet de pot &ldquo;Beleggingen&rdquo; in de grafiek aan om ze terug te
            zien.
          </div>
          <div className="text-[11.5px] text-muted">
            De tabel toont de <b>planlijn</b>. Werkelijk geïmporteerde maanden wijken daar in{" "}
            {PROJECTION_START_YEAR + settings.horizon - 1} <b>{signedEUR(afwijking)}</b> van af; die
            afwijking is de doorgetrokken lijn in de grafiek hierboven.
          </div>
        </Card>

        {/* Projectie-instellingen */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">
            Projectie-instellingen
          </div>
          <SettingsPanel settings={settings} />
        </Card>
        </div>
      </div>
    </AlleenDesktop>
  );
}

/** One editable money cell. Empty = the derived figure applies and no row is
 *  written, matching the "leeg = afgeleid" contract used on Budgetteren. */
function Bedrag({
  waarde,
  afgeleid,
  step,
  breed,
  onCommit,
}: {
  waarde: number | null;
  afgeleid: number;
  step: number;
  breed?: boolean;
  onCommit: (v: number | null) => void;
}) {
  return (
    <input
      key={`${waarde ?? "auto"}-${afgeleid.toFixed(0)}`}
      type="number"
      step={step}
      defaultValue={waarde ?? ""}
      placeholder={afgeleid.toFixed(0)}
      onBlur={(e) => {
        const raw = e.target.value.trim();
        const v = raw === "" ? null : parseFloat(raw);
        if (v === waarde) return;
        if (v !== null && !isFinite(v)) return;
        onCommit(v);
      }}
      className={`${breed ? "w-28" : "w-24"} px-2 py-1 rounded-lg border bg-card text-[12.5px] text-right`}
      style={{ borderColor: waarde != null ? "var(--color-accent)" : "var(--color-input-border)" }}
    />
  );
}
