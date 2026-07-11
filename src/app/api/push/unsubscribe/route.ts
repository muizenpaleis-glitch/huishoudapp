import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { endpoint } = (await req.json()) as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
