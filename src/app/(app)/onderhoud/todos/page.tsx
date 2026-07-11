import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMembers } from "@/lib/members";
import { BackButton, Card, Pill, Avatar } from "@/components/ui";
import { OnderhoudCategorieIcons } from "@/components/icons";
import { CATEGORIE_TINT } from "@/lib/onderhoud";
import { SubtaskRow } from "../SubtaskRow";
import type { OnderhoudCategorie } from "@/generated/prisma/client";

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ wie?: string }>;
}) {
  const { wie = "Alle" } = await searchParams;
  const [items, members] = await Promise.all([
    prisma.onderhoudItem.findMany({
      include: { subtaken: { include: { toegewezen: true }, orderBy: { volgorde: "asc" } } },
    }),
    getMembers(),
  ]);
  const memberIds = members.map((m) => m.id);

  const bronnen = items.filter((it) => it.subtaken.length > 0);
  const groepen = bronnen
    .map((it) => {
      const alleOpen = it.subtaken.filter((s) => !s.klaar).length;
      const zichtbaar = it.subtaken.filter(
        (s) => wie === "Alle" || s.toegewezen?.naam === wie,
      );
      return { item: it, zichtbaar, alleOpen };
    })
    .filter((g) => g.zichtbaar.length > 0);

  const totaalOpen = groepen.reduce(
    (sum, g) => sum + g.zichtbaar.filter((s) => !s.klaar).length,
    0,
  );
  const todoSubtitel =
    totaalOpen === 0
      ? "Alles afgevinkt"
      : `${totaalOpen} ${totaalOpen === 1 ? "open deeltaak" : "open deeltaken"}${wie !== "Alle" ? ` · ${wie}` : ""}`;

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[780px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton href="/onderhoud" />
          <div>
            <div className="text-[21px] font-bold tracking-tight">Alle to-do&apos;s</div>
            <div className="text-[13px] text-muted">{todoSubtitel}</div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <Link href="/onderhoud/todos">
            <Pill active={wie === "Alle"}>Alle</Pill>
          </Link>
          {members.map((m) => (
            <Link key={m.id} href={`/onderhoud/todos?wie=${encodeURIComponent(m.naam)}`}>
              <Pill active={wie === m.naam}>
                <span className="inline-flex items-center gap-1.5">
                  <Avatar naam={m.naam} kleur={m.kleur} size={16} />
                  {m.naam}
                </span>
              </Pill>
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {groepen.map(({ item, zichtbaar, alleOpen }) => {
            const tint = CATEGORIE_TINT[item.categorie as OnderhoudCategorie];
            const Icon = OnderhoudCategorieIcons[item.categorie as OnderhoudCategorie];
            return (
              <div key={item.id} className="flex flex-col gap-2.5">
                <Link href={`/onderhoud/${item.id}`} className="flex items-center gap-2.5">
                  <span
                    className="inline-flex w-[26px] h-[26px] rounded-[9px] items-center justify-center shrink-0"
                    style={{ background: tint.bg, color: tint.c }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="text-[15px] font-semibold flex-1">{item.naam}</span>
                  <span className="text-[12.5px] text-muted">
                    {alleOpen === 0 ? "Alles klaar" : `${alleOpen} open`}
                  </span>
                </Link>
                <Card className="p-3.5 flex flex-col gap-2.5">
                  {zichtbaar.map((st) => (
                    <SubtaskRow
                      key={st.id}
                      id={st.id}
                      itemId={item.id}
                      tekst={st.tekst}
                      klaar={st.klaar}
                      toegewezenNaam={st.toegewezen?.naam ?? "?"}
                      toegewezenKleur={st.toegewezen?.kleur ?? "#C9B8A4"}
                      memberIds={memberIds}
                    />
                  ))}
                </Card>
              </div>
            );
          })}
          {groepen.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">
              Geen openstaande deeltaken{wie !== "Alle" ? ` voor ${wie}` : ""}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
