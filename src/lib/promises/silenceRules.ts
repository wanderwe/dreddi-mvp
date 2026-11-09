// When a promise marked done counts as kept although the other side never answered. No database here.
//   day 0   the other side is asked to confirm or dispute (and reminded after 1 and 3 days)
//   day 10  a final reminder, which names the date
//   day 14  still no answer: the promise counts as kept, at half weight
// A promise already hanging longer than that gets the final reminder first, then a week.

const DAY_MS = 24 * 60 * 60 * 1000;

export const SILENCE = {
  finalNoticeDays: 10,
  confirmDays: 14,
  // After the final reminder there are always at least this many days to answer.
  minNoticeDays: 3,
  // A promise that hung long before this rule existed gets this long after its final reminder.
  backlogDays: 7,
  // Reputation weight of a promise counted by silence, against 1 for a real confirmation.
  weight: 0.5,
} as const;

const plus = (iso: string | Date, days: number) => new Date(new Date(iso).getTime() + days * DAY_MS);

export type SilenceState = {
  // When the executor marked the promise done.
  completedAt: string | null;
  finalNoticeAt: string | null;
  autoConfirmAt: string | null;
};

// The final reminder is due on day 10 and is sent once.
export const finalNoticeDue = (state: SilenceState, now: Date) =>
  Boolean(state.completedAt) && !state.finalNoticeAt && now >= plus(state.completedAt as string, SILENCE.finalNoticeDays);

// The date the final reminder promises: day 14, but never sooner than a few days after the reminder,
// and a week for a promise that was already overdue for it.
export const autoConfirmDate = (completedAt: string, noticeAt: Date) => {
  const late = noticeAt > plus(completedAt, SILENCE.finalNoticeDays + 1);
  if (late) return plus(noticeAt, SILENCE.backlogDays);
  const onSchedule = plus(completedAt, SILENCE.confirmDays);
  const earliest = plus(noticeAt, SILENCE.minNoticeDays);
  return onSchedule > earliest ? onSchedule : earliest;
};

// Counted only once the final reminder went out and its date has come.
export const autoConfirmDue = (state: SilenceState, now: Date) =>
  Boolean(state.finalNoticeAt && state.autoConfirmAt) && now >= new Date(state.autoConfirmAt as string);

// The date to show while waiting: the promised one once the reminder went out; before that, the date the
// reminder will promise when it goes out (day 10, or the next daily run for a promise already past it).
export const expectedAutoConfirmAt = (state: SilenceState, now: Date = new Date()) => {
  if (state.autoConfirmAt) return state.autoConfirmAt;
  if (!state.completedAt) return null;
  const dueNotice = plus(state.completedAt, SILENCE.finalNoticeDays);
  const noticeAt = now > dueNotice ? now : dueNotice;
  return autoConfirmDate(state.completedAt, noticeAt).toISOString();
};
