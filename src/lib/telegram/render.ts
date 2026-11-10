import type { QuickLang } from "../ai/quickVerdict";
import { CHAT_LIMITS, CLOSE_OPTIONS, countSides, majorityRight, type ChatDisputeRow, type ChatPosition, type ChatSideRow, type CloseOption } from "../chatDisputes/state";
import { localizePath } from "../i18n/routing";
import { escapeHtml, type InlineButton } from "./api";
import { closeTime, textsFor } from "./texts";

// What the bot's messages look like: no network or database here.

export type TgDispute = Omit<ChatDisputeRow, "status"> & { status: ChatDisputeRow["status"] | "draft" };

// The positions are spelled out where there are no side buttons to show them: the draft, and once closed.
const head = (dispute: Pick<ChatDisputeRow, "lang" | "question" | "position_1" | "position_2">, withPositions: boolean) => {
  const t = textsFor(dispute.lang);
  const lines = [`<b>${escapeHtml(t.title)}</b>`, "", `<b>${escapeHtml(dispute.question)}</b>`];
  if (withPositions) lines.push("", `1. ${escapeHtml(dispute.position_1)}`, `2. ${escapeHtml(dispute.position_2)}`);
  return lines.join("\n");
};

export function draftMessage(dispute: TgDispute) {
  const t = textsFor(dispute.lang);
  const button = (option: CloseOption | "cancel"): InlineButton => ({
    text: option === "cancel" ? t.cancel : t.close[option],
    callback_data: `d:${dispute.token}:${option}`,
  });
  return {
    text: [head(dispute, true), "", escapeHtml(t.whenClose), `<i>${escapeHtml(t.decides(dispute.tg_creator_name ?? ""))}</i>`].join("\n"),
    reply_markup: { inline_keyboard: [CLOSE_OPTIONS.map(button), [button("cancel")]] },
  };
}

export function disputeMessage(dispute: TgDispute, count: number, stage: "open" | "thinking" | "closed") {
  const t = textsFor(dispute.lang);
  const footer =
    stage === "thinking"
      ? t.thinking
      : stage === "closed"
        ? t.counterClosed(count)
        : dispute.closes_at
          ? t.counter(count, closeTime(dispute.closes_at, dispute.lang))
          : t.counterManual(count, dispute.tg_creator_name ?? "");
  const lines = [head(dispute, stage !== "open"), ""];
  if (stage === "open") lines.push(escapeHtml(t.pickSide), "");
  lines.push(escapeHtml(footer));
  const keyboard =
    stage === "open"
      ? [
          [{ text: t.sideButton(dispute.position_1), callback_data: `s:${dispute.token}:1` }],
          [{ text: t.sideButton(dispute.position_2), callback_data: `s:${dispute.token}:2` }],
          // Cancel until there are enough people for a verdict, then close.
          [{ text: count < CHAT_LIMITS.minSides ? t.cancel : t.closeButton, callback_data: `x:${dispute.token}` }],
        ]
      : [];
  return { text: lines.join("\n"), reply_markup: { inline_keyboard: keyboard } };
}

// Telegram counts a caption's visible characters, without the tags.
const CAPTION_MAX = 1024;
const visible = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot);/g, "_").length;

// The verdict: the card picture with the split, and under it who is right, Dreddi's answer, the majority
// and the strongest argument; the why folded away, opened with a tap. Buttons to the page and to share.
export function verdictMessage(
  dispute: Pick<ChatDisputeRow, "lang" | "verdict" | "position_1" | "position_2" | "token" | "question">,
  sides: Pick<ChatSideRow, "id" | "position" | "argument" | "nickname">[],
  siteUrl: string
) {
  const lang: QuickLang = dispute.lang;
  const t = textsFor(lang);
  const verdict = dispute.verdict!;
  const counts = countSides(sides);
  const total = counts[1] + counts[2];
  const headline =
    verdict.winner === "1" || verdict.winner === "2"
      ? t.winner(verdict.winner === "1" ? dispute.position_1 : dispute.position_2)
      : t[verdict.winner];

  const facts: string[] = [];
  const right = majorityRight(verdict.winner, counts);
  if (right !== null && total) {
    const majority: ChatPosition = counts[1] > counts[2] ? 1 : 2;
    const percent = Math.round((counts[majority] / total) * 100);
    const position = majority === 1 ? dispute.position_1 : dispute.position_2;
    facts.push(escapeHtml(right ? t.majorityRight(percent, position) : t.majorityWrong(percent, position)));
  }
  const bestId =
    verdict.winner === "1" ? verdict.best_argument_1 : verdict.winner === "2" ? verdict.best_argument_2 : (verdict.best_argument_1 ?? verdict.best_argument_2);
  const best = bestId ? sides.find((side) => side.id === bestId && side.argument) : null;
  if (best) facts.push(escapeHtml(t.bestArgument(best.argument as string, best.nickname)));

  const parts = [`<b>${escapeHtml(t.verdictMark)} ${escapeHtml(headline)}</b>`, escapeHtml(verdict.short_answer)];
  if (facts.length) parts.push(`<blockquote>${facts.join("\n")}</blockquote>`);
  const before = parts.join("\n\n");
  // The why goes in last, folded, cut to what the caption still has room for.
  let caption = before;
  if (verdict.explanation) {
    const room = CAPTION_MAX - visible(before) - 4;
    if (room > 80) {
      const text = verdict.explanation.length > room ? `${verdict.explanation.slice(0, room - 1).trimEnd()}…` : verdict.explanation;
      caption = `${before}\n\n<blockquote expandable>${escapeHtml(text)}</blockquote>`;
    }
  }

  const url = new URL(localizePath(`/decide/c/${dispute.token}`, lang), siteUrl).toString();
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(verdict.share_text || dispute.question)}`;
  return {
    photo: new URL(`/api/og/decide/c/${encodeURIComponent(dispute.token)}?locale=${lang}`, siteUrl).toString(),
    caption,
    reply_markup: { inline_keyboard: [[{ text: t.more, url }, { text: t.share, url: share }]] },
  };
}
