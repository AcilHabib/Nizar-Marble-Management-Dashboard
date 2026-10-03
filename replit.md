# Nizar Marble Management Dashboard

Arabic-first bilingual dashboard for running a marble factory's analytics, inventory, orders, payments, finance, and staff operations.

## Run & Operate

- `pnpm dev:api` — API server on port 8080 (requires `DATABASE_URL` in `.env`)
- `pnpm dev` — dashboard on port 25627 (proxies `/api` to the API server)
- `pnpm dev:all` — run API + dashboard together
- `pnpm db:push` / `pnpm db:seed` — sync Prisma schema and seed MongoDB
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — MongoDB connection string (see `.env.example`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB Atlas + Prisma ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nizar-marble-dashboard/src/App.tsx` — dashboard routes, mock data, and UI behavior
- `artifacts/nizar-marble-dashboard/src/index.css` — Tailwind theme tokens and global styles
- `artifacts/nizar-marble-dashboard/.replit-artifact/artifact.toml` — artifact routing and preview configuration
- `artifacts/api-server/` — shared API service scaffold; not used by the current mock-data dashboard

## Architecture decisions

- The dashboard reads and writes through the Express API (`/api/*`) backed by MongoDB via Prisma.
- The dashboard uses the shared React + Vite artifact template with Wouter routing so all requested pages work within the artifact's preview path.
- Arabic is the default interface direction; switching to French changes copy and document direction to LTR.
- Form submissions and CRUD controls are intentionally mocked with local state until a backend contract is defined.

## Product

Nizar Marble gives factory owners and staff a single operational view of revenue, orders, stock, customer payments, costs, and staff accounts. It includes responsive navigation, analytics, searchable inventory and order workflows, order payment details, finance summaries, and owner-only settings.

## User preferences

 - Arabic RTL as the default language, with French LTR as the alternate.
 - Use the exact stone, graphite, and status colors from the product brief.

## Gotchas

- The dashboard artifact workflow supplies `PORT` and `BASE_PATH`; run it through the managed workflow rather than starting Vite without those variables.
- Ensure MongoDB Atlas **Network Access** allows your IP (or `0.0.0.0/0` for dev) before running `pnpm db:push`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
