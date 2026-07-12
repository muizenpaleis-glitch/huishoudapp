"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, Toggle, PrimaryButton, Avatar } from "@/components/ui";
import { CONTRACT_CATEGORIEEN } from "@/lib/contracten";
import { toDateInputValue, fmtKort } from "@/lib/format";
import { saveContract, deleteContract, type ContractFormValues } from "./actions";
import { FileUpload } from "@/components/FileUpload";
import { QuickAddMember } from "@/components/QuickAddMember";
import type { Contract, ContractStatus } from "@/generated/prisma/client";
import type { Member } from "@/lib/members";

const STATUSSEN: ContractStatus[] = ["Actief", "Opgezegd", "Verlopen"];

export function ContractForm({ contract, members }: { contract?: Contract; members: Member[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState(members);

  const [naam, setNaam] = useState(contract?.naam ?? "");
  const [leverancier, setLeverancier] = useState(contract?.leverancier ?? "");
  const [categorie, setCategorie] = useState(contract?.categorie ?? "Energie");
  const [startdatum, setStartdatum] = useState(toDateInputValue(contract?.startdatum));
  const [einddatum, setEinddatum] = useState(toDateInputValue(contract?.einddatum));
  const [opzegType, setOpzegType] = useState(contract?.opzegType ?? "periode");
  const [opzegMaanden, setOpzegMaanden] = useState(contract?.opzegMaanden ?? 1);
  const [opzegDatum, setOpzegDatum] = useState(toDateInputValue(contract?.opzegDatum));
  const [autoRenewal, setAutoRenewal] = useState(contract?.autoRenewal ?? true);
  const [status, setStatus] = useState(contract?.status ?? "Actief");
  const [docNaam, setDocNaam] = useState(contract?.docNaam ?? "");
  const [docUrl, setDocUrl] = useState(contract?.docUrl ?? "");
  const [notitie, setNotitie] = useState(contract?.notitie ?? "");
  const [beheerderId, setBeheerderId] = useState(contract?.beheerderId ?? "");

  const backHref = contract ? `/contracten/${contract.id}` : "/contracten";

  let opzegPreview = "";
  if (opzegType === "periode" && einddatum) {
    const d = new Date(einddatum);
    d.setMonth(d.getMonth() - opzegMaanden);
    opzegPreview = `Uiterste opzegdatum wordt ${fmtKort(d)}`;
  } else if (opzegType === "datum" && opzegDatum) {
    opzegPreview = `Uiterste opzegdatum wordt ${fmtKort(new Date(opzegDatum))}`;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam || !einddatum) {
      setError("Naam en einddatum zijn verplicht.");
      return;
    }
    setError(null);
    const values: ContractFormValues = {
      naam, leverancier, categorie, startdatum, einddatum,
      opzegType, opzegMaanden, opzegDatum, autoRenewal, status,
      docNaam, docUrl, notitie, beheerderId,
    };
    startTransition(async () => {
      await saveContract(contract?.id ?? null, values);
    });
  }

  function onDelete() {
    if (!contract) return;
    if (!confirm(`Weet je zeker dat je "${contract.naam}" wilt verwijderen?`)) return;
    startTransition(async () => {
      await deleteContract(contract.id);
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <form onSubmit={onSubmit} className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href={backHref} />
          <div className="text-[21px] font-bold tracking-tight">
            {contract ? "Contract bewerken" : "Nieuw contract"}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <Field label="Naam contract">
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Bijv. Energiecontract"
              className="input"
            />
          </Field>
          <Field label="Leverancier">
            <input
              value={leverancier}
              onChange={(e) => setLeverancier(e.target.value)}
              placeholder="Bijv. Vattenfall"
              className="input"
            />
          </Field>

          <Field label="Categorie">
            <div className="flex gap-1.5 flex-wrap">
              {CONTRACT_CATEGORIEEN.map((c) => (
                <Pill key={c} active={categorie === c} onClick={() => setCategorie(c)}>
                  {c}
                </Pill>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Startdatum (optioneel)">
              <input type="date" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} className="input" />
            </Field>
            <Field label="Einddatum">
              <input type="date" value={einddatum} onChange={(e) => setEinddatum(e.target.value)} className="input" />
            </Field>
          </div>

          <div className="bg-card border border-card-border rounded-[18px] p-3.5 flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-ink-soft">Opzegtermijn</label>
            <div className="flex bg-track rounded-full p-[3px]">
              <button
                type="button"
                onClick={() => setOpzegType("periode")}
                className="flex-1 text-center py-2 rounded-full text-[13px] font-semibold"
                style={{
                  background: opzegType === "periode" ? "var(--color-card)" : "transparent",
                  color: opzegType === "periode" ? "var(--color-ink)" : "var(--color-muted)",
                }}
              >
                Periode vóór einddatum
              </button>
              <button
                type="button"
                onClick={() => setOpzegType("datum")}
                className="flex-1 text-center py-2 rounded-full text-[13px] font-semibold"
                style={{
                  background: opzegType === "datum" ? "var(--color-card)" : "transparent",
                  color: opzegType === "datum" ? "var(--color-ink)" : "var(--color-muted)",
                }}
              >
                Vaste uiterste datum
              </button>
            </div>
            {opzegType === "periode" ? (
              <div className="flex gap-1.5">
                {[1, 2, 3].map((m) => (
                  <Pill key={m} active={opzegMaanden === m} onClick={() => setOpzegMaanden(m)}>
                    {m} {m === 1 ? "maand" : "maanden"}
                  </Pill>
                ))}
              </div>
            ) : (
              <input type="date" value={opzegDatum} onChange={(e) => setOpzegDatum(e.target.value)} className="input" />
            )}
            {opzegPreview && <div className="text-[13px] text-accent font-semibold">{opzegPreview}</div>}
          </div>

          <button
            type="button"
            onClick={() => setAutoRenewal((v) => !v)}
            className="bg-card border border-card-border rounded-[18px] p-3.5 flex items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="text-[14.5px] font-semibold">Verlengt automatisch</div>
              <div className="text-[12.5px] text-muted mt-0.5">
                {autoRenewal ? "Contract verlengt als je niet opzegt" : "Contract loopt vanzelf af op de einddatum"}
              </div>
            </div>
            <Toggle on={autoRenewal} />
          </button>

          <Field label="Status">
            <div className="flex gap-1.5">
              {STATUSSEN.map((s) => (
                <Pill key={s} active={status === s} onClick={() => setStatus(s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </Field>

          <Field label="Beheerder (optioneel)">
            <div className="flex gap-1.5 flex-wrap items-center">
              {memberList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setBeheerderId(beheerderId === m.id ? "" : m.id)}
                  className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border"
                  style={{
                    background: beheerderId === m.id ? "var(--color-ink)" : "var(--color-card)",
                    color: beheerderId === m.id ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                    borderColor: beheerderId === m.id ? "var(--color-ink)" : "var(--color-input-border)",
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
                  setBeheerderId(m.id);
                }}
              />
            </div>
          </Field>

          <Field label="Document">
            <FileUpload naam={docNaam} url={docUrl} onChange={(n, u) => { setDocNaam(n); setDocUrl(u); }} />
          </Field>

          <Field label="Notitie (optioneel)">
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Vrije aantekening bij dit contract…"
              rows={3}
              className="input resize-none"
            />
          </Field>

          {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

          <PrimaryButton type="submit" className="mt-1.5 w-full" disabled={pending}>
            {contract ? "Wijzigingen opslaan" : "Contract toevoegen"}
          </PrimaryButton>

          {contract && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="text-center text-[13.5px] font-semibold text-danger py-2"
            >
              Contract verwijderen
            </button>
          )}
        </div>
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
