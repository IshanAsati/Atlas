/**
 * Placeholder data shaped like the Supabase schema in the PRD (§8).
 * Every field here maps to a real column so swapping in the API later
 * is a change of source, not a change of shape.
 */

export type TopicStatus = "strong" | "steady" | "fading" | "untouched";

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  /** 0–100, the `confidence` column */
  confidence: number;
  /** `next_review` — ISO date */
  nextReview: string;
  /** Days since the topic was last studied, used to explain decay */
  lastSeenDays: number;
}

export interface Subject {
  id: string;
  name: string;
  /** Parent discipline, used by the learning graph hierarchy */
  discipline: string;
  /** `exam_date` */
  examDate: string;
  accent: "teal" | "amber" | "rust";
}

export type TaskStatus = "complete" | "active" | "pending";

export interface MissionTask {
  id: string;
  topicId: string;
  topic: string;
  subject: string;
  /** Why the planner chose this task — surfaced verbatim in the UI */
  reason: string;
  minutes: number;
  status: TaskStatus;
  kind: "revise" | "learn" | "quiz";
}

export const TODAY = new Date("2026-07-27T08:00:00");

export const student = {
  name: "Aarush",
  grade: "Class 10 · CBSE",
  /** `study_time` in minutes/day */
  studyTime: 120,
  /** `momentum`, 0–100 */
  momentum: 74,
  momentumDelta: -6,
  xp: 8420,
  xpToNextLevel: 1580,
  level: 12,
  missionsCompleted: 63,
  missionsAttempted: 81,
};

export const subjects: Subject[] = [
  { id: "s1", name: "Physics", discipline: "Science", examDate: "2026-08-14", accent: "rust" },
  { id: "s2", name: "Chemistry", discipline: "Science", examDate: "2026-08-18", accent: "amber" },
  { id: "s3", name: "Biology", discipline: "Science", examDate: "2026-08-21", accent: "teal" },
  { id: "s4", name: "Mathematics Standard", discipline: "Mathematics", examDate: "2026-08-26", accent: "teal" },
];

export const topics: Topic[] = [
  { id: "t1", subjectId: "s1", name: "Electricity", confidence: 90, nextReview: "2026-08-04", lastSeenDays: 2 },
  { id: "t2", subjectId: "s1", name: "Light — Reflection", confidence: 65, nextReview: "2026-07-29", lastSeenDays: 6 },
  { id: "t3", subjectId: "s1", name: "Magnetic Effects", confidence: 30, nextReview: "2026-07-27", lastSeenDays: 11 },
  { id: "t4", subjectId: "s1", name: "Sources of Energy", confidence: 0, nextReview: "2026-07-28", lastSeenDays: 0 },
  { id: "t5", subjectId: "s2", name: "Acids, Bases & Salts", confidence: 78, nextReview: "2026-08-02", lastSeenDays: 3 },
  { id: "t6", subjectId: "s2", name: "Carbon Compounds", confidence: 44, nextReview: "2026-07-27", lastSeenDays: 9 },
  { id: "t7", subjectId: "s2", name: "Periodic Classification", confidence: 61, nextReview: "2026-07-31", lastSeenDays: 5 },
  { id: "t8", subjectId: "s3", name: "Life Processes", confidence: 82, nextReview: "2026-08-06", lastSeenDays: 1 },
  { id: "t9", subjectId: "s3", name: "Heredity", confidence: 55, nextReview: "2026-07-30", lastSeenDays: 7 },
  { id: "t10", subjectId: "s4", name: "Quadratic Equations", confidence: 88, nextReview: "2026-08-05", lastSeenDays: 2 },
  { id: "t11", subjectId: "s4", name: "Trigonometry", confidence: 37, nextReview: "2026-07-27", lastSeenDays: 10 },
  { id: "t12", subjectId: "s4", name: "Surface Areas & Volumes", confidence: 0, nextReview: "2026-08-01", lastSeenDays: 0 },
];

export const mission = {
  id: "m-2026-07-27",
  date: "2026-07-27",
  totalMinutes: 118,
  tasks: [
    {
      id: "mt1",
      topicId: "t3",
      topic: "Magnetic Effects",
      subject: "Physics",
      reason: "Confidence fell to 30% and the Physics paper is 18 days out.",
      minutes: 40,
      status: "active",
      kind: "revise",
    },
    {
      id: "mt2",
      topicId: "t11",
      topic: "Trigonometry",
      subject: "Mathematics",
      reason: "Ten days untouched. Identities decay fastest.",
      minutes: 35,
      status: "pending",
      kind: "revise",
    },
    {
      id: "mt3",
      topicId: "t6",
      topic: "Carbon Compounds",
      subject: "Chemistry",
      reason: "You missed 3 of 5 nomenclature questions on Thursday.",
      minutes: 28,
      status: "pending",
      kind: "quiz",
    },
    {
      id: "mt4",
      topicId: "t2",
      topic: "Light — Reflection",
      subject: "Physics",
      reason: "Scheduled review lands today. Short top-up only.",
      minutes: 15,
      status: "complete",
      kind: "revise",
    },
  ] satisfies MissionTask[],
};

/** Momentum over the last 14 days — drives the trend well on Progress. */
export const momentumHistory = [
  62, 68, 71, 75, 79, 82, 80, 74, 66, 70, 77, 81, 80, 74,
];

/** Minutes studied per weekday, most recent week */
export const weeklyMinutes = [
  { day: "M", minutes: 105 },
  { day: "T", minutes: 130 },
  { day: "W", minutes: 0 },
  { day: "T", minutes: 88 },
  { day: "F", minutes: 122 },
  { day: "S", minutes: 165 },
  { day: "S", minutes: 74 },
];

/** Days with recorded activity, for the calendar grid */
export const calendarDays: Record<
  string,
  { state: "complete" | "partial" | "missed" | "planned"; minutes?: number }
> = {
  "2026-07-06": { state: "complete", minutes: 120 },
  "2026-07-07": { state: "complete", minutes: 135 },
  "2026-07-08": { state: "partial", minutes: 45 },
  "2026-07-09": { state: "complete", minutes: 110 },
  "2026-07-10": { state: "missed" },
  "2026-07-11": { state: "complete", minutes: 160 },
  "2026-07-12": { state: "complete", minutes: 95 },
  "2026-07-13": { state: "complete", minutes: 120 },
  "2026-07-14": { state: "partial", minutes: 60 },
  "2026-07-15": { state: "complete", minutes: 128 },
  "2026-07-16": { state: "missed" },
  "2026-07-17": { state: "complete", minutes: 118 },
  "2026-07-18": { state: "complete", minutes: 142 },
  "2026-07-19": { state: "complete", minutes: 90 },
  "2026-07-20": { state: "complete", minutes: 105 },
  "2026-07-21": { state: "complete", minutes: 130 },
  "2026-07-22": { state: "missed" },
  "2026-07-23": { state: "partial", minutes: 55 },
  "2026-07-24": { state: "complete", minutes: 122 },
  "2026-07-25": { state: "complete", minutes: 165 },
  "2026-07-26": { state: "complete", minutes: 74 },
  "2026-07-28": { state: "planned", minutes: 120 },
  "2026-07-29": { state: "planned", minutes: 120 },
  "2026-07-30": { state: "planned", minutes: 120 },
  "2026-07-31": { state: "planned", minutes: 120 },
  "2026-08-01": { state: "planned", minutes: 90 },
  "2026-08-03": { state: "planned", minutes: 120 },
  "2026-08-04": { state: "planned", minutes: 120 },
};

/** The AI Coach exchange shown in Focus Mode. */
export const coachThread = [
  {
    role: "coach" as const,
    body: "A current-carrying wire is bent into a loop. What happens to the field at the centre compared with the straight wire?",
  },
  {
    role: "student" as const,
    body: "It gets weaker because the wire is longer now.",
  },
  {
    role: "coach" as const,
    body: "Length isn't what sets the field here. Picture the field lines from each small segment of the loop — which direction do they point at the centre?",
    flag: "Misconception: treating field strength as a function of wire length.",
  },
];

/* Defaults to the real today. It used to default to the frozen demo date
   above, so every "days until the exam" on screen was counted from 27 July
   2026 no matter when you were looking at it. */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function topicStatus(confidence: number, lastSeenDays: number): TopicStatus {
  if (confidence === 0) return "untouched";
  if (confidence >= 75) return "strong";
  if (lastSeenDays >= 8 || confidence < 45) return "fading";
  return "steady";
}

export function subjectById(id: string) {
  return subjects.find((s) => s.id === id);
}

export function topicsBySubject(subjectId: string) {
  return topics.filter((t) => t.subjectId === subjectId);
}

export function subjectConfidence(subjectId: string) {
  const list = topicsBySubject(subjectId);
  if (!list.length) return 0;
  return Math.round(list.reduce((sum, t) => sum + t.confidence, 0) / list.length);
}
