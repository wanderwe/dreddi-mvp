import { createHash, randomBytes } from "node:crypto";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "@/lib/ai/askJudge";
import { askChatVerdict } from "@/lib/ai/askChatVerdict";
import type { QuickLang } from "@/lib/ai/quickVerdict";
import { LIMITS, isRandomNickname, randomNickname } from "@/lib/quickDisputes/state";
import type { Identity } from "@/lib/quickDisputes/server";
import {
  CHAT_LIMITS,
  CLOSE_OPTIONS,
  buildChatView,
  closeDue,
  closesAtFor,
  countSides,
  pickArguments,
  type ChatDisputeRow,
  type ChatPosition,
  type ChatSideRow,
  type CloseOption,
} from "./state";

// Server only: «Хто правий?» for a chat in the database. Only the service role touches these tables.
// Anyone with the link is a participant; everyone appears under a random nickname, never a profile name.

const DISPUTE_COLUMNS =
  "id,created_at,lang,question,position_1,position_2,status,token,closes_at,closed_at,creator_user_id,creator_secret_hash,verdict,decided_at";
const SIDE_COLUMNS = "id,dispute_id,position,argument,nickname,user_id,secret_hash,ip_hash,created_at";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = (bytes: number) => randomBytes(bytes).toString("base64url");
const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new JudgeError("empty", 400);
  if (text.length > max) throw new JudgeError("too_long", 400);
  return text;
};

const validToken = (token: string) => /^[A-Za-z0-9_-]{16,32}$/.test(token);

export async function createChatDispute(
  identity: Identity,
  body: { lang?: unknown; question?: unknown; position1?: unknown; position2?: unknown; close?: unknown }
) {
  const lang: QuickLang = body.lang === "en" ? "en" : "uk";
  const question = clean(body.question, CHAT_LIMITS.question);
  const position1 = clean(body.position1, CHAT_LIMITS.position);
  const position2 = clean(body.position2, CHAT_LIMITS.position);
  const close: CloseOption = CLOSE_OPTIONS.includes(body.close as CloseOption) ? (body.close as CloseOption) : "day";
  const admin = getAdminClient();
  const creatorKey = sha256(identity.userId ? `user:${identity.userId}` : `anon:${identity.secretHash}`);
  const since = new Date(Date.now() - DAY_MS).toISOString();

  const [{ count: mine }, { count: fromIp }] = await Promise.all([
    admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).eq("creator_key", creatorKey).gte("created_at", since),
    identity.ipHash
      ? admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).eq("creator_ip_hash", identity.ipHash).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((mine ?? 0) >= CHAT_LIMITS.perCreatorPerDay || (fromIp ?? 0) >= CHAT_LIMITS.perIpPerDay) {
    throw new JudgeError("daily_limit", 429);
  }

  const { data, error } = await admin
    .from("quick_chat_disputes")
    .insert({
      lang,
      question,
      position_1: position1,
      position_2: position2,
      token: randomToken(15),
      closes_at: closesAtFor(close),
      creator_user_id: identity.userId,
      creator_secret_hash: identity.secretHash,
      creator_key: creatorKey,
      creator_ip_hash: identity.ipHash,
    })
    .select("token")
    .single<{ token: string }>();
  if (error || !data) throw new JudgeError(`Could not create: ${error?.message}`, 500);
  return { token: data.token };
}

async function load(token: string) {
  if (!validToken(token)) throw new JudgeError("not_found", 404);
  const admin = getAdminClient();
  const { data: dispute, error } = await admin
    .from("quick_chat_disputes")
    .select(DISPUTE_COLUMNS)
    .eq("token", token)
    .maybeSingle<ChatDisputeRow>();
  if (error) throw new JudgeError(`Lookup failed: ${error.message}`, 500);
  if (!dispute) throw new JudgeError("not_found", 404);
  const { data: sides } = await admin
    .from("quick_chat_sides")
    .select(SIDE_COLUMNS)
    .eq("dispute_id", dispute.id)
    .returns<ChatSideRow[]>();
  return { admin, dispute, sides: sides ?? [] };
}

const isMine = (side: Pick<ChatSideRow, "user_id" | "secret_hash">, identity: Identity) =>
  (identity.userId !== null && side.user_id === identity.userId) || side.secret_hash === identity.secretHash;

export async function getChatView(token: string, identity: Identity) {
  const { dispute, sides } = await load(token);
  return buildChatView(dispute, sides, identity);
}

type ChatAction =
  | { action: "side"; position?: unknown; nickname?: unknown }
  | { action: "argument"; text?: unknown }
  | { action: "close" }
  | { action: "decide" };

export async function actOnChat(token: string, identity: Identity, body: ChatAction) {
  const { admin, dispute, sides } = await load(token);
  const now = new Date().toISOString();

  if (body.action === "side") {
    if (dispute.status !== "open" || closeDue(dispute)) throw new JudgeError("stale", 409);
    // One tap takes a side; the argument comes after, on its own.
    const position = body.position === 1 || body.position === 2 ? (body.position as ChatPosition) : null;
    if (!position) throw new JudgeError("empty", 400);
    const mine = sides.find((side) => isMine(side, identity));
    if (mine) {
      // A switch drops the argument: it argued for the other side.
      if (mine.position !== position) {
        await admin.from("quick_chat_sides").update({ position, argument: null, updated_at: now }).eq("id", mine.id);
      }
    } else {
      const fromIp = identity.ipHash ? sides.filter((side) => side.ip_hash === identity.ipHash).length : 0;
      if (fromIp >= CHAT_LIMITS.sidesPerIp) throw new JudgeError("daily_limit", 429);
      const taken = sides.map((side) => side.nickname);
      let nickname = isRandomNickname(dispute.lang, body.nickname) && !taken.includes(body.nickname) ? body.nickname : "";
      for (let i = 0; !nickname && i < 20; i++) {
        const candidate = randomNickname(dispute.lang);
        if (!taken.includes(candidate)) nickname = candidate;
      }
      const { error } = await admin.from("quick_chat_sides").insert({
        dispute_id: dispute.id,
        position,
        nickname: nickname || randomNickname(dispute.lang),
        user_id: identity.userId,
        secret_hash: identity.secretHash,
        ip_hash: identity.ipHash,
      });
      // Two taps at once: the second finds the side the first created.
      if (error && !/duplicate|unique/i.test(error.message)) throw new JudgeError(`Could not save: ${error.message}`, 500);
    }
  } else if (body.action === "argument") {
    // Why this side: written, changed or removed while it is open.
    if (dispute.status !== "open" || closeDue(dispute)) throw new JudgeError("stale", 409);
    const mine = sides.find((side) => isMine(side, identity));
    if (!mine) throw new JudgeError("stale", 409);
    const argument = typeof body.text === "string" && body.text.trim() ? clean(body.text, CHAT_LIMITS.argument) : null;
    await admin.from("quick_chat_sides").update({ argument, updated_at: now }).eq("id", mine.id);
  } else if (body.action === "close") {
    // By hand only with enough people for a verdict: closing early must never throw the dispute away.
    const creator = (identity.userId && dispute.creator_user_id === identity.userId) || dispute.creator_secret_hash === identity.secretHash;
    if (!creator || dispute.status !== "open" || sides.length < CHAT_LIMITS.minSides) throw new JudgeError("stale", 409);
    await admin.from("quick_chat_disputes").update({ closes_at: now }).eq("id", dispute.id).eq("status", "open");
  } else if (body.action !== "decide") {
    throw new JudgeError("unknown_action", 400);
  }

  const fresh = await load(token);
  if (closeDue(fresh.dispute)) await decideChat(fresh.dispute, fresh.sides);
  return getChatView(token, identity);
}

// Verdicts a day across the whole service, chats and disputes between two people together.
async function checkServiceLimit() {
  const admin = getAdminClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [{ count: quick }, { count: reviews }, { count: chats }] = await Promise.all([
    admin.from("quick_disputes").select("id", { count: "exact", head: true }).gte("decided_at", since),
    admin.from("quick_disputes").select("id", { count: "exact", head: true }).gte("verdict_reviewed_at", since),
    admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).gte("decided_at", since),
  ]);
  if ((quick ?? 0) + (reviews ?? 0) + (chats ?? 0) >= LIMITS.verdictsPerDay) throw new JudgeError("service_limit", 429);
}

async function decideChat(dispute: ChatDisputeRow, sides: ChatSideRow[]) {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  // Too few people: it closes without a verdict, and without spending anything.
  if (sides.length < CHAT_LIMITS.minSides) {
    await admin.from("quick_chat_disputes").update({ status: "closed_empty", closed_at: now }).eq("id", dispute.id).eq("status", "open");
    return;
  }
  await checkServiceLimit();

  // Only one request writes the verdict: the one that moves the status to deciding.
  const { data: claimed } = await admin
    .from("quick_chat_disputes")
    .update({ status: "deciding", closed_at: now })
    .eq("id", dispute.id)
    .eq("status", "open")
    .select("id");
  if (!claimed?.length) return;

  try {
    const answer = await askChatVerdict({
      lang: dispute.lang,
      question: dispute.question,
      position1: dispute.position_1,
      position2: dispute.position_2,
      counts: countSides(sides),
      arguments: pickArguments(sides).map((side) => ({
        id: side.id,
        position: side.position,
        nickname: side.nickname,
        text: side.argument as string,
      })),
    });
    if (answer.verdict.injection_attempt) console.warn("chat verdict: injection attempt", { disputeId: dispute.id });
    await admin
      .from("quick_chat_disputes")
      .update({
        status: "decided",
        verdict: answer.verdict,
        verdict_model: answer.model,
        input_tokens: answer.usage.inputTokens,
        output_tokens: answer.usage.outputTokens,
        web_searches: answer.usage.webSearches,
        cost_usd: answer.usage.costUsd,
        decided_at: new Date().toISOString(),
      })
      .eq("id", dispute.id);
  } catch (error) {
    // Back to open with the time up, so the next visit asks again.
    await admin.from("quick_chat_disputes").update({ status: "open" }).eq("id", dispute.id).eq("status", "deciding");
    throw error;
  }
}

// What a shared link shows in messengers, and the page's own title: no arguments, no nicknames.
export async function getChatCard(token: string) {
  try {
    // A messenger asks right after the link is made and caches what it gets: one more try on a hiccup.
    const { dispute, sides } = await load(token).catch(async (error) => {
      if (error instanceof JudgeError && error.status === 404) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
      return load(token);
    });
    const view = buildChatView(dispute, sides, { userId: null, secretHash: "" });
    return {
      lang: dispute.lang,
      question: view.question,
      positions: view.positions,
      status: view.status,
      total: view.total,
      split: view.split,
      verdict: view.verdict,
      majorityRight: view.majorityRight,
    };
  } catch {
    return null;
  }
}

// The chat disputes this person created or took a side in, for the history list.
export async function listMyChats(identity: Identity) {
  const admin = getAdminClient();
  const sideFilter = identity.userId
    ? `user_id.eq.${identity.userId},secret_hash.eq.${identity.secretHash}`
    : `secret_hash.eq.${identity.secretHash}`;
  const creatorFilter = identity.userId
    ? `creator_user_id.eq.${identity.userId},creator_secret_hash.eq.${identity.secretHash}`
    : `creator_secret_hash.eq.${identity.secretHash}`;
  const [{ data: joined }, { data: created }] = await Promise.all([
    admin.from("quick_chat_sides").select("dispute_id").or(sideFilter).returns<{ dispute_id: string }[]>(),
    admin.from("quick_chat_disputes").select("id").or(creatorFilter).returns<{ id: string }[]>(),
  ]);
  const ids = [...new Set([...(joined ?? []).map((row) => row.dispute_id), ...(created ?? []).map((row) => row.id)])];
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("quick_chat_disputes")
    .select("token,created_at,status,question,closes_at,verdict")
    .in("id", ids)
    .returns<Pick<ChatDisputeRow, "token" | "created_at" | "status" | "question" | "closes_at" | "verdict">[]>();
  return (data ?? []).map((row) => ({
    kind: "chat" as const,
    id: row.token,
    createdAt: row.created_at,
    question: row.question,
    // Time up but nobody opened it since: it reads as closing, not open.
    status: closeDue(row) ? ("deciding" as const) : row.status,
    shortAnswer: row.verdict?.short_answer ?? null,
    waitingOnMe: false,
  }));
}
