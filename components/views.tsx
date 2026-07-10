"use client";

import { CURRICULUM, TRACK_META, PROFILE_LABELS } from "@/lib/curriculum";
import { AppState, lessonKey } from "@/lib/state";
import { PracticeSection } from "./practice";

interface ViewProps {
  state: AppState;
  update: (fn: (prev: AppState) => AppState) => void;
}

export function DayGrid({
  state,
  currentDay,
  onOpenDay,
}: {
  state: AppState;
  currentDay: number;
  onOpenDay: (day: number) => void;
}) {
  return (
    <>
      <div className="view-header">
        <h1>Your 30-day writing course</h1>
        <p>Three lessons a day — sentence craft, writing technique, literary theory.</p>
      </div>
      <div className="day-grid">
        {CURRICULUM.map((d) => {
          const doneCount = d.lessons.filter((_, i) => state.completed[lessonKey(d.day, i)]).length;
          const total = d.lessons.length;
          let cls = "day-card";
          if (doneCount === total) cls += " complete";
          if (d.day === currentDay) cls += " today-card";
          return (
            <div key={d.day} className={cls} onClick={() => onOpenDay(d.day)}>
              <div className="day-num">DAY {d.day}</div>
              <div className="day-theme">{d.theme}</div>
              <div className="day-status">
                {doneCount}/{total} lessons
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function DayView({
  state,
  update,
  day,
  onGotoDay,
  onAllDays,
}: ViewProps & {
  day: number;
  onGotoDay: (day: number) => void;
  onAllDays: () => void;
}) {
  const dayData = CURRICULUM.find((d) => d.day === day);
  if (!dayData) return <p style={{ color: "#f4efe4" }}>Day not found.</p>;

  return (
    <>
      <div className="day-view-header">
        <div>
          <h1>
            Day {dayData.day}: {dayData.theme}
          </h1>
          <div className="day-meta">Three lessons — sentence, craft, theory</div>
        </div>
        <div className="day-nav">
          <button onClick={() => onGotoDay(day - 1)} disabled={day <= 1}>
            ← Prev
          </button>
          <button onClick={onAllDays}>All Days</button>
          <button onClick={() => onGotoDay(day + 1)} disabled={day >= 30}>
            Next →
          </button>
        </div>
      </div>

      {dayData.lessons.map((lesson, lessonIdx) => {
        const meta = TRACK_META[lesson.track] ?? { accent: "#4a5b8c" };
        const done = !!state.completed[lessonKey(day, lessonIdx)];
        return (
          <div className="lesson-card" key={lessonIdx}>
            <div className="lesson-track-bar" style={{ background: meta.accent }} />
            <div className="lesson-header">
              <div className="lesson-track-label" style={{ color: meta.accent }}>
                {lesson.track}
              </div>
              <div className="lesson-title">
                {lesson.title}
                {done && <span className="complete-badge inline">✓</span>}
              </div>
            </div>
            <div className="lesson-body">{lesson.body}</div>
            {lesson.keytakeaway && <div className="lesson-takeaway">{lesson.keytakeaway}</div>}
            <PracticeSection day={day} lessonIdx={lessonIdx} lesson={lesson} state={state} update={update} />
          </div>
        );
      })}
    </>
  );
}

export function ProfileView({ state }: { state: AppState }) {
  const profileEntries = Object.entries(state.profile);
  const writings = Object.entries(state.writing).filter(([, v]) => v && v.trim());

  const dayForProfileKey = (key: string): string => {
    for (const d of CURRICULUM) {
      for (const l of d.lessons) {
        if (l.practice.profileKey === key) return `Day ${d.day}`;
      }
    }
    return "";
  };

  return (
    <>
      <div className="view-header">
        <h1>Your writing profile</h1>
        <p>Built from your reflections across the course.</p>
      </div>

      {profileEntries.length === 0 ? (
        <p className="profile-empty">
          Your profile will fill in as you answer reflection questions throughout the course.
        </p>
      ) : (
        <div className="profile-grid">
          {profileEntries.map(([key, val]) => {
            const dayNum = dayForProfileKey(key);
            return (
              <div className="profile-card" key={key}>
                <div className="pc-label">{PROFILE_LABELS[key] ?? key}</div>
                <div className="pc-value">{val}</div>
                {dayNum && <div className="pc-day">{dayNum}</div>}
              </div>
            );
          })}
        </div>
      )}

      {writings.length > 0 && (
        <div className="writings-section">
          <div className="section-title">Saved writings ({writings.length})</div>
          {writings.map(([k, text]) => {
            const [dayStr, idxStr] = k.split(":");
            const day = Number(dayStr);
            const idx = Number(idxStr);
            const dayData = CURRICULUM.find((d) => d.day === day);
            const lesson = dayData?.lessons[idx];
            const title = lesson
              ? `Day ${day} — ${lesson.track}: ${lesson.title}`
              : `Day ${day}, Lesson ${idx + 1}`;
            return (
              <div className="writing-entry" key={k}>
                <div className="we-title">{title}</div>
                <div className="we-text">
                  {text.slice(0, 400)}
                  {text.length > 400 ? "…" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
