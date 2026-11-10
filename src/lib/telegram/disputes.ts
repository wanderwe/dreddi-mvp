import { createHash, randomBytes } from "node:crypto";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "@/lib/ai/askJudge";
import { parseChatDispute } from "@/lib/ai/parseChatDispute";
import { DISPUTE_COLUMNS, SIDE_COLUMNS, decideChat } from "@/lib/chatDisputes/server";
import {
  CHAT_LIMITS,
  CLOSE_OPTIONS,
  closeDue,
  closesAtFor,
  type ChatDisputeRow,
  type ChatPosition,
  type ChatSideRow,
} from "@/lib/chatDisputes/state";
import type { EventName } from "@/lib/events/names";
import { randomNickname } from "@/lib/quickDisputes/state";
import {
  BOT_USERNAME,
  displayName,
  quietly,
  tg,
  tgUserHash,
  type TgCallbackQuery,
  type TgChatMemberUpdated,
  type TgMessage,
  type TgUpdate,
} from "./api";
import { langOf, textsFor } from "./texts";
import { disputeMessage, draftMessage, verdictText, type TgDispute } from "./render";

// Server only: «Дредді, розсуди!» in a Telegram group. The dispute is a chat dispute from the site, played
// in the group: the bot's message carries the buttons, replies to it are the arguments, and the verdict
// comes back as a reply to it.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreddi.com";
const DAY_MS = 24 * 60 * 60 * 1000;
// New disputes a day: per group, and per person across groups.
export const TG_LIMITS = { perChatPerDay: 5, perUserPerDay: 3 } as const;


const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const isGroup = (message: TgMessage) => message.chat.type === "group" || message.chat.type === "supergroup";

async function logEvent(name: EventName, ref: string) {
  await getAdminClient()
    .from("product_events")
    .insert({ name, ref: ref.slice(0, 64), visitor: null })
    .then(
      () => undefined,
      () => undefined
    );
}

const editDispute = (dispute: TgDispute, message: { text: string; reply_markup: unknown }) =>
  quietly(
    tg("editMessageText", {
      chat_id: dispute.tg_chat_id,
      message_id: dispute.tg_message_id,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...message,
    })
  );

// --- Loading -------------------------------------------------------------------------------------------

async function loadBy(column: "token" | "id", value: string) {
  const admin = getAdminClient();
  const { data: dispute } = await admin.from("quick_chat_disputes").select(DISPUTE_COLUMNS).eq(column, value).maybeSingle<TgDispute>();
  if (!dispute || dispute.source !== "telegram") return null;
  const { data: sides } = await admin.from("quick_chat_sides").select(SIDE_COLUMNS).eq("dispute_id", dispute.id).returns<ChatSideRow[]>();
  return { admin, dispute, sides: sides ?? [] };
}

async function loadByMessage(chatId: number, messageId: number) {
  const { data } = await getAdminClient()
    .from("quick_chat_disputes")
    .select("token")
    .eq("tg_chat_id", chatId)
    .eq("tg_message_id", messageId)
    .maybeSingle<{ token: string }>();
  return data ? loadBy("token", data.token) : null;
}

// --- Updates -------------------------------------------------------------------------------------------

export async function handleUpdate(update: TgUpdate) {
  if (update.callback_query) return onCallback(update.callback_query);
  if (update.my_chat_member) return onMembership(update.my_chat_member);
  const message = update.message;
  if (!message?.from || message.from.is_bot) return;
  const command = commandOf(message);
  if (command) return onCommand(message, command.name, command.rest);
  if (isGroup(message) && message.reply_to_message?.from?.username === BOT_USERNAME) return onReply(message);
}

// «/dreddi текст» or «/dreddi@dreddi_bot текст»; a command for another bot is not ours.
function commandOf(message: TgMessage) {
  const text = message.text ?? "";
  const entity = message.entities?.find((item) => item.type === "bot_command" && item.offset === 0);
  if (!entity) return null;
  const [name, bot] = text.slice(1, entity.length).toLowerCase().split("@");
  if (bot && bot !== BOT_USERNAME.toLowerCase()) return null;
  return { name, rest: text.slice(entity.length).trim() };
}

async function onMembership(update: TgChatMemberUpdated) {
  const joined = ["member", "administrator"].includes(update.new_chat_member.status);
  const wasOut = ["left", "kicked"].includes(update.old_chat_member.status);
  if (!joined || !wasOut || (update.chat.type !== "group" && update.chat.type !== "supergroup")) return;
  await quietly(tg("sendMessage", { chat_id: update.chat.id, text: textsFor(langOf(update.from.language_code)).greeting }));
  await logEvent("tg_bot_added", sha256(`chat:${update.chat.id}`).slice(0, 32));
}

async function onCommand(message: TgMessage, name: string, rest: string) {
  const lang = langOf(message.from?.language_code);
  const t = textsFor(lang);
  const reply = (text: string, extra: Record<string, unknown> = {}) =>
    quietly(tg("sendMessage", { chat_id: message.chat.id, text, reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true }, ...extra }));

  if (!isGroup(message)) {
    // In a private chat: what the bot is for, and how to bring it into a group.
    return reply(t.start, { reply_markup: { inline_keyboard: [[{ text: t.addToGroup, url: `https://t.me/${BOT_USERNAME}?startgroup=true` }]] } });
  }
  if (name === "start" || name === "help") return reply(t.greeting);
  if (name !== "dreddi" && name !== "rozsudy") return;

  const context = message.reply_to_message?.text ?? message.reply_to_message?.caption ?? null;
  if (!rest && !context) return reply(t.empty);

  const from = message.from!;
  const creatorHash = tgUserHash(from.id);
  const admin = getAdminClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [{ count: inChat }, { count: byUser }] = await Promise.all([
    admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).eq("tg_chat_id", message.chat.id).gte("created_at", since),
    admin.from("quick_chat_disputes").select("id", { count: "exact", head: true }).eq("creator_key", sha256(`tg:${creatorHash}`)).gte("created_at", since),
  ]);
  if ((inChat ?? 0) >= TG_LIMITS.perChatPerDay || (byUser ?? 0) >= TG_LIMITS.perUserPerDay) return reply(t.limit);

  await quietly(tg("sendChatAction", { chat_id: message.chat.id, action: "typing" }));
  const parsed = await parseChatDispute({ lang, text: rest || context || "", context: rest ? context : null }).catch((error) => {
    console.warn("telegram parse:", error instanceof Error ? error.message : error);
    return null;
  });
  if (!parsed) return reply(t.notFound);

  const { data: dispute, error } = await admin
    .from("quick_chat_disputes")
    .insert({
      lang,
      question: parsed.question,
      position_1: parsed.position1,
      position_2: parsed.position2,
      status: "draft",
      token: randomBytes(15).toString("base64url"),
      closes_at: null,
      creator_secret_hash: creatorHash,
      creator_key: sha256(`tg:${creatorHash}`),
      source: "telegram",
      tg_chat_id: message.chat.id,
      tg_creator_name: displayName(from),
      tg_shown_count: 0,
    })
    .select(DISPUTE_COLUMNS)
    .single<TgDispute>();
  if (error || !dispute) throw new Error(`telegram draft: ${error?.message}`);

  const sent = await tg<TgMessage>("sendMessage", {
    chat_id: message.chat.id,
    parse_mode: "HTML",
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
    ...draftMessage(dispute),
  });
  await admin.from("quick_chat_disputes").update({ tg_message_id: sent.message_id }).eq("id", dispute.id);
}

async function onCallback(query: TgCallbackQuery) {
  const answer = (text?: string) => quietly(tg("answerCallbackQuery", { callback_query_id: query.id, ...(text ? { text } : {}) }));
  const [kind, token, arg] = (query.data ?? "").split(":");
  const loaded = token ? await loadBy("token", token) : null;
  if (!loaded || !query.message || query.message.chat.id !== loaded.dispute.tg_chat_id) return answer();
  const { admin, dispute, sides } = loaded;
  const t = textsFor(dispute.lang);
  const me = tgUserHash(query.from.id);
  const isCreator = dispute.creator_secret_hash === me;
  // The bot's message is the one with the buttons; it is the dispute from now on.
  const live = { ...dispute, tg_message_id: query.message.message_id };

  if (kind === "d") {
    if (dispute.status !== "draft") return answer();
    if (!isCreator) return answer(t.decides(dispute.tg_creator_name ?? ""));
    if (arg === "cancel") {
      await admin.from("quick_chat_disputes").delete().eq("id", dispute.id).eq("status", "draft");
      await quietly(tg("editMessageText", { chat_id: dispute.tg_chat_id, message_id: query.message.message_id, text: t.cancelled }));
      return answer();
    }
    const option = CLOSE_OPTIONS.find((item) => item === arg);
    if (!option) return answer();
    const closesAt = closesAtFor(option);
    const { data: opened } = await admin
      .from("quick_chat_disputes")
      .update({ status: "open", closes_at: closesAt, tg_message_id: query.message.message_id, created_at: new Date().toISOString() })
      .eq("id", dispute.id)
      .eq("status", "draft")
      .select("id");
    if (!opened?.length) return answer();
    await answer();
    await editDispute({ ...live, status: "open", closes_at: closesAt }, disputeMessage({ ...live, closes_at: closesAt }, 0, "open"));
    await logEvent("tg_dispute_create", dispute.token);
    return;
  }

  if (dispute.status !== "open") return answer(t.expired);
  if (closeDue(dispute)) {
    await answer(t.expired);
    return finishNow(live, sides);
  }

  if (kind === "s") {
    const position = (arg === "1" ? 1 : arg === "2" ? 2 : null) as ChatPosition | null;
    if (!position) return answer();
    const label = position === 1 ? dispute.position_1 : dispute.position_2;
    const mine = sides.find((side) => side.secret_hash === me);
    if (mine) {
      if (mine.position === position) return answer(t.picked(label));
      // A switch drops the argument: it argued for the other side.
      await admin.from("quick_chat_sides").update({ position, argument: null, updated_at: new Date().toISOString() }).eq("id", mine.id);
      await answer(t.switched(label));
    } else {
      const taken = sides.map((side) => side.web_nickname);
      let webNickname = randomNickname(dispute.lang);
      for (let i = 0; taken.includes(webNickname) && i < 20; i++) webNickname = randomNickname(dispute.lang);
      const { error } = await admin.from("quick_chat_sides").insert({
        dispute_id: dispute.id,
        position,
        nickname: displayName(query.from),
        web_nickname: webNickname,
        secret_hash: me,
      });
      if (error && !/duplicate|unique/i.test(error.message)) throw new Error(`telegram side: ${error.message}`);
      await answer(t.picked(label));
    }
    await logEvent("tg_dispute_side", dispute.token);
    return refreshCounter(live);
  }

  if (kind === "x") {
    if (!isCreator) return answer(t.onlyCreator(dispute.tg_creator_name ?? ""));
    if (sides.length < CHAT_LIMITS.minSides) return answer(t.tooFewToClose);
    await admin.from("quick_chat_disputes").update({ closes_at: new Date().toISOString() }).eq("id", dispute.id).eq("status", "open");
    await answer();
    return finishNow({ ...live, closes_at: new Date().toISOString() }, sides);
  }
  return answer();
}

// The group sees «Dreddi is thinking» right away; the verdict follows as a reply.
async function finishNow(dispute: TgDispute, sides: ChatSideRow[]) {
  if (sides.length >= CHAT_LIMITS.minSides) await editDispute(dispute, disputeMessage(dispute, sides.length, "thinking"));
  try {
    await decideChat({ ...dispute, closes_at: dispute.closes_at ?? new Date().toISOString() } as ChatDisputeRow, sides);
  } catch (error) {
    const t = textsFor(dispute.lang);
    const limit = error instanceof JudgeError && error.message === "service_limit";
    // Back in the group as it was: the tick tries again in a few minutes.
    await quietly(
      tg("sendMessage", {
        chat_id: dispute.tg_chat_id,
        text: limit ? t.limit : t.failed,
        reply_parameters: { message_id: dispute.tg_message_id, allow_sending_without_reply: true },
      })
    );
  }
}

// A reply to the dispute is the argument of whoever wrote it, once they took a side.
async function onReply(message: TgMessage) {
  const loaded = await loadByMessage(message.chat.id, message.reply_to_message!.message_id);
  if (!loaded || loaded.dispute.status !== "open" || closeDue(loaded.dispute)) return;
  const { admin, dispute, sides } = loaded;
  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) return;
  const from = message.from!;
  const mine = sides.find((side) => side.secret_hash === tgUserHash(from.id));
  if (!mine) {
    await quietly(
      tg("sendMessage", {
        chat_id: message.chat.id,
        text: textsFor(dispute.lang).argumentNoSide(displayName(from)),
        reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
      })
    );
    return;
  }
  const argument = text.length > CHAT_LIMITS.argument ? `${text.slice(0, CHAT_LIMITS.argument - 1)}…` : text;
  await admin.from("quick_chat_sides").update({ argument, nickname: displayName(from), updated_at: new Date().toISOString() }).eq("id", mine.id);
  await quietly(tg("setMessageReaction", { chat_id: message.chat.id, message_id: message.message_id, reaction: [{ type: "emoji", emoji: "👌" }] }));
  await logEvent("tg_dispute_argument", dispute.token);
}

// --- Counter and result ----------------------------------------------------------------------------

async function refreshCounter(dispute: TgDispute) {
  const { count } = await getAdminClient()
    .from("quick_chat_sides")
    .select("id", { count: "exact", head: true })
    .eq("dispute_id", dispute.id);
  const total = count ?? 0;
  await editDispute(dispute, disputeMessage(dispute, total, "open"));
  await getAdminClient().from("quick_chat_disputes").update({ tg_shown_count: total }).eq("id", dispute.id);
}

// The tick: a counter Telegram refused to edit in a busy minute catches up.
export async function refreshStaleCounters(limit = 20) {
  const { data } = await getAdminClient()
    .from("quick_chat_disputes")
    .select("token")
    .eq("source", "telegram")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<{ token: string }[]>();
  for (const { token } of data ?? []) {
    const loaded = await loadBy("token", token);
    if (loaded && loaded.dispute.tg_message_id && loaded.sides.length !== (loaded.dispute.tg_shown_count ?? 0)) {
      await refreshCounter(loaded.dispute);
    }
  }
}

// Called once the dispute closed: the buttons go, and the verdict (or «too few») is the reply.
export async function announceResult(disputeId: string) {
  const loaded = await loadBy("id", disputeId);
  if (!loaded?.dispute.tg_chat_id || !loaded.dispute.tg_message_id) return;
  const { dispute, sides } = loaded;
  const t = textsFor(dispute.lang);
  await editDispute(dispute, disputeMessage(dispute, sides.length, "closed"));
  const replyTo = { message_id: dispute.tg_message_id, allow_sending_without_reply: true };

  if (dispute.status === "closed_empty" || !dispute.verdict) {
    await quietly(tg("sendMessage", { chat_id: dispute.tg_chat_id, text: t.tooFew, reply_parameters: replyTo }));
    return;
  }
  await quietly(
    tg("sendMessage", {
      chat_id: dispute.tg_chat_id,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_parameters: replyTo,
      text: verdictText(dispute, sides, SITE_URL),
    })
  );
  await logEvent("tg_dispute_verdict", dispute.token);
}
