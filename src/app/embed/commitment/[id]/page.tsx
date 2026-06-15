"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import type { CommitmentStatus } from "@/lib/commitments";

type PublicCommitment = {
  id: string;
  title: string;
  deadline: string | null;
  status: CommitmentStatus;
};

const statusCardStyles: Record<CommitmentStatus, { card: string; label: string; dot: string }> = {
  active: { card: "border-amber-400/20 bg-amber-400/10", label: "text-amber-200", dot: "bg-amber-400 animate-pulse" },
  completed: { card: "border-emerald-500/15 bg-emerald-500/10", label: "text-emerald-200", dot: "bg-emerald-400" },
  failed: { card: "border-red-500/15 bg-red-500/10", label: "text-red-300", dot: "bg-red-400" },
  abandoned: { card: "border-white/8 bg-black/20", label: "text-white/40", dot: "bg-white/20" },
};

export default function EmbedCommitmentPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [goal, setGoal] = useState<PublicCommitment | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const [origin, setOrigin] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    const { documentElement: html, body } = document;
    html.style.background = "transparent";
    body.style.background = "transparent";
    body.style.minHeight = "auto";
    body.style.overflow = "hidden";
    return () => {
      html.style.background = "";
      body.style.background = "";
      body.style.minHeight = "";
      body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const postHeight = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const main = document.querySelector("main");
          const height = main
            ? Math.ceil(main.getBoundingClientRect().height)
            : Math.ceil(document.body.scrollHeight);
          window.parent.postMessage({ type: "dreddi:embed:resize", height }, "*");
        });
      });
    };
    postHeight();
    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);
    const main = document.querySelector("main");
    const ro = new ResizeObserver(postHeight);
    if (main) ro.observe(main);
    else ro.observe(document.body);
    return () => {
      window.removeEventListener("load", postHeight);
      window.removeEventListener("resize", postHeight);
      ro.disconnect();
    };
  }, [loadState]);

  useEffect(() => {
    if (!id) return setLoadState("empty");
    let active = true;
    const load = async () => {
      setLoadState("loading");
      try {
        const res = await fetch(`/api/public/commitments/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!active) return;
        if (!res.ok) return setLoadState("empty");
        const data = (await res.json()) as PublicCommitment;
        setGoal(data);
        setLoadState("ready");
      } catch {
        if (active) setLoadState("empty");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loadState !== "ready" || !goal) {
    return (
      <main className="w-full bg-transparent text-white">
        <section className="flex h-[64px] w-full max-w-[420px] items-center rounded-2xl border border-white/10 bg-[#0b0f1a]/95 px-4 text-xs text-white/50 shadow-2xl shadow-black/40">
          {loadState === "loading" ? (
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          ) : (
            t("commitments.embedWidget.unavailable")
          )}
        </section>
      </main>
    );
  }

  const cardStyle = statusCardStyles[goal.status];
  const goalPath = localizePath(`/p/commitments/${goal.id}`, locale);
  const goalUrl = origin ? `${origin}${goalPath}` : goalPath;

  let progressLabel: string;
  if (goal.status === "completed") {
    progressLabel = t("commitments.embedWidget.completed");
  } else if (goal.status === "failed") {
    progressLabel = t("commitments.embedWidget.failed");
  } else if (goal.status === "abandoned") {
    progressLabel = t("commitments.embedWidget.abandoned");
  } else if (goal.deadline && now !== null) {
    const diffMs = new Date(goal.deadline).getTime() - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) progressLabel = t("commitments.embedWidget.daysLeft", { count: diffDays });
    else if (diffDays === 0) progressLabel = t("commitments.embedWidget.dueToday");
    else progressLabel = t("commitments.embedWidget.overdue");
  } else {
    progressLabel = t("commitments.embedWidget.noDeadline");
  }

  return (
    <main className="w-full bg-transparent text-white">
      <a
        href={goalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex w-full max-w-[420px] items-center gap-3 rounded-2xl border p-4 shadow-2xl shadow-black/40 transition hover:opacity-90 ${cardStyle.card}`}
      >
        <span className="text-2xl" aria-hidden="true">
          🎯
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold text-white">{goal.title}</p>
          <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${cardStyle.label}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cardStyle.dot}`} />
            {progressLabel}
          </p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-60" aria-hidden="true" />
      </a>
    </main>
  );
}
