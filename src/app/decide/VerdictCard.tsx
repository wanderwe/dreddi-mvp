import { Scale, Trophy } from "lucide-react";
import type { QuickVerdict } from "@/lib/ai/quickVerdict";
import type { TFunction } from "@/lib/i18n/t";

// The verdict of «Дредді розсуди», the same in the shared chat and on the public card. No hooks, so a
// server page can render it too.

export function verdictHeadline(verdict: QuickVerdict, nicknames: { A: string; B: string }, t: TFunction) {
  if (verdict.winner === "A" || verdict.winner === "B") {
    return t("decide.verdict.winner", { nickname: nicknames[verdict.winner] });
  }
  return t(`decide.verdict.${verdict.winner}`);
}

// A chat dispute passes its own headline and whether someone won (its winner is a position, not a side).
export function VerdictCard({
  verdict,
  nicknames,
  headline,
  won,
  t,
}: {
  verdict: Pick<QuickVerdict, "short_answer" | "explanation" | "nuance" | "sources"> & { winner: string };
  nicknames?: { A: string; B: string };
  headline?: string;
  won?: boolean;
  t: TFunction;
}) {
  const title = headline ?? verdictHeadline(verdict as QuickVerdict, nicknames ?? { A: "A", B: "B" }, t);
  const trophy = won ?? (verdict.winner === "A" || verdict.winner === "B");
  return (
    <section className="relative space-y-4 overflow-clip rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-300/[0.10] via-accent-400/[0.05] to-transparent p-5 shadow-xl shadow-amber-500/10">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
      <div className="relative space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-200">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          {t("decide.verdict.title")}
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-300/20 px-3 py-1 text-sm font-bold text-tone-white">
          {trophy && <Trophy className="h-4 w-4 text-amber-400" aria-hidden />}
          {title}
        </p>
      </div>
      <p className="relative text-2xl font-semibold leading-snug text-tone-white sm:text-3xl">{verdict.short_answer}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-tone-200">{verdict.explanation}</p>
      {verdict.nuance && (
        <div className="rounded-xl border border-tone-white/10 bg-tone-white/[0.03] p-3">
          <p className="text-xs font-semibold text-tone-300">{t("decide.verdict.nuance")}</p>
          <p className="mt-1 text-sm text-tone-200">{verdict.nuance}</p>
        </div>
      )}
      {verdict.sources.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-tone-300">{t("decide.verdict.sources")}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {verdict.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-words text-accent-200 underline-offset-2 hover:underline"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-tone-500">{t("decide.verdict.disclaimer")}</p>
    </section>
  );
}
