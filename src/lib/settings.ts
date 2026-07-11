import { prisma } from "@/lib/prisma";

export async function getAppSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.appSettings.create({
    data: { id: 1, contractDrempel: 60, contractMail: true, contractPush: false, onderhoudDrempel: 14 },
  });
}
