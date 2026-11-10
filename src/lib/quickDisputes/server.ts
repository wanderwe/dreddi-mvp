import { createHash, randomBytes } from "node:crypto";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "@/lib/ai/askJudge";
import { askQuickVerdict } from "@/lib/ai/askQuickVerdict";
import { listMyChats } from "@/lib/chatDisputes/server";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
import type { NotificationType } from "@/lib/notifications/types";
import type { QuickLang } from "@/lib/ai/quickVerdict";
import {
  LIMITS,
  buildView,
  isExpired,
  isRandomNickname,
  maskNames,
  randomNickname,
  readyForReview,
  readyForVerdict,
  rebuttalDone,
  stakeOutcome,
  wordingOverdue,
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

// The same pseudo-random sequence for the same seed, so a card shows the same nickname every time.
const seededRandom = (seed: string) => {
  let state = parseInt(sha256(seed).slice(0, 8), 16) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = (bytes: number) => randomBytes(bytes).toString("base64url");

export function makeIdentity(userId: string | null, cookieToken: string | undefined, ip: string | null): Identity {
  const valid = cookieToken && /^[A-Za-z0-9_-]{32,64}$/.test(cookieToken) ? cookieToken : null;
  const token = valid ?? randomToken(32);
  return { userId, token, newToken: !valid, secretHash: sha256(token), ipHash: ip ? sha256(`ip:${ip}`) : null };
}

const DISPUTE_COLUMNS =
  "id,created_at,lang,question,question_proposed,question_confirmed_at,status,invite_token,share_slug,positions_done_at,verdict,decided_at,first_verdict,verdict_reviewed_at,stake,stake_promise_id";
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
  // A never answered B's rewording: the original question stays and the replies begin.
  if (wordingOverdue(dispute)) {
    const now = new Date().toISOString();
    const keep = { question_proposed: null, question_confirmed_at: now, positions_done_at: now, status: "rebuttals" as const };
    await admin.from("quick_disputes").update(keep).eq("id", dispute.id).eq("status", "awaiting_question");
    Object.assign(dispute, keep);
  }
  return { admin, dispute, parties: parties ?? [] };
}

async function loadForSide(id: string, identity: Identity) {
  const loaded = await loadDispute({ id });
  const me = loaded.parties.find((party) => isMine(party, identity));
  if (!me) throw new JudgeError("not_a_side", 403);
  return { ...loaded, me };
}

// Tells the signed-in sides (an anonymous one has no address) about a step in their dispute: on the
// site, and by email for the verdict and the other side's reply. Never breaks the step itself.
async function notifySides(
  dispute: Pick<DisputeRow, "id">,
  parties: Pick<PartyRow, "role" | "user_id">[],
  type: NotificationType,
  params: Record<string, string> = {},
  roles: QuickRole[] = ["A", "B"]
) {
  for (const party of parties) {
    if (!party.user_id || !roles.includes(party.role)) continue;
    try {
      await createNotification(getAdminClient(), {
        userId: party.user_id,
        promiseId: null,
        disputeId: dispute.id,
        type,
        dedupeKey: `${type}:${dispute.id}:${party.user_id}`,
        ctaUrl: `/decide/${dispute.id}`,
        priority: mapPriorityForType(type),
        params,
      });
    } catch (error) {
      console.warn("quick dispute: notification failed", { disputeId: dispute.id, type, error: String(error) });
    }
  }
}

export async function createDispute(
  identity: Identity,
  body: { lang?: unknown; question?: unknown; position?: unknown; nickname?: unknown; stake?: unknown }
) {
  const lang: QuickLang = body.lang === "en" ? "en" : "uk";
  const question = clean(body.question, LIMITS.question);
  const position = clean(body.position, LIMITS.position);
  // The stake is optional: what the loser does for the winner.
  const stake = typeof body.stake === "string" && body.stake.trim() ? clean(body.stake, LIMITS.stake) : null;
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
  if ((mine ?? 0) >= LIMITS.perCreatorPerDay || (fromIp ?? 0) >= LIMITS.perIpPerDay) {
    throw new JudgeError("daily_limit", 429);
  }

  const { data: dispute, error } = await admin
    .from("quick_disputes")
    .insert({
      lang,
      question,
      stake,
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
    stake: dispute.stake ?? null,
  };
}

// What a shared invite link shows in messengers: the question and who is calling, never the position.
export async function getInviteCard(token: string) {
  if (!/^[A-Za-z0-9_-]{20,32}$/.test(token)) return null;
  try {
    const { dispute, parties } = await loadDispute({ invite_token: token });
    return {
      question: dispute.question,
      nicknameA: parties.find((party) => party.role === "A")?.nickname ?? "",
      open: dispute.status === "awaiting_b" && !parties.some((party) => party.role === "B"),
    };
  } catch {
    return null;
  }
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
        ? { status: "awaiting_question", question_proposed: proposed, positions_done_at: now }
        : { status: "rebuttals", question_confirmed_at: now, positions_done_at: now }
    )
    .eq("id", dispute.id)
    .eq("status", "awaiting_b")
    .select("id");
  if (!moved?.length) throw new JudgeError("taken", 409);

  const nicknameB = await nicknameFor(identity, dispute.lang, sideA?.nickname, body.nickname);
  const { error } = await admin.from("quick_dispute_parties").insert({
    dispute_id: dispute.id,
    role: "B",
    user_id: identity.userId,
    secret_hash: identity.secretHash,
    nickname: nicknameB,
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
  // A reworded question waits for side A, who may well have left the page.
  if (changed && sideA) await notifySides(dispute, [sideA], "dispute_wording", { nickname: nicknameB });
  return { id: dispute.id };
}

export async function getView(id: string, identity: Identity) {
  const { admin, dispute, parties, me } = await loadForSide(id, identity);
  const view = buildView(dispute, parties, me.role);
  // The stake was recorded as a promise by the other side: this side gets its invite, unless already in it.
  if (dispute.stake_promise_id) {
    const { data: promise } = await admin
      .from("promises")
      .select("creator_id,counterparty_id,invite_token")
      .eq("id", dispute.stake_promise_id)
      .maybeSingle<{ creator_id: string; counterparty_id: string | null; invite_token: string | null }>();
    const inIt = Boolean(identity.userId && (promise?.creator_id === identity.userId || promise?.counterparty_id === identity.userId));
    view.stakeInviteToken = promise && !inIt && !promise.counterparty_id ? promise.invite_token : null;
  }
  return view;
}

// What the new-promise form needs to record the stake: the stake as the title, who keeps it, and the
// other side when they have an account. Only for a side, signed in, once the stake is lost and unrecorded.
export async function getStakePrefill(id: string, identity: Identity) {
  if (!identity.userId) throw new JudgeError("sign_in", 401);
  const { admin, dispute, parties, me } = await loadForSide(id, identity);
  const outcome = stakeOutcome(dispute, parties);
  if (outcome?.state !== "lost" || dispute.stake_promise_id) throw new JudgeError("stale", 409);
  const other = parties.find((party) => party.role !== me.role);
  let counterparty: { id: string; handle: string; display_name: string | null; avatar_url: string | null } | null = null;
  if (other?.user_id && other.user_id !== identity.userId) {
    const { data } = await admin.from("profiles").select("id,handle,display_name,avatar_url").eq("id", other.user_id).maybeSingle();
    counterparty = data ?? null;
  }
  return {
    disputeId: dispute.id,
    question: dispute.question,
    title: dispute.stake as string,
    executor: (outcome.loser === me.role ? "me" : "other") as "me" | "other",
    counterparty,
  };
}

// Checks, for the promise being created, that it really is this dispute's lost stake; returns who must
// be the other side. The link is written after the insert by linkStakePromise.
export async function checkStakePromise(disputeId: string, userId: string, executor: "me" | "other") {
  const { dispute, parties } = await loadDispute({ id: disputeId });
  const me = parties.find((party) => party.user_id === userId);
  if (!me) throw new JudgeError("not_a_side", 403);
  const outcome = stakeOutcome(dispute, parties);
  if (outcome?.state !== "lost" || dispute.stake_promise_id) throw new JudgeError("stale", 409);
  if ((outcome.loser === me.role) !== (executor === "me")) throw new JudgeError("stale", 409);
  const other = parties.find((party) => party.role !== me.role);
  return { otherUserId: other?.user_id && other.user_id !== userId ? other.user_id : null };
}

// Links a freshly created promise to its dispute, once: false when the other side recorded it first.
export async function linkStakePromise(disputeId: string, promiseId: string) {
  const { data } = await getAdminClient()
    .from("quick_disputes")
    .update({ stake_promise_id: promiseId })
    .eq("id", disputeId)
    .is("stake_promise_id", null)
    .select("id");
  return Boolean(data?.length);
}

type Action =
  | { action: "accept_question" }
  | { action: "keep_question" }
  | { action: "rebuttal"; text?: unknown }
  | { action: "skip_rebuttal" }
  | { action: "decide" }
  | { action: "review" }
  | { action: "claim"; code?: unknown }
  | { action: "claim_code" }
  | { action: "cancel" };

const CLAIM_CODE_MINUTES = 30;

// Saving after sign-in with the one-time code: the side whose code it is, still unsaved, goes to this
// user. A wrong or expired code does nothing; the caller then needs the cookie as before.
async function claimByCode(id: string, userId: string, code: unknown) {
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{20,40}$/.test(code)) return;
  await getAdminClient()
    .from("quick_dispute_parties")
    .update({ user_id: userId, claim_code_hash: null, claim_code_expires_at: null })
    .eq("dispute_id", id)
    .eq("claim_code_hash", sha256(code))
    .gt("claim_code_expires_at", new Date().toISOString())
    .is("user_id", null);
}

// A signed-in person in a browser that played anonymous sides: those disputes become theirs, so they
// follow the account to other devices.
export async function adoptBrowserDisputes(identity: Identity) {
  if (!identity.userId || identity.newToken) return;
  await getAdminClient()
    .from("quick_dispute_parties")
    .update({ user_id: identity.userId })
    .eq("secret_hash", identity.secretHash)
    .is("user_id", null);
}

export async function act(id: string, identity: Identity, body: Action) {
  if (body.action === "claim" && identity.userId) await claimByCode(id, identity.userId, body.code);
  const { admin, dispute, parties, me } = await loadForSide(id, identity);

  // Before going to sign in: a code that saves this side wherever the sign-in ends.
  if (body.action === "claim_code") {
    if (me.user_id) return { code: null };
    const code = randomToken(18);
    const { error } = await admin
      .from("quick_dispute_parties")
      .update({
        claim_code_hash: sha256(code),
        claim_code_expires_at: new Date(Date.now() + CLAIM_CODE_MINUTES * 60 * 1000).toISOString(),
      })
      .eq("id", me.id);
    // Not stored (say, before the migration): no code, saving then relies on this browser's cookie.
    return { code: error ? null : code };
  }
  const now = new Date().toISOString();

  // Side A takes the dispute back before anyone answered: it is gone, the link stops working.
  if (body.action === "cancel") {
    if (me.role !== "A" || dispute.status !== "awaiting_b" || parties.some((party) => party.role === "B")) {
      throw new JudgeError("stale", 409);
    }
    await admin.from("quick_disputes").delete().eq("id", id).eq("status", "awaiting_b");
    return { cancelled: true as const };
  }

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
    // Replies come after the verdict, once each, until the review ran.
    if (dispute.status !== "decided" || !dispute.verdict || dispute.verdict_reviewed_at || me.rebuttal || me.rebuttal_skipped) {
      throw new JudgeError("stale", 409);
    }
    await admin
      .from("quick_dispute_parties")
      .update(
        body.action === "rebuttal"
          ? { rebuttal: clean(body.text, LIMITS.rebuttal), rebuttal_at: now }
          : { rebuttal_skipped: true, rebuttal_at: now }
      )
      .eq("id", me.id);
    // A reply waits for the other side's, unless they already answered and the review runs now.
    const other = parties.find((party) => party.role !== me.role);
    if (body.action === "rebuttal" && other && !rebuttalDone(other)) {
      await notifySides(dispute, [other], "dispute_reply", { nickname: me.nickname });
    }
  } else if (body.action === "claim") {
    // Saving a dispute: the signed-in user takes over the side this browser played.
    if (!identity.userId) throw new JudgeError("sign_in", 401);
    if (!me.user_id) {
      await admin.from("quick_dispute_parties").update({ user_id: identity.userId }).eq("id", me.id).is("user_id", null);
    }
  } else if (body.action !== "decide" && body.action !== "review") {
    throw new JudgeError("unknown_action", 400);
  }

  const fresh = await loadForSide(id, identity);
  if (body.action === "decide" && readyForVerdict(fresh.dispute, fresh.parties)) await decide(fresh.dispute, fresh.parties);
  const replying = body.action === "review" || body.action === "rebuttal" || body.action === "skip_rebuttal";
  if (replying && readyForReview(fresh.dispute, fresh.parties)) await review(fresh.dispute, fresh.parties);
  return getView(id, identity);
}

// The service-wide cap counts first verdicts, reviews and chat verdicts of the last day alike.
async function checkServiceLimit() {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: verdicts }, { count: reviews }, { count: chats }] = await Promise.all([
    admin.from("quick_disputes").select("id", { count: "exact", head: true }).gte("decided_at", since),
    admin.from("quick_disputes").select("id", { count: "exact", head: true }).gte("verdict_reviewed_at", since),
    admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).gte("decided_at", since),
  ]);
  if ((verdicts ?? 0) + (reviews ?? 0) + (chats ?? 0) >= LIMITS.verdictsPerDay) throw new JudgeError("service_limit", 429);
}

const verdictInput = (dispute: DisputeRow, parties: PartyRow[]) => {
  const a = parties.find((party) => party.role === "A");
  const b = parties.find((party) => party.role === "B");
  return {
    lang: dispute.lang,
    question: dispute.question,
    nicknameA: a?.nickname ?? "A",
    nicknameB: b?.nickname ?? "B",
    positionA: a?.position ?? "",
    positionB: b?.position ?? "",
    rebuttalA: a?.rebuttal,
    rebuttalB: b?.rebuttal,
  };
};

async function decide(dispute: DisputeRow, parties: PartyRow[]) {
  const admin = getAdminClient();
  await checkServiceLimit();

  // Only one request writes the verdict: the one that moves the status to deciding.
  const { data: claimed } = await admin
    .from("quick_disputes")
    .update({ status: "deciding" })
    .eq("id", dispute.id)
    .eq("status", "rebuttals")
    .select("id");
  if (!claimed?.length) return;

  try {
    const answer = await askQuickVerdict(verdictInput(dispute, parties));
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
        // Disputes from before replies moved after the verdict already had theirs: no second round.
        ...(parties.some(rebuttalDone) ? { verdict_reviewed_at: new Date().toISOString() } : {}),
      })
      .eq("id", dispute.id);
    await notifySides(dispute, parties, "dispute_verdict", { question: dispute.question });
  } catch (error) {
    // Back to rebuttals, so the verdict can be asked for again.
    await admin.from("quick_disputes").update({ status: "rebuttals" }).eq("id", dispute.id).eq("status", "deciding");
    throw error;
  }
}

// The single review after the replies: no web search, the earlier verdict and its sources in view.
async function review(dispute: DisputeRow, parties: PartyRow[]) {
  const admin = getAdminClient();
  await checkServiceLimit();
  const { data: claimed } = await admin
    .from("quick_disputes")
    .update({ status: "deciding" })
    .eq("id", dispute.id)
    .eq("status", "decided")
    .is("verdict_reviewed_at", null)
    .select("id");
  if (!claimed?.length) return;

  try {
    const answer = await askQuickVerdict({ ...verdictInput(dispute, parties), previousVerdict: dispute.verdict });
    if (answer.verdict.injection_attempt) console.warn("quick verdict review: injection attempt", { disputeId: dispute.id });
    const { data: before } = await admin
      .from("quick_disputes")
      .select("input_tokens,output_tokens,cost_usd")
      .eq("id", dispute.id)
      .maybeSingle<{ input_tokens: number | null; output_tokens: number | null; cost_usd: number | null }>();
    await admin
      .from("quick_disputes")
      .update({
        status: "decided",
        first_verdict: dispute.verdict,
        verdict: answer.verdict,
        verdict_reviewed_at: new Date().toISOString(),
        input_tokens: (before?.input_tokens ?? 0) + answer.usage.inputTokens,
        output_tokens: (before?.output_tokens ?? 0) + answer.usage.outputTokens,
        cost_usd: Number(before?.cost_usd ?? 0) + answer.usage.costUsd,
      })
      .eq("id", dispute.id);
    await notifySides(dispute, parties, "dispute_reviewed");
  } catch (error) {
    // Back to the verdict as it was, so the review can be asked for again.
    await admin.from("quick_disputes").update({ status: "decided" }).eq("id", dispute.id).eq("status", "deciding");
    throw error;
  }
}

// The disputes of the signed-in user, and of this browser: an anonymous side finds theirs again too, chat
// disputes included.
// One page of this person's disputes, newest first, plus the totals the home page shows. Statuses of
// all of them are cheap to read; questions and verdicts only for the page.
export async function listMine(identity: Identity, page: { offset?: number; limit?: number } = {}) {
  const offset = Math.max(0, Math.floor(page.offset ?? 0));
  const limit = Math.min(50, Math.max(0, Math.floor(page.limit ?? 20)));
  const admin = getAdminClient();
  const filter = identity.userId
    ? `user_id.eq.${identity.userId},secret_hash.eq.${identity.secretHash}`
    : `secret_hash.eq.${identity.secretHash}`;
  const { data: mine } = await admin
    .from("quick_dispute_parties")
    .select("dispute_id,role,rebuttal,rebuttal_skipped")
    .or(filter)
    .returns<Pick<PartyRow, "dispute_id" | "role" | "rebuttal" | "rebuttal_skipped">[]>();
  const ids = [...new Set((mine ?? []).map((row) => row.dispute_id))];
  const [{ data: all }, { data: everyone }, chats] = await Promise.all([
    ids.length
      ? admin
          .from("quick_disputes")
          .select("id,created_at,status,verdict_reviewed_at")
          .in("id", ids)
          .returns<Pick<DisputeRow, "id" | "created_at" | "status" | "verdict_reviewed_at">[]>()
      : Promise.resolve({ data: [] as Pick<DisputeRow, "id" | "created_at" | "status" | "verdict_reviewed_at">[] }),
    ids.length
      ? admin
          .from("quick_dispute_parties")
          .select("dispute_id,role,rebuttal,rebuttal_skipped")
          .in("dispute_id", ids)
          .returns<Pick<PartyRow, "dispute_id" | "role" | "rebuttal" | "rebuttal_skipped">[]>()
      : Promise.resolve({ data: [] as Pick<PartyRow, "dispute_id" | "role" | "rebuttal" | "rebuttal_skipped">[] }),
    // Chat disputes go in the same list; a missing table (before its migration) just leaves them out.
    listMyChats(identity).catch(() => []),
  ]);
  const rows = all ?? [];
  // The next move is this side's: approve the reworded question, or answer the other side's reply to
  // the verdict before the review.
  const waitingOnMe = (row: Pick<DisputeRow, "id" | "status" | "verdict_reviewed_at">) => {
    const side = mine?.find((m) => m.dispute_id === row.id);
    if (!side) return false;
    if (row.status === "awaiting_question") return side.role === "A";
    if (row.status !== "decided" || row.verdict_reviewed_at || rebuttalDone(side)) return false;
    const other = everyone?.find((party) => party.dispute_id === row.id && party.role !== side.role);
    return Boolean(other?.rebuttal);
  };
  const combined = [
    ...rows.map((row) => ({ kind: "quick" as const, createdAt: row.created_at, row })),
    ...chats.map((chat) => ({ kind: "chat" as const, createdAt: chat.createdAt, chat })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageRows = combined.slice(offset, offset + limit);
  const totals = { total: combined.length, waiting: rows.filter(waitingOnMe).length, hasMore: offset + limit < combined.length };
  const quickIds = pageRows.flatMap((item) => (item.kind === "quick" ? [item.row.id] : []));
  const { data: details } = quickIds.length
    ? await admin
        .from("quick_disputes")
        .select("id,question,verdict")
        .in("id", quickIds)
        .returns<Pick<DisputeRow, "id" | "question" | "verdict">[]>()
    : { data: [] as Pick<DisputeRow, "id" | "question" | "verdict">[] };
  return {
    ...totals,
    disputes: pageRows.map((item) => {
      if (item.kind === "chat") return item.chat;
      const detail = details?.find((entry) => entry.id === item.row.id);
      return {
        kind: "quick" as const,
        id: item.row.id,
        createdAt: item.row.created_at,
        question: detail?.question ?? "",
        status: item.row.status,
        shortAnswer: detail?.verdict?.short_answer ?? null,
        waitingOnMe: waitingOnMe(item.row),
      };
    }),
  };
}

// The public card: the question, the nicknames and the verdict, never the positions.
export async function getPublicCard(slug: string) {
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(slug)) return null;
  const admin = getAdminClient();
  const { data: dispute } = await admin
    .from("quick_disputes")
    .select("id,status,lang,question,verdict,decided_at,verdict_reviewed_at,stake")
    .eq("share_slug", slug)
    // While the review runs the card keeps showing the verdict it had.
    .in("status", ["decided", "deciding"])
    .maybeSingle<Pick<DisputeRow, "id" | "status" | "lang" | "question" | "verdict" | "decided_at" | "verdict_reviewed_at" | "stake">>();
  if (!dispute?.verdict) return null;
  const { data: parties } = await admin
    .from("quick_dispute_parties")
    .select("id,role,nickname,user_id,rebuttal,rebuttal_skipped")
    .eq("dispute_id", dispute.id)
    .returns<{ id: string; role: QuickRole; nickname: string; user_id: string | null; rebuttal: string | null; rebuttal_skipped: boolean }[]>();
  // Anyone can open the card, and either side can share it: a signed-in side shows up under a random
  // nickname of their own here, never their profile name.
  const nickname = (role: QuickRole) => {
    const party = parties?.find((row) => row.role === role);
    if (!party) return role;
    if (!party.user_id) return party.nickname;
    const other = parties?.find((row) => row.role !== role)?.nickname;
    return randomNickname(dispute.lang, other, seededRandom(party.id));
  };
  const names = (parties ?? [])
    .filter((party) => party.user_id)
    .map((party) => ({ real: party.nickname, shown: nickname(party.role) }));
  const mask = (text: string) => maskNames(text, names);
  const verdict = dispute.verdict;
  return {
    lang: dispute.lang,
    question: mask(dispute.question),
    nicknameA: nickname("A"),
    nicknameB: nickname("B"),
    decidedAt: dispute.decided_at,
    stake: dispute.stake ? mask(dispute.stake) : null,
    stakeOutcome: stakeOutcome(dispute, parties ?? []),
    verdict: {
      ...verdict,
      short_answer: mask(verdict.short_answer),
      explanation: mask(verdict.explanation),
      nuance: verdict.nuance ? mask(verdict.nuance) : verdict.nuance,
      share_text: mask(verdict.share_text),
    },
  };
}
