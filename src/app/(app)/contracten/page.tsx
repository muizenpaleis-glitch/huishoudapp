import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { ModuleHeader } from "@/components/ModuleHeader";
import { RoundIconButton, Pill } from "@/components/ui";
import { BellIcon, PlusIcon, ChevronRightIcon, CategorieIcons } from "@/components/icons";
import { CATEGORIE_TINT, CONTRACT_CATEGORIEEN, urgentie, urgentieKleur, deadline } from "@/lib/contracten";
import { fmtKort, maandVol, dagenTussen } from "@/lib/format";
import type { ContractCategorie } from "@/generated/prisma/client";

export default async function ContractenPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const settings = await getAppSettings();
  const contracts = await prisma.contract.findMany();

  const alle = [...contracts].sort((a, b) => {
    const ai = a.status !== "Actief" ? 1 : 0;
    const bi = b.status !== "Actief" ? 1 : 0;
    if (ai !== bi) return ai - bi;
    return a.einddatum.getTime() - b.einddatum.getTime();
  });

  const zichtbaar = alle.filter((c) => !categorie || categorie === "Alle" || c.categorie === categorie);

  const aantalUrgent = alle.filter((c) => {
    const u = urgentie(c, settings.contractDrempel);
    return u === "urgent" || u === "attentie";
  }).length;

  const subtitel =
    contracts.length === 0
      ? "Gedeeld huishouden"
      : aantalUrgent === 0
        ? "Alles ruim op tijd"
        : aantalUrgent === 1
          ? "1 contract vraagt aandacht"
          : `${aantalUrgent} contracten vragen aandacht`;

  type Groep = { label: string; items: typeof zichtbaar };
  const groepen: Groep[] = [];
  for (const c of zichtbaar) {
    const label = c.status !== "Actief" ? "Niet meer actief" : maandVol(c.einddatum);
    let g = groepen.find((x) => x.label === label);
    if (!g) {
      g = { label, items: [] };
      groepen.push(g);
    }
    g.items.push(c);
  }

  return (
    <div className="flex flex-col min-h-full">
      <ModuleHeader
        title="Contracten"
        subtitle={subtitel}
        right={
          <RoundIconButton href="/contracten/instellingen">
            <BellIcon size={19} />
          </RoundIconButton>
        }
      />

      {contracts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex gap-2 px-5 pt-4 pb-3.5 overflow-x-auto shrink-0">
            {["Alle", ...CONTRACT_CATEGORIEEN].map((f) => (
              <Link key={f} href={f === "Alle" ? "/contracten" : `/contracten?categorie=${f}`}>
                <Pill active={(categorie ?? "Alle") === f}>{f}</Pill>
              </Link>
            ))}
          </div>

          <div className="flex-1 min-h-0 px-5 pb-6">
            <div className="flex flex-col gap-5 max-w-[780px] mx-auto">
              {groepen.map((g) => (
                <div key={g.label} className="flex flex-col gap-2.5">
                  <div className="text-[12.5px] font-bold tracking-wider uppercase text-label pl-1">
                    {g.label}
                  </div>
                  {g.items.map((c) => {
                    const u = urgentie(c, settings.contractDrempel);
                    const kl = urgentieKleur(u);
                    const dl = deadline(c);
                    const dgn = dl ? dagenTussen(dl, new Date()) : null;
                    const tint = CATEGORIE_TINT[c.categorie as ContractCategorie];
                    const Icon = CategorieIcons[c.categorie as ContractCategorie];
                    const urgentAchtig = u === "urgent" || u === "attentie";
                    let badge = "";
                    if (u === "inactief") badge = c.status;
                    else if (u === "urgent") badge = `Nog ${dgn} dagen — opzeggen vóór ${fmtKort(dl)}`;
                    else if (u === "attentie") badge = `Opzeggen vóór ${fmtKort(dl)} (${dgn} dagen)`;

                    return (
                      <Link
                        key={c.id}
                        href={`/contracten/${c.id}`}
                        className="rounded-[20px] p-3.5 flex items-center gap-3.5 border"
                        style={{
                          background: u === "urgent" ? "#FBE9DF" : "var(--color-card)",
                          borderColor: u === "urgent" ? "#EFC5AF" : "var(--color-card-border)",
                        }}
                      >
                        <div
                          className="w-[52px] h-14 rounded-[15px] flex flex-col items-center justify-center shrink-0"
                          style={{
                            background: urgentAchtig ? kl.bg : "var(--color-track)",
                            color: urgentAchtig ? kl.c : "var(--color-ink-soft)",
                          }}
                        >
                          <div className="text-[19px] font-bold leading-none">{c.einddatum.getDate()}</div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide mt-0.5">
                            {maandVol(c.einddatum).slice(0, 3).toLowerCase()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15.5px] font-semibold truncate flex items-center gap-1.5">
                            <span
                              className="inline-flex w-6 h-6 rounded-lg items-center justify-center shrink-0"
                              style={{ background: tint.bg, color: tint.c }}
                            >
                              <Icon size={13} />
                            </span>
                            {c.naam}
                          </div>
                          <div className="text-[13px] text-muted mt-0.5">
                            {c.leverancier} · {c.categorie}
                          </div>
                          {urgentAchtig && (
                            <div className="text-[12.5px] font-semibold mt-1" style={{ color: kl.c }}>
                              {badge}
                            </div>
                          )}
                        </div>
                        <ChevronRightIcon size={16} className="text-chevron shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              ))}
              {zichtbaar.length === 0 && (
                <div className="text-center py-12 text-muted text-sm">
                  Geen contracten in deze categorie.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Link
        href="/contracten/nieuw"
        className="fixed right-5 bottom-24 md:bottom-6 w-14 h-14 rounded-[20px] bg-accent flex items-center justify-center shadow-[0_6px_18px_rgba(196,99,59,0.38)] z-10"
      >
        <PlusIcon size={24} className="text-accent-ink" />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4.5 px-8 pb-24 text-center">
      <Image
        src="/wapen-klein.png"
        alt="Familiewapen"
        width={140}
        height={153}
        className="object-contain"
        style={{ filter: "drop-shadow(0 8px 18px rgba(94,72,50,0.16))" }}
      />
      <div className="flex flex-col gap-2 max-w-[300px]">
        <div className="text-xl font-bold tracking-tight">Nog geen contracten</div>
        <div className="text-sm text-muted leading-relaxed">
          Voeg jullie eerste contract toe — dan bewaken we samen de opzegtermijnen.
        </div>
      </div>
      <Link
        href="/contracten/nieuw"
        className="px-6.5 py-3.5 rounded-full bg-accent text-accent-ink text-[14.5px] font-bold shadow-[0_5px_14px_rgba(196,99,59,0.32)]"
      >
        + Eerste contract toevoegen
      </Link>
      <div className="text-[11.5px] font-semibold tracking-widest uppercase text-hint">
        Mus potens est
      </div>
    </div>
  );
}
