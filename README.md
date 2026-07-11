# Ons huis — Huishoud-app

Real implementation of the "Huishoud app design" Claude Design bundle: a shared-account household app with four modules — **Contracten**, **Onderhoud**, **Financiën** and **Instellingen** (Huishouden) — built with Next.js (App Router), Prisma/PostgreSQL, and web push, as an installable PWA.

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

## Project layout

- `src/app/(app)/contracten` — timeline overview, detail, add/edit form, notification settings, empty state
- `src/app/(app)/onderhoud` — combined periodiek/taak overview, detail (log-a-completion, subtasks, assignment, vrije inhoud), bundled to-do view
- `src/app/(app)/financien` — mobile read-only / desktop-editable dashboard (KPIs, net worth, MJP projection, budgets, CSV-import placeholder, transaction triage, "Vraag je cijfers" chat)
- `src/app/(app)/instellingen` — app-wide settings, Huishouden member management, per-device "Jij" preference (stored in `localStorage`, not the database — there are no separate logins)
- `src/lib/*` — pure business logic (urgency/color calculations, formatting) shared between server and client
- `prisma/schema.prisma` / `prisma/seed.ts` — data model and the realistic NL seed data ported from the design prototypes

## Notifications

Web push is wired end to end:

- `public/sw.js` — service worker (push + notification click)
- `/api/push/subscribe`, `/api/push/unsubscribe` — store/remove browser subscriptions
- `/api/notifications/check?secret=...` — scans contracts/onderhoud items nearing their deadline and sends push notifications (de-duplicated via `NotificationLog`, cooldown 3 days)

This last endpoint needs to be triggered on a schedule (e.g. a Vercel Cron job or any external scheduler hitting it daily) — set `NOTIFICATIONS_CRON_SECRET` in your environment and configure the scheduler to send it as `?secret=` or an `x-cron-secret` header. VAPID keys live in `.env` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, generated with `npx web-push generate-vapid-keys`) — replace them for a real deployment.

## Known scope decisions

- The original design's "Geavanceerd" debug menu had a "Reset all data" action; since this app now holds real persisted data (not prototype sample data), only **Reset triage** was carried over as a real, confirmed action. A full data wipe didn't make sense to ship as a normal feature.
- Document/photo uploads (contracts, onderhoud) are stored as a filename only — no file storage backend is wired up yet.
- The Financiën CSV import dropzone is visual only (bank CSV parsing wasn't in scope for this pass).
