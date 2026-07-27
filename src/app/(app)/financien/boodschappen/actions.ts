"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { bewaarGeplakt, syncVanGmail, vatSamen } from "@/lib/boodschappen/ingest";
import { ontkoppel } from "@/lib/boodschappen/gmail";
import { EERSTE_JAAR } from "@/lib/boodschappen/engine";

function refresh() {
  revalidatePath("/financien", "layout");
}

export async function plakBonnetje(tekst: string): Promise<{ ok: boolean; melding: string }> {
  if (!tekst.trim()) return { ok: false, melding: "Er is niets geplakt." };
  const r = await bewaarGeplakt(tekst);
  refresh();
  if (r === "nieuw") return { ok: true, melding: "Bonnetje toegevoegd." };
  if (r === "bestond") return { ok: true, melding: "Dit bonnetje stond er al in." };
  if (r === "anders")
    return {
      ok: false,
      melding:
        "Dit is een bestelbevestiging, geen bonnetje. Daar staan nog geen productregels in — gebruik de 'Je bonnetje'-mail die ná de bezorging komt.",
    };
  if (r === "te-oud")
    return {
      ok: false,
      melding: `Dit bonnetje is van vóór ${EERSTE_JAAR}. De module kijkt naar hetzelfde jaar als Financiën.`,
    };
  return {
    ok: false,
    melding:
      "Dit lijkt geen Picnic-bonnetje. Plak de volledige tekst van een 'Je bonnetje'-mail, inclusief de regel 'Hier is het bonnetje bij je bezorging van …'.",
  };
}

export async function syncNu(alles: boolean): Promise<{ ok: boolean; melding: string }> {
  try {
    // Zonder datumgrens haalt hij de hele historie op; de dagelijkse ronde kijkt
    // 30 dagen terug, ruim genoeg omdat bonnetjes na bezorging komen.
    const sinds = alles ? undefined : new Date(Date.now() - 30 * 86400000);
    const r = await syncVanGmail(sinds);
    refresh();
    return { ok: true, melding: vatSamen(r) };
  } catch (e) {
    return { ok: false, melding: e instanceof Error ? e.message : String(e) };
  }
}

export async function ontkoppelGmail() {
  await ontkoppel();
  refresh();
}

export async function verwijderBon(id: string) {
  await prisma.boodschapBon.delete({ where: { id } });
  refresh();
}

// Leeg = terug naar de automatische afleiding, zelfde contract als bij Budgetteren.
export async function setProductCategorie(sleutel: string, categorie: string | null) {
  await prisma.boodschapProduct.upsert({
    where: { sleutel },
    update: { categorie },
    create: { sleutel, categorie },
  });
  await ruimLegeOverrideOp(sleutel);
  refresh();
}

export async function setProductGroep(sleutel: string, groep: string | null) {
  const schoon = groep?.trim() || null;
  await prisma.boodschapProduct.upsert({
    where: { sleutel },
    update: { groep: schoon },
    create: { sleutel, groep: schoon },
  });
  await ruimLegeOverrideOp(sleutel);
  refresh();
}

export async function setProductHoudbaar(sleutel: string, houdbaar: boolean | null) {
  await prisma.boodschapProduct.upsert({
    where: { sleutel },
    update: { houdbaar },
    create: { sleutel, houdbaar },
  });
  await ruimLegeOverrideOp(sleutel);
  refresh();
}

export async function setBulkNegeren(sleutel: string, negeren: boolean) {
  await prisma.boodschapProduct.upsert({
    where: { sleutel },
    update: { bulkNegeren: negeren },
    create: { sleutel, bulkNegeren: negeren },
  });
  await ruimLegeOverrideOp(sleutel);
  refresh();
}

/** Een rij zonder enige afwijking hoort er niet te staan — anders blijft er een
 *  "handmatig"-markering hangen op een product dat gewoon de afleiding volgt. */
async function ruimLegeOverrideOp(sleutel: string) {
  const r = await prisma.boodschapProduct.findUnique({ where: { sleutel } });
  if (r && r.groep == null && r.categorie == null && r.houdbaar == null && !r.bulkNegeren) {
    await prisma.boodschapProduct.delete({ where: { sleutel } });
  }
}
