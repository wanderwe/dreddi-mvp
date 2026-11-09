"use client";

import { useState } from "react";
import { Check, Share2, Swords } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { primaryButtonClass } from "@/app/decide/shared";
import { track } from "@/lib/events/client";

// Under a public verdict. Whoever opens the card is mostly someone new, so starting their own dispute is
// the main action; sharing is the same icon as on the dispute page.
export function ShareVerdict({ slug, question, shareText }: { slug: string; question: string; shareText: string }) {
  const t = useT();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    track("dispute_card_share", slug);
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: question, text: shareText, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(`${shareText} ${url}`).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLabel = copied ? t("decide.linkCopied") : t("decide.verdict.share");

  return (
    <div className="flex items-center gap-2 sm:justify-end">
      <a
        href={localizePath("/decide/new", locale)}
        onClick={() => track("dispute_card_start_own", slug)}
        className={`${primaryButtonClass} h-[42px] flex-1 whitespace-nowrap py-0 sm:flex-none`}
      >
        <Swords className="h-4 w-4" aria-hidden />
        {t("decide.join.startOwn")}
      </a>
      <Tooltip label={shareLabel} placement="top">
        <button
          type="button"
          onClick={() => void share()}
          aria-label={shareLabel}
          className="inline-flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-tone-white/15 text-tone-200 transition hover:border-accent-300/50 hover:text-accent-200"
        >
          {copied ? <Check className="h-4 w-4 text-accent-200" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
        </button>
      </Tooltip>
    </div>
  );
}
