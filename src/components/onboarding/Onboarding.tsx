"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { ArrowIcon, AtlasMark, CheckIcon, UploadIcon } from "@/components/ui/Icons";
import { subjects } from "@/lib/mock";

const STEPS = ["Syllabus", "Confirm", "Time"];

const READING_STAGES = [
  "Reading 42 pages",
  "Finding units and chapters",
  "Matching exam dates",
  "Building your topic graph",
];

const PRESETS = [45, 60, 90, 120, 150];

const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

export function Onboarding() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState(false);
  const [stage, setStage] = useState(0);
  const [studyTime, setStudyTime] = useState(120);

  useEffect(() => {
    if (!reading) return;
    if (stage >= READING_STAGES.length) {
      const done = setTimeout(() => {
        setReading(false);
        setStep(1);
      }, 400);
      return () => clearTimeout(done);
    }
    const next = setTimeout(() => setStage((s) => s + 1), 550);
    return () => clearTimeout(next);
  }, [reading, stage]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-3 text-ink">
          <AtlasMark size={24} />
          <span className="font-display text-[1.05rem] font-semibold tracking-[-0.01em]">Atlas</span>
        </span>

        <div className="flex items-center gap-4">
        {/* Segmented step display, cut into the sheet */}
        <ol className="flex items-center gap-1.5 rounded-full bg-linear-145 from-base-lo to-base-hi p-1.5 shadow-inset">
          {STEPS.map((name, i) => (
            <li
              key={name}
              className={cn(
                "micro rounded-full px-3 py-1.5 transition-all duration-300",
                i === step
                  ? "bg-linear-145 from-base-hi to-base-lo text-ink shadow-raised-sm"
                  : i < step
                    ? "text-teal-deep"
                    : "text-ink-3",
              )}
            >
              {name}
            </li>
          ))}
        </ol>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Stage key="upload" reduce={!!reduce}>
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[3rem]">
                Drop your syllabus.
                <br />
                <span className="text-ink-3">That&apos;s the whole setup.</span>
              </h1>
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
                A PDF or a photo of the printed sheet. Atlas reads the units, finds your
                exam dates, and builds the topic graph. You don&apos;t type anything.
              </p>

              {/* Intake slot */}
              <button
                type="button"
                onClick={() => {
                  setStage(0);
                  setReading(true);
                }}
                disabled={reading}
                className="group mt-9 w-full rounded-bay bg-linear-145 from-base-lo to-base-hi p-8 shadow-inset-deep transition-shadow disabled:cursor-progress"
              >
                <AnimatePresence mode="wait">
                  {!reading ? (
                    <motion.span
                      key="idle"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduce ? undefined : { opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <span className="grid size-16 place-items-center rounded-full bg-linear-145 from-base-hi to-base-lo text-ink-2 shadow-raised transition-shadow group-hover:shadow-raised-lg">
                        <UploadIcon width={22} height={22} />
                      </span>
                      <span className="text-center">
                        <span className="block text-[0.95rem] font-medium text-ink">
                          Choose a file or drag it here
                        </span>
                        <Micro className="mt-2 block">PDF, JPG or PNG · up to 20 MB</Micro>
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="reading"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="block"
                    >
                      <ul className="space-y-3 text-left">
                        {READING_STAGES.map((text, i) => (
                          <li key={text} className="flex items-center gap-3">
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
                                i < stage ? "bg-teal text-on-accent" : "bg-groove",
                              )}
                            >
                              {i < stage ? <CheckIcon width={11} height={11} /> : null}
                            </span>
                            <span
                              className={cn(
                                "text-[0.875rem]",
                                i < stage ? "text-ink" : i === stage ? "text-ink-2" : "text-ink-3",
                              )}
                            >
                              {text}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <span className="mt-6 block h-1.5 w-full overflow-hidden rounded-full bg-groove">
                        <motion.span
                          className="block h-full rounded-full bg-teal"
                          animate={{ width: `${(stage / READING_STAGES.length) * 100}%` }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <p className="micro mt-6 text-ink-3">
                No syllabus handy? <span className="text-teal-deep">Pick your board instead</span>
              </p>
            </Stage>
          )}

          {step === 1 && (
            <Stage key="confirm" reduce={!!reduce}>
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[3rem]">
                Found four subjects.
              </h1>
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
                Check the dates. Tap any of them to correct it — everything else is
                already in place.
              </p>

              <Panel depth="raised" radius="bay" className="mt-8 divide-y divide-hairline p-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: accentVar[subject.accent] }}
                      />
                      <span>
                        <span className="block text-[0.95rem] font-medium text-ink">
                          {subject.name}
                        </span>
                        <Micro className="mt-1 block">
                          {subject.discipline} · 4 units found
                        </Micro>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="readout rounded-key bg-linear-145 from-base-hi to-base-lo px-3.5 py-2 text-[0.72rem] font-medium text-ink shadow-raised-sm transition-shadow hover:shadow-raised active:shadow-pressed"
                    >
                      {new Date(`${subject.examDate}T00:00:00`).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </button>
                  </div>
                ))}
              </Panel>

              <div className="mt-8 flex items-center gap-3">
                <Key size="lg" tone="quiet" onClick={() => setStep(0)}>
                  Back
                </Key>
                <Key
                  size="lg"
                  tone="primary"
                  onClick={() => setStep(2)}
                  icon={<ArrowIcon width={17} height={17} />}
                >
                  Dates look right
                </Key>
              </div>
            </Stage>
          )}

          {step === 2 && (
            <Stage key="time" reduce={!!reduce}>
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[3rem]">
                How long do you sit
                <br />
                on a normal day?
              </h1>
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
                Atlas budgets each mission to fit. Be honest rather than ambitious —
                you can change this any time.
              </p>

              <div className="mt-10 text-center">
                <span className="readout text-[4.5rem] font-bold leading-none tracking-[-0.04em] text-ink">
                  {studyTime}
                </span>
                <Micro className="ml-2">minutes a day</Micro>
              </div>

              <div className="mt-8 flex gap-2 rounded-bay bg-linear-145 from-base-lo to-base-hi p-2 shadow-inset">
                {PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStudyTime(value)}
                    aria-pressed={value === studyTime}
                    className={cn(
                      "readout flex-1 rounded-key py-3.5 text-[0.8rem] font-semibold transition-all duration-200",
                      value === studyTime
                        ? "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised"
                        : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <Groove className="my-8" />

              <p className="text-[0.9rem] leading-relaxed text-ink-2">
                At {studyTime} minutes a day, Atlas can cover all four papers before
                the first exam on{" "}
                <span className="font-medium text-ink">14 Aug</span> with room for two
                revision passes.
              </p>

              <div className="mt-8 flex items-center gap-3">
                <Key size="lg" tone="quiet" onClick={() => setStep(1)}>
                  Back
                </Key>
                <Key
                  href="/"
                  size="lg"
                  tone="primary"
                  icon={<ArrowIcon width={17} height={17} />}
                >
                  Build my first mission
                </Key>
              </div>
            </Stage>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stage({ children, reduce }: { children: React.ReactNode; reduce: boolean }) {
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -14 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}
