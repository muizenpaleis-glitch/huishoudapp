import { listEvents, calendarConfigured, calendarDemo, TIME_ZONE, type CalEvent } from "@/lib/google-calendar";
import { AgendaClient } from "./AgendaClient";
import { AgendaNietGekoppeld } from "./AgendaNietGekoppeld";

function todayInAms(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()); // YYYY-MM-DD
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const { maand } = await searchParams;
  const vandaag = todayInAms();
  const maandParam = /^\d{4}-\d{2}$/.test(maand ?? "") ? maand! : vandaag.slice(0, 7);

  if (!calendarConfigured() && !calendarDemo()) {
    return <AgendaNietGekoppeld />;
  }

  const [y, m] = maandParam.split("-").map(Number);
  // Fetch a padded window around the month so the 6-week grid is fully covered.
  const from = new Date(Date.UTC(y, m - 1, 1) - 7 * 86400000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) + 7 * 86400000).toISOString();

  let events: CalEvent[];
  let error: string | null = null;
  try {
    events = await listEvents(from, to);
  } catch (e) {
    events = [];
    error = e instanceof Error ? e.message : "Onbekende fout bij ophalen van de agenda";
  }

  return (
    <AgendaClient
      maand={maandParam}
      vandaag={vandaag}
      events={events}
      error={error}
      demo={calendarDemo() && !calendarConfigured()}
    />
  );
}
