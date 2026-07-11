"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/ui";
import { toggleToegewezen } from "../actions";
import type { Member } from "@/lib/members";

export function AssignPills({
  itemId,
  members,
  toegewezenId,
}: {
  itemId: string;
  members: Member[];
  toegewezenId: string | null;
}) {
  const [, startTransition] = useTransition();
  return (
    <div className="flex gap-1.5 flex-wrap">
      {members.map((m) => {
        const active = m.id === toegewezenId;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => startTransition(() => toggleToegewezen(itemId, m.id))}
            className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border"
            style={{
              background: active ? "var(--color-ink)" : "var(--color-card)",
              color: active ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
              borderColor: active ? "var(--color-ink)" : "var(--color-input-border)",
            }}
          >
            <Avatar naam={m.naam} kleur={m.kleur} size={22} />
            <span className="text-[13px] font-semibold">{m.naam}</span>
          </button>
        );
      })}
    </div>
  );
}
