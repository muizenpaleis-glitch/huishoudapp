import { getMembers, LID_KLEUREN } from "@/lib/members";
import { LidForm } from "../LidForm";

export default async function NieuwLidPage() {
  const members = await getMembers();
  const defaultKleur = LID_KLEUREN[members.length % LID_KLEUREN.length];
  return <LidForm canDelete={false} defaultKleur={defaultKleur} />;
}
