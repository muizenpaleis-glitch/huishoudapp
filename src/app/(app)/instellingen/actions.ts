"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type LidFormValues = {
  naam: string;
  email: string;
  kleur: string;
};

export async function saveLid(id: string | null, values: LidFormValues) {
  if (!values.naam.trim()) throw new Error("Naam is verplicht");
  const data = {
    naam: values.naam.trim(),
    email: values.email.trim() || null,
    kleur: values.kleur,
  };
  if (id) {
    await prisma.householdMember.update({ where: { id }, data });
  } else {
    await prisma.householdMember.create({ data });
  }
  revalidatePath("/instellingen/huishouden");
  revalidatePath("/instellingen");
  redirect("/instellingen/huishouden");
}

export async function deleteLid(id: string) {
  const count = await prisma.householdMember.count();
  if (count <= 1) throw new Error("Het laatste lid kan niet verwijderd worden");
  await prisma.householdMember.delete({ where: { id } });
  revalidatePath("/instellingen/huishouden");
  revalidatePath("/instellingen");
  redirect("/instellingen/huishouden");
}
