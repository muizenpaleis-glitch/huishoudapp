import { getMembers } from "@/lib/members";
import { OnderhoudForm } from "./OnderhoudForm";

export default async function NieuwOnderhoudPage() {
  const members = await getMembers();
  return <OnderhoudForm members={members} />;
}
