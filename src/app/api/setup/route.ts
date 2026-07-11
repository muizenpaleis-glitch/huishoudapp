import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-data";

// One-time setup: fills the database with starting data (household members,
// example contracts, onderhoud items, finance figures). Safe to visit more
// than once — it refuses to run if there's already real data, so it can't
// wipe anything by accident.
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existing = await prisma.householdMember.count();
  if (existing > 0) {
    return NextResponse.json({
      ok: true,
      message: "Er staat al data in de database — er is niets veranderd.",
    });
  }

  await seedDatabase(prisma);
  return NextResponse.json({
    ok: true,
    message: "Klaar! De app is gevuld met startgegevens. Je kunt deze pagina nu sluiten.",
  });
}
