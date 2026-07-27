import { NextResponse } from "next/server";
import { consentUrl, gmailOauthGeconfigureerd } from "@/lib/boodschappen/gmail";

export const dynamic = "force-dynamic";

// Stap 1 van het koppelen: doorsturen naar het toestemmingsscherm van Google.
// De redirect-URI wordt afgeleid van de request-origin, zodat dezelfde code op
// localhost en op de productie-URL werkt — beide moeten wel als "Geautoriseerde
// omleidings-URI" in de Google Cloud OAuth-client staan.
export async function GET(req: Request) {
  if (!gmailOauthGeconfigureerd()) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_OAUTH_CLIENT_ID en GOOGLE_OAUTH_CLIENT_SECRET ontbreken." },
      { status: 400 },
    );
  }
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(consentUrl(origin, "boodschappen"));
}
