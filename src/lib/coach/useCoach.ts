"use client";

import { useCallback, useRef, useState } from "react";
import { applyConfidenceDelta, useTopicConfidence } from "@/lib/liveConfidence";
import { SENTINEL } from "./types";
/** Cut the machine-readable tail off a reply. */
function stripSentinel(text: string): string {
  const at = text.indexOf(SENTINEL);
  return at === -1 ? text : text.slice(0, at);
}

import type {
  CoachAction,
  CoachContext,
  CoachFrame,
  CoachQuestion,
  CoachTurn,
} from "./types";

export type CoachStatus = "idle" | "thinking" | "streaming" | "error";
export type CoachSource = "live" | "offline" | null;

interface UseCoachOptions {
  context: CoachContext;
  /** Seed turns so the panel isn't empty on arrival. */
  initialTurns?: CoachTurn[];
  initialQuestion?: CoachQuestion | null;
}

/**
 * Owns the coaching thread and the student's live confidence in this topic.
 * Confidence starts at the stored value and moves with each evaluation —
 * that number driving the meter on screen is the whole point of the panel.
 */
export function useCoach({ context, initialTurns = [], initialQuestion = null }: UseCoachOptions) {
  const [turns, setTurns] = useState<CoachTurn[]>(initialTurns);
  const [streamed, setStreamed] = useState("");
  const [status, setStatus] = useState<CoachStatus>("idle");
  const [source, setSource] = useState<CoachSource>(null);
  const [question, setQuestion] = useState<CoachQuestion | null>(initialQuestion);
  const [actions, setActions] = useState<CoachAction[]>([]);
  /* Confidence is not local state — it lives in the shared store so the
     learning graph and the dashboard show the same number this panel does. */
  const confidence = useTopicConfidence(context.topicId, context.confidence);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abort = useRef<AbortController | null>(null);

  const clearActions = useCallback(() => setActions([]), []);

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || status === "thinking" || status === "streaming") return;

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      const nextTurns: CoachTurn[] = [...turns, { role: "student", body: text }];
      setTurns(nextTurns);
      setQuestion(null);
      setStreamed("");
      setActions([]);
      setError(null);
      setLastDelta(null);
      setStatus("thinking");

      let reply = "";
      let misconception: string | null = null;

      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: { ...context, confidence },
            turns: nextTurns,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Coach returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let frame: CoachFrame;
            try {
              frame = JSON.parse(line) as CoachFrame;
            } catch {
              continue;
            }

            if (frame.type === "source") {
              setSource(frame.value);
            } else if (frame.type === "token") {
              reply += frame.text;
              setStatus("streaming");
              /* Belt and braces: the sentinel and everything after it is for
                 the machine. If a server path ever forgets to strip it, it
                 still never reaches the screen. */
              setStreamed(stripSentinel(reply));
            } else if (frame.type === "tool_call") {
              setStatus("thinking");
            } else if (frame.type === "action") {
              setActions((prev) => [...prev, frame.action]);
            } else if (frame.type === "result") {
              misconception = frame.result.misconception;
              setQuestion(frame.result.nextQuestion);
              if (frame.result.confidenceDelta !== 0) {
                setLastDelta(frame.result.confidenceDelta);
                applyConfidenceDelta(context.topicId, frame.result.confidenceDelta);
              }
              if (frame.result.actions.length > 0) {
                setActions((prev) => [...prev, ...frame.result.actions]);
              }
            } else if (frame.type === "error") {
              throw new Error(frame.message);
            }
          }
        }

        const finalBody = stripSentinel(reply).trim();
        if (!finalBody) throw new Error("The coach sent an empty reply.");

        setTurns([...nextTurns, { role: "coach", body: finalBody, misconception }]);
        setStreamed("");
        setStatus("idle");
      } catch (caught) {
        if (controller.signal.aborted) return;
        setStreamed("");
        setStatus("error");
        setError(
          caught instanceof Error && caught.message.includes("Failed to fetch")
            ? "Couldn't reach the coach. Your session is still running — try again."
            : "The coach didn't answer that one. Try rephrasing it.",
        );
      }
    },
    [confidence, context, status, turns],
  );

  const retry = useCallback(() => {
    const lastStudent = [...turns].reverse().find((t) => t.role === "student");
    if (!lastStudent) return;
    setTurns((current) => current.slice(0, current.lastIndexOf(lastStudent)));
    void send(lastStudent.body);
  }, [send, turns]);

  return {
    turns,
    streamed,
    status,
    source,
    question,
    actions,
    confidence,
    lastDelta,
    error,
    send,
    retry,
    clearActions,
    busy: status === "thinking" || status === "streaming",
  };
}
