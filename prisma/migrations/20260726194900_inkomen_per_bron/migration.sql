-- CreateTable
CREATE TABLE "FinanceInkomen" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "bedrag" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "volgorde" INTEGER NOT NULL DEFAULT 0,
    "groei" DECIMAL(6,3),

    CONSTRAINT "FinanceInkomen_pkey" PRIMARY KEY ("id")
);

-- Seed the five income sources. Amounts start at 0 on purpose: the original
-- sheet only ever carried the €101.699 total, so the split is not knowable
-- here. While every row is still 0 the engine keeps using that total, so the
-- plan is unchanged until the household fills these in.
INSERT INTO "FinanceInkomen" ("id", "naam", "bedrag", "volgorde") VALUES
  ('inkomen_jur_salaris',    'Inkomsten Jur',      0, 0),
  ('inkomen_jur_vakantie',   'Vakantiegeld Jur',   0, 1),
  ('inkomen_suus_salaris',   'Inkomsten Suus',     0, 2),
  ('inkomen_suus_vakantie',  'Vakantiegeld Suus',  0, 3),
  ('inkomen_suus_dertiende', '13e maand Suus',     0, 4);
