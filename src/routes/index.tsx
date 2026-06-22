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
  ShieldCheck,
  Activity,
  Stethoscope,
  Building2,
  Database,
  Sparkles,
  Quote,
  Plus,
  Minus,
  Check,
  Linkedin,
  Twitter,
  Mail,
} from "lucide-react";

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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
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
        <a href="#platform" className="hover:text-[color:var(--brand-brown)]">Platform</a>
        <a href="#detection" className="hover:text-[color:var(--brand-brown)]">Detection</a>
        <a href="#how" className="hover:text-[color:var(--brand-brown)]">How it works</a>
        <a href="#testimonials" className="hover:text-[color:var(--brand-brown)]">Schemes</a>
        <a href="#faq" className="hover:text-[color:var(--brand-brown)]">FAQ</a>
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
    <section className="mx-auto max-w-7xl px-6 pb-16">
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
              Trusted by leading insurance schemes to safeguard claims integrity
              across hundreds of hospitals and millions in payouts.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="overflow-hidden rounded-3xl"
          >
            <img src={officeImg} alt="Kenyan claims review team at work" className="h-56 w-full object-cover" loading="lazy" />
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
                  KES <Counter to={340} />M+
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
    "Cross-hospital pattern detection",
    "Sub-second risk scoring",
    "Built on OpenIMIS",
    "Plain-language reasoning",
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

const detectionCards = [
  { Icon: GlyphClover, title: "Amount Anomalies", body: "Claims priced abnormally high for the diagnosis or service mix, benchmarked against national medians and peer facilities." },
  { Icon: GlyphSprout, title: "Duplicate & Near-Duplicate Claims", body: "The same patient and treatment claimed more than once, even when invoice numbers and timestamps are deliberately varied." },
  { Icon: GlyphBloom, title: "Cross-Facility Patterns", body: "The same patient claiming treatment at multiple hospitals in a short window — visible only with scheme-wide data." },
  { Icon: GlyphSpark, title: "Service–Diagnosis Mismatches", body: "Billed procedures and medications that are not clinically indicated for the submitted diagnosis code." },
  { Icon: GlyphCross, title: "Provider Outliers", body: "Facilities whose claim volume, average value, or service mix spikes suddenly against their own baseline." },
  { Icon: GlyphShield, title: "Timing Anomalies", body: "Claims submitted in suspicious batches or at unusual hours — a known signal of automated and coordinated abuse." },
];

function Detection() {
  return (
    <section id="detection" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-5xl leading-tight text-foreground">
          Fraud Detection <span className="accent-word">Across</span> the Board
        </h2>
        <p className="mt-5 text-muted-foreground">
          Every claim is scored against six families of fraud signals — combining
          facility-level history with patterns only visible at scheme scale.
        </p>
      </Reveal>
      <motion.div
        className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {detectionCards.map(({ Icon, title, body }) => (
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
    { Icon: Database, title: "Claim arrives", body: "A hospital submits a claim into OpenIMIS — exactly as today, no workflow change." },
    { Icon: Sparkles, title: "AI scores in real time", body: "ClaimGuard scores it against six fraud families and scheme-wide patterns." },
    { Icon: Stethoscope, title: "Reviewer decides", body: "High-risk claims surface in the queue with plain-language reasoning. Human-in-the-loop." },
    { Icon: ShieldCheck, title: "Payment protected", body: "Clean claims pay through. Suspect claims are held, investigated, or rejected with evidence." },
  ];
  return (
    <section id="how" className="bg-[color:var(--brand-ink)] py-24 text-[color:var(--brand-ink-foreground)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl">
          <h2 className="font-serif text-5xl leading-tight">
            How it <span className="accent-word">works</span>
          </h2>
          <p className="mt-5 text-white/70">
            ClaimGuard slots into your existing OpenIMIS instance via the documented module signal pipeline. No rip-and-replace, no parallel system.
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
                <span className="font-serif text-3xl text-[color:var(--brand-orange)]">0{i + 1}</span>
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

function Stats() {
  const stats = [
    { num: 12400, suffix: "+", cap: "Claims scored this quarter" },
    { num: 340, prefix: "KES ", suffix: "M+", cap: "Value at risk identified" },
    { num: 98, suffix: "", cap: "Hospitals connected to the scheme" },
    { num: 94, suffix: "%", cap: "Detection accuracy on audited cases" },
  ];
  return (
    <section id="platform" className="mx-auto max-w-7xl px-6 py-16">
      <Reveal>
        <div className="grid gap-12 rounded-3xl bg-[color:var(--brand-sage)] px-10 py-14 text-[color:var(--brand-sage-foreground)] md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.cap}>
              <div className="font-serif text-5xl leading-none">
                <Counter to={s.num} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mt-3 text-sm leading-snug opacity-90">{s.cap}</div>
            </div>
          ))}
        </div>
      </Reveal>
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
              We give insurance schemes the cross-hospital visibility no single facility can have — and slot directly into the infrastructure you already run.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <GlyphBloom className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">Cross-Hospital Visibility</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Detect patient and provider patterns no individual hospital can see — the signal lives in the scheme, not the facility.
                </p>
              </div>
              <div>
                <GlyphShield className="h-8 w-8 text-[color:var(--brand-brown)]" />
                <h3 className="mt-5 text-base font-semibold text-foreground">Built on OpenIMIS</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Integrates directly into your existing claims infrastructure. No rip-and-replace, no parallel system to maintain.
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
            <img src={whyImg} alt="Kenyan health insurance team reviewing claims" className="h-[460px] w-full object-cover" loading="lazy" />
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

const testimonials = [
  { quote: "Within the first month we caught a cross-facility ring that had been billing the same patient at four hospitals in two weeks. No legacy tool flagged it.", name: "Dr. Achieng Odhiambo", role: "Director of Claims, National Scheme", avatar: avatar3 },
  { quote: "The reasoning is what won my reviewers over. They see why a claim is flagged — in plain language — and they trust the recommendation.", name: "Mwangi Njoroge", role: "Head of Fraud Investigations", avatar: avatar2 },
  { quote: "ClaimGuard plugged into our OpenIMIS instance in a sprint. No core changes, no parallel system. That alone is unusual for this kind of capability.", name: "Wanjiku Kamau", role: "Scheme IT Lead", avatar: avatar1 },
];

function Testimonials() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % testimonials.length), 6500);
    return () => clearInterval(t);
  }, []);
  const t = testimonials[i];
  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-5xl leading-tight">
          Trusted by <span className="accent-word">schemes</span> that pay at scale
        </h2>
      </Reveal>
      <Reveal className="mt-12">
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl rounded-3xl bg-[color:var(--brand-cream)] p-10 text-center"
        >
          <Quote className="mx-auto h-8 w-8 text-[color:var(--brand-orange)]" />
          <blockquote className="mt-6 font-serif text-2xl leading-relaxed text-foreground">
            "{t.quote}"
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <img src={t.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
            <div className="text-left">
              <div className="text-sm font-semibold text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        </motion.div>
        <div className="mt-6 flex justify-center gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={"h-2 rounded-full transition-all " + (idx === i ? "w-8 bg-[color:var(--brand-brown)]" : "w-2 bg-border")}
              aria-label={"Show testimonial " + (idx + 1)}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

const team = [
  { name: "Achieng Odhiambo", role: "Co-founder & CEO", avatar: avatar3 },
  { name: "Mwangi Njoroge", role: "Head of Fraud Analytics", avatar: avatar2 },
  { name: "Wanjiku Kamau", role: "Lead Engineer", avatar: avatar1 },
  { name: "Kiprotich Kosgei", role: "Public Health Advisor", avatar: avatar4 },
];

function Team() {
  return (
    <section id="team" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="max-w-2xl">
        <h2 className="font-serif text-5xl leading-tight">
          The team <span className="accent-word">behind</span> ClaimGuard
        </h2>
        <p className="mt-5 text-muted-foreground">
          A small, focused team of engineers, fraud analysts and public health specialists building for African health financing.
        </p>
      </Reveal>
      <motion.div
        className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {team.map((m) => (
          <motion.div
            key={m.name}
            variants={fadeUp}
            whileHover={{ y: -4 }}
            className="overflow-hidden rounded-3xl bg-[color:var(--brand-cream)]"
          >
            <div className="aspect-square overflow-hidden">
              <img src={m.avatar} alt={m.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
            </div>
            <div className="p-5">
              <div className="font-serif text-lg text-foreground">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.role}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

const faqs = [
  { q: "How is this different from the duplicate-check OpenIMIS already does?", a: "OpenIMIS catches exact duplicates. ClaimGuard catches statistical anomalies, near-duplicates, cross-facility patterns, service–diagnosis mismatches, and provider outliers — patterns that pass the existing checks." },
  { q: "Does ClaimGuard auto-reject claims?", a: "No. ClaimGuard is human-in-the-loop. The AI scores and explains; a reviewer decides. High-risk claims are surfaced with evidence, never silently denied." },
  { q: "Do we need to replace our OpenIMIS instance?", a: "No. ClaimGuard installs as a standard OpenIMIS backend module via openimis.json. It listens to the documented claim submission signal — no fork, no core changes." },
  { q: "What about false positives?", a: "We tune precision per scheme and surface reasoning with every flag, so reviewers can dismiss false positives in seconds. The system learns from your decisions." },
  { q: "Where does the data stay?", a: "Inside your scheme's environment. ClaimGuard runs against your OpenIMIS database; only de-identified signals leave your perimeter when you opt into benchmarking." },
];

function FAQItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-border">
      <button onClick={onClick} className="flex w-full items-center justify-between gap-6 py-5 text-left">
        <span className="font-serif text-lg text-foreground">{q}</span>
        {open ? <Minus className="h-4 w-4 shrink-0 text-[color:var(--brand-brown)]" /> : <Plus className="h-4 w-4 shrink-0 text-[color:var(--brand-brown)]" />}
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
            <FAQItem key={f.q} q={f.q} a={f.a} open={open === i} onClick={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Pilot", price: "Free", desc: "90-day pilot on a single OpenIMIS instance.", features: ["Up to 5,000 claims/mo", "All six fraud families", "Email support"] },
    { name: "Scheme", price: "Custom", desc: "Production deployment for national or regional schemes.", features: ["Unlimited claims", "Cross-facility analytics", "SLA & dedicated reviewer training", "Audit-ready reporting"], featured: true },
    { name: "Partner", price: "Custom", desc: "For consortia rolling out OpenIMIS across multiple payers.", features: ["Multi-tenant deployment", "Custom model tuning", "On-site enablement"] },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-5xl leading-tight">
          Built for <span className="accent-word">every</span> scheme size
        </h2>
        <p className="mt-5 text-muted-foreground">Start with a pilot. Scale when the evidence speaks for itself.</p>
      </Reveal>
      <motion.div
        className="mt-14 grid gap-6 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {plans.map((p) => (
          <motion.div
            key={p.name}
            variants={fadeUp}
            className={
              "rounded-3xl p-8 " +
              (p.featured
                ? "bg-[color:var(--brand-brown)] text-[color:var(--brand-brown-foreground)]"
                : "bg-[color:var(--brand-cream)] text-foreground")
            }
          >
            <div className="text-xs uppercase tracking-wider opacity-70">{p.name}</div>
            <div className="mt-4 font-serif text-4xl">{p.price}</div>
            <p className="mt-3 text-sm opacity-80">{p.desc}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#contact"
              className={
                "mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium " +
                (p.featured ? "bg-white text-[color:var(--brand-brown)] hover:opacity-90" : "bg-[color:var(--brand-brown)] text-[color:var(--brand-brown-foreground)] hover:opacity-90")
              }
            >
              Talk to us
            </a>
          </motion.div>
        ))}
      </motion.div>
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
                Ready to protect your <span className="italic">scheme</span>?
              </h2>
              <p className="mt-5 max-w-md text-white/85">
                Book a 30-minute walkthrough on real claim data. We'll show you what your existing pipeline is missing — live.
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
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-[color:var(--brand-orange)]">
              <LogoMark className="h-8 w-8" />
              <span className="font-serif text-2xl text-white">ClaimGuard</span>
            </div>
            <p className="mt-4 text-sm text-white/70">
              Built for national health insurance schemes that pay claims at scale — and refuse to pay for fraud.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#" aria-label="LinkedIn" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><Linkedin className="h-4 w-4" /></a>
              <a href="#" aria-label="Twitter" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><Twitter className="h-4 w-4" /></a>
              <a href="mailto:hello@claimguard.health" aria-label="Email" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><Mail className="h-4 w-4" /></a>
            </div>
          </div>
          <FooterCol title="Product" links={[["Platform", "#platform"], ["Detection", "#detection"], ["How it works", "#how"], ["Pricing", "#pricing"]]} />
          <FooterCol title="Company" links={[["Team", "#team"], ["Schemes", "#testimonials"], ["FAQ", "#faq"], ["Contact", "#contact"]]} />
          <FooterCol title="Resources" links={[["OpenIMIS docs", "https://openimis.org"], ["Security", "#"], ["Privacy", "#"], ["Status", "#"]]} />
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
            <a href={href} className="text-white/80 hover:text-white">{label}</a>
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
      <Detection />
      <HowItWorks />
      <Stats />
      <WhyChoose />
      <Testimonials />
      <Team />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
      <Activity className="hidden" />
    </div>
  );
}
