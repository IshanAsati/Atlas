import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";

export const metadata: Metadata = {
  title: "Calendar — Atlas",
};

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        pillar="Plan"
        title="Calendar"
        intro="Every mission you've finished and every session Atlas has already scheduled, against the papers you're sitting."
      />
      <CalendarBoard />
    </>
  );
}
