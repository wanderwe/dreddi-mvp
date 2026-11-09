"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { LIMITS } from "@/lib/quickDisputes/state";
import {
  Bubble,
  IdentityChoice,
  NicknameTag,
  PageShell,
  StepsBar,
  decideFetch,
  inputClass,
  primaryButtonClass,
  useDraft,
  useDraftNickname,
  useMyName,
  useErrorText,
  useSignedIn,
} from "../shared";

// «Хто правий?»: side A writes the question and their position as the first message of a chat, then
// sends the challenge. How to appear (signed in or a random nickname) is asked only on sending.
export default function NewQuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const { nickname, reroll } = useDraftNickname();
  const myName = useMyName(signedIn);
  const { draft, update, stash } = useDraft("new", { question: "", position: "", stake: "" });
  const [askIdentity, setAskIdentity] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An example from the home page or a rematch arrives as ?q=.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) update({ question: q.slice(0, LIMITS.question) });
  }, [update]);

  const ready = Boolean(draft.question.trim() && draft.position.trim());

  const create = async (asNickname: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await decideFetch("/api/decide", {
        method: "POST",
        body: JSON.stringify({
          lang: locale === "en" ? "en" : "uk",
          question: draft.question,
          position: draft.position,
          stake: draft.stake.trim() || null,
          nickname: asNickname,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(body.error));
      router.push(localizePath(`/decide/${body.id}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decide.errors.generic"));
      setBusy(false);
    }
  };

  const submit = () => {
    if (!ready || signedIn === null) return;
    if (signedIn) void create(null);
    else setAskIdentity(true);
  };

  return (
    <PageShell>
      <StepsBar current={draft.question.trim() ? 1 : 0} />
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-tone-white sm:text-4xl">{t("decide.title")}</h1>
        <p className="text-sm text-tone-300">{t("decide.homeHint")}</p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-tone-200">{t("decide.questionLabel")}</span>
          <input
            className={`${inputClass} py-3 text-base font-semibold`}
            value={draft.question}
            maxLength={LIMITS.question}
            placeholder={t("decide.questionPlaceholder")}
            onChange={(e) => update({ question: e.target.value })}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-tone-200">{t("decide.stake.label")}</span>
          <input
            className={inputClass}
            value={draft.stake}
            maxLength={LIMITS.stake}
            placeholder={t("decide.stake.placeholder")}
            onChange={(e) => update({ stake: e.target.value })}
          />
        </label>

        <div className="space-y-4 rounded-2xl border border-tone-white/10 bg-tone-black/20 p-3 sm:p-4">
          <Bubble
            side="me"
            name={(signedIn ? myName : nickname) ?? "?"}
            label={<NicknameTag nickname={signedIn ? null : nickname} onReroll={signedIn ? undefined : reroll} />}
              wide
          >
            <textarea
              className="min-h-[96px] w-full resize-y bg-transparent text-sm text-tone-100 outline-none placeholder:text-tone-500"
              value={draft.position}
              maxLength={LIMITS.position}
              placeholder={t("decide.positionPlaceholder")}
              aria-label={t("decide.positionLabel")}
              onChange={(e) => update({ position: e.target.value })}
            />
          </Bubble>
          <Bubble side="other" name="?" label={t("decide.opponent")} ghost delayMs={120}>
            {t("decide.opponentEmpty")}
          </Bubble>
        </div>

        {askIdentity && !signedIn && nickname ? (
          <IdentityChoice nickname={nickname} busy={busy} onAnonymous={() => void create(nickname)} onSignIn={stash} />
        ) : (
          <div className="flex justify-end">
            <button type="submit" className={`${primaryButtonClass} w-full py-3 text-base sm:w-auto`} disabled={busy || !ready}>
              <Swords className="h-4 w-4" aria-hidden />
              {t("decide.create")}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-danger-300">{error}</p>}
      </form>
    </PageShell>
  );
}
