"use client";

import { ChoiceToggle } from "@/app/components/ui/ChoiceToggle";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { CHAT_LIMITS, CLOSE_OPTIONS, type CloseOption } from "@/lib/chatDisputes/state";
import { decideFetch, inputClass, primaryButtonClass, useDraft, useErrorText } from "../shared";

// «Хто правий?» for a chat: the creator states the situation and the two positions, picks when it closes,
// and gets the link for the chat. Everyone, the creator too, then takes a side on that page.
export function ChatForm() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorText();
  const { draft, update } = useDraft("chat", { question: "", position1: "", position2: "", close: "hour" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = Boolean(draft.question.trim() && draft.position1.trim() && draft.position2.trim());

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await decideFetch("/api/decide/chat", {
        method: "POST",
        body: JSON.stringify({
          lang: locale === "en" ? "en" : "uk",
          question: draft.question,
          position1: draft.position1,
          position2: draft.position2,
          close: draft.close,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(body.error));
      router.push(localizePath(`/decide/c/${body.token}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decide.errors.generic"));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-tone-200">{t("decide.group.situationLabel")}</span>
        <textarea
          className={`${inputClass} min-h-[84px] resize-y py-3`}
          autoComplete="off"
          value={draft.question}
          maxLength={CHAT_LIMITS.question}
          placeholder={t("decide.group.situationPlaceholder")}
          onChange={(e) => update({ question: e.target.value })}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {([1, 2] as const).map((n) => (
          <label key={n} className="block space-y-1.5">
            <span className="text-sm font-semibold text-tone-200">{t("decide.group.position", { n })}</span>
            <input
              className={`${inputClass} py-3`}
              autoComplete="off"
              value={n === 1 ? draft.position1 : draft.position2}
              maxLength={CHAT_LIMITS.position}
              placeholder={t(`decide.group.position${n}Placeholder`)}
              onChange={(e) => update(n === 1 ? { position1: e.target.value } : { position2: e.target.value })}
            />
          </label>
        ))}
      </div>

      <ChoiceToggle
        label={t("decide.group.closeLabel")}
        hint={t("decide.group.closeHint")}
        options={CLOSE_OPTIONS.map((option: CloseOption) => ({ value: option, label: t(`decide.group.close.${option}`) }))}
        value={draft.close as CloseOption}
        onChange={(close) => update({ close })}
      />

      <div className="flex justify-end">
        <button type="submit" className={`${primaryButtonClass} w-full py-3 text-base sm:w-auto`} disabled={busy || !ready}>
          <Link2 className="h-4 w-4" aria-hidden />
          {t("decide.group.create")}
        </button>
      </div>
      {error && <p className="text-sm text-danger-300">{error}</p>}
    </form>
  );
}
