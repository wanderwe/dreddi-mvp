// The events the product logs (see the product_events migration). Shared by the client and the route.
export const EVENT_NAMES = [
  "promise_invite_open",
  "dispute_invite_open",
  "dispute_share",
  "dispute_card_view",
  "dispute_card_share",
  "dispute_card_start_own",
  "chat_dispute_open",
  "chat_dispute_side",
  "chat_dispute_share",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const isEventName = (value: unknown): value is EventName =>
  typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value);
