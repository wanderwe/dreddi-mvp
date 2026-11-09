"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { StatusPill, type StatusPillTone } from "@/app/components/ui/StatusPill";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import type { QuickStatus } from "@/lib/quickDisputes/state";
import { PageShell, SkeletonRows, decideFetch, primaryButtonClass, useLoginHref, useSignedIn } from "./shared";

type Item = { id: string; createdAt: string; question: string; status: QuickStatus; shortAnswer: string | null; waitingOnMe?: boolean };
type Page = { disputes: Item[]; hasMore: boolean };

const PAGE_SIZE = 20;

// How a dispute's status reads in the list: decided in green, a move waiting on this person in amber.
function pillFor(item: Item): { tone: StatusPillTone; icon: "check" | "clock" | "warning" } {
  if (item.status === "decided") return { tone: "success", icon: "check" };
  if (item.waitingOnMe) return { tone: "attention", icon: "warning" };
  return { tone: "neutral", icon: "clock" };
}

// The quick disputes of the signed-in user, or of this browser for an anonymous side, a page at a time.
export default function QuickDisputeHistoryPage() {
  const t = useT();
  const locale = useLocale();
  const signedIn = useSignedIn();
  const loginHref = useLoginHref();
  const [items, setItems] = useState<Item[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (offset: number) => {
    const res = await decideFetch(`/api/decide/history?offset=${offset}&limit=${PAGE_SIZE}`);
    const body = (await res.json().catch(() => ({}))) as Partial<Page>;
    return { disputes: res.ok ? (body.disputes ?? []) : [], hasMore: Boolean(res.ok && body.hasMore) };
  }, []);

  useEffect(() => {
    if (signedIn === null) return;
    void loadPage(0).then((page) => {
      setItems(page.disputes);
      setHasMore(page.hasMore);
    });
  }, [signedIn, loadPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await loadPage(items?.length ?? 0);
    setItems((current) => [...(current ?? []), ...page.disputes]);
    setHasMore(page.hasMore);
    setLoadingMore(false);
  };

  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "short",
  });

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{t("decide.history.title")}</h1>
        <a href={localizePath("/decide/new", locale)} className={`${primaryButtonClass} py-3 sm:py-2.5`}>
          {t("decide.history.newButton")}
        </a>
      </div>
      {signedIn === false && (
        <p className="text-sm text-tone-400">
          {t("decide.history.browserOnly")}{" "}
          <a href={loginHref} className="font-semibold text-accent-200 hover:underline">
            {t("decide.signIn")}
          </a>
        </p>
      )}

      {!items && <SkeletonRows count={4} className="h-[88px]" />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-tone-white/20 bg-tone-white/5 p-6 text-center">
          <p className="text-sm text-tone-300">{t("decide.history.empty")}</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            const pill = pillFor(item);
            return (
              <li key={item.id}>
                <a
                  href={localizePath(`/decide/${item.id}`, locale)}
                  className={`group flex items-center gap-3 rounded-2xl border border-tone-white/10 bg-tone-white/5 p-4 transition hover:border-accent-300/40 hover:bg-emerald-500/5 ${
                    item.status === "expired" ? "opacity-70" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <StatusPill label={t(`decide.history.status.${item.status}`)} tone={pill.tone} icon={pill.icon} marker="icon" />
                      <span className="shrink-0 text-xs text-tone-400">{dateFormat.format(new Date(item.createdAt))}</span>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-tone-white sm:text-base">{item.question}</p>
                    {item.shortAnswer && <p className="truncate text-sm text-tone-400">{item.shortAnswer}</p>}
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-tone-500 transition group-hover:translate-x-0.5 group-hover:text-accent-200"
                    aria-hidden
                  />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {items && hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-tone-white/10 bg-tone-white/5 px-4 py-2 text-sm font-semibold text-tone-white transition hover:bg-tone-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loadingMore ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-tone-white/20 border-t-tone-white" />
                {t("promises.list.loadingMore")}
              </>
            ) : (
              t("promises.list.loadMore")
            )}
          </button>
        </div>
      )}
    </PageShell>
  );
}
