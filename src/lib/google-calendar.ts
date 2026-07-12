import "server-only";
import { JWT } from "google-auth-library";

// ── Configuration ──────────────────────────────────────────────
// The deployed app talks to Google Calendar through a *service account*
// (no per-user OAuth). Set these in the environment:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL      — the service account's email
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY— its private key (PEM, \n-escaped is fine)
//   GOOGLE_CALENDAR_ID                — the calendar to read/write (the "Gezin" id)
// The calendar must be shared with the service account email, with
// "Make changes to events" permission.
//
// CALENDAR_DEMO=1 serves sample events without any Google setup — handy for
// local UI work. It is never used when a real service account is configured.

export const TIME_ZONE = "Europe/Amsterdam";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getConfig() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return null;

  // Preferred: paste the entire downloaded service-account JSON into one var.
  const blob = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (blob) {
    try {
      const parsed = JSON.parse(blob) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { email: parsed.client_email, key: parsed.private_key.replace(/\\n/g, "\n"), calendarId };
      }
    } catch {
      // fall through to the split-variable form below
    }
  }

  // Alternative: the two fields provided separately.
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  return { email, key: rawKey.replace(/\\n/g, "\n"), calendarId };
}

export function calendarConfigured(): boolean {
  return getConfig() !== null;
}

export function calendarDemo(): boolean {
  return process.env.CALENDAR_DEMO === "1";
}

export type CalEvent = {
  id: string;
  title: string;
  start: string; // 'YYYY-MM-DD' for all-day, otherwise ISO datetime
  end: string; // exclusive end date for all-day, otherwise ISO datetime
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
};

// ── Auth (token cached per process) ────────────────────────────
let cachedClient: JWT | null = null;
function client(cfg: NonNullable<ReturnType<typeof getConfig>>): JWT {
  if (!cachedClient) {
    cachedClient = new JWT({ email: cfg.email, key: cfg.key, scopes: SCOPES });
  }
  return cachedClient;
}

async function authHeader(cfg: NonNullable<ReturnType<typeof getConfig>>) {
  const { token } = await client(cfg).getAccessToken();
  if (!token) throw new Error("Kon geen Google-toegangstoken ophalen");
  return { Authorization: `Bearer ${token}` };
}

function apiUrl(calendarId: string, path = "") {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${path}`;
}

// ── Normalisation between Google's shape and CalEvent ──────────
type GoogleEvent = {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function fromGoogle(ev: GoogleEvent): CalEvent {
  const allDay = !!ev.start?.date;
  return {
    id: ev.id,
    title: ev.summary || "(zonder titel)",
    start: allDay ? ev.start!.date! : ev.start!.dateTime!,
    end: allDay ? ev.end!.date! : ev.end!.dateTime!,
    allDay,
    location: ev.location,
    description: ev.description,
    htmlLink: ev.htmlLink,
  };
}

export type EventInput = {
  title: string;
  allDay: boolean;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD' (inclusive last day for all-day)
  startTime?: string; // 'HH:MM' when not all-day
  endTime?: string; // 'HH:MM' when not all-day
  location?: string;
  description?: string;
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function toGoogleBody(input: EventInput) {
  const base = {
    summary: input.title,
    location: input.location || undefined,
    description: input.description || undefined,
  };
  if (input.allDay) {
    // Google's all-day end date is exclusive → last day + 1.
    return { ...base, start: { date: input.startDate }, end: { date: addDays(input.endDate, 1) } };
  }
  return {
    ...base,
    start: { dateTime: `${input.startDate}T${input.startTime || "09:00"}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${input.endDate}T${input.endTime || "10:00"}:00`, timeZone: TIME_ZONE },
  };
}

// ── Sample data (CALENDAR_DEMO / local UI work) ────────────────
function demoEvents(timeMin: string, timeMax: string): CalEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (day: number, h: number, min = 0) =>
    new Date(y, m, day, h, min).toISOString();
  const dstr = (day: number) => {
    const dt = new Date(y, m, day);
    return dt.toISOString().slice(0, 10);
  };
  const all: CalEvent[] = [
    { id: "demo1", title: "Ophalen kinderen — Iris", start: iso(now.getDate(), 15, 0), end: iso(now.getDate(), 16, 0), allDay: false, location: "School" },
    { id: "demo2", title: "Tandarts Daan", start: iso(now.getDate() + 1, 10, 30), end: iso(now.getDate() + 1, 11, 15), allDay: false },
    { id: "demo3", title: "Boodschappen bezorging", start: iso(now.getDate() + 2, 18, 0), end: iso(now.getDate() + 2, 19, 0), allDay: false },
    { id: "demo4", title: "Weekend weg", start: dstr(Math.min(28, now.getDate() + 5)), end: dstr(Math.min(28, now.getDate() + 7) + 1), allDay: true, location: "Ardennen" },
    { id: "demo5", title: "Verjaardag oma", start: dstr(Math.min(27, now.getDate() + 9)), end: dstr(Math.min(27, now.getDate() + 9) + 1), allDay: true },
    { id: "demo6", title: "Sporten samen", start: iso(now.getDate() + 3, 19, 30), end: iso(now.getDate() + 3, 20, 30), allDay: false, location: "Basic-Fit" },
  ];
  return all.filter((e) => e.start < timeMax && e.end > timeMin);
}

// ── Public API ─────────────────────────────────────────────────
export async function listEvents(timeMin: string, timeMax: string): Promise<CalEvent[]> {
  if (calendarDemo() && !calendarConfigured()) return demoEvents(timeMin, timeMax);
  const cfg = getConfig();
  if (!cfg) return [];
  const url = new URL(apiUrl(cfg.calendarId));
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "2500");
  const res = await fetch(url, { headers: await authHeader(cfg), cache: "no-store" });
  if (!res.ok) throw new Error(`Google Calendar (list) gaf ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { items?: GoogleEvent[] };
  return (data.items || []).map(fromGoogle);
}

export async function createEvent(input: EventInput): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Google Calendar is niet gekoppeld");
  const res = await fetch(apiUrl(cfg.calendarId), {
    method: "POST",
    headers: { ...(await authHeader(cfg)), "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(input)),
  });
  if (!res.ok) throw new Error(`Google Calendar (create) gaf ${res.status}: ${await res.text()}`);
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Google Calendar is niet gekoppeld");
  const res = await fetch(apiUrl(cfg.calendarId, `/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: { ...(await authHeader(cfg)), "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(input)),
  });
  if (!res.ok) throw new Error(`Google Calendar (update) gaf ${res.status}: ${await res.text()}`);
}

export async function deleteEvent(id: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Google Calendar is niet gekoppeld");
  const res = await fetch(apiUrl(cfg.calendarId, `/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: await authHeader(cfg),
  });
  if (!res.ok && res.status !== 410) {
    throw new Error(`Google Calendar (delete) gaf ${res.status}: ${await res.text()}`);
  }
}
