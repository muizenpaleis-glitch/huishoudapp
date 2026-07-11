import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { getAppSettings } from "@/lib/settings";
import { deadline as contractDeadline, urgentie as contractUrgentie } from "@/lib/contracten";
import { itemDatum, urgentie as onderhoudUrgentie } from "@/lib/onderhoud";
import { fmtKort, dagenTussen } from "@/lib/format";

const REMIND_COOLDOWN_DAYS = 3;

async function alreadyNotifiedRecently(key: string) {
  const log = await prisma.notificationLog.findUnique({ where: { key } });
  if (!log) return false;
  return dagenTussen(new Date(), log.sentAt) < REMIND_COOLDOWN_DAYS;
}

async function markNotified(key: string) {
  await prisma.notificationLog.upsert({
    where: { key },
    update: { sentAt: new Date() },
    create: { key, sentAt: new Date() },
  });
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (!process.env.NOTIFICATIONS_CRON_SECRET || secret !== process.env.NOTIFICATIONS_CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await getAppSettings();
  if (!settings.contractPush) {
    return NextResponse.json({ sent: 0, reason: "push uitgeschakeld" });
  }

  let sent = 0;

  const contracts = await prisma.contract.findMany({ where: { status: "Actief" } });
  for (const c of contracts) {
    const u = contractUrgentie(c, settings.contractDrempel);
    if (u !== "urgent" && u !== "attentie") continue;
    const key = `contract:${c.id}`;
    if (await alreadyNotifiedRecently(key)) continue;
    const dl = contractDeadline(c);
    const dgn = dl ? dagenTussen(dl, new Date()) : null;
    await sendPushToAll({
      title: "Opzegtermijn nadert",
      body: `${c.naam} (${c.leverancier}) — opzeggen vóór ${fmtKort(dl)}${dgn !== null ? ` (nog ${dgn} dagen)` : ""}.`,
      url: `/contracten/${c.id}`,
    });
    await markNotified(key);
    sent++;
  }

  const items = await prisma.onderhoudItem.findMany();
  for (const it of items) {
    const u = onderhoudUrgentie(it, settings.onderhoudDrempel);
    if (u !== "urgent" && u !== "attentie") continue;
    const key = `onderhoud:${it.id}`;
    if (await alreadyNotifiedRecently(key)) continue;
    const d = itemDatum(it);
    const dgn = d ? dagenTussen(d, new Date()) : null;
    await sendPushToAll({
      title: it.type === "periodiek" ? "Onderhoud nadert" : "Taak nadert",
      body: `${it.naam} — ${fmtKort(d)}${dgn !== null ? ` (nog ${dgn} dagen)` : ""}.`,
      url: `/onderhoud/${it.id}`,
    });
    await markNotified(key);
    sent++;
  }

  return NextResponse.json({ sent });
}
