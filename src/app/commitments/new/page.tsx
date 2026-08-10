"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getAuthHeaders, type CommitmentVisibility } from "@/lib/commitments";
import { DateField } from "@/app/components/ui/DateField";

export default function NewCommitmentPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [visibility, setVisibility] = useState<CommitmentVisibility>(
    searchParams.get("visibility") === "public" ? "public" : "private",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("commitments.form.errors.titleRequired"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/commitments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(headers ?? {}) },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          deadline: deadline ? deadline.toISOString() : null,
          visibility,
        }),
      });

      if (response.status === 401) {
        window.location.href = localizeLoginPath(localizePath("/commitments/new", locale), locale);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : t("commitments.form.errors.createFailed"));
        return;
      }

      router.push(localizePath(`/commitments/${payload.id}`, locale));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("commitments.form.errors.network"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 md:py-10">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-white/10 bg-black/40 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("commitments.form.eyebrow")}</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t("commitments.form.title")}</h1>
            <p className="text-sm text-slate-300">{t("commitments.form.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
            )}

            <label className="block space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("commitments.form.fields.title")}
              </span>
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("commitments.form.placeholders.title")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>

            <label className="block space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("commitments.form.fields.description")}
              </span>
              <textarea
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("commitments.form.placeholders.description")}
                className="min-h-[130px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>

            <div className="space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("commitments.form.fields.deadline")}
              </span>
              <DateField
                value={deadline}
                onChange={setDeadline}
                locale={locale}
                placeholder={t("commitments.form.placeholders.dueDate")}
                clearLabel={t("commitments.form.actions.clearDate")}
                ariaLabel={t("commitments.form.fields.deadline")}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{t("commitments.form.visibility.label")}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{t("commitments.form.visibility.helper")}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visibility === "public"}
                  aria-label={t("commitments.form.visibility.label")}
                  onClick={() => setVisibility((prev) => (prev === "public" ? "private" : "public"))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition ${
                    visibility === "public"
                      ? "border-emerald-300/50 bg-emerald-400/70 hover:bg-emerald-400/80"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                      visibility === "public" ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? t("commitments.form.creating") : t("commitments.form.submit")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
