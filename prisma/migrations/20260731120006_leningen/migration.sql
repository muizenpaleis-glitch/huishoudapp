-- CreateTable
CREATE TABLE "Lening" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "groep" TEXT NOT NULL,
    "leningnummer" TEXT,
    "verstrekker" TEXT,
    "vorm" TEXT NOT NULL DEFAULT 'annuiteit',
    "hoofdsom" DECIMAL(12,2) NOT NULL,
    "rente" DECIMAL(6,3) NOT NULL,
    "startdatum" TEXT NOT NULL,
    "looptijdMnd" INTEGER NOT NULL,
    "peildatum" TEXT NOT NULL,
    "restant" DECIMAL(12,2) NOT NULL,
    "maandTotaal" DECIMAL(10,2),
    "maandRente" DECIMAL(10,2),
    "maandAflossing" DECIMAL(10,2),
    "renteBetaald" DECIMAL(12,2),
    "aftrekbaar" BOOLEAN NOT NULL DEFAULT true,
    "notitie" TEXT,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Lening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeningInstellingen" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "aftrekPercentage" DECIMAL(5,2) NOT NULL DEFAULT 37.48,
    "eigenwoningforfait" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LeningInstellingen_pkey" PRIMARY KEY ("id")
);

