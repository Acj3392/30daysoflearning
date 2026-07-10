"use client";

import { useState } from "react";
import { useAppState } from "@/lib/use-app-state";
import { completedCount, totalLessons } from "@/lib/state";
import { DayGrid, DayView, ProfileView } from "@/components/views";

type View = "today" | "day" | "profile";

export default function Home() {
  const { state, update } = useAppState();
  const [view, setView] = useState<View>("today");
  const [visitedDay, setVisitedDay] = useState<number | null>(null);

  // Until the user navigates, resume at the last day they had open
  const currentDay = visitedDay ?? state?.lastDay ?? 1;

  const openDay = (day: number) => {
    if (day < 1 || day > 30) return;
    setVisitedDay(day);
    setView("day");
    update((prev) => ({ ...prev, lastDay: day }));
    window.scrollTo(0, 0);
  };

  const goView = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  const pct = state ? Math.round((completedCount(state) / totalLessons()) * 100) : 0;

  return (
    <>
      <nav id="nav">
        <div className="brand">
          Marginalia <span>30-day writing apprenticeship</span>
        </div>
        <div className="nav-links">
          <span className="progress-pill">{pct}%</span>
          <button
            className={view === "today" || view === "day" ? "active" : ""}
            onClick={() => goView("today")}
          >
            Today
          </button>
          <button className={view === "profile" ? "active" : ""} onClick={() => goView("profile")}>
            Profile
          </button>
        </div>
      </nav>

      <div id="app">
        {!state ? null : view === "today" ? (
          <DayGrid state={state} currentDay={currentDay} onOpenDay={openDay} />
        ) : view === "day" ? (
          <DayView
            state={state}
            update={update}
            day={currentDay}
            onGotoDay={openDay}
            onAllDays={() => goView("today")}
          />
        ) : (
          <ProfileView state={state} />
        )}
      </div>
    </>
  );
}
