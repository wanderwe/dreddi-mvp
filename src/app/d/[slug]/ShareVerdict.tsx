"use client";

import { useState } from "react";
import { Share2, Swords } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { actionRowClass, primaryButtonClass, secondaryButtonClass } from "@/app/decide/shared";

// Under a public verdict: sharing it is the main action; starting one's own dispute comes second, worded
// so it is not read as reopening this one.
export function ShareVerdict({ question, shareText }: { question: string; shareText: string }) {
  const t = useT();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const share = async () => {
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

  return (
    <div className={actionRowClass}>
      <a href={localizePath("/decide/new", locale)} className={`${secondaryButtonClass} py-3`}>
        <Swords className="h-4 w-4" aria-hidden />
        {t("decide.join.startOwn")}
      </a>
      <button type="button" className={`${primaryButtonClass} py-3 text-base`} onClick={() => void share()}>
        <Share2 className="h-4 w-4" aria-hidden />
        {copied ? t("decide.linkCopied") : t("decide.verdict.share")}
      </button>
    </div>
  );
}
