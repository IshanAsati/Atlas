"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

const SESSION_KEY = "atlas-session";

function getStoredSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function storeSession(token: string) {
  localStorage.setItem(SESSION_KEY, token);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Verify stored session on mount
  useEffect(() => {
    mounted.current = true;
    const token = getStoredSession();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted.current && data?.user) setUser(data.user);
        else clearSession();
      })
      .catch(() => clearSession())
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      setError(data.error ?? "Login failed.");
      return;
    }
    storeSession(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      return;
    }
    // Auto-login after registration
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}
