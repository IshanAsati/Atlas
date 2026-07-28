import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { TodayMission } from "@/components/dashboard/TodayMission";
import { CoachDock } from "@/components/dashboard/CoachDock";
import { RevisionQueue } from "@/components/dashboard/RevisionQueue";
import { ExamTimeline } from "@/components/dashboard/ExamTimeline";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />

      <TodayMission />

      {/* The coach sits between the plan and the tracking panels — you read
          what to study, and it is already asking you about it. */}
      <section className="grid gap-6 lg:grid-cols-2">
        <CoachDock />
        <RevisionQueue />
      </section>

      <ExamTimeline />
    </div>
  );
}
