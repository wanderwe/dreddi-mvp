"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Code2, MessageSquareText } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StatusPill, type StatusPillTone } from "@/app/components/ui/StatusPill";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { formatDueDate } from "@/lib/formatDueDate";
import {
  getAuthHeaders,
  type CommitmentStatus,
  type SelfCommitment,
  type SelfCommitmentUpdate,
} from "@/lib/commitments";

const statusTone: Record<CommitmentStatus, StatusPillTone> = {
  active: "attention",
  completed: "success",
  failed: "danger",
  abandoned: "neutral",
};

type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  date: string;
  kind: "system" | "update";
};

export default function CommitmentDetailPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [goal, setGoal] = useState<SelfCommitment | null>(null);
  const [updates, setUpdates] = useState<SelfCommitmentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<CommitmentStatus | null>(null);

  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [updateContent, setUpdateContent] = useState("");
  const [updateSubmitState, setUpdateSubmitState] = useState<"idle" | "saving" | "error">("idle");

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyEmbedState, setCopyEmbedState] = useState<"idle" | "copied" | "error">("idle");

  const loadGoal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const [goalResponse, updatesResponse] = await Promise.all([
        fetch(`/api/commitments/${id}`, { method: "GET", credentials: "include", headers }),
        fetch(`/api/commitments/${id}/updates`, { method: "GET", credentials: "include", headers }),
      ]);

      if (goalResponse.status === 401) {
        window.location.href = localizeLoginPath(localizePath(`/commitments/${id}`, locale), locale);
        return;
      }

      const goalPayload = await goalResponse.json().catch(() => null);
      if (!goalResponse.ok) {
        setError(typeof goalPayload?.error === "string" ? goalPayload.error : t("commitments.detail.notFound"));
        setGoal(null);
        return;
      }
      setGoal(goalPayload as SelfCommitment);

      const updatesPayload = await updatesResponse.json().catch(() => []);
      setUpdates(Array.isArray(updatesPayload) ? (updatesPayload as SelfCommitmentUpdate[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [id, locale, t]);

  useEffect(() => {
    void loadGoal();
  }, [loadGoal]);

  const handleStatusChange = async (status: CommitmentStatus) => {
    if (!goal) return;
    setActionBusy(status);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/commitments/${goal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(headers ?? {}) },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setGoal(payload as SelfCommitment);
      }
    } finally {
      setActionBusy(null);
    }
  };

  const remainingUpdateChars = 500 - updateContent.length;

  const handleSubmitUpdate = async () => {
    if (!goal) return;
    const content = updateContent.trim();
    if (content.length < 1 || content.length > 500) return;

    setUpdateSubmitState("saving");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/commitments/${goal.id}/updates`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(headers ?? {}) },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setUpdateSubmitState("error");
        return;
      }
      setUpdates((prev) => [...prev, payload as SelfCommitmentUpdate]);
      setUpdateContent("");
      setIsUpdateFormOpen(false);
      setUpdateSubmitState("idle");
    } catch {
      setUpdateSubmitState("error");
    }
  };

  const publicUrl = useMemo(() => {
    if (!goal || typeof window === "undefined") return "";
    const path = localizePath(`/p/commitments/${goal.id}`, locale);
    return `${window.location.origin}${path}`;
  }, [goal, locale]);

  const embedUrl = useMemo(() => {
    if (!goal || typeof window === "undefined") return "";
    const path = localizePath(`/embed/commitment/${goal.id}`, locale);
    return `${window.location.origin}${path}`;
  }, [goal, locale]);

  const embedCode = useMemo(() => {
    if (!embedUrl) return "";
    return `<iframe
  src="${embedUrl}"
  width="100%"
  height="180"
  style="border:0;border-radius:24px;overflow:hidden"
  loading="lazy"
  scrolling="no"
></iframe>`;
  }, [embedUrl]);

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const handleCopyEmbed = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopyEmbedState("copied");
      window.setTimeout(() => setCopyEmbedState("idle"), 1800);
    } catch {
      setCopyEmbedState("error");
      window.setTimeout(() => setCopyEmbedState("idle"), 1800);
    }
  };

  const timeline: TimelineItem[] = useMemo(() => {
    if (!goal) return [];
    const items: TimelineItem[] = [
      {
        id: "created",
        title: t("commitments.timeline.created"),
        description: t("commitments.timeline.createdDescription"),
        date: goal.created_at,
        kind: "system",
      },
    ];

    if (goal.status !== "active" && goal.completed_at) {
      items.push({
        id: "status",
        title: t(`commitments.timeline.${goal.status}`),
        description: t(`commitments.timeline.${goal.status}Description`),
        date: goal.completed_at,
        kind: "system",
      });
    }

    for (const update of updates) {
      items.push({
        id: update.id,
        title: t("commitments.timeline.update"),
        description: update.content,
        date: update.created_at,
        kind: "update",
      });
    }

    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [goal, updates, t]);

  if (loading) {
    return (
      <main className="relative">
        <div className="relative mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6 sm:py-10">
          <div className="h-8 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="relative">
        <div className="relative mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6 sm:py-10">
          <LocalizedLink
            href="/commitments"
            className="inline-flex text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            ← {t("commitments.detail.back")}
          </LocalizedLink>
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error || t("commitments.detail.notFound")}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative">
      <div className="relative mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <LocalizedLink
          href="/commitments"
          className="inline-flex text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          ← {t("commitments.detail.back")}
        </LocalizedLink>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-white">{goal.title}</h1>
            <StatusPill label={t(`commitments.dashboard.status.${goal.status}`)} tone={statusTone[goal.status]} />
          </div>
          {goal.description && <p className="mt-3 text-sm text-slate-300">{goal.description}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>{t(`commitments.dashboard.visibility.${goal.visibility}`)}</span>
            <span>
              {goal.deadline
                ? t("commitments.dashboard.deadline", { date: formatDueDate(goal.deadline, locale) ?? "" })
                : t("commitments.dashboard.noDeadline")}
            </span>
          </div>

          {goal.status === "active" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                label={t("commitments.detail.actions.markCompleted")}
                onClick={() => handleStatusChange("completed")}
                busy={actionBusy === "completed"}
              />
              <ActionButton
                label={t("commitments.detail.actions.markFailed")}
                onClick={() => handleStatusChange("failed")}
                busy={actionBusy === "failed"}
              />
              <ActionButton
                label={t("commitments.detail.actions.markAbandoned")}
                onClick={() => handleStatusChange("abandoned")}
                busy={actionBusy === "abandoned"}
              />
            </div>
          )}
        </div>

        {goal.visibility === "public" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white">{t("commitments.detail.embedSection.title")}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LocalizedLink
                href={`/p/commitments/${goal.id}`}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-emerald-100 transition hover:border-emerald-300/40"
              >
                {t("commitments.detail.embedSection.viewPublic")}
              </LocalizedLink>
              <Tooltip
                label={
                  copyState === "copied"
                    ? t("commitments.detail.embedSection.copied")
                    : copyState === "error"
                      ? t("commitments.detail.embedSection.copyFailed")
                      : t("commitments.detail.embedSection.copyLink")
                }
                placement="top"
              >
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-transparent text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
                >
                  {copyState === "copied" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                </button>
              </Tooltip>
              <Tooltip
                label={
                  copyEmbedState === "copied"
                    ? t("commitments.detail.embedSection.embedCodeCopied")
                    : copyEmbedState === "error"
                      ? t("commitments.detail.embedSection.copyFailed")
                      : t("commitments.detail.embedSection.copyEmbed")
                }
                placement="top"
              >
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-transparent text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
                >
                  {copyEmbedState === "copied" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t("commitments.timeline.title")}</h2>
            {!isUpdateFormOpen && (
              <button
                type="button"
                onClick={() => setIsUpdateFormOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
              >
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                {t("commitments.timeline.updates.add")}
              </button>
            )}
          </div>

          {isUpdateFormOpen && (
            <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
              <label className="text-sm font-semibold text-emerald-50" htmlFor="goal-update">
                {t("commitments.timeline.updates.label")}
              </label>
              <textarea
                id="goal-update"
                value={updateContent}
                onChange={(e) => setUpdateContent(e.target.value)}
                maxLength={500}
                rows={4}
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/15"
                placeholder={t("commitments.timeline.updates.placeholder")}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">
                  {t("commitments.timeline.updates.helper", { count: String(remainingUpdateChars) })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdateFormOpen(false);
                      setUpdateContent("");
                      setUpdateSubmitState("idle");
                    }}
                    className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10"
                  >
                    {t("commitments.timeline.updates.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitUpdate}
                    disabled={updateSubmitState === "saving" || updateContent.trim().length === 0}
                    className="cursor-pointer rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updateSubmitState === "saving"
                      ? t("commitments.timeline.updates.saving")
                      : t("commitments.timeline.updates.publish")}
                  </button>
                </div>
              </div>
              {updateSubmitState === "error" && (
                <p className="mt-2 text-xs text-red-300">{t("commitments.timeline.updates.error")}</p>
              )}
            </div>
          )}

          <ol className="mt-4 space-y-3">
            {timeline.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{item.title}</span>
                  <span>{formatDueDate(item.date, locale, { includeYear: true, includeTime: true })}</span>
                </div>
                {item.description && <p className="mt-1 text-sm text-slate-300">{item.description}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}

function ActionButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white/85 transition hover:border-emerald-300/40 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
