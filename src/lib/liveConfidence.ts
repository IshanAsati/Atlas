"use client";

import { useSyncExternalStore } from "react";
import { topics as seedTopics } from "@/lib/mock";

/**
 * Confidence changes made by the coach, layered over the seed data.
 *
 * Without this the demo tells a lie: you answer wrong in Focus Mode, the
 * coach drops your confidence, and the learning graph carries on showing the
 * old number. The whole "Atlas keeps a model of your mind" claim rests on
 * that number being the same number everywhere.
 *
 * Session-scoped on purpose — reload and you're back to the seed, so a demo
 * always starts from a known state.
 */

const KEY = "atlas-confidence";

let overrides: Record<string, number> = {};
let hydrated = false;
const listeners = new Set<() => void>();
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) overrides = JSON.parse(stored) as Record<string, number>;
  } catch {
    overrides = {};
  }
}

function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(overrides));
  } catch {
    /* storage unavailable — the values still hold for this page */
  }
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Apply a delta from an evaluation and tell everyone reading this topic. */
export function applyConfidenceDelta(topicId: string, delta: number) {
  if (!delta || !topicId) return;
  hydrate();
  const seed = seedTopics.find((t) => t.id === topicId)?.confidence ?? 0;
  const current = overrides[topicId] ?? seed;
  const clamped = Math.max(0, Math.min(100, current + delta));
  overrides = { ...overrides, [topicId]: clamped };
  persist();
  listeners.forEach((fn) => fn());

  /* Coalesce rapid coach turns into a single PATCH per topic. Without
     debouncing, every coach reply triggers a fetch. */
  const existing = pendingSaves.get(topicId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingSaves.delete(topicId);
    fetch(`/api/topics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, confidence: clamped }),
    }).catch(() => { /* offline — sessionStorage still holds the value */ });
  }, 250);
  pendingSaves.set(topicId, timer);
}

export function resetConfidence() {
  overrides = {};
  persist();
  listeners.forEach((fn) => fn());
}

function snapshotFor(topicId: string, fallback: number) {
  hydrate();
  return overrides[topicId] ?? fallback;
}

/** Live confidence for one topic. */
export function useTopicConfidence(topicId: string, fallback: number) {
  return useSyncExternalStore(
    subscribe,
    () => snapshotFor(topicId, fallback),
    () => fallback,
  );
}

/**
 * Every topic with the coach's changes applied. The identity of the returned
 * array is stable between updates so useSyncExternalStore stays happy.
 */
let cachedFrom: Record<string, number> | null = null;
let cachedTopics = seedTopics;

function allSnapshot() {
  hydrate();
  if (cachedFrom !== overrides) {
    cachedFrom = overrides;
    cachedTopics = seedTopics.map((topic) =>
      topic.id in overrides ? { ...topic, confidence: overrides[topic.id] } : topic,
    );
  }
  return cachedTopics;
}

export function useLiveTopics() {
  return useSyncExternalStore(subscribe, allSnapshot, () => seedTopics);
}
