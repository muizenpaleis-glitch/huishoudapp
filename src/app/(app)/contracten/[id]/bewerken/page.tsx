import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContractForm } from "../../ContractForm";

export default async function BewerkContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) notFound();
  return <ContractForm contract={contract} />;
}
