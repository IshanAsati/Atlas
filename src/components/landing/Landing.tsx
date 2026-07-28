"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { AtlasMark, ArrowIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

/**
 * The page a student sees before they have an account.
 *
 * Built out of the app's own parts — the same panels, grooves and mono
 * instrument labels — so that arriving at the dashboard feels like walking
 * further into the same building rather than through a marketing door.
 */
export function Landing() {
  return (
    <div className="relative isolate">
      <PointerLean />
      <TopBar />
      <Hero />
      <CoachScrollytell />
      <Decides />
      <Reads />
      <Close />
      <Foot />
    </div>
  );
}

/**
 * The whole sheet leans very slightly toward the pointer.
 *
 * Two variables, read by the ambient wash below and by nothing else — the
 * text never moves, so nothing is ever harder to read. Spring-damped and
 * measured in a handful of pixels: the page should feel alive, not restless.
 */
function PointerLean() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 40, damping: 22, mass: 0.9 });
  const sy = useSpring(y, { stiffness: 40, damping: 22, mass: 0.9 });

  const glowX = useTransform(sx, (v) => `${50 + v * 14}%`);
  const glowY = useTransform(sy, (v) => `${28 + v * 10}%`);

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);

  /* Every hook runs before the early return. */
  const background = useTransform(
    [glowX, glowY],
    ([gx, gy]: string[]) =>
      `radial-gradient(60rem 45rem at ${gx} ${gy}, color-mix(in srgb, var(--teal) 9%, transparent), transparent 70%)`,
  );

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background }}
    />
  );
}

/* ------------------------------------------------------------------ */

function TopBar() {
  return (
    /* A sticky bar over scrolling content needs its own surface, or the mark
       and wordmark sit on whatever happens to pass beneath them. */
    <header className="sticky top-0 z-40 bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/welcome" className="inline-flex items-center gap-2.5">
          <AtlasMark size={22} className="text-teal" />
          <span className="font-display text-base font-semibold tracking-[-0.01em] text-ink">
            Atlas
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/onboarding"
            className="rounded-key bg-linear-145 from-base-hi to-base-lo px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-deep shadow-raised transition-shadow hover:shadow-raised-lg active:shadow-pressed"
          >
            Open Atlas
          </Link>
        </div>
      </div>
      <Groove />
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
      <motion.p {...rise(0)}>
        <Micro className="text-teal-deep">A study coach that argues back</Micro>
      </motion.p>

      <motion.h1
        {...rise(0.08)}
        className="mt-5 max-w-[16ch] font-display text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-7xl"
      >
        Your first mind forgets.
        <br />
        <span className="text-teal-deep">This one doesn&apos;t.</span>
      </motion.h1>

      <motion.p
        {...rise(0.16)}
        className="mt-7 max-w-[52ch] text-lg leading-relaxed text-ink-2"
      >
        Atlas holds a confidence score for every topic in your syllabus and watches
        it decay. Then it coaches you — Socratically, never handing over the answer —
        and updates that score from how you actually answered.
      </motion.p>

      <motion.div {...rise(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/onboarding"
          className="inline-flex h-14 items-center gap-2.5 rounded-[18px] bg-linear-145 from-base-hi to-base-lo px-7 font-mono text-[13px] font-semibold uppercase tracking-[0.13em] text-teal-deep shadow-raised transition-shadow hover:shadow-raised-lg active:shadow-pressed"
        >
          Drop your syllabus
          <ArrowIcon width={16} height={16} />
        </Link>
        <a
          href="#coach"
          className="inline-flex h-14 items-center rounded-[18px] px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.13em] text-ink-3 transition-colors hover:text-ink-2"
        >
          See it catch a mistake
        </a>
      </motion.div>

      <motion.p {...rise(0.3)} className="mt-8">
        <Micro>No setup beyond one PDF · CBSE and ICSE · Class 9–12</Micro>
      </motion.p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const SCRIPT = [
  {
    role: "coach" as const,
    body: "A current-carrying wire is bent into a loop. What happens to the magnetic field at the centre, compared with the straight wire?",
  },
  {
    role: "student" as const,
    body: "It gets weaker, because the wire is longer now.",
  },
  {
    role: "coach" as const,
    body: "Length isn't what sets the field here. Picture the field lines from each small segment of the loop — at the centre, are they pointing the same way, or fighting each other?",
    flag: "Treating field strength as a function of wire length",
  },
];

/**
 * The signature. Scrolling drives a real coaching exchange forward and the
 * confidence gauge moves with it — the one thing Atlas does that a chat
 * window doesn't, shown rather than claimed.
 */
function CoachScrollytell() {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start start", "end end"],
  });

  /* With reduced motion the exchange is simply already finished: a constant 1
     drives every transform below to its end state, so the same code path
     serves both without a second layout. */
  const settled = useMotionValue(1);
  const progress = reduce ? settled : scrollYProgress;

  return (
    <section id="coach" className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
      <Groove />
      <div className="pt-16 sm:pt-24">
        <Micro className="text-teal-deep">The coach</Micro>
        <h2 className="mt-4 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
          It won&apos;t give you the answer.
        </h2>
        <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink-2">
          Anything can explain magnetism. Atlas is trying to find the specific idea
          you have wrong — and then make you see it yourself.
        </p>
      </div>

      {/* Tall track: the panel sticks while the conversation advances. */}
      <div ref={track} className={cn("relative mt-12 sm:mt-16", reduce ? "" : "h-[280vh]")}>
        <div className={cn("pb-10", reduce ? "" : "sticky top-[14vh]")}>
          <ExchangePanel progress={progress} />
        </div>
      </div>
    </section>
  );
}

function ExchangePanel({ progress }: { progress: MotionValue<number> }) {
  /* Each turn owns a slice of the scroll, so the reader sets the pace rather
     than a timer racing them. */
  /* The question is the setup, so it is simply there — the panel should never
     greet you empty. Scrolling reveals the answer and what Atlas does with it. */
  const t1 = useTransform(progress, [0.12, 0.3], [0, 1]);
  const t2 = useTransform(progress, [0.38, 0.56], [0, 1]);
  const t3 = useTransform(progress, [0.58, 0.74], [0, 1]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <Panel depth="raised" radius="bay" className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Micro>Focus · Magnetic Effects</Micro>
          <Micro className="text-ink-3">Physics</Micro>
        </div>

        <Groove className="my-6" />

        <div className="space-y-5">
          <Turn turn={SCRIPT[0]} />
          <Turn turn={SCRIPT[1]} opacity={t1} />
          <Turn turn={SCRIPT[2]} opacity={t2} />
        </div>
      </Panel>

      <Gauge progress={t3} />
    </div>
  );
}

function Turn({
  turn,
  opacity,
}: {
  turn: (typeof SCRIPT)[number];
  opacity?: MotionValue<number>;
}) {
  const isCoach = turn.role === "coach";
  return (
    <motion.div style={opacity ? { opacity } : undefined}>
      <Micro className={isCoach ? "text-teal-deep" : "text-ink-3"}>
        {isCoach ? "Atlas" : "You"}
      </Micro>
      <p
        className={cn(
          "mt-2.5 rounded-key px-4 py-3.5 text-[15px] leading-relaxed",
          isCoach
            ? "bg-linear-145 from-base-lo to-base-hi text-ink shadow-inset"
            : "bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised-sm",
        )}
      >
        {turn.body}
      </p>
      {turn.flag ? (
        <p className="mt-2.5 flex items-start gap-2.5 rounded-key bg-amber-wash/70 px-3.5 py-2.5 text-[13px] leading-snug text-amber-deep">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
          <span>
            <span className="font-semibold">Misconception found.</span> {turn.flag}.
          </span>
        </p>
      ) : null}
    </motion.div>
  );
}

/** The confidence reading, falling as the exchange lands. */
function Gauge({ progress }: { progress: MotionValue<number> }) {
  const width = useTransform(progress, [0, 1], ["30%", "26%"]);
  const beforeOpacity = useTransform(progress, [0, 1], [1, 0]);

  return (
    <Panel depth="raised" radius="bay" className="flex flex-col p-6 sm:p-7">
      <Micro>Atlas&apos;s model of you</Micro>
      <Groove className="my-5" />

      <div className="relative h-12">
        <motion.span
          className="readout absolute inset-0 text-5xl font-bold leading-none text-ink"
          style={{ opacity: beforeOpacity }}
        >
          30%
        </motion.span>
        <motion.span
          className="readout absolute inset-0 text-5xl font-bold leading-none text-amber-deep"
          style={{ opacity: progress }}
        >
          26%
        </motion.span>
      </div>

      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-groove shadow-inset">
        <motion.div className="h-full rounded-full bg-amber" style={{ width }} />
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-2">
        One wrong answer moves the number. Your learning graph, tomorrow&apos;s
        mission and your revision queue all move with it.
      </p>

      <Micro className="mt-auto pt-6 text-ink-3">Confidence · Magnetic Effects</Micro>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Decides() {
  const items = [
    {
      label: "Plan",
      title: "It picks the topic",
      body: "Every morning Atlas scores your topics on confidence, days since you last saw them and how close the paper is. You get a mission that fits the time you actually have.",
    },
    {
      label: "Track",
      title: "It maps what you know",
      body: "Your syllabus becomes a graph — subject, chapter, topic — each node carrying its own score. The weak branches are visible before a test finds them.",
    },
    {
      label: "Adapt",
      title: "It expects you to forget",
      body: "Confidence decays on a curve. Topics resurface for revision on their own, and momentum eases off when you miss a day rather than resetting to zero.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 pt-16 sm:px-8 sm:pt-24">
      <Groove />
      <div className="pt-16 sm:pt-24">
        <Reveal>
          <Micro>What it decides for you</Micro>
          <h2 className="mt-4 max-w-[22ch] font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
            Stop deciding what to study.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.label} delay={i * 0.08}>
              <Panel depth="raised" radius="bay" className="h-full p-6 sm:p-7">
                <Micro className="text-teal-deep">{it.label}</Micro>
                <h3 className="mt-3.5 font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                  {it.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{it.body}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Reads() {
  const steps = [
    ["Upload", "A syllabus PDF, or a photo of a printed one. Atlas reads the text — no typing, no forms."],
    ["Extract", "Subjects, chapters and exam dates come out structured, and you correct anything it misread."],
    ["Begin", "The first mission is waiting before you've finished putting your phone down."],
  ];

  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 pt-16 sm:px-8 sm:pt-24">
      <Groove />
      <div className="grid gap-10 pt-16 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <Reveal>
          <Micro>Setup</Micro>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
            One file, then never again.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-2">
            Most study apps ask you to build the thing that was supposed to help you.
            Atlas asks for the document your school already gave you.
          </p>
        </Reveal>

        <ol className="space-y-px overflow-hidden rounded-bay shadow-inset">
          {steps.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <li className="flex gap-5 px-6 py-6 sm:px-7">
                <span className="readout shrink-0 pt-0.5 text-[13px] font-bold text-teal-deep">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                    {title}
                  </span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-ink-2">
                    {body}
                  </span>
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Close() {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 pt-16 sm:px-8 sm:pt-24">
      <Groove />
      <Reveal className="pt-16 text-center sm:pt-24">
        <h2 className="mx-auto max-w-[18ch] font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] text-ink sm:text-6xl">
          Open it, and it already knows.
        </h2>
        <p className="mx-auto mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-2">
          Students shouldn&apos;t have to wonder what to study next. Give Atlas your
          syllabus once and it will decide, every morning, for the rest of the year.
        </p>
        <Link
          href="/onboarding"
          className="mt-9 inline-flex h-14 items-center gap-2.5 rounded-[18px] bg-linear-145 from-base-hi to-base-lo px-8 font-mono text-[13px] font-semibold uppercase tracking-[0.13em] text-teal-deep shadow-raised transition-shadow hover:shadow-raised-lg active:shadow-pressed"
        >
          Start with your syllabus
          <ArrowIcon width={16} height={16} />
        </Link>
      </Reveal>
    </section>
  );
}

function Foot() {
  return (
    <footer className="mx-auto w-full max-w-[1100px] px-5 pb-14 pt-16 sm:px-8 sm:pt-24">
      <Groove />
      <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
        <span className="inline-flex items-center gap-2.5 text-ink-2">
          <AtlasMark size={18} />
          <Micro>Atlas — a study operating system</Micro>
        </span>
        <Micro className="text-ink-3">Built for MINDBOT · Synaptica</Micro>
      </div>
    </footer>
  );
}
