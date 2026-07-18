"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  turnLight,
  setLightBrightness,
  setLightColorTempKelvin,
  kleurTempToKelvin,
  getLiveLightState,
} from "@/lib/home-assistant";
import type { KleurTemp, LaadpaalStatus } from "@/generated/prisma/client";

function refresh() {
  revalidatePath("/huis");
}

export async function toggleLamp(id: string) {
  const lamp = await prisma.huisLamp.findUniqueOrThrow({ where: { id } });
  if (lamp.entityId) {
    // Flip based on Home Assistant's real current state, not the stored
    // `aan` column — that column is never kept in sync for linked lamps
    // (state always lives in HA), so it can't be trusted to know which
    // direction to toggle.
    const live = await getLiveLightState(lamp.entityId);
    const isOn = live?.aan ?? lamp.aan;
    await turnLight(lamp.entityId, !isOn);
  } else {
    await prisma.huisLamp.update({ where: { id }, data: { aan: !lamp.aan } });
  }
  refresh();
}

export async function setLampHelderheid(id: string, helderheid: number) {
  const clamped = Math.max(1, Math.min(100, Math.round(helderheid)));
  const lamp = await prisma.huisLamp.findUniqueOrThrow({ where: { id } });
  if (lamp.entityId) {
    await setLightBrightness(lamp.entityId, clamped);
  } else {
    await prisma.huisLamp.update({ where: { id }, data: { helderheid: clamped, aan: clamped > 0 } });
  }
  refresh();
}

export async function setLampKleurTemp(id: string, kleurTemp: KleurTemp) {
  const lamp = await prisma.huisLamp.findUniqueOrThrow({ where: { id } });
  if (lamp.entityId) {
    await setLightColorTempKelvin(lamp.entityId, kleurTempToKelvin(kleurTemp));
  } else {
    await prisma.huisLamp.update({ where: { id }, data: { kleurTemp } });
  }
  refresh();
}

export async function toggleFavoriet(key: string) {
  const existing = await prisma.huisFavoriet.findUnique({ where: { key } });
  if (existing) {
    await prisma.huisFavoriet.delete({ where: { key } });
  } else {
    const count = await prisma.huisFavoriet.count();
    await prisma.huisFavoriet.create({ data: { key, volgorde: count } });
  }
  refresh();
}

export async function moveFavoriet(key: string, richting: -1 | 1) {
  const favorieten = await prisma.huisFavoriet.findMany({ orderBy: { volgorde: "asc" } });
  const i = favorieten.findIndex((f) => f.key === key);
  const j = i + richting;
  if (i === -1 || j < 0 || j >= favorieten.length) return;
  const a = favorieten[i];
  const b = favorieten[j];
  await prisma.$transaction([
    prisma.huisFavoriet.update({ where: { key: a.key }, data: { volgorde: b.volgorde } }),
    prisma.huisFavoriet.update({ where: { key: b.key }, data: { volgorde: a.volgorde } }),
  ]);
  refresh();
}

export async function setLaadpaalStatus(status: LaadpaalStatus) {
  await prisma.huisLaadpaal.update({ where: { id: 1 }, data: { status } });
  refresh();
}

export async function toggleAutomatisering() {
  const a = await prisma.huisAutomatisering.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.huisAutomatisering.update({ where: { id: 1 }, data: { aan: !a.aan } });
  refresh();
}

export async function automatiseringHandmatigeActie(actie: "Boost warmwater" | "Auto laden") {
  await prisma.huisAutomatisering.update({
    where: { id: 1 },
    data: { laatsteActie: actie, laatsteActieOp: new Date() },
  });
  if (actie === "Auto laden") {
    await prisma.huisLaadpaal.update({ where: { id: 1 }, data: { status: "laden" } });
  }
  refresh();
}
