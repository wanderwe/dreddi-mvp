"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DreddiLogo, DreddiLogoMark } from "@/app/components/DreddiLogo";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export default function Home() {
  const locale = useLocale();
  const [email, setEmail] = useState<string | null>(null);
  const isAuthenticated = Boolean(email);

  useEffect(() => {
    let active = true;
    const client = supabase;

    if (!client) {
      return;
    }

    const syncSession = async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!active) return;
      setEmail(sessionData.session?.user?.email ?? null);
    };

    void syncSession();

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const content =
    locale === "uk"
      ? {
          name: "Dreddi знає",
          statement: "Домовленості мають значення лише після прийняття.",
          lines: [
            "Dreddi допомагає двом людям зафіксувати домовленість,",
            "явно прийняти відповідальність",
            "та залишити фактичний репутаційний слід —",
            "без юридичного тиску, але з реальною відповідальністю.",
          ],
          primaryCta: "Створити угоду",
          secondaryCta: "Переглянути публічні профілі",
        }
      : {
          name: "Dreddi knows",
          statement: "Agreements matter only after they’re accepted.",
          lines: [
            "Dreddi helps two people fix an agreement,",
            "explicitly accept responsibility,",
            "and leave a factual reputation trail —",
            "without legal enforcement, but with real accountability.",
          ],
          primaryCta: "Create deal",
          secondaryCta: "View public profiles",
        };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <header className="absolute inset-x-0 top-0 z-10">
        <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-6">
          <Link href="/" className="flex min-w-0 items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-10 w-10"
              textClassName="min-w-0"
              titleClassName="truncate text-lg"
            />
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 pb-12 pt-24 sm:px-6 md:gap-16 md:flex-row md:items-center md:py-14">
        <div className="flex-1 flex flex-col gap-6 md:gap-8">
          <div className="order-2 space-y-4">
            <div className="flex items-center gap-4">
              <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_0_25px_rgba(52,211,153,0.35)] sm:h-14 sm:w-14" />
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-5xl">
                {content.name}
              </h1>
            </div>
            <p className="max-w-xl text-lg font-semibold text-white sm:text-xl">
              {content.statement}
            </p>
            <p className="max-w-xl text-base text-slate-300 sm:text-lg">
              {content.lines.map((line, index) => (
                <span key={line} className={index === 3 ? "block font-semibold text-white" : "block"}>
                  {line}
                </span>
              ))}
            </p>
          </div>

          <div className="order-3 flex flex-wrap items-center gap-3 md:order-4">
            <Link
              href={isAuthenticated ? "/promises/new" : "/login"}
              className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
            >
              {content.primaryCta}
            </Link>
            <Link
              href="/u"
              className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
            >
              {content.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
