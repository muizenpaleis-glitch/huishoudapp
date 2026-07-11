import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LidForm } from "../LidForm";

export default async function BewerkLidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, count] = await Promise.all([
    prisma.householdMember.findUnique({ where: { id } }),
    prisma.householdMember.count(),
  ]);
  if (!member) notFound();
  return <LidForm member={member} canDelete={count > 1} defaultKleur={member.kleur} />;
}
