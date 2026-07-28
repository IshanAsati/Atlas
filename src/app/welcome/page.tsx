import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Atlas — your second mind",
  description:
    "Atlas holds a confidence score for every topic in your syllabus, watches it decay, and coaches you Socratically until it moves.",
};

/** Outside the shell: no rail, no session required. */
export default function WelcomePage() {
  return <Landing />;
}
