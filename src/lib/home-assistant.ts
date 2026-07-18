import "server-only";

// ── Configuration ──────────────────────────────────────────────
// Talks to a real Home Assistant instance over its REST API, reached via the
// user's Nabu Casa remote-access URL (or any other https URL that reaches
// their HA instance). Set these in the environment:
//   HOME_ASSISTANT_URL    — e.g. https://xxxxxxxx.ui.nabu.casa (no trailing slash)
//   HOME_ASSISTANT_TOKEN  — a personal Long-Lived Access Token from the
//                            user's HA profile page
// Without these set, the Huis module falls back to its existing simulated
// data — nothing breaks for deployments that don't have real hardware wired up.

function getConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.HOME_ASSISTANT_URL;
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!baseUrl || !token) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

export function haConfigured(): boolean {
  return getConfig() !== null;
}

export type HaState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
};

class HaError extends Error {}

async function haFetch(path: string, init?: RequestInit): Promise<Response> {
  const config = getConfig();
  if (!config) throw new HaError("Home Assistant is niet geconfigureerd (HOME_ASSISTANT_URL/TOKEN ontbreken).");
  const res = await fetch(`${config.baseUrl}/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HaError(`Home Assistant gaf ${res.status} terug voor ${path}: ${body.slice(0, 200)}`);
  }
  return res;
}

// Confirms the URL + token actually work (cheap call: GET /api/ returns a
// small "API running" payload on any valid HA instance).
export async function haPing(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await haFetch("/");
    const body = (await res.json()) as { message?: string };
    return { ok: true, message: body.message ?? "verbonden" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "onbekende fout" };
  }
}

export async function listStates(domainPrefix?: string): Promise<HaState[]> {
  const res = await haFetch("/states");
  const all = (await res.json()) as HaState[];
  return domainPrefix ? all.filter((s) => s.entity_id.startsWith(`${domainPrefix}.`)) : all;
}

export async function getState(entityId: string): Promise<HaState> {
  const res = await haFetch(`/states/${encodeURIComponent(entityId)}`);
  return (await res.json()) as HaState;
}

export async function callService(
  domain: string,
  service: string,
  data: Record<string, unknown>,
): Promise<void> {
  await haFetch(`/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Lights ──────────────────────────────────────────────────────
export async function listLights(): Promise<HaState[]> {
  return listStates("light");
}

export async function turnLight(entityId: string, on: boolean): Promise<void> {
  await callService("light", on ? "turn_on" : "turn_off", { entity_id: entityId });
}

// Flips current state regardless of what we think it is — used for the
// lamp-mapping tool so clicking "Test" always produces a visible change,
// even if our stored/assumed state is stale or wrong.
export async function toggleLightRaw(entityId: string): Promise<void> {
  await callService("light", "toggle", { entity_id: entityId });
}

export async function setLightBrightness(entityId: string, pct: number): Promise<void> {
  const clamped = Math.max(1, Math.min(100, Math.round(pct)));
  await callService("light", "turn_on", { entity_id: entityId, brightness_pct: clamped });
}

export async function setLightColorTempKelvin(entityId: string, kelvin: number): Promise<void> {
  await callService("light", "turn_on", { entity_id: entityId, color_temp_kelvin: kelvin });
}

export type LiveLightState = { aan: boolean; helderheid: number; kleurTemp: "warm" | "neutraal" | "koel" };

const KELVIN_BY_KLEURTEMP = { warm: 2700, neutraal: 4000, koel: 6000 } as const;

function kelvinToKleurTemp(kelvin: number): LiveLightState["kleurTemp"] {
  if (kelvin <= 3200) return "warm";
  if (kelvin <= 5000) return "neutraal";
  return "koel";
}

function toLiveLightState(s: HaState): LiveLightState {
  const brightness255 = typeof s.attributes.brightness === "number" ? s.attributes.brightness : null;
  const kelvin =
    typeof s.attributes.color_temp_kelvin === "number"
      ? s.attributes.color_temp_kelvin
      : typeof s.attributes.color_temp === "number"
        ? Math.round(1_000_000 / (s.attributes.color_temp as number))
        : null;
  return {
    aan: s.state === "on",
    helderheid: brightness255 != null ? Math.max(1, Math.round(brightness255 / 2.55)) : 100,
    kleurTemp: kelvin != null ? kelvinToKleurTemp(kelvin) : "neutraal",
  };
}

// Fetches live on/off + brightness + color temp for a specific set of light
// entities — one request per entity (in parallel), NOT the full /states dump.
// A household's HA instance can easily have hundreds of entities across every
// integration, so filtering a full dump client-side is needlessly slow;
// fetching only the entities we actually show is the same cost regardless of
// how big the rest of the install is. Entities that fail to load (renamed,
// unavailable, wrong id) are omitted so the caller can fall back to stored
// values instead of the whole batch failing.
export async function getLiveLightStates(entityIds: string[]): Promise<Map<string, LiveLightState>> {
  const map = new Map<string, LiveLightState>();
  if (entityIds.length === 0) return map;
  const results = await Promise.allSettled(entityIds.map((id) => getState(id)));
  results.forEach((r, i) => {
    if (r.status === "fulfilled") map.set(entityIds[i], toLiveLightState(r.value));
  });
  return map;
}

// Live state for a single entity — used by toggleLamp so it flips based on
// the lamp's REAL current state, not a possibly-stale stored value.
export async function getLiveLightState(entityId: string): Promise<LiveLightState | null> {
  try {
    return toLiveLightState(await getState(entityId));
  } catch {
    return null;
  }
}

export function kleurTempToKelvin(kleurTemp: "warm" | "neutraal" | "koel"): number {
  return KELVIN_BY_KLEURTEMP[kleurTemp];
}
