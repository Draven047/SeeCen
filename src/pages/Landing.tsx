import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  ClipboardList,
  Code2,
  Download,
  Github,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';

const githubUrl = 'https://github.com/Draven047/SeeCen';
const zipUrl = 'https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip';

const productImages = {
  sneaker: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
  blazer: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
  shirt: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80',
  tote: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
  dress: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
};

const operationCards = [
  {
    title: 'Orders',
    body: 'Move new, packed, shipped, delivered, COD, and return orders without losing the next step.',
    icon: ShoppingCart,
    path: '/demo/orders',
  },
  {
    title: 'Inventory',
    body: 'Watch stock levels, catalogue health, low-stock items, and product movement from one workspace.',
    icon: Boxes,
    path: '/demo/catalogue',
  },
  {
    title: 'Customers',
    body: 'Keep customer context close to orders, feedback, returns, and repeat-purchase opportunities.',
    icon: Users,
    path: '/demo/customers',
  },
  {
    title: 'Finance',
    body: 'Track revenue, COD reconciliation, invoices, settlements, and store-level money movement.',
    icon: IndianRupee,
    path: '/demo/finance',
  },
];

const workflowSteps = ['New order', 'Pack', 'Ship', 'Return / exchange', 'COD settlement', 'Analytics'];

const demoModules = [
  { label: 'Dashboard', path: '/demo/dashboard' },
  { label: 'Orders', path: '/demo/orders' },
  { label: 'Catalogue', path: '/demo/catalogue' },
  { label: 'Customers', path: '/demo/customers' },
  { label: 'Shipping', path: '/demo/shipping' },
  { label: 'Returns', path: '/demo/returns' },
  { label: 'Finance', path: '/demo/finance' },
  { label: 'Analytics', path: '/demo/analytics' },
  { label: 'AI Coach', path: '/demo/ai-coach' },
];

const openSourceItems = [
  { title: 'Try instantly', body: 'The public demo runs with seeded browser data. No Supabase setup or API key needed.', icon: RefreshCw },
  { title: 'Fork freely', body: 'Use the code as a starting point for your own seller operating system.', icon: Github },
  { title: 'Self-host later', body: 'Deploy the Vite app to a static host and extend persistence when you are ready.', icon: ShieldCheck },
  { title: 'Customize workflows', body: 'Tune orders, catalogue, analytics, finance, and AI surfaces around your business.', icon: Code2 },
];

const landingNavItems = [
  { label: 'Home', targetId: 'home' },
  { label: 'Workflow', targetId: 'workflow' },
  { label: 'Open source', targetId: 'open-source' },
  { label: 'Try it', targetId: 'try' },
];

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

function TinyImageDot({ src, className = '' }: { src: string; className?: string }) {
  return (
    <span className={`inline-flex h-10 w-10 overflow-hidden rounded-full border-2 border-white align-middle shadow-sm ${className}`}>
      <img src={src} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function OrangeButton({ children, to = '/demo/dashboard' }: { children: ReactNode; to?: string }) {
  return (
    <Button asChild className="h-11 rounded-full bg-[#ff4d12] px-5 text-sm font-black text-white shadow-none hover:bg-[#e9430e]">
      <Link to={to}>
        {children}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}

function HeroOpsCard({
  title,
  metric,
  note,
  image,
  accent,
  className = '',
  style,
}: {
  title: string;
  metric: string;
  note: string;
  image: string;
  accent: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Link
      to="/demo/dashboard"
      className={`relative block shrink-0 overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.08] p-5 text-white shadow-[0_44px_100px_-48px_rgba(0,0,0,0.98)] backdrop-blur transition hover:brightness-110 ${className}`}
      style={{ aspectRatio: '0.72 / 1', ...style }}
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-82 saturate-125" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,rgba(255,255,255,0.18),transparent_31%),linear-gradient(180deg,rgba(7,9,13,0.06),rgba(7,9,13,0.86))]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.58))]" />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-white" />
          <div>
            <p className="text-sm font-black leading-none">SeeCen</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Operations</p>
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/20">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-white/55">{title}</p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.07em]">{metric}</p>
        <p className="mt-1 text-sm font-bold text-white/72">{note}</p>
        <div className="mt-5 h-1.5 rounded-full bg-white/14">
          <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: accent }} />
        </div>
      </div>
    </Link>
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
      <section id="home" className="relative overflow-hidden text-white" style={{ minHeight: '760px', backgroundColor: '#080a0e' }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 8%, rgba(86,62,213,0.18), transparent 36%), linear-gradient(180deg, #0b0e13 0%, #07090d 64%, #080a0e 100%)',
          }}
        />
        <div
          className="absolute left-0 right-0 h-20 opacity-60 blur-sm"
          style={{
            top: '58%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,77,18,0.5) 18%, rgba(249,204,74,0.7) 32%, rgba(86,62,213,0.38) 44%, transparent 66%)',
          }}
        />
        <div
          className="absolute left-0 right-0 h-14 opacity-45 blur-md"
          style={{ top: '70%', background: 'linear-gradient(90deg, rgba(255,77,18,0.55), transparent 30%, rgba(249,204,74,0.55) 70%, transparent)' }}
        />

        <header className="relative z-20 mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 text-xs font-black sm:px-8">
          <Link to="/" className="flex items-center text-white">
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
                className={`rounded-full px-5 py-2.5 transition-colors ${activeSection === item.targetId ? 'bg-white text-black' : 'hover:bg-white/10 hover:text-white'}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={githubUrl} target="_blank" rel="noreferrer" className="hidden rounded-full border border-white/10 bg-white/[0.07] px-5 py-2.5 text-white/80 backdrop-blur hover:text-white sm:block">GitHub</a>
            <Link to="/demo/dashboard" className="rounded-full bg-white px-5 py-2.5 text-black shadow-none hover:bg-white/90">
              Demo
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center px-5 pt-10 text-center sm:px-8 md:pt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/80 shadow-[0_0_30px_rgba(86,62,213,0.28)]">
            Try the resettable seller demo
            <Link to="/demo/dashboard" className="text-orange-300">Open now</Link>
          </div>
          <h1 className="mt-7 max-w-[1180px] text-5xl font-light leading-[0.94] tracking-[-0.065em] text-white sm:text-6xl md:text-[5.1rem]">
            Run your seller command center.
          </h1>
          <p className="mt-3 text-3xl font-light tracking-[-0.055em] text-white/20 sm:text-4xl">
            Orders, stock, cash, customers.
          </p>
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/67 sm:text-base">
            SeeCen brings orders, inventory, shipping, returns, finance, analytics, and AI coaching into one open-source workspace. Try it instantly with no Supabase setup and no API keys.
          </p>
          <Button asChild className="mt-7 h-12 rounded-full bg-white px-6 text-sm font-black text-black shadow-none hover:bg-white/90">
            <Link to="/demo/dashboard">
              Start today
              <span className="ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Button>
        </div>

        <div className="absolute inset-x-0 z-10 hidden md:block" style={{ top: 500, height: 260 }}>
          <div
            aria-label="Scrollable seller operation cards"
            className="h-full overflow-x-auto overflow-y-hidden scrollbar-none"
            role="region"
            tabIndex={0}
          >
            <div className="flex items-end justify-center px-20" style={{ minWidth: 1500, paddingBottom: 24 }}>
              <div
                aria-hidden="true"
                className="shrink-0 rounded-[32px] border border-white/10 bg-white/[0.035] opacity-50 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.95)]"
                style={{ width: 210, height: 285, transform: 'translateX(52px) translateY(20px) rotate(5deg)' }}
              />
              <HeroOpsCard
                title="Order queue"
                metric="24"
                note="ready to pack"
                image={productImages.blazer}
                accent="#ff4d12"
                className="z-10"
                style={{ width: 220, height: 305, transform: 'rotate(-3deg)' }}
              />
              <HeroOpsCard
                title="Stock health"
                metric="8"
                note="low-stock SKUs"
                image={productImages.tote}
                accent="#facc15"
                className="z-20"
                style={{ width: 238, height: 330, marginLeft: -12, marginRight: -12, transform: 'translateY(-8px)' }}
              />
              <HeroOpsCard
                title="Cash pulse"
                metric="₹42k"
                note="COD to reconcile"
                image={productImages.dress}
                accent="#563ed5"
                className="z-10"
                style={{ width: 220, height: 305, transform: 'rotate(3deg)' }}
              />
              <div
                aria-hidden="true"
                className="shrink-0 rounded-[32px] border border-white/10 bg-white/[0.035] opacity-50 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.95)]"
                style={{ width: 210, height: 285, transform: 'translateX(-52px) translateY(20px) rotate(-5deg)' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="operations" className="grid gap-5 px-3 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-5">
        <div className="rounded-[28px] bg-[#eef1f7] p-6 md:p-8">
          <p className="text-xs font-black uppercase text-[#1799bd]">Built for seller operations</p>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#111] md:text-6xl">
            Replace scattered sheets with one operating view.
          </h2>
          <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-[#69707a]">
            SeeCen is not a marketing dashboard. It is a working demo of the day-to-day seller system: orders, catalogue, customers, fulfillment, returns, finance, and analytics stitched together.
          </p>
          <div className="mt-10 rounded-[24px] bg-white p-5">
            <div className="flex items-start justify-between gap-5 border-b border-black/10 pb-5">
              <div>
                <p className="font-black">Works without backend setup</p>
                <p className="mt-1 text-sm font-medium text-[#737a84]">Seed data loads in-browser so founders, operators, and developers can explore immediately.</p>
              </div>
              <span className="text-xl">-</span>
            </div>
            <div className="flex items-center justify-between pt-5">
              <p className="font-black">Fork, inspect, extend</p>
              <span className="text-xl">+</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {operationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.path} className="group rounded-[28px] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_-46px_rgba(15,23,42,0.8)]">
                <div className="mb-10 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1f7] text-[#111]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-5 w-5 text-[#8b929c] transition group-hover:translate-x-1 group-hover:text-[#ff4d12]" />
                </div>
                <h3 className="text-3xl font-semibold tracking-[-0.05em]">{card.title}</h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#69707a]">{card.body}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="px-3 py-8 md:px-5">
        <div className="rounded-[30px] bg-white p-6 md:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                {['Sale to settlement', 'POS friendly', 'Returns included', 'Analytics ready'].map((pill) => (
                  <span key={pill} className="rounded-full bg-[#f4f6fb] px-3 py-2 text-xs font-black text-[#2e333a]">{pill}</span>
                ))}
              </div>
              <h2 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-6xl">
                Follow every order from sale to settlement.
              </h2>
            </div>
            <p className="max-w-sm text-sm font-semibold leading-6 text-[#69707a]">
              The demo shows the full loop: incoming orders, packing decisions, shipping movement, returns, COD reconciliation, and analytics that tell you what changed.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[0.55fr_1.45fr]">
            <div className="flex flex-col justify-between rounded-[26px] bg-[#eef1f7] p-6" style={{ minHeight: '340px' }}>
              <div>
                <p className="text-6xl font-semibold tracking-[-0.08em]">01<span className="text-xl text-[#9aa0a8]">/6</span></p>
                <p className="mt-3 max-w-[180px] text-sm font-semibold text-[#69707a]">A complete operating path, not a loose collection of screens.</p>
              </div>
              <div className="flex gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white"><ClipboardList className="h-4 w-4" /></span>
                <Link to="/demo/orders" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff4d12] text-white" aria-label="Open orders"><ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[26px] bg-black p-6 text-white md:p-8">
              <img src={productImages.shirt} alt="Seller workflow product" className="absolute right-[5%] top-10 hidden h-56 w-56 rotate-[-8deg] rounded-[28px] object-cover opacity-80 md:block" />
              <h3 className="relative z-10 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
                See the queue, move the work, close the money.
              </h3>
              <div className="relative z-10 mt-10 grid gap-2">
                {workflowSteps.map((step, index) => (
                  <Link
                    key={step}
                    to={index < 3 ? '/demo/orders' : index === 3 ? '/demo/returns' : index === 4 ? '/demo/finance' : '/demo/analytics'}
                    className={`flex h-16 items-center justify-between border-b border-white/10 px-5 text-lg font-medium ${index === 0 ? 'rounded-[14px] border-b-0 bg-[#ff4d12] text-white' : 'bg-black/70 text-white/80 hover:bg-white/10 hover:text-white'}`}
                  >
                    <span>{step}</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 px-3 py-8 md:grid-cols-2 md:px-5">
        <div className="relative overflow-hidden rounded-[28px] bg-[#1496bb]" style={{ minHeight: '620px' }}>
          <img src={productImages.blazer} alt="Product catalogue item" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute left-6 top-8 w-[260px] rounded-[24px] bg-white p-5 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f3f8]">
                <BarChart3 className="h-4 w-4 text-[#111]" />
              </span>
              <Badge className="rounded-full bg-[#ff4d12] text-white hover:bg-[#ff4d12]">+8.7%</Badge>
            </div>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-[#17191c]">2,780</p>
            <p className="mt-1 text-xs font-bold uppercase text-[#8f959d]">orders processed</p>
            <div className="mt-5 h-12 rounded-[14px] bg-[linear-gradient(135deg,#e9eef8,#ffffff)]" />
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div><b>127</b><span className="block text-[#8f959d]">open</span></div>
              <div><b>386</b><span className="block text-[#8f959d]">packed</span></div>
              <div><b>249</b><span className="block text-[#8f959d]">done</span></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between p-2 md:p-8">
          <div>
            <p className="text-xs font-black uppercase text-[#1799bd]">Analytics and AI Coach</p>
            <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[1] tracking-[-0.07em]">
              Know what changed before the day gets away.
            </h2>
            <div className="mt-8 flex gap-3">
              {[ShoppingCart, ShoppingBag, Bot, BarChart3].map((Icon, index) => (
                <span key={index} className={`flex h-12 w-12 items-center justify-center rounded-full ${index === 2 ? 'bg-[#ff4d12] text-white' : 'bg-white text-[#111]'}`}>
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 md:items-end">
            <div>
              <p className="max-w-xs text-sm font-semibold leading-6 text-[#69707a]">
                AI Coach reads the demo sales, stock, customer, and order signals and turns them into plain recommendations. Use deterministic local insights now; connect server-side AI later.
              </p>
              <Link to="/demo/ai-coach" className="mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#ff4d12] text-white" aria-label="Explore AI Coach">
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>
            <Link to="/demo/analytics" className="relative overflow-hidden rounded-[24px] bg-white" style={{ minHeight: '260px' }}>
              <img src={productImages.dress} alt="Analytics and catalogue preview" className="absolute inset-0 h-full w-full object-cover" />
              <Badge className="absolute right-4 top-4 rounded-full bg-white text-[#111] hover:bg-white">View analytics</Badge>
              <p className="absolute bottom-5 left-5 text-sm font-black uppercase text-white">Sales pulse</p>
            </Link>
          </div>
        </div>
      </section>

      <section id="open-source" className="px-3 py-8 md:px-5">
        <div className="rounded-[28px] bg-black p-6 text-white md:p-10">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase text-white/70">Open source by design</p>
              <h2 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-6xl">
                Try it like a product. Own it like infrastructure.
              </h2>
            </div>
            <p className="text-sm font-semibold leading-6 text-white/65">
              SeeCen is built to be easy to evaluate, fork, self-host, and reshape. The demo is intentionally low-friction because nobody should need a paid stack just to understand the product.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {openSourceItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-[24px] p-5 ${index === 0 ? 'bg-[#ff4d12]' : 'bg-white/8'}`}>
                  <Icon className="h-5 w-5" />
                  <h3 className="mt-10 text-xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/70">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="try" className="px-3 py-8 md:px-5">
        <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] bg-white p-7">
            <p className="text-sm font-black text-[#1799bd]">Demo mode</p>
            <h2 className="mt-8 max-w-xl text-4xl font-semibold leading-[1] tracking-[-0.06em] md:text-5xl">
              No setup wall. Just open the app and play.
            </h2>
            <div className="mt-10 grid gap-3">
              {['No Supabase project required', 'No .env file required', 'Seeded orders, products, customers, and stores', 'Refresh resets the demo back to a clean state'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-full bg-[#eef1f7] px-4 py-3 text-sm font-black">
                  <Check className="h-4 w-4 text-[#ff4d12]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <OrangeButton>Open demo</OrangeButton>
              <Button asChild variant="outline" className="h-11 rounded-full border-black/10 bg-white px-5 text-sm font-black text-[#111] hover:bg-[#eef1f7]">
                <a href={zipUrl}>
                  Download ZIP
                  <Download className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-[#1496bb] p-6 text-white" style={{ minHeight: '520px' }}>
            <img src={productImages.sneaker} alt="Commerce catalogue product" className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-overlay" />
            <div className="relative flex flex-wrap gap-2">
              <Badge className="rounded-full bg-white text-[#111] hover:bg-white">Orders</Badge>
              <Badge className="rounded-full bg-white text-[#111] hover:bg-white">Inventory</Badge>
              <Badge className="rounded-full bg-white text-[#111] hover:bg-white">Finance</Badge>
              <Badge className="rounded-full bg-white text-[#111] hover:bg-white">AI Coach</Badge>
            </div>
            <div className="absolute bottom-8 left-8 right-8">
              <h3 className="max-w-xl text-5xl font-semibold leading-none tracking-[-0.07em]">The full seller workspace is already inside the demo.</h3>
              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {demoModules.map((module) => (
                  <Link key={module.path} to={module.path} className="rounded-full bg-white/15 px-3 py-2 text-center text-xs font-black backdrop-blur hover:bg-white hover:text-[#111]">
                    {module.label}
                  </Link>
                ))}
              </div>
            </div>
            <span className="absolute right-7 top-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#111]"><ArrowRight className="h-5 w-5" /></span>
          </div>
        </div>
      </section>

      <footer className="px-3 pb-3 pt-8 md:px-5">
        <div className="overflow-hidden rounded-[28px] bg-white p-6 md:p-10">
          <div className="grid gap-8 md:grid-cols-3">
            <Link to="/demo/dashboard" className="relative overflow-hidden rounded-[24px] bg-black text-white" style={{ minHeight: '190px' }}>
              <img src={productImages.blazer} alt="Open SeeCen demo" className="absolute inset-0 h-full w-full object-cover opacity-70" />
              <span className="absolute left-5 top-5 text-3xl font-semibold leading-none">Open. <br /> Demo.</span>
              <span className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#111]"><ArrowRight className="h-4 w-4" /></span>
            </Link>
            <div>
              <h2 className="max-w-2xl text-4xl font-semibold leading-[1] tracking-[-0.06em] md:text-5xl">
                A clean starting point for seller teams and builders.
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Open-source', 'Demo-first', 'Self-host ready'].map((item) => (
                  <span key={item} className="rounded-full bg-[#eef1f7] px-3 py-2 text-xs font-black text-[#414750]">{item}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between gap-8">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#69707a]">
                <a href="#operations">Operations</a>
                <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
                <a href="#workflow">Workflow</a>
                <a href={zipUrl}>Download ZIP</a>
                <a href="#open-source">Open source</a>
                <Link to="/demo/analytics">Analytics</Link>
                <a href="#try">Try it</a>
              </div>
              <Link to="/demo/dashboard" className="ml-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ff4d12] text-white" aria-label="Open demo">
                <Sparkles className="h-7 w-7" />
              </Link>
            </div>
          </div>
          <div className="mt-14 border-t border-black/10 pt-6">
            <div className="flex justify-between text-xs font-bold text-[#69707a]">
              <a href={zipUrl}>Website attachment</a>
              <a href={githubUrl} target="_blank" rel="noreferrer">Repository</a>
            </div>
            <p
              className="mt-4 font-semibold text-black"
              style={{ fontSize: 'clamp(7rem, 24vw, 14rem)', lineHeight: 0.72, letterSpacing: '-0.1em' }}
            >
              SeeCen
            </p>
            <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs font-bold text-[#69707a]">
              <span>Open-source seller command center</span>
              <span>EST - 2026</span>
              <span>Built with Vite, React, TypeScript, and shadcn/ui</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
