import type { QuickLang } from "@/lib/ai/quickVerdict";
import type { ChatVerdict } from "@/lib/ai/chatVerdict";

// «Хто правий?» for a chat: the rules, with no database or network here.
//   open          anyone with the link takes a side (and may change it) until it closes
//   deciding      it closed; Dreddi is writing the verdict
//   decided       the verdict is in, with the split
//   closed_empty  it closed with too few people for a verdict

export type ChatStatus = "open" | "deciding" | "decided" | "closed_empty";
export type ChatPosition = 1 | 2;

export type ChatDisputeRow = {
  id: string;
  created_at: string;
  lang: QuickLang;
  question: string;
  position_1: string;
  position_2: string;
  status: ChatStatus;
  token: string;
  closes_at: string | null;
  closed_at: string | null;
  creator_user_id: string | null;
  creator_secret_hash: string | null;
  verdict: ChatVerdict | null;
  decided_at: string | null;
  // Where it lives: on the site, or in a Telegram group (then the site only shows it).
  source?: "web" | "telegram";
  tg_chat_id?: number | null;
  tg_message_id?: number | null;
  tg_creator_name?: string | null;
  tg_shown_count?: number | null;
};

export type ChatSideRow = {
  id: string;
  dispute_id: string;
  position: ChatPosition;
  argument: string | null;
  nickname: string;
  user_id: string | null;
  secret_hash: string;
  ip_hash?: string | null;
  // A Telegram participant's nickname on the site, where their Telegram name never shows.
  web_nickname?: string | null;
  created_at: string;
};

export const CHAT_LIMITS = {
  question: 300,
  position: 200,
  argument: 280,
  // Fewer people than this: no verdict.
  minSides: 3,
  // Arguments the verdict reads at most, half from each position.
  argumentsForVerdict: 60,
  // Sides from one IP address in one dispute: a chat at home or an office shares one, a stuffed vote many.
  sidesPerIp: 20,
  // New chat disputes a day per person, and per IP address.
  perCreatorPerDay: 10,
  perIpPerDay: 30,
} as const;

export const CLOSE_OPTIONS = ["hour", "day", "manual"] as const;
export type CloseOption = (typeof CLOSE_OPTIONS)[number];

const HOUR_MS = 60 * 60 * 1000;

export const closesAtFor = (option: CloseOption, now: Date = new Date()) =>
  option === "manual" ? null : new Date(now.getTime() + (option === "hour" ? 1 : 24) * HOUR_MS).toISOString();

// Time is up (a dispute closed by hand has no time).
export const closeDue = (dispute: { status: string; closes_at: string | null }, now: Date = new Date()) =>
  dispute.status === "open" && Boolean(dispute.closes_at) && now.getTime() >= new Date(dispute.closes_at as string).getTime();

export const countSides = (sides: Pick<ChatSideRow, "position">[]) => ({
  1: sides.filter((side) => side.position === 1).length,
  2: sides.filter((side) => side.position === 2).length,
});

// Was the majority right? Only when Dreddi picked one position and the split is not even.
export function majorityRight(winner: ChatVerdict["winner"] | undefined, counts: { 1: number; 2: number }) {
  if ((winner !== "1" && winner !== "2") || counts[1] === counts[2]) return null;
  const majority = counts[1] > counts[2] ? "1" : "2";
  return winner === majority;
}

// The arguments the verdict reads: the longest (usually the most argued) from each position, at most half
// of the allowance each, in the order they came.
export function pickArguments<T extends Pick<ChatSideRow, "position" | "argument" | "created_at">>(sides: T[], max: number = CHAT_LIMITS.argumentsForVerdict) {
  const per = Math.floor(max / 2);
  const pick = (position: ChatPosition) =>
    sides
      .filter((side) => side.position === position && side.argument)
      .sort((a, b) => (b.argument?.length ?? 0) - (a.argument?.length ?? 0))
      .slice(0, per);
  return [...pick(1), ...pick(2)].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export type ChatView = {
  token: string;
  source: "web" | "telegram";
  status: ChatStatus;
  lang: QuickLang;
  question: string;
  positions: { 1: string; 2: string };
  closesAt: string | null;
  isCreator: boolean;
  total: number;
  mine: { position: ChatPosition; argument: string | null; nickname: string } | null;
  // Ready for the verdict: time is up (the page then asks for it).
  canDecideNow: boolean;
  // Only once it closed: nobody adjusts to the majority.
  split: { 1: number; 2: number; percent1: number; percent2: number } | null;
  verdict: ChatVerdict | null;
  majorityRight: boolean | null;
  // The strongest argument for each position, as Dreddi picked it.
  best: { 1: { nickname: string; text: string } | null; 2: { nickname: string; text: string } | null };
  // Everyone's arguments, once it closed.
  arguments: { position: ChatPosition; nickname: string; text: string }[];
};

export function buildChatView(
  dispute: ChatDisputeRow,
  sides: ChatSideRow[],
  me: { userId: string | null; secretHash: string },
  now: Date = new Date()
): ChatView {
  const mine = sides.find((side) => (me.userId && side.user_id === me.userId) || side.secret_hash === me.secretHash);
  const closed = dispute.status === "decided" || dispute.status === "closed_empty";
  const counts = countSides(sides);
  const total = counts[1] + counts[2];
  const verdict = dispute.status === "decided" ? dispute.verdict : null;
  const bestOf = (id: string | null | undefined) => {
    const side = id ? sides.find((row) => row.id === id && row.argument) : null;
    return side ? { nickname: side.nickname, text: side.argument as string } : null;
  };
  return {
    token: dispute.token,
    source: dispute.source ?? "web",
    status: dispute.status,
    lang: dispute.lang,
    question: dispute.question,
    positions: { 1: dispute.position_1, 2: dispute.position_2 },
    closesAt: dispute.closes_at,
    isCreator: Boolean((me.userId && dispute.creator_user_id === me.userId) || dispute.creator_secret_hash === me.secretHash),
    total,
    mine: mine ? { position: mine.position, argument: mine.argument, nickname: mine.nickname } : null,
    canDecideNow: closeDue(dispute, now),
    split: closed ? { ...counts, percent1: percent(counts[1], total), percent2: total ? 100 - percent(counts[1], total) : 0 } : null,
    verdict,
    majorityRight: verdict ? majorityRight(verdict.winner, counts) : null,
    best: { 1: bestOf(verdict?.best_argument_1), 2: bestOf(verdict?.best_argument_2) },
    arguments: closed
      ? sides
          .filter((side) => side.argument)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((side) => ({ position: side.position, nickname: side.nickname, text: side.argument as string }))
      : [],
  };
}
