"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, PrimaryButton, Avatar } from "@/components/ui";
import { ONDERHOUD_CATEGORIEEN, PRIORITEITEN } from "@/lib/onderhoud";
import { createOnderhoudItem, updateOnderhoudItem, type OnderhoudFormValues } from "../actions";
import { FileUpload } from "@/components/FileUpload";
import { QuickAddMember } from "@/components/QuickAddMember";
import type { Member } from "@/lib/members";
import type { OnderhoudCategorie, OnderhoudItem, OnderhoudPrioriteit, OnderhoudType } from "@/generated/prisma/client";

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function OnderhoudForm({ members, item }: { members: Member[]; item?: OnderhoudItem }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState(members);
  const [type] = useState<OnderhoudType>(item?.type ?? "taak");
  const [naam, setNaam] = useState(item?.naam ?? "");
  const [categorie, setCategorie] = useState<OnderhoudCategorie>(item?.categorie ?? "Huis");
  const [prio, setPrio] = useState<OnderhoudPrioriteit>(item?.prio ?? "Gemiddeld");
  const [intervalMaanden, setIntervalMaanden] = useState(item?.intervalMaanden ?? 12);
  const [volgende, setVolgende] = useState(toDateInputValue(item?.volgende));
  const [streefdatum, setStreefdatum] = useState(toDateInputValue(item?.streefdatum));
  const [toegewezenId, setToegewezenId] = useState(item?.toegewezenId ?? "");
  const [doc, setDoc] = useState(item?.doc ?? "");
  const [docUrl, setDocUrl] = useState(item?.docUrl ?? "");
  const [notitie, setNotitie] = useState(item?.notitie ?? "");

  const backHref = item ? `/onderhoud/${item.id}` : "/onderhoud";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setError(null);
    const values: OnderhoudFormValues = {
      type, naam, categorie, prio, intervalMaanden, volgende, streefdatum, toegewezenId,
      doc, docUrl, notitie,
    };
    startTransition(async () => {
      if (item) {
        await updateOnderhoudItem(item.id, values);
      } else {
        await createOnderhoudItem(values);
      }
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <form onSubmit={onSubmit} className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href={backHref} />
          <div className="text-[21px] font-bold tracking-tight">{item ? "Item bewerken" : "Nieuw item"}</div>
        </div>

        {!item && (
          <Field label="Type">
            <div className="flex bg-track rounded-full p-[3px]">
              {(["taak", "periodiek"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled
                  className="flex-1 text-center py-2 rounded-full text-[13px] font-semibold opacity-40"
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
        )}

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
              <div className="flex gap-1.5 flex-wrap items-center">
                {memberList.map((m) => (
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
                <QuickAddMember
                  existingCount={memberList.length}
                  onCreated={(m) => {
                    setMemberList((prev) => [...prev, m]);
                    setToegewezenId(m.id);
                  }}
                />
              </div>
            </Field>
          </>
        )}

        <Field label="Document (handleiding, garantiebewijs, bonnetje)">
          <FileUpload
            naam={doc}
            url={docUrl}
            onChange={(n, u) => { setDoc(n); setDocUrl(u); }}
            cameraCapture
          />
        </Field>

        <Field label="Notitie (optioneel)">
          <textarea
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            placeholder="Vrije aantekening bij dit item…"
            rows={3}
            className="input resize-none"
          />
        </Field>

        {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

        <PrimaryButton type="submit" className="mt-1 w-full" disabled={pending}>
          {item ? "Wijzigingen opslaan" : "Toevoegen"}
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
