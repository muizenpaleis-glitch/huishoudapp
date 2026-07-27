import { NextResponse } from "next/server";
import { syncVanGmail } from "@/lib/boodschappen/ingest";

export const dynamic = "force-dynamic";

// Dagelijkse ronde. Bonnetjes komen ná bezorging, dus één keer per dag is ruim
// voldoende; het venster van 30 dagen vangt op als een run een keer overslaat.
// Zelfde twee toegestane aanroepers als /api/notifications/check.
export async function GET(req: Request) {
  const bearer = req.headers.get("authorization");
  const viaCron = !!process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`;
  const secret =
    new URL(req.url).searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const viaSecret =
    !!process.env.NOTIFICATIONS_CRON_SECRET && secret === process.env.NOTIFICATIONS_CRON_SECRET;
  if (!viaCron && !viaSecret) {
    return NextResponse.json({ ok: false, error: "Niet geautoriseerd" }, { status: 401 });
  }

  try {
    const r = await syncVanGmail(new Date(Date.now() - 30 * 86400000));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
