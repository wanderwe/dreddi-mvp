"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Scale, Send, Swords } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { LIMITS, type QuickRole, type QuickStatus } from "@/lib/quickDisputes/state";
import {
  Bubble,
  IdentityChoice,
  NicknameTag,
  PageShell,
  SkeletonRows,
  actionRowClass,
  StepsBar,
  decideFetch,
  inputClass,
  primaryButtonClass,
  useDraft,
  useDraftNickname,
  useMyName,
  useErrorText,
  useSignedIn,
} from "../../shared";

type Preview = {
  id: string;
  status: QuickStatus;
  question: string;
  nicknameA: string;
  positionA: string;
  myRole: QuickRole | null;
  open: boolean;
};

// The invite link: side B sees the question and A's message, confirms or rewords the question, and
// answers in the same chat. Someone who came too late gets the way to start their own.
export default function JoinQuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const { nickname, reroll } = useDraftNickname();
  const myName = useMyName(signedIn);
  const { draft, update, stash } = useDraft(`join:${token}`, { position: "", question: "", reword: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [askIdentity, setAskIdentity] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reword = draft.reword === "1";

  useEffect(() => {
    if (signedIn === null) return;
    void decideFetch(`/api/decide/join/${encodeURIComponent(token)}`).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(body.error));
        return;
      }
      const next = body as Preview;
      // Already a side of it (side A opening their own link, or B coming back): straight to the dispute.
      if (next.myRole) {
        router.replace(localizePath(`/decide/${next.id}`, locale));
        return;
      }
      setPreview(next);
    });
  }, [token, signedIn, errorText, router, locale]);

  const question = draft.question || preview?.question || "";
  const ready = Boolean(draft.position.trim() && (!reword || question.trim()));

  const join = async (asNickname: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await decideFetch(`/api/decide/join/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ position: draft.position, question: reword ? question : null, nickname: asNickname }),
      });
      const body = await res.json().catch(() => ({}));
      // Someone else answered first while this person was typing: show the closed state with the way out.
      if (res.status === 409 && body.error === "taken") {
        setPreview((current) => (current ? { ...current, open: false } : current));
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error(errorText(body.error));
      router.push(localizePath(`/decide/${body.id}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decide.errors.generic"));
      setBusy(false);
    }
  };

  const submit = () => {
    if (!ready || signedIn === null) return;
    if (signedIn) void join(null);
    else setAskIdentity(true);
  };

  const closedText = !preview
    ? null
    : preview.status === "expired"
      ? t("decide.join.expired")
      : !preview.open
        ? t("decide.join.taken")
        : null;

  const startOwn = (
    <div className={actionRowClass}>
      <a href={localizePath("/decide/new", locale)} className={primaryButtonClass}>
        <Swords className="h-4 w-4" aria-hidden />
        {t("decide.join.startOwn")}
      </a>
    </div>
  );

  if (!preview) {
    return (
      <PageShell>
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-tone-300">{error}</p>
            {startOwn}
          </div>
        ) : (
          <div className="space-y-5" aria-busy="true">
            <SkeletonRows count={1} className="h-1.5" />
            <SkeletonRows count={1} className="h-9 w-2/3" />
            <SkeletonRows count={3} className="h-16" />
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
      <StepsBar current={1} />
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-200">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          {t("decide.join.title", { nickname: preview.nicknameA })}
        </p>
        <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{preview.question}</h1>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-4 rounded-2xl border border-tone-white/10 bg-tone-black/20 p-3 sm:p-4">
          <Bubble side="other" name={preview.nicknameA} label={preview.nicknameA}>
            <p className="whitespace-pre-wrap">{preview.positionA}</p>
          </Bubble>
          {closedText ? null : (
            <Bubble
              side="me"
              name={(signedIn ? myName : nickname) ?? "?"}
              label={<NicknameTag nickname={signedIn ? null : nickname} onReroll={signedIn ? undefined : reroll} />}
              wide
              delayMs={120}
            >
              <textarea
                className="min-h-[96px] w-full resize-y bg-transparent text-sm text-tone-100 outline-none placeholder:text-tone-500"
                value={draft.position}
                maxLength={LIMITS.position}
                placeholder={t("decide.positionPlaceholder")}
                aria-label={t("decide.positionLabel")}
                autoFocus
                onChange={(e) => update({ position: e.target.value })}
              />
            </Bubble>
          )}
        </div>

        {closedText ? (
          <div className="space-y-4">
            <p className="text-sm text-tone-300">{closedText}</p>
            {startOwn}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    role="radio"
                    aria-checked={reword === value}
                    onClick={() => update({ reword: value ? "1" : "" })}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      reword === value
                        ? "border-emerald-400/60 bg-emerald-400/15 text-tone-white"
                        : "border-tone-white/10 text-tone-300 hover:border-tone-white/25"
                    }`}
                  >
                    {value ? t("decide.join.reword") : t("decide.join.questionFair")}
                  </button>
                ))}
              </div>
              {reword && (
                <input
                  className={inputClass}
                  value={question}
                  maxLength={LIMITS.question}
                  autoFocus
                  onChange={(e) => update({ question: e.target.value })}
                />
              )}
            </div>

            {askIdentity && !signedIn && nickname ? (
              <IdentityChoice nickname={nickname} busy={busy} onAnonymous={() => void join(nickname)} onSignIn={stash} />
            ) : (
              <div className="flex justify-end">
                <button type="submit" className={`${primaryButtonClass} w-full py-3 text-base sm:w-auto`} disabled={busy || !ready}>
                  <Send className="h-4 w-4" aria-hidden />
                  {t("decide.join.reply")}
                </button>
              </div>
            )}
            {error && <p className="text-sm text-danger-300">{error}</p>}
          </>
        )}
      </form>
    </PageShell>
  );
}
