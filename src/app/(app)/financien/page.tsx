import { loadFinance } from "@/lib/finance/load";
import { FinancienClient } from "./FinancienClient";

export default async function FinancienPage() {
  const state = await loadFinance();
  return <FinancienClient state={state} />;
}
