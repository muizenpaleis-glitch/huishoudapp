"use client";

import { useState, useTransition } from "react";
import { BackButton, Pill, Toggle, Card } from "@/components/ui";
import { updateNotificationSettings } from "../actions";
import { enablePush, disablePush } from "@/lib/push-client";
import { useActiveMember } from "@/components/ActiveMemberContext";
import type { AppSettings } from "@/generated/prisma/client";

const DREMPELS = [30, 60, 90];

export function NotificatieForm({ settings }: { settings: AppSettings }) {
  const { activeMemberId } = useActiveMember();
  const [, startTransition] = useTransition();
  const [drempel, setDrempel] = useState(settings.contractDrempel);
  const [mail, setMail] = useState(settings.contractMail);
  const [push, setPush] = useState(settings.contractPush);
  const [pushError, setPushError] = useState<string | null>(null);

  function persist(next: { drempel?: number; mail?: boolean; push?: boolean }) {
    const values = {
      contractDrempel: next.drempel ?? drempel,
      contractMail: next.mail ?? mail,
      contractPush: next.push ?? push,
    };
    startTransition(async () => {
      await updateNotificationSettings(values);
    });
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4.5">
        <div className="flex items-center gap-3">
          <BackButton href="/contracten" />
          <div className="text-[21px] font-bold tracking-tight">Notificaties</div>
        </div>

        <Card className="p-4.5 flex flex-col gap-3.5">
          <div>
            <div className="text-[15px] font-semibold">Waarschuw mij vooraf</div>
            <div className="text-[13px] text-muted mt-0.5 leading-relaxed">
              Je krijgt een melding wanneer de uiterste opzegdatum van een contract dichterbij komt dan deze termijn.
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
            Je krijgt nu een melding vanaf {drempel} dagen vóór de uiterste opzegdatum.
          </div>
        </Card>

        <Card className="px-4.5 py-1">
          <div className="flex items-center justify-between gap-3 py-4 border-b border-divider">
            <div>
              <div className="text-[14.5px] font-semibold">In de app</div>
              <div className="text-[12.5px] text-muted mt-0.5">Altijd aan — melding op het overzicht</div>
            </div>
            <div className="opacity-70">
              <Toggle on={true} activeColor="var(--color-toggle-off)" />
            </div>
          </div>
          <button
            className="w-full flex items-center justify-between gap-3 py-4 border-b border-divider text-left"
            onClick={() => {
              setMail(!mail);
              persist({ mail: !mail });
            }}
          >
            <div>
              <div className="text-[14.5px] font-semibold">E-mail</div>
              <div className="text-[12.5px] text-muted mt-0.5">Naar het gedeelde huishoud-adres</div>
            </div>
            <Toggle on={mail} />
          </button>
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
              <div className="text-[12.5px] text-muted mt-0.5">Beschikbaarheid hangt af van installatie als app</div>
            </div>
            <Toggle on={push} />
          </button>
        </Card>
        {pushError && <div className="text-[13px] text-danger font-semibold px-1">{pushError}</div>}
      </div>
    </div>
  );
}
