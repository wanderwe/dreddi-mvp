// When a ruling by Dreddi, the AI judge, becomes binding and changes the promise status.
// A ruling is the latest judge message with a kept / not_kept verdict. It binds:
// - at once for a promise with no other side (Dreddi is the only one who checks it);
// - when every side accepted it;
// - or when nobody appealed within RULING_RESPONSE_DAYS (silence counts as acceptance).
// Any message from a side after the ruling, other than accepting it, is an appeal: the case goes on.

export const RULING_RESPONSE_DAYS = 3;
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
    else if (now.getTime() >= new Date(bindsAt).getTime()) binding = "silence";
  }

  return { rulingId: ruling.id, verdict: ruling.verdict, acceptedBy, bindsAt, appealed, binding };
}
