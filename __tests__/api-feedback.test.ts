import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

import { POST } from "@/app/api/feedback/route";

function req(body: unknown) {
  return new Request("http://test/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("POST /api/feedback", () => {
  it("rejects missing text", async () => {
    const res = await POST(req({ day: 1, lessonIdx: 1 }));
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range lesson reference", async () => {
    expect((await POST(req({ day: 0, lessonIdx: 1, text: "hi" }))).status).toBe(400);
    expect((await POST(req({ day: 31, lessonIdx: 1, text: "hi" }))).status).toBe(400);
    expect((await POST(req({ day: 1, lessonIdx: 3, text: "hi" }))).status).toBe(400);
  });

  it("rejects absurdly long submissions", async () => {
    const res = await POST(req({ day: 1, lessonIdx: 1, text: "x".repeat(30001) }));
    expect(res.status).toBe(400);
  });

  it("builds the tutor prompt from the server-side lesson and returns Claude's text", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Nice barista sketch." }],
    });
    const res = await POST(req({ day: 1, lessonIdx: 1, text: "My barista paragraphs..." }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("Nice barista sketch.");

    const call = createMock.mock.calls[0][0];
    // day 1 lesson 1 is the Craft lesson on flat vs round characters
    expect(call.messages[0].content).toContain("Flat characters vs. round characters");
    expect(call.messages[0].content).toContain("My barista paragraphs...");
    expect(call.max_tokens).toBeGreaterThan(0);
  });

  it("returns 500 with a friendly error when the model call fails", async () => {
    createMock.mockRejectedValueOnce(new Error("api down"));
    const res = await POST(req({ day: 1, lessonIdx: 1, text: "hello" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
