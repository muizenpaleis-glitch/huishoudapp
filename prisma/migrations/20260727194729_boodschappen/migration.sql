-- CreateTable
CREATE TABLE "BoodschapBon" (
    "id" TEXT NOT NULL,
    "bron" TEXT NOT NULL DEFAULT 'gmail',
    "bronId" TEXT NOT NULL,
    "bezorgdatum" TEXT NOT NULL,
    "subtotaal" DECIMAL(10,2),
    "totaal" DECIMAL(10,2),
    "statiegeld" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ingeleverd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "voordeel" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tegoed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "klopt" BOOLEAN NOT NULL DEFAULT true,
    "ingelezenOp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoodschapBon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoodschapRegel" (
    "id" TEXT NOT NULL,
    "bonId" TEXT NOT NULL,
    "ordernummer" TEXT NOT NULL,
    "productnaam" TEXT NOT NULL,
    "sleutel" TEXT NOT NULL,
    "aantal" INTEGER NOT NULL,
    "prijs" DECIMAL(10,2) NOT NULL,
    "actielabel" TEXT,
    "bundelTotaal" DECIMAL(10,2),

    CONSTRAINT "BoodschapRegel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoodschapProduct" (
    "sleutel" TEXT NOT NULL,
    "categorie" TEXT,
    "houdbaar" BOOLEAN,
    "bulkNegeren" BOOLEAN NOT NULL DEFAULT false,
    "bijgewerkt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoodschapProduct_pkey" PRIMARY KEY ("sleutel")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoodschapBon_bronId_key" ON "BoodschapBon"("bronId");

-- CreateIndex
CREATE INDEX "BoodschapBon_bezorgdatum_idx" ON "BoodschapBon"("bezorgdatum");

-- CreateIndex
CREATE INDEX "BoodschapRegel_bonId_idx" ON "BoodschapRegel"("bonId");

-- CreateIndex
CREATE INDEX "BoodschapRegel_sleutel_idx" ON "BoodschapRegel"("sleutel");

-- AddForeignKey
ALTER TABLE "BoodschapRegel" ADD CONSTRAINT "BoodschapRegel_bonId_fkey" FOREIGN KEY ("bonId") REFERENCES "BoodschapBon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

