import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings — Atlas",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        pillar="Account"
        title="Settings"
        intro="What Atlas knows about you, and what it plans from. Changes here reach the next mission."
      />
      <SettingsScreen />
    </>
  );
}
