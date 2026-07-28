"use client";

import { AccountSection } from "./AccountSection";
import { DetailsSection } from "./DetailsSection";
import { SyllabusSection } from "./SyllabusSection";

/**
 * Settings, in the order a student thinks about them: who Atlas thinks
 * they are, which account that is saved to, and what it plans from.
 */
export function SettingsScreen() {
  return (
    <div className="space-y-6">
      <DetailsSection />
      <AccountSection />
      <SyllabusSection />
    </div>
  );
}
