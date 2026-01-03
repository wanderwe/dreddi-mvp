"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

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
            setMsg("Auth error: " + error.message);
            return;
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

        // На головну
        window.location.replace("/");
      } catch (e: any) {
        setMsg("Unexpected error: " + (e?.message ?? "unknown"));
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Dreddi knows</h1>
        <p className="text-neutral-400">{msg}</p>
      </div>
    </main>
  );
}
