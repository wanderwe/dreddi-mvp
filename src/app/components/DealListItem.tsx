"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";
import { DealListDeal, formatDue, formatRoleHint, getDealStatusLabel } from "@/lib/dealList";

type DealListItemProps = {
  deal: DealListDeal;
  viewerUserId?: string | null;
  locale: string;
  href?: string;
  eyebrow?: string;
  statusLabel?: string;
  statusTone?: string;
  detailContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showNoDeadline?: boolean;
};

const defaultStatusTones: Record<DealListDeal["status"], string> = {
  active: "bg-white/5 text-emerald-200 border border-white/10",
  completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
  confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
  disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
};

export const DealListItem = ({
  deal,
  viewerUserId,
  locale,
  href,
  eyebrow,
  statusLabel,
  statusTone,
  detailContent,
  rightContent,
  showNoDeadline = true,
}: DealListItemProps) => {
  const t = useT();
  const roleHint = formatRoleHint({
    viewerUserId,
    creatorId: deal.creator_id,
    executorId: deal.executor_id,
    t,
  });
  const dueText = formatDue({
    dueAt: deal.due_at,
    precision: deal.due_precision,
    locale,
    t,
    showNoDeadline,
  });
  const subline = [roleHint, dueText].filter(Boolean).join(" · ");
  const resolvedStatusLabel = statusLabel ?? getDealStatusLabel(deal.status, t);
  const statusClasses = statusTone ?? defaultStatusTones[deal.status] ?? "bg-white/5 text-white";
  const title = href ? (
    <Link href={href} className="text-lg font-semibold text-white transition hover:text-emerald-100">
      {deal.title}
    </Link>
  ) : (
    <span className="text-lg font-semibold text-white">{deal.title}</span>
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <div className="text-sm uppercase tracking-[0.18em] text-emerald-200">{eyebrow}</div>
        ) : null}
        {title}
        {subline ? <div className="text-sm text-slate-300">{subline}</div> : null}
        {deal.outcome ? (
          <div className="text-xs text-slate-400">
            {t("dealList.outcomeLabel")}: {deal.outcome}
          </div>
        ) : null}
        {detailContent}
      </div>
      <div className="flex flex-col items-end gap-2 text-right text-sm text-slate-200">
        <span className={`rounded-full px-3 py-1 text-xs ${statusClasses}`}>{resolvedStatusLabel}</span>
        {rightContent}
      </div>
    </div>
  );
};
