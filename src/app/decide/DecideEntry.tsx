"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useT } from "@/lib/i18n/I18nProvider";
import { decideFetch } from "./shared";

// «Хто правий?» as its own full-width section under the first screen, which stays about promises; also
// the way back to one's own disputes (signed in or not), with how many wait for this person's move.
export function DecideEntry() {
  const t = useT();
  const [count, setCount] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    void decideFetch("/api/decide/history")
      .then((res) => (res.ok ? res.json() : { disputes: [] }))
      .then((body: { disputes?: { waitingOnMe?: boolean }[] }) => {
        const disputes = body.disputes ?? [];
        setCount(disputes.length);
        setWaiting(disputes.filter((item) => item.waitingOnMe).length);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="glass-panel flex w-full flex-col gap-5 rounded-3xl border-tone-white/10 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-accent-200" aria-hidden>
          <Scale className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-tone-white sm:text-2xl">{t("decide.title")}</h2>
          <p className="text-sm text-tone-300 sm:text-base">{t("decide.homeHint")}</p>
          {(count > 0 || waiting > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
              {count > 0 && (
                <LocalizedLink href="/decide" className="font-medium text-accent-200 hover:text-accent-100">
                  {t("decide.history.title")} ({count}) →
                </LocalizedLink>
              )}
              {waiting > 0 && (
                <LocalizedLink href="/decide" className="inline-flex items-center gap-1.5 font-semibold text-tone-200 hover:text-accent-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                  {t("decide.arena.waiting", { count: waiting })}
                </LocalizedLink>
              )}
            </div>
          )}
        </div>
      </div>
      <LocalizedLink
        href="/decide/new"
        className="h-12 w-full shrink-0 rounded-xl bg-emerald-400 px-6 py-3 text-center text-base font-semibold text-slate-950 shadow-lg shadow-accent-500/30 transition hover:-translate-y-0.5 hover:shadow-accent-400/50 md:w-auto"
      >
        {t("decide.homeButton")}
      </LocalizedLink>
    </section>
  );
}
