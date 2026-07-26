-- AlterTable
ALTER TABLE "FinanceSettings" ADD COLUMN     "categoryInflatie" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "inflatieDefault" DECIMAL(6,3) NOT NULL DEFAULT 2.5,
ADD COLUMN     "inkomenGroei" DECIMAL(6,3) NOT NULL DEFAULT 2.0;

-- AlterTable
ALTER TABLE "FinanceYearly" ADD COLUMN     "inflatie" DECIMAL(6,3);

-- CreateTable
CREATE TABLE "FinanceBudgetJaar" (
    "id" TEXT NOT NULL,
    "jaar" INTEGER NOT NULL,
    "soort" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "bedrag" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FinanceBudgetJaar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceMjpJaar" (
    "jaar" INTEGER NOT NULL,
    "inkomen" DECIMAL(12,2),
    "investeringen" DECIMAL(12,2),
    "opResultaat" DECIMAL(12,2),
    "notitie" TEXT,

    CONSTRAINT "FinanceMjpJaar_pkey" PRIMARY KEY ("jaar")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceBudgetJaar_jaar_soort_naam_key" ON "FinanceBudgetJaar"("jaar", "soort", "naam");

