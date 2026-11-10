"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Share2, Swords, Users } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { track } from "@/lib/events/client";
import { CHAT_LIMITS, type ChatPosition, type ChatView } from "@/lib/chatDisputes/state";
import { VerdictCard } from "../../VerdictCard";
import {
  CopyField,
  NicknameTag,
  PageShell,
  ShareButton,
  SkeletonRows,
  StepsBar,
  TypingDots,
  decideFetch,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  useDraftNickname,
  useErrorText,
} from "../../shared";

// «Хто правий?» for a chat: one page for everyone with the link. A tap on a position takes that side; the
// argument is optional and comes after. While it is open only the count shows; once it closes, whether the
// majority was right, the split, Dreddi's verdict and what people said.
export default function ChatDisputePage() {
  const t = useT();
  const locale = useLocale();
  const errorText = useErrorText();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const { nickname, reroll } = useDraftNickname();
  const [view, setView] = useState<ChatView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [argument, setArgument] = useState("");
  const [editingArgument, setEditingArgument] = useState(false);
  const [shared, setShared] = useState(false);
  const asked = useRef(false);

  const load = useCallback(async () => {
    const res = await decideFetch(`/api/decide/chat/${encodeURIComponent(token)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(errorText(body.error));
      return;
    }
    setView(body as ChatView);
  }, [token, errorText]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await decideFetch(`/api/decide/chat/${encodeURIComponent(token)}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(errorText(body.error));
        setView(body as ChatView);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("decide.errors.generic"));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [token, errorText, t]
  );

  useEffect(() => {
    if (!token) return;
    track("chat_dispute_open", token);
    void load();
  }, [token, load]);

  // Time is up: ask for the verdict once; whoever opens the page first triggers it.
  useEffect(() => {
    if (!view?.canDecideNow || asked.current) return;
    asked.current = true;
    void act({ action: "decide" });
  }, [view?.canDecideNow, act]);

  // The count moves while it is open; the verdict comes while it is deciding.
  useEffect(() => {
    if (!view || (view.status !== "open" && view.status !== "deciding")) return;
    const id = setInterval(() => void load(), view.status === "deciding" ? 3000 : 15000);
    return () => clearInterval(id);
  }, [view, load]);

  const pluralRules = useMemo(() => new Intl.PluralRules(locale === "en" ? "en" : "uk"), [locale]);
  const people = (count: number) => `${count} ${t(`decide.group.participants.${pluralRules.select(count)}`)}`;

  if (!view) {
    return (
      <PageShell>
        {error ? <p className="text-sm text-danger-300">{error}</p> : <SkeletonRows count={4} className="h-[64px]" />}
      </PageShell>
    );
  }

  const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  const shareText = t("decide.group.shareText", { question: view.question });
  const messengers = url
    ? [
        { name: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}` },
        { name: "Viber", href: `viber://forward?text=${encodeURIComponent(`${shareText} ${url}`)}` },
        { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}` },
      ]
    : [];
  const timeFormat = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const open = view.status === "open" && !view.canDecideNow;
  const positionText = (position: ChatPosition) => view.positions[position];

  const takeSide = async (position: ChatPosition) => {
    if (busy || view.mine?.position === position) return;
    const switching = Boolean(view.mine);
    const ok = await act({ action: "side", position, nickname });
    if (ok) {
      track("chat_dispute_side", token);
      // The argument was for the other side: it is gone, and the field starts empty.
      if (switching) {
        setArgument("");
        setEditingArgument(false);
      }
    }
  };

  const saveArgument = async () => {
    const ok = await act({ action: "argument", text: argument.trim() || null });
    if (ok) setEditingArgument(false);
  };

  const shareResult = async () => {
    track("chat_dispute_share", token);
    const text = view.verdict?.share_text ?? shareText;
    if (navigator.share) {
      await navigator.share({ title: view.question, text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`).catch(() => undefined);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const shareBlock = (title: string, emphasis: boolean) => (
    <section
      className={`space-y-3 rounded-2xl border p-4 ${
        emphasis ? "decide-pop border-emerald-400/30 bg-emerald-400/[0.07]" : "border-tone-white/10 bg-tone-white/[0.03]"
      }`}
    >
      <p className={emphasis ? "text-base font-semibold text-tone-white" : "text-sm font-semibold text-tone-200"}>{title}</p>
      {/* On a phone the share sheet is the natural way to send; on a computer the link field is. */}
      <div className="sm:hidden">
        <ShareButton url={url} text={shareText} title={view.question} label={t("decide.verdict.share")} links={messengers} />
      </div>
      <CopyField text={url} label={t("decide.copyLink")} copiedLabel={t("decide.linkCopied")} />
    </section>
  );

  const verdict = view.verdict;
  const winner = verdict?.winner === "1" || verdict?.winner === "2" ? (Number(verdict.winner) as ChatPosition) : null;
  const headline = verdict
    ? winner
      ? t("decide.group.winner", { position: positionText(winner) })
      : t(`decide.verdict.${verdict.winner}`)
    : "";
  const steps = open ? 1 : view.status === "decided" || view.status === "closed_empty" ? 3 : 2;

  return (
    <PageShell>
      {/* The same three steps as between two people: the question, everyone's sides, the verdict. */}
      <StepsBar current={steps} />
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-200">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {t("decide.title")}
        </p>
        <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{view.question}</h1>
      </div>

      {open && view.isCreator && view.total === 0 && shareBlock(t("decide.group.created"), true)}

      {open && (
        <>
          {/* The rule sits right above the two sides it is about, after the creator's link block. */}
          {!view.mine && <p className="text-sm text-tone-300">{t("decide.group.rules")}</p>}
          <section className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            {([1, 2] as const).map((position, index) => {
              const mine = view.mine?.position === position;
              const other = Boolean(view.mine) && !mine;
              return (
                <div key={position} className="contents">
                  {index === 1 && (
                    <span className="flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-tone-500">
                      {t("decide.group.or")}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={mine}
                    onClick={() => void takeSide(position)}
                    className={`group flex min-h-[96px] cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-wait ${
                      mine
                        ? "border-emerald-400/70 bg-emerald-400/[0.12] ring-2 ring-emerald-400/30"
                        : other
                          ? "border-tone-white/10 bg-tone-white/[0.02] hover:border-accent-300/50"
                          : "border-tone-white/15 bg-tone-white/5 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-400/[0.06]"
                    }`}
                  >
                    <span className={`text-base font-semibold ${other ? "text-tone-400" : "text-tone-white"}`}>{positionText(position)}</span>
                    {mine ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-200">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {t("decide.group.mySide")}
                      </span>
                    ) : other ? (
                      <span className="text-xs font-semibold text-tone-400 group-hover:text-accent-100">{t("decide.group.switch")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-200">
                        {t("decide.group.pick")}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </section>

          {!view.mine && (
            <p className="text-xs font-semibold text-tone-400">
              <NicknameTag nickname={nickname} onReroll={reroll} />
            </p>
          )}

          {view.mine &&
            (view.mine.argument && !editingArgument ? (
              <section className="space-y-1.5 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-tone-400">{t("decide.youAs", { nickname: view.mine.nickname })}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setArgument(view.mine?.argument ?? "");
                      setEditingArgument(true);
                    }}
                    className="shrink-0 cursor-pointer text-xs font-semibold text-tone-300 transition hover:text-accent-100"
                  >
                    {t("decide.group.editArgument")}
                  </button>
                </div>
                <p className="text-sm text-tone-100">{view.mine.argument}</p>
              </section>
            ) : (
              <section className="space-y-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-tone-200">{t("decide.group.whyLabel")}</span>
                  <textarea
                    className={`${inputClass} min-h-[72px] resize-y py-3`}
                    value={argument}
                    maxLength={CHAT_LIMITS.argument}
                    onChange={(e) => setArgument(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-tone-400">{t("decide.youAs", { nickname: view.mine.nickname })}</span>
                  <button
                    type="button"
                    className={`${secondaryButtonClass} w-full sm:w-auto`}
                    disabled={busy || (!argument.trim() && !view.mine.argument)}
                    onClick={() => void saveArgument()}
                  >
                    {t("decide.group.addArgument")}
                  </button>
                </div>
              </section>
            ))}

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-tone-400">
            <span>
              <span className="font-semibold text-tone-200">{people(view.total)}</span>
              {" · "}
              {view.closesAt ? t("decide.group.closes", { time: timeFormat.format(new Date(view.closesAt)) }) : t("decide.group.closesManual")}
            </span>
            {view.isCreator &&
              (view.total >= CHAT_LIMITS.minSides ? (
                <button type="button" className={`${secondaryButtonClass} ml-auto`} disabled={busy} onClick={() => void act({ action: "close" })}>
                  {t("decide.group.closeLabel")}
                </button>
              ) : (
                <span className="ml-auto text-xs text-tone-500">{t("decide.group.closeNeedsMore")}</span>
              ))}
          </div>

          {(view.mine || (view.isCreator && view.total > 0)) && shareBlock(t("decide.group.invite"), false)}
        </>
      )}

      {(view.status === "deciding" || (view.status === "open" && view.canDecideNow)) && (
        <p className="flex items-center gap-2 text-sm font-medium text-tone-300">
          <TypingDots />
          {t("decide.chat.deciding")}
        </p>
      )}

      {view.status === "closed_empty" && (
        <section className="space-y-1 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
          <p className="text-sm text-tone-200">{t("decide.group.tooFew")}</p>
          <p className="text-xs text-tone-400">{people(view.total)}</p>
        </section>
      )}

      {view.split && view.status === "decided" && verdict && (
        <>
          {view.majorityRight !== null && (
            <p
              className={`decide-pop flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold ${
                view.majorityRight ? "bg-emerald-400/[0.12] text-tone-white" : "bg-amber-300/25 text-tone-white"
              }`}
            >
              {view.majorityRight ? (
                <CheckCircle2 className="h-5 w-5 text-accent-200" aria-hidden />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
              )}
              {view.majorityRight ? t("decide.group.majorityRight") : t("decide.group.majorityWrong")}
            </p>
          )}

          <section className="space-y-2">
            {([1, 2] as const).map((position) => {
              const share = position === 1 ? view.split?.percent1 ?? 0 : view.split?.percent2 ?? 0;
              const right = winner === position;
              const mine = view.mine?.position === position;
              return (
                <div
                  key={position}
                  className={`relative overflow-clip rounded-xl border ${right ? "border-amber-300/70" : "border-tone-white/10"} bg-tone-white/[0.03]`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${right ? "bg-amber-300/30" : "bg-tone-white/[0.07]"}`}
                    style={{ width: `${share}%` }}
                    aria-hidden
                  />
                  <div className="relative flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className={`flex min-w-0 items-center gap-1.5 ${right ? "font-semibold text-tone-white" : "text-tone-200"}`}>
                      {right && <Check className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />}
                      <span className="min-w-0">
                        {positionText(position)}
                        {mine && <span className="block text-xs font-normal text-tone-400">{t("decide.group.mySide")}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-tone-white">
                      {share}% · {view.split?.[position] ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="flex items-center gap-2 sm:justify-end">
            <a
              href={localizePath("/decide/new?format=chat", locale)}
              className={`${primaryButtonClass} h-[42px] flex-1 whitespace-nowrap py-0 sm:flex-none`}
            >
              <Swords className="h-4 w-4" aria-hidden />
              {t("decide.join.startOwn")}
            </a>
            <Tooltip label={shared ? t("decide.linkCopied") : t("decide.verdict.share")} placement="top">
              <button
                type="button"
                onClick={() => void shareResult()}
                aria-label={shared ? t("decide.linkCopied") : t("decide.verdict.share")}
                className="inline-flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-tone-white/15 text-tone-200 transition hover:border-accent-300/50 hover:text-accent-200"
              >
                {shared ? <Check className="h-4 w-4 text-accent-200" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
              </button>
            </Tooltip>
          </div>

          <VerdictCard verdict={verdict} headline={headline} won={Boolean(winner)} t={t} />

          {([1, 2] as const).some((position) => view.best[position]) && (
            <section className="grid gap-2 sm:grid-cols-2">
              {([1, 2] as const).map((position) => {
                const best = view.best[position];
                if (!best) return null;
                return (
                  <div key={position} className="space-y-1 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
                    <p className="text-xs font-semibold text-tone-400">{t("decide.group.best", { position: positionText(position) })}</p>
                    <p className="text-sm text-tone-100">«{best.text}»</p>
                    <p className="text-xs text-tone-500">{best.nickname}</p>
                  </div>
                );
              })}
            </section>
          )}

          {view.arguments.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold text-tone-200">{t("decide.group.allArguments")}</p>
              <ul className="space-y-2">
                {view.arguments.map((item, index) => (
                  <li key={index} className="rounded-xl border border-tone-white/10 bg-tone-white/[0.03] px-4 py-3 text-sm">
                    <p className="text-xs font-semibold text-tone-400">
                      {item.nickname} · {positionText(item.position)}
                    </p>
                    <p className="mt-1 text-tone-100">{item.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger-300">{error}</p>}
    </PageShell>
  );
}
