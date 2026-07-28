"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Panel, Micro } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      await login(email, password);
    } else {
      await register(email, password, name);
    }
    setBusy(false);
    onDone?.();
  };

  return (
    <Panel depth="raised" radius="bay" className="w-full max-w-[400px] p-8">
      <h2 className="font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>
      <Micro className="mt-2">
        {mode === "login" ? "Log in to continue your studies." : "One account. All your data follows you."}
      </Micro>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label className="micro text-ink-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Aarush"
              className="mt-1 w-full rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3 text-[0.9rem] text-ink shadow-inset outline-none placeholder:text-ink-3"
            />
          </div>
        )}
        <div>
          <label className="micro text-ink-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3 text-[0.9rem] text-ink shadow-inset outline-none placeholder:text-ink-3"
          />
        </div>
        <div>
          <label className="micro text-ink-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-key bg-linear-145 from-base-lo to-base-hi px-4 py-3 text-[0.9rem] text-ink shadow-inset outline-none placeholder:text-ink-3"
          />
        </div>

        {error && (
          <Micro className="text-amber-deep">{error}</Micro>
        )}

        <button
          type="submit"
          disabled={busy}
          className={cn(
            "w-full rounded-key px-4 py-3 text-[0.9rem] font-medium transition-all",
            "bg-linear-145 from-base-hi to-base-lo text-teal-deep shadow-raised",
            "active:shadow-pressed active:translate-y-px",
            "disabled:opacity-50",
          )}
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <Micro className="mt-6 text-center text-ink-3">
        {mode === "login" ? (
          <>
            No account?{" "}
            <button type="button" onClick={() => setMode("register")} className="text-teal-deep underline">
              Create one
            </button>
          </>
        ) : (
          <>
            Already have one?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-teal-deep underline">
              Log in
            </button>
          </>
        )}
      </Micro>
    </Panel>
  );
}
