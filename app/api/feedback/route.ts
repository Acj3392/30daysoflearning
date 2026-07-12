import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CURRICULUM } from "@/lib/curriculum";

const MAX_TEXT_LENGTH = 30000;
const MODEL = "claude-sonnet-5";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    day?: unknown;
    lessonIdx?: unknown;
    text?: unknown;
  } | null;

  const day = body?.day;
  const lessonIdx = body?.lessonIdx;
  const text = body?.text;

  if (
    typeof day !== "number" ||
    typeof lessonIdx !== "number" ||
    typeof text !== "string" ||
    !text.trim() ||
    text.length > MAX_TEXT_LENGTH ||
    !Number.isInteger(day) ||
    !Number.isInteger(lessonIdx)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lesson = CURRICULUM.find((d) => d.day === day)?.lessons[lessonIdx];
  if (!lesson) {
    return NextResponse.json({ error: "Unknown lesson" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI tutor isn't configured yet (missing ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  // Demanding, university-level tutor built server-side from the curriculum
  const prompt = `You are a demanding university-level creative-writing instructor grading a graduate workshop — think Stephen King in "On Writing": blunt, exacting, allergic to flattery, adverbs, clichés, and slack prose. You hold a high bar. Praise is earned, rare, and specific; the bulk of your attention goes to what is weak, vague, unearned, or lazy. Be tough and honest, never cruel — every criticism must be precise and actionable, aimed at making the writer better.

The lesson being practiced: "${lesson.title}" (track: ${lesson.track}).
Lesson teaching: ${lesson.body.slice(0, 500)}

The student's submission:
"${text}"

Grade it hard against a serious university workshop standard. In your response:
- Open with a one-line honest verdict — no warm-up, no "this is strong work."
- Name the single biggest weakness first and explain exactly why it fails, quoting the offending words.
- Hunt down specifics: weak verbs, clichés, vague abstractions, filler, telling instead of showing, unearned emotion, anything that doesn't pull its weight. Quote and diagnose them.
- Acknowledge what genuinely works only if it truly earns it — one or two lines, no more.
- End with a concrete revision assignment: state exactly what to fix and rewrite, then instruct the student to revise their submission and resubmit for another round of grading. Make clear this is work, not a pat on the back.

Keep it rigorous and specific. Do not soften your judgments to spare feelings.`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const feedback = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ text: feedback });
  } catch (err) {
    console.error("POST /api/feedback failed:", err);
    return NextResponse.json(
      { error: "The AI tutor is unavailable right now — your writing is saved, try again in a minute." },
      { status: 500 }
    );
  }
}
