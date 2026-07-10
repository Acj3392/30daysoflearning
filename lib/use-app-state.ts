"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, blankState, mergeState, completedCount } from "./state";

const STORAGE_KEY = "marginalia:v2";
const SYNC_DEBOUNCE_MS = 1500;

function readLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeState(JSON.parse(raw));
  } catch {
    // corrupted cache — fall through to blank
  }
  return blankState();
}

function writeLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full/unavailable — server sync still covers us
  }
}

export function useAppState() {
  // null until we've read localStorage (avoids hydration mismatch)
  const [state, setState] = useState<AppState | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<AppState | null>(null);

  const pushToServer = useCallback((s: AppState) => {
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: s }),
    }).catch(() => {
      // offline or server down — localStorage still has it; next update retries
    });
  }, []);

  // Load: localStorage instantly, then reconcile with the server copy.
  // localStorage can only be read after mount (SSR renders nothing for it),
  // so this sync setState is deliberate — it's the hydration-safe cache read.
  useEffect(() => {
    const local = readLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(local);
    latest.current = local;

    fetch("/api/state")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((data: { state: Partial<AppState> | null }) => {
        const server = mergeState(data.state);
        // Server is the cross-device source of truth, except when this browser
        // has progress the server never received (e.g. first deploy, offline work).
        const winner = completedCount(local) > completedCount(server) ? local : server;
        setState(winner);
        latest.current = winner;
        writeLocal(winner);
        if (winner === local) pushToServer(local);
      })
      .catch(() => {
        // no server (offline / not yet deployed) — keep local
      });
  }, [pushToServer]);

  const update = useCallback(
    (fn: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = fn(prev ?? blankState());
        latest.current = next;
        writeLocal(next);
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          if (latest.current) pushToServer(latest.current);
        }, SYNC_DEBOUNCE_MS);
        return next;
      });
    },
    [pushToServer]
  );

  return { state, update };
}
