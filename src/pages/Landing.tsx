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
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
} from 'lucide-react';

const githubUrl = 'https://github.com/Draven047/SeeCen';
const zipUrl = 'https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip';

const featureKeywords = ['Orders', 'Inventory', 'Shipping', 'Returns', 'Finance', 'Customers', 'Analytics', 'AI Coach'];

const kanbanColumns = [
  {
    title: 'NEW',
    count: '18',
    cards: [
      { title: 'Instagram COD bundle', tag: 'COD', tone: 'bg-orange-300 text-orange-950', progress: '42%' },
      { title: 'Website prepaid order', tag: 'Paid', tone: 'bg-sky-300 text-sky-950', progress: '67%' },
    ],
  },
  {
    title: 'PACKED',
    count: '11',
    cards: [
      { title: 'Oxford shirt restock', tag: 'Low stock', tone: 'bg-rose-300 text-rose-950', progress: '28%' },
      { title: 'Workwear set pickup', tag: 'Courier', tone: 'bg-violet-300 text-violet-950', progress: '74%' },
    ],
  },
  {
    title: 'SHIPPED',
    count: '24',
    cards: [
      { title: 'Mumbai same-day route', tag: 'Live', tone: 'bg-emerald-300 text-emerald-950', progress: '86%' },
      { title: 'Return approval queue', tag: 'Review', tone: 'bg-amber-300 text-amber-950', progress: '51%' },
    ],
  },
];

const featureSections = [
  {
    icon: ShoppingCart,
    title: 'Orders, fulfilment, and customer context in one view.',
    body: 'Track marketplace, website, walk-in, COD, prepaid, packed, shipped, delivered, and return states without connecting a backend.',
  },
  {
    icon: Boxes,
    title: 'Inventory health that behaves like a working demo.',
    body: 'Seeded stores, products, variants, thresholds, and low-stock warnings make the sandbox useful from the first click.',
  },
  {
    icon: LineChart,
    title: 'Finance, analytics, and AI coaching without paid setup.',
    body: 'Review revenue, settlements, COD reconciliation, invoices, channel mix, and deterministic local AI Coach recommendations.',
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

const demoNotes = [
  { icon: Database, title: 'No Supabase required', body: 'The public demo uses a local in-memory adapter.' },
  { icon: RefreshCw, title: 'Refresh resets data', body: 'Change anything, then reload to return to the seed state.' },
  { icon: KeyRound, title: 'Bring your own AI later', body: 'The current AI Coach is local and deterministic.' },
];

function PrimaryGlowCta() {
  return (
    <Button
      asChild
      size="lg"
      className="group h-12 min-w-56 rounded-full border border-white/80 bg-white px-7 text-xs font-black uppercase tracking-[0.12em] text-[#2b1608] shadow-[0_0_28px_rgba(251,146,60,0.85),inset_0_0_18px_rgba(255,237,213,0.9)] hover:bg-orange-50"
    >
      <Link to="/demo/dashboard">
        See in action
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </Button>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="absolute -inset-x-6 -top-8 h-20 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111113]/95 shadow-[0_-10px_36px_rgba(251,146,60,0.18),0_38px_110px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/80 to-transparent" />
        <div className="grid min-h-[420px] grid-cols-[64px_190px_1fr] md:grid-cols-[72px_220px_1fr_270px]">
          <aside className="border-r border-white/8 bg-black/35 px-3 py-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-orange-300/25 bg-orange-300/10 text-sm font-black text-orange-100">
              SC
            </div>
            <div className="mt-8 space-y-4 text-zinc-600">
              {[Store, ShoppingCart, Boxes, Truck, LineChart, Bot].map((Icon, index) => (
                <div
                  key={index}
                  className={`grid h-9 w-9 place-items-center rounded-lg ${index === 1 ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'text-zinc-600'}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </aside>

          <aside className="hidden border-r border-white/8 bg-black/20 p-5 text-sm text-zinc-500 sm:block">
            <p className="mb-5 text-base font-semibold text-zinc-100">SeeCen</p>
            <div className="rounded-lg border border-white/8 bg-black/35 px-3 py-2 text-xs text-zinc-600">Search orders...</div>
            <div className="mt-6 space-y-3">
              {['Dashboard', 'Orders', 'Inventory', 'Shipping', 'Returns', 'Finance'].map((item, index) => (
                <div key={item} className={`rounded-lg px-3 py-2 ${index === 1 ? 'bg-white/8 text-white' : ''}`}>
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-white/8 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Stores</p>
              <div className="mt-4 space-y-3">
                <p className="text-zinc-300">Mumbai</p>
                <p>Delhi</p>
                <p>Bengaluru</p>
              </div>
            </div>
          </aside>

          <section className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 border-b border-white/8 pb-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-zinc-600">Operations / Orders</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Today&apos;s selling queue</h2>
              </div>
              <div className="flex -space-x-2">
                {['A', 'R', 'M', '+5'].map((item) => (
                  <span key={item} className="grid h-8 w-8 place-items-center rounded-full border border-[#111113] bg-zinc-700 text-xs text-zinc-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {kanbanColumns.map((column) => (
                <div key={column.title} className="min-w-0">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold text-zinc-500">
                    <span>{column.title}</span>
                    <span>{column.count}</span>
                  </div>
                  <div className="space-y-3">
                    {column.cards.map((card) => (
                      <article key={card.title} className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                        <p className="text-sm font-medium text-zinc-200">{card.title}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${card.tone}`}>{card.tag}</span>
                          <span className="text-xs text-zinc-600">{card.progress}</span>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-300 to-violet-300" style={{ width: card.progress }} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="hidden border-l border-white/8 bg-black/25 p-5 md:block">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Inbox</p>
              <Sparkles className="h-4 w-4 text-orange-200" />
            </div>
            <div className="mt-5 space-y-4">
              {[
                ['AI Coach', 'Bundle high-margin workwear with pending COD orders.'],
                ['Inventory', 'Oxford shirt stock is below the reorder threshold.'],
                ['Finance', 'COD settlement has 3 orders ready for audit.'],
                ['Shipping', 'Same-day pickup route is 86% complete.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-sm font-semibold text-zinc-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">{body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <header className="sticky top-0 z-50 bg-[#050505]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="SeeCen home">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-xs font-black text-black">SC</span>
            <span className="text-xl font-black tracking-tight">SeeCen</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#demo" className="hover:text-white">Demo</a>
            <a href="#open-source" className="hover:text-white">Open source</a>
            <a href={zipUrl} className="hover:text-white">Download</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full text-zinc-200 hover:bg-white/10 hover:text-white sm:inline-flex">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" />
                Star Us
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:inline-flex">
              <a href={zipUrl}>Download</a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link to="/demo/dashboard">View Demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/8 bg-[#050505]">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_75%_20%,rgba(129,140,248,0.12),transparent_32%)]" />
        <div className="relative mx-auto min-h-[calc(100svh-4rem)] w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-6xl font-black leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-[5.7rem]">
              Everything app for modern sellers
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              SeeCen, an open-source seller operations platform, brings orders,
              inventory, shipping, finance, customers, analytics, and AI coaching together.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <PrimaryGlowCta />
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-zinc-200 hover:bg-white/10 hover:text-white">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-24 lg:mt-28">
            <ProductPreview />
          </div>

          <div className="mx-auto mt-8 max-w-6xl border-t border-white/8 pt-5">
            <p className="text-sm text-zinc-500">Everything you need to run seller operations.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-white">
              {featureKeywords.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  {item}
                  {item !== featureKeywords[featureKeywords.length - 1] && <span className="text-zinc-600">·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#050505] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.72fr_1fr]">
          <div>
            <Badge className="rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/5">
              Product-led demo
            </Badge>
            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              One calm surface for the work that usually scatters.
            </h2>
          </div>
          <div className="grid gap-4">
            {featureSections.map((feature) => (
              <article key={feature.title} className="grid gap-5 border-t border-white/10 py-8 md:grid-cols-[56px_1fr]">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-orange-200">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-y border-white/8 bg-[#09090b] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div>
            <Badge className="rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10">
              Resettable demo
            </Badge>
            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Try the dashboard without accounts or setup.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
              Create orders, update stock, move shipments, approve returns, and read local
              AI recommendations. Refresh the page and the demo returns to normal.
            </p>
            <div className="mt-8 grid gap-3">
              {demoNotes.map((note) => (
                <div key={note.title} className="flex gap-4 border-t border-white/10 py-5">
                  <note.icon className="mt-1 h-5 w-5 shrink-0 text-orange-200" />
                  <div>
                    <p className="font-semibold text-white">{note.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{note.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/45 p-4">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <p className="font-semibold">Demo surfaces</p>
              <PackageCheck className="h-5 w-5 text-orange-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {demoRoutes.map((route) => (
                <Link
                  key={route}
                  to={route}
                  className="group rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-zinc-300 transition hover:border-orange-200/40 hover:text-white"
                >
                  {route}
                  <ArrowRight className="mt-3 h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-orange-200" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="open-source" className="bg-[#050505] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div>
            <Store className="h-10 w-10 text-orange-200" />
            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Own it, fork it, improve it.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              SeeCen runs for free as an in-browser demo. Open-source users can add
              persistent storage, marketplace connectors, and their own AI provider when
              they are ready.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['No Supabase required for demo', 'Refresh resets data', 'Bring-your-own-key ready'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0b0b0d] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Github className="h-4 w-4" />
              Run locally
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black p-5 text-sm leading-7 text-zinc-300">
              <code>{`git clone https://github.com/Draven047/SeeCen.git
cd SeeCen
bun install
bun run dev`}</code>
            </pre>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full bg-white text-black hover:bg-orange-50">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  View Repository
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
                <a href={zipUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-[#050505] px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Sparkles className="mx-auto h-8 w-8 text-orange-200" />
          <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Open the demo and run the day.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Explore the dashboard, change the data, and refresh whenever you want a clean start.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryGlowCta />
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10">
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
