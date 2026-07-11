# Ons huis — Huishoud-app

Real implementation of the "Huishoud app design" Claude Design bundle: a shared-account household app with five modules — **Contracten**, **Onderhoud**, **Financiën**, **Huis** and **Instellingen** (Huishouden) — built with Next.js (App Router), Prisma/PostgreSQL, and web push, as an installable PWA.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **PostgreSQL** via **Prisma 7** (driver adapter: `@prisma/adapter-pg`)
- **Tailwind CSS v4** — theme tokens (cream/terracotta palette, `Outfit` font) defined in `src/app/globals.css`
- **web-push** for browser push notifications
- Installable **PWA** (manifest + service worker in `public/`)

## Getting started

1. Make sure PostgreSQL is running and `DATABASE_URL` in `.env` points to it (defaults to a local `huishoudapp` database).
2. Install dependencies and set up the database:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (redirects to `/contracten`).

## Deploy for free (no terminal needed)

The easiest way to get a real, permanent link you can open on your phone:

1. Go to [vercel.com](https://vercel.com) and sign in with the GitHub account this repo lives in.
2. Click **Add New → Project**, pick this repo, and click **Deploy**. Before it finishes, add these environment variables in the Vercel project settings (Settings → Environment Variables):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — generate with `npx web-push generate-vapid-keys` (or ask whoever set this up to run it once)
   - `NOTIFICATIONS_CRON_SECRET` — any random password you choose
   - `SETUP_SECRET` — any random password you choose (used once, see step 4)
3. In the same project, go to **Storage → Create Database → Postgres** and connect it. Vercel adds a set of connection-string variables for you (often prefixed with your database's name, e.g. `mydb_POSTGRES_URL`). Add two more variables yourself, copying their values from those:
   - `DATABASE_URL` — copy the value of the **pooled** connection string (the one Vercel calls `POSTGRES_URL` or `POSTGRES_PRISMA_URL`, no "NON_POOLING" in the name). The app uses this one at runtime — pooled connections matter a lot for response speed on serverless.
   - `DIRECT_URL` — copy the value of the **non-pooled** one (name contains `NON_POOLING`). Only used for migrations.

   Redeploy once these are set (migrations run automatically as part of every deploy).
4. Once deployed, visit `https://<your-app>.vercel.app/api/setup?secret=<the SETUP_SECRET you chose>` **once** in your browser. This fills the database with starting data. Visiting it again is harmless — it refuses to run a second time once there's real data.
5. Open `https://<your-app>.vercel.app` — that's your app. On a phone, open it in the browser and choose "Add to Home Screen" to install it like a normal app.

### If it feels slow

Two things matter most on this stack (Vercel + a serverless Postgres):

- **Use the pooled `DATABASE_URL`**, not the direct one (see step 3 above) — using the direct connection for runtime queries is the single most common cause of sluggish clicks on Vercel + Neon/Postgres.
- **Match regions.** This repo's `vercel.json` pins serverless functions to `fra1` (Frankfurt). If your database lives in a different region, either recreate it in the same region as your functions, or change the region in `vercel.json` to match — every extra hop between the function and the database adds real, felt latency.
- A serverless Postgres database that's been idle for a few minutes needs a moment to "wake up" on the next request — the first click after a break being slower than the rest is expected on the free tier.

## Project layout

- `src/app/(app)/contracten` — timeline overview, detail, add/edit form, notification settings, empty state
- `src/app/(app)/onderhoud` — combined periodiek/taak overview, detail (log-a-completion, subtasks, assignment, vrije inhoud), bundled to-do view
- `src/app/(app)/financien` — mobile read-only / desktop-editable dashboard (KPIs, net worth, MJP projection, budgets, CSV-import placeholder, transaction triage, "Vraag je cijfers" chat)
- `src/app/(app)/huis` — Home Assistant-style dashboard: favorites (long-press to pin/reorder), lighting grouped by room, energy (live stats, usage/generation chart, EV charger, manual solar-surplus actions), cameras. **Demo data only for now — not connected to a real Home Assistant instance.** See "Huis module" below.
- `src/app/(app)/instellingen` — app-wide settings, Huishouden member management, per-device "Jij" preference (stored in `localStorage`, not the database — there are no separate logins)
- `src/lib/*` — pure business logic (urgency/color calculations, formatting) shared between server and client
- `prisma/schema.prisma` / `prisma/seed.ts` — data model and the realistic NL seed data ported from the design prototypes

## Notifications

Web push is wired end to end:

- `public/sw.js` — service worker (push + notification click)
- `/api/push/subscribe`, `/api/push/unsubscribe` — store/remove browser subscriptions
- `/api/notifications/check?secret=...` — scans contracts/onderhoud items nearing their deadline and sends push notifications (de-duplicated via `NotificationLog`, cooldown 3 days)

The check endpoint runs automatically once a day on Vercel: `vercel.json` defines a cron job for `/api/notifications/check`, and Vercel authenticates it by sending `Authorization: Bearer <CRON_SECRET>` — so **set a `CRON_SECRET` environment variable** (any random value) in the Vercel project for the cron to be accepted. Manual/external triggering also works via `?secret=` or an `x-cron-secret` header matching `NOTIFICATIONS_CRON_SECRET`. VAPID keys live in `.env` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, generated with `npx web-push generate-vapid-keys`) — replace them for a real deployment.

For pushes to actually arrive on a phone: install the app (Add to Home Screen), open Contracten → bell icon (or Onderhoud → bell icon), enable "Push op telefoon", and accept the browser's notification permission prompt. The "In de app"/mail toggles are UI-only for now — the delivered channel is web push.

## Huis module

The Huis dashboard (lights, energy, EV charger, cameras) currently runs on **demo data only** — it is not wired up to a real Home Assistant instance. This was a deliberate scope decision: connecting it for real needs a Nabu Casa remote URL, a long-lived access token, and the actual entity IDs of your devices, none of which were available when this pass was built. The solar-surplus automation is manual-only on purpose too (the "Boost warmwater nu" / "Auto nu laden" buttons just record the action) — the requirements doc itself flags the data source and execution location for a fully automatic version as unresolved, and an unattended loop that decides when to charge an EV or heat water isn't something to guess at.

When you're ready to connect it for real: give the Nabu Casa URL, an access token, and your entity IDs, and a later pass can wire `HuisLamp`/`HuisCamera`/`HuisLaadpaal`/`HuisAutomatisering` up to Home Assistant's WebSocket/REST API instead of Postgres-backed demo rows.

## Known scope decisions

- The original design's "Geavanceerd" debug menu had a "Reset all data" action; since this app now holds real persisted data (not prototype sample data), only **Reset triage** was carried over as a real, confirmed action. A full data wipe didn't make sense to ship as a normal feature.
- Document/photo uploads (contracts, onderhoud) are stored as a filename only — no file storage backend is wired up yet.
- The Financiën CSV import dropzone is visual only (bank CSV parsing wasn't in scope for this pass).
