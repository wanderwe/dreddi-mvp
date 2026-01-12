import { TFunction } from "@/lib/i18n/t";
import { PromiseStatus } from "@/lib/promiseStatus";

export type DuePrecision = "date" | "datetime";

export type DealListDeal = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  due_precision?: DuePrecision | null;
  creator_id: string;
  executor_id: string | null;
  outcome?: string | null;
};

type FormatDueInput = {
  dueAt: string | null;
  precision?: DuePrecision | null;
  locale: string;
  t: TFunction;
  showNoDeadline?: boolean;
};

export const formatDue = ({
  dueAt,
  precision,
  locale,
  t,
  showNoDeadline = true,
}: FormatDueInput): string | null => {
  if (!dueAt) return showNoDeadline ? t("dealList.noDeadline") : null;

  const options: Intl.DateTimeFormatOptions =
    precision === "date"
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

  const formatted = new Intl.DateTimeFormat(locale, options).format(new Date(dueAt));
  return `${t("dealList.duePrefix")}: ${formatted}`;
};

type RoleHintInput = {
  viewerUserId?: string | null;
  creatorId: string;
  executorId: string | null;
  t: TFunction;
};

export const formatRoleHint = ({
  viewerUserId,
  creatorId,
  executorId,
  t,
}: RoleHintInput): string | null => {
  if (!viewerUserId) return t("dealList.role.participant");
  if (viewerUserId === executorId) return t("dealList.role.responsible");
  if (viewerUserId === creatorId) return t("dealList.role.promised");
  return t("dealList.role.participant");
};

export const getDealStatusLabel = (status: PromiseStatus, t: TFunction): string =>
  t(`dealList.status.${status}`);
