import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../common";
import { requireUser } from "@/lib/auth/requireUser";
import { JudgeError, askJudge } from "@/lib/ai/askJudge";
import {
  formatKyivDate,
  type JudgeImage,
  type JudgePhase,
  type JudgeTurn,
  type Speaker,
} from "@/lib/ai/judge";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { getRulingState } from "@/lib/ai/judgeRuling";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";
import type { PromiseRowMin } from "@/lib/promiseTypes";

// Dreddi, the AI judge, on a real promise (lab: LAB_ENABLED=true only). The case lives in judge_messages, so
// whoever comes back weeks later, the judge gets the whole case again: what was promised, by whom,
// when it was recorded, the agreed criteria and every earlier message with its date.

const LAB_ENABLED = process.env.LAB_ENABLED === "true";

type PromiseRow = {
  id: string;
  title: string;
  details: string | null;
  condition_text: string | null;
  status: string;
  visibility: string | null;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

type MessageRow = {
  id: string;
  author_id: string | null;
  author_role: Speaker | "judge";
  phase: JudgePhase;
  content: string;
  evidence_notes: string[];
  criteria: string[] | null;
  criteria_ready: boolean | null;
  verdict: "kept" | "not_kept" | "undecided" | null;
  confidence: number | null;
  reasons: string[] | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  approves_message_id: string | null;
  in_absentia: boolean;
  created_at: string;
};

type JudgeCaseRequest = {
  // "approve": the side agrees to the judge's proposed criteria (proposalId); no model call.
  action?: "approve";
  proposalId?: string;
  text?: string;
  images?: JudgeImage[];
  phase?: JudgePhase;
};

const MESSAGE_COLUMNS =
  "id,author_id,author_role,phase,content,evidence_notes,criteria,criteria_ready,verdict,confidence,reasons,model,input_tokens,output_tokens,approves_message_id,in_absentia,created_at";

const ROLE_LABEL: Record<Speaker, string> = { promisor: "Promisor", counterparty: "Counterparty" };

// After a side writes, the other side has this long to answer before Dreddi may rule without them.
const RESPONSE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// When a side has been called and not answered since: the first message from the other side after
// that side's own last message. null when nobody is waiting for them.
const waitingSince = (rows: MessageRow[], side: Speaker) => {
  let since: string | null = null;
  for (const row of rows) {
    if (row.author_role === side) since = null;
    else if (row.author_role !== "judge" && !since) since = row.created_at;
  }
  return since;
};

async function loadCase(promiseId: string, userId: string) {
  const admin = getAdminClient();
  const { data: promise, error } = await admin
    .from("promises")
    .select(
      "id,title,details,condition_text,status,visibility,due_at,created_at,completed_at,creator_id,promisor_id,promisee_id,counterparty_id"
    )
    .eq("id", promiseId)
    .maybeSingle<PromiseRow>();
  if (error) throw new JudgeError(`Lookup failed: ${error.message}`, 500);
  if (!promise) throw new JudgeError("Not found", 404);

  const executorId = resolveExecutorId(promise);
  const counterpartyId = resolveCounterpartyId(promise);
  const role: Speaker | null =
    userId === executorId ? "promisor" : userId === counterpartyId ? "counterparty" : null;
  if (!role) throw new JudgeError("Only the sides of this promise can go to the judge", 403);

  const ids = [executorId, counterpartyId].filter((id): id is string => Boolean(id));
  const { data: profiles } = await admin.from("profiles").select("id,display_name,handle").in("id", ids);
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const profile = profiles?.find((row) => row.id === id);
    return profile?.display_name || (profile?.handle ? `@${profile.handle}` : "Unknown");
  };

  const { data: messages, error: messagesError } = await admin
    .from("judge_messages")
    .select(MESSAGE_COLUMNS)
    .eq("promise_id", promiseId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<MessageRow[]>();
  if (messagesError) throw new JudgeError(`Case lookup failed: ${messagesError.message}`, 500);

  const rows = messages ?? [];
  const lastCriteria = [...rows].reverse().find((row) => row.author_role === "judge" && row.criteria?.length);
  // The judge only proposes; criteria are fixed once every side approved the latest proposal.
  const proposal = lastCriteria?.criteria_ready ? lastCriteria : null;
  const requiredRoles: Speaker[] = counterpartyId ? ["promisor", "counterparty"] : ["promisor"];
  const approvedRoles = new Set(
    rows
      .filter((row) => proposal && row.approves_message_id === proposal.id && row.author_role !== "judge")
      .map((row) => row.author_role as Speaker)
  );
  const criteriaAgreed = Boolean(proposal) && requiredRoles.every((side) => approvedRoles.has(side));
  const criteriaStatus = criteriaAgreed ? "agreed" : proposal ? "proposed" : lastCriteria ? "draft" : "none";
  // The sides that were called and have not answered yet, with their response deadline.
  const awaiting = requiredRoles.flatMap((side) => {
    const since = waitingSince(rows, side);
    if (!since) return [];
    const until = new Date(new Date(since).getTime() + RESPONSE_DAYS * DAY_MS).toISOString();
    return [{ role: side, since, until, overdue: Date.now() > new Date(until).getTime() }];
  });

  return {
    admin,
    promise,
    role,
    requiredRoles,
    ruling: getRulingState(rows, requiredRoles),
    promisorName: nameOf(executorId) ?? "Unknown",
    counterpartyName: nameOf(counterpartyId),
    authorNames: Object.fromEntries(ids.map((id) => [id, nameOf(id)])) as Record<string, string | null>,
    messages: rows,
    criteria: lastCriteria?.criteria ?? [],
    criteriaStatus,
    criteriaAgreed,
    proposalId: proposal?.id ?? null,
    awaiting,
    approvals: Object.fromEntries(requiredRoles.map((side) => [side, approvedRoles.has(side)])) as Partial<
      Record<Speaker, boolean>
    >,
  };
}

type LoadedCase = Awaited<ReturnType<typeof loadCase>>;

// Only an open promise can still be decided; once confirmed or disputed the case is closed.
const OPEN_STATUSES = ["active", "completed_by_promisor"];

const PROMISE_MIN_COLUMNS =
  "id,title,is_important,status,due_at,completed_at,creator_id,counterparty_id,promisor_id,promisee_id,confirmed_at,disputed_at,disputed_code,dispute_reason,invite_status,invited_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at";

// A binding ruling moves the promise like the sides' own buttons do: kept = confirmed,
// not kept = disputed, with the same reputation update (half weight with no other side).
async function applyBindingRuling(loaded: LoadedCase) {
  const { admin, promise, ruling } = loaded;
  if (!ruling?.binding || !OPEN_STATUSES.includes(promise.status)) return false;

  const now = new Date().toISOString();
  const update =
    ruling.verdict === "kept"
      ? {
          status: "confirmed",
          confirmed_at: now,
          confirmed_without_executor_completion: promise.status === "active" && !promise.completed_at,
        }
      : {
          status: "disputed",
          disputed_at: now,
          disputed_code: "not_completed",
          dispute_reason: "Рішення Дредді",
        };
  const { data: updated, error } = await admin
    .from("promises")
    .update(update)
    .eq("id", promise.id)
    .in("status", OPEN_STATUSES)
    .select(PROMISE_MIN_COLUMNS)
    .maybeSingle<PromiseRowMin>();
  if (error) throw new JudgeError(`Could not apply the ruling: ${error.message}`, 500);
  // Someone changed the status in the meantime; their decision stands.
  if (!updated) return false;

  const selfPromise = !loaded.requiredRoles.includes("counterparty");
  await applyReputationForPromiseFinalization(admin, updated, selfPromise ? { weight: 0.5, verifiedBy: "dreddi" } : {});

  const how = { self: "", accepted: " Обидві сторони прийняли рішення.", silence: " Оскаржень не надійшло." }[ruling.binding];
  await admin.from("judge_messages").insert({
    promise_id: promise.id,
    author_id: null,
    author_role: "judge",
    phase: "verdict",
    content: `Рішення набрало сили.${how} Статус обіцянки: ${ruling.verdict === "kept" ? "«Дотримано»" : "«Оскаржено»"}.`,
  });
  return true;
}

// Loads the case and applies a ruling that has become binding since (silence counts too).
async function loadSettledCase(promiseId: string, userId: string) {
  const loaded = await loadCase(promiseId, userId);
  return (await applyBindingRuling(loaded)) ? loadCase(promiseId, userId) : loaded;
}

const caseView = (loaded: LoadedCase) => ({
  role: loaded.role,
  criteria: loaded.criteria,
  criteriaStatus: loaded.criteriaStatus,
  criteriaAgreed: loaded.criteriaAgreed,
  proposalId: loaded.proposalId,
  approvals: loaded.approvals,
  awaiting: loaded.awaiting,
  ruling: loaded.ruling,
  closed: !OPEN_STATUSES.includes(loaded.promise.status),
  promiseStatus: loaded.promise.status,
  promiseTitle: loaded.promise.title,
  messages: loaded.messages.map((row) => ({
    ...row,
    author_name: row.author_id ? loaded.authorNames[row.author_id] ?? null : null,
  })),
});

const errorResponse = (error: unknown) => {
  if (error instanceof JudgeError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart" }, { status: 500 });
  }
  throw error;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!LAB_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  try {
    return NextResponse.json(caseView(await loadSettledCase((await ctx.params).id, user.id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!LAB_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  const body = (await req.json().catch(() => null)) as JudgeCaseRequest | null;

  if (body?.action === "approve") {
    try {
      const loaded = await loadSettledCase((await ctx.params).id, user.id);
      if (!OPEN_STATUSES.includes(loaded.promise.status)) return NextResponse.json(caseView(loaded));
      // The side approves either the current criteria proposal or the current, still pending ruling.
      const pendingRuling = loaded.ruling && !loaded.ruling.binding && !loaded.ruling.appealed ? loaded.ruling : null;
      const target =
        body.proposalId && body.proposalId === loaded.proposalId && !loaded.criteriaAgreed
          ? { phase: "criteria" as const, content: "Погоджую критерії", done: Boolean(loaded.approvals[loaded.role]) }
          : body.proposalId && body.proposalId === pendingRuling?.rulingId
            ? { phase: "verdict" as const, content: "Приймаю рішення", done: pendingRuling.acceptedBy.includes(loaded.role) }
            : null;
      if (!target) throw new JudgeError("This is no longer the current proposal or ruling", 409);
      if (target.done) return NextResponse.json(caseView(loaded));

      const { error: approveError } = await loaded.admin.from("judge_messages").insert({
        promise_id: loaded.promise.id,
        author_id: user.id,
        author_role: loaded.role,
        phase: target.phase,
        content: target.content,
        approves_message_id: body.proposalId,
      });
      if (approveError) throw new JudgeError(`Could not save the approval: ${approveError.message}`, 500);
      return NextResponse.json(caseView(await loadSettledCase(loaded.promise.id, user.id)));
    } catch (error) {
      return errorResponse(error);
    }
  }

  const text = body?.text?.trim() ?? "";
  const images = (body?.images ?? []).slice(0, 4);
  if (!text && images.length === 0) {
    return NextResponse.json({ error: "Write something or attach evidence" }, { status: 400 });
  }

  try {
    const loaded = await loadSettledCase((await ctx.params).id, user.id);
    const { admin, promise, role } = loaded;
    if (!OPEN_STATUSES.includes(promise.status)) {
      throw new JudgeError("Справу закрито: статус обіцянки вже остаточний", 409);
    }
    // Agreed criteria are final: after that the case only moves on to checking. Before it, a side may
    // skip straight to checking (a promise that predates the judge is judged by its own wording).
    const checking = loaded.criteriaAgreed || loaded.messages.some((row) => row.phase === "verdict");
    const phase: JudgePhase = checking || body?.phase === "verdict" ? "verdict" : "criteria";
    const writerName = loaded.authorNames[user.id] ?? "Unknown";
    const otherRole: Speaker | null = loaded.counterpartyName === null ? null : role === "promisor" ? "counterparty" : "promisor";
    const otherWait = loaded.awaiting.find((item) => item.role === otherRole);
    const otherName = otherRole === "promisor" ? loaded.promisorName : loaded.counterpartyName;
    const otherSide = !otherRole
      ? undefined
      : otherWait
        ? `${otherName} (${otherRole}) has been called since ${formatKyivDate(new Date(otherWait.since))} and has not answered. Their response window ${
            otherWait.overdue ? "has passed" : `is open until ${formatKyivDate(new Date(otherWait.until))}`
          }.`
        : `${otherName} (${otherRole}) has answered everything so far, or has not been called yet; this message calls them, with ${RESPONSE_DAYS} days to answer.`;

    const history: JudgeTurn[] = loaded.messages.map((row) => {
      const date = formatKyivDate(new Date(row.created_at));
      if (row.author_role === "judge") {
        const verdict = row.verdict ? `\n(Your verdict then: ${row.verdict})` : "";
        return { role: "assistant", text: `${row.content}${verdict}` };
      }
      const name = row.author_id ? loaded.authorNames[row.author_id] ?? "Unknown" : "Unknown";
      return {
        role: "user",
        text: row.approves_message_id
          ? row.phase === "verdict"
            ? "(Accepted your ruling.)"
            : "(Approved the criteria you proposed.)"
          : row.content,
        label: `${ROLE_LABEL[row.author_role]} · ${name} · ${date}`,
        evidenceNotes: row.evidence_notes,
      };
    });
    const turn: JudgeTurn = {
      role: "user",
      text,
      images,
      label: `${ROLE_LABEL[role]} · ${writerName} · ${formatKyivDate(new Date())}`,
    };

    const answer = await askJudge({
      phase,
      promise: {
        title: promise.title,
        details: promise.details ?? undefined,
        counterObligation: promise.condition_text ?? undefined,
        deadline: promise.due_at ? formatKyivDate(new Date(promise.due_at)) : undefined,
        openedAt: formatKyivDate(new Date(promise.created_at)),
        status: promise.status,
        visibility: promise.visibility ?? undefined,
        criteria: loaded.criteria,
        criteriaAgreed: loaded.criteriaAgreed,
        otherSide,
        promisorName: loaded.promisorName,
        counterpartyName: loaded.counterpartyName,
        writerName,
        writerRole: role,
      },
      turns: [...history, turn],
    });

    const result = answer.result;
    const criteriaResult = phase === "criteria" && "criteria" in result ? result : null;
    const verdictResult = phase === "verdict" && "verdict" in result ? result : null;

    // One insert for both rows: PostgREST fills a column missing from one row with NULL, not its
    // default, so every row lists every column.
    const emptyJudgeFields = {
      criteria: null,
      criteria_ready: null,
      verdict: null,
      confidence: null,
      reasons: null,
      model: null,
      input_tokens: null,
      output_tokens: null,
      approves_message_id: null,
      in_absentia: false,
    };
    const { error: insertError } = await admin.from("judge_messages").insert([
      {
        promise_id: promise.id,
        author_id: user.id,
        author_role: role,
        phase,
        content: text || "(evidence only)",
        evidence_notes: result.evidence_notes,
        ...emptyJudgeFields,
      },
      {
        promise_id: promise.id,
        author_id: null,
        author_role: "judge",
        phase,
        content: result.reply,
        evidence_notes: [],
        criteria: criteriaResult?.criteria.length ? criteriaResult.criteria : null,
        criteria_ready: criteriaResult ? criteriaResult.ready : null,
        verdict: verdictResult?.verdict ?? null,
        confidence: verdictResult?.confidence ?? null,
        reasons: verdictResult?.reasons ?? null,
        in_absentia: Boolean(
          verdictResult && verdictResult.verdict !== "undecided" && otherWait?.overdue
        ),
        model: answer.model,
        input_tokens: answer.usage.inputTokens,
        output_tokens: answer.usage.outputTokens,
        approves_message_id: null,
      },
    ]);
    if (insertError) throw new JudgeError(`Could not save the case: ${insertError.message}`, 500);

    return NextResponse.json({ ...caseView(await loadSettledCase(promise.id, user.id)), usage: answer.usage });
  } catch (error) {
    return errorResponse(error);
  }
}
