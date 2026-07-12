-- DropForeignKey
ALTER TABLE "FinanceTransactie" DROP CONSTRAINT "FinanceTransactie_categorieBudgetId_fkey";

-- DropForeignKey
ALTER TABLE "FinanceTransactie" DROP CONSTRAINT "FinanceTransactie_jaarlijksItemId_fkey";

-- DropForeignKey
ALTER TABLE "FinanceTransactie" DROP CONSTRAINT "FinanceTransactie_projectId_fkey";

-- DropTable
DROP TABLE "FinanceCategorieBudget";

-- DropTable
DROP TABLE "FinanceIncidenteelProject";

-- DropTable
DROP TABLE "FinanceJaarlijksItem";

-- DropTable
DROP TABLE "FinanceMaandFactor";

-- DropTable
DROP TABLE "FinanceMjpResultaat";

-- DropTable
DROP TABLE "FinanceNetWorth";

-- DropTable
DROP TABLE "FinanceTransactie";

-- DropEnum
DROP TYPE "TransactieKlasse";

-- CreateTable
CREATE TABLE "FinanceSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "startNetWorth" DECIMAL(12,2) NOT NULL,
    "returnRate" DECIMAL(6,3) NOT NULL,
    "horizon" INTEGER NOT NULL,
    "savingsGrowth" DECIMAL(6,3) NOT NULL,
    "monthlyBudget" DECIMAL(12,2) NOT NULL,
    "monthlyIncome" DECIMAL(12,2) NOT NULL,
    "threshold" DECIMAL(12,2) NOT NULL,
    "savingsAccounts" TEXT[],
    "investmentAccounts" TEXT[],
    "savingsIncidentalThreshold" DECIMAL(12,2) NOT NULL,
    "categoryBudgets" JSONB NOT NULL,
    "personalSavings" DECIMAL(12,2) NOT NULL,
    "investmentValue" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTx" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "code" TEXT NOT NULL,
    "seq" TEXT NOT NULL,
    "descr" TEXT NOT NULL,
    "bankCat" TEXT NOT NULL,

    CONSTRAINT "FinanceTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceOverride" (
    "txId" TEXT NOT NULL,
    "cls" TEXT,
    "project" TEXT,
    "bankCat" TEXT,
    "notInvestment" BOOLEAN,
    "savingsInc" BOOLEAN,

    CONSTRAINT "FinanceOverride_pkey" PRIMARY KEY ("txId")
);

-- CreateTable
CREATE TABLE "FinanceProject" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "jaar" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FinanceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceYearly" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FinanceYearly_pkey" PRIMARY KEY ("id")
);

