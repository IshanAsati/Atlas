"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Key } from "@/components/ui/Key";
import { Micro } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/States";
import { useAuth } from "@/lib/auth/AuthContext";
import { Notice, SettingsSection } from "./SettingsSection";

export function AccountSection() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const handleLogout = async () => {
    setLeaving(true);
    /* Wait for the session cookie to be cleared before navigating, or the
       proxy still sees it and lets the next page straight through. */
    await logout();
    router.push("/welcome");
  };

  return (
    <SettingsSection
      eyebrow="Account"
      title="Account"
      description="The account your syllabus, missions and confidence scores are saved to."
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <Micro className="block">Signed in as</Micro>
          {loading && !user ? (
            <Skeleton className="mt-2.5 h-4 w-48" radius="rounded-key" />
          ) : user ? (
            <p className="readout mt-2 break-all text-[0.95rem] font-medium text-ink">
              {user.email}
            </p>
          ) : (
            <p className="mt-2 text-[0.9rem] text-ink-2">No one — your session has ended.</p>
          )}
          {user?.name ? (
            <p className="mt-1.5 text-[0.82rem] text-ink-2">{user.name}</p>
          ) : null}
        </div>

        <Key onClick={() => void handleLogout()} disabled={leaving}>
          {leaving ? "Logging out…" : "Log out"}
        </Key>
      </div>

      {!loading && !user ? (
        <Notice tone="error" className="mt-5">
          Your session has ended. Log in again to get your syllabus and missions back.
        </Notice>
      ) : null}
    </SettingsSection>
  );
}
