import { loadFinance } from "@/lib/finance/load";
import { MjpClient } from "./MjpClient";

export const dynamic = "force-dynamic";

export default async function MjpPage() {
  const state = await loadFinance();
  return <MjpClient state={state} />;
}
