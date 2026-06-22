import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import officeImg from "@/assets/office.jpg";
import whyImg from "@/assets/why.jpg";
import {
  LogoMark,
  GlyphClover,
  GlyphSprout,
  GlyphShield,
  GlyphSpark,
  GlyphCross,
  GlyphBloom,
  PlusBadge,
  ArrowUpRight,
} from "@/components/brand/icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClaimGuard — Stop fraud before it's paid" },
      {
        name: "description",
        content:
          "AI-powered claims fraud detection for national health insurance schemes. Built for OpenIMIS, designed for confidence.",
      },
      { property: "og:title", content: "ClaimGuard — Stop fraud before it's paid" },
      {
        property: "og:description",
        content:
          "Cross-hospital visibility no single facility can have. Catch fraud, protect every shilling.",
      },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-2 text-[color:var(--brand-brown)]">
        <LogoMark className="h-9 w-9" />
        <span className="font-serif text-2xl tracking-tight text-foreground">ClaimGuard</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
        <a href="#platform" className="hover:text-[color:var(--brand-brown)]">Platform</a>
        <a href="#detection" className="hover:text-[color:var(--brand-brown)]">Detection</a>
        <a href="#why" className="hover:text-[color:var(--brand-brown)]">Why ClaimGuard</a>
        <a href="#contact" className="hover:text-[color:var(--brand-brown)]">Contact</a>
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/auth"
          className="rounded-full px-5 py-2.5 text-sm font-medium text-foreground hover:bg-[color:var(--brand-cream)]"
        >
          Sign In
        </Link>
        <a
          href="#contact"
          className="rounded-full bg-[color:var(--brand-brown)] px-5 py-2.5 text-sm font-medium text-[color:var(--brand-brown-foreground)] hover:opacity-90"
        >
          Request a Demo
        </a>
      </div>
    </header>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground">
      <PlusBadge className="h-3 w-3 text-[color:var(--brand-orange)]" />
      {children}
    </span>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* Left column */}
        <div className="relative overflow-hidden rounded-3xl bg-[oklch(0.93_0.008_80)] p-10 lg:p-14">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-white/55" />
          <div className="pointer-events-none absolute right-40 top-40 h-[260px] w-[260px] rounded-full bg-white/40" />
          <div className="relative z-10 max-w-xl">
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground lg:text-6xl">
              Stop Fraud
              <br />
              <span className="accent-word">Before</span> It&apos;s Paid
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              ClaimGuard scores every claim submitted to your scheme in real time —
              surfacing fraud patterns across all your provider hospitals that no
              single facility could ever see alone.
            </p>
            <a
              href="#contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-brown)] px-6 py-3.5 text-[color:var(--brand-brown-foreground)] hover:opacity-90"
            >
              See It In Action
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <div className="mt-8 flex max-w-md flex-wrap gap-3">
              <Tag>Catch Fraud Early</Tag>
              <Tag>Protect Every Shilling</Tag>
              <Tag>Audit With Confidence</Tag>
              <Tag>Built for OpenIMIS</Tag>
            </div>
          </div>
          <img
            src={heroImg}
            alt="A confident insurance fraud analyst"
            className="pointer-events-none absolute -bottom-2 right-2 z-0 hidden h-[88%] w-auto object-contain lg:block"
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl bg-[color:var(--brand-sage)] p-7 text-[color:var(--brand-sage-foreground)]">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["#a6643f", "#3b3027", "#7a8a5a", "#c9a36a"].map((c, i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-[color:var(--brand-sage)]"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div>
                <div className="text-xs tracking-wider opacity-90">★ ★ ★ ★ ★</div>
                <div className="mt-1 text-sm font-medium">98% Reviewer Confidence</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              Trusted by leading insurance schemes to safeguard claims integrity
              across hundreds of hospitals and millions in payouts.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl">
            <img
              src={officeImg}
              alt="Claims review office"
              className="h-56 w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-serif text-4xl">12,400+</div>
                <div className="mt-2 text-xs text-white/70">Claims reviewed across the scheme</div>
              </div>
              <div>
                <div className="font-serif text-4xl">KES 340M+</div>
                <div className="mt-2 text-xs text-white/70">Suspected fraud value protected</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const detectionCards = [
  {
    Icon: GlyphClover,
    title: "Amount Anomalies",
    body: "Claims priced abnormally high for the diagnosis or service mix, benchmarked against national medians and peer facilities.",
  },
  {
    Icon: GlyphSprout,
    title: "Duplicate & Near-Duplicate Claims",
    body: "The same patient and treatment claimed more than once, even when invoice numbers and timestamps are deliberately varied.",
  },
  {
    Icon: GlyphBloom,
    title: "Cross-Facility Patterns",
    body: "The same patient claiming treatment at multiple hospitals in a short window — visible only with scheme-wide data.",
  },
  {
    Icon: GlyphSpark,
    title: "Service–Diagnosis Mismatches",
    body: "Billed procedures and medications that are not clinically indicated for the submitted diagnosis code.",
  },
  {
    Icon: GlyphCross,
    title: "Provider Outliers",
    body: "Facilities whose claim volume, average value, or service mix spikes suddenly against their own baseline.",
  },
  {
    Icon: GlyphShield,
    title: "Timing Anomalies",
    body: "Claims submitted in suspicious batches or at unusual hours — a known signal of automated and coordinated abuse.",
  },
];

function Detection() {
  return (
    <section id="detection" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-5xl leading-tight text-foreground">
          Fraud Detection <span className="accent-word">Across</span> the Board
        </h2>
        <p className="mt-5 text-muted-foreground">
          Every claim is scored against six families of fraud signals — combining
          facility-level history with patterns only visible at scheme scale.
        </p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {detectionCards.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-3xl bg-[color:var(--brand-cream)] p-8">
            <Icon className="h-9 w-9 text-[color:var(--brand-brown)]" />
            <h3 className="mt-16 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    ["12,400+", "Claims scored this quarter"],
    ["KES 340M+", "Value at risk identified"],
    ["98", "Hospitals connected to the scheme"],
    ["94%", "Detection accuracy on audited cases"],
  ] as const;
  return (
    <section id="platform" className="mx-auto max-w-7xl px-6">
      <div className="grid gap-12 rounded-3xl bg-[color:var(--brand-sage)] px-10 py-14 text-[color:var(--brand-sage-foreground)] md:grid-cols-4">
        {stats.map(([num, cap]) => (
          <div key={num}>
            <div className="font-serif text-5xl leading-none">{num}</div>
            <div className="mt-3 text-sm leading-snug opacity-90">{cap}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-6 py-24">
      <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)] p-10 lg:p-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-5xl leading-tight text-foreground">
              Why Choose <span className="accent-word">ClaimGuard</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              We give insurance schemes the cross-hospital visibility no single
              facility can have — and slot directly into the infrastructure you
              already run.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <GlyphBloom className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  Cross-Hospital Visibility
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Detect patient and provider patterns no individual hospital can
                  see — the signal lives in the scheme, not the facility.
                </p>
              </div>
              <div>
                <GlyphShield className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  Built on OpenIMIS
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Integrates directly into your existing claims infrastructure.
                  No rip-and-replace, no parallel system to maintain.
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl">
            <img
              src={whyImg}
              alt="Insurance scheme team reviewing claims"
              className="h-[460px] w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="mx-auto max-w-7xl px-6 pb-12 pt-4">
      <div className="rounded-3xl bg-[color:var(--brand-ink)] px-10 py-12 text-[color:var(--brand-ink-foreground)]">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-[color:var(--brand-orange)]">
              <LogoMark className="h-8 w-8" />
              <span className="font-serif text-2xl text-white">ClaimGuard</span>
            </div>
            <p className="mt-4 text-sm text-white/70">
              Built for national health insurance schemes that pay claims at scale —
              and refuse to pay for fraud.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white hover:bg-white/10"
            >
              Sign In
            </Link>
            <a
              href="mailto:hello@claimguard.health"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-orange)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Request a Demo <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <div>© {new Date().getFullYear()} ClaimGuard. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Security</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Detection />
      <Stats />
      <WhyChoose />
      <Footer />
    </div>
  );
}
