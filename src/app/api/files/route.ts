import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

// Streams a blob from the private store server-side, since raw blob URLs
// require an authenticated request and can't be linked to directly.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Geen bestand opgegeven" }, { status: 400 });

  try {
    const result = await get(url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Bestand niet gevonden" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": result.blob.contentDisposition || "inline",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Kon bestand niet laden" }, { status: 500 });
  }
}
