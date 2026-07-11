import { getMembers } from "@/lib/members";
import { AppShell } from "@/components/AppShell";

// Every page under here reads live data straight from the database, so none
// of it should be frozen into a build-time static page.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const members = await getMembers();
  return <AppShell members={members}>{children}</AppShell>;
}
