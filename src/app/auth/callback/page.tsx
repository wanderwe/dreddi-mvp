"use client";

import { useEffect, useState } from "react";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

type SignedInUser = {
  identities?: Array<{ provider: string; last_sign_in_at?: string | null }> | null;
};

// The provider of this sign-in is the identity used most recently.
function signedInWithApple(user: SignedInUser) {
  const latest = [...(user.identities ?? [])].sort((a, b) =>
    (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? "")
  )[0];
  return latest?.provider === "apple";
}

type CallbackMessage = { key: "signingIn" | "unavailable" | "linkExpired" | "noSession" | "error" | "unexpected"; detail?: string };

export default function AuthCallbackPage() {
  const t = useT();
  const [msg, setMsg] = useState<CallbackMessage>({ key: "signingIn" });

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg({ key: "unavailable" });
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const next = url.searchParams.get("next");

        // Hash-based flow (implicit)
        const hash = window.location.hash?.replace(/^#/, "") ?? "";
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const error_code = params.get("error_code");
        const error_description = params.get("error_description");

        if (error_code) {
          setMsg(
            error_code === "otp_expired"
              ? { key: "linkExpired" }
              : { key: "error", detail: error_description ?? error_code }
          );
          return;
        }

        // Apple's tokens come only with the code exchange; deleting the account revokes them later.
        let providerTokens: { refreshToken: string | null; accessToken: string | null } | null = null;

        // PKCE flow
        if (code) {
          const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged?.session?.provider_refresh_token || exchanged?.session?.provider_token) {
            providerTokens = {
              refreshToken: exchanged.session.provider_refresh_token ?? null,
              accessToken: exchanged.session.provider_token ?? null,
            };
          }
          if (error) {
            // "Identity is already linked" means the OAuth succeeded on a previous
            // attempt — treat as success and continue to sync + redirect.
            const isAlreadyLinked =
              error.message?.toLowerCase().includes("already linked") ||
              error.code === "identity_already_exists";
            if (!isAlreadyLinked) {
              setMsg({ key: "error", detail: error.message });
              return;
            }
          }
        }

        // Hash flow
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setMsg({ key: "error", detail: error.message });
            return;
          }
        }

        // Перевірка сесії
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          setMsg({ key: "noSession" });
          return;
        }

        // Upsert профілю
        const { upsertProfile } = await import("@/lib/ensureProfile");
        await upsertProfile(data.session.user);

        if (providerTokens && signedInWithApple(data.session.user)) {
          await fetch("/api/account/apple-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify(providerTokens),
          }).catch(() => null);
        }

        // Sync any OAuth social identities (Twitter, LinkedIn) to social_links table
        const { syncSocialLinks } = await import("@/lib/syncSocialLinks");
        await syncSocialLinks(supabase, data.session.user);

        const nextPath =
          next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
        window.location.replace(nextPath);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setMsg({ key: "unexpected", detail: message });
      }
    })();
  }, []);

  // The page sits under the 77px header, so it takes the rest of the screen and the card lands in the
  // middle of what is visible, not half a header lower.
  return (
    <main className="relative min-h-[calc(100dvh-77px)] overflow-hidden bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--auth-wash-1),transparent_30%),radial-gradient(circle_at_70%_10%,var(--auth-wash-2),transparent_28%),radial-gradient(circle_at_55%_65%,var(--auth-wash-3),transparent_40%)]" />

      <div className="relative flex min-h-[calc(100dvh-77px)] items-center justify-center px-6">
        <div className="glass-panel w-full max-w-xl rounded-3xl border-tone-white/10 p-8 text-center">
          <DreddiLogoMark className="mx-auto mb-4 h-12 w-12 drop-shadow-[0_0_18px_rgba(52,211,153,0.25)]" />
          <h1 className="text-3xl font-semibold text-tone-white">Dreddi knows</h1>
          <p className="mt-2 text-balance text-tone-300">{t(`auth.callback.${msg.key}`, { detail: msg.detail ?? "" })}</p>
          <div className="mt-4 text-sm text-accent-200">{t("auth.callback.securing")}</div>
        </div>
      </div>
    </main>
  );
}
