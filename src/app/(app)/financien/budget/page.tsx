import { loadFinance } from "@/lib/finance/load";
import { BudgetClient } from "./BudgetClient";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>;
}) {
  const { jaar } = await searchParams;
  const state = await loadFinance();
  return <BudgetClient state={state} jaarParam={jaar} />;
}
