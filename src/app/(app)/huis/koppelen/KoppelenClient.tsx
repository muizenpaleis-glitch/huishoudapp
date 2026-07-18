"use client";

import { useState, useTransition } from "react";
import { BackButton, Card } from "@/components/ui";
import { LampIcon } from "@/components/icons";
import { testLight, assignLampEntity } from "./actions";

type Lamp = { id: string; naam: string; kamer: string; entityId: string | null };
type Entity = { entityId: string; naam: string };

export function KoppelenClient({ lampen, entities }: { lampen: Lamp[]; entities: Entity[] }) {
  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href="/huis" />
          <div className="text-[21px] font-bold tracking-tight">Lampen koppelen</div>
        </div>
        <p className="text-[13.5px] text-muted leading-relaxed">
          Klik op <b>Test</b> — die specifieke lamp schakelt in huis. Klopt het niet met de kamer hierboven? Kies
          dan de juiste lamp uit de lijst en het wordt meteen bewaard.
        </p>

        <div className="flex flex-col gap-3">
          {lampen.map((l) => (
            <LampRow key={l.id} lamp={l} entities={entities} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LampRow({ lamp, entities }: { lamp: Lamp; entities: Entity[] }) {
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [entityId, setEntityId] = useState(lamp.entityId ?? "");

  function onTest() {
    if (!entityId) return;
    setTesting(true);
    startTransition(async () => {
      await testLight(entityId);
      setTesting(false);
    });
  }

  function onChange(next: string) {
    setEntityId(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await assignLampEntity(lamp.id, next);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-[38px] h-[38px] rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0">
        <LampIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold">{lamp.kamer}</div>
        <div className="text-[11.5px] text-muted">{lamp.naam}</div>
        <select
          value={entityId}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full px-2 py-1.5 rounded-lg border border-input-border bg-card text-[12.5px]"
        >
          <option value="">— geen koppeling —</option>
          {entities.map((e) => (
            <option key={e.entityId} value={e.entityId}>
              {e.naam} ({e.entityId})
            </option>
          ))}
        </select>
        {error && <div className="text-[11.5px] text-danger font-semibold mt-1">{error}</div>}
        {saved && !error && <div className="text-[11.5px] text-success font-semibold mt-1">Opgeslagen</div>}
      </div>
      <button
        type="button"
        onClick={onTest}
        disabled={!entityId || pending || testing}
        className="px-3.5 py-2 rounded-full bg-ink text-accent-ink text-[12.5px] font-semibold shrink-0 disabled:opacity-50"
      >
        {testing ? "…" : "Test"}
      </button>
    </Card>
  );
}
