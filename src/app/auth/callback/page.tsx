"use client";

import { useEffect, useState } from "react";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Authentication is unavailable in this preview.");
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
              ? "Лінк протермінований. Зроби логін ще раз."
              : error_description ?? error_code
          );
          return;
        }

        // PKCE flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // "Identity is already linked" means the OAuth succeeded on a previous
            // attempt — treat as success and continue to sync + redirect.
            const isAlreadyLinked =
              error.message?.toLowerCase().includes("already linked") ||
              error.code === "identity_already_exists";
            if (!isAlreadyLinked) {
              setMsg("Auth error: " + error.message);
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
            setMsg("Auth error: " + error.message);
            return;
          }
        }

        // Перевірка сесії
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          setMsg("No session found. Try logging in again.");
          return;
        }

        // Upsert профілю
        const { upsertProfile } = await import("@/lib/ensureProfile");
        await upsertProfile(data.session.user);

        // Sync any OAuth social identities (Twitter, LinkedIn) to social_links table
        const { syncSocialLinks } = await import("@/lib/syncSocialLinks");
        await syncSocialLinks(supabase, data.session.user);

        const nextPath =
          next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
        window.location.replace(nextPath);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setMsg("Unexpected error: " + message);
      }
    })();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--auth-wash-1),transparent_30%),radial-gradient(circle_at_70%_10%,var(--auth-wash-2),transparent_28%),radial-gradient(circle_at_55%_65%,var(--auth-wash-3),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel w-full max-w-xl rounded-3xl border-tone-white/10 p-8 text-center">
          <DreddiLogoMark className="mx-auto mb-4 h-12 w-12 drop-shadow-[0_0_18px_rgba(52,211,153,0.25)]" />
          <h1 className="text-3xl font-semibold text-tone-white">Dreddi knows</h1>
          <p className="mt-2 text-tone-300">{msg}</p>
          <div className="mt-4 text-sm text-accent-200">Securing your session…</div>
        </div>
      </div>
    </main>
  );
}
