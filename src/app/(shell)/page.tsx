import { TodayMission } from "@/components/dashboard/TodayMission";
import { RevisionQueue } from "@/components/dashboard/RevisionQueue";
import { ExamTimeline } from "@/components/dashboard/ExamTimeline";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-1">
        <p className="font-display text-[1.05rem] font-medium tracking-[-0.01em] text-ink-2">
          Morning, Aarush.
        </p>
        <p className="micro text-ink-3">Class 10 · CBSE</p>
      </div>

      <TodayMission />

      <section className="grid gap-6 lg:grid-cols-2">
        <RevisionQueue />
        <ExamTimeline />
      </section>
    </div>
  );
}
