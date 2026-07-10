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

  // Same tutor prompt as the original app, built server-side from the curriculum
  const prompt = `You are a warm, exacting writing tutor. The student is working on a lesson called "${lesson.title}" in the track "${lesson.track}".

Lesson body: ${lesson.body.slice(0, 500)}

Student's free-write:
"${text}"

Give 2-3 paragraphs of specific, constructive feedback. Note what works, what could be stronger, and one concrete revision suggestion. Be encouraging but honest.`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    const feedback = block?.type === "text" ? block.text : "";
    return NextResponse.json({ text: feedback });
  } catch (err) {
    console.error("POST /api/feedback failed:", err);
    return NextResponse.json(
      { error: "The AI tutor is unavailable right now — your writing is saved, try again in a minute." },
      { status: 500 }
    );
  }
}
