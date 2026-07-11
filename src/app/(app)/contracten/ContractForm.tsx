"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, Toggle, PrimaryButton } from "@/components/ui";
import { CONTRACT_CATEGORIEEN } from "@/lib/contracten";
import { toDateInputValue, fmtKort } from "@/lib/format";
import { saveContract, type ContractFormValues } from "./actions";
import type { Contract, ContractStatus } from "@/generated/prisma/client";

const STATUSSEN: ContractStatus[] = ["Actief", "Opgezegd", "Verlopen"];

export function ContractForm({ contract }: { contract?: Contract }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      opzegType, opzegMaanden, opzegDatum, autoRenewal, status, docNaam,
    };
    startTransition(async () => {
      await saveContract(contract?.id ?? null, values);
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

          <Field label="Document">
            {docNaam ? (
              <div className="flex items-center gap-2.5 bg-card border border-card-border rounded-2xl px-3.5 py-3">
                <div className="flex-1 text-[13.5px] font-semibold truncate">{docNaam}</div>
                <button type="button" onClick={() => setDocNaam("")} className="text-[12.5px] font-semibold text-danger">
                  Verwijder
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setDocNaam((naam ? naam.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "contract") + ".pdf")
                }
                className="border-[1.5px] border-dashed border-input-border rounded-2xl p-5 text-center text-[13.5px] text-muted"
              >
                + Upload PDF of foto van het contract
              </button>
            )}
          </Field>

          {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

          <PrimaryButton type="submit" className="mt-1.5 w-full" disabled={pending}>
            {contract ? "Wijzigingen opslaan" : "Contract toevoegen"}
          </PrimaryButton>
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
