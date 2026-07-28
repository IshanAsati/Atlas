import { Suspense } from "react";
import type { Metadata } from "next";
import { CoachScreen } from "@/components/focus/CoachScreen";

export const metadata: Metadata = {
  title: "Coach — Atlas",
};

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachScreen />
    </Suspense>
  );
}
