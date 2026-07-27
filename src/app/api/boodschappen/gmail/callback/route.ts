import { NextResponse } from "next/server";
import { koppelMetCode } from "@/lib/boodschappen/gmail";

export const dynamic = "force-dynamic";

// Stap 2: Google stuurt de gebruiker hier terug met een code. Die wisselen we in
// voor een refresh-token en gaan daarna terug naar de boodschappenpagina, met de
// uitkomst in de query zodat de pagina het kan melden.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const terug = new URL("/financien/boodschappen", url.origin);
  const fout = url.searchParams.get("error");
  if (fout) {
    terug.searchParams.set("gmail", "geweigerd");
    return NextResponse.redirect(terug);
  }
  const code = url.searchParams.get("code");
  if (!code) {
    terug.searchParams.set("gmail", "geenCode");
    return NextResponse.redirect(terug);
  }
  try {
    const email = await koppelMetCode(code, url.origin);
    terug.searchParams.set("gmail", "gekoppeld");
    terug.searchParams.set("adres", email);
  } catch (e) {
    terug.searchParams.set("gmail", "fout");
    terug.searchParams.set("melding", e instanceof Error ? e.message : String(e));
  }
  return NextResponse.redirect(terug);
}
