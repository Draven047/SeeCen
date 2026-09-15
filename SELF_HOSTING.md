# Self-hosting SeeCen

SeeCen runs in three modes. Pick the one that fits how you want to use it.

| Mode | Setup | Data |
| --- | --- | --- |
| **Demo (default)** | None — clone and run | Seeded in the browser, saved to localStorage |
| **Local persistent** | None — same as demo | Your edits survive refreshes on the same browser |
| **Your own Supabase** | ~15 minutes | Real Postgres database, multi-user, real auth |

## Mode 1 & 2: Demo / local persistent

```sh
git clone https://github.com/Draven047/SeeCen.git
cd SeeCen
bun install
bun run dev
```

That's it. The app seeds ~90 days of realistic store data in your browser on
first load and saves every change you make to localStorage.

Two things to know:

- **Your changes stick.** Creating orders, editing products, processing
  returns — all of it survives refreshes and restarts on the same browser.
- **Untouched demos re-seed daily.** If you never modify anything, the
  sandbox refreshes itself after 24 hours so the seeded orders stay
  current-dated. The moment you change something, it stops re-seeding and
  your data is kept until you press **Demo → Reset demo data** in the header.

This is great for evaluating, demoing, and hacking on the UI. It is not a
real backend: data lives in one browser only.

## Mode 3: Connect your own Supabase

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) (free tier is fine) and
create a new project.

### 2. Apply the database schema

The full schema lives in `supabase/migrations/`. Two ways to apply it:

**Option A — Supabase CLI (recommended):**

```sh
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL editor:** open your project's SQL editor and run each file
in `supabase/migrations/` in filename (timestamp) order.

### 3. Configure environment variables

```sh
cp .env.example .env
```

Fill in the two values from your Supabase project settings (Settings → API):

```txt
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Restart the dev server. When both variables are present, SeeCen talks to
your Supabase project instead of the in-browser demo backend.

### 4. Create your first admin user

Sign up through the app's `/auth` page, then approve yourself in the SQL
editor (the approval flow normally requires an existing admin):

```sql
insert into user_roles (user_id, role, is_approved)
values ('<your-auth-user-id>', 'admin', true);
```

Find your user id in Authentication → Users. After that, new team members
can sign up and you approve them from Admin → Approvals inside the app.

You'll also want at least one store row:

```sql
insert into stores (name, address) values ('My Store', 'City');
```

### 5. Deploy

SeeCen builds to a static bundle, so any static host works. For Vercel:

- Build command: `bun run build`
- Output directory: `dist`
- Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  in the project settings (omit them to deploy the demo instead)

The included `vercel.json` rewrites all routes to `index.html` so deep links
like `/demo/orders` work on refresh.

## White-labeling

Basic branding lives in [`src/config/brand.ts`](src/config/brand.ts): app
name, tagline, currency, and locale. Currency formatting throughout the
dashboard flows through this file. Page metadata is in `index.html`.

## Known legacy naming

Parts of the database schema use names from an earlier incarnation of this
project: the `cigars` table mirrors `products`, and loyalty points are
stored as `fume_points_*`. They behave exactly like products and loyalty
points; a future migration will rename them. If you write custom queries,
be aware of the aliases.

## AI Coach

The demo ships with a local, deterministic AI Coach (no API key, no network
calls). The Supabase edge functions in `supabase/functions/` show how a real
provider can be wired; `.env.example` reserves `AI_PROVIDER_*` variables for
your own integration.
