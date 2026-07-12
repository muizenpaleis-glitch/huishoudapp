"use client";

import { useState, useTransition } from "react";
import { LID_KLEUREN } from "@/lib/colors";
import { quickAddLid } from "@/app/(app)/instellingen/actions";
import type { Member } from "@/lib/members";
import { PlusIcon, CheckIcon } from "@/components/icons";

export function QuickAddMember({
  existingCount,
  onCreated,
}: {
  existingCount: number;
  onCreated: (member: Member) => void;
}) {
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState("");
  const [kleur, setKleur] = useState(LID_KLEUREN[existingCount % LID_KLEUREN.length]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border border-dashed border-input-border text-ink-soft"
      >
        <PlusIcon size={14} className="text-accent" />
        <span className="text-[13px] font-semibold">Nieuw lid</span>
      </button>
    );
  }

  function save() {
    if (!naam.trim()) {
      setError("Geef een naam op.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const member = await quickAddLid({ naam, email: "", kleur });
      onCreated(member);
      setOpen(false);
      setNaam("");
    });
  }

  return (
    <div className="w-full bg-cream border border-card-border rounded-2xl p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Naam nieuw lid"
          autoFocus
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-input-border bg-card text-[13.5px] outline-none"
        />
        <div className="flex gap-1.5 shrink-0">
          {LID_KLEUREN.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKleur(k)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: k,
                boxShadow: kleur === k ? `0 0 0 2px var(--color-cream), 0 0 0 3.5px ${k}` : undefined,
              }}
            >
              {kleur === k && <CheckIcon size={11} className="text-accent-ink" />}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="text-[12px] text-danger font-semibold">{error}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold text-ink-soft"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex-1 px-3.5 py-2 rounded-full bg-accent text-accent-ink text-[12.5px] font-semibold disabled:opacity-50"
        >
          {pending ? "Bezig…" : "Toevoegen"}
        </button>
      </div>
    </div>
  );
}
