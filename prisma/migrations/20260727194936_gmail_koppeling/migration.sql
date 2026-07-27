-- CreateTable
CREATE TABLE "GmailKoppeling" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "refreshToken" TEXT NOT NULL,
    "email" TEXT,
    "gekoppeldOp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "laatsteSync" TIMESTAMP(3),
    "laatsteFout" TEXT,

    CONSTRAINT "GmailKoppeling_pkey" PRIMARY KEY ("id")
);

