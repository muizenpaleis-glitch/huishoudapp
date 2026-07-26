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
  werkelijkJaarpostVoorJaar,
  vasteLastenVoorJaar,
  jaarpostenVoorJaar,
  inkomenVoorJaar,
  inkomenpostVoorJaar,
  inkomenIsUitgesplitst,
  opResultaatVoorJaar,
  plannedIncidentalForYear,
  werkelijkPerMaandVoorJaar,
  maandenInJaar,
  budgetSignalen,
  type Signaal,
  labelMonth,
  RITME_MIN_MAANDEN,
  PROJECTION_START_YEAR,
  DEFAULT_CATEGORY_BUDGETS,
} from "@/lib/finance/engine";
import type { FinanceState } from "@/lib/finance/load";
import {
  setBudgetJaar,
  setCategorieInflatie,
  setJaarpostInflatie,
  updateMjpJaar,
  setCategoryBudget,
  updateInkomen,
  addInkomen,
  deleteInkomen,
} from "../actions";

export function BudgetClient({ state, jaarParam }: { state: FinanceState; jaarParam?: string }) {
  const { transactions, overrides, settings, projects, yearly, budgetJaar, mjpJaar, inkomsten } = state;
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
  const opRes = opResultaatVoorJaar(jaar, agg, settings, yearly, budgetJaar, mjpJaar, inkomsten);
  const incidenteel = plannedIncidentalForYear(jaar, settings, projects);
  const jaarProjecten = projects.filter((p) => p.year === jaar);

  // Reference column: what the *previous* year actually cost. Budgeting 2027
  // leans on 2026's figures; budgeting 2026 has no 2025 import to lean on, so
  // it shows "—" rather than passing this year's own partial data off as last
  // year's result.
  const vorigJaar = jaar - 1;
  const vorigJaarMaanden = maandenInJaar(vorigJaar, agg);

  // Adding a category means giving it a budget: budgetCategorieen() picks up
  // every key in settings.categoryBudgets, so writing a 0 is enough to make
  // the row (and the triage dropdown entry) appear.
  const [nieuweCat, setNieuweCat] = useState("");
  function voegCatToe() {
    const naam = nieuweCat.trim();
    if (!naam || categorieen.includes(naam)) return;
    setNieuweCat("");
    start(() => setCategoryBudget(naam, 0));
  }
  // Only categories that exist purely because someone added them can be
  // removed again — a category with real transactions behind it would just
  // reappear, and the Jaarbegroting defaults are not the user's to delete.
  const verwijderbaar = (c: string) =>
    !(c in DEFAULT_CATEGORY_BUDGETS) && !(agg.recurringSpendByCat[c] > 0);

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
                  <th className="py-2 pr-3 font-semibold text-right">Inflatie %</th>
                  <th className="py-2 font-semibold"></th>
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
                      <td className="py-1.5 text-right">
                        {verwijderbaar(c) && (
                          <button
                            onClick={() => start(() => setCategoryBudget(c, null))}
                            className="w-7 h-7 rounded-full text-danger"
                            title="Categorie verwijderen"
                          >
                            ✕
                          </button>
                        )}
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
          <div className="flex items-center gap-2 flex-wrap border-t border-divider pt-3">
            <input
              value={nieuweCat}
              onChange={(e) => setNieuweCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && voegCatToe()}
              placeholder="Naam van een nieuwe categorie"
              className="w-60 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[12.5px]"
            />
            <button
              onClick={voegCatToe}
              disabled={!nieuweCat.trim() || categorieen.includes(nieuweCat.trim())}
              className="px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft disabled:opacity-40"
            >
              + Categorie toevoegen
            </button>
            <span className="text-[11.5px] text-muted">
              Nieuwe categorieën zijn daarna ook te kiezen in de transactie-triage.
            </span>
          </div>
        </Card>

        {/* Jaarposten */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Jaarposten</div>
            <div className="text-[12.5px] text-muted">
              <b className="text-ink">{fmtEUR0(jaarpostenVoorJaar(jaar, yearly, settings, budgetJaar, agg))}</b>/jaar
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left text-label border-b border-divider">
                  <th className="py-2 pr-3 font-semibold">Post</th>
                  <th className="py-2 pr-3 font-semibold text-right">
                    Werkelijk {vorigJaar}
                    {vorigJaarMaanden > 0 && (
                      <span className="font-normal text-muted"> · {vorigJaarMaanden} mnd</span>
                    )}
                  </th>
                  <th
                    className="py-2 pr-3 font-semibold text-right"
                    title="Referentiebedrag + inflatie. Een jaarpost indexeert pas vanaf zijn werkelijke bedrag als het vorige jaar volledig (12 maanden) is ingeladen."
                  >
                    Geïndexeerd
                  </th>
                  <th className="py-2 pr-3 font-semibold text-right">Budget €/jaar</th>
                  <th className="py-2 font-semibold text-right">Inflatie %</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((y) => {
                  const b = jaarpostVoorJaar(y, jaar, settings, budgetJaar, agg);
                  const w = werkelijkJaarpostVoorJaar(y, vorigJaar, agg);
                  return (
                    <tr key={y.id} className="border-b border-divider/60">
                      <td className="py-1.5 pr-3">{y.name}</td>
                      <td className="py-1.5 pr-3 text-right">
                        {w == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <Link
                            href={`/financien?jaarpost=${encodeURIComponent(y.name)}&jaar=${vorigJaar}`}
                            className="text-ink-soft hover:text-accent underline decoration-dotted underline-offset-2"
                            title={`Toon de transacties van ${y.name} in ${vorigJaar}`}
                          >
                            {fmtEUR0(w.bedrag)}
                          </Link>
                        )}
                      </td>
                      <td
                        className="py-1.5 pr-3 text-right"
                        style={{ color: b.referentie.bron === "werkelijk" ? "var(--color-ink)" : "var(--color-muted)" }}
                        title={
                          b.referentie.bron === "werkelijk"
                            ? `${fmtEUR0(b.referentie.bedrag)} werkelijk in ${b.referentie.jaar} (volledig jaar) + ${y.inflatie ?? settings.inflatieDefault}% inflatie`
                            : `${fmtEUR0(y.budget)} basisbedrag${jaar > PROJECTION_START_YEAR ? ` + ${y.inflatie ?? settings.inflatieDefault}% inflatie per jaar` : ""}`
                        }
                      >
                        {fmtEUR0(b.afgeleid)}
                        {b.referentie.bron === "werkelijk" && (
                          <span className="text-[10px] text-muted align-super ml-0.5">w</span>
                        )}
                      </td>
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
          <div className="text-[11.5px] text-muted leading-relaxed">
            Klik op een werkelijk bedrag om in Financiën de transacties van die post te zien.
            Een jaarpost indexeert pas vanaf zijn werkelijke bedrag als het vorige jaar <b>volledig</b>{" "}
            is ingeladen (12 maanden) — bij een half jaar is &ldquo;werkelijk&rdquo; nog een
            deelbetaling, en zou een post die in november betaald wordt vanaf €0 doorrekenen.
          </div>
        </Card>

        {/* Aandachtspunten */}
        <SignalenKaart
          transactions={transactions}
          overrides={overrides}
          settings={settings}
          investIbans={investIbans}
          agg={agg}
          yearly={yearly}
          budgetJaar={budgetJaar}
          budgetteerJaar={jaar}
        />

        {/* Inkomen per bron */}
        <InkomenKaart
          jaar={jaar}
          inkomsten={inkomsten}
          settings={settings}
          budgetJaar={budgetJaar}
          mjpJaar={mjpJaar}
          totaal={opRes.inkomen}
        />

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

/** Income split per source. Until at least one source carries an amount the
 *  engine still uses the old aggregate figure, so the card says so plainly
 *  rather than showing a €0 income the plan isn't actually using. */
function InkomenKaart({
  jaar,
  inkomsten,
  settings,
  budgetJaar,
  mjpJaar,
  totaal,
}: {
  jaar: number;
  inkomsten: FinanceState["inkomsten"];
  settings: FinanceState["settings"];
  budgetJaar: FinanceState["budgetJaar"];
  mjpJaar: FinanceState["mjpJaar"];
  totaal: number;
}) {
  const [, start] = useTransition();
  const uitgesplitst = inkomenIsUitgesplitst(inkomsten, budgetJaar);
  const somPosten = inkomsten.reduce(
    (s, p) => s + inkomenpostVoorJaar(p, jaar, settings, budgetJaar).bedrag,
    0,
  );
  const jaarOverride = mjpJaar.find((m) => m.jaar === jaar)?.inkomen ?? null;
  const basisTotaal = inkomenVoorJaar(PROJECTION_START_YEAR, settings, [], [], []);

  return (
    <Card className="p-4.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">
          Inkomsten per bron
        </div>
        <div className="text-[12.5px] text-muted">
          <b className="text-ink">{fmtEUR0(totaal)}</b>/jaar telt mee in {jaar}
        </div>
      </div>

      {!uitgesplitst && (
        <div className="text-[12.5px]" style={{ color: "#A9761C" }}>
          De bronnen staan nog allemaal op €0. Zolang dat zo is rekent het plan door met het oude
          totaalbedrag van {fmtEUR0(basisTotaal)} uit de begroting, zodat er niets omvalt. Vul de
          bedragen hieronder in — vanaf de eerste ingevulde regel telt de som van deze tabel.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
          <thead>
            <tr className="text-left text-label border-b border-divider">
              <th className="py-2 pr-3 font-semibold">Bron</th>
              <th className="py-2 pr-3 font-semibold text-right">Basis {PROJECTION_START_YEAR} €/jr</th>
              <th className="py-2 pr-3 font-semibold text-right">Geïndexeerd</th>
              <th className="py-2 pr-3 font-semibold text-right">Bedrag {jaar} €/jr</th>
              <th className="py-2 pr-3 font-semibold text-right">Groei %</th>
              <th className="py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {inkomsten.map((p) => {
              const b = inkomenpostVoorJaar(p, jaar, settings, budgetJaar);
              return (
                <tr key={p.id} className="border-b border-divider/60">
                  <td className="py-1.5 pr-3">
                    <input
                      defaultValue={p.name}
                      onBlur={(e) =>
                        e.target.value !== p.name &&
                        start(() => updateInkomen(p.id, { naam: e.target.value }))
                      }
                      className="w-44 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px]"
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    <input
                      key={`${p.id}-basis`}
                      type="number"
                      step={250}
                      defaultValue={p.budget}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isFinite(v) || v === p.budget) return;
                        start(() => updateInkomen(p.id, { bedrag: v }));
                      }}
                      className="w-28 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px] text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(b.afgeleid)}</td>
                  <td className="py-1.5 pr-3 text-right">
                    <input
                      key={`${p.id}-${jaar}-${b.bron}`}
                      type="number"
                      step={250}
                      defaultValue={b.bron === "override" ? b.bedrag : ""}
                      placeholder={b.afgeleid.toFixed(0)}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : parseFloat(raw);
                        if (raw === "" && b.bron === "afgeleid") return;
                        if (v !== null && b.bron === "override" && v === b.bedrag) return;
                        start(() => setBudgetJaar(jaar, "inkomen", p.name, v));
                      }}
                      className="w-28 px-2 py-1 rounded-lg border bg-card text-[12.5px] text-right"
                      style={{
                        borderColor:
                          b.bron === "override" ? "var(--color-accent)" : "var(--color-input-border)",
                      }}
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    <input
                      key={`${p.id}-groei`}
                      type="number"
                      step={0.5}
                      defaultValue={p.groei ?? settings.inkomenGroei}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : parseFloat(raw);
                        if (v === (p.groei ?? settings.inkomenGroei)) return;
                        start(() => updateInkomen(p.id, { groei: v }));
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px] text-right"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => start(() => deleteInkomen(p.id))}
                      className="w-7 h-7 rounded-full text-danger"
                      title="Verwijder"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="py-2 pr-3 font-semibold">Som van de bronnen</td>
              <td />
              <td />
              <td className="py-2 pr-3 text-right font-bold">{fmtEUR0(somPosten)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => start(() => addInkomen())}
        className="self-start px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft"
      >
        + Inkomstenbron toevoegen
      </button>

      <div className="flex items-end gap-3 flex-wrap border-t border-divider pt-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Totaal {jaar} overschrijven (€/jaar)</span>
          <input
            key={`ink-tot-${jaar}`}
            type="number"
            step={500}
            defaultValue={jaarOverride ?? ""}
            placeholder={somPosten.toFixed(0)}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const v = raw === "" ? null : parseFloat(raw);
              if (v === jaarOverride) return;
              start(() => updateMjpJaar(jaar, { inkomen: v }));
            }}
            className="w-36 px-2.5 py-2 rounded-xl border bg-card text-[13.5px]"
            style={{ borderColor: jaarOverride != null ? "var(--color-accent)" : "var(--color-input-border)" }}
          />
        </label>
        <div className="text-[11.5px] text-muted max-w-[460px] leading-relaxed">
          Deze regel wint van alles hierboven — handig om één jaar hard vast te zetten. Leeg = de som
          van de bronnen telt. De groei per bron staat standaard op {settings.inkomenGroei}%; zet
          vakantiegeld of een 13e maand op 0 als die niet meestijgt.
        </div>
      </div>
    </Card>
  );
}

/** What deserves attention in the numbers, ranked by what it costs per year.
 *  The old ritme-analyse listed every post with a verdict and no way to act on
 *  it; this shows only the posts where something is off, says it in plain
 *  language with the concrete amounts, links through to the transactions, and
 *  offers a button that writes the corrected budget. */
function SignalenKaart({
  transactions,
  overrides,
  settings,
  investIbans,
  agg,
  yearly,
  budgetJaar,
  budgetteerJaar,
}: {
  transactions: FinanceState["transactions"];
  overrides: FinanceState["overrides"];
  settings: FinanceState["settings"];
  investIbans: Set<string>;
  agg: ReturnType<typeof aggregate>;
  yearly: FinanceState["yearly"];
  budgetJaar: FinanceState["budgetJaar"];
  budgetteerJaar: number;
}) {
  const [, start] = useTransition();
  const dataJaren = Object.keys(agg.monthsByYear).map(Number).sort();
  const analyseJaar = dataJaren.length ? dataJaren[dataJaren.length - 1] : null;

  const signalen = useMemo(
    () =>
      analyseJaar == null
        ? []
        : budgetSignalen(
            transactions,
            overrides,
            settings,
            investIbans,
            agg,
            yearly,
            budgetJaar,
            analyseJaar,
          ),
    [transactions, overrides, settings, investIbans, agg, yearly, budgetJaar, analyseJaar],
  );

  const [allesTonen, setAllesTonen] = useState(false);
  if (analyseJaar == null) return null;
  const maanden = maandenInJaar(analyseJaar, agg);
  // Only the handful that matter by default — the point is where to start,
  // not an inventory. The rest stays one click away.
  const TOP = 6;
  const zichtbaar = allesTonen ? signalen : signalen.slice(0, TOP);

  const tekst = (s: Signaal) => {
    const perMnd = (v: number) => `${fmtEUR0(v)}/mnd`;
    switch (s.type) {
      case "meer-dan-budget":
        return s.soort === "categorie"
          ? `${perMnd(s.werkelijkPerMaand)} uitgegeven tegen ${perMnd(s.budgetPerMaand)} begroot`
          : `${fmtEUR0(s.werkelijkPerJaar)} uitgegeven, ${fmtEUR0(s.budgetPerJaar)} begroot voor het hele jaar`;
      case "minder-dan-budget":
        return `${perMnd(s.werkelijkPerMaand)} uitgegeven tegen ${perMnd(s.budgetPerMaand)} begroot`;
      case "geen-budget":
        return `${perMnd(s.werkelijkPerMaand)} uitgegeven, maar geen budget`;
      case "geen-uitgaven":
        return `${perMnd(s.budgetPerMaand)} begroot, niets uitgegeven`;
      case "netto-ontvangen":
        return `${perMnd(-s.werkelijkPerMaand)} netto binnengekomen op een uitgavenpost — controleer de triage`;
      case "onregelmatig":
        return s.soort === "categorie"
          ? `viel in ${s.maandenMetUitgave} van de ${s.maandenTotaal} maanden — hoort eerder bij de jaarposten`
          : `viel in ${s.maandenMetUitgave} van de ${s.maandenTotaal} maanden — hoort eerder in het maandbudget`;
    }
  };

  const kleur = (s: Signaal) =>
    s.type === "onregelmatig"
      ? "#2F6E8F"
      : s.verschilPerJaar > 0
        ? "#B0512C"
        : s.type === "geen-uitgaven" || s.type === "netto-ontvangen"
          ? "#A9761C"
          : "#5C7F55";

  return (
    <Card className="p-4.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">
          Aandachtspunten · {analyseJaar}
        </div>
        <div className="text-[12px] text-muted">
          {maanden} ingeladen maand{maanden === 1 ? "" : "en"}
        </div>
      </div>

      {signalen.length === 0 ? (
        <div className="text-[12.5px] text-muted">
          Niets bijzonders gevonden in {analyseJaar}. Budgetten en werkelijke uitgaven lopen in de pas.
        </div>
      ) : (
        <>
          <div className="text-[12.5px] text-muted">
            Alleen posten waar iets opvalt, met het grootste bedrag bovenaan. Klik op een naam om de
            transacties erachter te zien.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[680px]">
              <thead>
                <tr className="text-left text-label border-b border-divider">
                  <th className="py-2 pr-3 font-semibold">Post</th>
                  <th className="py-2 pr-3 font-semibold">Wat er opvalt</th>
                  <th className="py-2 pr-3 font-semibold text-right">Scheelt per jaar</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map((s) => (
                  <tr key={s.soort + s.naam} className="border-b border-divider/60">
                    <td className="py-1.5 pr-3">
                      <Link
                        href={`/financien?${s.soort === "jaarpost" ? "jaarpost" : "categorie"}=${encodeURIComponent(s.naam)}&jaar=${analyseJaar}`}
                        className="text-ink-soft hover:text-accent underline decoration-dotted underline-offset-2"
                        title={`Toon de transacties van ${s.naam} in ${analyseJaar}`}
                      >
                        {s.naam}
                      </Link>
                      <span className="text-muted"> · {s.soort === "jaarpost" ? "jaarpost" : "maandbudget"}</span>
                    </td>
                    <td className="py-1.5 pr-3" title={s.maanden.map(labelMonth).join(", ")}>
                      {tekst(s)}
                    </td>
                    <td
                      className="py-1.5 pr-3 text-right font-semibold"
                      style={{ color: kleur(s) }}
                    >
                      {s.type === "onregelmatig" ? "—" : signedEUR(s.verschilPerJaar)}
                    </td>
                    <td className="py-1.5 text-right">
                      {s.voorstel != null && (
                        <button
                          onClick={() =>
                            start(() =>
                              setBudgetJaar(budgetteerJaar, s.soort, s.naam, s.voorstel as number),
                            )
                          }
                          className="px-2.5 py-1 rounded-full border border-input-border text-[11.5px] font-semibold text-ink-soft whitespace-nowrap"
                          title={`Zet het budget voor ${budgetteerJaar} op ${
                            s.soort === "categorie"
                              ? `${fmtEUR0(s.voorstel)}/mnd`
                              : `${fmtEUR0(s.voorstel)}/jaar`
                          }`}
                        >
                          Overnemen in {budgetteerJaar}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {signalen.length > TOP && (
            <button
              onClick={() => setAllesTonen((v) => !v)}
              className="self-start px-3.5 py-2 rounded-full border border-input-border text-[12.5px] font-semibold text-ink-soft"
            >
              {allesTonen ? `Toon alleen de grootste ${TOP}` : `Toon alle ${signalen.length} punten`}
            </button>
          )}
          <div className="text-[11.5px] text-muted leading-relaxed">
            &ldquo;Scheelt per jaar&rdquo; is werkelijk min begroot op jaarbasis — rood kost geld,
            groen levert het op. Bij maandbudgetten wordt het maandgemiddelde over {maanden} maand
            {maanden === 1 ? "" : "en"} doorgetrokken naar twaalf. Posten die minder dan {fmtEUR0(250)}
            /jaar of minder dan 20% afwijken blijven buiten deze lijst.
            {maanden < RITME_MIN_MAANDEN && (
              <>
                {" "}
                Met minder dan {RITME_MIN_MAANDEN} maanden wordt niet gekeken of een post in het
                verkeerde blok staat: elke post die voorkomt zit dan in 100% van de maanden.
              </>
            )}
          </div>
        </>
      )}
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
