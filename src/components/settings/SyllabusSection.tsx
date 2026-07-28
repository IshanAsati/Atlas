"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Micro } from "@/components/ui/Panel";
import { EmptyBay, SkeletonLines } from "@/components/ui/States";
import { CheckIcon, UploadIcon } from "@/components/ui/Icons";
import { useAtlasData } from "@/lib/atlas-context";
import { Notice, SettingsSection } from "./SettingsSection";

const accentVar: Record<string, string> = {
  teal: "var(--color-teal)",
  amber: "var(--color-amber)",
  rust: "var(--color-rust)",
};

const INITIAL_STAGES = [
  "Reading your syllabus...",
  "Finding units and chapters",
  "Matching exam dates",
  "Building your topic graph",
];

/** What the confirm-then-do control is currently armed against. */
type Pending = { kind: "all" } | { kind: "subject"; id: string; name: string } | null;

export function SyllabusSection() {
  const { subjects, topics, loading, refresh } = useAtlasData();
  const reduce = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<Pending>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);

  const [reading, setReading] = useState(false);
  const [stages, setStages] = useState<string[]>(INITIAL_STAGES);
  const [stageIndex, setStageIndex] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractDone, setExtractDone] = useState<string | null>(null);

  /* One row per subject, carrying the topics extracted under it. There is
     no documents collection — the subjects on the account are the record
     of what was uploaded, so this is the honest count. */
  const documents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const topic of topics) {
      counts.set(topic.subjectId, (counts.get(topic.subjectId) ?? 0) + 1);
    }
    return subjects.map((subject) => ({
      ...subject,
      topicCount: counts.get(subject.id) ?? 0,
    }));
  }, [subjects, topics]);

  const totalTopics = topics.length;
  const triggerFile = () => fileInputRef.current?.click();

  const clearNotices = () => {
    setRemoveError(null);
    setRemoved(null);
    setExtractError(null);
    setExtractDone(null);
  };

  /* ---------------------------------------------------------------- */
  /* Removal                                                          */
  /* ---------------------------------------------------------------- */

  const handleRemove = async () => {
    if (!pending || removing) return;
    const target = pending;
    setRemoving(true);
    clearNotices();

    try {
      const query = target.kind === "subject" ? `?subjectId=${encodeURIComponent(target.id)}` : "";
      const response = await fetch(`/api/documents${query}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; subjects?: number; topics?: number }
        | null;

      if (!response.ok) {
        setRemoveError(
          body?.error ?? "Atlas couldn't remove that. Try again in a moment.",
        );
        return;
      }

      await refresh();
      setPending(null);
      setRemoved(
        target.kind === "subject"
          ? `Removed ${target.name} and its ${body?.topics ?? 0} ${(body?.topics ?? 0) === 1 ? "topic" : "topics"}.`
          : `Removed ${body?.subjects ?? 0} ${(body?.subjects ?? 0) === 1 ? "subject" : "subjects"} and ${body?.topics ?? 0} ${(body?.topics ?? 0) === 1 ? "topic" : "topics"}. Upload a syllabus to start again.`,
      );
    } catch {
      setRemoveError("Lost the connection while removing. Check your network and try again.");
    } finally {
      setRemoving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Replacement — same NDJSON contract onboarding reads               */
  /* ---------------------------------------------------------------- */

  const handleFile = async (file: File) => {
    setReading(true);
    setPending(null);
    clearNotices();
    setStages(INITIAL_STAGES);
    setStageIndex(0);

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
      let seen = 0;
      let resultSubjects: unknown[] | null = null;
      let resultTopics = 0;
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
              /* The server names its own stages as it reaches them, so the
                 four placeholders are overwritten in order and anything
                 past them is appended rather than dropped. */
              const at = seen;
              seen += 1;
              setStages((prev) => {
                const next = [...prev];
                if (at < next.length) next[at] = frame.text;
                else next.push(frame.text);
                return next;
              });
              setStageIndex(seen);
            }
            if (frame.type === "error") {
              failure = frame.message ?? "Extraction failed.";
            }
            if (frame.type === "result" && frame.subjects) {
              resultSubjects = frame.subjects as unknown[];
              resultTopics = Array.isArray(frame.topics) ? frame.topics.length : 0;
            }
          } catch {
            /* partial frame */
          }
        }
      }

      if (failure) {
        setReading(false);
        setExtractError(failure);
        return;
      }

      if (!resultSubjects || resultSubjects.length === 0) {
        setReading(false);
        setExtractError("Atlas didn't find any subjects in that file. Try a different PDF.");
        return;
      }

      /* Extraction replaces the syllabus server-side, so the rest of the
         app is now holding subjects that no longer exist. */
      await refresh();
      setReading(false);
      setExtractDone(
        `Syllabus replaced — ${resultSubjects.length} ${resultSubjects.length === 1 ? "subject" : "subjects"}, ${resultTopics} ${resultTopics === 1 ? "topic" : "topics"}. Check the exam dates below.`,
      );
    } catch {
      setReading(false);
      setExtractError("Lost the connection while reading. Check your network and try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    /* Clear the value or picking the same file twice fires no change
       event, and "Try another file" silently does nothing. */
    e.target.value = "";
    if (file) void handleFile(file);
  };

  /* ---------------------------------------------------------------- */

  return (
    <SettingsSection
      eyebrow="Track"
      title="Your syllabus"
      description="Atlas doesn't keep the PDF — it keeps what it read out of it. These are the subjects every mission, revision queue and graph is built from."
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      <AnimatePresence mode="wait">
        {reading ? (
          <motion.div
            key="reading"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="rounded-bay bg-linear-145 from-base-lo to-base-hi p-6 shadow-inset-deep"
            role="status"
            aria-busy="true"
          >
            <ul className="space-y-3">
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
          </motion.div>
        ) : loading && documents.length === 0 ? (
          <SkeletonLines key="loading" rows={4} />
        ) : documents.length === 0 ? (
          <EmptyBay
            key="empty"
            eyebrow="No syllabus"
            title="Nothing extracted yet."
            body="Drop a text-based PDF and Atlas reads the units, finds your exam dates and builds the topic graph."
            actionLabel="Upload a syllabus"
            onAction={triggerFile}
          />
        ) : (
          <motion.div
            key="list"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div className="flex items-baseline justify-between gap-4">
              <Micro>
                {documents.length} {documents.length === 1 ? "subject" : "subjects"} ·{" "}
                {totalTopics} {totalTopics === 1 ? "topic" : "topics"}
              </Micro>
              <Micro className="text-ink-2">Exam date</Micro>
            </div>

            <ul className="divide-y divide-hairline rounded-panel bg-linear-145 from-base-lo to-base-hi px-1 shadow-inset">
              {documents.map((doc) => {
                const armed = pending?.kind === "subject" && pending.id === doc.id;
                return (
                  <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: accentVar[doc.accent] ?? "var(--color-teal)" }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.95rem] font-medium text-ink">
                          {doc.name}
                        </span>
                        <Micro className="mt-1 block">
                          {doc.discipline} · {doc.topicCount}{" "}
                          {doc.topicCount === 1 ? "topic" : "topics"}
                        </Micro>
                      </span>
                    </span>

                    <span className="readout text-[0.72rem] font-medium text-ink-2">
                      {formatDate(doc.examDate)}
                    </span>

                    {armed ? (
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRemove()}
                          disabled={removing}
                          className="micro text-amber-deep underline underline-offset-4 disabled:opacity-50"
                        >
                          {removing ? "Removing…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPending(null)}
                          disabled={removing}
                          className="micro text-ink-3 underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
                        >
                          Keep it
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          clearNotices();
                          setPending({ kind: "subject", id: doc.id, name: doc.name });
                        }}
                        disabled={removing || reading}
                        className="micro text-ink-3 underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {extractError ? (
        <div className="mt-5">
          <Notice tone="error">{extractError}</Notice>
          <button
            type="button"
            onClick={triggerFile}
            className="micro mt-3 ml-4 text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Try another file
          </button>
        </div>
      ) : null}

      {extractDone ? (
        <Notice tone="success" className="mt-5">
          {extractDone}
        </Notice>
      ) : null}

      {removeError ? (
        <Notice tone="error" className="mt-5">
          {removeError}
        </Notice>
      ) : null}

      {removed ? (
        <Notice tone="success" className="mt-5">
          {removed}
        </Notice>
      ) : null}

      {!reading ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Key
            tone="primary"
            onClick={triggerFile}
            disabled={removing}
            icon={<UploadIcon width={16} height={16} />}
          >
            {documents.length === 0 ? "Upload a syllabus" : "Replace syllabus"}
          </Key>

          {documents.length > 0 ? (
            pending?.kind === "all" ? (
              <span className="flex flex-wrap items-center gap-3">
                <Key onClick={() => void handleRemove()} disabled={removing}>
                  {removing ? "Removing…" : "Yes, remove everything"}
                </Key>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={removing}
                  className="micro text-ink-3 underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <Key
                tone="quiet"
                onClick={() => {
                  clearNotices();
                  setPending({ kind: "all" });
                }}
                disabled={removing}
              >
                Remove all subjects
              </Key>
            )
          ) : null}
        </div>
      ) : null}

      {pending?.kind === "all" ? (
        <p className="mt-4 text-[0.82rem] leading-relaxed text-ink-2">
          This deletes all {documents.length} subjects and {totalTopics} topics, along with the
          confidence scores on them. Your missions and study history stay. There is no undo —
          you&apos;d have to upload the syllabus again.
        </p>
      ) : null}

      <p className="mt-5 text-[0.8rem] leading-relaxed text-ink-3">
        Replacing the syllabus clears the current subjects and topics before saving the new ones.
        A scanned photo won&apos;t work — Atlas needs a PDF with real text in it.
      </p>
    </SettingsSection>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
