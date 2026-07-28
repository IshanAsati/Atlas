"use client";

import { useId, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Panel, Micro } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

const field = cn(
  "w-full rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3",
  "text-[0.9rem] text-ink shadow-inset outline-none placeholder:text-ink-3",
  "disabled:opacity-60",
);

export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = useId();

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel depth="raised" radius="bay" className="w-full max-w-[400px] p-7 sm:p-8">
      <h2 className="font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
        {isLogin ? "Welcome back" : "Create your account"}
      </h2>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">
        {isLogin
          ? "Your syllabus, missions and confidence scores are waiting."
          : "One account. Your progress follows you to any device."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!isLogin && (
          <div>
            <label htmlFor={`${ids}-name`} className="micro text-ink-2">
              Name
            </label>
            <input
              id={`${ids}-name`}
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={busy}
              placeholder="Aarush"
              className={cn(field, "mt-1.5")}
            />
          </div>
        )}

        <div>
          <label htmlFor={`${ids}-email`} className="micro text-ink-2">
            Email
          </label>
          <input
            id={`${ids}-email`}
            name="email"
            type="email"
            autoComplete={isLogin ? "username" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${ids}-error` : undefined}
            placeholder="you@example.com"
            className={cn(field, "mt-1.5")}
          />
        </div>

        <div>
          <label htmlFor={`${ids}-password`} className="micro text-ink-2">
            Password
          </label>
          <input
            id={`${ids}-password`}
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${ids}-error` : undefined}
            placeholder="At least 8 characters"
            className={cn(field, "mt-1.5")}
          />
        </div>

        {/* Errors say what happened and what to do, at a size you can read. */}
        {error && (
          <p
            id={`${ids}-error`}
            role="alert"
            className="flex items-start gap-2 rounded-key bg-amber-wash/70 px-3.5 py-2.5 text-[0.8rem] leading-snug text-amber-deep"
          >
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={cn(
            "w-full rounded-key px-4 py-3.5 text-[0.9rem] font-medium transition-all duration-200",
            "ease-[cubic-bezier(0.22,1,0.36,1)]",
            "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised",
            "hover:shadow-raised-lg active:shadow-pressed active:translate-y-px",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {busy ? (isLogin ? "Logging in…" : "Creating account…") : isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      <Micro className="mt-6 block text-center text-ink-3">
        {isLogin ? "No account? " : "Already have one? "}
        <button
          type="button"
          onClick={() => setMode(isLogin ? "register" : "login")}
          className="text-teal-deep underline underline-offset-4"
        >
          {isLogin ? "Create one" : "Log in"}
        </button>
      </Micro>
    </Panel>
  );
}
