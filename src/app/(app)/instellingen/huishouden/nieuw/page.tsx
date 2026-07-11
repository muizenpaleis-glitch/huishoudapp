import { getMembers } from "@/lib/members";
import { LidForm } from "../LidForm";

const KLEUREN = ["#C4633B", "#5C7F55", "#6C5B8C", "#A9761C", "#2F6E8F"];

export default async function NieuwLidPage() {
  const members = await getMembers();
  const defaultKleur = KLEUREN[members.length % KLEUREN.length];
  return <LidForm canDelete={false} defaultKleur={defaultKleur} />;
}
