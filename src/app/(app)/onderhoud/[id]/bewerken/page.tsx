import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMembers } from "@/lib/members";
import { OnderhoudForm } from "../../nieuw/OnderhoudForm";

export default async function BewerkOnderhoudPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, members] = await Promise.all([
    prisma.onderhoudItem.findUnique({ where: { id } }),
    getMembers(),
  ]);
  if (!item) notFound();
  return <OnderhoudForm item={item} members={members} />;
}
