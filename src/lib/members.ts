import { prisma } from "@/lib/prisma";

export function getMembers() {
  return prisma.householdMember.findMany({ orderBy: { createdAt: "asc" } });
}

export type Member = Awaited<ReturnType<typeof getMembers>>[number];
