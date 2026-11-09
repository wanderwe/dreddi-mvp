import type { QuickLang, QuickVerdict } from "@/lib/ai/quickVerdict";

// «Дредді розсуди»: the rules of a quick dispute, with no database or network here.
//   awaiting_b         side A wrote the question and a position; waiting for side B to join and answer
//   awaiting_question  B proposed a new wording of the question; A accepts it or keeps the original
//   rebuttals          both positions are in; the first verdict is due (the name is historical)
//   deciding           Dreddi is writing the verdict, or reviewing it after the replies
//   decided            the verdict is in; each side may reply once, then Dreddi reviews it once
//   expired            B never came

export type QuickRole = "A" | "B";
export type QuickStatus = "awaiting_b" | "awaiting_question" | "rebuttals" | "deciding" | "decided" | "expired";

export type DisputeRow = {
  id: string;
  created_at: string;
  lang: QuickLang;
  question: string;
  question_proposed: string | null;
  question_confirmed_at: string | null;
  status: QuickStatus;
  invite_token: string;
  share_slug: string | null;
  positions_done_at: string | null;
  verdict: QuickVerdict | null;
  decided_at: string | null;
  first_verdict: QuickVerdict | null;
  verdict_reviewed_at: string | null;
  stake?: string | null;
  stake_promise_id?: string | null;
};

export type PartyRow = {
  id: string;
  dispute_id: string;
  role: QuickRole;
  user_id: string | null;
  nickname: string;
  secret_hash: string | null;
  position: string | null;
  rebuttal: string | null;
  rebuttal_skipped: boolean;
};

export const LIMITS = {
  question: 300,
  position: 2000,
  rebuttal: 1000,
  stake: 200,
  // B has this long to come; then the dispute expires.
  inviteDays: 7,
  // After the verdict, a side who replied waits this long for the other; then the review runs anyway.
  replyHours: 24,
  // A has this long to answer B's rewording; silence keeps the original question.
  wordingHours: 24,
  // New disputes a day per person (signed in or the same browser), and per IP address, which a mobile
  // network or an office shares among many people.
  perCreatorPerDay: 10,
  perIpPerDay: 30,
  // Verdicts a day across the whole service, as a cost cap.
  verdictsPerDay: 300,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// A trait you would show in an argument, and an animal: the animal carries the grammatical gender, so the
// nickname says nothing about the person.
const NICKNAMES: Record<QuickLang, { adjectives: string[]; animals: string[] }> = {
  uk: {
    adjectives: ["Впертий", "Принциповий", "Скептичний", "Переконаний", "Незламний", "Логічний", "Хитрий", "Безапеляційний", "Палкий", "Холоднокровний", "Допитливий", "Чесний"],
    animals: ["Борсук", "Їжак", "Лис", "Вовк", "Бобер", "Кіт", "Горобець", "Сокіл", "Ведмідь", "Заєць", "Лелека", "Пугач"],
  },
  en: {
    adjectives: ["Stubborn", "Principled", "Skeptical", "Convinced", "Unyielding", "Logical", "Cunning", "Adamant", "Fiery", "Cool-headed", "Curious", "Honest"],
    animals: ["Badger", "Hedgehog", "Fox", "Wolf", "Beaver", "Cat", "Sparrow", "Falcon", "Bear", "Hare", "Stork", "Owl"],
  },
};

export function randomNickname(lang: QuickLang, avoid?: string, random: () => number = Math.random): string {
  const { adjectives, animals } = NICKNAMES[lang];
  for (let i = 0; i < 10; i++) {
    const name = `${adjectives[Math.floor(random() * adjectives.length)]} ${animals[Math.floor(random() * animals.length)]}`;
    if (name !== avoid) return name;
  }
  return `${adjectives[0]} ${animals[0]}`;
}

// The nickname the page showed an anonymous side before they started: accepted only if it is one we make.
export function isRandomNickname(lang: QuickLang, name: unknown): name is string {
  if (typeof name !== "string") return false;
  const [adjective, animal, ...rest] = name.split(" ");
  return rest.length === 0 && NICKNAMES[lang].adjectives.includes(adjective) && NICKNAMES[lang].animals.includes(animal);
}

export const isExpired = (dispute: Pick<DisputeRow, "status" | "created_at">, now: Date = new Date()) =>
  dispute.status === "awaiting_b" && now.getTime() - new Date(dispute.created_at).getTime() > LIMITS.inviteDays * DAY_MS;

export const rebuttalDone = (party: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">) =>
  Boolean(party.rebuttal) || party.rebuttal_skipped;

// Until when the other side may still reply before the review runs on the replies already in.
export const replyDeadline = (dispute: Pick<DisputeRow, "status" | "decided_at" | "verdict_reviewed_at">) =>
  dispute.status === "decided" && dispute.decided_at && !dispute.verdict_reviewed_at
    ? new Date(new Date(dispute.decided_at).getTime() + LIMITS.replyHours * HOUR_MS).toISOString()
    : null;

// Until when A may answer B's rewording; null when not relevant. B joined at positions_done_at.
export const wordingDeadline = (dispute: Pick<DisputeRow, "status" | "positions_done_at">) =>
  dispute.status === "awaiting_question" && dispute.positions_done_at
    ? new Date(new Date(dispute.positions_done_at).getTime() + LIMITS.wordingHours * HOUR_MS).toISOString()
    : null;

export const wordingOverdue = (dispute: Pick<DisputeRow, "status" | "positions_done_at">, now: Date = new Date()) => {
  const at = wordingDeadline(dispute);
  return Boolean(at) && now.getTime() >= new Date(at as string).getTime();
};

// The first verdict is due as soon as both positions are in.
export const readyForVerdict = (dispute: Pick<DisputeRow, "status">, parties: unknown[]) =>
  dispute.status === "rebuttals" && parties.length === 2;

// The single review: at least one reply, and the other side has replied or skipped, or let a day pass.
export const readyForReview = (
  dispute: Pick<DisputeRow, "status" | "decided_at" | "verdict" | "verdict_reviewed_at">,
  parties: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">[],
  now: Date = new Date()
) => {
  if (dispute.status !== "decided" || !dispute.verdict || dispute.verdict_reviewed_at) return false;
  if (!parties.some((party) => party.rebuttal)) return false;
  if (parties.length === 2 && parties.every(rebuttalDone)) return true;
  const at = replyDeadline(dispute);
  return Boolean(at) && now.getTime() >= new Date(at as string).getTime();
};

// The verdict will not change any more: reviewed, or nobody replied (both skipped, or a day passed).
export const verdictFinal = (
  dispute: Pick<DisputeRow, "status" | "decided_at" | "verdict" | "verdict_reviewed_at">,
  parties: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">[],
  now: Date = new Date()
) => {
  if (dispute.status !== "decided" || !dispute.verdict) return false;
  if (dispute.verdict_reviewed_at) return true;
  if (parties.some((party) => party.rebuttal)) return false;
  if (parties.length === 2 && parties.every(rebuttalDone)) return true;
  const at = replyDeadline(dispute);
  return Boolean(at) && now.getTime() >= new Date(at as string).getTime();
};

// Who owes the stake: pending until the verdict is final, then the loser, or void without one.
export const stakeOutcome = (
  dispute: Pick<DisputeRow, "status" | "decided_at" | "verdict" | "verdict_reviewed_at" | "stake">,
  parties: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">[],
  now: Date = new Date()
): { state: "pending" } | { state: "void" } | { state: "lost"; loser: QuickRole } | null => {
  if (!dispute.stake) return null;
  if (!verdictFinal(dispute, parties, now)) return { state: "pending" };
  const winner = dispute.verdict?.winner;
  if (winner === "A") return { state: "lost", loser: "B" };
  if (winner === "B") return { state: "lost", loser: "A" };
  return { state: "void" };
};

// After the review: did the replies change who is right?
export const reviewOutcome = (dispute: Pick<DisputeRow, "first_verdict" | "verdict" | "verdict_reviewed_at">) =>
  !dispute.verdict_reviewed_at || !dispute.first_verdict || !dispute.verdict
    ? null
    : dispute.first_verdict.winner === dispute.verdict.winner
      ? ("unchanged" as const)
      : ("changed" as const);

export type QuickView = {
  id: string;
  status: QuickStatus;
  lang: QuickLang;
  question: string;
  questionProposed: string | null;
  myRole: QuickRole;
  saved: boolean;
  inviteToken: string | null;
  wordingDeadline: string | null;
  canDecideNow: boolean;
  // The reply round after the verdict: open until both acted or the review ran.
  replyOpen: boolean;
  replyDeadline: string | null;
  canReviewNow: boolean;
  reviewing: boolean;
  reviewOutcome: "changed" | "unchanged" | null;
  stake: string | null;
  stakeOutcome: ReturnType<typeof stakeOutcome>;
  // The promise recorded from the stake, and the invite link for a side not yet in it.
  stakePromiseId: string | null;
  stakeInviteToken?: string | null;
  shareSlug: string | null;
  verdict: QuickVerdict | null;
  parties: {
    role: QuickRole;
    nickname: string;
    position: string | null;
    rebuttal: string | null;
    rebuttalDone: boolean;
    isMe: boolean;
  }[];
};

// What one side sees. The other side's reply stays hidden until this side has replied or skipped, or the
// review ran, so nobody writes theirs after reading the other's.
export function buildView(dispute: DisputeRow, parties: PartyRow[], myRole: QuickRole, now: Date = new Date()): QuickView {
  const mine = parties.find((party) => party.role === myRole);
  const iAnswered = Boolean(mine && rebuttalDone(mine));
  const reviewing = dispute.status === "deciding" && Boolean(dispute.verdict);
  const revealAll = Boolean(dispute.verdict_reviewed_at) || reviewing;
  const roundOpen =
    dispute.status === "decided" && !dispute.verdict_reviewed_at && !(parties.length === 2 && parties.every(rebuttalDone));
  return {
    id: dispute.id,
    status: dispute.status,
    lang: dispute.lang,
    question: dispute.question,
    questionProposed: dispute.question_proposed,
    myRole,
    saved: Boolean(mine?.user_id),
    inviteToken: myRole === "A" && dispute.status === "awaiting_b" ? dispute.invite_token : null,
    wordingDeadline: wordingDeadline(dispute),
    canDecideNow: readyForVerdict(dispute, parties),
    replyOpen: roundOpen,
    replyDeadline: roundOpen ? replyDeadline(dispute) : null,
    canReviewNow: readyForReview(dispute, parties, now),
    reviewing,
    reviewOutcome: reviewOutcome(dispute),
    stake: dispute.stake ?? null,
    stakeOutcome: dispute.status === "decided" || reviewing ? stakeOutcome(dispute, parties, now) : null,
    stakePromiseId: dispute.stake_promise_id ?? null,
    shareSlug: dispute.share_slug,
    verdict: dispute.status === "decided" || reviewing ? dispute.verdict : null,
    parties: (["A", "B"] as const).flatMap((role) => {
      const party = parties.find((row) => row.role === role);
      if (!party) return [];
      const isMe = role === myRole;
      const showRebuttal = isMe || iAnswered || revealAll;
      return [
        {
          role,
          nickname: party.nickname,
          position: party.position,
          rebuttal: showRebuttal ? party.rebuttal : null,
          rebuttalDone: rebuttalDone(party),
          isMe,
        },
      ];
    }),
  };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The public card swaps a signed-in side's profile name for their public nickname, also inside the
// verdict text, where the model may have inflected it («Ігоря Андрійовича»): each word of the name
// matches with a short ending, the full name first so it becomes one nickname, not two.
export function maskNames(text: string, names: { real: string; shown: string }[]): string {
  let result = text;
  for (const { real, shown } of names) {
    const words = real.trim().split(/\s+/).filter((word) => word.length >= 3);
    if (words.length === 0) continue;
    const word = (part: string) => `${escapeRegExp(part.slice(0, Math.max(3, part.length - 1)))}\\p{L}{0,3}`;
    const edge = (body: string) => new RegExp(`(?<!\\p{L})${body}(?!\\p{L})`, "giu");
    if (words.length > 1) result = result.replace(edge(words.map(word).join("\\s+")), shown);
    for (const part of words) result = result.replace(edge(word(part)), shown);
  }
  return result;
}
