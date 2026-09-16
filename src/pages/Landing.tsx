import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Download,
  Github,
  Menu,
  Monitor,
  Package,
  Pause,
  Play,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  assets,
  githubUrl,
  workflow,
  insights,
  productGroups,
  type ScreenName,
} from "@/components/landing/content";
import "@/components/landing/landing.css";
import {
  chapterPosition,
  chapterStops,
  pinnedProgress,
} from "@/components/landing/motion";

const ProductScene = lazy(() => import("@/components/landing/ProductScene"));
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
const nav = [
  ["Product", "#product"],
  ["Workflows", "#workflows"],
  ["Developers", "#developers"],
] as const;

function ProductImage({
  screen,
  eager = false,
}: {
  screen: ScreenName;
  eager?: boolean;
}) {
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={assets[screen].mobile} />
      <img
        src={assets[screen].desktop}
        alt={assets[screen].alt}
        width="1422"
        height="800"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}

function SceneSlot({
  screen,
  name,
  eager = false,
}: {
  screen: ScreenName;
  name: string;
  eager?: boolean;
}) {
  return (
    <div
      className={`lp-scene-slot lp-scene-${name}`}
      data-screen={screen}
      data-scene={name}
    >
      <div className="lp-scene-poster">
        <ProductImage screen={screen} eager={eager} />
      </div>
    </div>
  );
}

function Journey({
  kind,
  enabled,
}: {
  kind: "workflow" | "insights";
  enabled: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const items = kind === "workflow" ? workflow : insights;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const section = ref.current;
    const stage = section?.querySelector<HTMLElement>(".lp-journey-sticky");
    if (!section || !stage) return;
    let frame = 0;
    function update() {
      frame = 0;
      if (!enabled || getComputedStyle(stage!).position !== "sticky") {
        // A resize must not strand the mobile scene halfway between two screens.
        section!.dataset.position = String(
          Math.round(Number(section!.dataset.position ?? 0)),
        );
        return;
      }
      const rect = section!.getBoundingClientRect();
      const progress = pinnedProgress(
        rect.top,
        rect.height,
        stage!.offsetHeight,
        76,
      );
      const position = chapterPosition(progress);
      section!.dataset.position = String(position);
      section!.style.setProperty("--journey-progress", String(progress));
      setActive(Math.round(position));
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(section);
    resize.observe(stage);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);
  function selectChapter(index: number) {
    const section = ref.current;
    const stage = section?.querySelector<HTMLElement>(".lp-journey-sticky");
    if (
      section &&
      stage &&
      enabled &&
      getComputedStyle(stage).position === "sticky"
    ) {
      const rect = section.getBoundingClientRect();
      window.scrollTo({
        top:
          window.scrollY +
          rect.top -
          76 +
          (rect.height - stage.offsetHeight) * chapterStops[index],
        behavior: "smooth",
      });
    } else {
      setActive(index);
      if (section) section.dataset.position = String(index);
    }
  }
  const item = items[active];
  return (
    <section
      ref={ref}
      id={kind === "workflow" ? "workflows" : "insights"}
      className={`lp-journey ${kind === "insights" ? "lp-journey-light" : ""} ${enabled ? "" : "lp-still"}`}
    >
      <div className="lp-journey-sticky lp-container">
        <div className="lp-section-heading">
          <p className="lp-eyebrow">
            <span />
            {kind === "workflow"
              ? "01 / FROM ORDER TO OUT THE DOOR"
              : "02 / THE BIG PICTURE. THE NEXT MOVE."}
          </p>
          <h2>
            {kind === "workflow" ? (
              <>
                Good days start
                <br />
                with a clear next step.
              </>
            ) : (
              <>
                Less guesswork.
                <br />
                More perspective.
              </>
            )}
          </h2>
        </div>
        <div className="lp-journey-layout">
          <div className="lp-journey-copy">
            <div
              className="lp-chapter-tabs"
              role="group"
              aria-label={`${kind} chapters`}
            >
              {items.map((entry, index) => (
                <button
                  type="button"
                  key={entry.screen}
                  aria-pressed={active === index}
                  onClick={() => selectChapter(index)}
                >
                  <span>0{index + 1}</span>
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="lp-chapter-text">
              {items.map((entry, index) => (
                <motion.div
                  key={entry.screen}
                  aria-hidden={active !== index}
                  style={{
                    visibility: active === index ? "visible" : "hidden",
                  }}
                  initial={false}
                  animate={{
                    opacity: active === index ? 1 : 0,
                    y: active === index || !enabled ? 0 : 10,
                  }}
                  transition={{ duration: enabled ? 0.28 : 0, ease: "easeOut" }}
                >
                  <p className="lp-chapter-count">
                    0{index + 1} <span>/ 03</span>
                  </p>
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                  <Link className="lp-text-link" to={entry.path}>
                    Explore {entry.label.toLowerCase()}{" "}
                    <ArrowUpRight size={18} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="lp-journey-media">
            <SceneSlot screen={item.screen} name={kind} />
            <p className="lp-caption">
              SeeCen / {item.label} <span>Sample store data</span>
            </p>
          </div>
        </div>
        <div className="lp-journey-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}

function GettingStarted() {
  const { canInstall, install } = usePwaInstall();
  return (
    <section className="lp-start lp-container" id="developers">
      <div className="lp-section-heading">
        <p className="lp-eyebrow">
          <span />
          YOUR STORE. YOUR WAY.
        </p>
        <h2>
          Use it today.
          <br />
          Make it yours tomorrow.
        </h2>
        <p>Start with a sample store. Or start with the source.</p>
      </div>
      <div className="lp-start-grid">
        <article>
          <Monitor size={28} />
          <p className="lp-eyebrow">FOR SELLERS & STORE TEAMS</p>
          <h3>
            Meet your next
            <br />
            working day.
          </h3>
          <p>
            Explore a populated store, work through an order, and see how the
            pieces fit. No account or API key needed for the demo.
          </p>
          <ul>
            <li>
              <Check />
              Sample data that you can reset
            </li>
            <li>
              <Check />
              Desktop, tablet, and mobile workflows
            </li>
            <li>
              <Check />
              Browser-local storage with backup controls
            </li>
          </ul>
          <Link to="/demo/dashboard" className="lp-button lp-button-dark">
            Try the demo <ArrowRight size={18} />
          </Link>
          {canInstall && (
            <button className="lp-text-link" onClick={() => install()}>
              <Download size={16} /> Install browser app
            </button>
          )}
          <a
            className="lp-text-link"
            href={`${githubUrl}/blob/main/INSTALL.md`}
            target="_blank"
            rel="noreferrer"
          >
            Installation options <ArrowUpRight size={16} />
          </a>
        </article>
        <article>
          <Code2 size={28} />
          <p className="lp-eyebrow">FOR DEVELOPERS & BUILDERS</p>
          <h3>
            A starting point.
            <br />
            Not a black box.
          </h3>
          <p>
            Fork the React app, adapt the workflows, and connect your own
            Supabase backend when you need shared data and real accounts.
          </p>
          <ul>
            <li>
              <Check />
              MIT-licensed source code
            </li>
            <li>
              <Check />
              React, TypeScript, Vite, and shadcn/ui
            </li>
            <li>
              <Check />
              Database migrations and hosting guide
            </li>
          </ul>
          <a
            href={githubUrl}
            className="lp-button lp-button-dark"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={18} /> Build with SeeCen <ArrowUpRight size={18} />
          </a>
          <div className="lp-developer-links">
            <a
              className="lp-text-link"
              href={`${githubUrl}/blob/main/SELF_HOSTING.md`}
              target="_blank"
              rel="noreferrer"
            >
              Self-hosting guide <ArrowUpRight size={16} />
            </a>
            <a
              className="lp-text-link"
              href={`${githubUrl}/archive/refs/heads/main.zip`}
            >
              <Download size={16} /> Source ZIP
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}

const questions = [
  [
    "What is SeeCen?",
    "SeeCen is an open-source seller operations workspace. It brings orders, products, inventory, fulfillment, shipping, returns, customers, finance, and analytics into one application.",
  ],
  [
    "Is the demo connected to a real store?",
    "No. The public demo uses synthetic sample data stored in your browser. You can explore workflows without connecting a real shop, courier, payment service, or AI provider. Demo actions do not process real payments or shipments.",
  ],
  [
    "Where does my data live?",
    "In demo/local mode, changes stay in this browser until you reset or clear its data. Use the backup controls to export your work. For shared, multi-user storage, configure your own Supabase backend using the self-hosting guide.",
  ],
  [
    "Can my team use it together?",
    "The app includes role-based workflows. To use real accounts and share data across devices, deploy it with your own Supabase project and complete the authentication and role setup. The browser demo is not a shared backend.",
  ],
  [
    "How does the AI Coach work?",
    "The demo provides deterministic, simulated guidance from sample store data. Connecting a real AI provider requires server-side configuration; no personal API key is required to explore the demo.",
  ],
  [
    "Is it free to use and customize?",
    "The code is MIT licensed. You can use, modify, and self-host it under that license. Hosting, database, AI, and other external services may have their own costs.",
  ],
];

export default function Landing() {
  const reducedMotion = useReducedMotion();
  const [motionAllowed, setMotionAllowed] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const enabled = !reducedMotion && motionAllowed;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    for (const [, id] of nav) {
      const element = document.querySelector(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const timeout = window.setTimeout(() => setSceneReady(true), 500);
    return () => window.clearTimeout(timeout);
  }, [enabled]);
  return (
    <main className="lp" data-motion={enabled ? "on" : "off"}>
      <a className="lp-skip" href="#product">
        Skip to product
      </a>
      <header className="lp-header">
        <a href="#home" className="lp-brand" aria-label="SeeCen home">
          SeeCen<span>.</span>
        </a>
        <nav className="lp-desktop-nav" aria-label="Landing navigation">
          {nav.map(([label, href]) => (
            <a
              key={href}
              href={href}
              aria-current={activeSection === href ? "location" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="lp-header-actions">
          <button
            className="lp-icon-button"
            title={enabled ? "Pause motion" : "Enable motion"}
            aria-label={enabled ? "Pause motion" : "Enable motion"}
            aria-pressed={enabled}
            disabled={!!reducedMotion}
            onClick={() => setMotionAllowed(!motionAllowed)}
          >
            {enabled ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <a
            className="lp-header-github"
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Build with SeeCen on GitHub"
          >
            <Github size={18} />
          </a>
          <Link className="lp-button lp-button-small" to="/demo/dashboard">
            Try the demo <ArrowUpRight size={16} />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="lp-mobile-menu lp-icon-button"
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="lp-menu">
              <SheetTitle>SeeCen</SheetTitle>
              <nav aria-label="Mobile landing navigation">
                {nav.map(([label, href]) => (
                  <SheetClose asChild key={href}>
                    <a href={href}>
                      {label}
                      <ArrowUpRight size={20} />
                    </a>
                  </SheetClose>
                ))}
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  Build with SeeCen <Github size={20} />
                </a>
                <Link to="/demo/dashboard">
                  Try the demo <ArrowRight size={20} />
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <section className="lp-hero" id="home">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">
            <span />
            OPEN SOURCE. OPEN FOR BUSINESS.
          </p>
          <h1>
            SeeCen<span>.</span>
          </h1>
          <p className="lp-hero-title">Your seller operations, together.</p>
          <p className="lp-hero-description">
            Orders, inventory, shipping, and finances.
            <br className="lp-desktop-break" /> One workspace for the people who
            keep your store moving.
          </p>
          <div className="lp-actions">
            <Link className="lp-button" to="/demo/dashboard">
              Try the demo <ArrowUpRight size={18} />
            </Link>
            <a
              className="lp-button lp-button-outline"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} /> Build with SeeCen
            </a>
          </div>
        </div>
        <SceneSlot screen="hub" name="hero" eager />
        <div className="lp-hero-foot">
          <span>
            <span className="lp-status-dot" /> Real app. Sample store. No
            signup.
          </span>
          <a href="#workflows">
            Meet your new workflow <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <section className="lp-intro lp-container">
        <p className="lp-eyebrow">
          <span />
          LESS SWITCHING. MORE DOING.
        </p>
        <h2>
          The order comes in.
          <br />
          Everything else <span>comes together.</span>
        </h2>
        <div className="lp-intro-bottom">
          <p>
            See what needs attention, keep stock in check, and follow the money.
            Connected workflows, from the first sale to the final settlement.
          </p>
          <a href="#product" className="lp-text-link">
            See what is inside <ArrowDown size={18} />
          </a>
        </div>
      </section>
      <Journey kind="workflow" enabled={enabled} />
      <Journey kind="insights" enabled={enabled} />
      <section className="lp-product lp-container" id="product">
        <div className="lp-section-heading">
          <p className="lp-eyebrow">
            <span />
            ONE WORKSPACE. MANY MOVING PARTS.
          </p>
          <h2>
            Built for the whole
            <br />
            working day.
          </h2>
          <p>
            Find your workflow. Open the real screen. Make yourself at home.
          </p>
        </div>
        <Tabs defaultValue="sell" className="lp-product-tabs">
          <TabsList aria-label="Product areas">
            {productGroups.map((group) => (
              <TabsTrigger key={group.id} value={group.id}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {productGroups.map((group) => (
            <TabsContent key={group.id} value={group.id}>
              <div className="lp-product-layout">
                <div>
                  <Package size={26} />
                  <h3>{group.title}</h3>
                  <ul>
                    {group.points.map((point) => (
                      <li key={point}>
                        <Check size={16} />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link className="lp-button lp-button-dark" to={group.path}>
                    {group.cta}
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
                <figure>
                  <ProductImage screen={group.screen} />
                  <figcaption>
                    Actual SeeCen interface / sample store data
                  </figcaption>
                </figure>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
      <GettingStarted />
      <section className="lp-faq lp-container">
        <div className="lp-section-heading">
          <p className="lp-eyebrow">
            <span />A FEW GOOD QUESTIONS
          </p>
          <h2>
            Before you
            <br />
            jump in.
          </h2>
        </div>
        <div>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span>
                  <ArrowDown size={18} />
                </span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="lp-closing">
        <div className="lp-container">
          <p className="lp-eyebrow">
            <span />
            YOUR NEXT CHAPTER
          </p>
          <h2>
            Less juggling.
            <br />
            More business.
          </h2>
          <p>Take a look around. Then make it your own.</p>
          <div className="lp-actions">
            <Link className="lp-button" to="/demo/dashboard">
              Try the demo <ArrowUpRight size={18} />
            </Link>
            <a
              className="lp-button lp-button-outline"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} /> Build with SeeCen
            </a>
          </div>
        </div>
      </section>
      <footer className="lp-footer lp-container">
        <a className="lp-brand" href="#home">
          SeeCen<span>.</span>
        </a>
        <p>Open-source seller operations.</p>
        <nav aria-label="Footer">
          <a
            href={`${githubUrl}/blob/main/SELF_HOSTING.md`}
            target="_blank"
            rel="noreferrer"
          >
            Documentation
          </a>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a
            href={`${githubUrl}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
          >
            MIT license
          </a>
        </nav>
        <span>2026 SeeCen</span>
      </footer>
      {enabled && sceneReady && (
        <SceneBoundary>
          <Suspense fallback={null}>
            <ProductScene />
          </Suspense>
        </SceneBoundary>
      )}
    </main>
  );
}
