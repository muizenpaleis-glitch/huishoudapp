import { NextResponse } from "next/server";
import { haConfigured, haPing, listLights } from "@/lib/home-assistant";

// Diagnostic endpoint, gated by SETUP_SECRET: confirms the Home Assistant
// connection works and lists every light entity it can see, so the household
// can check names/rooms before we map them into the app. Read-only — makes
// no changes in Home Assistant or the app's own database.
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

  const ping = await haPing();
  if (!ping.ok) {
    return NextResponse.json({
      ok: false,
      message: `Kon geen verbinding maken met Home Assistant: ${ping.message}`,
    });
  }

  try {
    const lights = await listLights();
    return NextResponse.json({
      ok: true,
      message: `Verbonden! ${lights.length} lamp(en) gevonden.`,
      lights: lights.map((l) => ({
        entity_id: l.entity_id,
        naam: (l.attributes.friendly_name as string | undefined) ?? l.entity_id,
        aan: l.state === "on",
        helderheid: l.attributes.brightness != null ? Math.round((l.attributes.brightness as number) / 2.55) : null,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : "Onbekende fout bij het ophalen van lampen.",
    });
  }
}
