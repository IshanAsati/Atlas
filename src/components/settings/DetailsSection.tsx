"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Key } from "@/components/ui/Key";
import { Micro } from "@/components/ui/Panel";
import { SkeletonLines } from "@/components/ui/States";
import { useAtlasData } from "@/lib/atlas-context";
import { Field, Notice, SettingsSection, fieldClass } from "./SettingsSection";

/* The same ladder onboarding offers, so the number a student picked on
   day one is still one tap away here. */
const PRESETS = [45, 60, 90, 120, 150];

type SaveState = "idle" | "saving" | "saved" | "error";

/** Only the fields the student has actually touched. */
interface Draft {
  name?: string;
  grade?: string;
  studyTime?: number;
}

export function DetailsSection() {
  const { student, loading, refresh } = useAtlasData();
  const ids = useId();

  /* The profile arrives after first paint. Copying it into form state
     would mean a setState inside an effect, so the inputs are derived:
     an edit wins, otherwise the saved value shows. Nothing to sync. */
  const [draft, setDraft] = useState<Draft>({});
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const name = draft.name ?? student?.name ?? "";
  const grade = draft.grade ?? student?.grade ?? "";
  const studyTime = draft.studyTime ?? student?.studyTime ?? 120;

  const edit = (patch: Draft) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    /* A stale "Saved" beside a changed field is a lie. */
    setState("idle");
    setError(null);
  };

  const dirty =
    !!student &&
    (name !== student.name || grade !== student.grade || studyTime !== student.studyTime);

  const handleSave = async () => {
    if (!dirty || state === "saving") return;
    setState("saving");
    setError(null);

    try {
      const response = await fetch("/api/student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), grade: grade.trim(), studyTime }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setError(body?.error ?? "Atlas couldn't save your details. Try again in a moment.");
        return;
      }

      /* Reload before clearing the draft, or the inputs fall back to the
         profile the provider is still holding from before the save. */
      await refresh();
      setDraft({});
      setState("saved");
    } catch {
      setState("error");
      setError("Lost the connection while saving. Check your network and try again.");
    }
  };

  if (loading && !student) {
    return (
      <SettingsSection
        eyebrow="Plan"
        title="Your details"
        description="The name Atlas greets you with, the class you're in, and how long you sit on a normal day."
      >
        <SkeletonLines rows={4} />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      eyebrow="Plan"
      title="Your details"
      description="The name Atlas greets you with, the class you're in, and how long you sit on a normal day. Study time is the budget every mission is planned against."
    >
      {!student ? (
        <Notice tone="error">
          Atlas couldn&apos;t load your profile. Reload the page, and log in again if it stays empty.
        </Notice>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${ids}-name`} label="Name">
              <input
                id={`${ids}-name`}
                type="text"
                autoComplete="name"
                value={name}
                maxLength={60}
                onChange={(e) => edit({ name: e.target.value })}
                disabled={state === "saving"}
                placeholder="Aarush"
                className={fieldClass}
              />
            </Field>

            <Field id={`${ids}-grade`} label="Grade" hint="Shown under the greeting on your dashboard.">
              <input
                id={`${ids}-grade`}
                type="text"
                value={grade}
                maxLength={60}
                onChange={(e) => edit({ grade: e.target.value })}
                disabled={state === "saving"}
                placeholder="Class 10 · CBSE"
                className={fieldClass}
              />
            </Field>
          </div>

          <fieldset className="min-w-0">
            <legend className="micro text-ink-2">Daily study time</legend>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="readout text-[2.6rem] font-bold leading-none tracking-[-0.03em] text-ink">
                {studyTime}
              </span>
              <Micro>minutes a day</Micro>
            </div>

            <div className="mt-4 flex gap-2 rounded-bay bg-linear-145 from-base-lo to-base-hi p-2 shadow-inset">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => edit({ studyTime: value })}
                  aria-pressed={value === studyTime}
                  disabled={state === "saving"}
                  className={cn(
                    "readout flex-1 rounded-key py-3 text-[0.8rem] font-semibold transition-all duration-200",
                    "ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50",
                    value === studyTime
                      ? "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised"
                      : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <Key tone="primary" onClick={handleSave} disabled={!dirty || state === "saving"}>
              {state === "saving" ? "Saving…" : "Save changes"}
            </Key>
            {state === "saved" ? (
              <Notice tone="success" className="flex-1 min-w-[14rem]">
                Saved. Tomorrow&apos;s mission is planned against {studyTime} minutes.
              </Notice>
            ) : null}
            {state === "error" && error ? (
              <Notice tone="error" className="flex-1 min-w-[14rem]">
                {error}
              </Notice>
            ) : null}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
