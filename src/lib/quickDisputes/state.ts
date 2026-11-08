import type { QuickLang, QuickVerdict } from "@/lib/ai/quickVerdict";

// «Дредді розсуди»: the rules of a quick dispute, with no database or network here.
//   awaiting_b         side A wrote the question and a position; waiting for side B to join and answer
//   awaiting_question  B proposed a new wording of the question; A accepts it or keeps the original
//   rebuttals          both positions are in; each side may answer once or skip
//   deciding           Dreddi is writing the verdict
//   decided            the verdict is in
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
  // B has this long to come; then the dispute expires.
  inviteDays: 7,
  // After both positions, either side may ask for the verdict without waiting for a rebuttal.
  rebuttalHours: 24,
  // New disputes a day per person (signed in or the same browser) and per IP.
  perCreatorPerDay: 5,
  // Verdicts a day across the whole service, as a cost cap.
  verdictsPerDay: 300,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const NICKNAMES: Record<QuickLang, { adjectives: string[]; animals: string[] }> = {
  uk: {
    adjectives: ["Тихий", "Сміливий", "Мудрий", "Швидкий", "Веселий", "Хитрий", "Спокійний", "Уважний", "Бадьорий", "Добрий", "Впертий", "Чесний"],
    animals: ["Борсук", "Їжак", "Лис", "Вовк", "Бобер", "Кіт", "Горобець", "Сокіл", "Ведмідь", "Заєць", "Лелека", "Пугач"],
  },
  en: {
    adjectives: ["Quiet", "Brave", "Wise", "Swift", "Cheerful", "Clever", "Calm", "Keen", "Lively", "Kind", "Stubborn", "Honest"],
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

export const isExpired = (dispute: Pick<DisputeRow, "status" | "created_at">, now: Date = new Date()) =>
  dispute.status === "awaiting_b" && now.getTime() - new Date(dispute.created_at).getTime() > LIMITS.inviteDays * DAY_MS;

export const rebuttalDone = (party: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">) =>
  Boolean(party.rebuttal) || party.rebuttal_skipped;

// When either side may ask for the verdict without the other's rebuttal; null when not yet relevant.
export const decideNowAt = (dispute: Pick<DisputeRow, "status" | "positions_done_at">) =>
  dispute.status === "rebuttals" && dispute.positions_done_at
    ? new Date(new Date(dispute.positions_done_at).getTime() + LIMITS.rebuttalHours * HOUR_MS).toISOString()
    : null;

export const readyForVerdict = (
  dispute: Pick<DisputeRow, "status" | "positions_done_at">,
  parties: Pick<PartyRow, "rebuttal" | "rebuttal_skipped">[],
  now: Date = new Date()
) => {
  if (dispute.status !== "rebuttals") return false;
  if (parties.length === 2 && parties.every(rebuttalDone)) return true;
  const at = decideNowAt(dispute);
  return Boolean(at) && now.getTime() >= new Date(at as string).getTime();
};

export type QuickView = {
  id: string;
  status: QuickStatus;
  lang: QuickLang;
  question: string;
  questionProposed: string | null;
  myRole: QuickRole;
  saved: boolean;
  inviteToken: string | null;
  decideNowAt: string | null;
  canDecideNow: boolean;
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

// What one side sees. The other side's rebuttal stays hidden until this side has answered or skipped,
// so nobody writes theirs after reading the other's.
export function buildView(dispute: DisputeRow, parties: PartyRow[], myRole: QuickRole, now: Date = new Date()): QuickView {
  const mine = parties.find((party) => party.role === myRole);
  const iAnswered = Boolean(mine && rebuttalDone(mine));
  const revealAll = dispute.status === "deciding" || dispute.status === "decided";
  return {
    id: dispute.id,
    status: dispute.status,
    lang: dispute.lang,
    question: dispute.question,
    questionProposed: dispute.question_proposed,
    myRole,
    saved: Boolean(mine?.user_id),
    inviteToken: myRole === "A" && dispute.status === "awaiting_b" ? dispute.invite_token : null,
    decideNowAt: decideNowAt(dispute),
    canDecideNow: readyForVerdict(dispute, parties, now),
    shareSlug: dispute.share_slug,
    verdict: dispute.status === "decided" ? dispute.verdict : null,
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
