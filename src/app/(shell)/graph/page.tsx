import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { LearningGraph } from "@/components/graph/LearningGraph";

export const metadata: Metadata = {
  title: "Learning graph — Atlas",
};

export default function GraphPage() {
  return (
    <>
      <PageHeader
        pillar="Track"
        title="Learning graph"
        intro="Your syllabus as a structure rather than a list. Confidence is measured, not self-reported — pick any topic to revise it now."
      />
      <LearningGraph />
    </>
  );
}
