// On time or not. The side the promise was made to settles it when they confirm (completed_on_time);
// without their word (older promises) it falls back to when the executor marked it done.
export type OnTimeInput = {
  due_at: string | null;
  completed_at: string | null;
  completed_on_time?: boolean | null;
};

export const isCompletedOnTime = ({ due_at, completed_at, completed_on_time }: OnTimeInput) => {
  if (!due_at) return false;
  if (completed_on_time === true || completed_on_time === false) return completed_on_time;
  if (!completed_at) return false;
  return new Date(completed_at).getTime() <= new Date(due_at).getTime();
};

// What the confirming side's answer means: before the deadline, or marked done before it, is on time
// whatever they pick; after it, their answer decides (none: unknown, the old rule applies).
export const resolveConfirmedOnTime = (
  promise: { due_at: string | null; completed_at: string | null },
  answer: boolean | undefined,
  now: Date = new Date()
): boolean | null => {
  if (!promise.due_at) return null;
  const due = new Date(promise.due_at).getTime();
  if (now.getTime() <= due) return true;
  if (promise.completed_at && new Date(promise.completed_at).getTime() <= due) return true;
  return typeof answer === "boolean" ? answer : null;
};
