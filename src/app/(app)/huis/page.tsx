import { prisma } from "@/lib/prisma";
import { HuisClient } from "./HuisClient";

export default async function HuisPage() {
  const [lampen, cameras, energieStatus, metingen, laadpaal, automatisering, favorieten] = await Promise.all([
    prisma.huisLamp.findMany({ orderBy: { volgorde: "asc" } }),
    prisma.huisCamera.findMany({ orderBy: { volgorde: "asc" } }),
    prisma.huisEnergieStatus.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.huisEnergieMeting.findMany({ orderBy: { volgorde: "asc" } }),
    prisma.huisLaadpaal.findUniqueOrThrow({
      where: { id: 1 },
      include: { sessies: { orderBy: { datum: "desc" }, take: 5 } },
    }),
    prisma.huisAutomatisering.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.huisFavoriet.findMany({ orderBy: { volgorde: "asc" } }),
  ]);

  return (
    <HuisClient
      lampen={lampen.map((l) => ({ ...l, helderheid: l.helderheid }))}
      cameras={cameras.map((c) => ({
        id: c.id,
        naam: c.naam,
        laatsteBeweging: c.laatsteBeweging ? c.laatsteBeweging.toISOString() : null,
      }))}
      energieStatus={{
        verbruikNuKw: Number(energieStatus.verbruikNuKw),
        opwekNuKw: Number(energieStatus.opwekNuKw),
        terugleveringNuKw: Number(energieStatus.terugleveringNuKw),
        verbruikVandaagKwh: Number(energieStatus.verbruikVandaagKwh),
        opwekVandaagKwh: Number(energieStatus.opwekVandaagKwh),
        teruggeleverdVandaagKwh: Number(energieStatus.teruggeleverdVandaagKwh),
        warmtepompVandaagKwh: Number(energieStatus.warmtepompVandaagKwh),
        warmtepompBijgewerkt: energieStatus.warmtepompBijgewerkt
          ? energieStatus.warmtepompBijgewerkt.toISOString()
          : null,
      }}
      metingen={metingen.map((m) => ({
        periode: m.periode as "dag" | "week" | "maand",
        label: m.label,
        verbruik: Number(m.verbruik),
        opwek: Number(m.opwek),
      }))}
      laadpaal={{
        status: laadpaal.status,
        huidigVermogenKw: Number(laadpaal.huidigVermogenKw),
        sessies: laadpaal.sessies.map((s) => ({
          id: s.id,
          datum: s.datum.toISOString(),
          duurMinuten: s.duurMinuten,
          kwh: Number(s.kwh),
        })),
      }}
      automatisering={{
        aan: automatisering.aan,
        laatsteActie: automatisering.laatsteActie,
        laatsteActieOp: automatisering.laatsteActieOp ? automatisering.laatsteActieOp.toISOString() : null,
      }}
      favorieten={favorieten.map((f) => f.key)}
    />
  );
}
