"use client";

import { useState, useTransition } from "react";
import { eur } from "@/lib/financien";
import type { Transactie, IncidenteelProject, JaarlijksItem } from "@/lib/financien";
import { reclassifyTransaction, assignTransactionProject } from "./actions";
import type { TransactieKlasse } from "@/generated/prisma/client";

const KLASSEN: { key: TransactieKlasse; label: string }[] = [
  { key: "recurring", label: "Vast" },
  { key: "yearly", label: "Jaarlijks" },
  { key: "incidental", label: "Incidenteel" },
  { key: "exclude", label: "Negeer" },
];

const FILTERS: { key: "all" | TransactieKlasse; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "recurring", label: "Vast" },
  { key: "yearly", label: "Jaarlijks" },
  { key: "incidental", label: "Incidenteel" },
  { key: "exclude", label: "Genegeerd" },
];

export function TriageTable({
  transacties,
  projecten,
  jaarlijks,
}: {
  transacties: Transactie[];
  projecten: IncidenteelProject[];
  jaarlijks: JaarlijksItem[];
}) {
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | TransactieKlasse>("all");

  const gefilterd = transacties.filter((t) => filter === "all" || t.klasse === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border"
              style={{
                background: filter === f.key ? "var(--color-ink)" : "var(--color-card)",
                color: filter === f.key ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: filter === f.key ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-[12.5px] text-muted">
          {gefilterd.length} van {transacties.length} transacties
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px] flex flex-col">
          <div
            className="grid gap-2 px-2 pb-2 text-[11.5px] font-bold uppercase tracking-wide text-label border-b border-divider"
            style={{ gridTemplateColumns: "72px 1.6fr 130px 100px 272px 150px" }}
          >
            <div>Datum</div>
            <div>Omschrijving</div>
            <div>Bankcategorie</div>
            <div>Bedrag</div>
            <div>Classificatie</div>
            <div>Project / jaarpost</div>
          </div>
          {gefilterd.map((t) => {
            const toewijsbaar = t.klasse === "incidental" || t.klasse === "yearly";
            const opties = t.klasse === "yearly" ? jaarlijks : projecten;
            const huidigId = t.klasse === "yearly" ? t.jaarlijksItemId : t.projectId;
            return (
              <div
                key={t.id}
                className="grid gap-2 px-2 py-3 items-center border-b border-divider text-[13px]"
                style={{ gridTemplateColumns: "72px 1.6fr 130px 100px 272px 150px" }}
              >
                <div className="text-muted text-[12.5px]">
                  {new Date(t.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.naam}</div>
                  <div className="text-[11.5px] text-muted truncate">{t.omschrijving}</div>
                </div>
                <div className="text-[12.5px] text-ink-soft truncate">{t.bankCategorie}</div>
                <div className="font-semibold" style={{ color: t.bedrag < 0 ? "#B0512C" : "#3F6B3A" }}>
                  {eur(t.bedrag, true)}
                </div>
                <div className="flex gap-1">
                  {KLASSEN.map((k) => (
                    <button
                      key={k.key}
                      onClick={() => startTransition(() => reclassifyTransaction(t.id, k.key))}
                      className="px-2 py-1 rounded-full text-[10.5px] font-semibold border"
                      style={{
                        background: t.klasse === k.key ? "var(--color-ink)" : "var(--color-card)",
                        color: t.klasse === k.key ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                        borderColor: t.klasse === k.key ? "var(--color-ink)" : "var(--color-input-border)",
                      }}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <select
                  disabled={!toewijsbaar}
                  value={huidigId ?? ""}
                  onChange={(e) => startTransition(() => assignTransactionProject(t.id, t.klasse, e.target.value))}
                  className="px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px] disabled:opacity-45"
                >
                  <option value="">{toewijsbaar ? "Kies…" : "—"}</option>
                  {opties.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.naam}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
