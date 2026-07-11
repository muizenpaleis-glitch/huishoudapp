import { getMembers } from "@/lib/members";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const members = await getMembers();
  return <AppShell members={members}>{children}</AppShell>;
}
