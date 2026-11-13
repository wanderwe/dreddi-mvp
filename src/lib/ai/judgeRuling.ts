// When a ruling by Dreddi, the AI judge, becomes binding and changes the promise status.
// A ruling is the latest judge message with a kept / not_kept verdict. Only a promise with no other side
// has one: there Dreddi is the only one who checks, and the ruling binds at once.
// With two sides a verdict is Dreddi's opinion and nothing more: the status changes only by the sides' own
// «Підтвердити виконання» and «Оскаржити», since a person who saw the result is harder to fool than a model
// shown a photo. (Until 2026-11-13 both sides could make it binding with «Приймаю рішення».)
// Any message from a side after the ruling is an appeal: the case goes on.

export const RULING_RESPONSE_DAYS = 3;
export const SILENCE_BINDS = false;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RulingSide = "promisor" | "counterparty";

export type RulingRow = {
  id: string;
  author_role: RulingSide | "judge";
  verdict: "kept" | "not_kept" | "undecided" | null;
  approves_message_id: string | null;
  created_at: string;
};

export type RulingState = {
  rulingId: string;
  verdict: "kept" | "not_kept";
  acceptedBy: RulingSide[];
  bindsAt: string;
  appealed: boolean;
  // null while pending; how it became binding otherwise.
  binding: null | "self" | "accepted" | "silence";
};

export function getRulingState(
  rows: RulingRow[],
  requiredSides: RulingSide[],
  now: Date = new Date()
): RulingState | null {
  const ruling = [...rows]
    .reverse()
    .find((row) => row.author_role === "judge" && (row.verdict === "kept" || row.verdict === "not_kept"));
  if (!ruling || (ruling.verdict !== "kept" && ruling.verdict !== "not_kept")) return null;
  if (requiredSides.includes("counterparty")) return null;

  const after = rows.slice(rows.indexOf(ruling) + 1).filter((row) => row.author_role !== "judge");
  const acceptedBy = requiredSides.filter((side) =>
    after.some((row) => row.author_role === side && row.approves_message_id === ruling.id)
  );
  const appealed = after.some((row) => row.approves_message_id !== ruling.id);
  const bindsAt = new Date(new Date(ruling.created_at).getTime() + RULING_RESPONSE_DAYS * DAY_MS).toISOString();

  let binding: RulingState["binding"] = null;
  if (!appealed) {
    if (!requiredSides.includes("counterparty")) binding = "self";
    else if (acceptedBy.length === requiredSides.length) binding = "accepted";
    else if (SILENCE_BINDS && now.getTime() >= new Date(bindsAt).getTime()) binding = "silence";
  }

  return { rulingId: ruling.id, verdict: ruling.verdict, acceptedBy, bindsAt, appealed, binding };
}

export type CriteriaRow = RulingRow & { criteria: string[] | null; criteria_ready: boolean | null };

// The criteria in force: the latest version Dreddi proposed as ready that every side approved.
export function getAgreedCriteria<T extends CriteriaRow>(rows: T[], requiredSides: RulingSide[]): T | null {
  const approvedBy = (id: string) =>
    new Set(rows.filter((row) => row.approves_message_id === id && row.author_role !== "judge").map((row) => row.author_role));
  return (
    [...rows]
      .reverse()
      .find(
        (row) =>
          row.author_role === "judge" &&
          row.criteria?.length &&
          row.criteria_ready &&
          requiredSides.every((side) => approvedBy(row.id).has(side))
      ) ?? null
  );
}

export type BindingOutcome = { verdict: "kept" | "not_kept"; how: "self" | "accepted" | "silence"; at: string };

// The record left when a ruling took effect ("ruling-binding:<how>:<verdict>"); the latest one counts.
export function getBindingOutcome(rows: (RulingRow & { content: string })[]): BindingOutcome | null {
  const marker = [...rows].reverse().find((row) => row.author_role === "judge" && row.content.startsWith("ruling-binding:"));
  if (!marker) return null;
  const [, how, verdict] = marker.content.split(":");
  if ((verdict !== "kept" && verdict !== "not_kept") || (how !== "self" && how !== "accepted" && how !== "silence")) {
    return null;
  }
  return { verdict, how, at: marker.created_at };
}
