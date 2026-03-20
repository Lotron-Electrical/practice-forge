import type {
  PieceStatus,
  SectionStatus,
  ExcerptStatus,
  Priority,
} from "./types";

export const PIECE_STATUS_CONFIG: Record<
  PieceStatus,
  { label: string; icon: string; colorVar: string }
> = {
  not_started: {
    label: "Not started",
    icon: "○",
    colorVar: "--pf-status-not-started",
  },
  in_progress: {
    label: "In progress",
    icon: "◐",
    colorVar: "--pf-status-in-progress",
  },
  performance_ready: {
    label: "Ready",
    icon: "✓",
    colorVar: "--pf-status-ready",
  },
  archived: {
    label: "Archived",
    icon: "—",
    colorVar: "--pf-status-not-started",
  },
};

export const SECTION_STATUS_CONFIG: Record<
  SectionStatus,
  { label: string; icon: string; colorVar: string }
> = {
  not_started: {
    label: "Not started",
    icon: "○",
    colorVar: "--pf-status-not-started",
  },
  working_on: {
    label: "Working on",
    icon: "◐",
    colorVar: "--pf-status-in-progress",
  },
  solid: { label: "Solid", icon: "◉", colorVar: "--pf-status-solid" },
  polished: { label: "Polished", icon: "✓", colorVar: "--pf-status-ready" },
};

export const EXCERPT_STATUS_CONFIG: Record<
  ExcerptStatus,
  { label: string; icon: string; colorVar: string }
> = {
  needs_work: {
    label: "Needs work",
    icon: "△",
    colorVar: "--pf-status-needs-work",
  },
  acceptable: {
    label: "Acceptable",
    icon: "◐",
    colorVar: "--pf-status-in-progress",
  },
  solid: { label: "Solid", icon: "◉", colorVar: "--pf-status-solid" },
  audition_ready: {
    label: "Audition ready",
    icon: "✓",
    colorVar: "--pf-status-ready",
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; colorClass: string }
> = {
  high: { label: "High", colorClass: "bg-pf-coral text-white" },
  medium: { label: "Medium", colorClass: "bg-pf-gold text-white" },
  low: { label: "Low", colorClass: "bg-pf-text-secondary text-white" },
};

export const MUSICAL_KEYS = [
  "C major",
  "G major",
  "D major",
  "A major",
  "E major",
  "B major",
  "F# major",
  "Gb major",
  "Db major",
  "Ab major",
  "Eb major",
  "Bb major",
  "F major",
  "A minor",
  "E minor",
  "B minor",
  "F# minor",
  "C# minor",
  "G# minor",
  "Eb minor",
  "Bb minor",
  "F minor",
  "C minor",
  "G minor",
  "D minor",
  "Chromatic",
  "Whole tone",
];
