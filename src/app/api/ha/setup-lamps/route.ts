import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haConfigured } from "@/lib/home-assistant";

// One-time setup: replaces the simulated demo lamps with real Home Assistant
// light entities, chosen together with the household from the /api/ha/lights
// diagnostic output (one representative entity per room, deduped where HA
// reported the same physical light through more than one integration).
const REAL_LAMPEN: { naam: string; kamer: string; entityId: string }[] = [
  { naam: "Woonkamer", kamer: "Woonkamer", entityId: "light.woonkamer" },
  { naam: "Bank", kamer: "Woonkamer", entityId: "light.bank" },
  { naam: "Ome Ton", kamer: "Woonkamer", entityId: "light.ome_ton" },
  { naam: "Keuken", kamer: "Keuken", entityId: "light.keuken" },
  { naam: "Eethoek", kamer: "Eethoek", entityId: "light.eethoek" },
  { naam: "Slaapkamer", kamer: "Slaapkamer", entityId: "light.slaapkamer" },
  { naam: "Babykamer", kamer: "Babykamer", entityId: "light.babykamer" },
  { naam: "Kantoor", kamer: "Kantoor", entityId: "light.kantoor" },
  { naam: "Hal", kamer: "Hal", entityId: "light.hal" },
  { naam: "Gang", kamer: "Gang", entityId: "light.gang" },
  { naam: "Toilet beneden", kamer: "Toilet beneden", entityId: "light.toilet" },
  { naam: "Toilet boven", kamer: "Toilet boven", entityId: "light.toilet_boven" },
  { naam: "Bijkeuken", kamer: "Bijkeuken", entityId: "light.bijkeuken" },
  { naam: "Voordeur", kamer: "Buiten", entityId: "light.voordeur" },
  { naam: "Achtertuin", kamer: "Buiten", entityId: "light.achtertuin" },
];

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!haConfigured()) {
    return NextResponse.json({
      ok: false,
      message: "HOME_ASSISTANT_URL en/of HOME_ASSISTANT_TOKEN staan nog niet in de environment variables.",
    });
  }

  // Drop the old simulated lamps and any previous real-lamp mapping, then
  // recreate from the list above. Favorieten referencing old lamp ids are
  // cleaned up too (they're keyed "lamp:<id>", which would otherwise dangle).
  const oldLampIds = (await prisma.huisLamp.findMany({ select: { id: true } })).map((l) => l.id);
  await prisma.huisFavoriet.deleteMany({
    where: { key: { in: oldLampIds.map((id) => `lamp:${id}`) } },
  });
  await prisma.huisLamp.deleteMany();

  await prisma.huisLamp.createMany({
    data: REAL_LAMPEN.map((l, i) => ({
      naam: l.naam,
      kamer: l.kamer,
      entityId: l.entityId,
      volgorde: i,
    })),
  });

  return NextResponse.json({
    ok: true,
    message: `Klaar! ${REAL_LAMPEN.length} echte lampen gekoppeld. De demo-lampen zijn vervangen.`,
  });
}
