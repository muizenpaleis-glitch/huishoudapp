import { ModuleHeader } from "@/components/ModuleHeader";
import { Card } from "@/components/ui";
import { InfoIcon } from "@/components/icons";

export function AgendaNietGekoppeld() {
  return (
    <div className="flex flex-col min-h-full">
      <ModuleHeader title="Agenda" subtitle="Google Agenda — gedeeld huishouden" />
      <div className="px-5 mt-6 max-w-[640px] w-full mx-auto">
        <Card className="p-5 flex flex-col gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent-tint flex items-center justify-center">
            <InfoIcon size={22} className="text-accent" />
          </div>
          <div className="text-[17px] font-bold">Agenda nog niet gekoppeld</div>
          <div className="text-[13.5px] text-ink-soft leading-relaxed">
            De agenda leest en schrijft rechtstreeks in jullie Google &ldquo;Gezin&rdquo;-agenda. Daarvoor moet er
            eenmalig een koppeling ingesteld worden in de instellingen van de app (een Google service-account, de
            sleutel in de omgeving, en de Gezin-agenda delen met dat account).
          </div>
          <div className="text-[12.5px] text-muted leading-relaxed">
            Zodra dat is ingesteld verschijnt hier automatisch de maandkalender met alle afspraken, en kun je
            afspraken toevoegen en bewerken. De stap-voor-stap-uitleg staat in het README onder &ldquo;Google
            Agenda koppelen&rdquo;.
          </div>
        </Card>
      </div>
    </div>
  );
}
