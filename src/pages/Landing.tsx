import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  ArrowRight,
  Languages,
  Laptop,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Boxes,
  Command,
  Database,
  Download,
  Github,
  Globe,
  IndianRupee,
  Package,
  PackageCheck,
  RotateCcw,
  Scale,
  ShoppingCart,
  Sparkles,
  Terminal,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from 'lucide-react';

const githubUrl = 'https://github.com/Draven047/SeeCen';
const zipUrl = 'https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip';
const selfHostingUrl = 'https://github.com/Draven047/SeeCen/blob/main/SELF_HOSTING.md';

const PURPLE = '#563ed5';

const features = [
  { icon: ShoppingCart, title: 'Orders & POS queue', body: 'A single queue from new to delivered — accept, pick, pack, ship, and close orders with SLA timers on every card.', path: '/demo/orders' },
  { icon: PackageCheck, title: 'Fulfillment board', body: 'Picklists, packing, and dispatch decisions organized so the next action is always obvious.', path: '/demo/fulfillment' },
  { icon: Truck, title: 'Shipping & tracking', body: 'Book pickups, follow shipments and AWB events, and mark deliveries from one screen.', path: '/demo/shipping' },
  { icon: RotateCcw, title: 'Returns & exchanges', body: 'Review return requests, approve refunds or exchanges, and restock items cleanly.', path: '/demo/returns' },
  { icon: Boxes, title: 'Inventory health', body: 'Stock levels per store, low-stock alerts, and replenishment requests before you sell out.', path: '/demo/inventory' },
  { icon: Package, title: 'Product catalogue', body: 'Products, variants, pricing, and imagery managed in one catalogue shared across stores.', path: '/demo/catalogue' },
  { icon: Users, title: 'Customers & 360 view', body: 'Every customer with their orders, loyalty points, and follow-up context in one profile.', path: '/demo/customers' },
  { icon: IndianRupee, title: 'Finance control', body: 'Settlements, COD reconciliation, GST invoices, and credit notes — the money side, closed properly.', path: '/demo/finance' },
  { icon: BarChart3, title: 'Analytics board', body: 'Sales, operations, inventory, and team performance with real trends, not vanity charts.', path: '/demo/analytics' },
  { icon: TrendingUp, title: 'Growth & offers', body: 'Run discounts, bundles, and campaign ideas with prefilled playbooks for common promotions.', path: '/demo/growth' },
  { icon: Bot, title: 'AI Coach', body: 'Daily prioritized advice from your own data: follow-ups, stock priorities, and pitch ideas.', path: '/demo/ai-coach' },
  { icon: Command, title: '⌘K command palette', body: 'Jump to any page or search orders, customers, and products from anywhere in the app.', path: '/demo/dashboard' },
];

const deepDives = [
  {
    id: 'hub',
    image: '/landing-hub.png',
    alt: 'SeeCen Hub dashboard showing revenue, analytics chart, and progress metrics',
    kicker: 'The Hub',
    title: 'One glance tells you what today needs.',
    points: [
      'Revenue with real deltas across Today, 7-day, and 30-day ranges',
      'A needs-attention queue: SLA breaches, returns, low stock, pending COD',
      'On-time dispatch score, monthly target progress, channel mix, top products',
    ],
    path: '/demo/dashboard',
  },
  {
    id: 'orders',
    image: '/landing-orders.png',
    alt: 'SeeCen orders queue with status tabs from new to delivered',
    kicker: 'Orders',
    title: 'Work the queue, not a spreadsheet.',
    points: [
      'Status tabs mirror the real workflow: new, accepted, packed, in transit, delivered',
      'One-click transitions move each order to its next step',
      'POS mode, CSV import, and urgency sorting built in',
    ],
    path: '/demo/orders',
  },
  {
    id: 'finance',
    image: '/landing-finance.png',
    alt: 'SeeCen finance payouts with settlements and COD reconciliation',
    kicker: 'Finance',
    title: 'Close the money loop, channel by channel.',
    points: [
      'Weekly settlements with commission, shipping, and TDS deductions itemized',
      'COD reconciliation tracked until every rupee is collected',
      'GST invoices and credit notes generated from real order data',
    ],
    path: '/demo/finance',
  },
];

const runModes = [
  {
    icon: Globe,
    title: 'Try it in the browser',
    body: 'The live demo seeds ~90 days of store data locally. Your changes persist between visits, and a reset button starts you fresh. No signup, no keys.',
    cta: { label: 'Open live demo', to: '/demo/dashboard', external: false },
  },
  {
    icon: Terminal,
    title: 'Clone and run locally',
    body: 'Everything runs out of the box — the same in-browser backend powers your local copy, so you can inspect and extend it immediately.',
    snippet: ['git clone https://github.com/Draven047/SeeCen.git', 'cd SeeCen && bun install', 'bun run dev'],
    cta: { label: 'View on GitHub', to: githubUrl, external: true },
  },
  {
    icon: Database,
    title: 'Self-host with Supabase',
    body: 'Set two environment variables and SeeCen switches to your own Postgres database with real auth and multi-user roles. Migrations included.',
    cta: { label: 'Read the self-hosting guide', to: selfHostingUrl, external: true },
  },
];

const stackChips = ['Bun', 'Vite', 'React', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'Recharts', 'Supabase-ready'];

const landingNavItems = [
  { label: 'Home', targetId: 'home' },
  { label: 'Features', targetId: 'features' },
  { label: 'Inside', targetId: 'inside' },
  { label: 'For sellers', targetId: 'download' },
  { label: 'Open source', targetId: 'open-source' },
];

const releasesUrl = 'https://github.com/Draven047/SeeCen/releases/latest';

const SELLER_LANGUAGES = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी'];

function ForSellersSection() {
  const { canInstall, install } = usePwaInstall();
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <section id="download" className="px-3 py-10 md:px-5">
      <div className="mx-auto max-w-[1280px] rounded-[28px] bg-[#563ed5] p-6 text-white md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">For sellers — no tech needed</p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[1] tracking-[-0.05em] md:text-5xl">
              Run your shop on it. No coding, no setup.
            </h2>
            <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-white/80">
              Download SeeCen like any normal app, open it, and set up your own store in
              two minutes — in your language. Your data never leaves your computer, and
              you can take a one-tap backup anytime.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={releasesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#563ed5] transition-transform hover:scale-[1.03]"
              >
                <Laptop className="h-4 w-4" />
                Download for {isMac ? 'Mac' : 'Windows'}
              </a>
              {canInstall ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-black text-white transition-colors hover:bg-white/20"
                >
                  Install from browser
                </button>
              ) : (
                <Link
                  to="/demo/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-black text-white transition-colors hover:bg-white/20"
                >
                  Use in browser
                </Link>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Languages className="h-4 w-4 text-white/70" />
              {SELLER_LANGUAGES.map((lang) => (
                <span key={lang} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90">{lang}</span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { step: '1', title: 'Download & open', body: 'Get the app for Windows or Mac, or install straight from this website — no account needed.' },
              { step: '2', title: 'Set up your store', body: 'Pick your language, type your store name, and your empty store is ready. Or explore with sample data first.' },
              { step: '3', title: 'Sell', body: 'Add products, take orders, print pack slips, chase failed deliveries, and watch your real profit — all offline-friendly.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 rounded-[22px] bg-white/10 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#563ed5]">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/75">{item.body}</p>
                </div>
              </div>
            ))}
            <p className="px-2 text-[11px] font-medium leading-5 text-white/60">
              Windows may show a “Windows protected your PC” notice because the app is new and
              unsigned — click “More info → Run anyway”. On Mac, right-click the app and choose
              Open the first time. Full steps in INSTALL.md.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

let landingScrollAnimationFrame = 0;

function animateLandingScrollTo(top: number, prefersReducedMotion: boolean) {
  window.cancelAnimationFrame(landingScrollAnimationFrame);

  const start = window.scrollY;
  const distance = top - start;

  if (prefersReducedMotion || Math.abs(distance) < 2) {
    window.scrollTo(0, top);
    return;
  }

  const duration = Math.min(850, Math.max(420, Math.abs(distance) * 0.45));
  const startedAt = window.performance.now();

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    window.scrollTo(0, start + distance * eased);

    if (progress < 1) {
      landingScrollAnimationFrame = window.requestAnimationFrame(step);
    }
  };

  landingScrollAnimationFrame = window.requestAnimationFrame(step);
}

function smoothScrollToLandingSection(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
  event.preventDefault();

  const target = document.getElementById(targetId);
  if (!target) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topOffset = targetId === 'home' ? 0 : 92;
  const top = target.getBoundingClientRect().top + window.scrollY - topOffset;

  window.history.pushState(null, '', targetId === 'home' ? `${window.location.pathname}${window.location.search}` : `#${targetId}`);
  animateLandingScrollTo(Math.max(0, top), prefersReducedMotion);
}

function BrowserFrame({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#f4f6fb] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-3 hidden rounded-md bg-white px-3 py-1 text-[10px] font-bold text-[#9aa0a8] sm:block">
          seecen.seekerscentral.com
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block w-full"
      />
    </div>
  );
}

function SectionKicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-xs font-black uppercase tracking-[0.22em] ${light ? 'text-white/60' : 'text-[#563ed5]'}`}>
      {children}
    </p>
  );
}

export default function Landing() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 140;
      let currentSection = 'home';

      for (const item of landingNavItems) {
        const section = document.getElementById(item.targetId);
        if (section && section.offsetTop <= scrollPosition) {
          currentSection = item.targetId;
        }
      }

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });

    return () => window.removeEventListener('scroll', updateActiveSection);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef1f7] text-[#121417]">
      {/* ───────────────────────── Hero / cover ───────────────────────── */}
      <section id="home" className="relative overflow-hidden pb-16 text-white" style={{ backgroundColor: '#080a0e' }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(86,62,213,0.32), transparent 60%), radial-gradient(circle at 12% 42%, rgba(86,62,213,0.12), transparent 34%), linear-gradient(180deg, #0b0e13 0%, #07090d 64%, #080a0e 100%)',
          }}
        />

        <header className="relative z-20 mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 text-xs font-black sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#563ed5] shadow-[0_0_24px_rgba(86,62,213,0.5)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xl tracking-[-0.05em]">SeeCen</span>
          </Link>
          <nav className="fixed left-1/2 top-5 z-50 hidden -translate-x-1/2 items-center rounded-full border border-white/10 bg-[#151621]/80 p-1 text-white/60 shadow-[0_18px_50px_-32px_rgba(0,0,0,0.75)] backdrop-blur-xl md:flex">
            {landingNavItems.map((item) => (
              <a
                key={item.targetId}
                href={`#${item.targetId}`}
                onClick={(event) => {
                  setActiveSection(item.targetId);
                  smoothScrollToLandingSection(event, item.targetId);
                }}
                className={`rounded-full px-4 py-2.5 transition-colors lg:px-5 ${activeSection === item.targetId ? 'bg-white text-black' : 'hover:bg-white/10 hover:text-white'}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-5 py-2.5 text-white/80 backdrop-blur transition-colors hover:text-white sm:flex"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <Link to="/demo/dashboard" className="rounded-full bg-white px-5 py-2.5 text-black transition-colors hover:bg-white/90">
              Live demo
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center px-5 pt-12 text-center sm:px-8">
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/80 shadow-[0_0_30px_rgba(86,62,213,0.28)] transition-colors hover:text-white"
          >
            <Scale className="h-3.5 w-3.5 text-[#a99bf1]" />
            Free &amp; open source · MIT licensed
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <h1 className="mt-7 max-w-[1080px] text-5xl font-light leading-[0.96] tracking-[-0.06em] text-white sm:text-6xl md:text-[4.9rem]">
            The open-source command center for sellers.
          </h1>
          <p className="mt-6 max-w-2xl text-sm font-semibold leading-6 text-white/70 sm:text-base">
            Orders, inventory, shipping, returns, finance, analytics, and an AI coach —
            one calm workspace instead of seven scattered sheets. Try it right now:
            no signup, no API keys, everything runs in your browser.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/demo/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-black transition-transform hover:scale-[1.03]"
            >
              Open live demo
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-black text-white backdrop-blur transition-colors hover:bg-white/[0.12]"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-white/55">
            <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#a99bf1]" /> No signup</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#a99bf1]" /> Data seeds in your browser</span>
            <span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5 text-[#a99bf1]" /> Fork it, rebrand it, own it</span>
          </div>

          <div className="relative mt-12 w-full max-w-[1080px]">
            <div
              aria-hidden="true"
              className="absolute -inset-x-10 -top-10 bottom-10 rounded-[40px] opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(86,62,213,0.4), transparent 70%)' }}
            />
            <div className="relative">
              <BrowserFrame src="/landing-hub.png" alt="SeeCen dashboard showing today's revenue, sales pulse, analytics chart, and on-time dispatch score" eager />
            </div>
          </div>

          <div className="mt-10 grid w-full max-w-[880px] grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: '15+', label: 'working modules' },
              { value: '0', label: 'setup to try it' },
              { value: 'MIT', label: 'licensed forever' },
              { value: '100%', label: 'open source' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 backdrop-blur">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Feature grid ───────────────────────── */}
      <section id="features" className="px-3 py-10 md:px-5">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionKicker>Everything a seller runs on</SectionKicker>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-6xl">
                Twelve modules. One operating view.
              </h2>
            </div>
            <p className="max-w-sm text-sm font-semibold leading-6 text-[#69707a]">
              These aren&apos;t mockups — every card below opens the real, working screen
              inside the live demo.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  to={feature.path}
                  className="group rounded-[24px] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_-46px_rgba(15,23,42,0.8)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0fb] text-[#563ed5]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#b3bac4] transition group-hover:translate-x-1 group-hover:text-[#563ed5]" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-[-0.02em]">{feature.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#69707a]">{feature.body}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Deep dives ───────────────────────── */}
      <section id="inside" className="px-3 py-10 md:px-5">
        <div className="mx-auto max-w-[1280px]">
          <SectionKicker>Inside the dashboard</SectionKicker>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-6xl">
            Real screens, real data, real workflow.
          </h2>

          <div className="mt-10 space-y-6">
            {deepDives.map((dive, index) => (
              <div
                key={dive.id}
                className="grid items-center gap-8 rounded-[28px] bg-white p-6 md:p-10 lg:grid-cols-[0.85fr_1.15fr]"
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <SectionKicker>{dive.kicker}</SectionKicker>
                  <h3 className="mt-4 text-3xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-4xl">
                    {dive.title}
                  </h3>
                  <ul className="mt-6 space-y-3">
                    {dive.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[#4a515b]">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#563ed5]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={dive.path}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#17191c] px-5 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02]"
                  >
                    Open this screen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <BrowserFrame src={dive.image} alt={dive.alt} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Run it your way ───────────────────────── */}
      <section id="run" className="px-3 py-10 md:px-5">
        <div className="mx-auto max-w-[1280px] rounded-[28px] bg-white p-6 md:p-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionKicker>Run it your way</SectionKicker>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-5xl">
                From browser demo to your own backend.
              </h2>
            </div>
            <p className="max-w-sm text-sm font-semibold leading-6 text-[#69707a]">
              Start with zero setup, keep your data locally, and graduate to a real
              Supabase backend when you&apos;re ready.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {runModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <div
                  key={mode.title}
                  className={`flex flex-col justify-between rounded-[24px] p-6 ${index === 0 ? 'bg-[#563ed5] text-white' : 'bg-[#eef1f7]'}`}
                >
                  <div>
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index === 0 ? 'bg-white/15 text-white' : 'bg-white text-[#563ed5]'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">{mode.title}</h3>
                    <p className={`mt-3 text-sm font-medium leading-6 ${index === 0 ? 'text-white/80' : 'text-[#69707a]'}`}>
                      {mode.body}
                    </p>
                    {mode.snippet && (
                      <div className="mt-5 space-y-1 rounded-2xl bg-[#17191c] p-4 font-mono text-xs leading-6 text-[#9be29b]">
                        {mode.snippet.map((line) => (
                          <p key={line}>
                            <span className="select-none text-white/30">$ </span>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {mode.cta.external ? (
                    <a
                      href={mode.cta.to}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-8 inline-flex items-center gap-2 text-sm font-black ${index === 0 ? 'text-white' : 'text-[#563ed5]'}`}
                    >
                      {mode.cta.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to={mode.cta.to}
                      className={`mt-8 inline-flex items-center gap-2 text-sm font-black ${index === 0 ? 'text-white' : 'text-[#563ed5]'}`}
                    >
                      {mode.cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── For sellers ───────────────────────── */}
      <ForSellersSection />

      {/* ───────────────────────── Open source ───────────────────────── */}
      <section id="open-source" className="px-3 py-10 md:px-5">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] bg-[#080a0e] p-6 text-white md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <SectionKicker light>Open source by design</SectionKicker>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[1] tracking-[-0.05em] md:text-6xl">
                Try it like a product. Own it like infrastructure.
              </h2>
              <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-white/65">
                MIT licensed, demo-first, and built to be forked. Take the code, swap the
                branding in one config file, connect your own Supabase project, and run
                your store on it — no strings, no paid tiers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-black transition-transform hover:scale-[1.03]"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                </a>
                <a
                  href={zipUrl}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-black text-white transition-colors hover:bg-white/[0.12]"
                >
                  <Download className="h-4 w-4" />
                  Download ZIP
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {stackChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/70">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-[24px] border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                    <Github className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-lg font-bold tracking-[-0.02em]">Draven047/SeeCen</p>
                    <p className="text-xs font-semibold text-white/50">github.com/Draven047/SeeCen</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
                <div>
                  <p className="text-xl font-semibold">MIT</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">License</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">TypeScript</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Language</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">SPA</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Deploy anywhere</p>
                </div>
              </div>
              <p className="mt-6 rounded-2xl bg-black/40 p-4 font-mono text-xs leading-6 text-white/70">
                Clone it, run <span className="text-[#9be29b]">bun run dev</span>, and you have the
                whole seller OS on localhost in under a minute.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA + footer ───────────────────────── */}
      <footer className="px-3 pb-3 pt-2 md:px-5">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] bg-white p-6 md:p-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="max-w-xl text-4xl font-semibold leading-[1] tracking-[-0.05em] md:text-5xl">
                See it running in the next ten seconds.
              </h2>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-[#69707a]">
                The demo is the product. Open it, break it, reset it — then clone it and
                make it yours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/demo/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#563ed5] px-6 text-sm font-black text-white transition-transform hover:scale-[1.03]"
              >
                Open live demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-black/10 bg-white px-6 text-sm font-black text-[#111] transition-colors hover:bg-[#eef1f7]"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-6 border-t border-black/10 pt-8 text-xs font-bold text-[#69707a] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9aa0a8]">Product</p>
              <a href="#features" className="block hover:text-[#111]">Features</a>
              <a href="#inside" className="block hover:text-[#111]">Inside the dashboard</a>
              <Link to="/demo/dashboard" className="block hover:text-[#111]">Live demo</Link>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9aa0a8]">Open source</p>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="block hover:text-[#111]">GitHub repository</a>
              <a href={selfHostingUrl} target="_blank" rel="noreferrer" className="block hover:text-[#111]">Self-hosting guide</a>
              <a href={zipUrl} className="block hover:text-[#111]">Download ZIP</a>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9aa0a8]">Explore</p>
              <Link to="/demo/orders" className="block hover:text-[#111]">Orders</Link>
              <Link to="/demo/analytics" className="block hover:text-[#111]">Analytics</Link>
              <Link to="/demo/ai-coach" className="block hover:text-[#111]">AI Coach</Link>
            </div>
          </div>

          <div className="mt-10">
            <p
              className="font-semibold text-black"
              style={{ fontSize: 'clamp(7rem, 24vw, 14rem)', lineHeight: 0.72, letterSpacing: '-0.1em' }}
            >
              SeeCen
            </p>
            <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs font-bold text-[#69707a]">
              <span>Open-source seller command center</span>
              <span>MIT licensed · EST 2026</span>
              <span>Built with Bun, Vite, React, TypeScript, and shadcn/ui</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
