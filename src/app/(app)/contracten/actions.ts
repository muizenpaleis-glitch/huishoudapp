"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ContractCategorie, ContractStatus, OpzegType } from "@/generated/prisma/client";

export type ContractFormValues = {
  naam: string;
  leverancier: string;
  categorie: ContractCategorie;
  startdatum: string;
  einddatum: string;
  opzegType: OpzegType;
  opzegMaanden: number;
  opzegDatum: string;
  autoRenewal: boolean;
  status: ContractStatus;
  docNaam: string;
  docUrl: string;
  notitie: string;
  beheerderId: string;
};

export async function saveContract(id: string | null, values: ContractFormValues) {
  if (!values.naam || !values.einddatum) {
    throw new Error("Naam en einddatum zijn verplicht");
  }
  const data = {
    naam: values.naam,
    leverancier: values.leverancier,
    categorie: values.categorie,
    startdatum: values.startdatum ? new Date(values.startdatum) : null,
    einddatum: new Date(values.einddatum),
    opzegType: values.opzegType,
    opzegMaanden: values.opzegMaanden,
    opzegDatum: values.opzegDatum ? new Date(values.opzegDatum) : null,
    autoRenewal: values.autoRenewal,
    status: values.status,
    docNaam: values.docNaam || null,
    docUrl: values.docUrl || null,
    notitie: values.notitie || null,
    beheerderId: values.beheerderId || null,
  };
  let contractId = id;
  if (id) {
    await prisma.contract.update({ where: { id }, data });
  } else {
    const created = await prisma.contract.create({ data });
    contractId = created.id;
  }
  revalidatePath("/contracten");
  revalidatePath(`/contracten/${contractId}`);
  redirect(`/contracten/${contractId}`);
}

export async function deleteContract(id: string) {
  await prisma.contract.delete({ where: { id } });
  revalidatePath("/contracten");
  redirect("/contracten");
}

export async function updateStatus(id: string, status: ContractStatus) {
  await prisma.contract.update({ where: { id }, data: { status } });
  revalidatePath("/contracten");
  revalidatePath(`/contracten/${id}`);
}

export async function updateNotificationSettings(values: {
  contractDrempel: number;
  contractMail: boolean;
  contractPush: boolean;
}) {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: values,
    create: { id: 1, onderhoudDrempel: 14, ...values },
  });
  revalidatePath("/contracten");
  revalidatePath("/contracten/instellingen");
}
