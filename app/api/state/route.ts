import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { AppState, blankState, isValidState, mergeState } from "@/lib/state";

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql`SELECT state FROM app_state WHERE id = 'default'`) as {
      state: Partial<AppState>;
    }[];
    const state = rows.length > 0 ? mergeState(rows[0].state) : blankState();
    return NextResponse.json({ state });
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json({ error: "Could not load progress" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const state = (body as { state?: unknown } | null)?.state;
  if (!isValidState(state)) {
    return NextResponse.json({ error: "Invalid state payload" }, { status: 400 });
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO app_state (id, state, updated_at)
      VALUES ('default', ${JSON.stringify(state)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/state failed:", err);
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
