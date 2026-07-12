import { getMembers } from "@/lib/members";
import { ContractForm } from "../ContractForm";

export default async function NieuwContractPage() {
  const members = await getMembers();
  return <ContractForm members={members} />;
}
