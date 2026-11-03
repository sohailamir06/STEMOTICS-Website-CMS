# STEMOTICS Website & CMS

Monorepo for the new STEMOTICS website, staff CMS and registration platform.
Specifications: [`STEMOTICS_R&D_Documentation/DOC/README.md`](STEMOTICS_R&D_Documentation/DOC/README.md).
Folder layout: [`Project-Folder-Structure.md`](STEMOTICS_R&D_Documentation/DOC/Project-Folder-Structure.md).

| Folder    | What it is                                               | Dev URL                      |
| --------- | -------------------------------------------------------- | ---------------------------- |
| `web/`    | Public website + parent portal (React Router SSR)        | http://localhost:5173        |
| `cms/`    | Staff admin (React SPA)                                  | http://localhost:5174/admin/ |
| `server/` | REST API (`src/server.js`) + worker (`src/worker.js`)    | http://localhost:4000/api/v1 |
| `shared/` | Constants, validation schemas, date rules, design tokens | —                            |

## Requirements

- Node.js **22.22+** (see `.nvmrc`; move to Node 24 LTS before launch — Node 22 support ends April 2027)
- A MongoDB **replica set**: MongoDB Atlas (recommended) or a local replica set

> **Windows note:** npm runs scripts through `cmd.exe`, which breaks when the project path contains
> `&` (e.g. `STEMOTICS Website & CMS`). Either rename the folder (e.g. `STEMOTICS-Website-CMS`) or
> tell npm to use Git Bash once per machine:
> `npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`

## First-time setup

```bash
npm install
cp server/.env.example server/.env      # fill in MONGODB_URI and JWT_ACCESS_SECRET
cp web/.env.example web/.env
npm run create-admin -w server -- --email you@stemotics.com --first Jane --last Doe
npm run seed -w server   # filter groups, time slots, 12 regular programs (safe to re-run)
```

## Daily development

```bash
npm run dev          # server + web + cms together
npm run dev:worker   # scheduled jobs: billing, seat holds, enrolment end (run alongside dev)
npm test             # all unit and API tests (in-memory MongoDB, no setup needed)
npm run lint
npm run format
npm run build        # production builds of web and cms
```

## Production

Built apps run under PM2 (`ecosystem.config.cjs`): `web` and `api` in cluster mode, `worker` in
fork mode with **exactly one instance** — scheduled billing must never run twice.
Nginx serves `cms/dist` at `/admin/` and proxies `/api/` to the API and everything else to `web`.
See Phase 11 for the full deployment checklist.

## Build status

| Stage | Scope                                                                | Status      |
| ----- | -------------------------------------------------------------------- | ----------- |
| 0     | Foundation: workspace, auth, roles, API skeleton, worker, SSR shell  | Done        |
| 1     | Catalog, time slots, filters, weekday date picker, staff accounts    | Done        |
| 2     | Checkout, parent accounts, monthly billing (test payments until D-1) | Done        |
| 2b    | Helcim/Stripe payment adapters (after Decision D-1)                  | Waiting     |
| 3     | Rosters, camps & attendance                                          | Next        |
| 4–7   | Medical & forms, content, marketing, launch                          | Not started |
