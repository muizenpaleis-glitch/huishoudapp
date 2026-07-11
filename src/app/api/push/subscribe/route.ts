import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { endpoint, keys, memberId } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    memberId?: string;
  };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, memberId: memberId ?? null },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, memberId: memberId ?? null },
  });
  return NextResponse.json({ ok: true });
}
