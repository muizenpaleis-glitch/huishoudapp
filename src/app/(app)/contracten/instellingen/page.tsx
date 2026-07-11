import { getAppSettings } from "@/lib/settings";
import { NotificatieForm } from "./NotificatieForm";

export default async function ContractInstellingenPage() {
  const settings = await getAppSettings();
  return <NotificatieForm settings={settings} />;
}
