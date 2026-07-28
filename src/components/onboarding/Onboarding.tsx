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
import { daysUntil } from "@/lib/mock";
import type { Subject } from "@/lib/mock";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAtlasData } from "@/lib/atlas-context";
import { LoginForm } from "@/components/auth/LoginForm";
import { MIN_OCR_CHARS, isImageFile, ocrImage } from "@/lib/extract/ocr";
import { localISO } from "@/lib/date";

const STEPS = ["Syllabus", "Confirm", "Time"];

/* The four stages the extraction route streams back. A photo adds one more in
   front of them, for the OCR pass that happens here in the browser. */
const SERVER_STAGES = [
  "Reading your syllabus...",
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
  const { user, loading } = useAuth();
  const { refresh } = useAtlasData();
  const router = useRouter();
  const reduce = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState(false);
  const [stages, setStages] = useState<string[]>(SERVER_STAGES);
  const [stageIndex, setStageIndex] = useState(0);
  /* Fraction of the first stage that OCR has finished, so the same bar moves
     while the photo is being read instead of sitting still. Null once the
     text is out and the server takes over. */
  const [ocrPercent, setOcrPercent] = useState<number | null>(null);
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
    setOcrPercent(null);
    setExtractError(null);
    setUsingSample(false);
    setStageIndex(0);
    setStages(["Reading your syllabus...", "Finding units and chapters", "Matching exam dates", "Building your topic graph"]);

    try {
      let textBody: string | undefined;
      const ocrStages = ["Reading your textbook…", "Finding units and chapters", "Matching exam dates", "Building your topic graph"];

      if (isImageFile(file)) {
        /* Photo — OCR it in the browser, then send the text to the server.
           The extraction route accepts a `text` form field for this path. */
        setStages(ocrStages);
        const text = await ocrImage(file, setOcrPercent);
        setOcrPercent(null);
        if (text.length < MIN_OCR_CHARS) {
          throw new Error(`Atlas read ${text.length} characters — too few to extract a syllabus. Try a clearer photo or a PDF scan.`);
        }
        textBody = text;
      }

      const formData = new FormData();
      if (textBody) {
        formData.append("text", textBody);
      } else {
        formData.append("file", file);
      }

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
              /* Keep whatever id the server saved these under. Renumbering
                 them s1, s2, s3 meant every exam-date correction was sent
                 against an id that doesn't exist, so nothing ever saved. */
              resultSubjects = frame.subjects.map((s: Subject, i: number) => ({
                ...s,
                id: s.id ?? `s${i + 1}`,
                accent: s.accent ?? (["teal", "amber", "rust"] as const)[i % 3],
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

  /* What {studyTime} a day actually buys, worked out from the subjects that
     were just extracted and the real date — this used to be a fixed sentence
     about four papers and 14 Aug regardless of what the student uploaded. */
  const coverage = (() => {
    const dated = extractedSubjects
      .map((s) => ({ name: s.name, days: daysUntil(subjectDates[s.id] ?? s.examDate) }))
      .filter((s) => Number.isFinite(s.days) && s.days > 0)
      .sort((a, b) => a.days - b.days);

    const topicTotal = Object.values(topicCounts).reduce((sum, n) => sum + n, 0);
    const papers = extractedSubjects.length;
    const paperWord = papers === 1 ? "paper" : "papers";

    if (!dated.length) {
      return `At ${studyTime} minutes a day you'll get through roughly ${Math.round((studyTime / 30) * 7)} topics a week. Add an exam date and Atlas will pace the whole syllabus against it.`;
    }

    const first = dated[0];
    /* ~30 min a topic for a first pass, so this many topics fit before the
       nearest paper. */
    const capacity = Math.floor((first.days * studyTime) / 30);
    const passes = topicTotal > 0 ? Math.floor(capacity / topicTotal) : 0;

    const when = new Date(`${subjectDates[extractedSubjects.find((s) => s.name === first.name)?.id ?? ""] ?? ""}T00:00:00`);
    const whenLabel = Number.isNaN(when.getTime())
      ? `in ${first.days} days`
      : `on ${when.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

    if (topicTotal === 0) {
      return `At ${studyTime} minutes a day, that's ${first.days} days of study before ${first.name} ${whenLabel}.`;
    }
    if (passes >= 2) {
      return `At ${studyTime} minutes a day, Atlas can cover all ${papers} ${paperWord} before ${first.name} ${whenLabel}, with room for ${passes === 2 ? "two" : `${passes}`} revision passes.`;
    }
    if (passes === 1) {
      return `At ${studyTime} minutes a day, Atlas can get through your ${topicTotal} topics once before ${first.name} ${whenLabel}. A little longer each day would buy you a revision pass.`;
    }
    return `${first.name} is only ${first.days} days out. At ${studyTime} minutes a day Atlas will prioritise the weakest topics — it can't cover all ${topicTotal} before then.`;
  })();

  /* Reading a photo happens entirely in the browser and can take a while,
     during which no server stage arrives — so the bar would otherwise sit
     frozen at zero. Let OCR drive the first stage's share of it. */
  const stageShare = 100 / Math.max(stages.length, 1);
  const readProgress =
    ocrPercent !== null
      ? (ocrPercent / 100) * stageShare
      : (stageIndex / Math.max(stages.length, 1)) * 100;

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
      const date = localISO();
      await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, studyTime }),
      });
    } catch {
      // proceed even if mission gen fails
    }
    /* The provider now lives at the root and holds a snapshot taken before
       any of this existed. Reload it before leaving, or the dashboard shows
       the empty state we just spent onboarding filling in. */
    await refresh();

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
                graph. You don&apos;t type anything — PDF, photo, or scan, Atlas reads it.
              </p>

              {/* Intake slot */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
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
                              {i === 0 && ocrPercent !== null ? ` ${ocrPercent}%` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <span className="mt-6 block h-1.5 w-full overflow-hidden rounded-full bg-groove">
                        <motion.span
                          className="block h-full rounded-full bg-teal"
                          animate={{ width: `${readProgress}%` }}
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

              <p className="text-[0.9rem] leading-relaxed text-ink-2">{coverage}</p>

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
