"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { LIMITS } from "@/lib/quickDisputes/state";
import { IdentityGate, PageShell, decideFetch, inputClass, primaryButtonClass, useErrorText, useSignedIn } from "../shared";

// «Дредді розсуди»: side A states the question and their position, then sends the link to side B.
export default function NewQuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const [question, setQuestion] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (nickname: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await decideFetch("/api/decide", {
        method: "POST",
        body: JSON.stringify({ lang: locale === "en" ? "en" : "uk", question, position, nickname }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(body.error));
      router.push(localizePath(`/decide/${body.id}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decide.errors.generic"));
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <h1 className="text-3xl font-semibold text-tone-white sm:text-4xl">{t("decide.title")}</h1>
      <p className="text-sm text-tone-300">{t("decide.homeHint")}</p>
      <IdentityGate signedIn={signedIn}>
        {(nickname) => (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void create(nickname);
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-tone-200">{t("decide.questionLabel")}</span>
              <input
                className={inputClass}
                value={question}
                maxLength={LIMITS.question}
                placeholder={t("decide.questionPlaceholder")}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </label>
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
            <button type="submit" className={primaryButtonClass} disabled={busy || !question.trim() || !position.trim()}>
              {t("decide.create")}
            </button>
          </form>
        )}
      </IdentityGate>
    </PageShell>
  );
}
