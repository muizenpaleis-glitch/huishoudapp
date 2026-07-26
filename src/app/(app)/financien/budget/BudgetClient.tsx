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
  werkelijkPerMaandVoorJaar,
  maandenInJaar,
  ritmeAnalyse,
  labelMonth,
  RITME_MIN_MAANDEN,
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

  // Reference column: what the *previous* year actually cost. Budgeting 2027
  // leans on 2026's figures; budgeting 2026 has no 2025 import to lean on, so
  // it shows "—" rather than passing this year's own partial data off as last
  // year's result.
  const vorigJaar = jaar - 1;
  const vorigJaarMaanden = maandenInJaar(vorigJaar, agg);

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
                  <th className="py-2 pr-3 font-semibold text-right">
                    Werkelijk {vorigJaar}
                    {vorigJaarMaanden > 0 && (
                      <span className="font-normal text-muted"> · {vorigJaarMaanden} mnd</span>
                    )}
                  </th>
                  <th
                    className="py-2 pr-3 font-semibold text-right"
                    title="Referentiebedrag + inflatie. De referentie is het werkelijke bedrag van vorig jaar zodra dat jaar is ingeladen (gemarkeerd met ᵂ), anders het begrote bedrag van vorig jaar."
                  >
                    Geïndexeerd
                  </th>
                  <th className="py-2 pr-3 font-semibold text-right">Budget €/mnd</th>
                  <th className="py-2 font-semibold text-right">Inflatie %</th>
                </tr>
              </thead>
              <tbody>
                {categorieen.map((c) => {
                  const b = categorieBudgetVoorJaar(c, jaar, agg, settings, budgetJaar);
                  const werkelijk = werkelijkPerMaandVoorJaar(c, vorigJaar, agg);
                  const ref = b.referentie;
                  return (
                    <tr key={c} className="border-b border-divider/60">
                      <td className="py-1.5 pr-3">{c}</td>
                      <td className="py-1.5 pr-3 text-right text-muted">
                        {werkelijk == null ? "—" : fmtEUR0(werkelijk.perMaand)}
                      </td>
                      <td
                        className="py-1.5 pr-3 text-right"
                        style={{ color: ref.bron === "werkelijk" ? "var(--color-ink)" : "var(--color-muted)" }}
                        title={
                          ref.bron === "werkelijk"
                            ? `${fmtEUR0(ref.bedrag)}/mnd werkelijk in ${ref.jaar} (${ref.maanden} mnd) + ${categorieInflatie(c, settings)}% inflatie`
                            : `${fmtEUR0(ref.bedrag)}/mnd begroot voor ${ref.jaar}${jaar > ref.jaar ? ` + ${categorieInflatie(c, settings)}% inflatie` : ""}`
                        }
                      >
                        {fmtEUR0(b.afgeleid)}
                        {ref.bron === "werkelijk" && (
                          <span className="text-[10px] text-muted align-super ml-0.5">w</span>
                        )}
                      </td>
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
          <div className="text-[11.5px] text-muted leading-relaxed">
            <b>Geïndexeerd</b> = referentiebedrag + inflatie. Zodra {vorigJaar} is ingeladen is de referentie
            wat je <b>werkelijk</b> uitgaf (gemarkeerd met <span className="align-super text-[10px]">w</span>
            ), niet wat je begrootte — beweeg over het bedrag om de opbouw te zien. Voor jaren zonder
            transacties telt het budget van het jaar ervoor door, zodat de reeks blijft lopen.
            <br />
            Werkelijk is het netto saldo van die categorie in {vorigJaar}, gedeeld door het aantal ingeladen
            maanden — dus een gemiddelde per maand, niet een heel jaar.
            <br />
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

        {/* Ritme-analyse */}
        <RitmeKaart
          transactions={transactions}
          overrides={overrides}
          settings={settings}
          investIbans={investIbans}
          agg={agg}
        />

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

/** Cadence check: is anything budgeted per month that really lands once a year,
 *  or vice versa? Runs over the most recent year that actually has imported
 *  data, since that's the only year with something to measure. */
function RitmeKaart({
  transactions,
  overrides,
  settings,
  investIbans,
  agg,
}: {
  transactions: FinanceState["transactions"];
  overrides: FinanceState["overrides"];
  settings: FinanceState["settings"];
  investIbans: Set<string>;
  agg: ReturnType<typeof aggregate>;
}) {
  const dataJaren = Object.keys(agg.monthsByYear).map(Number).sort();
  const analyseJaar = dataJaren.length ? dataJaren[dataJaren.length - 1] : null;

  const posten = useMemo(
    () =>
      analyseJaar == null
        ? []
        : ritmeAnalyse(transactions, overrides, settings, investIbans, analyseJaar),
    [transactions, overrides, settings, investIbans, analyseJaar],
  );
  const adviezen = posten.filter((p) => p.advies !== "past");

  if (analyseJaar == null) {
    return null;
  }

  const maanden = posten[0]?.maandenTotaal ?? 0;

  return (
    <Card className="p-4.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">
          Ritme-analyse · {analyseJaar}
        </div>
        <div className="text-[12px] text-muted">
          op basis van {maanden} ingeladen maand{maanden === 1 ? "" : "en"}
        </div>
      </div>

      {maanden < RITME_MIN_MAANDEN ? (
        <div className="text-[12.5px]" style={{ color: "#A9761C" }}>
          Nog te weinig maanden ingeladen voor een betrouwbaar advies. Met {maanden} maand
          {maanden === 1 ? "" : "en"} valt elke post die überhaupt voorkomt in 100% van de maanden,
          waardoor jaarposten er ten onrechte als maandlasten uitzien. Vanaf {RITME_MIN_MAANDEN}{" "}
          maanden verschijnt het advies. De cijfers hieronder kloppen wel.
        </div>
      ) : adviezen.length === 0 ? (
        <div className="text-[12.5px] text-muted">
          Geen posten gevonden die duidelijk in het verkeerde ritme staan.
        </div>
      ) : (
        <div className="text-[12.5px] text-muted">
          Deze posten staan mogelijk in het verkeerde ritme. Kijk naar de maanden ernaast voordat je
          omzet — een post die pas halverwege het jaar begon lijkt ook &ldquo;incidenteel&rdquo;.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
          <thead>
            <tr className="text-left text-label border-b border-divider">
              <th className="py-2 pr-3 font-semibold">Post</th>
              <th className="py-2 pr-3 font-semibold">Nu</th>
              <th className="py-2 pr-3 font-semibold text-right">Maanden</th>
              <th className="py-2 pr-3 font-semibold text-right">Totaal</th>
              <th className="py-2 font-semibold">Advies</th>
            </tr>
          </thead>
          <tbody>
            {posten.map((p) => {
              const kleur =
                p.advies === "naar-jaarpost"
                  ? "#A9761C"
                  : p.advies === "naar-maandbudget"
                    ? "#2F6E8F"
                    : "var(--color-muted)";
              return (
                <tr key={p.soort + p.naam} className="border-b border-divider/60">
                  <td className="py-1.5 pr-3">{p.naam}</td>
                  <td className="py-1.5 pr-3 text-muted">
                    {p.soort === "categorie" ? "per maand" : "per jaar"}
                  </td>
                  <td
                    className="py-1.5 pr-3 text-right text-muted"
                    title={p.maanden.map(labelMonth).join(", ")}
                  >
                    {p.maandenMetUitgave} van {p.maandenTotaal}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-semibold">{fmtEUR0(p.totaal)}</td>
                  <td className="py-1.5" style={{ color: kleur }}>
                    {p.advies === "naar-jaarpost"
                      ? "→ jaarpost"
                      : p.advies === "naar-maandbudget"
                        ? "→ maandbudget"
                        : "past"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11.5px] text-muted">
        Regel: een maandpost die in ten hoogste een derde van de maanden voorkomt is kandidaat voor
        het jaarblok; een jaarpost die in minstens twee derde van de maanden voorkomt hoort eerder in
        het maandbudget. Posten onder {fmtEUR0(150)} totaal blijven buiten beschouwing. Beweeg over
        het maandental om te zien in welke maanden het viel.
      </div>
    </Card>
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
