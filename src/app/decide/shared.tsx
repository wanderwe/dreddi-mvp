"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabaseOptional } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath } from "@/lib/i18n/routing";
import { randomNickname } from "@/lib/quickDisputes/state";

// Shared by the «Дредді розсуди» pages: calls with the session when there is one (the browser cookie
// covers anonymous sides), whether someone is signed in, and the sign-in or anonymous choice.

export const inputClass =
  "w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-3 py-2 text-sm text-tone-white outline-none focus:border-accent-300/60";
export const primaryButtonClass =
  "cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "cursor-pointer rounded-xl border border-tone-white/15 px-4 py-2 text-sm font-semibold text-tone-200 hover:border-tone-white/30 disabled:cursor-not-allowed disabled:opacity-50";

export async function decideFetch(path: string, init?: RequestInit) {
  const { data } = (await supabaseOptional?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// null while it is not known yet.
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabaseOptional) {
      setSignedIn(false);
      return;
    }
    void supabaseOptional.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);
  return signedIn;
}

export function useErrorText() {
  const t = useT();
  return useCallback(
    (code: unknown) => {
      const key = typeof code === "string" ? code : "";
      return ["daily_limit", "service_limit", "not_a_side", "stale"].includes(key)
        ? t(`decide.errors.${key}`)
        : t("decide.errors.generic");
    },
    [t]
  );
}

export function useLoginHref(extraQuery = "") {
  const locale = useLocale();
  const pathname = usePathname() || "/";
  return localizeLoginPath(`${pathname}${extraQuery}`, locale);
}

// Signed in: the form right away. Not signed in: sign in, or go on as a random nickname shown up front.
export function IdentityGate({
  signedIn,
  children,
}: {
  signedIn: boolean | null;
  children: (nickname: string | null) => ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const loginHref = useLoginHref();
  const [nickname, setNickname] = useState<string | null>(null);

  if (signedIn === null) return null;
  if (signedIn) return <>{children(null)}</>;
  if (!nickname) {
    return (
      <div className="flex flex-wrap gap-3">
        <a href={loginHref} className={primaryButtonClass}>
          {t("decide.signIn")}
        </a>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setNickname(randomNickname(locale === "en" ? "en" : "uk"))}
        >
          {t("decide.continueAnon")}
        </button>
      </div>
    );
  }
  return (
    <>
      <p className="rounded-xl border border-tone-white/10 bg-tone-white/[0.03] px-3 py-2 text-sm text-tone-300">
        {t("decide.anonHint", { nickname })}
      </p>
      {children(nickname)}
    </>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="relative flex min-h-screen items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-tone-white/10 bg-tone-black/40 p-5 shadow-2xl shadow-tone-black/40 backdrop-blur sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
