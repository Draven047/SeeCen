# Contributing to SeeCen

Thanks for wanting to improve SeeCen! This guide keeps contributions smooth.

## Getting started

```sh
git clone https://github.com/Draven047/SeeCen.git
cd SeeCen
bun install
bun run dev
```

The app runs at `http://localhost:8080` with a fully seeded in-browser demo —
no backend or env vars needed. Data persists to localStorage; use the
**Demo → Reset demo data** control in the header to start fresh.

## Before you open a PR

```sh
bunx tsc -p tsconfig.app.json --noEmit   # must pass
bun run build                             # must pass
bun run lint                              # advisory (legacy debt exists; don't add new errors)
```

CI runs the same checks on every pull request.

## Where things live

| Area | Path |
| --- | --- |
| Pages / screens | `src/pages/` |
| Layout shell (sidebar, header, nav) | `src/components/layout/` |
| shadcn/ui primitives | `src/components/ui/` |
| Demo backend (seed + query engine) | `src/integrations/supabase/demoData.ts`, `demoClient.ts` |
| Backend switcher (demo vs Supabase) | `src/integrations/supabase/client.ts` |
| Branding / currency config | `src/config/brand.ts` |
| PDF generators | `src/lib/invoiceGenerator.ts`, `src/lib/packSlip.ts` |
| Database schema (for self-hosting) | `supabase/migrations/` |

## Conventions

- TypeScript + Tailwind; match the style of the file you're editing.
- Fulfillment statuses follow the workflow: `new → accepted → picking →
  packed → ready → in_transit → delivered` (or `cancelled`/`declined`).
- The demo backend mirrors the supabase-js API — if you add a query pattern
  the mock doesn't support, extend `DemoQueryBuilder` in `demoClient.ts`.
- Heads-up on legacy naming: the `cigars` table mirrors `products`, and
  loyalty points are `fume_points_*`. Renaming is planned as a breaking
  v2 migration — don't rename piecemeal.

## Good first contributions

- Dark mode: migrate hardcoded hex values to the tokens in `src/index.css`
- Paying down `bun run lint` errors in a page you touch
- New marketplace connector stubs in `src/lib/channelConnectorsV2.ts`
- Analytics: cohort retention, repeat-purchase rate, CSV exports

## Reporting bugs

Use the issue templates. Include the route, what you expected, what happened,
and whether you were in demo mode or connected to Supabase.
