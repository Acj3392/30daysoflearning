# Plan: Marginalia — Vercel + Neon + real Claude feedback

Date: 2026-07-10
Source: single-file `marginalia.html` (vanilla JS, localStorage, `window.cowork.askClaude` stub) — full content captured in the brainstorm session; curriculum data (30 days × 3 lessons) is the source of truth and must be ported byte-for-byte.

## Decisions (from brainstorm)

- **Location**: this directory, new GitHub repo, new Vercel project (Hobby, account `anna-c-projects`)
- **Auth**: none — single user, one shared state row. URL is public; acceptable for now.
- **AI**: direct `@anthropic-ai/sdk` server-side in `/api/feedback`, `ANTHROPIC_API_KEY` as Vercel env var, model `claude-sonnet-5`. Key never in client code.
- **Persistence**: Neon Postgres (Vercel Marketplace), one JSONB row; `GET/PUT /api/state`. localStorage kept as offline cache with debounced sync (~1.5s).
- **UX**: unchanged. Same design tokens, same three views (Today / Day / Profile), same per-exercise "Get AI Feedback" button.

## Architecture

- **Stack**: Next.js (App Router) + React 19 + TypeScript. No Tailwind/shadcn — the app has a complete bespoke stylesheet; port it as a global CSS file to preserve the exact look.
- **Database**: table `app_state (id text primary key, state jsonb not null, updated_at timestamptz default now())`. Single row `id = 'default'`. State blob keeps the existing shape: `{ completed, answers, diagnoseAnswers, writing, feedback, profile, lastDay }`. Driver: `@neondatabase/serverless` (no ORM — one row doesn't need Drizzle).
- **API**:
  - `GET /api/state` → `{ state }` (blank state if row missing)
  - `PUT /api/state` body `{ state }` → upsert row; validate it's an object with expected top-level keys
  - `POST /api/feedback` body `{ day, lessonIdx, text }` → server looks up the lesson from the curriculum module (client never sends the prompt — prevents prompt tampering and keeps payloads small), builds the tutor prompt, calls Anthropic, returns `{ text }`. `max_tokens: 1024`.
- **UI (React port, same visuals)**:
  - `app/layout.tsx` — nav bar (brand, progress pill, Today/Profile buttons), global CSS
  - Single client page `app/page.tsx` owning view state (`today | day | profile`) — mirrors the original's in-memory routing; no URL routing needed
  - Components: `DayGrid`, `DayView`, `LessonCard`, practice renderers (`DiagnosePractice`, `ReflectPractice`, `WritePractice`), `ProfileView`
  - State hook `useAppState()`: loads from `/api/state` on mount (fallback to localStorage cache), writes to localStorage immediately + debounced PUT to server
- **Data modules**: `lib/curriculum.ts` (CURRICULUM, TRACK_META, PROFILE_LABELS — verbatim from the HTML), `lib/state.ts` (types + blankState)

## UI/UX Delivery Plan

- **User Journey**: Anna opens the public URL on any device → sees her real progress (from Neon) → completes a practice → progress saves automatically → writes a free-write → clicks "Get AI Feedback" → real Claude tutor feedback appears and persists.
- **Wiring Matrix**:
  - Answer diagnose/reflect item → state update → localStorage + debounced `PUT /api/state` → progress pill/badges update instantly (optimistic)
  - Type in write-area → same debounced persistence
  - "Get AI Feedback" → `POST /api/feedback` → spinner box → feedback rendered + persisted in state blob
  - Page load → `GET /api/state` → hydrate; if fetch fails, fall back to localStorage cache + show nothing scary (silent, console warning)
- **State Matrix**: loading (initial fetch: render from localStorage immediately, reconcile when server responds — server wins if newer); feedback loading (existing spinner); feedback error (message in the feedback box, not an alert); empty profile (existing empty text).
- **UX Constraints**: existing responsive breakpoints preserved (≤600px rules in the stylesheet); buttons remain real `<button>`s (keyboard accessible as-is).

## Tasks (in order)

1. **Scaffold + data port** — `create-next-app` (TS, App Router, no Tailwind), move CURRICULUM/TRACK_META/PROFILE_LABELS into `lib/curriculum.ts`, port stylesheet to `app/globals.css`. Test: curriculum module has 30 days × 3 lessons (unit). Outcome: project builds.
2. **UI port with local persistence** — all components + `useAppState()` writing to localStorage only. Tests: state helpers (lessonKey, completion %, blankState merge) unit-tested. Outcome: full app works locally exactly like the HTML version (minus AI).
3. **Neon state API + sync** — `app/api/state/route.ts` (GET/PUT, upsert), `lib/db.ts`, wire `useAppState()` to load/sync. Test: route handler integration test with mocked sql. Outcome: progress survives across browsers/devices.
4. **Claude feedback API** — `app/api/feedback/route.ts` with `@anthropic-ai/sdk`, tutor prompt built server-side from curriculum; wire the button. Test: route validates input, builds prompt from lesson (Anthropic client mocked). Outcome: real AI feedback in the UI.
5. **Deploy** — new public GitHub repo, new Vercel project, provision Neon via Marketplace, add `ANTHROPIC_API_KEY`, create table, production deploy, verify live URL end-to-end.

## Test Strategy

Light — personal single-user prototype. Vitest for units + route handlers (Anthropic and Neon mocked at module boundary). No e2e suite; final verification is manual against the live URL (complete an item, refresh, cross-device check, one real feedback call).

## Known gotchas (from docs/solutions in the portfolio repo)

- Hobby plan **blocks private-repo deploys** when commit author ≠ connected GitHub account → make the repo **public** from the start.
- **Deployment Protection** returns 401s and makes CLI status hang on "Building…" → disable Vercel Authentication in project settings immediately after creating the project.
- Diagnose deploy weirdness in the dashboard, not the CLI.

## Env vars

- `DATABASE_URL` — auto-populated by Neon Marketplace integration (pull locally via `vercel env pull`)
- `ANTHROPIC_API_KEY` — Anna adds via dashboard or `vercel env add` (never in code/chat)
