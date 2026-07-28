import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { TodayMission } from "@/components/dashboard/TodayMission";
import { RevisionQueue } from "@/components/dashboard/RevisionQueue";
import { ExamTimeline } from "@/components/dashboard/ExamTimeline";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />

      <TodayMission />

      <section className="grid gap-6 lg:grid-cols-2">
        <RevisionQueue />
        <ExamTimeline />
      </section>
    </div>
  );
}
