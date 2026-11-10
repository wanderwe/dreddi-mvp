import { createHash } from "node:crypto";

// Server only: the few Telegram Bot API calls the bot makes, and the types of what Telegram sends.

export const BOT_USERNAME = "dreddi_bot";

const token = () => {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return value;
};

// The secret Telegram puts in every webhook call: derived from the token, so there is nothing more to keep.
export const webhookSecret = (botToken: string = token()) =>
  createHash("sha256").update(`dreddi-webhook:${botToken}`).digest("hex");

// A Telegram person, hashed: the bot's id (stable when the token is rotated) keeps it ours alone.
export const tgUserHash = (userId: number) => {
  const botId = token().split(":")[0];
  return createHash("sha256").update(`tg:${botId}:${userId}`).digest("hex");
};

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code: number
  ) {
    super(message);
  }
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string; error_code?: number };
  if (!data.ok) throw new TelegramError(`${method}: ${data.description ?? res.status}`, data.error_code ?? res.status);
  return data.result as T;
}

// An edit that changes nothing, or one Telegram asks to slow down: neither is worth failing over.
export const quietly = (promise: Promise<unknown>) =>
  promise.catch((error) => {
    if (error instanceof TelegramError && (/not modified/i.test(error.message) || error.code === 429)) return undefined;
    console.warn("telegram:", error instanceof Error ? error.message : error);
    return undefined;
  });

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type TgUser = { id: number; is_bot?: boolean; first_name: string; last_name?: string; username?: string; language_code?: string };
export type TgChat = { id: number; type: "private" | "group" | "supergroup" | "channel"; title?: string };
export type TgEntity = { type: string; offset: number; length: number };
export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  caption?: string;
  entities?: TgEntity[];
  reply_to_message?: TgMessage;
};
export type TgCallbackQuery = { id: string; from: TgUser; message?: TgMessage; data?: string };
export type TgChatMemberUpdated = {
  chat: TgChat;
  from: TgUser;
  old_chat_member: { status: string };
  new_chat_member: { status: string; user: TgUser };
};
export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
  my_chat_member?: TgChatMemberUpdated;
};

export type InlineButton = { text: string; callback_data?: string; url?: string };

export const displayName = (user: TgUser) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim().slice(0, 60) || (user.username ? `@${user.username}` : "?");
