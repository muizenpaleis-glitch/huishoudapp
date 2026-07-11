import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { getMembers } from "@/lib/members";
import { BackButton, Card, Pill, FieldRow, PrimaryButton } from "@/components/ui";
import { DocIcon, WarningIcon, CameraIcon, OnderhoudCategorieIcons } from "@/components/icons";
import { CATEGORIE_TINT, urgentie, urgentieKleur, itemDatum } from "@/lib/onderhoud";
import { fmtKort, dagenTussen } from "@/lib/format";
import { logUitvoering, wijzigTaakStatus } from "../actions";
import { SubtaskList } from "./SubtaskList";
import { AssignPills } from "./AssignPills";
import type { OnderhoudCategorie, TaakStatus } from "@/generated/prisma/client";

const STATUSSEN: { key: TaakStatus; label: string }[] = [
  { key: "Te_doen", label: "Te doen" },
  { key: "Mee_bezig", label: "Mee bezig" },
  { key: "Klaar", label: "Klaar" },
];

export default async function OnderhoudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, settings, members] = await Promise.all([
    prisma.onderhoudItem.findUnique({
      where: { id },
      include: {
        toegewezen: true,
        logs: { orderBy: { datum: "desc" } },
        subtaken: { include: { toegewezen: true }, orderBy: { volgorde: "asc" } },
        vrijeInhoud: { orderBy: { volgorde: "asc" } },
      },
    }),
    getAppSettings(),
    getMembers(),
  ]);
  if (!item) notFound();

  const u = urgentie(item, settings.onderhoudDrempel);
  const kl = urgentieKleur(u);
  const d = itemDatum(item);
  const dgn = d ? dagenTussen(d, new Date()) : null;
  const tint = CATEGORIE_TINT[item.categorie as OnderhoudCategorie];
  const Icon = OnderhoudCategorieIcons[item.categorie as OnderhoudCategorie];
  const toonBanner = u === "urgent" || u === "attentie";
  const subline =
    item.type === "periodiek"
      ? `${item.categorie} · ${item.intervalLabel}`
      : `${item.categorie} · Taak · ${item.prio}`;

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4">
        <BackButton href="/onderhoud" />

        <div className="flex items-center gap-3.5">
          <div
            className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center shrink-0"
            style={{ background: tint.bg, color: tint.c }}
          >
            <Icon size={25} />
          </div>
          <div>
            <div className="text-[22px] font-bold tracking-tight">{item.naam}</div>
            <div className="text-sm text-muted">{subline}</div>
          </div>
        </div>

        {toonBanner && (
          <div className="rounded-[18px] p-3.5 flex gap-2.5 items-start" style={{ background: kl.bg }}>
            <WarningIcon size={19} className="shrink-0 mt-0.5" style={{ color: kl.c }} />
            <div className="text-[13.5px] font-semibold leading-snug" style={{ color: kl.c }}>
              {item.type === "periodiek" ? "Onderhoud gepland op " : "Streefdatum "}
              {fmtKort(d)} — nog {dgn} {dgn === 1 ? "dag" : "dagen"}.
            </div>
          </div>
        )}

        {item.type === "periodiek" ? (
          <>
            <Card className="px-4.5 py-1.5">
              <FieldRow label="Categorie" value={item.categorie} />
              <FieldRow label="Interval" value={item.intervalLabel ?? "—"} />
              <FieldRow
                label="Eerstvolgende"
                value={fmtKort(item.volgende)}
                valueColor={toonBanner ? kl.c : undefined}
              />
              <FieldRow label="Prioriteit" value={item.prio} />
            </Card>

            <form action={logUitvoering.bind(null, item.id)}>
              <PrimaryButton type="submit" className="w-full">
                ✓ Beurt uitgevoerd — plan volgende
              </PrimaryButton>
            </form>

            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">Geschiedenis</div>
              {item.logs.length === 0 && (
                <div className="text-[13.5px] text-muted">Nog niet eerder uitgevoerd.</div>
              )}
              {item.logs.map((lg) => (
                <div key={lg.id} className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-chevron mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold">{fmtKort(lg.datum)}</div>
                    {lg.notitie && <div className="text-[13px] text-muted mt-0.5">{lg.notitie}</div>}
                    {lg.doc && (
                      <div className="flex items-center gap-1.5 mt-1 text-[12.5px] text-accent font-semibold">
                        <DocIcon size={13} /> {lg.doc}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </>
        ) : (
          <>
            <Card className="px-4.5 py-1.5">
              <FieldRow label="Categorie" value={item.categorie} />
              <FieldRow label="Prioriteit" value={item.prio} />
              <FieldRow
                label="Streefdatum"
                value={item.streefdatum ? fmtKort(item.streefdatum) : "Geen — ooit een keer"}
                valueColor={toonBanner ? kl.c : undefined}
              />
            </Card>

            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">Status</div>
              <div className="flex gap-1.5">
                {STATUSSEN.map((s) => (
                  <form key={s.key} action={wijzigTaakStatus.bind(null, item.id, s.key)}>
                    <Pill type="submit" active={item.status === s.key}>
                      {s.label}
                    </Pill>
                  </form>
                ))}
              </div>
            </Card>

            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">Toegewezen aan</div>
              <AssignPills itemId={item.id} members={members} toegewezenId={item.toegewezenId} />
            </Card>

            <Card className="p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold tracking-wider uppercase text-label">To-do</div>
                <div className="text-[12.5px] text-muted">
                  {item.subtaken.filter((s) => s.klaar).length} van {item.subtaken.length} klaar
                </div>
              </div>
              <SubtaskList itemId={item.id} subtaken={item.subtaken} members={members} />
            </Card>

            {(item.notitie || item.vrijeInhoud.length > 0) && (
              <Card className="p-4.5 flex flex-col gap-3">
                <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                  Notities &amp; inspiratie
                </div>
                {item.notitie && (
                  <div className="bg-cream rounded-2xl p-3.5 text-[13.5px]" style={{ color: "#5C4C3D" }}>
                    {item.notitie}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {item.vrijeInhoud
                    .filter((b) => b.kind === "foto")
                    .map((b) => (
                      <div
                        key={b.id}
                        className="h-[130px] rounded-2xl border-[1.5px] border-dashed border-input-border flex items-center justify-center text-center text-[12px] text-muted px-2 gap-1.5 flex-col"
                      >
                        <CameraIcon size={20} className="text-hint" />
                        {b.label}
                      </div>
                    ))}
                </div>
                <button className="border-[1.5px] border-dashed border-input-border rounded-2xl p-3.5 text-center text-[13px] text-muted">
                  + Tekst of foto toevoegen
                </button>
              </Card>
            )}
          </>
        )}

        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Document</div>
          {item.doc ? (
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-[13px] bg-accent-tint flex items-center justify-center shrink-0">
                <DocIcon size={19} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{item.doc}</div>
                <div className="text-[12.5px] text-muted">
                  {item.type === "periodiek" ? "Handleiding / garantiebewijs" : "Gekoppeld aan dit item"}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-[1.5px] border-dashed border-input-border rounded-2xl p-4.5 text-center text-[13.5px] text-muted">
              {item.type === "periodiek"
                ? "+ Voeg handleiding of garantiebewijs toe"
                : "+ Voeg document toe (foto, offerte, garantie)"}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
