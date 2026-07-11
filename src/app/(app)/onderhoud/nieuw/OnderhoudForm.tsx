"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, PrimaryButton, Avatar } from "@/components/ui";
import { ONDERHOUD_CATEGORIEEN, PRIORITEITEN } from "@/lib/onderhoud";
import { createOnderhoudItem, type OnderhoudFormValues } from "../actions";
import type { Member } from "@/lib/members";
import type { OnderhoudCategorie, OnderhoudPrioriteit, OnderhoudType } from "@/generated/prisma/client";

export function OnderhoudForm({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<OnderhoudType>("taak");
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState<OnderhoudCategorie>("Huis");
  const [prio, setPrio] = useState<OnderhoudPrioriteit>("Gemiddeld");
  const [intervalMaanden, setIntervalMaanden] = useState(12);
  const [volgende, setVolgende] = useState("");
  const [streefdatum, setStreefdatum] = useState("");
  const [toegewezenId, setToegewezenId] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setError(null);
    const values: OnderhoudFormValues = {
      type, naam, categorie, prio, intervalMaanden, volgende, streefdatum, toegewezenId,
    };
    startTransition(async () => {
      await createOnderhoudItem(values);
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <form onSubmit={onSubmit} className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href="/onderhoud" />
          <div className="text-[21px] font-bold tracking-tight">Nieuw item</div>
        </div>

        <Field label="Type">
          <div className="flex bg-track rounded-full p-[3px]">
            {(["taak", "periodiek"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="flex-1 text-center py-2 rounded-full text-[13px] font-semibold"
                style={{
                  background: type === t ? "var(--color-card)" : "transparent",
                  color: type === t ? "var(--color-ink)" : "var(--color-muted)",
                }}
              >
                {t === "taak" ? "Losse taak" : "Periodiek onderhoud"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Naam">
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder={type === "taak" ? "Bijv. Dakgoot schoonmaken" : "Bijv. CV-ketel onderhoud"}
            className="input"
          />
        </Field>

        <Field label="Categorie">
          <div className="flex gap-1.5 flex-wrap">
            {ONDERHOUD_CATEGORIEEN.map((c) => (
              <Pill key={c} active={categorie === c} onClick={() => setCategorie(c)}>
                {c}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Prioriteit">
          <div className="flex gap-1.5">
            {PRIORITEITEN.map((p) => (
              <Pill key={p} active={prio === p} onClick={() => setPrio(p)}>
                {p}
              </Pill>
            ))}
          </div>
        </Field>

        {type === "periodiek" ? (
          <>
            <Field label="Interval (maanden)">
              <input
                type="number"
                min={1}
                max={60}
                value={intervalMaanden}
                onChange={(e) => setIntervalMaanden(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Eerstvolgende datum">
              <input type="date" value={volgende} onChange={(e) => setVolgende(e.target.value)} className="input" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Streefdatum (optioneel)">
              <input
                type="date"
                value={streefdatum}
                onChange={(e) => setStreefdatum(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Toegewezen aan (optioneel)">
              <div className="flex gap-1.5 flex-wrap">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setToegewezenId(toegewezenId === m.id ? "" : m.id)}
                    className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border"
                    style={{
                      background: toegewezenId === m.id ? "var(--color-ink)" : "var(--color-card)",
                      color: toegewezenId === m.id ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                      borderColor: toegewezenId === m.id ? "var(--color-ink)" : "var(--color-input-border)",
                    }}
                  >
                    <Avatar naam={m.naam} kleur={m.kleur} size={22} />
                    <span className="text-[13px] font-semibold">{m.naam}</span>
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

        <PrimaryButton type="submit" className="mt-1 w-full" disabled={pending}>
          Toevoegen
        </PrimaryButton>
      </form>
      <style jsx global>{`
        .input {
          padding: 13px 15px;
          border-radius: 15px;
          border: 1px solid var(--color-input-border);
          background: var(--color-card);
          font-size: 14.5px;
          color: var(--color-ink);
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
