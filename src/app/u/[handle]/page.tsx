"use client";

import React from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useEffect, useId, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getLandingCopy } from "@/lib/landingCopy";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";
import { formatDealMeta } from "@/lib/formatDealMeta";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { publicProfileDetailSelect } from "@/lib/publicProfileQueries";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";
import { formatStreakLine } from "@/lib/formatStreakLine";
import { getLifetimePaceMetrics, getMonthlyPace } from "@/lib/paceMetrics";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { Code2, Copy, ExternalLink } from "lucide-react";
import PublicProfileGraph, { GraphParty, GraphEdge } from "@/components/PublicProfileGraph";

type PublicProfileRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_tags: string[] | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  completed_count: number | null;
  disputed_count: number | null;
  dispute_rate: number | null;
  last_activity_at: string | null;
  unique_counterparties_count: number | null;
  deals_with_new_people_count: number | null;
  deals_with_due_date_count: number | null;
  on_time_completion_count: number | null;
  total_confirmed_deals: number | null;
  reputation_age_days: number | null;
  avg_deals_per_month: number | null;
  completion_executor_marked_count: number | null;
  completion_executor_total_count: number | null;
  completion_reviewer_responded_count: number | null;
  completion_reviewer_total_count: number | null;
};

type PublicPromiseRow = {
  id?: string | null;
  title: string | null;
  status: string | null;
  invite_status: string | null;
  created_at: string | null;
  due_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  declined_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  creator_id?: string | null;
  promisor_id?: string | null;
  promisee_id?: string | null;
  counterparty_id?: string | null;
};

type PublicPromise = {
  id: string;
  publicAgreementId: string | null;
  sourceIndex: number;
  title: string;
  status: PromiseStatus;
  uiStatus: PromiseUiStatus;
  created_at: string;
  due_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  declined_at: string | null;
  invite_status: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
};

const PUBLIC_DEALS_PAGE_SIZE = 12;
type PublicDealsTab = "execution" | "reaction";

const normalizePublicPromiseRows = (rows: PublicPromiseRow[]): PublicPromise[] =>
  rows.flatMap((row, index) => {
    if (!row.title || !row.created_at || !isPromiseStatus(row.status)) return [];
    const uiStatus = getPromiseUiStatus({
      status: row.status,
      invite_status: row.invite_status,
      accepted_at: row.accepted_at,
      counterparty_accepted_at: row.counterparty_accepted_at,
      declined_at: row.declined_at,
      ignored_at: row.ignored_at,
      expires_at: row.expires_at,
      cancelled_at: row.cancelled_at,
    });

    if (
      uiStatus === "awaiting_acceptance" ||
      uiStatus === "cancelled_by_creator" ||
      uiStatus === "expired"
    ) {
      return [];
    }

    return [
      {
        id: row.id ?? `${row.title}-${row.created_at}-${index}`,
        publicAgreementId: row.id ?? null,
        sourceIndex: index,
        title: row.title,
        status: row.status,
        uiStatus,
        created_at: row.created_at,
        due_at: row.due_at,
        confirmed_at: row.confirmed_at,
        disputed_at: row.disputed_at,
        declined_at: row.declined_at,
        invite_status: row.invite_status,
        accepted_at: row.accepted_at,
        counterparty_accepted_at: row.counterparty_accepted_at,
        ignored_at: row.ignored_at,
        expires_at: row.expires_at,
        cancelled_at: row.cancelled_at,
      },
    ];
  });

const inferProfileIdFromPromiseRows = (rows: PublicPromiseRow[]): string | null => {
  if (rows.length === 0) return null;

  const presenceById = new Map<string, number>();

  for (const row of rows) {
    const ids = new Set(
      [row.creator_id, row.promisor_id, row.promisee_id, row.counterparty_id].filter(
        (value): value is string => Boolean(value)
      )
    );

    for (const id of ids) {
      presenceById.set(id, (presenceById.get(id) ?? 0) + 1);
    }
  }

  let inferredId: string | null = null;
  let inferredPresence = 0;

  for (const [id, presence] of presenceById.entries()) {
    if (presence > inferredPresence) {
      inferredId = id;
      inferredPresence = presence;
    }
  }

  if (!inferredId || inferredPresence < rows.length) return null;
  return inferredId;
};


// ── Social verification badge — icon with Dreddi-styled tooltip ───────────
function SocialBadge({ link }: { link: { platform: string; username: string | null; display_name: string | null; profile_url: string | null } }) {
  type Meta = { tooltip: string; color: string; href?: string; icon: React.ReactNode };

  const meta: Meta | undefined = link.platform === "twitter" ? {
    tooltip: link.username ? `Twitter / X · @${link.username} · Verified` : "Twitter / X · Verified",
    color: "text-sky-300 border-sky-400/25 bg-sky-500/10 hover:bg-sky-500/20",
    href: link.username ? `https://x.com/${link.username}` : undefined,
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  } : link.platform === "linkedin" ? {
    tooltip: link.display_name ? `LinkedIn · ${link.display_name} · Verified` : "LinkedIn · Verified",
    color: "text-blue-300 border-blue-400/25 bg-blue-500/10 hover:bg-blue-500/20",
    href: link.profile_url ?? undefined,
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  } : undefined;

  if (!meta) return null;

  const iconEl = (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${meta.color} ${meta.href ? "cursor-pointer" : "cursor-default"}`}>
      {meta.icon}
    </span>
  );

  const wrapped = meta.href ? (
    <a href={meta.href} target="_blank" rel="noopener noreferrer" aria-label={meta.tooltip}>
      {iconEl}
    </a>
  ) : iconEl;

  return (
    <Tooltip label={meta.tooltip} placement="top">
      {wrapped}
    </Tooltip>
  );
}

const getPublicProfileStats = async (handle: string) => {
  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase client is not available." },
    };
  }

  return supabase
    .from("public_profile_stats")
    .select(publicProfileDetailSelect)
    .eq("handle", handle)
    .maybeSingle();
};

const statusTones: Record<PromiseUiStatus, StatusPillTone> = {
  active: "neutral",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  declined: "danger",
  awaiting_acceptance: "neutral",
  awaiting_creator_confirmation: "attention",
  expired: "attention",
  cancelled_by_creator: "danger",
};

type PublicProfilePageProps = {
  variant?: "profile" | "embed";
};

export function PublicProfilePageView({ variant = "profile" }: PublicProfilePageProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useT();
  const locale = useLocale();
  const landingCopy = getLandingCopy(locale);
  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const backFrom = searchParams?.get("from");
  const isEmbed = variant === "embed";

  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [promisesByTab, setPromisesByTab] = useState<Record<PublicDealsTab, PublicPromise[]>>({
    execution: [],
    reaction: [],
  });
  const [activePublicDealsTab, setActivePublicDealsTab] = useState<PublicDealsTab>("execution");
  const [visiblePublicDealsByTab, setVisiblePublicDealsByTab] = useState<
    Record<PublicDealsTab, number>
  >({
    execution: PUBLIC_DEALS_PAGE_SIZE,
    reaction: PUBLIC_DEALS_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [graphParties, setGraphParties] = useState<GraphParty[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [reputationDetailsOpen, setReputationDetailsOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; username: string | null; display_name: string | null; profile_url: string | null }>>([]);
  const streakFireGradientId = useId();

  const formatRelativeTime = useMemo(() => {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return (value: string) => {
      const now = Date.now();
      const time = new Date(value).getTime();
      if (Number.isNaN(time)) return null;
      const diffMinutes = (time - now) / (1000 * 60);
      const diffHours = diffMinutes / 60;
      const diffDays = diffHours / 24;

      if (Math.abs(diffMinutes) < 60) {
        return formatter.format(Math.round(diffMinutes), "minute");
      }
      if (Math.abs(diffHours) < 24) {
        return formatter.format(Math.round(diffHours), "hour");
      }
      return formatter.format(Math.round(diffDays), "day");
    };
  }, [locale]);

  const backLink = useMemo(() => {
    if (backFrom === "profiles") {
      return { href: "/u", label: t("publicProfile.backToDirectory") };
    }
    return { href: "/u", label: t("publicProfile.backToDirectory") };
  }, [backFrom, t]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!supabase) {
        setError(t("publicProfile.errors.supabase"));
        setLoading(false);
        return;
      }

      if (!handle) {
        setError(t("publicProfile.errors.missing"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setActivePublicDealsTab("execution");

      const { data: profileRow, error: profileErr } = await getPublicProfileStats(handle);

      if (!active) return;

      if (profileErr || !profileRow) {
        setError(t("publicProfile.errors.unavailablePublic"));
        setLoading(false);
        return;
      }

      setProfile(profileRow as PublicProfileRow);
      const { data: profileIdentity } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", profileRow.handle)
        .maybeSingle();
      if (!active) return;

      // Load social verification badges
      if (profileIdentity?.id) {
        const { data: links } = await supabase
          .from("social_links")
          .select("platform,username,display_name,profile_url")
          .eq("user_id", profileIdentity.id);
        if (!active) return;
        // Fixed display order: LinkedIn → Twitter (matches Verification settings)
        const PLATFORM_ORDER = ["linkedin", "twitter"];
        const sorted = ((links as typeof socialLinks) ?? []).sort(
          (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
        );
        setSocialLinks(sorted);
      }
      if (process.env.NODE_ENV !== "production") {
        console.info("public profile on-time metrics", {
          handle: profileRow.handle,
          dealsWithDueDate: profileRow.deals_with_due_date_count,
          onTime: profileRow.on_time_completion_count,
        });
      }

      const { data, error: promisesErr } = await supabase.rpc("public_get_profile_public_promises", {
        p_handle: profileRow.handle,
        p_limit: 200,
      });
      const promiseRows = (data ?? []) as PublicPromiseRow[];

      if (!active) return;

      if (promisesErr) {
        setPromisesByTab({ execution: [], reaction: [] });
        setVisiblePublicDealsByTab({
          execution: PUBLIC_DEALS_PAGE_SIZE,
          reaction: PUBLIC_DEALS_PAGE_SIZE,
        });
      } else {
        const normalized = normalizePublicPromiseRows(promiseRows);
        const profileId = profileIdentity?.id ?? inferProfileIdFromPromiseRows(promiseRows);

        const execution = normalized.filter((promise) => {
          const source = promiseRows[promise.sourceIndex];
          if (!source || !profileId || !source.creator_id) return true;
          const executorId = resolveExecutorId({
            creator_id: source.creator_id,
            promisor_id: source.promisor_id ?? null,
            promisee_id: source.promisee_id ?? null,
            counterparty_id: source.counterparty_id ?? null,
          });
          if (!executorId) return true;
          return executorId === profileId;
        });
        const executionIds = new Set(execution.map((promise) => promise.id));
        const reaction = normalized.filter((promise) => !executionIds.has(promise.id));
        setPromisesByTab({ execution, reaction });
        setVisiblePublicDealsByTab({
          execution: PUBLIC_DEALS_PAGE_SIZE,
          reaction: PUBLIC_DEALS_PAGE_SIZE,
        });

        // ── Build agreement network graph ──────────────────────────────
        const resolvedProfileId = profileId ?? "";

        const cpIdSet = new Set<string>();
        for (const row of promiseRows) {
          for (const id of [row.creator_id, row.promisor_id, row.promisee_id, row.counterparty_id]) {
            if (id && id !== resolvedProfileId) cpIdSet.add(id);
          }
        }
        const cpIds = [...cpIdSet].slice(0, 15);

        if (cpIds.length > 0) {
          const { data: cpRows } = await supabase
            .from("profiles")
            .select("id, handle, display_name, is_public_profile")
            .in("id", cpIds);
          if (!active) return;

          const cpMap = new Map(
            (cpRows ?? []).map((cp) => [
              cp.id as string,
              {
                handle: (cp.handle as string | null) ?? "",
                display_name: (cp.display_name as string | null) ?? null,
                isPublic: Boolean(cp.is_public_profile),
              },
            ])
          );

          // Aggregate per-counterparty stats
          type CpAgg = {
            dealCount: number; fulfilled: number; disputed: number; active: number;
            recentActivity: boolean; disputedBy: "me" | "counterparty" | null;
          };
          const cpAgg = new Map<string, CpAgg>();
          for (const promise of normalized) {
            const row = promiseRows[promise.sourceIndex];
            const cpId = [row.creator_id, row.promisor_id, row.promisee_id, row.counterparty_id].find(
              (id) => id && id !== resolvedProfileId && cpIds.includes(id)
            );
            if (!cpId) continue;
            const agg = cpAgg.get(cpId) ?? {
              dealCount: 0, fulfilled: 0, disputed: 0, active: 0,
              recentActivity: false, disputedBy: null,
            };
            agg.dealCount++;
            if (promise.uiStatus === "confirmed") agg.fulfilled++;
            if (promise.uiStatus === "disputed") {
              agg.disputed++;
              if (!agg.disputedBy) {
                const executorId = row.creator_id
                  ? resolveExecutorId({
                      creator_id: row.creator_id,
                      promisor_id: row.promisor_id ?? null,
                      promisee_id: row.promisee_id ?? null,
                      counterparty_id: row.counterparty_id ?? null,
                    })
                  : null;
                agg.disputedBy = executorId === resolvedProfileId ? "counterparty" : "me";
              }
            }
            if (promise.uiStatus === "active" || promise.uiStatus === "completed_by_promisor") {
              agg.active++;
              agg.recentActivity = true;
            }
            cpAgg.set(cpId, agg);
          }

          const sortedCpIds = cpIds.filter((id) => cpAgg.has(id));
          const n = sortedCpIds.length;

          const newGraphParties: GraphParty[] = sortedCpIds.map((id, i) => {
            const agg = cpAgg.get(id)!;
            const cp = cpMap.get(id);
            const handle = cp?.handle ?? "";
            const display_name = cp?.display_name ?? null;
            const nameSrc = display_name ?? handle ?? id;
            const initials = nameSrc.replace(/^@+/, "").split(/\s+/).map((w: string) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
            return {
              id, username: handle, display_name, initials,
              isPublic: cp?.isPublic ?? false,
              dealCount: agg.dealCount, fulfilled: agg.fulfilled,
              disputed: agg.disputed, recentActivity: agg.recentActivity,
              angle: n > 0 ? (i / n) * 2 * Math.PI - Math.PI / 2 : 0,
            };
          });

          // One edge per counterparty — color encodes dispute ratio
          const newGraphEdges: GraphEdge[] = sortedCpIds.map((id) => {
            const agg = cpAgg.get(id)!;
            return {
              partyId: id,
              count: agg.dealCount, fulfilled: agg.fulfilled,
              disputed: agg.disputed, active: agg.active,
              disputedBy: agg.disputedBy,
            };
          });

          setGraphParties(newGraphParties);
          setGraphEdges(newGraphEdges);
        }

        if (
          process.env.NODE_ENV !== "production" &&
          normalized.length > 0 &&
          !profileRow.last_activity_at
        ) {
          console.info("public_profile_stats missing last_activity_at despite promises", {
            handle: profileRow.handle,
            promiseCount: normalized.length,
          });
        }
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [handle, t]);

  const handleLoadMorePublicDeals = () =>
    setVisiblePublicDealsByTab((prev) => ({
      ...prev,
      [activePublicDealsTab]: prev[activePublicDealsTab] + PUBLIC_DEALS_PAGE_SIZE,
    }));
  const handlePublicDealsTabChange = (nextTab: PublicDealsTab) => {
    if (nextTab === activePublicDealsTab) return;
    const previousScrollY = typeof window !== "undefined" ? window.scrollY : null;
    setActivePublicDealsTab(nextTab);
    if (previousScrollY === null) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: previousScrollY, behavior: "auto" });
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const identity = useMemo(
    () =>
      getPublicProfileIdentity({
        displayName: profile?.display_name,
        handle: profile?.handle,
      }),
    [profile?.display_name, profile?.handle]
  );
  const primaryLabel = identity.title || profile?.handle || "";
  const avatarLabel = primaryLabel.replace(/^@/, "");
  const profileTags = profile?.profile_tags ?? [];
  const confirmedCount = profile?.confirmed_count ?? 0;
  const disputedCount = profile?.disputed_count ?? 0;
  const reputationScore = profile?.reputation_score ?? 50;
  const totalFinalizedDeals = Math.max(
    profile?.total_confirmed_deals ?? confirmedCount,
    confirmedCount + disputedCount
  );
  const lastActivityFromPromises = useMemo(() => {
    const allPromises = [...promisesByTab.execution, ...promisesByTab.reaction];
    if (allPromises.length === 0) return null;
    const latestStatusChange = allPromises.reduce<string | null>((currentLatest, promise) => {
      const statusTimestamp = [promise.confirmed_at, promise.disputed_at].reduce<string | null>(
        (latest, timestamp) => {
          if (!timestamp) return latest;
          if (!latest) return timestamp;
          return new Date(timestamp).getTime() > new Date(latest).getTime() ? timestamp : latest;
        },
        null
      );
      if (!statusTimestamp) return currentLatest;
      if (!currentLatest) return statusTimestamp;
      return new Date(statusTimestamp).getTime() > new Date(currentLatest).getTime()
        ? statusTimestamp
        : currentLatest;
    }, null);

    if (latestStatusChange) return latestStatusChange;

    return allPromises.reduce<string | null>((currentLatest, promise) => {
      if (!promise.created_at) return currentLatest;
      if (!currentLatest) return promise.created_at;
      return new Date(promise.created_at).getTime() > new Date(currentLatest).getTime()
        ? promise.created_at
        : currentLatest;
    }, null);
  }, [promisesByTab.execution, promisesByTab.reaction]);
  const lastActivityAt = profile?.last_activity_at ?? lastActivityFromPromises;
  const publicProfilePath = useMemo(
    () => (handle ? `/${locale}/u/${encodeURIComponent(handle)}` : ""),
    [handle, locale]
  );
  const publicProfileUrl = origin && publicProfilePath ? `${origin}${publicProfilePath}` : "";
  const embedPath = useMemo(
    () => (handle ? `/${locale}/u/${encodeURIComponent(handle)}/embed` : ""),
    [handle, locale]
  );
  const embedUrl = origin && embedPath ? `${origin}${embedPath}` : "";
  const embedFrameId = useMemo(
    () => `dreddi-embed-${(handle ?? "profile").replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    [handle]
  );
  const embedCode = embedUrl
    ? `<iframe id="${embedFrameId}" src="${embedUrl}" width="420" height="1" style="border:0;overflow:hidden;" scrolling="no"></iframe>
<script>
  (function () {
    var iframe = document.getElementById("${embedFrameId}");
    if (!iframe) return;
    function onMessage(event) {
      if (!event || !event.data || event.data.type !== "dreddi:embed:resize") return;
      if (event.source !== iframe.contentWindow) return;
      var nextHeight = Number(event.data.height);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      iframe.style.height = Math.ceil(nextHeight) + "px";
      iframe.height = String(Math.ceil(nextHeight));
    }
    window.addEventListener("message", onMessage);
  })();
</script>`
    : "";

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyEmbed = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      window.setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const statusLabels: Partial<Record<PromiseUiStatus, string>> = {
    active: t("publicProfile.status.inProgress"),
    completed_by_promisor: t("publicProfile.status.awaitingOutcome"),
    confirmed: landingCopy.recentDeals.status.confirmed,
    disputed: landingCopy.recentDeals.status.disputed,
    declined: landingCopy.recentDeals.status.declined,
    awaiting_acceptance: t("promises.status.awaitingInviteAcceptance"),
    expired: t("promises.inviteStatus.expired"),
    cancelled_by_creator: t("promises.inviteStatus.cancelled_by_creator"),
  };

  const activePromises = promisesByTab[activePublicDealsTab];
  const executionCount = promisesByTab.execution.length;
  const reactionCount = promisesByTab.reaction.length;
  const publicDealsEmpty = activePromises.length === 0;
  const visiblePromises = useMemo(
    () => activePromises.slice(0, visiblePublicDealsByTab[activePublicDealsTab]),
    [activePromises, activePublicDealsTab, visiblePublicDealsByTab]
  );
  const hasMorePublicDeals = activePromises.length > visiblePublicDealsByTab[activePublicDealsTab];
  const streakCount = useMemo(() => {
    const finalizedDeals = promisesByTab.execution
      .filter((promise) => promise.status === "confirmed" || promise.status === "disputed")
      .map((promise) => ({
        status: promise.status,
        finalizedAt: promise.confirmed_at ?? promise.disputed_at,
      }))
      .filter((promise) => Boolean(promise.finalizedAt))
      .sort((a, b) => {
        const aTime = a.finalizedAt ? new Date(a.finalizedAt).getTime() : 0;
        const bTime = b.finalizedAt ? new Date(b.finalizedAt).getTime() : 0;
        return bTime - aTime;
      });

    let currentStreak = 0;
    for (const deal of finalizedDeals) {
      if (deal.status !== "confirmed") break;
      currentStreak += 1;
    }

    return currentStreak;
  }, [promisesByTab.execution]);
  const lastActivityRelative = lastActivityAt ? formatRelativeTime(lastActivityAt) : null;
  const lastActivityLabel = lastActivityAt
    ? t("publicProfile.summary.lastActivity", { time: lastActivityRelative ?? "—" })
    : t("publicProfile.summary.lastActivityEmpty");
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const paceFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale]
  );
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale]
  );
  const pluralRules = useMemo(() => new Intl.PluralRules(locale), [locale]);
  const formatPlural = (count: number, key: string) => {
    const rule = pluralRules.select(count);
    return (
      t(`publicProfile.reputationDetails.labels.${key}.${rule}`) ||
      t(`publicProfile.reputationDetails.labels.${key}.other`)
    );
  };
  const reputationEvidence = useMemo(() => {
    const totalDeals = totalFinalizedDeals;
    const workedWithDeals = profile?.completed_count ?? 0;
    const hasDeals = totalDeals > 0;
    const uniquePeople = profile?.unique_counterparties_count ?? null;
    const dealsWithDeadlines = profile?.deals_with_due_date_count ?? null;
    const onTimeCompletions = profile?.on_time_completion_count ?? null;
    const disputes = profile?.disputed_count ?? null;
    const disputeRate = profile?.dispute_rate ?? null;
    const promisePaceMetrics = getLifetimePaceMetrics([
      ...promisesByTab.execution,
      ...promisesByTab.reaction,
    ]);
    const profileActiveDays = profile?.reputation_age_days ?? null;
    const profileAvgDealsPerMonth = profile?.avg_deals_per_month;
    const hasProfilePace =
      typeof profileAvgDealsPerMonth === "number" && Number.isFinite(profileAvgDealsPerMonth);
    const completionRate = {
      completed: profile?.confirmed_count ?? 0,
      total: profile?.completion_executor_total_count ?? 0,
    };
    const completionReview = {
      responded: profile?.completion_reviewer_responded_count ?? 0,
      total: profile?.completion_reviewer_total_count ?? 0,
    };
    const completionRatePercent =
      completionRate.total > 0 ? (completionRate.completed / completionRate.total) * 100 : 0;
    const completionReviewPercent =
      completionReview.total > 0 ? (completionReview.responded / completionReview.total) * 100 : 0;
    const pace = hasProfilePace
      ? Number(profileAvgDealsPerMonth.toFixed(1))
      : profileActiveDays && profileActiveDays > 0
        ? getMonthlyPace(totalDeals, profileActiveDays)
        : promisePaceMetrics.pace;
    const activeDays =
      profileActiveDays && profileActiveDays > 0 ? profileActiveDays : promisePaceMetrics.activeDays;

    return {
      totalDeals,
      workedWithDeals,
      hasDeals,
      uniquePeople,
      dealsWithDeadlines,
      onTimeCompletions,
      disputes,
      disputeRate,
      pace,
      activeDays,
      completionRate,
      completionReview,
      completionRatePercent,
      completionReviewPercent,
    };
  }, [
    profile?.confirmed_count,
    profile?.completion_executor_total_count,
    profile?.completion_reviewer_responded_count,
    profile?.completion_reviewer_total_count,
    profile?.completed_count,
    profile?.avg_deals_per_month,
    profile?.deals_with_due_date_count,
    profile?.dispute_rate,
    profile?.disputed_count,
    profile?.on_time_completion_count,
    profile?.reputation_age_days,
    profile?.unique_counterparties_count,
    promisesByTab.execution,
    promisesByTab.reaction,
    totalFinalizedDeals,
  ]);
  const dealMetaLabels = useMemo(
    () => ({
      created: (date: string) => t("deal.meta.created", { date }),
      due: (date: string) => t("deal.meta.due", { date }),
      closed: (date: string) => t("deal.meta.closed", { date }),
    }),
    [t]
  );

  useEffect(() => {
    if (!isEmbed) return;
    const postHeight = () => {
      const nextHeight = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage({ type: "dreddi:embed:resize", height: nextHeight }, "*");
    };

    postHeight();
    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);

    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);

    return () => {
      window.removeEventListener("load", postHeight);
      window.removeEventListener("resize", postHeight);
      observer.disconnect();
    };
  }, [isEmbed, loading, error, profile?.avatar_url, primaryLabel, identity.subtitle, reputationScore, confirmedCount, disputedCount]);

  if (isEmbed) {
    return (
      <main className="w-full bg-transparent text-white">
        <section className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-[#0b0f1a]/95 p-4 shadow-2xl shadow-black/40">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-white/70">
              {t("publicProfile.loading")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-white/70">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt={primaryLabel} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-white/80">
                          {avatarLabel.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-semibold">{primaryLabel}</h1>
                      {identity.subtitle ? (
                        <p className="truncate text-sm text-white/60">{identity.subtitle}</p>
                      ) : null}
                    </div>
                  </div>
                  {publicProfilePath ? (
                    <a
                      href={publicProfileUrl || publicProfilePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-emerald-300/45 hover:bg-emerald-500/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                      aria-label={t("publicProfile.copyLink")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.15em] text-emerald-100/70">
                  {t("publicProfile.embed.verifiedBy")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                    {t("publicProfile.reputationScore")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{reputationScore}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-200">
                    {t("publicProfile.confirmed")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{confirmedCount}</p>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-amber-200">
                    {t("publicProfile.disputed")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{disputedCount}</p>
                </div>
              </div>

              <p className="text-xs text-white/50">{t("publicProfile.embed.poweredBy")}</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={`overflow-x-hidden bg-[#0b0f1a] text-white ${isEmbed ? "min-h-0" : "min-h-screen"}`}>
      <div
        className={`mx-auto flex w-full flex-col gap-8 ${isEmbed ? "max-w-md px-4 py-4" : "max-w-4xl px-6 py-10"}`}
      >
        {!isEmbed ? (
          <LocalizedLink
            href={backLink.href}
            className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
          >
            {backLink.label}
          </LocalizedLink>
        ) : null}
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {t("publicProfile.loading")}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {error}
          </div>
        ) : (
          <>
            <section
              className={`flex flex-col rounded-3xl border border-white/10 bg-white/5 ${isEmbed ? "gap-4 p-5" : "gap-6 p-8"}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={primaryLabel}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-white/80">
                        {avatarLabel.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold">{primaryLabel}</h1>
                      {socialLinks.length > 0 && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {socialLinks.map((link) => (
                            <SocialBadge key={link.platform} link={link} />
                          ))}
                        </div>
                      )}
                    </div>
                    {identity.subtitle && (
                      <p className="truncate text-sm text-white/60">{identity.subtitle}</p>
                    )}
                    {profileTags.length > 0 && (
                      <div className="mt-3 flex w-full flex-wrap justify-center gap-2 sm:justify-start">
                        {profileTags.map((tag) => (
                          <span
                            key={tag}
                            tabIndex={0}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-200/90 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!isEmbed ? (
                  <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
                    <Tooltip
                      label={copiedLink ? t("profileSettings.copySuccess") : t("publicProfile.copyLink")}
                      placement="top"
                    >
                      <span>
                        <IconButton
                          icon={<Copy className="h-4 w-4" />}
                          ariaLabel={t("publicProfile.copyLink")}
                          className="h-10 w-10 border-white/15 bg-white/5 text-white/75 hover:border-emerald-300/45 hover:bg-emerald-500/10 hover:text-emerald-100"
                          onClick={() => void handleCopyLink()}
                        />
                      </span>
                    </Tooltip>
                    <Tooltip
                      label={
                        copiedEmbed
                          ? t("profileSettings.copySuccess")
                          : t("publicProfile.copyEmbedCode")
                      }
                      placement="top"
                    >
                      <span>
                        <IconButton
                          icon={<Code2 className="h-4 w-4" />}
                          ariaLabel={t("publicProfile.copyEmbedCode")}
                          className="h-10 w-10 border-white/15 bg-white/5 text-white/75 hover:border-emerald-300/45 hover:bg-emerald-500/10 hover:text-emerald-100"
                          onClick={() => void handleCopyEmbed()}
                        />
                      </span>
                    </Tooltip>
                  </div>
                ) : null}
              </div>
              <div className="text-xs text-white/50">
                {isEmbed ? t("publicProfile.embed.verifiedBy") : lastActivityLabel}
              </div>
            </section>

            <section
              className={`rounded-3xl border border-white/10 bg-white/5 ${isEmbed ? "p-5" : "p-8"}`}
            >
              <div className={`grid gap-3 ${isEmbed ? "grid-cols-2" : "sm:grid-cols-3"}`}>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/80 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {t("publicProfile.reputationScore")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{reputationScore}</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                    {t("publicProfile.confirmed")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{confirmedCount}</div>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-50 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-200">
                    {t("publicProfile.disputed")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{disputedCount}</div>
                </div>
              </div>
              {!isEmbed ? (
                <p className="mt-3 text-xs text-white/55">{t("publicProfile.privacyNote.metrics")}</p>
              ) : null}
              {streakCount > 0 ? (
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={streakFireGradientId} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="rgb(110 231 183 / 0.8)" />
                          <stop offset="55%" stopColor="rgb(45 212 191 / 0.75)" />
                          <stop offset="100%" stopColor="rgb(125 211 252 / 0.7)" />
                        </linearGradient>
                      </defs>
                      <path
                        fill={`url(#${streakFireGradientId})`}
                        d="M12.18 2.25c.59 2.42-.17 3.91-1.07 5.36-.96 1.54-2.04 3.17-2.04 5.48 0 2.25 1.56 4.42 3.93 5.16-1.04-.86-1.66-2.06-1.66-3.39 0-1.58.88-2.66 1.73-3.71.83-1.02 1.63-2.02 1.63-3.5 1.85 1.18 3.06 3.28 3.06 5.58 0 3.52-2.84 6.37-6.35 6.37S5.06 16.75 5.06 13.23c0-3.03 1.68-5.2 3.11-7.13 1.33-1.79 2.46-3.37 4.01-3.85Z"
                      />
                    </svg>
                    <p className="text-xl font-semibold text-white">
                      {t("publicProfile.streak.title", { count: numberFormatter.format(streakCount) })}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{formatStreakLine(streakCount, locale)}</p>
                </div>
              ) : null}
              {isEmbed ? (
                <p className="mt-4 text-xs uppercase tracking-[0.15em] text-emerald-100/70">
                  {t("publicProfile.embed.trustLine")}
                </p>
              ) : null}
              {isEmbed ? (
                <p className="mt-3 text-xs text-white/50">{t("publicProfile.embed.poweredBy")}</p>
              ) : null}
            </section>

            {!isEmbed ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <button
                type="button"
                onClick={() => setReputationDetailsOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                aria-label={
                  reputationDetailsOpen
                    ? t("publicProfile.reputationDetails.collapseLabel")
                    : t("publicProfile.reputationDetails.expandLabel")
                }
                aria-expanded={reputationDetailsOpen}
              >
                <div>
                  <h2 className="text-lg font-semibold">
                    {t("publicProfile.reputationDetails.title")}
                  </h2>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-transform duration-200 ${
                    reputationDetailsOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </span>
              </button>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                  reputationDetailsOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pt-5">
                  {!reputationEvidence.hasDeals ? (
                    <p className="text-sm text-white/60">
                      {t("publicProfile.reputationDetails.empty")}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {reputationEvidence.uniquePeople !== null && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.workedWith")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-baseline gap-2 text-white">
                              <span className="text-2xl font-semibold">
                                {numberFormatter.format(reputationEvidence.uniquePeople)}
                              </span>
                              <span className="text-sm text-white/70">
                                {formatPlural(
                                  reputationEvidence.uniquePeople,
                                  "workedWithPeople"
                                )}
                              </span>
                            </div>
                            {reputationEvidence.workedWithDeals > 0 && (
                              <p className="text-xs text-white/60">
                                {t("publicProfile.reputationDetails.workedWith.secondary", {
                                  count: numberFormatter.format(reputationEvidence.workedWithDeals),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {(reputationEvidence.dealsWithDeadlines !== null ||
                        reputationEvidence.onTimeCompletions !== null) && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.commitments")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            {reputationEvidence.dealsWithDeadlines !== null && (
                              <div className="flex items-baseline gap-2 text-white">
                                <span className="text-2xl font-semibold">
                                  {numberFormatter.format(reputationEvidence.dealsWithDeadlines)}
                                </span>
                                <span className="text-sm text-white/70">
                                  {formatPlural(
                                    reputationEvidence.dealsWithDeadlines,
                                    "deadlines"
                                  )}
                                </span>
                              </div>
                            )}
                            {reputationEvidence.onTimeCompletions !== null && (
                              <p className="text-xs text-white/60">
                                {t("publicProfile.reputationDetails.commitments.onTime", {
                                  count: numberFormatter.format(
                                    reputationEvidence.onTimeCompletions
                                  ),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {reputationEvidence.disputes !== null && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.disputes")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-baseline gap-2 text-white">
                              <span className="text-2xl font-semibold">
                                {numberFormatter.format(reputationEvidence.disputes)}
                              </span>
                              <span className="text-sm text-white/70">
                                {formatPlural(reputationEvidence.disputes, "disputes")}
                              </span>
                            </div>
                            {reputationEvidence.totalDeals > 0 &&
                              reputationEvidence.disputeRate !== null && (
                                <p className="text-xs text-white/60">
                                  {t("publicProfile.reputationDetails.disputes.rate", {
                                    rate: percentFormatter.format(reputationEvidence.disputeRate),
                                  })}
                                </p>
                              )}
                          </div>
                        </div>
                      )}
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <h3 className="text-sm font-semibold text-white">
                          {t("publicProfile.reputationDetails.sections.trackRecord")}
                        </h3>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-baseline gap-2 text-white">
                            <span className="text-2xl font-semibold">
                              {paceFormatter.format(reputationEvidence.pace)}
                            </span>
                            <span className="text-sm text-white/70">
                              {t("publicProfile.reputationDetails.trackRecord.perMonthUnit")}
                            </span>
                          </div>
                          <p className="text-xs text-white/60">
                            {t("publicProfile.reputationDetails.trackRecord.activeDays", {
                              count: numberFormatter.format(reputationEvidence.activeDays),
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <h3 className="text-sm font-semibold text-white">
                          {t("publicProfile.reputationDetails.sections.completionRate")}
                        </h3>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-baseline gap-2 text-white">
                            <span className="text-2xl font-semibold">
                              {percentFormatter.format(reputationEvidence.completionRatePercent)}
                            </span>
                            <span className="text-sm text-white/70">
                              {t("publicProfile.reputationDetails.disputes.rateLabel")}
                            </span>
                          </div>
                          <p className="text-xs text-white/60">
                            {t("publicProfile.reputationDetails.completionRate.breakdown", {
                              completed: numberFormatter.format(
                                reputationEvidence.completionRate.completed
                              ),
                                total: numberFormatter.format(reputationEvidence.completionRate.total),
                                label: formatPlural(
                                  reputationEvidence.completionRate.total,
                                  "acceptedDeals"
                                ),
                              })}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <h3 className="text-sm font-semibold text-white">
                          {t("publicProfile.reputationDetails.sections.completionReview")}
                        </h3>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-baseline gap-2 text-white">
                            <span className="text-2xl font-semibold">
                              {percentFormatter.format(reputationEvidence.completionReviewPercent)}
                            </span>
                            <span className="text-sm text-white/70">
                              {t("publicProfile.reputationDetails.disputes.rateLabel")}
                            </span>
                          </div>
                          <p className="text-xs text-white/60">
                            {t("publicProfile.reputationDetails.completionReview.breakdown", {
                              responded: numberFormatter.format(
                                reputationEvidence.completionReview.responded
                              ),
                              total: numberFormatter.format(reputationEvidence.completionReview.total),
                              })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </section>
            ) : null}

            {!isEmbed && graphParties.length > 0 ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="mb-5 text-lg font-semibold">
                  {t("publicProfile.sections.network")}
                </h2>
                <PublicProfileGraph
                  userName={primaryLabel}
                  parties={graphParties}
                  edges={graphEdges}
                  locale={locale}
                />
              </section>
            ) : null}

            {!isEmbed ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("publicProfile.sections.publicDeals")}</h2>
              </div>
              <div className="mb-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePublicDealsTabChange("execution")}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    activePublicDealsTab === "execution"
                      ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 bg-transparent text-white/55 hover:border-white/15 hover:bg-white/5 hover:text-white/75"
                  }`}
                >
                  {t("publicProfile.publicDealsTabs.execution", {
                    count: executionCount,
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => handlePublicDealsTabChange("reaction")}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    activePublicDealsTab === "reaction"
                      ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 bg-transparent text-white/55 hover:border-white/15 hover:bg-white/5 hover:text-white/75"
                  }`}
                >
                  {t("publicProfile.publicDealsTabs.reaction", {
                    count: reactionCount,
                  })}
                </button>
              </div>
              {publicDealsEmpty ? (
                <p className="text-sm text-white/60">{t("publicProfile.emptyPublicDealsByRole")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {visiblePromises.map((promise) => {
                      const content = (
                        <>
                          <div>
                            <p className="text-sm font-medium text-white">{promise.title}</p>
                            <p className="text-xs text-white/50">
                              {formatDealMeta(promise, locale, dealMetaLabels)}
                            </p>
                          </div>
                          <StatusPill
                            label={statusLabels[promise.uiStatus] ?? promise.uiStatus}
                            tone={statusTones[promise.uiStatus] ?? "neutral"}
                          />
                        </>
                      );

                      if (!promise.publicAgreementId) {
                        return (
                          <div
                            key={`${promise.title}-${promise.created_at}`}
                            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            {content}
                          </div>
                        );
                      }

                      return (
                        <LocalizedLink
                          key={`${promise.title}-${promise.created_at}`}
                          href={`/p/agreements/${promise.publicAgreementId}`}
                          className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-white/20 hover:bg-white/[0.06] md:flex-row md:items-center md:justify-between"
                        >
                          {content}
                        </LocalizedLink>
                      );
                    })}
                  </div>
                  {hasMorePublicDeals ? (
                    <div className="mt-4 flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleLoadMorePublicDeals}
                        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/5 sm:w-auto"
                      >
                        {t("promises.list.loadMore")}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

export default function PublicProfilePage() {
  return <PublicProfilePageView variant="profile" />;
}
