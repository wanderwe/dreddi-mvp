import { createHash, randomBytes } from "node:crypto";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "@/lib/ai/askJudge";
import { askQuickVerdict } from "@/lib/ai/askQuickVerdict";
import type { QuickLang } from "@/lib/ai/quickVerdict";
import {
  LIMITS,
  buildView,
  isExpired,
  isRandomNickname,
  randomNickname,
  readyForVerdict,
  type DisputeRow,
  type PartyRow,
  type QuickRole,
} from "./state";

// Server only: «Дредді розсуди» in the database. Only the service role touches these tables.
// A side is a signed-in user, or an anonymous browser known by a random token in an httpOnly cookie.

export const SECRET_COOKIE = "dreddi_qd";
export const SECRET_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Identity = {
  userId: string | null;
  // The browser token (new ones must be set as the cookie by the route) and its hash.
  token: string;
  newToken: boolean;
  secretHash: string;
  ipHash: string | null;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = (bytes: number) => randomBytes(bytes).toString("base64url");

export function makeIdentity(userId: string | null, cookieToken: string | undefined, ip: string | null): Identity {
  const valid = cookieToken && /^[A-Za-z0-9_-]{32,64}$/.test(cookieToken) ? cookieToken : null;
  const token = valid ?? randomToken(32);
  return { userId, token, newToken: !valid, secretHash: sha256(token), ipHash: ip ? sha256(`ip:${ip}`) : null };
}

const DISPUTE_COLUMNS =
  "id,created_at,lang,question,question_proposed,question_confirmed_at,status,invite_token,share_slug,positions_done_at,verdict,decided_at";
const PARTY_COLUMNS = "id,dispute_id,role,user_id,nickname,secret_hash,position,rebuttal,rebuttal_skipped";

const clean = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new JudgeError("empty", 400);
  if (text.length > max) throw new JudgeError("too_long", 400);
  return text;
};

async function nicknameFor(identity: Identity, lang: QuickLang, avoid?: string, requested?: unknown) {
  if (identity.userId) {
    const { data } = await getAdminClient()
      .from("profiles")
      .select("display_name,handle")
      .eq("id", identity.userId)
      .maybeSingle<{ display_name: string | null; handle: string | null }>();
    const name = data?.display_name?.trim() || (data?.handle ? `@${data.handle}` : "");
    if (name && name !== avoid) return name.slice(0, 60);
  }
  if (isRandomNickname(lang, requested) && requested !== avoid) return requested;
  return randomNickname(lang, avoid);
}

const isMine = (party: PartyRow, identity: Identity) =>
  (identity.userId !== null && party.user_id === identity.userId) || party.secret_hash === identity.secretHash;

async function loadDispute(where: { id: string } | { invite_token: string }) {
  const admin = getAdminClient();
  const [column, value] = "id" in where ? ["id", where.id] : ["invite_token", where.invite_token];
  const { data: dispute, error } = await admin.from("quick_disputes").select(DISPUTE_COLUMNS).eq(column, value).maybeSingle<DisputeRow>();
  if (error) throw new JudgeError(`Lookup failed: ${error.message}`, 500);
  if (!dispute) throw new JudgeError("not_found", 404);
  const { data: parties } = await admin
    .from("quick_dispute_parties")
    .select(PARTY_COLUMNS)
    .eq("dispute_id", dispute.id)
    .returns<PartyRow[]>();
  if (isExpired(dispute)) {
    await admin.from("quick_disputes").update({ status: "expired" }).eq("id", dispute.id).eq("status", "awaiting_b");
    dispute.status = "expired";
  }
  return { admin, dispute, parties: parties ?? [] };
}

async function loadForSide(id: string, identity: Identity) {
  const loaded = await loadDispute({ id });
  const me = loaded.parties.find((party) => isMine(party, identity));
  if (!me) throw new JudgeError("not_a_side", 403);
  return { ...loaded, me };
}

export async function createDispute(
  identity: Identity,
  body: { lang?: unknown; question?: unknown; position?: unknown; nickname?: unknown }
) {
  const lang: QuickLang = body.lang === "en" ? "en" : "uk";
  const question = clean(body.question, LIMITS.question);
  const position = clean(body.position, LIMITS.position);
  const admin = getAdminClient();
  const creatorKey = sha256(identity.userId ? `user:${identity.userId}` : `anon:${identity.secretHash}`);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: mine } = await admin
    .from("quick_disputes")
    .select("id", { count: "exact", head: true })
    .eq("creator_key", creatorKey)
    .gte("created_at", since);
  const { count: fromIp } = identity.ipHash
    ? await admin
        .from("quick_disputes")
        .select("id", { count: "exact", head: true })
        .eq("creator_ip_hash", identity.ipHash)
        .gte("created_at", since)
    : { count: 0 };
  if ((mine ?? 0) >= LIMITS.perCreatorPerDay || (fromIp ?? 0) >= LIMITS.perCreatorPerDay) {
    throw new JudgeError("daily_limit", 429);
  }

  const { data: dispute, error } = await admin
    .from("quick_disputes")
    .insert({
      lang,
      question,
      invite_token: randomToken(18),
      creator_key: creatorKey,
      creator_ip_hash: identity.ipHash,
    })
    .select(DISPUTE_COLUMNS)
    .single<DisputeRow>();
  if (error || !dispute) throw new JudgeError(`Could not create: ${error?.message}`, 500);

  const { error: partyError } = await admin.from("quick_dispute_parties").insert({
    dispute_id: dispute.id,
    role: "A",
    user_id: identity.userId,
    secret_hash: identity.secretHash,
    nickname: await nicknameFor(identity, lang, undefined, body.nickname),
    position,
    position_at: new Date().toISOString(),
  });
  if (partyError) {
    await admin.from("quick_disputes").delete().eq("id", dispute.id);
    throw new JudgeError(`Could not create: ${partyError.message}`, 500);
  }
  return { id: dispute.id };
}

// What side B sees from the invite link before answering, or where to go if they already are a side.
export async function previewInvite(token: string, identity: Identity) {
  const { dispute, parties } = await loadDispute({ invite_token: token });
  const mine = parties.find((party) => isMine(party, identity));
  const sideA = parties.find((party) => party.role === "A");
  return {
    id: dispute.id,
    status: dispute.status,
    lang: dispute.lang,
    question: dispute.question,
    nicknameA: sideA?.nickname ?? "",
    positionA: sideA?.position ?? "",
    myRole: (mine?.role ?? null) as QuickRole | null,
    open: dispute.status === "awaiting_b" && !parties.some((party) => party.role === "B"),
  };
}

// Side B joins with their position, and either confirms the question or proposes a new wording.
export async function joinDispute(
  token: string,
  identity: Identity,
  body: { position?: unknown; question?: unknown; nickname?: unknown }
) {
  const { admin, dispute, parties } = await loadDispute({ invite_token: token });
  const sideA = parties.find((party) => party.role === "A");
  if (sideA && isMine(sideA, identity)) throw new JudgeError("own_dispute", 409);
  if (dispute.status !== "awaiting_b" || parties.some((party) => party.role === "B")) throw new JudgeError("taken", 409);

  const position = clean(body.position, LIMITS.position);
  const proposed = typeof body.question === "string" && body.question.trim() ? clean(body.question, LIMITS.question) : null;
  const changed = proposed !== null && proposed !== dispute.question;
  const now = new Date().toISOString();

  // The status moves first, guarded by its old value, so two people opening the same link cannot both join.
  const { data: moved } = await admin
    .from("quick_disputes")
    .update(
      changed
        ? { status: "awaiting_question", question_proposed: proposed }
        : { status: "rebuttals", question_confirmed_at: now, positions_done_at: now }
    )
    .eq("id", dispute.id)
    .eq("status", "awaiting_b")
    .select("id");
  if (!moved?.length) throw new JudgeError("taken", 409);

  const { error } = await admin.from("quick_dispute_parties").insert({
    dispute_id: dispute.id,
    role: "B",
    user_id: identity.userId,
    secret_hash: identity.secretHash,
    nickname: await nicknameFor(identity, dispute.lang, sideA?.nickname, body.nickname),
    position,
    position_at: now,
  });
  if (error) {
    await admin
      .from("quick_disputes")
      .update({ status: "awaiting_b", question_proposed: null, question_confirmed_at: null, positions_done_at: null })
      .eq("id", dispute.id);
    throw new JudgeError(`Could not join: ${error.message}`, 500);
  }
  return { id: dispute.id };
}

export async function getView(id: string, identity: Identity) {
  const { dispute, parties, me } = await loadForSide(id, identity);
  return buildView(dispute, parties, me.role);
}

type Action =
  | { action: "accept_question" }
  | { action: "keep_question" }
  | { action: "rebuttal"; text?: unknown }
  | { action: "skip_rebuttal" }
  | { action: "decide" }
  | { action: "claim" };

export async function act(id: string, identity: Identity, body: Action) {
  const { admin, dispute, parties, me } = await loadForSide(id, identity);
  const now = new Date().toISOString();

  if (body.action === "accept_question" || body.action === "keep_question") {
    if (me.role !== "A" || dispute.status !== "awaiting_question") throw new JudgeError("stale", 409);
    await admin
      .from("quick_disputes")
      .update({
        ...(body.action === "accept_question" && dispute.question_proposed ? { question: dispute.question_proposed } : {}),
        question_proposed: null,
        question_confirmed_at: now,
        positions_done_at: now,
        status: "rebuttals",
      })
      .eq("id", id)
      .eq("status", "awaiting_question");
  } else if (body.action === "rebuttal" || body.action === "skip_rebuttal") {
    if (dispute.status !== "rebuttals" || me.rebuttal || me.rebuttal_skipped) throw new JudgeError("stale", 409);
    await admin
      .from("quick_dispute_parties")
      .update(
        body.action === "rebuttal"
          ? { rebuttal: clean(body.text, LIMITS.rebuttal), rebuttal_at: now }
          : { rebuttal_skipped: true, rebuttal_at: now }
      )
      .eq("id", me.id);
  } else if (body.action === "claim") {
    // Saving a dispute: the signed-in user takes over the side this browser played.
    if (!identity.userId) throw new JudgeError("sign_in", 401);
    if (!me.user_id) {
      await admin.from("quick_dispute_parties").update({ user_id: identity.userId }).eq("id", me.id).is("user_id", null);
    }
  } else if (body.action !== "decide") {
    throw new JudgeError("unknown_action", 400);
  }

  const fresh = await loadForSide(id, identity);
  if (readyForVerdict(fresh.dispute, fresh.parties)) await decide(fresh.dispute, fresh.parties);
  return getView(id, identity);
}

async function decide(dispute: DisputeRow, parties: PartyRow[]) {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("quick_disputes")
    .select("id", { count: "exact", head: true })
    .gte("decided_at", since);
  if ((count ?? 0) >= LIMITS.verdictsPerDay) throw new JudgeError("service_limit", 429);

  // Only one request writes the verdict: the one that moves the status to deciding.
  const { data: claimed } = await admin
    .from("quick_disputes")
    .update({ status: "deciding" })
    .eq("id", dispute.id)
    .eq("status", "rebuttals")
    .select("id");
  if (!claimed?.length) return;

  const a = parties.find((party) => party.role === "A");
  const b = parties.find((party) => party.role === "B");
  try {
    const answer = await askQuickVerdict({
      lang: dispute.lang,
      question: dispute.question,
      nicknameA: a?.nickname ?? "A",
      nicknameB: b?.nickname ?? "B",
      positionA: a?.position ?? "",
      positionB: b?.position ?? "",
      rebuttalA: a?.rebuttal,
      rebuttalB: b?.rebuttal,
    });
    if (answer.verdict.injection_attempt) console.warn("quick verdict: injection attempt", { disputeId: dispute.id });
    await admin
      .from("quick_disputes")
      .update({
        status: "decided",
        verdict: answer.verdict,
        verdict_model: answer.model,
        input_tokens: answer.usage.inputTokens,
        output_tokens: answer.usage.outputTokens,
        web_searches: answer.usage.webSearches,
        cost_usd: answer.usage.costUsd,
        share_slug: randomToken(9),
        decided_at: new Date().toISOString(),
      })
      .eq("id", dispute.id);
  } catch (error) {
    // Back to rebuttals, so the verdict can be asked for again.
    await admin.from("quick_disputes").update({ status: "rebuttals" }).eq("id", dispute.id).eq("status", "deciding");
    throw error;
  }
}

export async function listMine(userId: string) {
  const admin = getAdminClient();
  const { data: mine } = await admin
    .from("quick_dispute_parties")
    .select("dispute_id,role")
    .eq("user_id", userId)
    .returns<{ dispute_id: string; role: QuickRole }[]>();
  const ids = (mine ?? []).map((row) => row.dispute_id);
  if (ids.length === 0) return [];
  const { data: disputes } = await admin
    .from("quick_disputes")
    .select("id,created_at,question,status,verdict,decided_at")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Pick<DisputeRow, "id" | "created_at" | "question" | "status" | "verdict" | "decided_at">[]>();
  return (disputes ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    question: row.question,
    status: row.status,
    shortAnswer: row.verdict?.short_answer ?? null,
    myRole: mine?.find((m) => m.dispute_id === row.id)?.role ?? null,
  }));
}

// The public card: the question, the nicknames and the verdict, never the positions.
export async function getPublicCard(slug: string) {
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(slug)) return null;
  const admin = getAdminClient();
  const { data: dispute } = await admin
    .from("quick_disputes")
    .select("id,lang,question,verdict,decided_at")
    .eq("share_slug", slug)
    .eq("status", "decided")
    .maybeSingle<Pick<DisputeRow, "id" | "lang" | "question" | "verdict" | "decided_at">>();
  if (!dispute?.verdict) return null;
  const { data: parties } = await admin
    .from("quick_dispute_parties")
    .select("role,nickname")
    .eq("dispute_id", dispute.id)
    .returns<{ role: QuickRole; nickname: string }[]>();
  const nickname = (role: QuickRole) => parties?.find((party) => party.role === role)?.nickname ?? role;
  return {
    lang: dispute.lang,
    question: dispute.question,
    nicknameA: nickname("A"),
    nicknameB: nickname("B"),
    decidedAt: dispute.decided_at,
    verdict: dispute.verdict,
  };
}
