import { formatDueDate } from "@/lib/formatDueDate";
import type { PromiseStatus } from "@/lib/promiseStatus";

export type DealMetaLabels = {
  created: (date: string) => string;
  due: (date: string) => string;
  closed: (date: string) => string;
};

export type DealMetaInput = {
  status: PromiseStatus;
  due_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  disputed_at?: string | null;
  declined_at?: string | null;
};

const formatDateTimeShort = (value: string, locale: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dateText = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
    const timeText = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${dateText}, ${timeText}`;
  } catch {
    return value;
  }
};

const isClosedStatus = (status: PromiseStatus) =>
  status === "confirmed" || status === "disputed" || status === "declined";

const resolveClosedAt = (deal: DealMetaInput): string | null => {
  if (deal.status === "confirmed") {
    return deal.confirmed_at ?? deal.completed_at ?? deal.created_at ?? null;
  }
  if (deal.status === "disputed") {
    return deal.disputed_at ?? deal.completed_at ?? deal.created_at ?? null;
  }
  if (deal.status === "declined") {
    return deal.declined_at ?? deal.created_at ?? null;
  }
  return null;
};

export const formatDealMeta = (deal: DealMetaInput, locale: string, labels: DealMetaLabels) => {
  if (isClosedStatus(deal.status)) {
    const closedAt = resolveClosedAt(deal);
    if (closedAt) {
      return labels.closed(formatDateTimeShort(closedAt, locale));
    }
  }

  if (deal.due_at) {
    const formatted = formatDueDate(deal.due_at, locale, { includeYear: false, includeTime: true });
    return labels.due(formatted ?? deal.due_at);
  }

  if (deal.created_at) {
    return labels.created(formatDateTimeShort(deal.created_at, locale));
  }

  return "";
};
