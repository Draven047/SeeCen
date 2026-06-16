# SeeCen

SeeCen is an open-source seller command center for managing orders, inventory, customers, shipping, returns, finance, analytics, and AI-assisted sales coaching.

The app is designed to be easy to try, fork, and self-host. It runs out of the box with a resettable in-browser demo, so you do not need Supabase, a database, or paid API keys to explore the product.

Live demo: https://seecen.seekerscentral.com

Repository: https://github.com/Draven047/SeeCen

## What SeeCen Includes

- Public landing page with product details and open-source download links
- Resettable demo dashboard under `/demo/dashboard`
- Order queue and fulfillment workflow
- Customer management and customer 360 views
- Product catalogue and inventory health
- Shipping, pickup, and tracking screens
- Returns and exchange workflows
- Finance, settlements, COD reconciliation, invoices, and credit notes
- Analytics dashboards for sales and operations
- Local deterministic AI Coach for demo insights

## Demo Mode

SeeCen currently ships as a demo-first open-source app.

- No Supabase project is required.
- No `.env` file is required.
- Demo data is seeded in the browser at app load.
- Changes persist while you navigate inside the app.
- Refreshing the browser resets the demo to the original seeded state.
- The AI Coach uses local deterministic insights from demo data.

This makes the project simple for anyone to download, run, inspect, and improve without paying for hosted services.

## Tech Stack

- Bun
- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Lucide icons

## Download and Run Locally

### Option 1: Clone with Git

```sh
git clone https://github.com/Draven047/SeeCen.git
cd SeeCen
bun install
bun run dev
```

Open the local URL shown in your terminal, usually:

```txt
http://localhost:8080
```

### Option 2: Download ZIP

Download the latest source code:

```txt
https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip
```

Then unzip it and run:

```sh
cd SeeCen-main
bun install
bun run dev
```

## Useful Commands

```sh
bun install
```

Install dependencies.

```sh
bun run dev
```

Start the development server.

```sh
bun run build
```

Create a production build.

```sh
bun run preview
```

Preview the production build locally.

```sh
bun run lint
```

Run lint checks.

## App Routes

Public:

```txt
/
```

Demo:

```txt
/demo/dashboard
/demo/orders
/demo/customers
/demo/inventory
/demo/finance
/demo/shipping
/demo/returns
/demo/analytics
/demo/ai-coach
```

## Optional AI Provider Setup

The current open-source demo does not call an external AI provider. The AI Coach generates local deterministic recommendations from seeded demo data.

If you want to extend SeeCen with your own AI provider later, start from `.env.example`:

```sh
cp .env.example .env
```

Then add your own provider values:

```txt
AI_PROVIDER_API_KEY=
AI_PROVIDER_CHAT_URL=
AI_PROVIDER_MODEL=
```

## Deployment

SeeCen is a Vite single-page app. It can be deployed to Vercel, Netlify, Cloudflare Pages, or any static host.

For Vercel:

```sh
bun run build
```

Build command:

```txt
bun run build
```

Output directory:

```txt
dist
```

The included `vercel.json` rewrites all routes to `index.html`, so direct refreshes like `/demo/orders` work correctly.

## Project Direction

SeeCen is built to become a practical, open-source seller operating system. The current version focuses on a strong free demo and a clean foundation. Future self-hosted versions can add persistent storage, authentication, real marketplace connectors, and bring-your-own-key AI providers.

## License

This project is open source. Add your preferred license in `LICENSE` before distributing modified versions publicly.
