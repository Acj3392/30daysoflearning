import { CURRICULUM } from "./curriculum";

export interface AppState {
  completed: Record<string, boolean>;
  answers: Record<string, number>;
  diagnoseAnswers: Record<string, Record<string, number>>;
  writing: Record<string, string>;
  feedback: Record<string, string>;
  profile: Record<string, string>;
  lastDay: number;
}

export function blankState(): AppState {
  return {
    completed: {},
    answers: {},
    diagnoseAnswers: {},
    writing: {},
    feedback: {},
    profile: {},
    lastDay: 1,
  };
}

// Overlay a partial/legacy blob onto a blank state so missing keys never crash the UI
export function mergeState(partial: Partial<AppState> | null | undefined): AppState {
  return { ...blankState(), ...(partial ?? {}) };
}

export function lessonKey(day: number, lessonIdx: number): string {
  return `${day}:${lessonIdx}`;
}

export function totalLessons(): number {
  return CURRICULUM.reduce((n, day) => n + day.lessons.length, 0);
}

export function completedCount(state: AppState): number {
  return Object.values(state.completed).filter(Boolean).length;
}

const RECORD_KEYS = ["completed", "answers", "diagnoseAnswers", "writing", "feedback", "profile"] as const;

// Structural check used by the state API before persisting a client-sent blob
export function isValidState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  for (const key of RECORD_KEYS) {
    const v = obj[key];
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  }
  return typeof obj.lastDay === "number";
}
