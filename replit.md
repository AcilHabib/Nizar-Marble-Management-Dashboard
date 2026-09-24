# Nizar Marble Management Dashboard

Arabic-first bilingual dashboard for running a marble factory's analytics, inventory, orders, payments, finance, and staff operations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/nizar-marble-dashboard run dev` — run the dashboard preview
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nizar-marble-dashboard/src/App.tsx` — dashboard routes, mock data, and UI behavior
- `artifacts/nizar-marble-dashboard/src/index.css` — Tailwind theme tokens and global styles
- `artifacts/nizar-marble-dashboard/.replit-artifact/artifact.toml` — artifact routing and preview configuration
- `artifacts/api-server/` — shared API service scaffold; not used by the current mock-data dashboard

## Architecture decisions

- The first build is frontend-only with local mock JSON data, matching the approved scaffold and keeping the dashboard immediately usable without setup.
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
- The current data layer is mock-only; replacing it with real persistence requires defining an OpenAPI contract before wiring frontend mutations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
