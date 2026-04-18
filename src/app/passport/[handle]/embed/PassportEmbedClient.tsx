"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";
import { getPassportStreak, getPublicPassportData, PublicPassportProfile } from "@/lib/passportData";

export default function PassportEmbedClient() {
  const params = useParams();
  const t = useT();
  const locale = useLocale();
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [profile, setProfile] = useState<PublicPassportProfile | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let active = true;

    const loadPassport = async () => {
      if (!handle) {
        setIsUnavailable(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getPublicPassportData(handle);
      if (!active) return;

      if (!result.data) {
        setIsUnavailable(true);
        setProfile(null);
        setStreak(0);
        setLoading(false);
        return;
      }

      setProfile(result.data.profile);
      setStreak(getPassportStreak(result.data.promises));
      setIsUnavailable(false);
      setLoading(false);
    };

    void loadPassport();

    return () => {
      active = false;
    };
  }, [handle]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0f1a] p-4 text-white">
        <div className="mx-auto flex h-full min-h-[260px] w-full max-w-[420px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm text-white/65">
          {t("passport.loading")}
        </div>
      </main>
    );
  }

  if (isUnavailable || !profile) {
    return (
      <main className="min-h-screen bg-[#0b0f1a] p-4 text-white">
        <div className="mx-auto flex min-h-[260px] w-full max-w-[420px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Dreddi Passport</p>
          <p className="mt-3 text-base font-semibold">{t("passport.unavailableTitle")}</p>
          <p className="mt-2 text-xs text-white/60">{t("passport.unavailable")}</p>
        </div>
      </main>
    );
  }

  const identity = getPublicProfileIdentity({
    displayName: profile.display_name,
    handle: profile.handle,
  });

  return (
    <main className="min-h-screen bg-[#0b0f1a] p-4 text-white">
      <article className="mx-auto flex min-h-[260px] w-full max-w-[420px] flex-col rounded-3xl border border-white/10 bg-[#0f1625] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{t("passport.label")}</p>
            <h1 className="mt-1 text-lg font-semibold leading-tight">{identity.title}</h1>
            {identity.subtitle ? <p className="text-xs text-white/60">{identity.subtitle}</p> : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{t("passport.score")}</p>
            <p className="text-xl font-semibold">{numberFormatter.format(profile.reputation_score ?? 50)}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-emerald-200/90">{t("passport.basedOnOutcomes")}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <EmbedMetric label={t("passport.fulfilled")} value={numberFormatter.format(profile.confirmed_count ?? 0)} />
          <EmbedMetric label={t("passport.disputed")} value={numberFormatter.format(profile.disputed_count ?? 0)} />
          <EmbedMetric label={t("passport.streak")} value={numberFormatter.format(streak)} />
        </div>

        <footer className="mt-auto pt-4 text-[11px] text-white/45">{t("passport.poweredBy")}</footer>
      </article>
    </main>
  );
}

function EmbedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
