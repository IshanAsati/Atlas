import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = {
  title: "Set up — Atlas",
};

/** Outside the shell: there is nothing to navigate to until setup is done. */
export default function OnboardingPage() {
  return <Onboarding />;
}
