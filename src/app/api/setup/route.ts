import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase, seedDemo, seedHuis } from "@/lib/seed-data";
import { seedFinance } from "@/lib/finance/seed";

// One-time setup: fills the database with starting data. Safe to visit more
// than once:
// - on a brand new database, it seeds everything (real household data, or a
//   blank-slate demo dataset if &demo=1 — see seedDemo() for what that means)
// - on a database that already has real household data but is missing the
//   newer Huis tables (e.g. right after this module was added), it backfills
//   just those, leaving your real data untouched
// - once everything is present, it refuses to run again
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const demo = url.searchParams.get("demo") === "1";

  const [members, huisLampen, financeSettings] = await Promise.all([
    prisma.householdMember.count(),
    prisma.huisLamp.count(),
    prisma.financeSettings.count(),
  ]);

  if (members === 0) {
    if (demo) {
      await seedDemo(prisma);
      return NextResponse.json({
        ok: true,
        message: "Klaar! Dit is een lege demo-omgeving — geen echte gegevens. Je kunt deze pagina nu sluiten.",
      });
    }
    await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      message: "Klaar! De app is gevuld met startgegevens. Je kunt deze pagina nu sluiten.",
    });
  }

  if (huisLampen === 0) {
    await seedHuis(prisma);
    return NextResponse.json({
      ok: true,
      message: "Klaar! De Huis-module is gevuld met voorbeelddata. Je bestaande gegevens zijn niet aangeraakt.",
    });
  }

  if (financeSettings === 0) {
    // Finance module was rebuilt to the raw transaction model; backfill the
    // default settings/projects/yearly + the May-2026 ASN sample so the
    // figures match the reference dashboard, without touching other data.
    await seedFinance(prisma);
    return NextResponse.json({
      ok: true,
      message: "Klaar! De Financiën-module is gevuld met de voorbeeld-data. Je bestaande gegevens zijn niet aangeraakt.",
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Er staat al data in de database — er is niets veranderd.",
  });
}
