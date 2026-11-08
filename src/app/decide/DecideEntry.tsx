"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useT } from "@/lib/i18n/I18nProvider";
import { decideFetch } from "./shared";

// «Хто правий?» on the home page: a little demo dispute, examples that start one, and the way back to
// one's own disputes (signed in or not), with how many wait for this person's move.
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

  const examples = [t("decide.arena.example1"), t("decide.arena.example2"), t("decide.arena.example3")];

  return (
    <section className="relative w-full overflow-clip rounded-3xl border border-tone-white/10 bg-tone-white/[0.03] p-4 shadow-xl shadow-tone-black/10 backdrop-blur sm:p-5">
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-tone-white">
            <Scale className="h-5 w-5 text-accent-200" aria-hidden />
            {t("decide.title")}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {waiting > 0 && (
              <LocalizedLink
                href="/decide"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-2.5 py-0.5 font-semibold text-amber-200 hover:bg-amber-300/30"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden />
                {t("decide.arena.waiting", { count: waiting })}
              </LocalizedLink>
            )}
            {count > 0 && (
              <LocalizedLink href="/decide" className="font-medium text-tone-300 hover:text-accent-200">
                {t("decide.history.title")} ({count})
              </LocalizedLink>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2" aria-hidden>
          <div className="decide-pop rounded-2xl rounded-bl-md border border-emerald-400/30 bg-emerald-400/[0.12] px-3 py-2 text-xs leading-snug text-tone-100 sm:text-sm">
            {t("decide.arena.demo1")}
          </div>
          <span className="decide-pop flex h-9 w-9 items-center justify-center rounded-full border border-tone-white/15 bg-tone-950 text-xs font-black tracking-wider text-tone-white" style={{ animationDelay: "150ms" }}>
            VS
          </span>
          <div className="decide-pop rounded-2xl rounded-br-md border border-sky-400/30 bg-sky-400/[0.10] px-3 py-2 text-xs leading-snug text-tone-100 sm:text-sm" style={{ animationDelay: "300ms" }}>
            {t("decide.arena.demo2")}
          </div>
        </div>

        <p className="text-sm text-tone-300">{t("decide.homeHint")}</p>

        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <LocalizedLink
              key={example}
              href={`/decide/new?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-tone-white/10 bg-tone-white/5 px-3 py-1 text-xs font-medium text-tone-200 transition hover:border-accent-300/50 hover:text-accent-200"
            >
              {example}
            </LocalizedLink>
          ))}
        </div>

        <LocalizedLink
          href="/decide/new"
          className="h-12 w-full rounded-xl bg-emerald-400 px-6 py-3 text-center text-base font-semibold text-slate-950 shadow-lg shadow-accent-500/30 transition hover:-translate-y-0.5 hover:shadow-accent-400/50 sm:w-fit"
        >
          {t("decide.homeButton")}
        </LocalizedLink>
      </div>
    </section>
  );
}
