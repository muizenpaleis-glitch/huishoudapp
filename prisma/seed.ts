import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding…");

  // ── Huishouden ──
  await prisma.subtaak.deleteMany();
  await prisma.vrijeInhoudBlok.deleteMany();
  await prisma.onderhoudLog.deleteMany();
  await prisma.onderhoudItem.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.financeTransactie.deleteMany();
  await prisma.financeIncidenteelProject.deleteMany();
  await prisma.financeJaarlijksItem.deleteMany();
  await prisma.financeCategorieBudget.deleteMany();
  await prisma.financeMaandFactor.deleteMany();
  await prisma.financeMjpResultaat.deleteMany();
  await prisma.financeNetWorth.deleteMany();
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
  const p1 = await prisma.onderhoudItem.create({
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
  const t1 = await prisma.onderhoudItem.create({
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

  // ── Financien ──
  await prisma.financeNetWorth.create({
    data: {
      id: 1,
      buffer: 24850, spaargeld: 9200, beleggingen: 11300,
      startVermogen: 34079, kritiekeGrens: 15000,
      incomeMaand: 8474.92, spendBudgetMaand: 5278.07, spendActualMaand: 5287,
    },
  });

  await prisma.financeMjpResultaat.createMany({
    data: [
      { jaar: 2026, opResultaat: 21741.24 },
      { jaar: 2027, opResultaat: 6250.18 },
      { jaar: 2028, opResultaat: 8779.56 },
      { jaar: 2029, opResultaat: 22996.31 },
      { jaar: 2030, opResultaat: 25044.96 },
      { jaar: 2031, opResultaat: 27037.93 },
    ],
  });

  await prisma.financeMaandFactor.createMany({
    data: [
      { maand: "2026-01", kort: "Jan", lang: "Januari 2026", factor: 0.94 },
      { maand: "2026-02", kort: "Feb", lang: "Februari 2026", factor: 1.03 },
      { maand: "2026-03", kort: "Mrt", lang: "Maart 2026", factor: 0.97 },
      { maand: "2026-04", kort: "Apr", lang: "April 2026", factor: 1.08 },
      { maand: "2026-05", kort: "Mei", lang: "Mei 2026", factor: 0.9 },
      { maand: "2026-06", kort: "Jun", lang: "Juni 2026", factor: 1.11 },
      { maand: "2026-07", kort: "Jul", lang: "Juli 2026", factor: 1.0 },
    ],
  });

  // Full Jaarbegroting category list (precise monthly decimals), with
  // dashboard-display flags/colors for the two cards that surface a subset.
  const categorieen = [
    { label: "Boodschappen", budgetMaandelijks: 500, actualMaandelijks: 540, kleur: "#A9761C", vast: false, inSpendOverzicht: true, inBudgetOverzicht: true, volgorde: 0 },
    { label: "Eten & drinken", budgetMaandelijks: 210, actualMaandelijks: 175, kleur: "#9A6B4E", vast: false, inSpendOverzicht: true, inBudgetOverzicht: true, volgorde: 1 },
    { label: "Huur & hypotheek", budgetMaandelijks: 2174.97, actualMaandelijks: 2175, kleur: "#C4633B", vast: true, inSpendOverzicht: true, inBudgetOverzicht: false, volgorde: 2 },
    { label: "Gas water & licht", budgetMaandelijks: 285.73, actualMaandelijks: 262, kleur: "#B8874A", vast: false, inSpendOverzicht: true, inBudgetOverzicht: true, volgorde: 3 },
    { label: "Internet TV & Bellen", budgetMaandelijks: 50.45, actualMaandelijks: 50.45, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 4 },
    { label: "Verzekeringen", budgetMaandelijks: 149.95, actualMaandelijks: 149.95, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 5 },
    { label: "Vervoer", budgetMaandelijks: 100, actualMaandelijks: 78, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: true, volgorde: 6 },
    { label: "Kinderen", budgetMaandelijks: 682.49, actualMaandelijks: 682, kleur: "#5C7F55", vast: true, inSpendOverzicht: true, inBudgetOverzicht: true, volgorde: 7 },
    { label: "Huishouden & elektronica", budgetMaandelijks: 267.32, actualMaandelijks: 310, kleur: "#2F6E8F", vast: false, inSpendOverzicht: true, inBudgetOverzicht: true, volgorde: 8 },
    { label: "Hobby sport & vrije tijd", budgetMaandelijks: 91, actualMaandelijks: 91, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 9 },
    { label: "Zak- & kleedgeld", budgetMaandelijks: 500, actualMaandelijks: 500, kleur: "#6C5B8C", vast: false, inSpendOverzicht: true, inBudgetOverzicht: false, volgorde: 10 },
    { label: "Verzorging & gezondheid", budgetMaandelijks: 29.17, actualMaandelijks: 29.17, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 11 },
    { label: "Cadeaus", budgetMaandelijks: 75, actualMaandelijks: 75, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 12 },
    { label: "Goede doelen", budgetMaandelijks: 125, actualMaandelijks: 125, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 13 },
    { label: "Lening", budgetMaandelijks: 148.06, actualMaandelijks: 148.06, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 14 },
    { label: "Klussen & onderhoud", budgetMaandelijks: 35, actualMaandelijks: 35, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 15 },
    { label: "Bankkosten", budgetMaandelijks: 3.65, actualMaandelijks: 3.65, kleur: null, vast: false, inSpendOverzicht: false, inBudgetOverzicht: false, volgorde: 16 },
    { label: "Overig", budgetMaandelijks: 643, actualMaandelijks: 643, kleur: "#C9B8A4", vast: false, inSpendOverzicht: true, inBudgetOverzicht: false, volgorde: 17 },
  ];
  for (const c of categorieen) {
    await prisma.financeCategorieBudget.create({ data: c });
  }
  const catByLabel = new Map(
    (await prisma.financeCategorieBudget.findMany()).map((c) => [c.label, c.id]),
  );

  const projects = [
    { name: "Belastingreservering Suus", budget: 6300, year: 2026, done: true, spent: 6300 },
    { name: "Warmtepomp", budget: 11000, year: 2026, done: false, spent: 4200 },
    { name: "Tuinverbouwing", budget: 4831, year: 2026, done: false, spent: 1180 },
    { name: "Kantoor afmaken", budget: 1200, year: 2026, done: true, spent: 1150 },
    { name: "Oven", budget: 900, year: 2026, done: true, spent: 989 },
    { name: "Trapkast bouwen", budget: 750, year: 2026, done: false, spent: 0 },
    { name: "Bedombouw", budget: 450, year: 2026, done: false, spent: 0 },
    { name: "Onvoorzien 2026", budget: 1500, year: 2026, done: false, spent: 213 },
    { name: "Nieuwe badkamer", budget: 12000, year: 2027, done: false, spent: 0 },
    { name: "Onvoorzien 2027", budget: 2000, year: 2027, done: false, spent: 0 },
    { name: "Inductieplaat", budget: 1300, year: 2028, done: false, spent: 0 },
    { name: "Magnetron", budget: 700, year: 2028, done: false, spent: 0 },
    { name: "Tuinverbouwing II", budget: 350, year: 2028, done: false, spent: 0 },
    { name: "Witgoed", budget: 750, year: 2028, done: false, spent: 0 },
    { name: "Onvoorzien 2028", budget: 1800, year: 2028, done: false, spent: 0 },
    { name: "Witgoed II", budget: 750, year: 2029, done: false, spent: 0 },
    { name: "Onvoorzien 2029", budget: 1700, year: 2029, done: false, spent: 0 },
    { name: "Nieuwe auto", budget: 30000, year: 2030, done: false, spent: 0 },
    { name: "Tuinverbouwing III", budget: 750, year: 2030, done: false, spent: 0 },
    { name: "Witgoed III", budget: 750, year: 2030, done: false, spent: 0 },
    { name: "Onvoorzien 2030", budget: 2000, year: 2030, done: false, spent: 0 },
    { name: "Dakkapel", budget: 15000, year: 2031, done: false, spent: 0 },
    { name: "Onvoorzien 2031", budget: 2000, year: 2031, done: false, spent: 0 },
  ];
  for (const p of projects) {
    await prisma.financeIncidenteelProject.create({
      data: { naam: p.name, budget: p.budget, jaar: p.year, done: p.done, besteed: p.spent },
    });
  }
  const projByName = new Map(
    (await prisma.financeIncidenteelProject.findMany()).map((p) => [p.naam, p.id]),
  );

  const yearlySpent2026: Record<string, number> = {
    Vakanties: 6000, Zorgverzekering: 1738, "Gemeentelijke belastingen": 1700,
    "Uitjes en activiteiten": 820, "Schilderwerk huis": 0, "Overige onderhoud huis": 430,
    "Auto onderhoud": 500,
  };
  const yearly = [
    { name: "Vakanties", budget: 8051 },
    { name: "Zorgverzekering", budget: 2980 },
    { name: "Gemeentelijke belastingen", budget: 1700 },
    { name: "Uitjes en activiteiten", budget: 1500 },
    { name: "Schilderwerk huis", budget: 1200 },
    { name: "Overige onderhoud huis", budget: 1500 },
    { name: "Auto onderhoud", budget: 500 },
  ];
  for (const y of yearly) {
    await prisma.financeJaarlijksItem.create({
      data: { naam: y.name, budgetJaarlijks: y.budget, besteed2026: yearlySpent2026[y.name] ?? 0 },
    });
  }
  const yearlyByName = new Map(
    (await prisma.financeJaarlijksItem.findMany()).map((y) => [y.naam, y.id]),
  );

  const triage = [
    { datum: "2026-07-02", naam: "Albert Heijn 1043", omschrijving: "BEA, Betaalpas ALBERT HEIJN 1043 EINDHOVEN,PAS123", bankCat: "Boodschappen", bedrag: -63.42, klasse: "recurring", project: "" },
    { datum: "2026-07-01", naam: "Heattransformers BV", omschrijving: "SEPA Overboeking Heattransformers BV, Warmtepomp termijn 2/4", bankCat: "Klussen & onderhoud", bedrag: -4200.0, klasse: "incidental", project: "Warmtepomp" },
    { datum: "2026-07-01", naam: "Werkgever BV", omschrijving: "SEPA Overboeking Werkgever BV, Salaris juli 2026", bankCat: "Inkomen", bedrag: 4237.46, klasse: "exclude", project: "" },
    { datum: "2026-06-30", naam: "Karwei Bouwmarkt Nuenen", omschrijving: "BEA, Betaalpas KARWEI BOUWMARKT NUENEN,PAS123", bankCat: "Klussen & onderhoud", bedrag: -212.9, klasse: "incidental", project: "Tuinverbouwing" },
    { datum: "2026-06-28", naam: "CZ Zorgverzekering", omschrijving: "SEPA Incasso CZ Groep Zorgverzekeraar, Premie juli", bankCat: "Verzekeringen", bedrag: -248.33, klasse: "yearly", project: "Zorgverzekering" },
    { datum: "2026-06-26", naam: "Basic-Fit", omschrijving: "SEPA Incasso Basic-Fit Nederland BV, Abonnement juli", bankCat: "Hobby sport & vrije tijd", bedrag: -24.99, klasse: "recurring", project: "" },
    { datum: "2026-06-24", naam: "Booking.com", omschrijving: "BEA, iDEAL Booking.com Amsterdam, Aanbetaling zomervakantie", bankCat: "Vakantie", bedrag: -650.0, klasse: "yearly", project: "Vakanties" },
    { datum: "2026-06-20", naam: "Trapkast Meubelmaker", omschrijving: "SEPA Overboeking J. de Wit Meubelmakerij, Aanbetaling trapkast", bankCat: "Klussen & onderhoud", bedrag: -375.0, klasse: "incidental", project: "Trapkast bouwen" },
  ] as const;

  for (const t of triage) {
    await prisma.financeTransactie.create({
      data: {
        datum: new Date(t.datum),
        naam: t.naam,
        omschrijving: t.omschrijving,
        bankCategorie: t.bankCat,
        bedrag: t.bedrag,
        klasse: t.klasse,
        categorieBudgetId: catByLabel.get(t.bankCat) ?? null,
        projectId: t.klasse === "incidental" ? projByName.get(t.project) ?? null : null,
        jaarlijksItemId: t.klasse === "yearly" ? yearlyByName.get(t.project) ?? null : null,
      },
    });
  }

  console.log("Seed done.", { iris: iris.id, daan: daan.id, p1: p1.id, t1: t1.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
