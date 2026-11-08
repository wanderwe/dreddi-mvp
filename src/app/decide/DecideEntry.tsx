"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useT } from "@/lib/i18n/I18nProvider";
import { decideFetch } from "./shared";

// A quiet way into «Хто правий?» on the home page, which stays about promises, and back to one's own
// disputes (signed in or not), with how many wait for this person's move.
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
    <div className="flex w-full flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <LocalizedLink
          href="/decide/new"
          className="inline-flex w-fit items-center gap-2 text-base font-semibold text-accent-200 transition-colors hover:text-accent-100"
        >
          {t("decide.title")} →
        </LocalizedLink>
        {count > 0 && (
          <LocalizedLink href="/decide" className="text-sm font-medium text-tone-300 hover:text-accent-200">
            {t("decide.history.title")} ({count})
          </LocalizedLink>
        )}
        {waiting > 0 && (
          <LocalizedLink href="/decide" className="inline-flex items-center gap-1.5 text-sm font-semibold text-tone-200 hover:text-accent-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            {t("decide.arena.waiting", { count: waiting })}
          </LocalizedLink>
        )}
      </div>
      <p className="text-sm text-tone-400">{t("decide.homeHint")}</p>
    </div>
  );
}
