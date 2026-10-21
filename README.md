# Solar Home

A solar dashboard for people who aren't electricians. It shows what your panels, battery and home are doing right now, and what that means for your bill, in plain words: *units* instead of kWh, *battery level* instead of SOC, *power company* instead of grid.

It connects to a real inverter through the **Solarman OpenAPI**, and includes a **demo mode** with a realistic sample home for when you don't have credentials.

## What's inside

| Page | What it shows |
| --- | --- |
| **Overview** | A plain-English summary of right now ("Power cut — running on sunshine"), a live energy-flow diagram (panels → inverter → home / battery / power company, with moving dots whose speed follows the real power), battery level with "lasts about X hours", today's units, today's power curve, the last 7 days, and money saved / pollution avoided. Cards can be hidden and reordered. |
| **Trends** | Day / week / month / year with previous/next navigation. Choose sunshine, home use, bought & sold, or battery. Comparisons are like-for-like (a half-finished week is compared with the same days of last week), there's a table view for every chart, and you can download a CSV. |
| **My system** | Overall health, whether the power company's supply is on (power-cut detection), the data connection, every device with status and readings in plain words, and recent events. |
| **Settings** | Electricity price per unit, sell-back price and currency (validated), pollution factor, light / dark / match device theme, and overview card layout. All saved in PostgreSQL. |
| **Notifications** | Power cuts starting and ending, low battery, devices going offline, and inverter alerts. Loaded only when the drawer is opened. |

## Stack

Next.js 15 (App Router, server components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Motion · Recharts (lazy-loaded) · Radix primitives · Lucide · Prisma 6 · PostgreSQL 16 in Docker · Zod · Vitest.

## Getting started

Requires Node 20+ and Docker Desktop.

```bash
npm install
cp .env.example .env        # then edit .env (see below)
npm run setup               # starts Postgres, runs migrations, seeds data
npm run dev                 # http://localhost:3000
```

### Demo mode (no credentials)

Leave `SOLAR_DATA_SOURCE=demo` in `.env`. The seed creates "Sunny Villa (sample)": 400 days of history and 14 days of 5-minute readings from a deterministic model of a 5 kW / 10 kWh home in Hyderabad, with clouds, cooking peaks, afternoon AC and scheduled power cuts. Every screen shows a **Sample data** label.

### Your real system (Solarman)

1. Get an App ID and App Secret from Solarman (igen-support).
2. In `.env`, set:
   ```
   SOLAR_DATA_SOURCE=solarman
   SOLARMAN_APP_ID=...
   SOLARMAN_APP_SECRET=...
   SOLARMAN_EMAIL=...                 # the email you log in to the SOLARMAN app with
   SOLARMAN_PASSWORD_SHA256=...       # lowercase SHA-256 of that password
   ```
   To hash the password: `node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" 'your-password'`
3. Import your history once: `npm run backfill`. This loads daily totals since install, monthly totals and the last 7 days of 5-minute readings. Add `-- --days 14` for more.
4. `npm run dev`.

Business (installer) accounts also need `SOLARMAN_ORG_ID`. See [Solarman notes](#solarman-notes).

## How data flows

```
Solarman API ──(throttled sync)──▶ PostgreSQL ──(server components)──▶ pages
                     ▲
     POST /api/refresh (on page load, then every 5 min while the tab is visible)
```

- Pages read only from the database, so viewing the dashboard never waits on Solarman.
- `POST /api/refresh` asks the sync layer to bring data up to date. Each task has a minimum interval, claimed atomically in the `SyncState` table so several tabs or servers never double-call:

  | Task | Interval | Solarman calls |
  | --- | --- | --- |
  | live (today's 5-minute readings + inverter counters) | `SYNC_INTERVAL_MINUTES` (5) | 2 |
  | devices (status, battery health) | 30 min | 1 + one per battery |
  | daily totals (yesterday, today, this month) | 60 min | 2 |
  | alerts | 30 min | 1 |

  Concurrent requests in one process share a single in-flight call. When nobody has the dashboard open, no calls are made.
- The page re-renders (`router.refresh()`) only when the server reports new data.
- "Refresh now" skips the wait, but at most once a minute.
- Demo mode uses the same path: "sync" fills in today's modelled readings up to the current time. It's a function of the date, not random noise.

## Project layout

```
prisma/              schema, migrations, deterministic seed
scripts/backfill.ts  one-off Solarman history import
src/app/             routes (overview, trends, system, settings), API routes, server actions
src/components/      shell/ overview/ trends/ settings/ charts/ ui/
src/lib/
  solarman/          API client (token cache, retry) + pure mapper (sign conventions, plain-language details)
  sync/              throttled sync, demo sync, event detection (power cuts, low battery)
  energy/            pure logic: power flows, plain-English story, savings, sun times, appliance comparisons
  data/              server queries, URL params, calendar periods
  demo/              deterministic sample-home model
docs/solarman-api/   local copy of the Solarman OpenAPI docs
postman/             Postman collection for poking the API directly
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Start Postgres, apply migrations, seed |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run db:migrate` | Create and apply a migration (development) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Re-seed preferences + demo data (safe to repeat) |
| `npm run db:reset` | Drop everything and re-seed |
| `npm run backfill` | Import real history from Solarman |
| `npm run typecheck` / `lint` / `test` | Quality checks |

## Testing

`npm test` runs Vitest over the pure logic. That covers flow allocation (surplus, shortfall, grid-charging, power cuts, noise), battery time estimates, the plain-English story, Solarman sign conventions and power-cut detection (from captured real payloads), savings maths, calendar periods and like-for-like comparisons, URL param validation, timezone handling, sunrise/sunset, formatting, and the demo model's energy balance.

## Deployment

Any Node host plus a managed PostgreSQL:

1. Set `DATABASE_URL`, `SOLAR_DATA_SOURCE` and the `SOLARMAN_*` variables in the host's environment. Never commit `.env`.
2. Run `npm ci && npm run build`, then run `npm run db:deploy` against the production database.
3. Run `npm run backfill` once (Solarman mode) or `npm run db:seed` (demo mode).
4. Start it with `npm start`.

Secrets stay on the server: the Solarman client and Prisma are `server-only` modules, and only the SHA-256 of the password is stored.

## Solarman notes

- Base URL: `https://globalapi.solarmanpv.com` outside China (`api.solarmanpv.com` is the China data center; using the wrong one gives `AUTH_INVALID_USERNAME_OR_PASSWORD`).
- A token without `orgId` sees SOLARMAN Smart (home) plants; with `orgId` it sees SOLARMAN Business plants. An empty plant list usually means the wrong one.
- Sign conventions (verified on a Deye hybrid): `batteryPower > 0` means the battery is powering the home; `purchasePower > 0` means buying from the power company.
- Power cuts are detected from the inverter's grid voltage and frequency (near zero means off), falling back to the grid relay status.
- Your App ID has a call quota; the throttling above keeps usage to a few hundred calls a day while someone is watching, and none otherwise.

Postman: import `postman/Solarman-OpenAPI.postman_collection.json` and the environment file. Requests fetch a token automatically and save `stationId` and `deviceSn` as you go.

## Known limitations

- The Dribbble reference was behind a human-verification check, so the visual direction ("Daylight": warm paper by day, night sky in dark mode) is original rather than matched to the shot.
- Solarman reports at most every ~5 minutes, so "live" means the latest 5-minute reading.
- Battery size is worked out from the inverter's reported amp-hours at 51.2 V (low-voltage lithium). It's only an estimate for other battery types.
- There's one user and one plant per installation (no login). Put it behind your host's access control if you expose it to the internet.
