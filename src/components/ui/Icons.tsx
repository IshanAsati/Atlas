import type { SVGProps } from "react";

/**
 * Hand-drawn on a 24px grid, 1.6 stroke. Each pillar icon is an
 * instrument rather than a metaphor: a compass rose, an aperture,
 * a node tree, a decay curve, a rising bar.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 22,
  height: 22,
};

export function PlanIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8 10.6 10.6 8.8 15.2 13.4 13.4Z" />
      <path d="M12 1.8v2.2M12 20v2.2M22.2 12H20M4 12H1.8" />
    </svg>
  );
}

export function LearnIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v8.5h8.5" />
      <path d="M12 12 5.4 17.6" />
      <circle cx="12" cy="12" r="1.6" />
    </svg>
  );
}

export function TrackIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="5" cy="18" r="2.4" />
      <circle cx="18.5" cy="12" r="2.8" />
      <path d="M7.3 7.2 15.9 10.9M7.3 16.8 15.9 13.1" />
    </svg>
  );
}

export function AdaptIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M2.5 5.5c5.4 0 4.4 13 9 13 3 0 3.6-5.5 10.5-5.5" />
      <path d="M2.5 18.5h3" />
      <circle cx="11.5" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ImproveIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M3.5 20.5h17" />
      <path d="M6.5 20.5v-4.5M11.5 20.5v-8.5M16.5 20.5v-13" />
      <path d="M19.4 5.2 16.5 3.5l-.4 3.3" />
    </svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.8h17M8 3v4M16 3v4" />
      <circle cx="8.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M8.5 5.6 18.5 12l-10 6.4Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M9 5.5v13M15 5.5v13" strokeWidth={2.2} />
    </svg>
  );
}

export function SkipIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M6 5.6 15 12l-9 6.4Z" fill="currentColor" />
      <path d="M18.5 5.5v13" strokeWidth={2} />
    </svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12.8 9.7 17.5 19 6.5" strokeWidth={2} />
    </svg>
  );
}

export function ArrowIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 16.5V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.4 2" />
    </svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
    </svg>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function CoachIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="3.8" y="4" width="16.4" height="12.6" rx="3.2" />
      <path d="M8.6 16.6 7.3 20.3l4.4-3.7" />
      <path d="M9.9 8.7a2.2 2.2 0 1 1 2.6 3v.8" />
      <circle cx="12.5" cy="14.2" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The Atlas mark: a compass needle inside a bearing ring. */
export function AtlasMark({ size = 26, ...p }: IconProps & { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      {...p}
    >
      <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <path d="M16 4.5 19 15.4 16 27.5 13 15.4Z" fill="currentColor" opacity="0.9" />
      <path d="M16 4.5 19 15.4 16 16Z" fill="currentColor" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}
