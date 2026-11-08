"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useT } from "@/lib/i18n/I18nProvider";
import { decideFetch } from "./shared";

// The way into «Дредді, розсуди» on the home page, and back to one's own disputes once there are any,
// signed in or not: someone who started a dispute and left without the link finds it here.
export function DecideEntry() {
  const t = useT();
  const [count, setCount] = useState(0);

  useEffect(() => {
    void decideFetch("/api/decide/history")
      .then((res) => (res.ok ? res.json() : { disputes: [] }))
      .then((body: { disputes?: unknown[] }) => setCount(body.disputes?.length ?? 0))
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <LocalizedLink
          href="/decide/new"
          className="inline-flex w-fit items-center gap-2 text-base font-semibold text-accent-200 transition-colors hover:text-accent-100"
        >
          {t("decide.homeButton")} →
        </LocalizedLink>
        {count > 0 && (
          <LocalizedLink href="/decide" className="text-sm font-medium text-tone-300 hover:text-accent-200">
            {t("decide.history.title")} ({count})
          </LocalizedLink>
        )}
      </div>
      <p className="text-sm text-tone-400">{t("decide.homeHint")}</p>
    </div>
  );
}
