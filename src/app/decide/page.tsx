"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import type { QuickStatus } from "@/lib/quickDisputes/state";
import { PageShell, SkeletonRows, decideFetch, primaryButtonClass, useLoginHref, useSignedIn } from "./shared";

type Item = { id: string; createdAt: string; question: string; status: QuickStatus; shortAnswer: string | null; waitingOnMe?: boolean };

// The quick disputes of the signed-in user, or of this browser for an anonymous side.
export default function QuickDisputeHistoryPage() {
  const t = useT();
  const locale = useLocale();
  const signedIn = useSignedIn();
  const loginHref = useLoginHref();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    if (signedIn === null) return;
    void decideFetch("/api/decide/history").then(async (res) => {
      const body = await res.json().catch(() => ({}));
      setItems(res.ok ? (body.disputes as Item[]) : []);
    });
  }, [signedIn]);

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
      {!items && <SkeletonRows />}
      {items && items.length === 0 && <p className="text-sm text-tone-400">{t("decide.history.empty")}</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-tone-white/10">
          {items.map((item) => (
            <li key={item.id}>
              <a href={localizePath(`/decide/${item.id}`, locale)} className="block py-3 hover:bg-tone-white/[0.02]">
                <p className="flex items-center gap-2 text-sm font-semibold text-tone-white">
                  {item.waitingOnMe && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" aria-hidden />}
                  {item.question}
                </p>
                <p className="mt-0.5 text-xs text-tone-400">
                  {t(`decide.history.status.${item.status}`)}
                  {item.shortAnswer ? ` · ${item.shortAnswer}` : ""}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
