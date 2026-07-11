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
    await prisma.financeTransactie.deleteMany();
    await prisma.financeIncidenteelProject.deleteMany();
    await prisma.financeJaarlijksItem.deleteMany();
    await prisma.financeCategorieBudget.deleteMany();
    await prisma.financeMjpResultaat.deleteMany();
    await prisma.financeMaandFactor.updateMany({ data: { factor: 1 } });
    await prisma.financeNetWorth.update({
      where: { id: 1 },
      data: {
        buffer: 0, spaargeld: 0, beleggingen: 0, startVermogen: 0, kritiekeGrens: 0,
        incomeMaand: 0, spendBudgetMaand: 0, spendActualMaand: 0,
      },
    });
    cleared.push("financiën (projecten, jaarposten, categorieën, transacties, cijfers op 0)");
  }

  if (cleared.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Niets aangevinkt — voeg &contracten=1, &onderhoud=1 en/of &financien=1 toe aan de link.",
    });
  }

  return NextResponse.json({ ok: true, cleared });
}
