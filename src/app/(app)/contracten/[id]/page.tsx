import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { BackButton, Card, Pill, FieldRow, Avatar } from "@/components/ui";
import { DocIcon, WarningIcon, CategorieIcons } from "@/components/icons";
import { CATEGORIE_TINT, urgentie, urgentieKleur, deadline } from "@/lib/contracten";
import { fmtKort, dagenTussen } from "@/lib/format";
import { updateStatus } from "../actions";
import { fileViewUrl } from "@/lib/files";
import type { ContractCategorie, ContractStatus } from "@/generated/prisma/client";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id }, include: { beheerder: true } });
  if (!contract) notFound();

  const settings = await getAppSettings();
  const u = urgentie(contract, settings.contractDrempel);
  const kl = urgentieKleur(u);
  const dl = deadline(contract);
  const dgn = dl ? dagenTussen(dl, new Date()) : null;
  const tint = CATEGORIE_TINT[contract.categorie as ContractCategorie];
  const Icon = CategorieIcons[contract.categorie as ContractCategorie];
  const toonBanner = u === "urgent" || u === "attentie";

  const velden: { label: string; waarde: string; c?: string }[] = [
    { label: "Categorie", waarde: contract.categorie },
    { label: "Startdatum", waarde: contract.startdatum ? fmtKort(contract.startdatum) : "—" },
    { label: "Einddatum", waarde: fmtKort(contract.einddatum) },
    {
      label: "Opzegtermijn",
      waarde:
        contract.opzegType === "datum"
          ? `Uiterlijk ${fmtKort(contract.opzegDatum)}`
          : `${contract.opzegMaanden} ${contract.opzegMaanden === 1 ? "maand" : "maanden"} vóór einddatum`,
    },
    {
      label: "Uiterste opzegdatum",
      waarde: dl ? fmtKort(dl) : "—",
      c: toonBanner ? kl.c : undefined,
    },
    { label: "Verlengt automatisch", waarde: contract.autoRenewal ? "Ja" : "Nee, loopt vanzelf af" },
  ];

  const STATUSSEN: ContractStatus[] = ["Actief", "Opgezegd", "Verlopen"];

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[640px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BackButton href="/contracten" />
          <div className="flex-1" />
          <Link
            href={`/contracten/${id}/bewerken`}
            className="px-4.5 py-2.5 rounded-full bg-ink text-accent-ink text-[13.5px] font-semibold"
          >
            Bewerken
          </Link>
        </div>

        <div className="flex items-center gap-3.5">
          <div
            className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center shrink-0"
            style={{ background: tint.bg, color: tint.c }}
          >
            <Icon size={25} />
          </div>
          <div>
            <div className="text-[22px] font-bold tracking-tight">{contract.naam}</div>
            <div className="text-sm text-muted">
              {contract.leverancier} · {contract.categorie}
            </div>
          </div>
        </div>

        {toonBanner && (
          <div className="rounded-[18px] p-3.5 flex gap-2.5 items-start" style={{ background: kl.bg }}>
            <WarningIcon size={19} className="shrink-0 mt-0.5" style={{ color: kl.c }} />
            <div className="text-[13.5px] font-semibold leading-snug" style={{ color: kl.c }}>
              Opzegtermijn nadert: opzeggen kan tot {fmtKort(dl)} (nog {dgn} dagen).
            </div>
          </div>
        )}

        <Card className="px-4.5 py-1.5">
          {velden.map((v) => (
            <FieldRow key={v.label} label={v.label} value={v.waarde} valueColor={v.c} />
          ))}
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="text-[13.5px] text-muted">Status</div>
            <div className="flex gap-1.5">
              {STATUSSEN.map((st) => (
                <form key={st} action={updateStatus.bind(null, id, st)}>
                  <Pill type="submit" active={contract.status === st}>
                    {st}
                  </Pill>
                </form>
              ))}
            </div>
          </div>
        </Card>

        {contract.beheerder && (
          <Card className="p-4.5 flex items-center gap-3">
            <Avatar naam={contract.beheerder.naam} kleur={contract.beheerder.kleur} size={34} />
            <div>
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">Beheerder</div>
              <div className="text-[14.5px] font-semibold mt-0.5">{contract.beheerder.naam}</div>
            </div>
          </Card>
        )}

        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Document</div>
          {contract.docNaam ? (
            <a
              href={contract.docUrl ? fileViewUrl(contract.docUrl) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <div className="w-[42px] h-[42px] rounded-[13px] bg-accent-tint flex items-center justify-center shrink-0">
                <DocIcon size={19} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{contract.docNaam}</div>
                <div className="text-[12.5px] text-muted">{contract.docUrl ? "Tik om te bekijken" : "Toegevoegd bij aanmaak"}</div>
              </div>
            </a>
          ) : (
            <div className="border-[1.5px] border-dashed border-input-border rounded-2xl p-4.5 text-center text-[13.5px] text-muted">
              Geen document toegevoegd
            </div>
          )}
        </Card>

        {contract.notitie && (
          <Card className="p-4.5 flex flex-col gap-2">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">Notitie</div>
            <div className="text-[13.5px] text-ink whitespace-pre-wrap leading-relaxed">{contract.notitie}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
