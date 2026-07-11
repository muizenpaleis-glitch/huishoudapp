import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { ModuleHeader } from "@/components/ModuleHeader";
import { RoundIconButton, Pill, Avatar } from "@/components/ui";
import { ChecklistIcon, BellIcon, PlusIcon, ChevronRightIcon, OnderhoudCategorieIcons } from "@/components/icons";
import {
  ONDERHOUD_CATEGORIEEN,
  CATEGORIE_TINT,
  PRIO_RANG,
  urgentie,
  urgentieKleur,
  itemDatum,
} from "@/lib/onderhoud";
import { fmtKort } from "@/lib/format";
import type { OnderhoudCategorie } from "@/generated/prisma/client";

const TYPE_OPTS = ["Alles", "Periodiek", "Taken"] as const;

export default async function OnderhoudPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; categorie?: string }>;
}) {
  const { type = "Alles", categorie = "Alle" } = await searchParams;
  const settings = await getAppSettings();
  const items = await prisma.onderhoudItem.findMany({
    include: { toegewezen: true, subtaken: true },
  });

  const openTodoCount = items.reduce(
    (sum, it) => sum + it.subtaken.filter((s) => !s.klaar).length,
    0,
  );

  const gefilterd = items.filter((it) => {
    if (type === "Periodiek" && it.type !== "periodiek") return false;
    if (type === "Taken" && it.type !== "taak") return false;
    if (categorie !== "Alle" && it.categorie !== categorie) return false;
    return true;
  });

  const gesorteerd = [...gefilterd].sort((a, b) => {
    const pr = PRIO_RANG[a.prio] - PRIO_RANG[b.prio];
    if (pr !== 0) return pr;
    const da = itemDatum(a);
    const db = itemDatum(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });

  type Groep = { label: string; items: typeof gesorteerd };
  const groepen: Groep[] = [];
  for (const it of gesorteerd) {
    const heeftDatum = !!itemDatum(it);
    const label = heeftDatum ? `Prioriteit ${it.prio.toLowerCase()}` : "Ooit een keer";
    let g = groepen.find((x) => x.label === label);
    if (!g) {
      g = { label, items: [] };
      groepen.push(g);
    }
    g.items.push(it);
  }
  groepen.sort((a, b) => (a.label === "Ooit een keer" ? 1 : 0) - (b.label === "Ooit een keer" ? 1 : 0));

  const aantalUrgent = items.filter((it) => {
    const u = urgentie(it, settings.onderhoudDrempel);
    return u === "urgent" || u === "attentie";
  }).length;
  const subtitel = aantalUrgent === 0 ? "Niets dringends" : `${aantalUrgent} ${aantalUrgent === 1 ? "item" : "items"} urgent`;

  return (
    <div className="flex flex-col min-h-full">
      <ModuleHeader
        title="Onderhoud"
        subtitle={subtitel}
        right={
          <div className="flex gap-2">
            <div className="relative">
              <RoundIconButton href="/onderhoud/todos">
                <ChecklistIcon size={18} />
              </RoundIconButton>
              {openTodoCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold flex items-center justify-center">
                  {openTodoCount}
                </div>
              )}
            </div>
            <RoundIconButton>
              <BellIcon size={18} />
            </RoundIconButton>
          </div>
        }
      />

      <div className="px-5 pt-4 flex gap-2 flex-wrap">
        {TYPE_OPTS.map((t) => (
          <Link key={t} href={t === "Alles" ? "/onderhoud" : `/onderhoud?type=${t}`}>
            <Pill active={type === t}>{t}</Pill>
          </Link>
        ))}
      </div>
      <div className="px-5 pt-2 pb-3.5 flex gap-2 overflow-x-auto shrink-0">
        {["Alle", ...ONDERHOUD_CATEGORIEEN].map((c) => (
          <Link
            key={c}
            href={
              c === "Alle"
                ? type === "Alles"
                  ? "/onderhoud"
                  : `/onderhoud?type=${type}`
                : `/onderhoud?${type !== "Alles" ? `type=${type}&` : ""}categorie=${c}`
            }
          >
            <Pill active={categorie === c}>{c}</Pill>
          </Link>
        ))}
      </div>

      <div className="flex-1 min-h-0 px-5 pb-6">
        <div className="flex flex-col gap-5 max-w-[780px] mx-auto">
          {groepen.map((g) => (
            <div key={g.label} className="flex flex-col gap-2.5">
              <div className="text-[12.5px] font-bold tracking-wider uppercase text-label pl-1 capitalize">
                {g.label}
              </div>
              {g.items.map((it) => {
                const u = urgentie(it, settings.onderhoudDrempel);
                const kl = urgentieKleur(u);
                const urgentAchtig = u === "urgent" || u === "attentie";
                const d = itemDatum(it);
                const dgn = d ? Math.round((d.getTime() - Date.now()) / 86400000) : null;
                const tint = CATEGORIE_TINT[it.categorie as OnderhoudCategorie];
                const Icon = OnderhoudCategorieIcons[it.categorie as OnderhoudCategorie];
                let badge = "";
                if (u === "urgent" && dgn !== null) badge = `Nog ${dgn} ${dgn === 1 ? "dag" : "dagen"}`;
                else if (u === "attentie" && dgn !== null) badge = `Komt eraan — over ${dgn} dagen`;

                return (
                  <Link
                    key={it.id}
                    href={`/onderhoud/${it.id}`}
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
                      {d ? (
                        <>
                          <div className="text-[19px] font-bold leading-none">{d.getDate()}</div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide mt-0.5">
                            {fmtKort(d).split(" ")[1]}
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] font-semibold text-center px-1">ooit</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15.5px] font-semibold truncate flex items-center gap-1.5">
                        <span
                          className="inline-flex w-6 h-6 rounded-lg items-center justify-center shrink-0"
                          style={{ background: tint.bg, color: tint.c }}
                        >
                          <Icon size={13} />
                        </span>
                        {it.naam}
                      </div>
                      <div className="text-[13px] text-muted mt-0.5">
                        {it.categorie} · {it.type === "periodiek" ? it.intervalLabel : "Taak"} · {it.prio}
                        {it.type === "taak" && it.status !== "Te_doen" && ` · ${it.status?.replace("_", " ")}`}
                      </div>
                      {urgentAchtig && (
                        <div className="text-[12.5px] font-semibold mt-1" style={{ color: kl.c }}>
                          {badge}
                        </div>
                      )}
                    </div>
                    {it.type === "taak" && it.toegewezen && (
                      <Avatar naam={it.toegewezen.naam} kleur={it.toegewezen.kleur} size={28} />
                    )}
                    <ChevronRightIcon size={16} className="text-chevron shrink-0" />
                  </Link>
                );
              })}
            </div>
          ))}
          {gesorteerd.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">Niets gevonden met deze filters.</div>
          )}
        </div>
      </div>

      <Link
        href="/onderhoud/nieuw"
        className="fixed right-5 bottom-24 md:bottom-6 w-14 h-14 rounded-[20px] bg-accent flex items-center justify-center shadow-[0_6px_18px_rgba(196,99,59,0.38)] z-10"
      >
        <PlusIcon size={24} className="text-accent-ink" />
      </Link>
    </div>
  );
}
