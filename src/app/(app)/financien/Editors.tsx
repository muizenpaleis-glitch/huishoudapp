"use client";

import { useTransition } from "react";
import type { Settings } from "@/lib/finance/engine";
import type { ProjectRow, YearlyRow } from "@/lib/finance/load";
import {
  updateSettings,
  updateProject,
  addProject,
  deleteProject,
  updateYearly,
  addYearly,
  deleteYearly,
  type SettingsPatch,
} from "./actions";

function NumField({
  label,
  value,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-muted">{label}</span>
      <input
        type="number"
        step={step ?? 1}
        defaultValue={value}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (isFinite(v) && v !== value) onCommit(v);
        }}
        className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13.5px]"
      />
    </label>
  );
}

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [, start] = useTransition();
  const commit = (patch: SettingsPatch) => start(() => updateSettings(patch));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Startpositie 2026 (€)" value={settings.startNetWorth} step={100} onCommit={(v) => commit({ startNetWorth: v })} />
        <NumField label="Rendement op buffer (%/jr)" value={settings.returnRate} step={0.1} onCommit={(v) => commit({ returnRate: v })} />
        <NumField label="Horizon (jaren)" value={settings.horizon} step={1} onCommit={(v) => commit({ horizon: Math.min(30, Math.max(5, Math.round(v))) })} />
        <NumField label="Spaargroei na 2031 (%/jr)" value={settings.savingsGrowth} step={0.1} onCommit={(v) => commit({ savingsGrowth: v })} />
        <NumField label="Maandbudget uitgaven (€)" value={settings.monthlyBudget} step={1} onCommit={(v) => commit({ monthlyBudget: v })} />
        <NumField label="Incidenteel-drempel (€)" value={settings.threshold} step={10} onCommit={(v) => commit({ threshold: v })} />
        <NumField label="Spaar-incidenteel drempel (€)" value={settings.savingsIncidentalThreshold} step={50} onCommit={(v) => commit({ savingsIncidentalThreshold: v })} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] text-muted">Spaarrekening IBAN(s) — komma-gescheiden</span>
        <input
          defaultValue={settings.savingsAccounts.join(", ")}
          onBlur={(e) => commit({ savingsAccounts: e.target.value.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean) })}
          className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[12.5px] font-mono"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] text-muted">Beleggingsrekening IBAN(s) — komma-gescheiden</span>
        <input
          defaultValue={settings.investmentAccounts.join(", ")}
          onBlur={(e) => commit({ investmentAccounts: e.target.value.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean) })}
          className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[12.5px] font-mono"
        />
      </label>
      <p className="text-[11.5px] text-muted leading-relaxed">
        Gecorrigeerd MJP-model: NW<sub>j</sub> = NW<sub>j−1</sub>·(1+r) + operationeel resultaat − toekomstige
        vermogens (€11,3–11,5k/jr) − geplande incidentelen, startend vanaf €34.079. Geladen maanden vervangen het
        budget voor hun eigen jaar; projectuitgaven worden afgeboekt wanneer ze plaatsvinden.
      </p>
    </div>
  );
}

export function ProjectEditor({ projects }: { projects: ProjectRow[] }) {
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {projects.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <input
            defaultValue={p.name}
            onBlur={(e) => e.target.value !== p.name && start(() => updateProject(p.id, { naam: e.target.value }))}
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
          />
          <input
            type="number"
            step={50}
            defaultValue={p.budget}
            onBlur={(e) => parseFloat(e.target.value) !== p.budget && start(() => updateProject(p.id, { budget: parseFloat(e.target.value) || 0 }))}
            className="w-24 px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
          />
          <input
            type="number"
            step={1}
            defaultValue={p.year}
            onBlur={(e) => parseInt(e.target.value, 10) !== p.year && start(() => updateProject(p.id, { jaar: parseInt(e.target.value, 10) || 2026 }))}
            className="w-16 px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
          />
          <label className="flex items-center gap-1 text-[11px] text-muted">
            <input
              type="checkbox"
              defaultChecked={p.done}
              onChange={(e) => start(() => updateProject(p.id, { done: e.target.checked }))}
            />
            klaar
          </label>
          <button
            onClick={() => start(() => deleteProject(p.id))}
            className="w-7 h-7 rounded-full text-danger shrink-0"
            title="Verwijder"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => start(() => addProject())}
        className="self-start mt-1 px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft"
      >
        + Project toevoegen
      </button>
    </div>
  );
}

export function YearlyEditor({ yearly }: { yearly: YearlyRow[] }) {
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {yearly.map((y) => (
        <div key={y.id} className="flex items-center gap-2">
          <input
            defaultValue={y.name}
            onBlur={(e) => e.target.value !== y.name && start(() => updateYearly(y.id, { naam: e.target.value }))}
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
          />
          <input
            type="number"
            step={50}
            defaultValue={y.budget}
            onBlur={(e) => parseFloat(e.target.value) !== y.budget && start(() => updateYearly(y.id, { budget: parseFloat(e.target.value) || 0 }))}
            className="w-24 px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
          />
          <button
            onClick={() => start(() => deleteYearly(y.id))}
            className="w-7 h-7 rounded-full text-danger shrink-0"
            title="Verwijder"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => start(() => addYearly())}
        className="self-start mt-1 px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft"
      >
        + Jaarpost toevoegen
      </button>
    </div>
  );
}
