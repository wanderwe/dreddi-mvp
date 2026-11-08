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

export function VerdictCard({
  verdict,
  nicknames,
  t,
}: {
  verdict: QuickVerdict;
  nicknames: { A: string; B: string };
  t: TFunction;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-accent-400/30 bg-accent-400/[0.06] p-5">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-200">{t("decide.verdict.title")}</p>
        <p className="text-sm font-semibold text-tone-300">{verdictHeadline(verdict, nicknames, t)}</p>
      </div>
      <p className="text-2xl font-semibold leading-snug text-tone-white">{verdict.short_answer}</p>
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
