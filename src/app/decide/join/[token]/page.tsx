"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { LIMITS, type QuickRole, type QuickStatus } from "@/lib/quickDisputes/state";
import { IdentityGate, PageShell, decideFetch, inputClass, primaryButtonClass, useErrorText, useSignedIn } from "../../shared";

type Preview = {
  id: string;
  status: QuickStatus;
  question: string;
  nicknameA: string;
  positionA: string;
  myRole: QuickRole | null;
  open: boolean;
};

// The invite link: side B sees the question and A's position, confirms or rewords the question, and answers.
export default function JoinQuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reword, setReword] = useState(false);
  const [question, setQuestion] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (next.myRole === "B") {
        router.replace(localizePath(`/decide/${next.id}`, locale));
        return;
      }
      setPreview(next);
      setQuestion(next.question);
    });
  }, [token, signedIn, errorText, router, locale]);

  const join = async (nickname: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await decideFetch(`/api/decide/join/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ position, question: reword ? question : null, nickname }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error === "taken" ? t("decide.join.taken") : errorText(body.error));
      router.push(localizePath(`/decide/${body.id}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decide.errors.generic"));
      setBusy(false);
    }
  };

  const closedText = !preview
    ? null
    : preview.myRole === "A"
      ? t("decide.join.own")
      : preview.status === "expired"
        ? t("decide.join.expired")
        : !preview.open
          ? t("decide.join.taken")
          : null;

  return (
    <PageShell>
      {preview ? (
        <>
          <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">
            {t("decide.join.title", { nickname: preview.nicknameA })}
          </h1>
          <div className="space-y-3 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-tone-400">{t("decide.join.question")}</p>
              <p className="mt-1 text-lg font-semibold text-tone-white">{preview.question}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-tone-400">{t("decide.join.positionOf", { nickname: preview.nicknameA })}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-tone-200">{preview.positionA}</p>
            </div>
          </div>
          {closedText ? (
            <p className="text-sm text-tone-300">{closedText}</p>
          ) : (
            <IdentityGate signedIn={signedIn}>
              {(nickname) => (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void join(nickname);
                  }}
                >
                  <fieldset className="space-y-2">
                    {[false, true].map((value) => (
                      <label key={String(value)} className="flex cursor-pointer items-center gap-2 text-sm text-tone-200">
                        <input type="radio" name="reword" checked={reword === value} onChange={() => setReword(value)} />
                        {value ? t("decide.join.reword") : t("decide.join.questionFair")}
                      </label>
                    ))}
                  </fieldset>
                  {reword && (
                    <input
                      className={inputClass}
                      value={question}
                      maxLength={LIMITS.question}
                      autoFocus
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                  )}
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-tone-200">{t("decide.positionLabel")}</span>
                    <textarea
                      className={`${inputClass} min-h-[110px]`}
                      value={position}
                      maxLength={LIMITS.position}
                      placeholder={t("decide.positionPlaceholder")}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </label>
                  {error && <p className="text-sm text-danger-300">{error}</p>}
                  <button
                    type="submit"
                    className={primaryButtonClass}
                    disabled={busy || !position.trim() || (reword && !question.trim())}
                  >
                    {t("decide.join.reply")}
                  </button>
                </form>
              )}
            </IdentityGate>
          )}
        </>
      ) : (
        error && <p className="text-sm text-tone-300">{error}</p>
      )}
    </PageShell>
  );
}
