"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { getAuthState } from "@/lib/auth/getAuthState";
import { primaryButtonClass } from "@/app/decide/shared";
import {
  dismissInstall,
  markUseful,
  installDismissed,
  isInstalled,
  isIosSafari,
  savedInstallPrompt,
  wasUseful,
} from "@/lib/install";

type Mode = "android" | "ios" | null;

// «Install Dreddi on the phone»: for signed-in people in a phone browser that can install, after a
// useful action, until closed.
export function InstallBanner() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    let signedIn = false;
    const decide = () => {
      if (!signedIn || isInstalled() || installDismissed() || !wasUseful()) return setMode(null);
      if (savedInstallPrompt()) return setMode("android");
      setMode(isIosSafari() ? "ios" : null);
    };
    void getAuthState().then((state) => {
      signedIn = state.isLoggedIn;
      decide();
    });
    const installed = () => setMode(null);
    window.addEventListener("dreddi-installable", decide);
    window.addEventListener("dreddi-useful", decide);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("dreddi-installable", decide);
      window.removeEventListener("dreddi-useful", decide);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!mode) return null;

  const close = () => {
    dismissInstall();
    setMode(null);
  };
  const install = async () => {
    const prompt = savedInstallPrompt();
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") close();
  };

  return (
    <div
      role="dialog"
      aria-label={t("install.text")}
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-tone-white/10 bg-tone-950/95 p-4 text-sm text-tone-100 shadow-2xl shadow-tone-black/60 backdrop-blur md:hidden"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-snug">{t("install.text")}</p>
        <button
          type="button"
          onClick={close}
          aria-label={t("install.close")}
          className="-m-1 flex cursor-pointer items-center justify-center rounded-lg p-1 text-tone-300 transition hover:bg-tone-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {mode === "android" ? (
        <button
          type="button"
          onClick={() => void install()}
          className={`${primaryButtonClass} mt-3 w-full`}
        >
          {t("install.button")}
        </button>
      ) : (
        <p className="mt-2 text-tone-300">{t("install.iosHint")}</p>
      )}
    </div>
  );
}

// Put next to something useful (a verdict): from then on the install banner may come.
export function MarkUseful() {
  useEffect(() => markUseful(), []);
  return null;
}
