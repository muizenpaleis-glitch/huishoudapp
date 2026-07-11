-- CreateEnum
CREATE TYPE "ContractCategorie" AS ENUM ('Energie', 'Verzekering', 'Abonnement', 'Overig');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('Actief', 'Opgezegd', 'Verlopen');

-- CreateEnum
CREATE TYPE "OpzegType" AS ENUM ('periode', 'datum');

-- CreateEnum
CREATE TYPE "OnderhoudType" AS ENUM ('periodiek', 'taak');

-- CreateEnum
CREATE TYPE "OnderhoudCategorie" AS ENUM ('Huis', 'Apparaten', 'Auto', 'Tuin', 'Overig');

-- CreateEnum
CREATE TYPE "OnderhoudPrioriteit" AS ENUM ('Hoog', 'Gemiddeld', 'Laag');

-- CreateEnum
CREATE TYPE "TaakStatus" AS ENUM ('Te doen', 'Mee bezig', 'Klaar');

-- CreateEnum
CREATE TYPE "VrijeInhoudKind" AS ENUM ('tekst', 'foto');

-- CreateEnum
CREATE TYPE "TransactieKlasse" AS ENUM ('recurring', 'yearly', 'incidental', 'exclude');

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "email" TEXT,
    "kleur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "contractDrempel" INTEGER NOT NULL DEFAULT 60,
    "contractMail" BOOLEAN NOT NULL DEFAULT true,
    "contractPush" BOOLEAN NOT NULL DEFAULT false,
    "onderhoudDrempel" INTEGER NOT NULL DEFAULT 14,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "leverancier" TEXT NOT NULL,
    "categorie" "ContractCategorie" NOT NULL,
    "startdatum" TIMESTAMP(3),
    "einddatum" TIMESTAMP(3) NOT NULL,
    "opzegType" "OpzegType" NOT NULL DEFAULT 'periode',
    "opzegMaanden" INTEGER NOT NULL DEFAULT 1,
    "opzegDatum" TIMESTAMP(3),
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContractStatus" NOT NULL DEFAULT 'Actief',
    "docNaam" TEXT,
    "beheerderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnderhoudItem" (
    "id" TEXT NOT NULL,
    "type" "OnderhoudType" NOT NULL,
    "naam" TEXT NOT NULL,
    "categorie" "OnderhoudCategorie" NOT NULL,
    "prio" "OnderhoudPrioriteit" NOT NULL,
    "doc" TEXT,
    "notitie" TEXT,
    "notitieKort" TEXT,
    "intervalMaanden" INTEGER,
    "intervalLabel" TEXT,
    "volgende" TIMESTAMP(3),
    "status" "TaakStatus",
    "streefdatum" TIMESTAMP(3),
    "toegewezenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnderhoudItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnderhoudLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "notitie" TEXT,
    "doc" TEXT,

    CONSTRAINT "OnderhoudLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtaak" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tekst" TEXT NOT NULL,
    "klaar" BOOLEAN NOT NULL DEFAULT false,
    "toegewezenId" TEXT,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subtaak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VrijeInhoudBlok" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "VrijeInhoudKind" NOT NULL,
    "volgorde" INTEGER NOT NULL DEFAULT 0,
    "tekst" TEXT,
    "imageUrl" TEXT,
    "label" TEXT,

    CONSTRAINT "VrijeInhoudBlok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceNetWorth" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "buffer" DECIMAL(12,2) NOT NULL,
    "spaargeld" DECIMAL(12,2) NOT NULL,
    "beleggingen" DECIMAL(12,2) NOT NULL,
    "startVermogen" DECIMAL(12,2) NOT NULL,
    "kritiekeGrens" DECIMAL(12,2) NOT NULL,
    "incomeMaand" DECIMAL(12,2) NOT NULL,
    "spendBudgetMaand" DECIMAL(12,2) NOT NULL,
    "spendActualMaand" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FinanceNetWorth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceMjpResultaat" (
    "jaar" INTEGER NOT NULL,
    "opResultaat" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FinanceMjpResultaat_pkey" PRIMARY KEY ("jaar")
);

-- CreateTable
CREATE TABLE "FinanceMaandFactor" (
    "maand" TEXT NOT NULL,
    "kort" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "factor" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "FinanceMaandFactor_pkey" PRIMARY KEY ("maand")
);

-- CreateTable
CREATE TABLE "FinanceCategorieBudget" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "budgetMaandelijks" DECIMAL(12,2) NOT NULL,
    "actualMaandelijks" DECIMAL(12,2) NOT NULL,
    "kleur" TEXT,
    "vast" BOOLEAN NOT NULL DEFAULT false,
    "volgorde" INTEGER NOT NULL DEFAULT 0,
    "inSpendOverzicht" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinanceCategorieBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceIncidenteelProject" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "jaar" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "besteed" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "FinanceIncidenteelProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceJaarlijksItem" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "budgetJaarlijks" DECIMAL(12,2) NOT NULL,
    "besteed2026" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "FinanceJaarlijksItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransactie" (
    "id" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "naam" TEXT NOT NULL,
    "omschrijving" TEXT NOT NULL,
    "bankCategorie" TEXT NOT NULL,
    "bedrag" DECIMAL(12,2) NOT NULL,
    "klasse" "TransactieKlasse" NOT NULL,
    "categorieBudgetId" TEXT,
    "projectId" TEXT,
    "jaarlijksItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransactie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategorieBudget_label_key" ON "FinanceCategorieBudget"("label");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_beheerderId_fkey" FOREIGN KEY ("beheerderId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnderhoudItem" ADD CONSTRAINT "OnderhoudItem_toegewezenId_fkey" FOREIGN KEY ("toegewezenId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnderhoudLog" ADD CONSTRAINT "OnderhoudLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "OnderhoudItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtaak" ADD CONSTRAINT "Subtaak_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "OnderhoudItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtaak" ADD CONSTRAINT "Subtaak_toegewezenId_fkey" FOREIGN KEY ("toegewezenId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VrijeInhoudBlok" ADD CONSTRAINT "VrijeInhoudBlok_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "OnderhoudItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransactie" ADD CONSTRAINT "FinanceTransactie_categorieBudgetId_fkey" FOREIGN KEY ("categorieBudgetId") REFERENCES "FinanceCategorieBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransactie" ADD CONSTRAINT "FinanceTransactie_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FinanceIncidenteelProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransactie" ADD CONSTRAINT "FinanceTransactie_jaarlijksItemId_fkey" FOREIGN KEY ("jaarlijksItemId") REFERENCES "FinanceJaarlijksItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
