import { NextResponse } from "next/server";
import { JudgeError, askJudge } from "@/lib/ai/askJudge";
import type { JudgeMode, JudgePromise, JudgeTurn } from "@/lib/ai/judge";

// Lab prototype: only answers when LAB_ENABLED=true (never set on Vercel).
const LAB_ENABLED = process.env.LAB_ENABLED === "true";

type JudgeRequest = {
  phase?: JudgeMode;
  promise?: JudgePromise;
  turns?: JudgeTurn[];
};

export async function POST(req: Request) {
  if (!LAB_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as JudgeRequest | null;
  const phase: JudgeMode = body?.phase === "verdict" || body?.phase === "auto" ? body.phase : "criteria";
  const promise = body?.promise;
  const turns = body?.turns ?? [];

  if (!promise?.title?.trim() || turns.length === 0 || turns[0].role !== "user") {
    return NextResponse.json({ error: "Promise title and a first user message are required" }, { status: 400 });
  }

  try {
    // Only the lab's own fields: real-case facts come from the database, never from the client.
    const { title, details, deadline, criteria, otherSide, openedAt } = promise;
    const answer = await askJudge({ phase, promise: { title, details, deadline, criteria, otherSide, openedAt }, turns });
    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof JudgeError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
