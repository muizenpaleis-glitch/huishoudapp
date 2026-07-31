"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function refresh() {
  revalidatePath("/financien", "layout");
}

export type LeningPatch = Partial<{
  naam: string;
  groep: string;
  leningnummer: string | null;
  verstrekker: string | null;
  vorm: string;
  hoofdsom: number;
  rente: number;
  startdatum: string;
  looptijdMnd: number;
  peildatum: string;
  restant: number;
  maandTotaal: number | null;
  maandRente: number | null;
  maandAflossing: number | null;
  renteBetaald: number | null;
  aftrekbaar: boolean;
  notitie: string | null;
}>;

export async function updateLening(id: string, patch: LeningPatch) {
  await prisma.lening.update({ where: { id }, data: patch });
  refresh();
}

export async function addLening() {
  const n = await prisma.lening.count();
  await prisma.lening.create({
    data: {
      naam: "Nieuwe lening",
      groep: "Overig",
      hoofdsom: 0,
      rente: 0,
      startdatum: new Date().toISOString().slice(0, 10),
      looptijdMnd: 120,
      peildatum: new Date().toISOString().slice(0, 10),
      restant: 0,
      volgorde: n,
    },
  });
  refresh();
}

export async function deleteLening(id: string) {
  await prisma.lening.delete({ where: { id } });
  refresh();
}

export async function updateInstellingen(patch: {
  aftrekPercentage?: number;
  eigenwoningforfait?: number;
}) {
  await prisma.leningInstellingen.upsert({
    where: { id: 1 },
    update: patch,
    create: { id: 1, ...patch },
  });
  refresh();
}

// Eenmalig vullen met de leningdelen van het overzicht. De startdatum van de
// hypotheekdelen staat niet op dat overzicht en is afgeleid uit de einddatum
// minus de looptijd — controleer die, want de rentesom hangt eraan.
const START: Omit<Parameters<typeof prisma.lening.create>[0]["data"], "id">[] = [
  {
    naam: "Merius deel 2 · kapitaal en rente", groep: "Hypotheek", leningnummer: "3040065.2",
    verstrekker: "Merius", vorm: "annuiteit", hoofdsom: 296172, rente: 4.45,
    startdatum: "2024-09-01", looptijdMnd: 360, peildatum: "2026-07-01", restant: 286740.95,
    maandTotaal: 1491.87, maandRente: 1063.33, maandAflossing: 428.54, aftrekbaar: true, volgorde: 0,
  },
  {
    naam: "Merius deel 4 · kapitaal en rente", groep: "Hypotheek", leningnummer: "3040065.4",
    verstrekker: "Merius", vorm: "annuiteit", hoofdsom: 144317, rente: 2.7,
    startdatum: "2018-08-01", looptijdMnd: 360, peildatum: "2026-07-01", restant: 135866.87,
    maandTotaal: 683.1, maandRente: 305.7, maandAflossing: 377.4, aftrekbaar: true, volgorde: 1,
    notitie: "Rentevaste periode loopt af; de maandlast is onderweg herrekend, dus het schema kent de historie niet volledig.",
  },
  {
    naam: "Duurzaamheidslening zonnepanelen", groep: "Zonnepanelen", leningnummer: "3114364",
    vorm: "annuiteit", hoofdsom: 7139, rente: 1.7, startdatum: "2024-10-07", looptijdMnd: 120,
    peildatum: "2026-07-01", restant: 6031.75, maandTotaal: 64.73, maandRente: 8.54,
    maandAflossing: 56.19, aftrekbaar: true, volgorde: 2,
  },
  {
    naam: "Duurzaamheidslening warmtepomp I", groep: "Warmtepomp", leningnummer: "3121349",
    vorm: "annuiteit", hoofdsom: 6000, rente: 1.7, startdatum: "2026-02-09", looptijdMnd: 120,
    peildatum: "2026-07-01", restant: 5815.95, maandTotaal: 54.41, maandRente: 8.23,
    maandAflossing: 46.18, aftrekbaar: true, volgorde: 3,
  },
  {
    naam: "Duurzaamheidslening warmtepomp II", groep: "Warmtepomp", leningnummer: "3122442",
    vorm: "annuiteit", hoofdsom: 6000, rente: 1.7, startdatum: "2026-04-03", looptijdMnd: 120,
    peildatum: "2026-07-01", restant: 5908.11, maandTotaal: 54.41, maandRente: 8.36,
    maandAflossing: 46.05, aftrekbaar: true, volgorde: 4,
  },
];

export async function vulStartgegevens(): Promise<{ ok: boolean; melding: string }> {
  const bestaand = await prisma.lening.count();
  if (bestaand > 0) {
    return { ok: false, melding: "Er staan al leningen in. Verwijder ze eerst als je opnieuw wilt beginnen." };
  }
  for (const d of START) await prisma.lening.create({ data: d });
  await prisma.leningInstellingen.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  refresh();
  return { ok: true, melding: `${START.length} leningdelen toegevoegd. Controleer de startdata van de hypotheekdelen.` };
}
