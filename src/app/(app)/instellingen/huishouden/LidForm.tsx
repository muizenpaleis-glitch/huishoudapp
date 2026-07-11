"use client";

import { useState, useTransition } from "react";
import { BackButton, PrimaryButton } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { useActiveMember } from "@/components/ActiveMemberContext";
import { saveLid, deleteLid } from "../actions";
import type { HouseholdMember } from "@/generated/prisma/client";

const KLEUREN = ["#C4633B", "#5C7F55", "#6C5B8C", "#A9761C", "#2F6E8F"];

export function LidForm({
  member,
  canDelete,
  defaultKleur,
}: {
  member?: HouseholdMember;
  canDelete: boolean;
  defaultKleur: string;
}) {
  const { activeMemberId, setActiveMemberId } = useActiveMember();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [naam, setNaam] = useState(member?.naam ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [kleur, setKleur] = useState(member?.kleur ?? defaultKleur);

  const isActief = !!member && activeMemberId === member.id;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await saveLid(member?.id ?? null, { naam, email, kleur });
    });
  }

  function onDelete() {
    if (!member) return;
    startTransition(async () => {
      await deleteLid(member.id);
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <form onSubmit={onSubmit} className="max-w-[640px] mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <BackButton href="/instellingen/huishouden" />
          <div className="text-[21px] font-bold tracking-tight">
            {member ? "Lid bewerken" : "Lid toevoegen"}
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className="w-[84px] h-[84px] rounded-full flex items-center justify-center text-3xl font-bold text-accent-ink"
            style={{ background: kleur }}
          >
            {naam.trim() ? naam.trim()[0].toUpperCase() : "?"}
          </div>
        </div>

        <div className="flex justify-center gap-2.5">
          {KLEUREN.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKleur(k)}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
              style={{
                background: k,
                boxShadow: kleur === k ? `0 0 0 3px var(--color-cream), 0 0 0 5px ${k}` : undefined,
              }}
            >
              {kleur === k && <CheckIcon size={15} className="text-accent-ink" />}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3.5">
          <Field label="Naam">
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Bijv. Iris"
              className="input"
            />
          </Field>
          <Field
            label={
              <>
                E-mail <span className="font-normal text-hint">(voor notificaties, optioneel)</span>
              </>
            }
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              className="input"
            />
          </Field>

          {member && (
            <div className="bg-card border border-card-border rounded-[18px] p-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[14.5px] font-semibold">Dit ben ik op dit toestel</div>
                {isActief ? (
                  <div className="text-[12.5px] font-semibold mt-0.5 text-success">
                    Actief — jij op deze telefoon
                  </div>
                ) : (
                  <div className="text-[12.5px] text-muted mt-0.5">
                    Bepaalt de standaard van &ldquo;mijn to-do&apos;s&rdquo;. Alleen op deze telefoon.
                  </div>
                )}
              </div>
              {isActief ? (
                <span
                  role="switch"
                  aria-checked
                  className="w-[46px] h-7 rounded-full p-[3px] shrink-0 inline-block bg-success"
                >
                  <div className="w-[22px] h-[22px] rounded-full bg-card shadow" style={{ transform: "translateX(18px)" }} />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveMemberId(member.id)}
                  className="w-[46px] h-7 rounded-full p-[3px] shrink-0 bg-toggle-off"
                >
                  <div className="w-[22px] h-[22px] rounded-full bg-card shadow" />
                </button>
              )}
            </div>
          )}

          {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

          <PrimaryButton type="submit" className="mt-1 w-full" disabled={pending}>
            {member ? "Wijzigingen opslaan" : "Lid toevoegen"}
          </PrimaryButton>

          {member && canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-center text-[13.5px] font-semibold text-danger py-2"
            >
              {member.naam} verwijderen
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

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
