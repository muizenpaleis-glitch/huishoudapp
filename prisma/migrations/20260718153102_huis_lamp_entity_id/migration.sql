-- AlterTable
ALTER TABLE "HuisLamp" ADD COLUMN     "entityId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HuisLamp_entityId_key" ON "HuisLamp"("entityId");

