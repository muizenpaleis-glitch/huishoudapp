-- CreateEnum
CREATE TYPE "KleurTemp" AS ENUM ('warm', 'neutraal', 'koel');

-- CreateEnum
CREATE TYPE "LaadpaalStatus" AS ENUM ('vrij', 'laden', 'gepauzeerd', 'klaar');

-- CreateTable
CREATE TABLE "HuisLamp" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kamer" TEXT NOT NULL,
    "aan" BOOLEAN NOT NULL DEFAULT false,
    "helderheid" INTEGER NOT NULL DEFAULT 50,
    "kleurTemp" "KleurTemp" NOT NULL DEFAULT 'neutraal',
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HuisLamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisCamera" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "laatsteBeweging" TIMESTAMP(3),
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HuisCamera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisLaadpaal" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "status" "LaadpaalStatus" NOT NULL DEFAULT 'vrij',
    "huidigVermogenKw" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "HuisLaadpaal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisLaadSessie" (
    "id" TEXT NOT NULL,
    "laadpaalId" INTEGER NOT NULL DEFAULT 1,
    "datum" TIMESTAMP(3) NOT NULL,
    "duurMinuten" INTEGER NOT NULL,
    "kwh" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "HuisLaadSessie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisAutomatisering" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "aan" BOOLEAN NOT NULL DEFAULT true,
    "laatsteActie" TEXT,
    "laatsteActieOp" TIMESTAMP(3),

    CONSTRAINT "HuisAutomatisering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisEnergieStatus" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "verbruikNuKw" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "opwekNuKw" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "terugleveringNuKw" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "verbruikVandaagKwh" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "opwekVandaagKwh" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "teruggeleverdVandaagKwh" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "warmtepompVandaagKwh" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "warmtepompBijgewerkt" TIMESTAMP(3),

    CONSTRAINT "HuisEnergieStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisEnergieMeting" (
    "id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "verbruik" DECIMAL(6,2) NOT NULL,
    "opwek" DECIMAL(6,2) NOT NULL,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HuisEnergieMeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuisFavoriet" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HuisFavoriet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HuisFavoriet_key_key" ON "HuisFavoriet"("key");

-- AddForeignKey
ALTER TABLE "HuisLaadSessie" ADD CONSTRAINT "HuisLaadSessie_laadpaalId_fkey" FOREIGN KEY ("laadpaalId") REFERENCES "HuisLaadpaal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
