import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-off cleanup endpoint: removes the example data that ships in the seed
// so a real household can start with a blank slate. Only touches what's
// explicitly asked for via query flags, so it's safe to re-visit.
//
//   /api/clear-demo?secret=...&contracten=1
//   /api/clear-demo?secret=...&onderhoud=1
//   /api/clear-demo?secret=...&financien=1
//   /api/clear-demo?secret=...&contracten=1&onderhoud=1&financien=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cleared: string[] = [];

  if (url.searchParams.get("contracten") === "1") {
    const r = await prisma.contract.deleteMany();
    cleared.push(`${r.count} contract(en)`);
  }

  if (url.searchParams.get("onderhoud") === "1") {
    const r = await prisma.onderhoudItem.deleteMany();
    cleared.push(`${r.count} onderhoud-item(s) (incl. subtaken, logs en vrije inhoud)`);
  }

  if (url.searchParams.get("financien") === "1") {
    // Wipe the imported transactions + manual triage so the module starts
    // empty; the default settings, projecten and jaarposten stay in place so
    // the plan/budget framework keeps working until real CSV's are uploaded.
    await prisma.financeOverride.deleteMany();
    const r = await prisma.financeTx.deleteMany();
    cleared.push(`financiën (${r.count} voorbeeld-transacties + triage gewist)`);
  }

  if (cleared.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Niets aangevinkt — voeg &contracten=1, &onderhoud=1 en/of &financien=1 toe aan de link.",
    });
  }

  return NextResponse.json({ ok: true, cleared });
}
