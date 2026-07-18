import { prisma } from "@/lib/prisma";
import { haConfigured, listLights } from "@/lib/home-assistant";
import { KoppelenClient } from "./KoppelenClient";

// Calibration tool: lets the household test each Home Assistant light
// entity one at a time (it visibly toggles in the house) and assign it to
// the right room card, instead of guessing from entity/friendly names —
// which turned out unreliable once real Hue rooms/zones were involved.
export default async function KoppelenPage() {
  const lampen = await prisma.huisLamp.findMany({ orderBy: { volgorde: "asc" } });

  if (!haConfigured()) {
    return (
      <div className="pt-16 md:pt-6 px-5 pb-8">
        <div className="max-w-[640px] mx-auto text-[14px] text-muted">
          Home Assistant is nog niet gekoppeld (HOME_ASSISTANT_URL/TOKEN ontbreken).
        </div>
      </div>
    );
  }

  const entities = await listLights();

  return (
    <KoppelenClient
      lampen={lampen.map((l) => ({ id: l.id, naam: l.naam, kamer: l.kamer, entityId: l.entityId }))}
      entities={entities
        .map((e) => ({
          entityId: e.entity_id,
          naam: (e.attributes.friendly_name as string | undefined) ?? e.entity_id,
        }))
        .sort((a, b) => a.naam.localeCompare(b.naam))}
    />
  );
}
