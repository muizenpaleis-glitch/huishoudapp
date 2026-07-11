import { getAppSettings } from "@/lib/settings";
import { OnderhoudNotificatieForm } from "./NotificatieForm";

export default async function OnderhoudInstellingenPage() {
  const settings = await getAppSettings();
  return <OnderhoudNotificatieForm settings={settings} />;
}
