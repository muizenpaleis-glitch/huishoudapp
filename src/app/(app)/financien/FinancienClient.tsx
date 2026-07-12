"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Card } from "@/components/ui";
import { fmtEUR, fmtEUR0, signedEUR } from "@/lib/finance/format";
import {
  rebuildInvestIbans,
  aggregate,
  computeBufferActual,
  projectSeries,
  plannedIncidentalForYear,
  catBudgetInfo,
  periodsFor,
  inPeriod,
  labelMonth,
  RECURRING_INCOME_BUDGET,
  RECURRING_SPEND_BUDGET,
  INVESTMENTS,
  OP_RESULT,
  PROJECTION_START_YEAR,
  DEFAULT_CATEGORY_BUDGETS,
  type TimeGran,
} from "@/lib/finance/engine";
import type { FinanceState } from "@/lib/finance/load";
import { ProjectionChart, CategoryDonut, CashflowBars } from "./charts";
import { TriageTable } from "./TriageTable";
import { SettingsPanel, ProjectEditor, YearlyEditor } from "./Editors";
import { ChatWidget } from "./ChatWidget";
import {
  uploadCsv,
  resetTriage,
  resetAllFinance,
  updateSettings,
  setCategoryBudget,
  saveOverride,
} from "./actions";

export function FinancienClient({ state }: { state: FinanceState }) {
  const { transactions, overrides, settings, projects, yearly } = state;

  // UI-only (per-device) state
  const [gran, setGran] = useState<TimeGran>("all");
  const [period, setPeriod] = useState("");
  const [projView, setProjView] = useState<"multi" | "ytd">("multi");
  const [showInvested, setShowInvested] = useState(false);
  const [incYear, setIncYear] = useState<"all" | number>("all");
  const [yrYear, setYrYear] = useState<"all" | number>("all");
  const [catMonth, setCatMonth] = useState<string>("latest");

  // ── Engine (recomputed live, exactly like the original dashboard) ──
  const { investIbans, investDetected } = useMemo(
    () => rebuildInvestIbans(transactions, settings),
    [transactions, settings],
  );
  const aggFull = useMemo(
    () => aggregate(transactions, overrides, settings, investIbans),
    [transactions, overrides, settings, investIbans],
  );
  const filteredTx = useMemo(
    () => (gran === "all" ? transactions : transactions.filter((t) => inPeriod(t.date, gran, period))),
    [transactions, gran, period],
  );
  const aggView = useMemo(
    () => aggregate(filteredTx, overrides, settings, investIbans),
    [filteredTx, overrides, settings, investIbans],
  );
  const { plan, actual, total } = useMemo(
    () => projectSeries(aggFull, settings, projects, yearly),
    [aggFull, settings, projects, yearly],
  );

  const buffer = computeBufferActual(aggFull, settings);
  const nwTotal = buffer + settings.personalSavings + settings.investmentValue;
  const endActual = actual[actual.length - 1];
  const endPlan = plan[plan.length - 1];
  const endYear = PROJECTION_START_YEAR + settings.horizon;
  const periodTxt = gran === "all" ? "alle data" : period;

  // projection chart years/labels
  const jaren = useMemo(() => {
    const arr = [PROJECTION_START_YEAR - 1];
    for (let i = 0; i < settings.horizon; i++) arr.push(PROJECTION_START_YEAR + i);
    return arr;
  }, [settings.horizon]);
  const isYtd = projView === "ytd";
  const chartJaren = isYtd ? jaren.slice(0, 2) : jaren;
  const chartPlan = isYtd ? plan.slice(0, 2) : plan;
  const chartActual = isYtd ? actual.slice(0, 2) : actual;
  const chartTotal = isYtd ? total.slice(0, 2) : total;

  // spend doughnut (filtered)
  const donutData = useMemo(() => {
    const cats = Object.entries(aggView.recurringSpendByCat)
      .filter((c) => c[1] > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = cats.slice(0, 9).map(([label, value]) => ({ label, value }));
    const rest = cats.slice(9).reduce((s, c) => s + c[1], 0);
    if (rest > 0) top.push({ label: "Overig", value: rest });
    return top;
  }, [aggView]);

  // cashflow bars (filtered)
  const cashMonths = useMemo(
    () =>
      [...new Set([...Object.keys(aggView.recurringIncomeByMonth), ...Object.keys(aggView.recurringSpendByMonth)])].sort(),
    [aggView],
  );

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="pt-16 md:pt-6 px-5 flex items-center gap-3">
        <div className="md:hidden w-[46px] h-[46px] rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0">
          <Image src="/wapen-klein.png" alt="Familiewapen" width={34} height={37} className="object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-[26px] font-bold tracking-tight leading-tight">Financiën</div>
          <div className="text-[13.5px] text-muted mt-0.5">
            {transactions.length} transacties · {aggFull.monthCount} maand(en) · gedeeld huishouden
          </div>
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1080px] w-full mx-auto">
        {/* Time filter */}
        <Card className="md:col-span-2 p-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-label font-semibold">Periode</span>
          <div className="flex gap-1.5">
            {(["all", "year", "quarter", "month"] as TimeGran[]).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGran(g);
                  if (g !== "all") {
                    const ps = periodsFor(transactions, g);
                    setPeriod(ps[ps.length - 1] || "");
                  }
                }}
                className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border"
                style={{
                  background: gran === g ? "var(--color-ink)" : "var(--color-card)",
                  color: gran === g ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                  borderColor: gran === g ? "var(--color-ink)" : "var(--color-input-border)",
                }}
              >
                {g === "all" ? "Alles" : g === "year" ? "Jaar" : g === "quarter" ? "Kwartaal" : "Maand"}
              </button>
            ))}
          </div>
          {gran !== "all" && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-2.5 py-1.5 rounded-full border border-input-border bg-card text-[12.5px]"
            >
              {periodsFor(transactions, gran).map((p) => (
                <option key={p} value={p}>
                  {gran === "month" ? labelMonth(p) : p}
                </option>
              ))}
            </select>
          )}
          <span className="text-[11px] text-muted ml-auto hidden md:block">
            Filtert inkomen, uitgaven en de categorie- &amp; cashflow-weergaven. Projectie en incidenteel gebruiken altijd alle data.
          </span>
        </Card>

        {/* KPI tiles (6) */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <Kpi label="Inkomen / mnd" value={fmtEUR(aggView.incomePerMonth)} sub={`${periodTxt} · budget ${fmtEUR0(settings.monthlyIncome)}`} />
          <Kpi label="Uitgaven / mnd" value={fmtEUR(aggView.spendPerMonth)} sub={`${periodTxt} · budget ${fmtEUR0(settings.monthlyBudget)}`} />
          <Kpi
            label="Bruto waarde vs budget"
            value={signedEUR(aggFull.deviationTotal)}
            valueColor={aggFull.deviationTotal >= 0 ? "#5C7F55" : "#B0512C"}
            sub="geladen maanden vs plan"
          />
          <Kpi label="Incidentele projecten" value={fmtEUR(aggFull.incidentalTotal)} sub={`${aggFull.incidentalCount} transactie(s)`} />
          <Kpi label="Overboekingen (excl.)" value={fmtEUR(aggFull.excludedTotal)} sub="intern verkeer" />
          <Kpi
            label={`Vermogen @ ${endYear}`}
            value={fmtEUR0(endActual)}
            sub={`${signedEUR(endActual - endPlan)} vs plan`}
          />
        </div>

        {/* Net worth complete picture */}
        <Card className="p-4.5 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Netto vermogen — totaalbeeld</div>
            <div className="text-[20px] font-bold">{fmtEUR0(nwTotal)}</div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-track">
            <div style={{ width: `${(buffer / nwTotal) * 100}%`, background: "#C4633B" }} />
            <div style={{ width: `${(settings.personalSavings / nwTotal) * 100}%`, background: "#5C7F55" }} />
            <div style={{ width: `${(settings.investmentValue / nwTotal) * 100}%`, background: "#6C5B8C" }} />
          </div>
          <NwRow label="Vrij besteedbaar (buffer)" dot="#C4633B" value={buffer} note="afgeleid uit imports" />
          <NwPotRow label="Persoonlijke besparingen" dot="#5C7F55" value={settings.personalSavings} field="personalSavings" />
          <NwPotRow label="Beleggingen (marktwaarde)" dot="#6C5B8C" value={settings.investmentValue} field="investmentValue" />
        </Card>

        {/* Budget framework */}
        <BudgetFramework aggFull={aggFull} settings={settings} projects={projects} yearly={yearly} plan={plan} />

        {/* Projection */}
        <Card className="p-4.5 flex flex-col gap-3 md:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Meerjarenprojectie (MJP)</div>
            <div className="flex items-center gap-3">
              <label className="hidden md:flex items-center gap-1.5 text-[12px] text-muted">
                <input type="checkbox" checked={showInvested} onChange={(e) => setShowInvested(e.target.checked)} />
                incl. belegd
              </label>
              <div className="flex bg-track rounded-full p-[3px]">
                {(["multi", "ytd"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setProjView(v)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                    style={{
                      background: projView === v ? "var(--color-card)" : "transparent",
                      color: projView === v ? "var(--color-ink)" : "var(--color-muted)",
                    }}
                  >
                    {v === "multi" ? "Meerjaren" : "Dit jaar"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ProjectionChart
            jaren={chartJaren}
            plan={chartPlan}
            actual={chartActual}
            total={chartTotal}
            kritiekeGrens={15000}
            showTotal={showInvested && !isYtd}
          />
        </Card>

        {/* Spend by category */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Uitgaven per categorie · {periodTxt}</div>
          <CategoryDonut data={donutData} />
        </Card>

        {/* Cashflow */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Maandcashflow · {periodTxt}</div>
          <CashflowBars
            months={cashMonths}
            income={cashMonths.map((m) => aggView.recurringIncomeByMonth[m] || 0)}
            spend={cashMonths.map((m) => aggView.recurringSpendByMonth[m] || 0)}
          />
        </Card>

        {/* Category budgets */}
        <div className="md:col-span-2">
          <CategoryBudgets aggFull={aggFull} settings={settings} catMonth={catMonth} setCatMonth={setCatMonth} />
        </div>

        {/* Incidental projects */}
        <div className="md:col-span-2">
          <IncidentalTracker aggFull={aggFull} projects={projects} incYear={incYear} setIncYear={setIncYear} />
        </div>

        {/* Yearly recurring */}
        <div className="md:col-span-2">
          <YearlyTracker aggFull={aggFull} yearly={yearly} yrYear={yrYear} setYrYear={setYrYear} />
        </div>

        {/* Savings & investments */}
        <div className="md:col-span-2">
          <SavingsSection aggFull={aggFull} investDetected={investDetected} />
        </div>

        {/* ── Web-only: CSV upload, triage, editors, settings, advanced ── */}
        <div className="hidden md:flex md:col-span-2 flex-col gap-4">
          <CsvUpload />

          <Collapsible title="Transactie-triage" defaultOpen={false}>
            <TriageTable
              transactions={transactions}
              overrides={overrides}
              settings={settings}
              investIbans={investIbans}
              projects={projects}
              yearly={yearly}
            />
          </Collapsible>

          <Collapsible title="Projecten &amp; budgetten beheren" defaultOpen={false}>
            <ProjectEditor projects={projects} />
          </Collapsible>

          <Collapsible title="Jaarposten beheren" defaultOpen={false}>
            <YearlyEditor yearly={yearly} />
          </Collapsible>

          <Collapsible title="Instellingen (projectie, rekeningen &amp; drempels)" defaultOpen={false}>
            <SettingsPanel settings={settings} />
          </Collapsible>

          <AdvancedMenu />
        </div>
      </div>

      <ChatWidget
        agg={aggFull}
        transactions={transactions}
        overrides={overrides}
        settings={settings}
        investIbans={investIbans}
        projects={projects}
        yearly={yearly}
        investDetected={investDetected}
      />
    </div>
  );
}

/* ───────────────────────── sub-components ───────────────────────── */

function Kpi({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl p-3.5 flex flex-col gap-1 bg-card border border-card-border">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div className="text-[18px] font-bold" style={{ color: valueColor ?? "var(--color-ink)" }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function NwRow({ label, dot, value, note }: { label: string; dot: string; value: number; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13.5px]">
      <div className="flex items-center gap-2 text-ink-soft min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
        <span className="truncate">{label}</span>
        {note && <span className="text-hint text-[11px] hidden md:inline">· {note}</span>}
      </div>
      <div className="font-semibold shrink-0">{fmtEUR0(value)}</div>
    </div>
  );
}

function NwPotRow({
  label,
  dot,
  value,
  field,
}: {
  label: string;
  dot: string;
  value: number;
  field: "personalSavings" | "investmentValue";
}) {
  const [, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-2 text-[13.5px]">
      <div className="flex items-center gap-2 text-ink-soft min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
        <span className="truncate">{label}</span>
      </div>
      <div className="font-semibold md:hidden">{fmtEUR0(value)}</div>
      <div className="hidden md:flex items-center gap-1">
        <span className="text-muted text-[12px]">€</span>
        <input
          type="number"
          step={50}
          defaultValue={value}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (isFinite(v) && v >= 0 && v !== value) start(() => updateSettings({ [field]: v }));
          }}
          className="w-24 px-2 py-1 rounded-lg border border-input-border text-right text-[13px] bg-card"
        />
      </div>
    </div>
  );
}

function TrackerHeadline({
  label,
  spent,
  budget,
  color,
  sub,
}: {
  label: string;
  spent: number;
  budget: number;
  color: string;
  sub?: string;
}) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : spent > 0 ? 100 : 0;
  const over = budget > 0 && spent > budget;
  const remaining = budget - spent;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <span className="text-[13.5px] text-ink-soft">{label}</span>
        <span className="text-[13.5px]">
          <b style={{ color: over ? "#B0512C" : "var(--color-ink)" }}>{fmtEUR0(spent)}</b>{" "}
          <span className="text-muted">van {fmtEUR0(budget)}</span>
          <span className="ml-2" style={{ color: over ? "#B0512C" : "var(--color-muted)" }}>
            {remaining >= 0 ? `${fmtEUR0(remaining)} over` : `${fmtEUR0(-remaining)} te veel`}
          </span>
        </span>
      </div>
      <div className="h-3 rounded-full bg-track overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "#BC4A26" : color }} />
      </div>
      {sub && <div className="text-[11.5px] text-muted mt-0.5" dangerouslySetInnerHTML={{ __html: sub }} />}
    </div>
  );
}

function ProgressRow({
  name,
  meta,
  spent,
  budget,
  color,
  note,
}: {
  name: React.ReactNode;
  meta?: string;
  spent: number;
  budget: number;
  color: string;
  note?: string;
}) {
  const pct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
  const over = budget > 0 && spent > budget;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-[12.5px]">
        <span className="font-medium text-ink-soft">{name}</span>
        <span className="text-muted">
          {fmtEUR0(spent)} <span className="text-hint">/ {fmtEUR0(budget)}</span>
          <span className="ml-1" style={{ color: over ? "#B0512C" : "var(--color-muted)" }}>
            {budget > 0 ? Math.round(pct) + "%" : meta || "—"}
          </span>
        </span>
      </div>
      <div className="h-[7px] rounded-full bg-track overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: over ? "#BC4A26" : color }} />
      </div>
      {note && <div className="text-[11px] text-muted text-right">{note}</div>}
    </div>
  );
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="p-4.5 flex flex-col gap-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between">
        <span
          className="text-[13px] font-bold tracking-wider uppercase text-label"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <span className="text-muted text-[12px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </Card>
  );
}

function TrackerCard({
  title,
  headline,
  filters,
  children,
  defaultOpen,
}: {
  title: string;
  headline: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="p-4.5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">{title}</div>
        <button onClick={() => setOpen((o) => !o)} className="text-[12px] font-semibold text-ink-soft">
          {open ? "Verberg" : "Toon"} {open ? "▲" : "▼"}
        </button>
      </div>
      {headline}
      {open && (
        <>
          {filters}
          {children}
        </>
      )}
    </Card>
  );
}

/* ── Budget framework ── */
function BudgetFramework({
  aggFull,
  settings,
  projects,
  yearly,
  plan,
}: {
  aggFull: ReturnType<typeof aggregate>;
  settings: FinanceState["settings"];
  projects: FinanceState["projects"];
  yearly: FinanceState["yearly"];
  plan: number[];
}) {
  const year = PROJECTION_START_YEAR;
  const income = RECURRING_INCOME_BUDGET;
  const spend = RECURRING_SPEND_BUDGET;
  const gross = income - spend;
  const oneoffs = yearly.reduce((s, y) => s + (y.budget || 0), 0);
  const incidentals = plannedIncidentalForYear(year, settings, projects);
  const invest = INVESTMENTS[year];
  const start = settings.startNetWorth;
  const netResult = gross - oneoffs - incidentals;
  const netWorthEnd = start + netResult;
  const bufferEnd = netWorthEnd - invest;
  const endPlan = plan[1];
  const recoGap = endPlan - bufferEnd;

  const m = (aggFull.monthsByYear[year] && aggFull.monthsByYear[year].size) || 0;
  const aInc = aggFull.recurringIncomeByYear[year] || 0;
  const aSpend = aggFull.recurringSpendByYear[year] || 0;
  const aGross = aInc - aSpend;
  const aNetResult = aGross - aggFull.yearlyTotal - aggFull.incidentalTotal;
  const netWorthActual = start + aNetResult;
  const bufferActual = computeBufferActual(aggFull, settings);

  return (
    <Card className="p-4.5 flex flex-col gap-4 md:col-span-2">
      <div className="text-[13px] font-bold tracking-wider uppercase text-label">
        Budgetraamwerk <span className="text-muted font-normal normal-case">· {year} begroot vs werkelijk</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Begrote opbouw (heel jaar)</div>
          <BfLine label="Terugkerend inkomen" v={income} />
          <BfLine label="Terugkerende uitgaven" v={-spend} />
          <BfLine label="= Bruto waarde" v={gross} top bold />
          <BfLine label="Jaarposten" v={-oneoffs} />
          <BfLine label={`Incidenteel (${year})`} v={-incidentals} />
          <BfLine label="= Netto resultaat" v={netResult} top bold />
          <BfLine label={`Startvermogen (31-12-${year - 1})`} v={start} plain muted />
          <BfLine label="= Vermogen einde jaar" v={netWorthEnd} top bold plain />
          <BfLine label="   waarvan belegd" v={invest} plain muted />
          <BfLine label="   waarvan buffer" v={bufferEnd} plain muted />
        </div>
        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Werkelijk tot nu · {m} maand(en)</div>
          <BfLine label="Inkomen werkelijk" v={aInc} />
          <BfLine label="Uitgaven werkelijk" v={-aSpend} />
          <BfLine label="= Bruto waarde werkelijk" v={aGross} top bold />
          <BfLine label="   vs budget pro-rata" v={gross * (m / 12)} plain muted />
          <BfLine label="Jaarposten werkelijk" v={-aggFull.yearlyTotal} />
          <BfLine label="Incidenteel werkelijk" v={-aggFull.incidentalTotal} />
          <BfLine label="= Netto resultaat werkelijk" v={aNetResult} top bold />
          <BfLine label={`Startvermogen (31-12-${year - 1})`} v={start} plain muted />
          <BfLine label="= Vermogen werkelijk" v={netWorthActual} top bold plain />
          <BfLine label="   waarvan belegd" v={aggFull.invest.total} plain muted />
          <BfLine label="   waarvan buffer" v={bufferActual} plain muted />
        </div>
      </div>
      <div className="text-[11.5px] text-muted leading-relaxed border-t border-divider pt-2">
        De planlijn draait op het operationele resultaat uit de MJP-sheet (€{fmtEUR0(OP_RESULT[year]).replace("€", "").trim()}),
        terwijl je componenten inkomen − uitgaven − jaarposten = <b>{fmtEUR0(gross - oneoffs)}</b> geven.{" "}
        {Math.abs(recoGap) > 1
          ? `Dat laat een gat van ${fmtEUR0(Math.abs(recoGap))} tussen de component-buffer (${fmtEUR0(bufferEnd)}) en die van het plan (${fmtEUR0(endPlan)}).`
          : "Deze sluiten op elkaar aan."}
      </div>
    </Card>
  );
}

function BfLine({
  label,
  v,
  top,
  bold,
  plain,
  muted,
}: {
  label: string;
  v: number;
  top?: boolean;
  bold?: boolean;
  plain?: boolean;
  muted?: boolean;
}) {
  const color = muted ? "var(--color-muted)" : v < 0 ? "#B0512C" : "#5C7F55";
  return (
    <div
      className={`flex justify-between py-1 text-[12.5px] ${top ? "border-t border-divider mt-1 pt-1.5 font-semibold" : "border-b border-divider/50"}`}
    >
      <span className={bold ? "text-ink font-medium" : "text-muted"}>{label}</span>
      <span className="font-mono" style={{ color: plain ? "var(--color-ink-soft)" : color }}>
        {plain ? fmtEUR0(v) : signedEUR(v)}
      </span>
    </div>
  );
}

/* ── Category budgets tracker ── */
function CategoryBudgets({
  aggFull,
  settings,
  catMonth,
  setCatMonth,
}: {
  aggFull: ReturnType<typeof aggregate>;
  settings: FinanceState["settings"];
  catMonth: string;
  setCatMonth: (m: string) => void;
}) {
  const [, start] = useTransition();
  const months = Object.keys(aggFull.recurringSpendByMonth).sort();
  if (!months.length) {
    return (
      <Card className="p-4.5">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">Categoriebudgetten</div>
        <div className="text-[13px] text-muted mt-2">Laad transacties om categorie-uitgaven te volgen.</div>
      </Card>
    );
  }
  const latest = months[months.length - 1];
  const sel = catMonth !== "latest" && months.includes(catMonth) ? catMonth : latest;

  const cats = [
    ...new Set([
      ...Object.keys(aggFull.recurringSpendByCat),
      ...Object.keys(DEFAULT_CATEGORY_BUDGETS),
      ...Object.keys(settings.categoryBudgets || {}),
    ]),
  ]
    .map((c) => {
      const info = catBudgetInfo(c, aggFull, settings);
      const actual = (aggFull.recurringSpendByCatMonth[c] && aggFull.recurringSpendByCatMonth[c][sel]) || 0;
      return { name: c, basis: info.basis, budget: info.budget, actual };
    })
    .filter((c) => c.actual > 0 || c.budget > 0)
    .sort((a, b) => b.actual - a.actual);

  const totBudget = cats.reduce((s, c) => s + c.budget, 0);
  const totActual = cats.reduce((s, c) => s + c.actual, 0);
  const vs = totActual - totBudget;

  return (
    <TrackerCard
      title="Categoriebudgetten"
      defaultOpen={false}
      headline={
        <TrackerHeadline
          label={`${sel} · uitgaven vs maandbudget`}
          spent={totActual}
          budget={totBudget}
          color="#5C7F55"
          sub={
            vs <= 0
              ? `${fmtEUR0(-vs)} onder budget deze maand.`
              : `<span style="color:#B0512C">${fmtEUR0(vs)} boven budget deze maand.</span>`
          }
        />
      }
      filters={
        <div className="flex gap-1.5 flex-wrap">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setCatMonth(m)}
              className="px-2.5 py-1 rounded-lg text-[12px] font-semibold border"
              style={{
                background: m === sel ? "var(--color-ink)" : "var(--color-card)",
                color: m === sel ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: m === sel ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cats.map((c) => (
          <ProgressRow
            key={c.name}
            name={c.name}
            spent={c.actual}
            budget={c.budget}
            color="#5C7F55"
            note={`${c.budget - c.actual >= 0 ? fmtEUR0(c.budget - c.actual) + " over" : fmtEUR0(c.actual - c.budget) + " te veel"} · vs ${c.basis === "budget" ? "budget" : "gemiddelde"}`}
          />
        ))}
      </div>
      {/* editor (web only) */}
      <div className="hidden md:block border-t border-divider pt-3 mt-1">
        <div className="text-[11.5px] text-muted mb-2">Pas een categoriebudget aan (leeg = terug naar Jaarbegroting-default):</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[...new Set([...Object.keys(aggFull.recurringSpendByCat), ...Object.keys(DEFAULT_CATEGORY_BUDGETS), ...Object.keys(settings.categoryBudgets || {})])]
            .sort()
            .map((c) => {
              const val = Object.prototype.hasOwnProperty.call(settings.categoryBudgets || {}, c)
                ? settings.categoryBudgets[c]
                : c in DEFAULT_CATEGORY_BUDGETS
                  ? DEFAULT_CATEGORY_BUDGETS[c]
                  : "";
              return (
                <div key={c} className="flex items-center gap-2">
                  <span className="flex-1 text-[12.5px] text-ink-soft truncate">{c}</span>
                  <input
                    type="number"
                    step={25}
                    defaultValue={val}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const v = raw === "" ? null : parseFloat(raw);
                      start(() => setCategoryBudget(c, v));
                    }}
                    className="w-24 px-2 py-1 rounded-lg border border-input-border bg-card text-[12.5px]"
                  />
                </div>
              );
            })}
        </div>
      </div>
    </TrackerCard>
  );
}

/* ── Incidental projects tracker ── */
function IncidentalTracker({
  aggFull,
  projects,
  incYear,
  setIncYear,
}: {
  aggFull: ReturnType<typeof aggregate>;
  projects: FinanceState["projects"];
  incYear: "all" | number;
  setIncYear: (y: "all" | number) => void;
}) {
  const known = projects.map((p) => p.name);
  const extra = Object.keys(aggFull.incidentalByProject).filter((n) => !known.includes(n));
  let all: { name: string; budget: number; year?: number; done?: boolean }[] = [
    ...projects.map((p) => ({ name: p.name, budget: p.budget, year: p.year, done: p.done })),
    ...extra.map((n) => ({ name: n, budget: 0 })),
  ];
  const years = [...new Set(projects.map((p) => p.year).filter(Boolean))].sort();
  if (incYear !== "all") all = all.filter((p) => !p.year || p.year === incYear);

  const totBudget = all.reduce((s, p) => s + p.budget, 0);
  const totSpent = all.reduce((s, p) => s + (aggFull.incidentalByProject[p.name] || 0), 0);

  return (
    <TrackerCard
      title="Incidentele projecten"
      defaultOpen
      headline={
        <TrackerHeadline
          label={`${incYear === "all" ? "Alle jaren" : incYear} · besteed vs MJP-budget`}
          spent={totSpent}
          budget={totBudget}
          color="#C4633B"
        />
      }
      filters={
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...years] as const).map((y) => (
            <button
              key={y}
              onClick={() => setIncYear(y as "all" | number)}
              className="px-2.5 py-1 rounded-lg text-[12px] font-semibold border"
              style={{
                background: incYear === y ? "var(--color-ink)" : "var(--color-card)",
                color: incYear === y ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: incYear === y ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {y === "all" ? "Alle" : y}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {all.map((p) => {
          const spent = aggFull.incidentalByProject[p.name] || 0;
          const rem = p.budget - spent;
          return (
            <ProgressRow
              key={p.name}
              name={
                <span>
                  {p.done && <span className="text-success">✓ </span>}
                  {p.name}
                  {p.year && <span className="text-hint"> ’{String(p.year).slice(2)}</span>}
                </span>
              }
              meta={spent > 0 ? "geen budget" : "—"}
              spent={spent}
              budget={p.budget}
              color="#C4633B"
              note={p.budget > 0 ? (rem >= 0 ? `${fmtEUR0(rem)} over` : `${fmtEUR0(-rem)} te veel`) : undefined}
            />
          );
        })}
      </div>
    </TrackerCard>
  );
}

/* ── Yearly recurring tracker ── */
function YearlyTracker({
  aggFull,
  yearly,
  yrYear,
  setYrYear,
}: {
  aggFull: ReturnType<typeof aggregate>;
  yearly: FinanceState["yearly"];
  yrYear: "all" | number;
  setYrYear: (y: "all" | number) => void;
}) {
  const years = Object.keys(aggFull.monthsByYear).map(Number).sort();
  const sel = yrYear === "all" || years.includes(yrYear) ? yrYear : "all";
  const proRata =
    sel === "all"
      ? years.length
        ? years.reduce((s, y) => s + aggFull.monthsByYear[y].size / 12, 0)
        : 0
      : aggFull.monthsByYear[sel]
        ? aggFull.monthsByYear[sel].size / 12
        : 0;
  const spentFor = (item: string) =>
    sel === "all" ? aggFull.yearlyByItem[item] || 0 : aggFull.yearlyByItemYear[item + "|" + sel] || 0;

  const known = yearly.map((y) => y.name);
  const extra = Object.keys(aggFull.yearlyByItem).filter((n) => !known.includes(n));
  const all = [...yearly.map((y) => ({ name: y.name, budget: y.budget })), ...extra.map((n) => ({ name: n, budget: 0 }))];

  const totBudget = all.reduce((s, y) => s + y.budget, 0);
  const totSpent = all.reduce((s, y) => s + spentFor(y.name), 0);
  const expectedTot = totBudget * proRata;
  const vs = totSpent - expectedTot;

  return (
    <TrackerCard
      title="Jaarlijks terugkerend"
      defaultOpen={false}
      headline={
        <TrackerHeadline
          label={`${sel === "all" ? "Alle geladen" : sel} · besteed vs jaarbudget`}
          spent={totSpent}
          budget={totBudget}
          color="#6C5B8C"
          sub={`Pro-rata verwacht ${fmtEUR0(expectedTot)} tot nu — ${vs <= 0 ? fmtEUR0(-vs) + " onder" : '<span style="color:#B0512C">' + fmtEUR0(vs) + " boven</span>"}.`}
        />
      }
      filters={
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...years] as const).map((y) => (
            <button
              key={y}
              onClick={() => setYrYear(y as "all" | number)}
              className="px-2.5 py-1 rounded-lg text-[12px] font-semibold border"
              style={{
                background: sel === y ? "var(--color-ink)" : "var(--color-card)",
                color: sel === y ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: sel === y ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {y === "all" ? "Alle" : y}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {all.map((item) => {
          const spent = spentFor(item.name);
          const expected = item.budget * proRata;
          return (
            <ProgressRow
              key={item.name}
              name={item.name}
              meta={spent > 0 ? "geen budget" : "—"}
              spent={spent}
              budget={item.budget}
              color="#6C5B8C"
              note={item.budget > 0 ? `verwacht ${fmtEUR0(expected)} tot nu` : undefined}
            />
          );
        })}
      </div>
    </TrackerCard>
  );
}

/* ── Savings & investments ── */
function SavingsSection({
  aggFull,
  investDetected,
}: {
  aggFull: ReturnType<typeof aggregate>;
  investDetected: { iban: string; term: string }[];
}) {
  const [, start] = useTransition();
  const s = aggFull.savings;
  const inv = aggFull.invest;
  const months = Object.keys(s.byMonth).sort();

  return (
    <TrackerCard
      title="Sparen &amp; beleggen"
      defaultOpen={false}
      headline={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <MiniStat label="Netto regulier / mnd" value={signedEUR(s.netRegPerMonth)} pos={s.netRegPerMonth >= 0} />
          <MiniStat label="Netto regulier" value={signedEUR(s.netReg)} pos={s.netReg >= 0} sub={`${fmtEUR0(s.depositReg)} in · ${fmtEUR0(s.withdrawReg)} uit`} />
          <MiniStat label="Netto totaal" value={signedEUR(s.net)} pos={s.net >= 0} sub={`${fmtEUR0(s.deposit)} in · ${fmtEUR0(s.withdraw)} uit`} />
          <MiniStat label="Belegd (gestort)" value={fmtEUR0(inv.total)} pos sub={inv.count ? `${inv.count} storting(en)` : "geen stortingen"} />
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {months.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[420px]">
              <thead>
                <tr className="text-left text-muted border-b border-divider">
                  <th className="py-1.5 font-semibold">Maand</th>
                  <th className="py-1.5 text-right font-semibold">In</th>
                  <th className="py-1.5 text-right font-semibold">Uit</th>
                  <th className="py-1.5 text-right font-semibold">Netto</th>
                  <th className="py-1.5 text-right font-semibold">Netto reg.</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const x = s.byMonth[m];
                  const net = x.deposit - x.withdraw;
                  const netReg = x.depositReg - x.withdrawReg;
                  return (
                    <tr key={m} className="border-b border-divider/50">
                      <td className="py-1.5">{labelMonth(m)}</td>
                      <td className="py-1.5 text-right text-success">{fmtEUR0(x.deposit)}</td>
                      <td className="py-1.5 text-right" style={{ color: "#B0512C" }}>{x.withdraw ? fmtEUR0(x.withdraw) : "—"}</td>
                      <td className="py-1.5 text-right font-medium" style={{ color: net >= 0 ? "#5C7F55" : "#B0512C" }}>{signedEUR(net)}</td>
                      <td className="py-1.5 text-right" style={{ color: netReg >= 0 ? "#5C7F55" : "#B0512C" }}>{signedEUR(netReg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[13px] text-muted">Geen spaartransacties gevonden. Stel de spaar-IBAN in bij instellingen.</div>
        )}

        {/* bookings with incidental toggle (web) */}
        {s.items.length > 0 && (
          <div className="hidden md:flex flex-col gap-1.5">
            <div className="text-[11.5px] uppercase tracking-wider text-muted">Boekingen — wissel incidenteel</div>
            {s.items.map((it) => {
              const into = it.amount < 0;
              return (
                <div key={it.id} className="flex items-center gap-2 text-[12px] bg-cream rounded-lg px-2 py-1.5">
                  <span className="w-14 text-muted">{it.date.slice(5)}</span>
                  <span className="w-16 text-right font-medium" style={{ color: into ? "#5C7F55" : "#B0512C" }}>
                    {into ? "+" : "−"}{fmtEUR0(Math.abs(it.amount))}
                  </span>
                  <span className="flex-1 truncate text-ink-soft" title={it.desc}>{it.desc || "—"}</span>
                  <button
                    onClick={() => start(() => saveOverride(it.id, { savingsInc: !it.incidental }))}
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded border"
                    style={{
                      background: it.incidental ? "#F5E8CB" : "var(--color-card)",
                      borderColor: it.incidental ? "#E7D3A0" : "var(--color-input-border)",
                      color: it.incidental ? "#8A5E14" : "var(--color-muted)",
                    }}
                  >
                    {it.incidental ? "incidenteel" : "regulier"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(inv.byYear).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(inv.byYear).map(([y, v]) => (
              <div key={y} className="text-[12px] bg-cream rounded-lg px-2.5 py-1.5">
                <span className="text-ink-soft">{y}</span> <span className="font-semibold" style={{ color: "#6C5B8C" }}>{fmtEUR0(v)}</span>
              </div>
            ))}
          </div>
        )}
        {investDetected.length > 0 && (
          <div className="text-[11px] text-muted">
            Herkende beleggingsrekening(en): {investDetected.map((d) => `${d.iban} (${d.term})`).join(" · ")}
          </div>
        )}
      </div>
    </TrackerCard>
  );
}

function MiniStat({ label, value, sub, pos }: { label: string; value: string; sub?: string; pos: boolean }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2.5 flex flex-col gap-0.5">
      <div className="text-[10.5px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-[15px] font-bold" style={{ color: pos ? "#5C7F55" : "#B0512C" }}>{value}</div>
      {sub && <div className="text-[10.5px] text-muted">{sub}</div>}
    </div>
  );
}

/* ── CSV upload (web only) ── */
function CsvUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const texts = await Promise.all([...files].map((f) => f.text()));
      const { added } = await uploadCsv(texts);
      setMsg(`${added} nieuwe transactie(s) geïmporteerd (duplicaten overgeslagen).`);
      start(() => {});
    } catch {
      setMsg("Importeren mislukt — is dit een ASN-CSV-export?");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div
      className="bg-card border border-card-border border-dashed border-[1.5px] rounded-[22px] p-5 flex flex-col items-center justify-center gap-2 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      <input ref={ref} type="file" accept=".csv,text/csv" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="px-5 py-2.5 rounded-full bg-ink text-accent-ink text-[13.5px] font-semibold disabled:opacity-60"
      >
        {busy ? "Bezig…" : "Bank-CSV uploaden"}
      </button>
      <div className="text-[12.5px] text-muted">Sleep hier je ASN-export, of kies een bestand</div>
      {msg && <div className="text-[12.5px] font-semibold text-accent">{msg}</div>}
      <div className="text-[11px] text-hint max-w-[520px]">
        Importeren, triage en bewerken kan alleen op de webversie. Op mobiel is dit scherm alleen-lezen.
      </div>
    </div>
  );
}

/* ── Advanced (reset) ── */
function AdvancedMenu() {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  return (
    <Card className="p-4.5 flex flex-col gap-3" style={{ background: "#FBF1E8", borderColor: "#EAD9C4" }}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between">
        <span className="text-[13px] font-bold tracking-wider uppercase text-label">Geavanceerd</span>
        <span className="text-muted text-[12px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[12px] text-muted">Deze acties wissen data en zijn onomkeerbaar. Alleen op web.</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                if (confirm("Alle handmatige triage-correcties wissen en terug naar de automatische regels?"))
                  start(() => resetTriage());
              }}
              className="px-4 py-2.5 rounded-full border border-input-border text-[13px] font-semibold text-ink-soft"
            >
              Reset triage
            </button>
            <button
              onClick={() => {
                if (confirm("ALLE financiële data wissen en het ingebouwde mei-2026 voorbeeld opnieuw laden?"))
                  start(() => resetAllFinance());
              }}
              className="px-4 py-2.5 rounded-full border border-danger/40 text-[13px] font-semibold text-danger"
            >
              Reset alle data
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
