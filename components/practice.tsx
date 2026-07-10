"use client";

import { useState } from "react";
import { Lesson, Practice } from "@/lib/curriculum";
import { AppState, lessonKey } from "@/lib/state";

interface PracticeProps {
  day: number;
  lessonIdx: number;
  lesson: Lesson;
  state: AppState;
  update: (fn: (prev: AppState) => AppState) => void;
}

export function PracticeSection(props: PracticeProps) {
  const { type } = props.lesson.practice;
  let inner: React.ReactNode = null;
  if (type === "diagnose") inner = <DiagnosePractice {...props} />;
  else if (type === "reflect") inner = <ReflectPractice {...props} />;
  else inner = <WritePractice {...props} />;
  return <div className="practice-section">{inner}</div>;
}

function DiagnosePractice({ day, lessonIdx, lesson, state, update }: PracticeProps) {
  const practice = lesson.practice;
  const key = lessonKey(day, lessonIdx);
  const saved = state.diagnoseAnswers[key] ?? {};
  const items = practice.items ?? [];
  const complete = !!state.completed[key];

  const answer = (itemIdx: number, optIdx: number) => {
    if (saved[itemIdx] !== undefined) return;
    update((prev) => {
      const nextSaved = { ...(prev.diagnoseAnswers[key] ?? {}), [itemIdx]: optIdx };
      const allDone = Object.keys(nextSaved).length >= items.length;
      return {
        ...prev,
        diagnoseAnswers: { ...prev.diagnoseAnswers, [key]: nextSaved },
        completed: allDone ? { ...prev.completed, [key]: true } : prev.completed,
      };
    });
  };

  return (
    <>
      <div className="practice-label">Practice — Identify</div>
      <div className="practice-prompt">{practice.prompt}</div>
      {items.map((item, i) => {
        const chosen = saved[i];
        const answered = chosen !== undefined;
        return (
          <div className="diagnose-item" key={i}>
            <div className="diagnose-sentence">{item.sentence}</div>
            <div className="diagnose-options">
              {item.options.map((opt, oi) => {
                let cls = "diagnose-opt";
                if (answered) {
                  if (oi === item.answer) cls += " correct";
                  else if (oi === chosen) cls += " wrong";
                }
                return (
                  <button key={oi} className={cls} disabled={answered} onClick={() => answer(i, oi)}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && <div className="diagnose-explain">{item.explain}</div>}
          </div>
        );
      })}
      {complete && <div className="complete-badge">✓ Complete</div>}
    </>
  );
}

function ReflectPractice({ day, lessonIdx, lesson, state, update }: PracticeProps) {
  const practice = lesson.practice;
  const key = lessonKey(day, lessonIdx);
  const chosen = state.answers[key];
  const answered = chosen !== undefined;

  const answer = (optIdx: number, label: string) => {
    if (answered) return;
    update((prev) => ({
      ...prev,
      answers: { ...prev.answers, [key]: optIdx },
      profile: practice.profileKey ? { ...prev.profile, [practice.profileKey]: label } : prev.profile,
      completed: { ...prev.completed, [key]: true },
    }));
  };

  return (
    <>
      <div className="practice-label">Reflect</div>
      <div className="practice-prompt">{practice.prompt}</div>
      <div className="options-list">
        {(practice.options ?? []).map((opt, oi) => {
          let cls = "option-btn";
          if (answered && oi === chosen) cls += " selected-correct";
          return (
            <button key={oi} className={cls} disabled={answered} onClick={() => answer(oi, opt)}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && <div className="complete-badge">✓ Saved to profile</div>}
    </>
  );
}

function practiceTypeLabel(practice: Practice): string {
  if (practice.type === "combine") return "Practice — Combine";
  if (practice.type === "rewrite") return "Practice — Rewrite";
  return "Practice — Write";
}

function WritePractice({ day, lessonIdx, lesson, state, update }: PracticeProps) {
  const practice = lesson.practice;
  const key = lessonKey(day, lessonIdx);
  const text = state.writing[key] ?? "";
  const feedback = state.feedback[key];
  const done = !!state.completed[key];
  const [rubricVisible, setRubricVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setText = (value: string) =>
    update((prev) => ({ ...prev, writing: { ...prev.writing, [key]: value } }));

  const markDone = () =>
    update((prev) => ({ ...prev, completed: { ...prev.completed, [key]: true } }));

  const getFeedback = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, lessonIdx, text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Feedback request failed (${res.status})`);
      }
      const data: { text: string } = await res.json();
      update((prev) => ({ ...prev, feedback: { ...prev.feedback, [key]: data.text } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get feedback right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="practice-label">{practiceTypeLabel(practice)}</div>
      <div className="practice-prompt">{practice.prompt}</div>

      {practice.rubric && (
        <>
          <button className="rubric-toggle" onClick={() => setRubricVisible((v) => !v)}>
            {rubricVisible ? "Hide rubric" : "Show rubric"}
          </button>
          {rubricVisible && <div className="rubric-block">{practice.rubric}</div>}
        </>
      )}

      <textarea
        className="write-area"
        placeholder="Write here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="action-row">
        <button className="btn-primary" onClick={getFeedback} disabled={loading || !text.trim()}>
          {loading ? "Getting feedback…" : "Get AI Feedback"}
        </button>
        {done ? (
          <span className="complete-badge">✓ Complete</span>
        ) : (
          <button className="btn-secondary" onClick={markDone}>
            Mark Done
          </button>
        )}
      </div>

      {loading && (
        <div className="ai-feedback-box">
          <div className="feedback-label">AI Feedback</div>
          <span className="spinner" />
          Getting feedback…
        </div>
      )}
      {error && !loading && (
        <div className="ai-feedback-box error">
          <div className="feedback-label">AI Feedback</div>
          {error}
        </div>
      )}
      {feedback && !loading && (
        <div className="ai-feedback-box">
          <div className="feedback-label">AI Feedback</div>
          {feedback}
        </div>
      )}
    </>
  );
}
