import { prisma } from "@/lib/prisma";
import type { Lening, Instellingen, Aflossingsvorm } from "@/lib/leningen/engine";
import { LeningenClient } from "./LeningenClient";

export const dynamic = "force-dynamic";

export default async function LeningenPage() {
  const [rows, inst] = await Promise.all([
    prisma.lening.findMany({ orderBy: { volgorde: "asc" } }),
    prisma.leningInstellingen.findUnique({ where: { id: 1 } }),
  ]);

  const leningen: Lening[] = rows.map((l) => ({
    id: l.id,
    naam: l.naam,
    groep: l.groep,
    leningnummer: l.leningnummer,
    verstrekker: l.verstrekker,
    vorm: l.vorm as Aflossingsvorm,
    hoofdsom: Number(l.hoofdsom),
    rente: Number(l.rente),
    startdatum: l.startdatum,
    looptijdMnd: l.looptijdMnd,
    peildatum: l.peildatum,
    restant: Number(l.restant),
    maandTotaal: l.maandTotaal == null ? null : Number(l.maandTotaal),
    maandRente: l.maandRente == null ? null : Number(l.maandRente),
    maandAflossing: l.maandAflossing == null ? null : Number(l.maandAflossing),
    renteBetaald: l.renteBetaald == null ? null : Number(l.renteBetaald),
    aftrekbaar: l.aftrekbaar,
    notitie: l.notitie,
  }));

  const instellingen: Instellingen = {
    aftrekPercentage: inst ? Number(inst.aftrekPercentage) : 37.48,
    eigenwoningforfait: inst ? Number(inst.eigenwoningforfait) : 0,
  };

  return <LeningenClient leningen={leningen} instellingen={instellingen} />;
}
