import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
let _ready: Promise<void> | null = null;

// Lazy so builds/tests don't require DATABASE_URL at import time
export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

// Idempotently ensure the single table exists. Runs once per warm instance so
// provisioning Neon is the only manual step — no separate migration needed.
export function ensureSchema() {
  if (!_ready) {
    const sql = getSql();
    _ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_state (
          id text PRIMARY KEY,
          state jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      // Reset so a transient failure can be retried on the next request
      _ready = null;
      throw err;
    });
  }
  return _ready;
}
