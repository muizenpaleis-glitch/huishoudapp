import "server-only";
import { prisma } from "@/lib/prisma";

// Gmail-toegang voor de boodschappenmodule.
//
// Waarom niet de bestaande Google-koppeling hergebruiken: de agenda draait op
// een service-account (src/lib/google-calendar.ts). Een service-account kan
// alleen bij een mailbox via domain-wide delegation, en dat bestaat uitsluitend
// binnen een Google Workspace-domein. Deze mailbox is een gewoon @gmail.com-
// adres, dus Gmail vereist een eigen OAuth-client met eenmalige toestemming van
// de gebruiker. Het refresh-token gaat de database in, zodat koppelen geen
// nieuwe deploy vraagt.

const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AFZENDER = "info@service.picnic.nl";

export function gmailOauthGeconfigureerd(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/boodschappen/gmail/callback`;
}

export function consentUrl(origin: string, state: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPE);
  // offline + consent samen: alleen zo geeft Google een refresh-token terug, ook
  // wanneer dezelfde gebruiker al eerder toestemming gaf.
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenAntwoord = { access_token?: string; refresh_token?: string; error?: string; error_description?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenAntwoord> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = (await res.json()) as TokenAntwoord;
  if (!res.ok) {
    throw new Error(`Google gaf ${res.status}: ${data.error_description || data.error || "onbekende fout"}`);
  }
  return data;
}

/** Wisselt de code uit de consent-redirect in voor een refresh-token en bewaart
 *  dat. Het access-token uit dezelfde ronde gebruiken we meteen om het gekoppelde
 *  adres op te halen, zodat de app kan tonen wélke mailbox eraan hangt. */
export async function koppelMetCode(code: string, origin: string): Promise<string> {
  const t = await tokenRequest({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirect_uri: redirectUri(origin),
    grant_type: "authorization_code",
  });
  if (!t.refresh_token) {
    throw new Error(
      "Google gaf geen refresh-token terug. Verwijder de app onder je Google-accountmachtigingen en koppel opnieuw.",
    );
  }
  let email: string | null = null;
  if (t.access_token) {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${t.access_token}` },
      cache: "no-store",
    });
    if (res.ok) email = ((await res.json()) as { emailAddress?: string }).emailAddress ?? null;
  }
  await prisma.gmailKoppeling.upsert({
    where: { id: 1 },
    update: { refreshToken: t.refresh_token, email, gekoppeldOp: new Date(), laatsteFout: null },
    create: { id: 1, refreshToken: t.refresh_token, email },
  });
  return email || "onbekend adres";
}

export async function ontkoppel(): Promise<void> {
  await prisma.gmailKoppeling.deleteMany({ where: { id: 1 } });
}

export async function gmailStatus() {
  const k = await prisma.gmailKoppeling.findUnique({ where: { id: 1 } });
  return {
    geconfigureerd: gmailOauthGeconfigureerd(),
    gekoppeld: !!k,
    email: k?.email ?? null,
    laatsteSync: k?.laatsteSync ?? null,
    laatsteFout: k?.laatsteFout ?? null,
  };
}

async function accessToken(): Promise<string> {
  const k = await prisma.gmailKoppeling.findUnique({ where: { id: 1 } });
  if (!k) throw new Error("Gmail is nog niet gekoppeld");
  if (!gmailOauthGeconfigureerd()) throw new Error("GOOGLE_OAUTH_CLIENT_ID/SECRET ontbreken");
  const t = await tokenRequest({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    refresh_token: k.refreshToken,
    grant_type: "refresh_token",
  });
  if (!t.access_token) throw new Error("Google gaf geen toegangstoken terug");
  return t.access_token;
}

type GmailDeel = { mimeType?: string; body?: { data?: string }; parts?: GmailDeel[] };

/** Zoekt in de MIME-boom naar de eerste text/plain-body. Picnic stuurt multipart
 *  met zowel plain als html; alleen de plaintext hebben we nodig. */
function plaintextUit(deel: GmailDeel | undefined): string | null {
  if (!deel) return null;
  if (deel.mimeType === "text/plain" && deel.body?.data) {
    return Buffer.from(deel.body.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  }
  for (const p of deel.parts || []) {
    const gevonden = plaintextUit(p);
    if (gevonden) return gevonden;
  }
  return null;
}

export type GmailBericht = { id: string; plaintext: string };

/** Haalt Picnic-mails op. `sinds` beperkt tot recente berichten voor de
 *  dagelijkse sync; weglaten haalt de hele historie op (de eenmalige import). */
export async function haalPicnicMails(sinds?: Date): Promise<GmailBericht[]> {
  const token = await accessToken();
  const auth = { Authorization: `Bearer ${token}` };
  let query = `from:${AFZENDER}`;
  if (sinds) query += ` after:${sinds.toISOString().slice(0, 10).replace(/-/g, "/")}`;

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    u.searchParams.set("q", query);
    u.searchParams.set("maxResults", "100");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u, { headers: auth, cache: "no-store" });
    if (!res.ok) throw new Error(`Gmail (list) gaf ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { messages?: { id: string }[]; nextPageToken?: string };
    for (const m of data.messages || []) ids.push(m.id);
    pageToken = data.nextPageToken;
  } while (pageToken);

  const uit: GmailBericht[] = [];
  for (const id of ids) {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: auth, cache: "no-store" },
    );
    if (!res.ok) continue;
    const msg = (await res.json()) as { payload?: GmailDeel };
    const plaintext = plaintextUit(msg.payload);
    if (plaintext) uit.push({ id, plaintext });
  }
  return uit;
}

export async function noteerSync(fout?: string) {
  await prisma.gmailKoppeling.updateMany({
    where: { id: 1 },
    data: { laatsteSync: new Date(), laatsteFout: fout ?? null },
  });
}
