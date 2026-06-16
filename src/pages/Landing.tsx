import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Bot,
  Boxes,
  Download,
  Github,
  GitPullRequest,
  LineChart,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
} from 'lucide-react';

const githubUrl = 'https://github.com/Draven047/SeeCen';
const zipUrl = 'https://github.com/Draven047/SeeCen/archive/refs/heads/main.zip';

const featureGroups = [
  { icon: ShoppingCart, title: 'Order command center', body: 'Track marketplace, website, walk-in, COD, prepaid, and pickup orders through a practical operations queue.' },
  { icon: Boxes, title: 'Inventory health', body: 'Seeded stores, products, variants, stock thresholds, and low-stock warnings make the demo useful immediately.' },
  { icon: Truck, title: 'Shipping workflow', body: 'Move orders from packed to pickup, shipment, tracking events, and delivered states without a backend.' },
  { icon: Users, title: 'Customer memory', body: 'Explore customer 360 views, loyalty balances, birthdays, returns, and purchase history in a resettable sandbox.' },
  { icon: LineChart, title: 'Analytics and finance', body: 'Review revenue, order mix, settlements, COD reconciliation, invoices, credit notes, and audit trails.' },
  { icon: Bot, title: 'Local AI coach', body: 'Get deterministic coaching from demo data now, with a bring-your-own-key AI provider path for self-hosters later.' },
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

export default function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              SC
            </span>
            <span>SeeCen</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#demo" className="hover:text-foreground">Demo</a>
            <a href="#open-source" className="hover:text-foreground">Open source</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button asChild size="sm">
              <Link to="/demo/dashboard">
                View Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-5 rounded-md" variant="secondary">
              Open-source seller operations demo
            </Badge>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              SeeCen
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              A free seller command center for orders, inventory, customers, finance, shipping, returns, analytics, and local AI coaching. Try the full dashboard without Supabase, accounts, or paid services.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12">
                <Link to="/demo/dashboard">
                  View Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12">
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  GitHub
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-12">
                <a href={zipUrl}>
                  <Download className="mr-2 h-5 w-5" />
                  Download ZIP
                </a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                No Supabase env vars
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-info" />
                Refresh resets demo
              </div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-primary" />
                Free to fork
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-semibold">Today at SeeCen Mumbai</p>
                <p className="text-xs text-muted-foreground">Seeded local demo data</p>
              </div>
              <Badge variant="outline">Live sandbox</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Orders', '4', ShoppingCart],
                ['Revenue', 'Rs 19.9K', LineChart],
                ['Low stock', '2', Boxes],
                ['Shipments', '1', PackageCheck],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-md border border-border bg-background p-4">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-semibold">AI Coach</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prioritize packed Instagram orders, low-stock Oxford shirts, and one workwear bundle pitch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">Built as the actual app, not a brochure</h2>
          <p className="mt-3 text-muted-foreground">
            The first click opens a working dashboard with mutations, linked records, and deterministic local insight generation.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureGroups.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-border bg-card p-5">
              <feature.icon className="mb-4 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Resettable demo mode</h2>
            <p className="mt-3 text-muted-foreground">
              Create orders, update inventory, move shipments, approve returns, and generate local AI recommendations. Data lives only in memory for the current page session.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {demoRoutes.map((route) => (
              <Link key={route} to={route} className="rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary">
                {route}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="open-source" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <Store className="mb-4 h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Own it, fork it, self-host it</h2>
          <p className="mt-3 text-muted-foreground">
            SeeCen ships with a no-cost demo adapter today. The AI coach is local for v1, and the code is structured so open-source users can add their own database and AI provider when they are ready.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild size="lg">
            <Link to="/demo/dashboard">Open Demo</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={githubUrl} target="_blank" rel="noreferrer">View Repository</a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <a href={zipUrl}>Download ZIP</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
