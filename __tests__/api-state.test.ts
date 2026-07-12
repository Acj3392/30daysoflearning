import { describe, it, expect, vi, beforeEach } from "vitest";
import { blankState } from "@/lib/state";

const sqlMock = vi.fn();
vi.mock("@/lib/db", () => ({
  getSql: () => sqlMock,
  ensureSchema: () => Promise.resolve(),
}));

import { GET, PUT } from "@/app/api/state/route";

beforeEach(() => sqlMock.mockReset());

describe("GET /api/state", () => {
  it("returns blank state when no row exists", async () => {
    sqlMock.mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toEqual(blankState());
  });

  it("returns the stored state merged over blank", async () => {
    sqlMock.mockResolvedValueOnce([{ state: { completed: { "1:0": true }, lastDay: 4 } }]);
    const res = await GET();
    const body = await res.json();
    expect(body.state.completed["1:0"]).toBe(true);
    expect(body.state.lastDay).toBe(4);
    expect(body.state.profile).toEqual({});
  });

  it("returns 500 when the database is unavailable", async () => {
    sqlMock.mockRejectedValueOnce(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/state", () => {
  it("rejects a body without a valid state blob", async () => {
    const res = await PUT(
      new Request("http://test/api/state", {
        method: "PUT",
        body: JSON.stringify({ state: { completed: [] } }),
      })
    );
    expect(res.status).toBe(400);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("rejects unparseable JSON", async () => {
    const res = await PUT(new Request("http://test/api/state", { method: "PUT", body: "not json" }));
    expect(res.status).toBe(400);
  });

  it("upserts a valid state", async () => {
    sqlMock.mockResolvedValueOnce([]);
    const res = await PUT(
      new Request("http://test/api/state", {
        method: "PUT",
        body: JSON.stringify({ state: blankState() }),
      })
    );
    expect(res.status).toBe(200);
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});
