import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:huishouden@onshuis.nl",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPushToAll(payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      ),
    ),
  );
  const deadEndpoints = subs.filter((s, i) => {
    const r = results[i];
    return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
  });
  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: deadEndpoints.map((s) => s.id) } },
    });
  }
  return results;
}
