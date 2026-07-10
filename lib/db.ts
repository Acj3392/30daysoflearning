import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

// Lazy so builds/tests don't require DATABASE_URL at import time
export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}
