"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isoPlusMaanden, intervalLabel } from "@/lib/onderhoud";
import type {
  OnderhoudCategorie,
  OnderhoudPrioriteit,
  OnderhoudType,
  TaakStatus,
} from "@/generated/prisma/client";

function refresh(id?: string) {
  revalidatePath("/onderhoud");
  revalidatePath("/onderhoud/todos");
  if (id) revalidatePath(`/onderhoud/${id}`);
}

export async function logUitvoering(itemId: string) {
  const item = await prisma.onderhoudItem.findUniqueOrThrow({ where: { id: itemId } });
  const vandaag = new Date();
  await prisma.$transaction([
    prisma.onderhoudLog.create({
      data: { itemId, datum: vandaag, notitie: "Uitgevoerd" },
    }),
    prisma.onderhoudItem.update({
      where: { id: itemId },
      data: { volgende: isoPlusMaanden(vandaag, item.intervalMaanden || 12) },
    }),
  ]);
  refresh(itemId);
}

export async function wijzigTaakStatus(id: string, status: TaakStatus) {
  await prisma.onderhoudItem.update({ where: { id }, data: { status } });
  refresh(id);
}

export async function toggleToegewezen(id: string, memberId: string) {
  const item = await prisma.onderhoudItem.findUniqueOrThrow({ where: { id } });
  await prisma.onderhoudItem.update({
    where: { id },
    data: { toegewezenId: item.toegewezenId === memberId ? null : memberId },
  });
  refresh(id);
}

export async function toggleSubtaak(subtaakId: string, itemId: string) {
  const st = await prisma.subtaak.findUniqueOrThrow({ where: { id: subtaakId } });
  await prisma.subtaak.update({ where: { id: subtaakId }, data: { klaar: !st.klaar } });
  refresh(itemId);
}

export async function cycleSubtaakAssignee(subtaakId: string, itemId: string, memberIds: string[]) {
  const st = await prisma.subtaak.findUniqueOrThrow({ where: { id: subtaakId } });
  const i = st.toegewezenId ? memberIds.indexOf(st.toegewezenId) : -1;
  const next = memberIds[(i + 1) % memberIds.length];
  await prisma.subtaak.update({ where: { id: subtaakId }, data: { toegewezenId: next } });
  refresh(itemId);
}

export async function addSubtaak(itemId: string, tekst: string, toegewezenId: string) {
  if (!tekst.trim()) return;
  const count = await prisma.subtaak.count({ where: { itemId } });
  await prisma.subtaak.create({
    data: { itemId, tekst: tekst.trim(), toegewezenId, volgorde: count },
  });
  refresh(itemId);
}

export type OnderhoudFormValues = {
  type: OnderhoudType;
  naam: string;
  categorie: OnderhoudCategorie;
  prio: OnderhoudPrioriteit;
  intervalMaanden: number;
  volgende: string;
  streefdatum: string;
  toegewezenId: string;
  doc: string;
  docUrl: string;
  notitie: string;
};

export async function createOnderhoudItem(values: OnderhoudFormValues) {
  if (!values.naam.trim()) throw new Error("Naam is verplicht");
  const data =
    values.type === "periodiek"
      ? {
          type: "periodiek" as const,
          naam: values.naam.trim(),
          categorie: values.categorie,
          prio: values.prio,
          intervalMaanden: values.intervalMaanden,
          intervalLabel: intervalLabel(values.intervalMaanden),
          volgende: values.volgende ? new Date(values.volgende) : new Date(),
          doc: values.doc || null,
          docUrl: values.docUrl || null,
          notitie: values.notitie || null,
        }
      : {
          type: "taak" as const,
          naam: values.naam.trim(),
          categorie: values.categorie,
          prio: values.prio,
          status: "Te_doen" as const,
          streefdatum: values.streefdatum ? new Date(values.streefdatum) : null,
          toegewezenId: values.toegewezenId || null,
          doc: values.doc || null,
          docUrl: values.docUrl || null,
          notitie: values.notitie || null,
        };
  const created = await prisma.onderhoudItem.create({ data });
  refresh();
  redirect(`/onderhoud/${created.id}`);
}

export async function updateOnderhoudItem(id: string, values: OnderhoudFormValues) {
  if (!values.naam.trim()) throw new Error("Naam is verplicht");
  const data =
    values.type === "periodiek"
      ? {
          naam: values.naam.trim(),
          categorie: values.categorie,
          prio: values.prio,
          intervalMaanden: values.intervalMaanden,
          intervalLabel: intervalLabel(values.intervalMaanden),
          volgende: values.volgende ? new Date(values.volgende) : new Date(),
          doc: values.doc || null,
          docUrl: values.docUrl || null,
          notitie: values.notitie || null,
        }
      : {
          naam: values.naam.trim(),
          categorie: values.categorie,
          prio: values.prio,
          streefdatum: values.streefdatum ? new Date(values.streefdatum) : null,
          toegewezenId: values.toegewezenId || null,
          doc: values.doc || null,
          docUrl: values.docUrl || null,
          notitie: values.notitie || null,
        };
  await prisma.onderhoudItem.update({ where: { id }, data });
  refresh(id);
  redirect(`/onderhoud/${id}`);
}

export async function deleteOnderhoudItem(id: string) {
  await prisma.onderhoudItem.delete({ where: { id } });
  refresh();
  redirect("/onderhoud");
}

export async function updateOnderhoudNotificaties(values: {
  onderhoudDrempel: number;
  contractPush: boolean;
}) {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: values,
    create: { id: 1, contractDrempel: 60, contractMail: true, ...values },
  });
  revalidatePath("/onderhoud");
  revalidatePath("/onderhoud/instellingen");
  revalidatePath("/contracten/instellingen");
}
