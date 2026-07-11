"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import {
  eur,
  netWorthLine,
  barCol,
  type NetWorth,
  type MjpResultaat,
  type MaandFactor,
  type CategorieBudget,
  type IncidenteelProject,
  type JaarlijksItem,
  type Transactie,
} from "@/lib/financien";
import { MjpChart } from "./MjpChart";
import { TrackerCard } from "./TrackerCard";
import { TriageTable } from "./TriageTable";
import { ChatWidget } from "./ChatWidget";
import { updateNetWorthField, resetTriage } from "./actions";

const ACTUAL_JAAR = { 2026: 31200 };

export function FinancienClient({
  netWorth,
  mjp,
  maanden,
  categorieen,
  projecten,
  jaarlijks,
  transacties,
}: {
  netWorth: NetWorth;
  mjp: MjpResultaat[];
  maanden: MaandFactor[];
  categorieen: CategorieBudget[];
  projecten: IncidenteelProject[];
  jaarlijks: JaarlijksItem[];
  transacties: Transactie[];
}) {
  const [, startTransition] = useTransition();
  const MOPTS = useMemo(
    () => [{ maand: "all", kort: "Alle", lang: "alle maanden", factor: 1 }, ...maanden],
    [maanden],
  );
  const [selMonth, setSelMonth] = useState("all");
  const [projView, setProjView] = useState<"multi" | "ytd">("multi");
  const [incYear, setIncYear] = useState<"all" | number>("all");
  const [yrYear, setYrYear] = useState<"all" | 2026>("all");
  const [editing, setEditing] = useState<"spaargeld" | "beleggingen" | null>(null);
  const [editVal, setEditVal] = useState("");

  const mIdx = Math.max(0, MOPTS.findIndex((m) => m.maand === selMonth));
  const curM = MOPTS[mIdx];
  const isAlleMnd = curM.maand === "all";
  const mfac = isAlleMnd ? 1 : curM.factor;
  const maandLabel = isAlleMnd ? "gemiddeld" : curM.lang;

  const spendActual = Math.round(netWorth.spendActualMaand * mfac);
  const over = netWorth.incomeMaand - spendActual;
  const benut = Math.round((spendActual / netWorth.spendBudgetMaand) * 100);
  const nwT = netWorth.buffer + netWorth.spaargeld + netWorth.beleggingen;

  const spendCats = categorieen
    .filter((c) => c.inSpendOverzicht)
    .map((c) => ({ ...c, bedrag: Math.round(c.actualMaandelijks * (c.vast ? 1 : mfac)) }));
  const maxSpend = Math.max(1, ...spendCats.map((c) => c.bedrag));

  const budgetCats = categorieen
    .filter((c) => c.inBudgetOverzicht)
    .map((c) => {
      const actual = Math.round(c.actualMaandelijks * (c.vast ? 1 : mfac));
      const budget = c.budgetMaandelijks ?? actual;
      const over100 = actual > budget;
      return { ...c, actual, budget, over100, pct: budget > 0 ? actual / budget : 0 };
    });
  const budTotaalActual = budgetCats.reduce((s, c) => s + c.actual, 0);
  const budTotaalBudget = budgetCats.reduce((s, c) => s + c.budget, 0);
  const budOver = budTotaalActual > budTotaalBudget;

  const projJaren = [...new Set(projecten.map((p) => p.jaar))].sort();
  const incFiltered = incYear === "all" ? projecten : projecten.filter((p) => p.jaar === incYear);
  const incTotaalSpent = incFiltered.reduce((s, p) => s + p.besteed, 0);
  const incTotaalBudget = incFiltered.reduce((s, p) => s + p.budget, 0);
  const incOver = incTotaalSpent > incTotaalBudget;

  const yrIsBudget = yrYear === "all";
  const yrTotaalBudget = jaarlijks.reduce((s, j) => s + j.budgetJaarlijks, 0);
  const yrTotaalSpent = jaarlijks.reduce((s, j) => s + j.besteed2026, 0);

  const { jaren: mjpJaren, vals: mjpVals } = netWorthLine(netWorth, mjp, projecten);
  const chartJaren = projView === "ytd" ? [2025, 2026] : mjpJaren;
  const chartVals = projView === "ytd" ? mjpVals.slice(0, 2) : mjpVals;

  function saveEdit() {
    if (!editing) return;
    const v = parseFloat(editVal.replace(",", "."));
    if (!Number.isNaN(v)) startTransition(() => updateNetWorthField(editing, v));
    setEditing(null);
  }

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="pt-16 md:pt-6 px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="md:hidden w-[46px] h-[46px] rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0">
            <Image src="/wapen-klein.png" alt="Familiewapen" width={34} height={37} className="object-contain" />
          </div>
          <div>
            <div className="text-[26px] font-bold tracking-tight leading-tight">Financiën</div>
            <div className="text-[13.5px] text-muted mt-0.5">{maandLabel} · gedeeld huishouden</div>
          </div>
        </div>
      </div>

      {/* Month switcher */}
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <button
          onClick={() => mIdx > 0 && setSelMonth(MOPTS[mIdx - 1].maand)}
          disabled={mIdx === 0}
          className="w-8 h-8 rounded-full bg-card border border-card-border flex items-center justify-center shrink-0 disabled:opacity-35"
        >
          <ChevronLeftIcon size={15} />
        </button>
        <div className="flex gap-1.5 overflow-x-auto">
          {MOPTS.map((m) => (
            <button
              key={m.maand}
              onClick={() => setSelMonth(m.maand)}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border"
              style={{
                background: selMonth === m.maand ? "var(--color-ink)" : "var(--color-card)",
                color: selMonth === m.maand ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: selMonth === m.maand ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {m.kort}
            </button>
          ))}
        </div>
        <button
          onClick={() => mIdx < MOPTS.length - 1 && setSelMonth(MOPTS[mIdx + 1].maand)}
          disabled={mIdx === MOPTS.length - 1}
          className="w-8 h-8 rounded-full bg-card border border-card-border flex items-center justify-center shrink-0 disabled:opacity-35"
        >
          <ChevronRightIcon size={15} />
        </button>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1080px] w-full mx-auto">
        {/* KPI tiles */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <KpiTile label="Netto vermogen" value={eur(nwT)} />
          <KpiTile label="Inkomen" value={eur(netWorth.incomeMaand)} sub={isAlleMnd ? "gemiddeld/mnd" : maandLabel} />
          <KpiTile label="Uitgaven" value={eur(spendActual)} sub={isAlleMnd ? "gemiddeld/mnd" : maandLabel} />
          <KpiTile
            label="Budget benut"
            value={`${benut}%`}
            warn={benut > 100}
            sub={benut > 100 ? `${eur(spendActual - netWorth.spendBudgetMaand)} boven budget` : "binnen budget"}
          />
        </div>

        {/* Net worth panel */}
        <Card className="p-4.5 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Netto vermogen</div>
            <div className="text-[20px] font-bold">{eur(nwT)}</div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-track">
            <div style={{ width: `${(netWorth.buffer / nwT) * 100}%`, background: "#C4633B" }} />
            <div style={{ width: `${(netWorth.spaargeld / nwT) * 100}%`, background: "#5C7F55" }} />
            <div style={{ width: `${(netWorth.beleggingen / nwT) * 100}%`, background: "#6C5B8C" }} />
          </div>
          <NetWorthRow label="Vrij besteedbaar (buffer)" value={netWorth.buffer} dotColor="#C4633B" />
          <NetWorthRow
            label="Spaargeld (gezamenlijk)"
            value={netWorth.spaargeld}
            dotColor="#5C7F55"
            editable
            isEditing={editing === "spaargeld"}
            onEdit={() => {
              setEditing("spaargeld");
              setEditVal(String(netWorth.spaargeld));
            }}
            editVal={editVal}
            onEditVal={setEditVal}
            onSave={saveEdit}
          />
          <NetWorthRow
            label="Beleggingen"
            value={netWorth.beleggingen}
            dotColor="#6C5B8C"
            editable
            isEditing={editing === "beleggingen"}
            onEdit={() => {
              setEditing("beleggingen");
              setEditVal(String(netWorth.beleggingen));
            }}
            editVal={editVal}
            onEditVal={setEditVal}
            onSave={saveEdit}
          />
        </Card>

        {/* Maandcashflow */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">
            Maandcashflow · {maandLabel}
          </div>
          <CashRow label="Inkomen" value={eur(netWorth.incomeMaand)} color="var(--color-success)" />
          <CashRow label="Uitgaven" value={eur(spendActual)} color="var(--color-ink)" />
          <CashRow
            label="Over deze maand"
            value={eur(over)}
            color={over < 0 ? "var(--color-danger)" : "var(--color-success)"}
          />
        </Card>

        {/* MJP projection */}
        <Card className="p-4.5 flex flex-col gap-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Meerjarenprojectie</div>
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
          <MjpChart
            jaren={chartJaren}
            vals={chartVals}
            actualJaar={ACTUAL_JAAR}
            actualVals={mjpVals}
            kritiekeGrens={netWorth.kritiekeGrens}
          />
        </Card>

        {/* Uitgaven per categorie */}
        <Card className="p-4.5 flex flex-col gap-3 md:col-span-2">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">
            Uitgaven per categorie · {maandLabel}
          </div>
          <div className="flex flex-col gap-2.5">
            {spendCats.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-[150px] shrink-0 text-[13px] text-ink-soft truncate">{c.label}</div>
                <div className="flex-1 h-[9px] rounded-full bg-track overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.bedrag / maxSpend) * 100}%`, background: c.kleur ?? "#C9B8A4" }}
                  />
                </div>
                <div className="w-[70px] shrink-0 text-right text-[13px] font-semibold">{eur(c.bedrag)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Categoriebudgetten */}
        <div className="md:col-span-2">
          <TrackerCard
            title="Categoriebudgetten"
            toggleLabel="Toon categorieën"
            defaultOpen={false}
            headline={{
              label: `Vaste lasten · ${maandLabel}`,
              spentTxt: eur(budTotaalActual),
              budgetTxt: `van ${eur(budTotaalBudget)}`,
              remTxt: budOver
                ? `${eur(budTotaalActual - budTotaalBudget)} te veel`
                : `${eur(budTotaalBudget - budTotaalActual)} resterend`,
              barPct: budTotaalBudget > 0 ? (budTotaalActual / budTotaalBudget) * 100 : 0,
              barColor: budOver ? "#C4633B" : "#5C7F55",
              spentC: budOver ? "var(--color-danger)" : "var(--color-ink)",
              remC: budOver ? "var(--color-danger)" : "var(--color-ink-soft)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {budgetCats.map((c) => (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <div className="text-ink-soft">{c.label}</div>
                    <div className="font-semibold" style={{ color: c.over100 ? "var(--color-warning)" : "var(--color-ink-soft)" }}>
                      {eur(c.actual)} / {eur(c.budget)}
                    </div>
                  </div>
                  <div className="h-[6px] rounded-full bg-track overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, c.pct * 100)}%`,
                        background: c.over100 ? "#C4633B" : "#5C7F55",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TrackerCard>
        </div>

        {/* Incidentele projecten */}
        <div className="md:col-span-2">
          <TrackerCard
            title="Incidentele projecten"
            toggleLabel="Toon projecten"
            defaultOpen
            headline={{
              label: `${incYear === "all" ? "Alle jaren" : incYear} · besteed vs plan`,
              spentTxt: eur(incTotaalSpent),
              budgetTxt: `van ${eur(incTotaalBudget)}`,
              remTxt: incOver
                ? `${eur(incTotaalSpent - incTotaalBudget)} te veel`
                : `${eur(incTotaalBudget - incTotaalSpent)} resterend`,
              barPct: incTotaalBudget > 0 ? (incTotaalSpent / incTotaalBudget) * 100 : 0,
              barColor: incOver ? "#BC4A26" : "#5C7F55",
              spentC: incOver ? "var(--color-danger)" : "var(--color-ink)",
              remC: incOver ? "var(--color-danger)" : "var(--color-ink-soft)",
            }}
            filters={
              <div className="flex gap-1.5 flex-wrap">
                {(["all", ...projJaren] as const).map((y) => (
                  <button
                    key={y}
                    onClick={() => setIncYear(y)}
                    className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border"
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
              {incFiltered.map((p) => {
                const kleur = barCol(p.besteed, p.budget);
                const pct = p.budget > 0 ? (p.besteed / p.budget) * 100 : p.besteed > 0 ? 100 : 0;
                const rem = p.budget - p.besteed;
                return (
                  <div key={p.id} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <div className="text-ink-soft flex items-center gap-1.5">
                        {p.done && <span className="text-success">✓</span>}
                        {p.naam} <span className="text-hint">· {p.jaar}</span>
                      </div>
                      <div className="font-semibold" style={{ color: rem < 0 ? "var(--color-danger)" : "var(--color-muted)" }}>
                        {eur(p.besteed)} / {eur(p.budget)}
                      </div>
                    </div>
                    <div className="h-[6px] rounded-full bg-track overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: kleur }} />
                    </div>
                    <div className="text-[11.5px]" style={{ color: rem < 0 ? "var(--color-danger)" : "var(--color-muted)" }}>
                      {rem < 0 ? `${eur(-rem)} te veel` : `${eur(rem)} resterend`}
                    </div>
                  </div>
                );
              })}
            </div>
          </TrackerCard>
        </div>

        {/* Jaarlijks terugkerend */}
        <div className="md:col-span-2">
          <TrackerCard
            title="Jaarlijks terugkerend"
            toggleLabel="Toon posten"
            defaultOpen={false}
            headline={
              yrIsBudget
                ? {
                    label: "Totaal per jaar",
                    spentTxt: eur(yrTotaalBudget),
                    budgetTxt: "per jaar",
                    remTxt: "",
                    barPct: 100,
                    barColor: "#5C7F55",
                  }
                : {
                    label: "Besteed in 2026",
                    spentTxt: eur(yrTotaalSpent),
                    budgetTxt: `van ${eur(yrTotaalBudget)}`,
                    remTxt: `${eur(yrTotaalBudget - yrTotaalSpent)} resterend`,
                    barPct: yrTotaalBudget > 0 ? (yrTotaalSpent / yrTotaalBudget) * 100 : 0,
                    barColor: "#5C7F55",
                  }
            }
            filters={
              <div className="flex gap-1.5">
                {([{ key: "all" as const, label: "Alle" }, { key: 2026 as const, label: "2026" }]).map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setYrYear(o.key)}
                    className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border"
                    style={{
                      background: yrYear === o.key ? "var(--color-ink)" : "var(--color-card)",
                      color: yrYear === o.key ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                      borderColor: yrYear === o.key ? "var(--color-ink)" : "var(--color-input-border)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jaarlijks.map((j) => {
                const over = !yrIsBudget && j.besteed2026 > j.budgetJaarlijks;
                return (
                  <div key={j.id} className="flex items-baseline justify-between text-[13px] py-1">
                    <div className="text-ink-soft">{j.naam}</div>
                    <div className="font-semibold" style={{ color: over ? "#B0512C" : "var(--color-ink-soft)" }}>
                      {yrIsBudget ? eur(j.budgetJaarlijks) : `${eur(j.besteed2026)} / ${eur(j.budgetJaarlijks)}`}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-baseline justify-between text-[13.5px] py-1 font-bold md:col-span-2 border-t border-divider pt-2 mt-1">
                <div>{yrIsBudget ? "Totaal per jaar" : "Besteed in 2026"}</div>
                <div>{yrIsBudget ? eur(yrTotaalBudget) : eur(yrTotaalSpent)}</div>
              </div>
            </div>
          </TrackerCard>
        </div>

        {/* Desktop-only: CSV import, triage, advanced */}
        <div className="hidden md:flex md:col-span-2 flex-col gap-4">
          <Card className="p-5 border-dashed border-[1.5px] flex flex-col items-center justify-center gap-2 text-center">
            <div className="text-[14px] font-semibold">Sleep je CSV hierheen, of kies een bestand</div>
            <div className="text-[12.5px] text-muted">ASN / bank-export</div>
            <div className="text-[11.5px] text-hint mt-1 max-w-[520px]">
              Importeren, transactie-triage en bewerken kunnen alleen op de webversie. Op mobiel is dit scherm
              alleen-lezen.
            </div>
          </Card>

          <Card className="p-4.5">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label mb-3">Transactie-triage</div>
            <TriageTable transacties={transacties} projecten={projecten} jaarlijks={jaarlijks} />
          </Card>

          <AdvancedMenu />
        </div>
      </div>

      <ChatWidget netWorth={netWorth} mjp={mjp} projecten={projecten} jaarlijks={jaarlijks} categorieen={categorieen} />
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-1"
      style={{
        background: warn ? "#F5E8CB" : "var(--color-card)",
        border: `1px solid ${warn ? "#E7D3A0" : "var(--color-card-border)"}`,
      }}
    >
      <div className="text-[11.5px] font-semibold" style={{ color: warn ? "#A9761C" : "var(--color-muted)" }}>
        {label}
      </div>
      <div className="text-[19px] font-bold" style={{ color: warn ? "#8A5E14" : "var(--color-ink)" }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] font-medium" style={{ color: warn ? "#A9761C" : "var(--color-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function NetWorthRow({
  label,
  value,
  dotColor,
  editable,
  isEditing,
  onEdit,
  editVal,
  onEditVal,
  onSave,
}: {
  label: string;
  value: number;
  dotColor: string;
  editable?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  editVal?: string;
  onEditVal?: (v: string) => void;
  onSave?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13.5px]">
      <div className="flex items-center gap-2 text-ink-soft">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        {label}
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={editVal}
            onChange={(e) => onEditVal?.(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave?.()}
            className="w-24 px-2 py-1 rounded-lg border border-input-border text-right text-[13px]"
          />
          <button onClick={onSave} className="text-[12px] font-semibold text-accent">
            Opslaan
          </button>
        </div>
      ) : (
        <button
          className="font-semibold flex items-center gap-1.5 hidden md:flex"
          onClick={editable ? onEdit : undefined}
          disabled={!editable}
        >
          {eur(value)}
          {editable && <span className="text-hint text-[11px]">✎</span>}
        </button>
      )}
      {!isEditing && <div className="font-semibold md:hidden">{eur(value)}</div>}
    </div>
  );
}

function CashRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <div className="text-ink-soft">{label}</div>
      <div className="font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function AdvancedMenu() {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <Card className="p-4.5 flex flex-col gap-3" style={{ background: "#FBF1E8", borderColor: "#EAD9C4" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">Geavanceerd</div>
        <ChevronLeftIcon size={13} style={{ transform: open ? "rotate(90deg)" : "rotate(-90deg)" }} />
      </button>
      {open && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[12px] text-muted">Deze acties wissen data en zijn onomkeerbaar. Alleen op web.</div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Weet je zeker dat je alle transactie-classificaties wilt resetten?")) {
                startTransition(() => resetTriage());
              }
            }}
            className="px-4 py-2.5 rounded-full border border-input-border text-[13px] font-semibold text-ink-soft"
          >
            Reset triage
          </button>
        </div>
      )}
    </Card>
  );
}
