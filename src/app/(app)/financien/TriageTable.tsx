"use client";

import { useMemo, useState, useTransition } from "react";
import { fmtEUR } from "@/lib/finance/format";
import {
  effective,
  guessProject,
  guessYearly,
  DEFAULT_CATEGORY_BUDGETS,
  type Tx,
  type Overrides,
  type Override,
  type Settings,
  type ClassName,
  type Project,
  type Yearly,
} from "@/lib/finance/engine";
import { saveOverride } from "./actions";

const CLASSES: { key: ClassName; label: string }[] = [
  { key: "recurring", label: "Maandelijks" },
  { key: "yearly", label: "Jaarlijks" },
  { key: "incidental", label: "Incidenteel" },
  { key: "exclude", label: "Overboeking" },
];

export function TriageTable({
  transactions,
  alleTransacties,
  periodeLabel,
  overrides,
  settings,
  investIbans,
  projects,
  yearly,
  postFilter,
  catFilter,
  filterJaar,
}: {
  /** The rows to triage — already narrowed by the dashboard's period filter. */
  transactions: Tx[];
  /** Every transaction regardless of period, so the category dropdown keeps
   *  offering categories that only occur outside the selected period. */
  alleTransacties: Tx[];
  periodeLabel?: string;
  overrides: Overrides;
  settings: Settings;
  investIbans: Set<string>;
  projects: Project[];
  yearly: Yearly[];
  postFilter?: string;
  catFilter?: string;
  filterJaar?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | ClassName>(postFilter ? "yearly" : "all");
  // Deep link from Budgetteren: narrow to one yearly post or one category so
  // the click lands on the transactions the figure is made of.
  const [post, setPost] = useState<string | null>(postFilter ?? null);
  const [cat, setCat] = useState<string | null>(catFilter ?? null);
  const [search, setSearch] = useState("");
  type SortKey = "datum" | "omschrijving" | "bedrag" | null;
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function onSort(key: Exclude<SortKey, null>) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "omschrijving" ? "asc" : "desc");
    }
  }

  const rows = useMemo(() => {
    let list = transactions.map((t) => ({ t, e: effective(t, overrides, settings, investIbans) }));
    if (filter !== "all") list = list.filter((r) => r.e.cls === filter);
    if (post) list = list.filter((r) => r.e.project === post);
    if (cat) list = list.filter((r) => r.e.bankCat === cat);
    if ((post || cat) && filterJaar != null) {
      list = list.filter((r) => parseInt(r.t.date.slice(0, 4), 10) === filterJaar);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => (r.t.name + " " + r.t.desc + " " + r.e.bankCat).toLowerCase().includes(q),
      );
    }
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        if (sortKey === "bedrag") return (a.t.amount - b.t.amount) * dir;
        if (sortKey === "omschrijving") {
          const an = (a.t.name || a.t.desc).toLowerCase();
          const bn = (b.t.name || b.t.desc).toLowerCase();
          return an.localeCompare(bn) * dir;
        }
        return (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : 0) * dir;
      });
    }
    return list;
  }, [transactions, overrides, settings, investIbans, filter, post, cat, filterJaar, search, sortKey, sortDir]);

  // Alle categorieën voor de dropdown: de vaste Jaarbegroting-lijst plus
  // elke categorie die al ergens in de data voorkomt (bijv. via een eerdere
  // handmatige aanpassing), zodat niets ontbreekt.
  const alleCategorieen = useMemo(() => {
    const set = new Set<string>([
      ...Object.keys(DEFAULT_CATEGORY_BUDGETS),
      ...Object.keys(settings.categoryBudgets || {}),
    ]);
    for (const t of alleTransacties) set.add(effective(t, overrides, settings, investIbans).bankCat);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [alleTransacties, overrides, settings, investIbans]);

  function save(txId: string, next: Override) {
    const cleaned: Override = {};
    if (next.cls) cleaned.cls = next.cls;
    if (next.project) cleaned.project = next.project;
    if (next.bankCat) cleaned.bankCat = next.bankCat;
    if (next.notInvestment != null) cleaned.notInvestment = next.notInvestment;
    if (next.savingsInc != null) cleaned.savingsInc = next.savingsInc;
    startTransition(() => saveOverride(txId, Object.keys(cleaned).length ? cleaned : null));
  }

  function onClass(t: Tx, cls: ClassName) {
    const cur: Override = { ...(overrides[t.id] || {}) };
    const prev = cur.cls;
    cur.cls = cls;
    if (cls === "incidental") {
      if (!cur.project || prev === "yearly") cur.project = guessProject(t);
    } else if (cls === "yearly") {
      if (!cur.project || prev === "incidental") cur.project = guessYearly(t, overrides) || yearly[0]?.name;
    }
    save(t.id, cur);
  }
  function onProject(t: Tx, project: string) {
    const cur: Override = { ...(overrides[t.id] || {}) };
    cur.project = project;
    cur.cls = cur.cls || effective(t, overrides, settings, investIbans).cls;
    save(t.id, cur);
  }
  function onBankCat(t: Tx, value: string) {
    const cur: Override = { ...(overrides[t.id] || {}) };
    if (value.trim()) cur.bankCat = value.trim();
    else delete cur.bankCat;
    save(t.id, cur);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...CLASSES.map((c) => c.key)] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold border"
              style={{
                background: filter === k ? "var(--color-ink)" : "var(--color-card)",
                color: filter === k ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: filter === k ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {k === "all" ? "Alle" : CLASSES.find((c) => c.key === k)!.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek…"
          className="px-3 py-1.5 rounded-full border border-input-border bg-card text-[12.5px] outline-none ml-auto"
        />
      </div>

      {(post || cat) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-muted">
            Gefilterd op {post ? "jaarpost" : "categorie"}:
          </span>
          <button
            onClick={() => {
              setPost(null);
              setCat(null);
              setFilter("all");
            }}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold border border-accent text-accent"
            title="Filter opheffen"
          >
            {post ?? cat}
            {filterJaar ? ` · ${filterJaar}` : ""} ✕
          </button>
        </div>
      )}

      <div className="text-[12px] text-muted">
        {rows.length} van {transactions.length} transacties
        {periodeLabel && <> · periode {periodeLabel}</>}
        {alleTransacties.length !== transactions.length && (
          <> · {alleTransacties.length} in totaal</>
        )}
        {pending && " · opslaan…"}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[720px]">
          <thead>
            <tr className="text-left text-label border-b border-divider">
              <SortTh label="Datum" sortKey="datum" active={sortKey} dir={sortDir} onSort={onSort} />
              <SortTh label="Omschrijving" sortKey="omschrijving" active={sortKey} dir={sortDir} onSort={onSort} />
              <th className="py-2 pr-3 font-semibold">Categorie</th>
              <SortTh label="Bedrag" sortKey="bedrag" active={sortKey} dir={sortDir} onSort={onSort} align="right" />
              <th className="py-2 pr-3 font-semibold">Klasse</th>
              <th className="py-2 font-semibold">Project / post</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, e }) => {
              const ddEnabled = e.cls === "incidental" || e.cls === "yearly";
              const options = (e.cls === "yearly" ? yearly.map((y) => y.name) : projects.map((p) => p.name));
              if (e.project && !options.includes(e.project)) options.unshift(e.project);
              return (
                <tr key={t.id} className="border-b border-divider/60 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted">{t.date}</td>
                  <td className="py-2 pr-3 max-w-[220px]">
                    <div className="font-medium truncate" title={t.desc}>
                      {t.name || t.desc.slice(0, 40)}
                    </div>
                    <div className="text-[11px] text-muted truncate">{t.desc.slice(0, 60)}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={e.bankCat}
                      onChange={(ev) => onBankCat(t, ev.target.value)}
                      className="w-36 px-1.5 py-1 rounded-md border border-input-border bg-card text-[11.5px]"
                    >
                      {!alleCategorieen.includes(e.bankCat) && <option value={e.bankCat}>{e.bankCat}</option>}
                      {alleCategorieen.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className="py-2 pr-3 text-right font-semibold whitespace-nowrap font-mono"
                    style={{ color: t.amount < 0 ? "#B0512C" : "#5C7F55" }}
                  >
                    {fmtEUR(t.amount)}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-1 flex-wrap">
                      {CLASSES.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => onClass(t, c.key)}
                          className="px-2 py-1 rounded-md text-[10.5px] font-semibold border"
                          style={{
                            background: e.cls === c.key ? "var(--color-ink)" : "var(--color-card)",
                            color: e.cls === c.key ? "var(--color-accent-ink)" : "var(--color-muted)",
                            borderColor: e.cls === c.key ? "var(--color-ink)" : "var(--color-input-border)",
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <select
                      value={e.project}
                      disabled={!ddEnabled}
                      onChange={(ev) => onProject(t, ev.target.value)}
                      className="px-1.5 py-1 rounded-md border border-input-border bg-card text-[11.5px] disabled:opacity-30 max-w-[160px]"
                    >
                      {!e.project && <option value="">—</option>}
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortTh({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align,
}: {
  label: string;
  sortKey: "datum" | "omschrijving" | "bedrag";
  active: "datum" | "omschrijving" | "bedrag" | null;
  dir: "asc" | "desc";
  onSort: (key: "datum" | "omschrijving" | "bedrag") => void;
  align?: "right";
}) {
  const isActive = active === sortKey;
  return (
    <th className={`py-2 pr-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}
        style={{ color: isActive ? "var(--color-ink)" : "var(--color-label)" }}
      >
        {label}
        <span className="text-[10px]" style={{ opacity: isActive ? 1 : 0.3 }}>
          {isActive && dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}
