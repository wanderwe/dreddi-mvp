"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Code2 } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { StatusPill, type StatusPillTone } from "@/app/components/ui/StatusPill";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { formatDueDate } from "@/lib/formatDueDate";
import type { CommitmentStatus, SelfCommitmentUpdate } from "@/lib/commitments";

type PublicCommitment = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: CommitmentStatus;
  created_at: string;
  completed_at: string | null;
  owner_display_name: string | null;
  owner_handle: string | null;
  updates: SelfCommitmentUpdate[];
};

const statusTone: Record<CommitmentStatus, StatusPillTone> = {
  active: "attention",
  completed: "success",
  failed: "danger",
  abandoned: "neutral",
};

export default function PublicCommitmentPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [goal, setGoal] = useState<PublicCommitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyEmbedState, setCopyEmbedState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/public/commitments/${id}`, { method: "GET" });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) {
          setError(t("commitments.public.errors.notPublic"));
          setGoal(null);
          return;
        }
        setGoal(payload as PublicCommitment);
      } catch {
        if (!active) return;
        setError(t("commitments.public.errors.load"));
        setGoal(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, t]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  const embedUrl = useMemo(() => {
    if (!goal?.id || typeof window === "undefined") return "";
    const path = localizePath(`/embed/commitment/${goal.id}`, locale);
    return `${window.location.origin}${path}`;
  }, [goal?.id, locale]);

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
    try {
      await navigator.clipboard.writeText(publicUrl || window.location.href);
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

  if (loading) {
    return (
      <main className="relative py-6">
        <div className="relative mx-auto w-full max-w-2xl space-y-4 px-4 sm:px-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="relative py-6">
        <div className="relative mx-auto w-full max-w-2xl space-y-4 px-4 sm:px-6">
          <h1 className="text-xl font-semibold text-white">{t("commitments.public.notPublicTitle")}</h1>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </main>
    );
  }

  const ownerName = goal.owner_display_name || goal.owner_handle || null;

  return (
    <main className="relative py-6">
      <div className="relative mx-auto w-full max-w-2xl space-y-6 px-4 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("commitments.label.goal")}</div>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-white">{goal.title}</h1>
            <StatusPill label={t(`commitments.dashboard.status.${goal.status}`)} tone={statusTone[goal.status]} />
          </div>
          {ownerName && <p className="mt-1 text-xs text-slate-400">@{ownerName}</p>}
          {goal.description && <p className="mt-3 text-sm text-slate-300">{goal.description}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>
              {goal.deadline
                ? t("commitments.dashboard.deadline", { date: formatDueDate(goal.deadline, locale) ?? "" })
                : t("commitments.dashboard.noDeadline")}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white">{t("commitments.timeline.title")}</h2>
          <ol className="mt-4 space-y-3">
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">{t("commitments.timeline.created")}</span>
                <span>{formatDueDate(goal.created_at, locale, { includeYear: true, includeTime: true })}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{t("commitments.timeline.createdDescription")}</p>
            </li>
            {goal.status !== "active" && goal.completed_at && (
              <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{t(`commitments.timeline.${goal.status}`)}</span>
                  <span>{formatDueDate(goal.completed_at, locale, { includeYear: true, includeTime: true })}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{t(`commitments.timeline.${goal.status}Description`)}</p>
              </li>
            )}
            {goal.updates.map((update) => (
              <li key={update.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{t("commitments.timeline.update")}</span>
                  <span>{formatDueDate(update.created_at, locale, { includeYear: true, includeTime: true })}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{update.content}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
