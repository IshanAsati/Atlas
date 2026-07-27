import type { Metadata } from "next";
import { FocusConsole } from "@/components/focus/FocusConsole";

export const metadata: Metadata = {
  title: "Focus — Atlas",
};

/** Deliberately outside the shell layout: no rail, nothing to click away to. */
export default function FocusPage() {
  return <FocusConsole />;
}
