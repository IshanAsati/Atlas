"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Groove, Micro, Panel } from "@/components/ui/Panel";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { ArrowIcon, AtlasMark, CheckIcon, UploadIcon } from "@/components/ui/Icons";
import { subjects as seedSubjects } from "@/lib/mock";
import type { Subject } from "@/lib/mock";
import { useAuth } from "@/lib/auth/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";

const STEPS = ["Syllabus", "Confirm", "Time"];

const PRESETS = [45, 60, 90, 120, 150];

const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

export function Onboarding() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState(false);
  const [stages, setStages] = useState<string[]>([
    "Reading your syllabus...",
    "Finding units and chapters",
    "Matching exam dates",
    "Building your topic graph",
  ]);
  const [stageIndex, setStageIndex] = useState(0);
  const [studyTime, setStudyTime] = useState(120);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  /* Never pre-filled with sample data. The old version seeded this from
     mock.ts, so a failed extraction still showed "Found 4 subjects" and the
     student had no way to know their PDF was never read. */
  const [extractedSubjects, setExtractedSubjects] = useState<Subject[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [usingSample, setUsingSample] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [buildingMission, setBuildingMission] = useState(false);
  const [subjectDates, setSubjectDates] = useState<Record<string, string>>({});

  const loadSample = async () => {
    setUsingSample(true);
    setExtractError(null);
    setExtractedSubjects(seedSubjects);
    setTopicCounts(Object.fromEntries(seedSubjects.map((s) => [s.id, 4])));
    setSubjectDates(Object.fromEntries(seedSubjects.map((s) => [s.id, s.examDate])));
    setStep(1);

    /* Persist it like a real extraction would, otherwise the dashboard is
       still empty after onboarding "succeeds". */
    try {
      await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: true }),
      });
    } catch {
      /* The confirm step still works from local state. */
    }
  };

  const handleFile = async (file: File) => {
    setReading(true);
    setExtractError(null);
    setUsingSample(false);
    setStageIndex(0);
    setStages(["Reading your syllabus...", "Finding units and chapters", "Matching exam dates", "Building your topic graph"]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract", { method: "POST", body: formData });

      if (!response.ok || !response.body) {
        setReading(false);
        setExtractError("Atlas couldn't start reading that file. Try again.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resultSubjects: Subject[] | null = null;
      let resultCounts: Record<string, number> = {};
      let failure: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const frame = JSON.parse(line);
            if (frame.type === "stage" && frame.text) {
              setStages((prev) => {
                const next = [...prev];
                for (let i = 0; i < next.length; i++) {
                  if (i < stageIndex + 1) continue;
                  next[i] = frame.text;
                  break;
                }
                return next;
              });
              setStageIndex((s) => s + 1);
            }
            if (frame.type === "error") {
              failure = frame.message ?? "Extraction failed.";
            }
            if (frame.type === "result" && frame.subjects) {
              resultSubjects = frame.subjects.map((s: Omit<Subject, "id">, i: number) => ({
                ...s,
                id: `s${i + 1}`,
                accent: (["teal", "amber", "rust"] as const)[i % 3],
              }));
              /* Count per subject, not one number reused for all of them. */
              if (Array.isArray(frame.topics)) {
                resultCounts = {};
                for (const t of frame.topics as Array<{ subjectId?: string }>) {
                  if (!t?.subjectId) continue;
                  resultCounts[t.subjectId] = (resultCounts[t.subjectId] ?? 0) + 1;
                }
              }
            }
          } catch { /* partial frame */ }
        }
      }

      if (failure) {
        setReading(false);
        setExtractError(failure);
        return;
      }

      if (!resultSubjects || resultSubjects.length === 0) {
        setReading(false);
        setExtractError("Atlas didn't find any subjects in that file.");
        return;
      }

      setExtractedSubjects(resultSubjects);
      setTopicCounts(resultCounts);
      setSubjectDates(Object.fromEntries(resultSubjects.map((s) => [s.id, s.examDate])));
      setReading(false);
      setStep(1);
    } catch {
      setReading(false);
      setExtractError("Lost the connection while reading. Check your network and try again.");
    }
  };

  const triggerFile = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    /* Clear the value or picking the same file twice fires no change event —
       which made "Try another file" silently do nothing after a failure. */
    e.target.value = "";
    if (file) handleFile(file);
  };

  const handleBuildMission = async () => {
    setBuildingMission(true);
    /* Save the corrected exam dates before planning, or the planner weights
       the mission against the dates that were extracted rather than the
       ones the student just fixed. */
    const dates: Record<string, string> = {
      ...Object.fromEntries(extractedSubjects.map((s) => [s.id, s.examDate])),
      ...subjectDates,
    };

    try {
      if (Object.keys(dates).length > 0) {
        await fetch("/api/subjects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates }),
        });
      }
    } catch {
      // A failed save shouldn't block the student from starting.
    }

    /* Persist the daily budget too, or tomorrow's mission is planned against
       the 120-minute default instead of what they chose. */
    try {
      await fetch("/api/student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyTime }),
      });
    } catch {
      // Not worth blocking the student over.
    }

    try {
      const date = new Date().toISOString().slice(0, 10);
      await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, studyTime }),
      });
    } catch {
      // proceed even if mission gen fails
    }
    setBuildingMission(false);
    router.push("/");
  };

  if (loading) return null;
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <span className="mb-8 inline-flex items-center gap-3 text-ink">
          <AtlasMark size={28} />
          <span className="font-display text-[1.1rem] font-semibold">Atlas</span>
        </span>
        <LoginForm />
      </div>
    );
  }

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
                Atlas reads the units, finds your exam dates, and builds the topic
                graph. You don&apos;t type anything. A scanned photo won&apos;t work yet —
                it needs a PDF with real text in it.
              </p>

              {/* Intake slot */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <button
                type="button"
                onClick={triggerFile}
                disabled={reading}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
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
                        <Micro className="mt-2 block">Text-based PDF · up to 20 MB</Micro>
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
                        {stages.map((text, i) => (
                          <li key={text} className="flex items-center gap-3">
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
                                i < stageIndex ? "bg-teal text-on-accent" : "bg-groove",
                              )}
                            >
                              {i < stageIndex ? <CheckIcon width={11} height={11} /> : null}
                            </span>
                            <span
                              className={cn(
                                "text-[0.875rem]",
                                i < stageIndex ? "text-ink" : i === stageIndex ? "text-ink-2" : "text-ink-3",
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
                          animate={{ width: `${(stageIndex / Math.max(stages.length, 1)) * 100}%` }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {extractError ? (
                <div className="mt-6 rounded-key bg-amber-wash/70 px-4 py-3.5" role="alert">
                  <p className="flex items-start gap-2.5 text-[0.85rem] leading-snug text-amber-deep">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
                    {extractError}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 pl-4">
                    <button
                      type="button"
                      onClick={triggerFile}
                      className="micro text-ink-2 underline underline-offset-4 hover:text-ink"
                    >
                      Try another file
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadSample()}
                      className="micro text-ink-3 underline underline-offset-4 hover:text-ink-2"
                    >
                      Continue with a sample syllabus
                    </button>
                  </div>
                </div>
              ) : (
                <p className="micro mt-6 text-ink-3">
                  No syllabus handy?{" "}
                  <button
                    type="button"
                    onClick={() => void loadSample()}
                    className="text-teal-deep underline underline-offset-4"
                  >
                    Use a sample Class 10 syllabus
                  </button>
                </p>
              )}
            </Stage>
          )}

          {step === 1 && (
            <Stage key="confirm" reduce={!!reduce}>
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[3rem]">
                Found {extractedSubjects.length} {extractedSubjects.length === 1 ? "subject" : "subjects"}.
              </h1>
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-2">
                Check the dates. Tap any of them to correct it — everything else is
                already in place.
              </p>

              {usingSample ? (
                <p className="micro mt-4 inline-flex items-center gap-2 rounded-full bg-linear-145 from-base-lo to-base-hi px-3.5 py-2 text-ink-2 shadow-inset">
                  <span aria-hidden className="size-1.5 rounded-full bg-amber" />
                  Sample syllabus — not read from a file
                </p>
              ) : null}

              <Panel depth="raised" radius="bay" className="mt-8 divide-y divide-hairline p-2">
                {extractedSubjects.map((subject) => (
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
                          {subject.discipline}
                          {topicCounts[subject.id]
                            ? ` · ${topicCounts[subject.id]} ${topicCounts[subject.id] === 1 ? "topic" : "topics"}`
                            : ""}
                        </Micro>
                      </span>
                    </span>
                    {editingSubject === subject.id ? (
                      <input
                        type="date"
                        value={subjectDates[subject.id]}
                        onChange={(e) =>
                          setSubjectDates((prev) => ({ ...prev, [subject.id]: e.target.value }))
                        }
                        onBlur={() => setEditingSubject(null)}
                        autoFocus
                        className="readout rounded-key bg-linear-145 from-base-lo to-base-hi px-3.5 py-2 text-[0.72rem] font-medium text-ink shadow-inset outline-none ring-1 ring-teal/40"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingSubject(subject.id)}
                        className="readout rounded-key bg-linear-145 from-base-hi to-base-lo px-3.5 py-2 text-[0.72rem] font-medium text-ink shadow-raised-sm transition-shadow hover:shadow-raised active:shadow-pressed"
                      >
                        {new Date(`${subjectDates[subject.id]}T00:00:00`).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </button>
                    )}
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
                  size="lg"
                  tone="primary"
                  onClick={handleBuildMission}
                  icon={<ArrowIcon width={17} height={17} />}
                  disabled={buildingMission}
                >
                  {buildingMission ? "Building…" : "Build my first mission"}
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
