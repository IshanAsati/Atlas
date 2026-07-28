"use client";

import { useCallback, useRef } from "react";

/**
 * A short tone at the end of a session or break.
 *
 * Synthesised rather than loaded from a file: no asset to ship, no request
 * to fail, and it works with the network down — which is the state the
 * whole app is built to survive. Two soft sine partials with a quick decay
 * so it reads as an instrument chime, not a notification bleep.
 */
type Chime = "session" | "break" | "done";

const RECIPES: Record<Chime, { notes: number[]; gap: number }> = {
  // Rising pair: something finished, something starts.
  session: { notes: [587.33, 880], gap: 0.12 },
  // Falling pair: settle down.
  break: { notes: [880, 587.33], gap: 0.12 },
  // Three rising: the whole set is done.
  done: { notes: [587.33, 739.99, 987.77], gap: 0.14 },
};

export function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback((kind: Chime) => {
    if (typeof window === "undefined") return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      ctxRef.current ??= new Ctor();
      const ctx = ctxRef.current;
      /* Browsers suspend audio until a user gesture; the timer is always
         started by one, so this resolves by the time a chime is due. */
      if (ctx.state === "suspended") void ctx.resume();

      const { notes, gap } = RECIPES[kind];
      notes.forEach((frequency, i) => {
        const at = ctx.currentTime + i * gap;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, at);

        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.16, at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);

        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.45);
      });
    } catch {
      /* Audio blocked or unavailable — the timer still works silently. */
    }
  }, []);
}
