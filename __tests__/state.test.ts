import { describe, it, expect } from "vitest";
import {
  blankState,
  mergeState,
  lessonKey,
  totalLessons,
  completedCount,
  isValidState,
} from "@/lib/state";

describe("state helpers", () => {
  it("blankState has the expected shape", () => {
    const s = blankState();
    expect(s).toEqual({
      completed: {},
      answers: {},
      diagnoseAnswers: {},
      writing: {},
      feedback: {},
      profile: {},
      lastDay: 1,
    });
  });

  it("mergeState fills missing keys from blank (forward-compatible load)", () => {
    const merged = mergeState({ completed: { "1:0": true } });
    expect(merged.completed["1:0"]).toBe(true);
    expect(merged.profile).toEqual({});
    expect(merged.lastDay).toBe(1);
  });

  it("lessonKey formats day:index", () => {
    expect(lessonKey(12, 2)).toBe("12:2");
  });

  it("totalLessons is 90 (30 days x 3)", () => {
    expect(totalLessons()).toBe(90);
  });

  it("completedCount counts only true entries", () => {
    const s = blankState();
    s.completed = { "1:0": true, "1:1": false, "2:0": true };
    expect(completedCount(s)).toBe(2);
  });

  it("isValidState accepts a blank state and rejects junk", () => {
    expect(isValidState(blankState())).toBe(true);
    expect(isValidState(null)).toBe(false);
    expect(isValidState("nope")).toBe(false);
    expect(isValidState({ completed: [] })).toBe(false);
  });
});
