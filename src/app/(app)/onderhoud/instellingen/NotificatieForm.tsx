"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, Toggle, Card } from "@/components/ui";
import { updateOnderhoudNotificaties } from "../actions";
import { enablePush, disablePush } from "@/lib/push-client";
import { useActiveMember } from "@/components/ActiveMemberContext";
import type { AppSettings } from "@/generated/prisma/client";

const DREMPELS = [7, 14, 30];

export function OnderhoudNotificatieForm({ settings }: { settings: AppSettings }) {
  const { activeMemberId } = useActiveMember();
  const [, startTransition] = useTransition();
  const [drempel, setDrempel] = useState(settings.onderhoudDrempel);
  const [push, setPush] = useState(settings.contractPush);
  const [pushError, setPushError] = useState<string | null>(null);

  function persist(next: { drempel?: number; push?: boolean }) {
    const values = {
      onderhoudDrempel: next.drempel ?? drempel,
      contractPush: next.push ?? push,
    };
    startTransition(async () => {
      await updateOnderhoudNotificaties(values);
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href="/onderhoud" />
          <div className="text-[21px] font-bold tracking-tight">Notificaties</div>
        </div>

        <Card className="p-4.5 flex flex-col gap-3.5">
          <div>
            <div className="text-[15px] font-semibold">Waarschuw mij vooraf</div>
            <div className="text-[13px] text-muted mt-0.5 leading-relaxed">
              Je krijgt een melding wanneer de eerstvolgende onderhoudsdatum of een streefdatum dichterbij komt dan
              deze termijn. Taken zonder streefdatum geven geen melding.
            </div>
          </div>
          <div className="flex gap-1.5">
            {DREMPELS.map((d) => (
              <Pill
                key={d}
                active={drempel === d}
                className="flex-1"
                onClick={() => {
                  setDrempel(d);
                  persist({ drempel: d });
                }}
              >
                {d} dagen
              </Pill>
            ))}
          </div>
          <div className="text-[13px] text-accent font-semibold">
            Je krijgt nu een melding vanaf {drempel} dagen vóór de datum.
          </div>
        </Card>

        <Card className="px-4.5 py-1">
          <button
            className="w-full flex items-center justify-between gap-3 py-4 text-left"
            onClick={() => {
              const next = !push;
              setPushError(null);
              startTransition(async () => {
                if (next) {
                  const ok = await enablePush(activeMemberId ?? undefined);
                  if (!ok) {
                    setPushError("Kon push niet inschakelen — sta meldingen toe in je browser en installeer de app.");
                    return;
                  }
                } else {
                  await disablePush();
                }
                setPush(next);
                persist({ push: next });
              });
            }}
          >
            <div>
              <div className="text-[14.5px] font-semibold">Push op telefoon</div>
              <div className="text-[12.5px] text-muted mt-0.5">
                Eén schakelaar voor de hele app — geldt ook voor contracten
              </div>
            </div>
            <Toggle on={push} />
          </button>
        </Card>
        {pushError && <div className="text-[13px] text-danger font-semibold px-1">{pushError}</div>}
      </div>
    </div>
  );
}
