import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  Compass,
  Globe,
  LineChart,
  MessageSquare,
  Radar,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND_FULL} — Run your whole business growth in one place` },
      {
        name: "description",
        content:
          "One operating system for presence, customer discovery, reach, conversion, CRM, revenue and profit — built for small businesses that want measurable growth.",
      },
      {
        property: "og:title",
        content: `${BRAND_FULL} — Run your whole business growth in one place`,
      },
      {
        property: "og:description",
        content:
          "Presence, leads, conversion, revenue and profit in one live growth operating system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  {
    icon: Globe,
    title: "Presence",
    body: "Score your online footprint across listings, socials and reviews, then fix what is missing.",
  },
  {
    icon: Compass,
    title: "Customer discovery",
    body: "Define segments, map their problems and align offers to what people actually buy.",
  },
  {
    icon: Radar,
    title: "Reach",
    body: "Plan campaigns per channel and see which ones deliver real leads, not vanity numbers.",
  },
  {
    icon: Target,
    title: "Conversion",
    body: "Track the assets and steps that turn interest into enquiries, and enquiries into sales.",
  },
  {
    icon: Users,
    title: "CRM & follow-ups",
    body: "Every lead, customer and interaction in one pipeline, with follow-ups that never slip.",
  },
  {
    icon: LineChart,
    title: "Revenue growth",
    body: "Average order value, repeat rate and rule-based opportunities computed from your data.",
  },
  {
    icon: Wallet,
    title: "Financial control",
    body: "Revenue, expenses, margin and profit by month — so growth is profitable, not just busy.",
  },
  {
    icon: MessageSquare,
    title: "Positioning",
    body: "Sharpen your promise against competitors and keep the message consistent everywhere.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Set up your business",
    body: "Answer a short onboarding: niche, currency, channels and goals. The workspace adapts its language to your trade.",
  },
  {
    n: "02",
    title: "Capture the real numbers",
    body: "Add leads, customers, campaigns, revenue and expenses. Everything lives in one connected workspace, built around your business.",
  },
  {
    n: "03",
    title: "Act on the weekly plan",
    body: "The dashboard flags what is leaking growth and turns it into prioritised tasks you can tick off.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary">
              <BarChart3 className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-semibold tracking-tight text-ink">
              {BRAND_NAME} <span className="text-muted-foreground">{BRAND_TAGLINE}</span>
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#modules" className="transition-colors hover:text-ink">
              Modules
            </a>
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#outcomes" className="transition-colors hover:text-ink">
              Outcomes
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                Get started <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="dotfield relative overflow-hidden border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full bg-success" />
                Growth operating system
              </span>
              <h1 className="font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-6xl">
                Every part of your growth,
                <br />
                measured in one place.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {BRAND_NAME} connects presence, customer discovery, reach, conversion, CRM, revenue
                and profit into a single instrument panel — so you always know what is working,
                what is leaking, and what to do next.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button size="lg">
                    Get started <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
                <a href="#modules">
                  <Button size="lg" variant="outline">
                    See the modules
                  </Button>
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {[
                  "Hosted on your own server",
                  "Nothing shared with anyone else",
                  "Yours after setup — no subscription",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Metric strip */}
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Presence score", value: "82", hint: "discoverability + trust" },
                { label: "Qualified leads", value: "148", hint: "this month" },
                { label: "Conversion rate", value: "31.4%", hint: "leads → won" },
                { label: "Net profit", value: "₹4.2L", hint: "36.8% margin" },
              ].map((s) => (
                <div key={s.label} className="panel px-4 py-3.5">
                  <div className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {s.label}
                  </div>
                  <div className="num mt-1.5 text-2xl font-semibold text-ink">{s.value}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Eight modules. One connected system.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Each module writes to the same live data model, so a lead captured in reach shows up
                in conversion, CRM, revenue and profit without re-entry.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((m) => (
                <div
                  key={m.title}
                  className="panel group p-5 transition-colors hover:border-primary/40"
                >
                  <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <m.icon className="size-4" />
                  </div>
                  <h3 className="font-display mt-4 text-sm font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-b border-border bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              From scattered guesswork to a weekly plan
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="panel p-6">
                  <span className="num text-xs font-semibold tracking-[0.18em] text-primary">
                    {s.n}
                  </span>
                  <h3 className="font-display mt-3 text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section id="outcomes" className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Built for owners who want proof, not dashboards
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every insight is rule-based and computed from data you entered — no black boxes, no
                invented numbers. If the system flags a leak, you can trace it to the exact record.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Know your true profit per month, not just your sales",
                  "Catch follow-ups before they go cold",
                  "See which channel actually produces paying customers",
                  "Track presence gaps that cost you discovery",
                  "No recurring bill chipping away at your margin",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-6">
              <div className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Weekly action plan
              </div>
              <ul className="mt-4 space-y-2.5">
                {[
                  { t: "Claim and complete your business listing", m: "presence", p: "High" },
                  { t: "Follow up 12 leads older than 7 days", m: "crm", p: "High" },
                  { t: "Add a testimonial block to the offer page", m: "conversion", p: "Medium" },
                  { t: "Review ad spend against won revenue", m: "finance", p: "Medium" },
                  { t: "Publish 3 posts on your top channel", m: "reach", p: "Low" },
                ].map((task) => (
                  <li
                    key={task.t}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5"
                  >
                    <div>
                      <div className="text-sm text-ink">{task.t}</div>
                      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
                        {task.m}
                      </div>
                    </div>
                    <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {task.p}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="dotfield">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-4xl">
              Start running your growth like a system
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Set up your workspace in a few minutes and get your first health score today.
            </p>
            <div className="mt-7 flex justify-center">
              <Link to="/auth">
                <Button size="lg">
                  Create your workspace <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND_FULL}</span>
          <span>Presence · Reach · Conversion · Revenue · Profit</span>
        </div>
      </footer>
    </div>
  );
}
