import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMembers } from "@/lib/members";
import { ContractForm } from "../../ContractForm";

export default async function BewerkContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, members] = await Promise.all([
    prisma.contract.findUnique({ where: { id } }),
    getMembers(),
  ]);
  if (!contract) notFound();
  return <ContractForm contract={contract} members={members} />;
}
