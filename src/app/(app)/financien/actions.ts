"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { TransactieKlasse } from "@/generated/prisma/client";

function refresh() {
  revalidatePath("/financien");
}

export async function reclassifyTransaction(id: string, klasse: TransactieKlasse) {
  const clearsProject = klasse !== "incidental" && klasse !== "yearly";
  await prisma.financeTransactie.update({
    where: { id },
    data: {
      klasse,
      ...(clearsProject ? { projectId: null, jaarlijksItemId: null } : {}),
    },
  });
  refresh();
}

export async function assignTransactionProject(
  id: string,
  klasse: TransactieKlasse,
  targetId: string,
) {
  await prisma.financeTransactie.update({
    where: { id },
    data: {
      projectId: klasse === "incidental" ? targetId : null,
      jaarlijksItemId: klasse === "yearly" ? targetId : null,
    },
  });
  refresh();
}

export async function updateNetWorthField(field: "spaargeld" | "beleggingen", value: number) {
  await prisma.financeNetWorth.update({ where: { id: 1 }, data: { [field]: value } });
  refresh();
}

export async function resetTriage() {
  await prisma.financeTransactie.updateMany({
    data: { klasse: "recurring", projectId: null, jaarlijksItemId: null },
  });
  refresh();
}
