import type { PrismaClient } from "@/generated/prisma/client";
import { seedFinance } from "@/lib/finance/seed";

export async function seedDatabase(prisma: PrismaClient) {
  await seedHuis(prisma);
  await seedFinance(prisma);

  // ── Huishouden ──
  await prisma.subtaak.deleteMany();
  await prisma.vrijeInhoudBlok.deleteMany();
  await prisma.onderhoudLog.deleteMany();
  await prisma.onderhoudItem.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.appSettings.deleteMany();

  const iris = await prisma.householdMember.create({
    data: { naam: "Iris", email: "iris@onshuis.nl", kleur: "#C4633B" },
  });
  const daan = await prisma.householdMember.create({
    data: { naam: "Daan", email: "daan@onshuis.nl", kleur: "#5C7F55" },
  });

  await prisma.appSettings.create({
    data: { id: 1, contractDrempel: 60, contractMail: true, contractPush: false, onderhoudDrempel: 14 },
  });

  // ── Contracten ──
  await prisma.contract.createMany({
    data: [
      {
        naam: "Energiecontract", leverancier: "Vattenfall", categorie: "Energie",
        startdatum: new Date("2025-09-01"), einddatum: new Date("2026-08-31"),
        opzegType: "periode", opzegMaanden: 1, autoRenewal: true, status: "Actief",
        docNaam: "energiecontract-vattenfall.pdf",
      },
      {
        naam: "Autoverzekering", leverancier: "ANWB", categorie: "Verzekering",
        startdatum: new Date("2024-10-01"), einddatum: new Date("2026-09-30"),
        opzegType: "periode", opzegMaanden: 1, autoRenewal: true, status: "Actief",
        docNaam: "polis-anwb.pdf",
      },
      {
        naam: "Internet & TV", leverancier: "Odido", categorie: "Abonnement",
        startdatum: new Date("2024-11-15"), einddatum: new Date("2026-11-15"),
        opzegType: "periode", opzegMaanden: 1, autoRenewal: true, status: "Actief",
      },
      {
        naam: "Inboedelverzekering", leverancier: "Interpolis", categorie: "Verzekering",
        startdatum: new Date("2023-01-01"), einddatum: new Date("2027-01-01"),
        opzegType: "datum", opzegDatum: new Date("2026-12-01"), opzegMaanden: 1,
        autoRenewal: true, status: "Actief", docNaam: "polis-interpolis.pdf",
      },
      {
        naam: "Sportschool", leverancier: "Basic-Fit", categorie: "Abonnement",
        startdatum: new Date("2025-02-01"), einddatum: new Date("2027-02-01"),
        opzegType: "periode", opzegMaanden: 1, autoRenewal: true, status: "Actief",
      },
      {
        naam: "CV-onderhoud", leverancier: "Feenstra", categorie: "Overig",
        startdatum: new Date("2024-03-01"), einddatum: new Date("2027-03-01"),
        opzegType: "periode", opzegMaanden: 2, autoRenewal: true, status: "Actief",
        docNaam: "contract-feenstra.pdf",
      },
      {
        naam: "Mobiel abonnement", leverancier: "Vodafone", categorie: "Abonnement",
        startdatum: new Date("2024-08-01"), einddatum: new Date("2026-07-31"),
        opzegType: "periode", opzegMaanden: 1, autoRenewal: false, status: "Opgezegd",
      },
    ],
  });

  // ── Onderhoud: periodiek ──
  await prisma.onderhoudItem.create({
    data: {
      type: "periodiek", naam: "CV-ketel onderhoud", categorie: "Apparaten", prio: "Hoog",
      doc: "handleiding-cv-ketel.pdf", intervalMaanden: 12, intervalLabel: "Elk jaar",
      volgende: new Date("2026-07-10"),
      logs: {
        create: [
          { datum: new Date("2025-07-08"), notitie: "Beurt door Feenstra, filter vervangen", doc: "bon-feenstra-2025.pdf" },
          { datum: new Date("2024-07-02") },
        ],
      },
    },
  });
  await prisma.onderhoudItem.create({
    data: {
      type: "periodiek", naam: "Auto APK + beurt", categorie: "Auto", prio: "Hoog",
      intervalMaanden: 12, intervalLabel: "Elk jaar", volgende: new Date("2026-08-15"),
      logs: { create: [{ datum: new Date("2025-08-10"), notitie: "APK goedgekeurd, remblokken vervangen" }] },
    },
  });
  await prisma.onderhoudItem.create({
    data: {
      type: "periodiek", naam: "Dakgoten reinigen", categorie: "Huis", prio: "Gemiddeld",
      intervalMaanden: 6, intervalLabel: "Elke 6 maanden", volgende: new Date("2026-10-01"),
      logs: { create: [{ datum: new Date("2026-04-03") }] },
    },
  });

  // ── Onderhoud: taken ──
  await prisma.onderhoudItem.create({
    data: {
      type: "taak", naam: "Lekkende kraan badkamer", categorie: "Huis", prio: "Hoog",
      status: "Mee_bezig", streefdatum: new Date("2026-07-18"), toegewezenId: daan.id,
      doc: "foto-lekkage.jpg",
      notitie: "Kraan druppelt bij warm water. Vermoedelijk keramisch binnenwerk — type Grohe 34558. Eerst hoofdkraan dicht!",
      notitieKort: "Kitkleur: manhattan-grijs, zelfde als toilet.",
      subtaken: {
        create: [
          { tekst: "Onderdeel bestellen", klaar: true, toegewezenId: daan.id, volgorde: 0 },
          { tekst: "Kraan demonteren", klaar: false, toegewezenId: daan.id, volgorde: 1 },
          { tekst: "Kitrand vervangen", klaar: false, toegewezenId: iris.id, volgorde: 2 },
        ],
      },
      vrijeInhoud: {
        create: [
          { kind: "tekst", volgorde: 0, tekst: "Kraan druppelt bij warm water. Vermoedelijk keramisch binnenwerk — type Grohe 34558. Eerst hoofdkraan dicht!" },
          { kind: "foto", volgorde: 1, label: "Foto van de situatie" },
          { kind: "foto", volgorde: 2, label: "Inspiratie of offerte" },
        ],
      },
    },
  });
  await prisma.onderhoudItem.create({
    data: {
      type: "taak", naam: "Schutting verven", categorie: "Tuin", prio: "Gemiddeld",
      status: "Te_doen", streefdatum: new Date("2026-09-01"), toegewezenId: iris.id,
      notitie: "Richting zachtgrijs of saliegroen — eerst een proefplankje doen.",
      notitieKort: "2 dagen droog weer nodig.",
      subtaken: {
        create: [
          { tekst: "Kleur kiezen", klaar: true, toegewezenId: iris.id, volgorde: 0 },
          { tekst: "Beits kopen", klaar: false, toegewezenId: daan.id, volgorde: 1 },
        ],
      },
      vrijeInhoud: {
        create: [
          { kind: "tekst", volgorde: 0, tekst: "Richting zachtgrijs of saliegroen — eerst een proefplankje doen." },
          { kind: "foto", volgorde: 1, label: "Foto van de situatie" },
          { kind: "foto", volgorde: 2, label: "Inspiratie of offerte" },
        ],
      },
    },
  });
  await prisma.onderhoudItem.create({
    data: {
      type: "taak", naam: "Zolder opruimen", categorie: "Huis", prio: "Laag",
      status: "Te_doen",
    },
  });

  // Huis is seeded independently — see seedHuis() below.
}

// Demo data for the Huis module — no live Home Assistant connection yet.
// Kept separate from seedDatabase() so it can be (re)run on its own: a
// deploy that adds the Huis tables to an already-seeded production database
// needs to backfill just these rows without touching real household data.
export async function seedHuis(prisma: PrismaClient) {
  await prisma.huisFavoriet.deleteMany();
  await prisma.huisLaadSessie.deleteMany();
  await prisma.huisLaadpaal.deleteMany();
  await prisma.huisAutomatisering.deleteMany();
  await prisma.huisEnergieMeting.deleteMany();
  await prisma.huisEnergieStatus.deleteMany();
  await prisma.huisCamera.deleteMany();
  await prisma.huisLamp.deleteMany();

  const lampen = [
    { id: "vloerlamp", naam: "Vloerlamp", kamer: "Woonkamer", aan: true, helderheid: 70, kleurTemp: "warm" as const },
    { id: "leeslamp", naam: "Leeslamp", kamer: "Woonkamer", aan: false, helderheid: 40, kleurTemp: "neutraal" as const },
    { id: "plafondspots", naam: "Plafondspots", kamer: "Woonkamer", aan: true, helderheid: 45, kleurTemp: "neutraal" as const },
    { id: "werkblad", naam: "Werkbladverlichting", kamer: "Keuken", aan: true, helderheid: 85, kleurTemp: "koel" as const },
    { id: "eettafel", naam: "Eettafellamp", kamer: "Keuken", aan: false, helderheid: 55, kleurTemp: "warm" as const },
    { id: "nachtlampje", naam: "Nachtlampje", kamer: "Slaapkamer", aan: false, helderheid: 20, kleurTemp: "warm" as const },
    { id: "kastspot", naam: "Kastspot", kamer: "Slaapkamer", aan: false, helderheid: 60, kleurTemp: "neutraal" as const },
    { id: "bureaulamp", naam: "Bureaulamp", kamer: "Kantoor", aan: true, helderheid: 75, kleurTemp: "koel" as const },
    { id: "tuinverlichting", naam: "Tuinverlichting", kamer: "Tuin", aan: true, helderheid: 65, kleurTemp: "warm" as const },
    { id: "buitenlamp", naam: "Buitenlamp voordeur", kamer: "Tuin", aan: true, helderheid: 90, kleurTemp: "neutraal" as const },
  ];
  const lampByKey = new Map<string, string>();
  for (const [i, l] of lampen.entries()) {
    const created = await prisma.huisLamp.create({
      data: { naam: l.naam, kamer: l.kamer, aan: l.aan, helderheid: l.helderheid, kleurTemp: l.kleurTemp, volgorde: i },
    });
    lampByKey.set(l.id, created.id);
  }

  const vandaag = new Date();
  const metBeweging = (uur: number, minuut: number) => {
    const d = new Date(vandaag);
    d.setHours(uur, minuut, 0, 0);
    return d;
  };
  await prisma.huisCamera.createMany({
    data: [
      { naam: "Voordeur", laatsteBeweging: metBeweging(14, 32), volgorde: 0 },
      { naam: "Oprit", laatsteBeweging: metBeweging(11, 5), volgorde: 1 },
      { naam: "Achtertuin", laatsteBeweging: null, volgorde: 2 },
    ],
  });

  await prisma.huisEnergieStatus.create({
    data: {
      id: 1,
      verbruikNuKw: 1.8, opwekNuKw: 2.4, terugleveringNuKw: 0.6,
      verbruikVandaagKwh: 8.3, opwekVandaagKwh: 7.0, teruggeleverdVandaagKwh: 3.2,
      warmtepompVandaagKwh: 4.2, warmtepompBijgewerkt: new Date(vandaag.getTime() - 22 * 60000),
    },
  });

  const series: { periode: "dag" | "week" | "maand"; punten: { label: string; verbruik: number; opwek: number }[] }[] = [
    {
      periode: "dag",
      punten: [
        { label: "00u", verbruik: 0.4, opwek: 0 }, { label: "04u", verbruik: 0.3, opwek: 0 },
        { label: "08u", verbruik: 1.1, opwek: 0.8 }, { label: "12u", verbruik: 1.6, opwek: 3.4 },
        { label: "16u", verbruik: 1.9, opwek: 2.6 }, { label: "20u", verbruik: 2.2, opwek: 0.2 },
        { label: "23u", verbruik: 0.8, opwek: 0 },
      ],
    },
    {
      periode: "week",
      punten: [
        { label: "Ma", verbruik: 13.8, opwek: 19.4 }, { label: "Di", verbruik: 15.2, opwek: 21.6 },
        { label: "Wo", verbruik: 12.4, opwek: 14.1 }, { label: "Do", verbruik: 16.9, opwek: 22.7 },
        { label: "Vr", verbruik: 14.2, opwek: 22.7 }, { label: "Za", verbruik: 18.6, opwek: 17.8 },
        { label: "Zo", verbruik: 17.1, opwek: 20.2 },
      ],
    },
    {
      periode: "maand",
      punten: [
        { label: "Wk 1", verbruik: 96.4, opwek: 132.8 }, { label: "Wk 2", verbruik: 102.1, opwek: 118.6 },
        { label: "Wk 3", verbruik: 89.7, opwek: 141.2 }, { label: "Wk 4", verbruik: 108.3, opwek: 126.9 },
      ],
    },
  ];
  for (const s of series) {
    for (const [i, p] of s.punten.entries()) {
      await prisma.huisEnergieMeting.create({
        data: { periode: s.periode, label: p.label, verbruik: p.verbruik, opwek: p.opwek, volgorde: i },
      });
    }
  }

  await prisma.huisLaadpaal.create({
    data: {
      id: 1, status: "laden", huidigVermogenKw: 7.4,
      sessies: {
        create: [
          { datum: new Date(vandaag.getTime() - 1 * 86400000), duurMinuten: 192, kwh: 24.6 },
          { datum: new Date(vandaag.getTime() - 3 * 86400000), duurMinuten: 160, kwh: 19.8 },
          { datum: new Date(vandaag.getTime() - 6 * 86400000), duurMinuten: 245, kwh: 31.2 },
        ],
      },
    },
  });

  await prisma.huisAutomatisering.create({ data: { id: 1, aan: true } });

  await prisma.huisFavoriet.createMany({
    data: [
      { key: `lamp:${lampByKey.get("vloerlamp")}`, volgorde: 0 },
      { key: "laadpaal", volgorde: 1 },
      { key: "automatisering", volgorde: 2 },
    ],
  });
}
