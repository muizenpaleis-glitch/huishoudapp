"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/icons";
import { addSubtaak } from "../actions";
import { SubtaskRow } from "../SubtaskRow";
import type { Member } from "@/lib/members";

type Subtaak = {
  id: string;
  tekst: string;
  klaar: boolean;
  toegewezen: Member | null;
};

export function SubtaskList({
  itemId,
  subtaken,
  members,
}: {
  itemId: string;
  subtaken: Subtaak[];
  members: Member[];
}) {
  const [, startTransition] = useTransition();
  const [nieuw, setNieuw] = useState("");
  const memberIds = members.map((m) => m.id);

  return (
    <div className="flex flex-col gap-2.5">
      {subtaken.map((st) => (
        <SubtaskRow
          key={st.id}
          id={st.id}
          itemId={itemId}
          tekst={st.tekst}
          klaar={st.klaar}
          toegewezenNaam={st.toegewezen?.naam ?? "?"}
          toegewezenKleur={st.toegewezen?.kleur ?? "#C9B8A4"}
          memberIds={memberIds}
        />
      ))}

      <form
        className="flex items-center gap-2 mt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nieuw.trim()) return;
          startTransition(() => addSubtaak(itemId, nieuw, members[0]?.id ?? ""));
          setNieuw("");
        }}
      >
        <input
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          placeholder="Nieuwe deeltaak…"
          className="flex-1 px-3.5 py-2.5 rounded-full border border-input-border bg-card text-[13.5px] outline-none"
        />
        <button
          type="submit"
          className="w-9 h-9 rounded-full bg-accent text-accent-ink flex items-center justify-center shrink-0"
        >
          <PlusIcon size={16} />
        </button>
      </form>
    </div>
  );
}
