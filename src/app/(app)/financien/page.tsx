import { loadFinance } from "@/lib/finance/load";
import { FinancienClient } from "./FinancienClient";

export default async function FinancienPage({
  searchParams,
}: {
  searchParams: Promise<{ jaarpost?: string; jaar?: string }>;
}) {
  const { jaarpost, jaar } = await searchParams;
  const state = await loadFinance();
  return <FinancienClient state={state} jaarpost={jaarpost} jaarpostJaar={jaar} />;
}
