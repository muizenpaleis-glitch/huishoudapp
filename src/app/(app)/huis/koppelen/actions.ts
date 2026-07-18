"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toggleLightRaw } from "@/lib/home-assistant";

export async function testLight(entityId: string) {
  await toggleLightRaw(entityId);
}

export async function assignLampEntity(
  lampId: string,
  entityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clash = await prisma.huisLamp.findFirst({ where: { entityId, NOT: { id: lampId } } });
  if (clash) {
    return { ok: false, error: `Deze lamp is al gekoppeld aan "${clash.naam}".` };
  }
  await prisma.huisLamp.update({ where: { id: lampId }, data: { entityId } });
  revalidatePath("/huis/koppelen");
  revalidatePath("/huis");
  return { ok: true };
}
