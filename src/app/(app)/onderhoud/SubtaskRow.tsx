"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { toggleSubtaak, cycleSubtaakAssignee } from "./actions";

export function SubtaskRow({
  id,
  itemId,
  tekst,
  klaar,
  toegewezenNaam,
  toegewezenKleur,
  memberIds,
}: {
  id: string;
  itemId: string;
  tekst: string;
  klaar: boolean;
  toegewezenNaam: string;
  toegewezenKleur: string;
  memberIds: string[];
}) {
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => startTransition(() => toggleSubtaak(id, itemId))}
        className="w-[22px] h-[22px] rounded-lg border-2 flex items-center justify-center shrink-0"
        style={{
          borderColor: klaar ? "var(--color-success)" : "#D8C7B2",
          background: klaar ? "var(--color-success)" : "var(--color-card)",
        }}
      >
        {klaar && <CheckIcon size={13} className="text-accent-ink" />}
      </button>
      <div
        className="flex-1 text-[14px]"
        style={{
          color: klaar ? "var(--color-hint)" : "var(--color-ink)",
          textDecoration: klaar ? "line-through" : "none",
        }}
      >
        {tekst}
      </div>
      <button type="button" onClick={() => startTransition(() => cycleSubtaakAssignee(id, itemId, memberIds))}>
        <Avatar naam={toegewezenNaam} kleur={toegewezenKleur} size={26} />
      </button>
    </div>
  );
}
