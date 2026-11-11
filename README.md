# Timer Dashboard (Next.js + Neon Postgres)

A timer dashboard with countdown and stopwatch sessions. Sessions are stored in
Postgres on [Neon](https://neon.tech) instead of `localStorage`, so they survive
browser resets and are shared across devices.

## Features

- Create stopwatch or countdown sessions, start/pause/stop/reset them.
- Rename any session inline.
- Day filter: totals for every day that has sessions, plus a per-day list of
  session names and times.
- Persistence in Postgres through server-side route handlers (`pg` pool over
  Neon's pooled connection string).

## Stack

- Next.js 16 App Router, React 19, TypeScript
- `pg` (node-postgres) with a shared pool, Node.js runtime for route handlers
- Neon Postgres

## Setup

```bash
npm install
neon login
neon deploy       # provisions services from neon.ts and writes .env.local
npm run db:init   # creates the timer_sessions table (idempotent)
npm run dev
```

`.env.local` is written by `neon deploy` and contains `DATABASE_URL` (pooled) and
`DATABASE_URL_UNPOOLED` (direct). Both are ignored by git.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run oxlint |
| `npm run db:init` | Create the `timer_sessions` table if missing |

## API

| Route | Description |
| --- | --- |
| `GET /api/sessions?date=YYYY-MM-DD&tz=IANA_TZ` | List sessions, optionally filtered to one local day |
| `POST /api/sessions` | Create a session (`{ name, durationMs }`) |
| `PATCH /api/sessions/:id` | `{ action: start \| pause \| stop \| reset \| complete \| rename, name? }` |
| `DELETE /api/sessions/:id` | Delete one session |
| `DELETE /api/sessions` | Clear every session |
| `GET /api/days?tz=IANA_TZ` | Per-day totals in the caller's time zone |

`created_at` is stamped by the database; elapsed time for running sessions is
computed from `now() - started_at`, so the server stays the source of truth even
with several tabs open.
