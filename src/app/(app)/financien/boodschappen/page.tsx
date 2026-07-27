import { prisma } from "@/lib/prisma";
import { gmailStatus } from "@/lib/boodschappen/gmail";
import type { RegelRij, ProductOverride } from "@/lib/boodschappen/engine";
import { BoodschappenClient } from "./BoodschappenClient";

export const dynamic = "force-dynamic";

export type BonRij = {
  id: string;
  bron: string;
  bezorgdatum: string;
  totaal: number | null;
  statiegeld: number;
  voordeel: number;
  klopt: boolean;
  regels: number;
};

export default async function BoodschappenPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; adres?: string; melding?: string }>;
}) {
  const { gmail, adres, melding } = await searchParams;
  const [bonRows, productRows, status] = await Promise.all([
    prisma.boodschapBon.findMany({
      orderBy: { bezorgdatum: "desc" },
      include: { regels: true },
    }),
    prisma.boodschapProduct.findMany(),
    gmailStatus(),
  ]);

  const bonnen: BonRij[] = bonRows.map((b) => ({
    id: b.id,
    bron: b.bron,
    bezorgdatum: b.bezorgdatum,
    totaal: b.totaal == null ? null : Number(b.totaal),
    statiegeld: Number(b.statiegeld),
    voordeel: Number(b.voordeel),
    klopt: b.klopt,
    regels: b.regels.length,
  }));

  const regels: RegelRij[] = bonRows.flatMap((b) =>
    b.regels.map((r) => ({
      bezorgdatum: b.bezorgdatum,
      productnaam: r.productnaam,
      sleutel: r.sleutel,
      aantal: r.aantal,
      prijs: Number(r.prijs),
      actielabel: r.actielabel,
    })),
  );

  const overrides: ProductOverride[] = productRows.map((p) => ({
    sleutel: p.sleutel,
    categorie: p.categorie,
    houdbaar: p.houdbaar,
    bulkNegeren: p.bulkNegeren,
  }));

  return (
    <BoodschappenClient
      bonnen={bonnen}
      regels={regels}
      overrides={overrides}
      gmail={{ ...status, laatsteSync: status.laatsteSync?.toISOString() ?? null }}
      terugkoppeling={gmail ? { soort: gmail, adres, melding } : null}
    />
  );
}
