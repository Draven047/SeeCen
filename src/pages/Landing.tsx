import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Database,
  Download,
  Github,
  KeyRound,
  LineChart,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  Workflow,
} from 'lucide-react';

const githubUrl = 'https://github.com/Draven047/SeeCen';
const zipUrl = 'https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip';

const heroStats = [
  { label: 'Orders today', value: '42', tone: 'text-violet-200' },
  { label: 'Revenue tracked', value: 'Rs 1.8L', tone: 'text-amber-200' },
  { label: 'Low stock alerts', value: '07', tone: 'text-rose-200' },
  { label: 'Shipments moving', value: '19', tone: 'text-sky-200' },
];

const featureKeywords = [
  'Orders',
  'Inventory',
  'Shipping',
  'Returns',
  'Finance',
  'Customers',
  'Analytics',
  'AI Coach',
];

const featureBands = [
  {
    icon: ShoppingCart,
    eyebrow: 'Order operations',
    title: 'Move every sale through one practical queue.',
    body: 'Track marketplace, website, walk-in, COD, prepaid, pickup, packed, shipped, and delivered states from a seller-focused command center.',
    points: ['Unified order queue', 'Fulfillment-ready views', 'Linked customer context'],
  },
  {
    icon: Boxes,
    eyebrow: 'Inventory health',
    title: 'Spot stock pressure before it becomes missed revenue.',
    body: 'See seeded products, variants, thresholds, low-stock warnings, and stock movement in a demo that behaves like a working app.',
    points: ['Variant-level stock', 'Low-stock alerts', 'Catalogue context'],
  },
  {
    icon: Truck,
    eyebrow: 'Shipping and returns',
    title: 'Keep dispatch, pickup, returns, and exchange work visible.',
    body: 'Follow shipments from packed to pickup and delivery, then handle return decisions without needing a backend service.',
    points: ['Pickup workflow', 'Tracking events', 'Return approvals'],
  },
  {
    icon: LineChart,
    eyebrow: 'Finance and analytics',
    title: 'Read the business without leaving operations.',
    body: 'Review revenue, settlements, COD reconciliation, invoices, credit notes, channel mix, and operational trends in the same demo workspace.',
    points: ['Sales trends', 'COD reconciliation', 'Audit-friendly finance'],
  },
  {
    icon: Users,
    eyebrow: 'Customer memory',
    title: 'Bring customer context into daily seller decisions.',
    body: 'Explore customer 360 views with loyalty, birthdays, purchase history, returns, and practical selling context.',
    points: ['Customer 360', 'Purchase history', 'Loyalty signals'],
  },
  {
    icon: Bot,
    eyebrow: 'Local AI Coach',
    title: 'Get deterministic coaching without an API key.',
    body: 'SeeCen generates local demo insights now, with a clean path for open-source users to connect their own AI provider later.',
    points: ['No paid AI needed', 'Local recommendations', 'Bring-your-own-key path'],
  },
];

const demoRoutes = [
  '/demo/dashboard',
  '/demo/orders',
  '/demo/customers',
  '/demo/inventory',
  '/demo/finance',
  '/demo/shipping',
  '/demo/returns',
  '/demo/analytics',
  '/demo/ai-coach',
];

const demoGuarantees = [
  { icon: Database, title: 'No Supabase required', body: 'The public demo uses a local in-memory adapter and starts instantly.' },
  { icon: RefreshCw, title: 'Refresh resets data', body: 'Play with actions freely. A browser refresh brings the seed state back.' },
  { icon: KeyRound, title: 'Optional AI keys later', body: 'The v1 coach is local, with room for self-hosters to wire their own provider.' },
];

function GlowButton({ children }: { children: ReactNode }) {
  return (
    <Button
      asChild
      size="lg"
      className="group relative h-12 overflow-hidden rounded-full border border-white/25 bg-white px-6 text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 shadow-[0_0_36px_rgba(251,146,60,0.55)] hover:bg-amber-50"
    >
      {children}
    </Button>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050507]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-bold" aria-label="SeeCen home">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-sm font-black text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.25)]">
              SC
            </span>
            <span className="text-lg tracking-tight">SeeCen</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#demo" className="transition-colors hover:text-white">Demo</a>
            <a href="#open-source" className="transition-colors hover:text-white">Open source</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full text-zinc-300 hover:bg-white/10 hover:text-white sm:inline-flex">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden rounded-full border-white/15 bg-white/[0.03] text-zinc-200 hover:bg-white/10 hover:text-white md:inline-flex">
              <a href={zipUrl}>
                <Download className="mr-2 h-4 w-4" />
                ZIP
              </a>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-white text-zinc-950 hover:bg-amber-50">
              <Link to="/demo/dashboard">
                View Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100svh-4rem)] border-b border-white/10">
        <img
          src="/seecen-ops-command-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[63%_50%] opacity-80"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_32%,rgba(124,58,237,0.18),transparent_34%),linear-gradient(90deg,#050507_0%,rgba(5,5,7,0.96)_22%,rgba(5,5,7,0.68)_56%,rgba(5,5,7,0.42)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#050507] to-transparent" />

        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl flex-col justify-between px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="max-w-4xl">
            <Badge className="mb-7 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-200 hover:bg-white/10">
              Open-source seller operations
            </Badge>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-7xl lg:text-[6.7rem]">
              Open-source command center for modern sellers
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-300 sm:text-xl sm:leading-8">
              SeeCen brings orders, inventory, shipping, returns, customers, finance,
              analytics, and local AI coaching into one resettable dashboard anyone can
              run for free.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GlowButton>
                <Link to="/demo/dashboard">
                  View Demo
                  <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </GlowButton>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-6 text-zinc-100 hover:bg-white/10 hover:text-white">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  Star on GitHub
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-full text-zinc-300 hover:bg-white/10 hover:text-white">
                <a href={zipUrl}>
                  <Download className="mr-2 h-5 w-5" />
                  Download ZIP
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-[0.82fr_1fr] lg:items-end">
            <div className="rounded-[22px] border border-white/10 bg-black/45 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Today at SeeCen Mumbai</p>
                  <p className="text-xs text-zinc-500">Local seeded demo data</p>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Live sandbox
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {heroStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className={`text-2xl font-black ${item.tone}`}>{item.value}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                  <div className="mb-3 flex items-center gap-2 text-amber-200">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm font-semibold">AI Coach signal</p>
                  </div>
                  <p className="text-sm leading-6 text-zinc-300">
                    Push packed Instagram orders first, replenish workwear shirts,
                    and bundle one high-margin finance-ready offer.
                  </p>
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4">
                  <p className="mb-3 text-sm font-semibold text-violet-100">Operations pulse</p>
                  {['COD reconciliation', 'Pickup queue', 'Return approvals'].map((label, index) => (
                    <div key={label} className="mb-3 last:mb-0">
                      <div className="mb-1 flex justify-between text-xs text-zinc-400">
                        <span>{label}</span>
                        <span>{[82, 64, 48][index]}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-300 to-amber-200"
                          style={{ width: `${[82, 64, 48][index]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="text-sm text-zinc-500">Everything a seller needs to run the day.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-zinc-100">
              {featureKeywords.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-amber-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative border-b border-white/10 bg-[#07070a] px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <Badge className="mb-5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/5">
              Product-led demo
            </Badge>
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Built as the app, not a brochure.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              The landing page points into a real demo workspace with linked records,
              local mutations, and deterministic AI-style insight generation.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {featureBands.map((feature, index) => (
              <article
                key={feature.title}
                className="group rounded-[28px] border border-white/10 bg-white/[0.035] p-6 transition-colors hover:border-amber-200/30 hover:bg-white/[0.055] sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/40 text-amber-200">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-600">
                    0{index + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
                  {feature.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {feature.points.map((point) => (
                    <span key={point} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-zinc-300">
                      {point}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="relative overflow-hidden border-b border-white/10 bg-[#050507] px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-start">
          <div>
            <Badge className="mb-5 rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10">
              Resettable demo mode
            </Badge>
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Try every workflow without setting anything up.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-400">
              Create orders, update stock, move shipments, approve returns, and read
              local AI Coach recommendations. Your changes live while you navigate,
              then reset on refresh.
            </p>

            <div className="mt-8 grid gap-3">
              {demoGuarantees.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-amber-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/50 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-semibold text-white">Demo route map</p>
                <p className="text-sm text-zinc-500">Open any surface directly.</p>
              </div>
              <Workflow className="h-5 w-5 text-violet-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {demoRoutes.map((route) => (
                <Link
                  key={route}
                  to={route}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-zinc-300 transition hover:border-amber-200/40 hover:bg-amber-200/10 hover:text-white"
                >
                  <span>{route}</span>
                  <ArrowRight className="mt-3 h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-amber-200" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="open-source" className="border-b border-white/10 bg-[#08080c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-200">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Own it, fork it, self-host it.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              SeeCen ships with a no-cost in-browser demo today. Open-source users can
              fork the repo, run it locally, and later connect persistent storage,
              marketplace connectors, or their own AI provider.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['No paid backend for demo', 'Local AI Coach in v1', 'Clean BYO provider path'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/55 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Github className="h-4 w-4" />
              Run SeeCen locally
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#050507] p-5 text-sm leading-7 text-zinc-300">
              <code>{`git clone https://github.com/Draven047/SeeCen.git
cd SeeCen
bun install
bun run dev`}</code>
            </pre>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button asChild className="rounded-full bg-white text-zinc-950 hover:bg-amber-50">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  View Repository
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-zinc-100 hover:bg-white/10 hover:text-white">
                <a href={zipUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#050507] px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(124,58,237,0.14),transparent_38%)]" />
        <div className="relative mx-auto max-w-4xl">
          <Badge className="mb-6 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/5">
            Free to explore
          </Badge>
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            Open the demo. Break the data. Refresh and begin again.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            SeeCen is ready to inspect, fork, and improve from the first click.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <GlowButton>
              <Link to="/demo/dashboard">
                View Demo
                <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </GlowButton>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-6 text-zinc-100 hover:bg-white/10 hover:text-white">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="mr-2 h-5 w-5" />
                Star on GitHub
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-full text-zinc-300 hover:bg-white/10 hover:text-white">
              <a href={zipUrl}>
                <Download className="mr-2 h-5 w-5" />
                Download ZIP
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
