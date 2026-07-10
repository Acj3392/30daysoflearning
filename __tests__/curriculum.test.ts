import { describe, it, expect } from "vitest";
import { CURRICULUM, TRACK_META, PROFILE_LABELS } from "@/lib/curriculum";

describe("curriculum data integrity", () => {
  it("has 30 days, numbered 1..30", () => {
    expect(CURRICULUM).toHaveLength(30);
    CURRICULUM.forEach((d, i) => expect(d.day).toBe(i + 1));
  });

  it("every day has 3 lessons in Sentence/Craft/Theory order", () => {
    for (const day of CURRICULUM) {
      expect(day.lessons).toHaveLength(3);
      expect(day.lessons.map((l) => l.track)).toEqual(["Sentence", "Craft", "Theory"]);
    }
  });

  it("every lesson has body, keytakeaway, and a valid practice", () => {
    const validTypes = ["diagnose", "reflect", "write", "combine", "rewrite"];
    for (const day of CURRICULUM) {
      for (const lesson of day.lessons) {
        expect(lesson.body.length).toBeGreaterThan(50);
        expect(lesson.keytakeaway.length).toBeGreaterThan(10);
        expect(validTypes).toContain(lesson.practice.type);
        if (lesson.practice.type === "diagnose") {
          expect(lesson.practice.items!.length).toBeGreaterThan(0);
          for (const item of lesson.practice.items!) {
            expect(item.answer).toBeGreaterThanOrEqual(0);
            expect(item.answer).toBeLessThan(item.options.length);
            expect(item.explain.length).toBeGreaterThan(0);
          }
        }
        if (lesson.practice.type === "reflect") {
          expect(lesson.practice.options!.length).toBeGreaterThanOrEqual(2);
          expect(lesson.practice.profileKey).toBeTruthy();
        }
      }
    }
  });

  it("every reflect profileKey has a label", () => {
    for (const day of CURRICULUM) {
      for (const lesson of day.lessons) {
        if (lesson.practice.profileKey) {
          expect(PROFILE_LABELS[lesson.practice.profileKey]).toBeTruthy();
        }
      }
    }
  });

  it("track meta covers all three tracks with the original accents", () => {
    expect(TRACK_META.Sentence.accent).toBe("#b5482f");
    expect(TRACK_META.Craft.accent).toBe("#3d6b5c");
    expect(TRACK_META.Theory.accent).toBe("#4a5b8c");
  });
});
