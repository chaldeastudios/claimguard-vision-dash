import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import heroImg from "@/assets/hero.jpg";
import officeImg from "@/assets/office.jpg";
import whyImg from "@/assets/why.jpg";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";
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
import {
  Stethoscope,
  Building2,
  Database,
  Sparkles,
  Plus,
  Minus,
  Mail,
  Linkedin,
  Twitter,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClaimGuard — One platform for your scheme and every hospital" },
      {
        name: "description",
        content:
          "A white-labeled, end-to-end platform connecting insurance schemes to their hospital network — branded claim submission, real-time AI fraud scoring, and reviewer tools, built on OpenIMIS.",
      },
      {
        property: "og:title",
        content: "ClaimGuard — One platform for your scheme and every hospital",
      },
      {
        property: "og:description",
        content:
          "Hospital submission to AI-scored review, branded as your own — end to end on the OpenIMIS you already run.",
      },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

function Counter({
  to,
  prefix = "",
  suffix = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => prefix + Math.round(v).toLocaleString("en-KE") + suffix);
  useEffect(() => {
    if (inView) {
      const controls = animate(mv, to, { duration: 1.8, ease: [0.22, 1, 0.36, 1] });
      return () => controls.stop();
    }
  }, [inView, to, mv]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="h-9 w-auto text-[color:var(--brand-brown)]" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
          <a href="#features" className="hover:text-[color:var(--brand-brown)]">
            Features
          </a>
          <a href="#how" className="hover:text-[color:var(--brand-brown)]">
            How it works
          </a>
          <a href="#why" className="hover:text-[color:var(--brand-brown)]">
            Why ClaimGuard
          </a>
          <a href="#faq" className="hover:text-[color:var(--brand-brown)]">
            FAQ
          </a>
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
      </div>
    </motion.header>
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
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 md:pt-16">
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-[oklch(0.93_0.008_80)] p-10 lg:p-14"
        >
          <div className="pointer-events-none absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-white/55" />
          <div className="pointer-events-none absolute right-40 top-40 h-[260px] w-[260px] rounded-full bg-white/40" />
          <div className="relative z-10 max-w-xl">
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground lg:text-6xl">
              Stop Fraud
              <br />
              <span className="accent-word">Before</span> It&apos;s Paid
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              ClaimGuard is a white-labeled, end-to-end platform connecting your scheme to every
              hospital you work with — branded claim submission, real-time AI fraud scoring, and
              reviewer tools in one place, built on the OpenIMIS you already run.
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
              <Tag>One Branded Platform</Tag>
              <Tag>Connects Every Hospital</Tag>
              <Tag>Built for OpenIMIS</Tag>
            </div>
          </div>
          <img
            src={heroImg}
            alt="A confident Kenyan insurance fraud analyst"
            className="pointer-events-none absolute -bottom-2 right-2 z-0 hidden h-[88%] w-auto object-contain lg:block"
          />
        </motion.div>

        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="rounded-3xl bg-[color:var(--brand-sage)] p-7 text-[color:var(--brand-sage-foreground)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[avatar1, avatar2, avatar3, avatar4].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-[color:var(--brand-sage)] object-cover"
                  />
                ))}
              </div>
              <div>
                <div className="text-xs tracking-wider opacity-90">★ ★ ★ ★ ★</div>
                <div className="mt-1 text-sm font-medium">98% Reviewer Confidence</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              Trusted by leading insurance schemes to run a single branded platform across hundreds
              of hospitals and millions in payouts.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="overflow-hidden rounded-3xl"
          >
            <img
              src={officeImg}
              alt="Kenyan claims review team at work"
              className="h-56 w-full object-cover"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="rounded-3xl bg-[color:var(--brand-ink)] p-7 text-[color:var(--brand-ink-foreground)]"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-serif text-4xl">
                  <Counter to={12400} suffix="+" />
                </div>
                <div className="mt-2 text-xs text-white/70">Claims reviewed across the scheme</div>
              </div>
              <div>
                <div className="font-serif text-4xl">
                  KES <Counter to={340} />
                  M+
                </div>
                <div className="mt-2 text-xs text-white/70">Suspected fraud value protected</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    "White-labeled for your scheme",
    "Hospital-to-insurer, end to end",
    "Built on OpenIMIS",
    "Real-time AI fraud scoring",
    "Human-in-the-loop review",
    "Audit-ready evidence",
  ];
  const row = [...items, ...items];
  return (
    <section className="overflow-hidden border-y border-border bg-[color:var(--brand-cream)] py-5">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 32, repeat: Infinity }}
      >
        {row.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-foreground">
            <PlusBadge className="h-3 w-3 text-[color:var(--brand-orange)]" />
            <span className="font-serif text-lg">{s}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

const featureCards = [
  {
    Icon: GlyphShield,
    title: "White-Label Branding",
    body: "Your logo, your name — the hospital portal and reviewer console carry your scheme's own identity end to end.",
  },
  {
    Icon: GlyphSprout,
    title: "Hospital Submission Portal",
    body: "Every hospital in your network submits claims through its own branded portal, straight into your OpenIMIS instance.",
  },
  {
    Icon: GlyphBloom,
    title: "Cross-Facility Patterns",
    body: "The same patient claiming treatment at multiple hospitals in a short window — visible only with scheme-wide data.",
  },
  {
    Icon: GlyphSpark,
    title: "Real-Time AI Scoring",
    body: "Every claim scored the moment it lands, against amount anomalies, duplicates, and provider outliers — with plain-language reasoning.",
  },
  {
    Icon: GlyphCross,
    title: "Built on OpenIMIS",
    body: "Installs as a standard OpenIMIS module via the documented signal pipeline. No rip-and-replace, no parallel system.",
  },
  {
    Icon: GlyphClover,
    title: "Human-in-the-Loop Review",
    body: "The AI suggests a next step; your reviewers stay in control and act directly in OpenIMIS.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-5xl leading-tight text-foreground">
          One Platform for Your Whole <span className="accent-word">Network</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          From hospital submission to AI-scored review — ClaimGuard connects your scheme and every
          facility you work with in a single branded experience.
        </p>
      </Reveal>
      <motion.div
        className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {featureCards.map(({ Icon, title, body }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            whileHover={{ y: -4 }}
            className="rounded-3xl bg-[color:var(--brand-cream)] p-8 transition-shadow hover:shadow-[0_10px_40px_-20px_rgba(141,105,89,0.4)]"
          >
            <Icon className="h-9 w-9 text-[color:var(--brand-brown)]" />
            <h3 className="mt-16 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      Icon: Building2,
      title: "Hospital submits",
      body: "Facility staff sign in to your branded portal and submit a claim — no workflow change on their end.",
    },
    {
      Icon: Database,
      title: "Syncs to OpenIMIS",
      body: "The claim lands in your OpenIMIS instance exactly as it would today.",
    },
    {
      Icon: Sparkles,
      title: "AI scores in real time",
      body: "ClaimGuard scores it against six fraud families and scheme-wide patterns the moment it arrives.",
    },
    {
      Icon: Stethoscope,
      title: "Reviewer gets a recommendation",
      body: "A plain-language suggestion — approve, investigate, or reject — for your reviewer to act on directly in OpenIMIS.",
    },
  ];
  return (
    <section
      id="how"
      className="bg-[color:var(--brand-ink)] py-24 text-[color:var(--brand-ink-foreground)]"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl">
          <h2 className="font-serif text-5xl leading-tight">
            How it <span className="accent-word">works</span>
          </h2>
          <p className="mt-5 text-white/70">
            One connected flow from hospital to scheme — branded for you, built on the OpenIMIS you
            already run.
          </p>
        </Reveal>
        <motion.div
          className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {steps.map(({ Icon, title, body }, i) => (
            <motion.div key={title} variants={fadeUp} className="rounded-3xl bg-white/5 p-7">
              <div className="flex items-center gap-3">
                <span className="font-serif text-3xl text-[color:var(--brand-orange)]">
                  0{i + 1}
                </span>
                <Icon className="h-5 w-5 text-white/80" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)] p-10 lg:p-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-5xl leading-tight text-foreground">
              Why Choose <span className="accent-word">ClaimGuard</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              One white-labeled platform connecting your scheme to every hospital you work with —
              built directly into the OpenIMIS infrastructure you already run.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <GlyphBloom className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  Cross-Hospital Visibility
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Detect patient and provider patterns no individual hospital can see — the signal
                  lives in the scheme, not the facility.
                </p>
              </div>
              <div>
                <GlyphShield className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  One Branded Platform
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  White-labeled for your scheme, from the hospital submission portal to the reviewer
                  console — installed directly into the OpenIMIS you already run.
                </p>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl"
          >
            <img
              src={whyImg}
              alt="Kenyan health insurance team reviewing claims"
              className="h-[460px] w-full object-cover"
              loading="lazy"
            />
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

const faqs = [
  {
    q: "How is this different from the duplicate-check OpenIMIS already does?",
    a: "OpenIMIS catches exact duplicates. ClaimGuard catches statistical anomalies, near-duplicates, cross-facility patterns, service–diagnosis mismatches, and provider outliers — patterns that pass the existing checks.",
  },
  {
    q: "Does ClaimGuard auto-reject claims?",
    a: "No. ClaimGuard never writes back to a claim. The AI scores it and suggests approve, investigate, or reject — your reviewer acts on that recommendation directly in OpenIMIS.",
  },
  {
    q: "Do we need to replace our OpenIMIS instance?",
    a: "No. ClaimGuard installs as a standard OpenIMIS backend module via openimis.json. It listens to the documented claim submission signal — no fork, no core changes.",
  },
  {
    q: "Can hospitals use this too, or is it just for the scheme?",
    a: "Both. Hospitals in your network sign in to their own branded portal to submit claims; your scheme's reviewers see the same claims, scored, in your branded console — one platform, two sides.",
  },
  {
    q: "What about false positives?",
    a: "We tune precision per scheme and surface reasoning with every flag, so reviewers can dismiss false positives in seconds. The system learns from your decisions.",
  },
  {
    q: "Where does the data stay?",
    a: "Inside your scheme's environment. ClaimGuard runs against your OpenIMIS database; only de-identified signals leave your perimeter when you opt into benchmarking.",
  },
];

function FAQItem({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span className="font-serif text-lg text-foreground">{q}</span>
        {open ? (
          <Minus className="h-4 w-4 shrink-0 text-[color:var(--brand-brown)]" />
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-[color:var(--brand-brown)]" />
        )}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </motion.div>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
      <Reveal className="text-center">
        <h2 className="font-serif text-5xl leading-tight">
          Common <span className="accent-word">questions</span>
        </h2>
      </Reveal>
      <Reveal className="mt-12">
        <div>
          {faqs.map((f, i) => (
            <FAQItem
              key={f.q}
              q={f.q}
              a={f.a}
              open={open === i}
              onClick={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function CTA() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-6 pb-12">
      <Reveal>
        <div className="overflow-hidden rounded-3xl bg-[color:var(--brand-orange)] px-10 py-16 text-white">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="font-serif text-5xl leading-tight">
                Ready to connect your <span className="italic">network</span>?
              </h2>
              <p className="mt-5 max-w-md text-white/85">
                Book a 30-minute walkthrough on real claim data — from hospital submission to
                AI-scored review, branded as your own.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <a
                href="mailto:hello@claimguard.health"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[color:var(--brand-orange)] hover:opacity-90"
              >
                <Mail className="h-4 w-4" /> Request a demo
              </a>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Sign in to console <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-6 pb-12">
      <div className="rounded-3xl bg-[color:var(--brand-ink)] px-10 py-12 text-[color:var(--brand-ink-foreground)]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-[color:var(--brand-orange)]">
              <LogoMark className="h-8 w-8" />
              <span className="font-serif text-2xl text-white">ClaimGuard</span>
            </div>
            <p className="mt-4 text-sm text-white/70">
              A white-labeled, end-to-end platform for insurance schemes and every hospital they
              work with — built on OpenIMIS.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                aria-label="LinkedIn"
                className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@claimguard.health"
                aria-label="Email"
                className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          <FooterCol
            title="Product"
            links={[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["Why ClaimGuard", "#why"],
              ["FAQ", "#faq"],
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              ["OpenIMIS docs", "https://openimis.org"],
              ["Security", "#"],
              ["Privacy", "#"],
              ["Status", "#"],
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <div>© {new Date().getFullYear()} ClaimGuard. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3" /> Nairobi, Kenya
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50">{title}</div>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-white/80 hover:text-white">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <WhyChoose />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
