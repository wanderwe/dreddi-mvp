"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { requireSupabase } from "@/lib/supabaseClient";

const FEEDBACK_CATEGORIES = ["suggestion", "bug", "confusing_ux", "other"] as const;
const MIN_FEEDBACK_LENGTH = 5;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

type FeedbackModalTriggerProps = {
  triggerLabel?: string;
  triggerClassName?: string;
};

export function FeedbackModalTrigger({ triggerLabel, triggerClassName = "" }: FeedbackModalTriggerProps) {
  const t = useT();
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trimmedMessage = message.trim();
  const canSubmit = Boolean(category) && trimmedMessage.length >= MIN_FEEDBACK_LENGTH && !submitting;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const submitFeedback = async () => {
    if (!category) {
      setError(t("feedback.validation.categoryRequired"));
      return;
    }

    if (!trimmedMessage) {
      setError(t("feedback.validation.messageRequired"));
      return;
    }
    if (trimmedMessage.length < MIN_FEEDBACK_LENGTH) {
      setError(t("feedback.validation.messageMinLength", { min: String(MIN_FEEDBACK_LENGTH) }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = requireSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(t("feedback.errors.submitFailed"));
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          allowContact,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          locale,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("feedback.errors.submitFailed"));
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setAllowContact(false);
        setCategory("suggestion");
        setSuccess(false);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feedback.errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
          setSuccess(false);
        }}
        className={triggerClassName}
      >
        {triggerLabel ?? t("nav.sendFeedback")}
      </button>

      {open && mounted &&
        createPortal(
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label={t("feedback.close")}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-4 shadow-2xl shadow-black/60 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{t("feedback.title")}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                aria-label={t("feedback.close")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-200">{t("feedback.categoryLabel")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_CATEGORIES.map((item) => {
                    const active = category === item;
                    const labelKey =
                      item === "confusing_ux"
                        ? "feedback.categories.confusingUx"
                        : `feedback.categories.${item}`;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition ${
                          active
                            ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/20"
                            : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30 hover:bg-white/[0.06]"
                        }`}
                      >
                        {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-200">{t("feedback.messageLabel")}</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  placeholder={t("feedback.messagePlaceholder")}
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-300/50"
                />
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-200">
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border transition ${
                    allowContact
                      ? "border-emerald-300/60 bg-emerald-400/80 text-slate-950"
                      : "border-white/25 bg-white/[0.03] text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <input
                  type="checkbox"
                  checked={allowContact}
                  onChange={(event) => setAllowContact(event.target.checked)}
                  className="sr-only"
                />
                <span>{t("feedback.allowContact")}</span>
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              {success ? (
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {t("feedback.success")}
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-white/30"
                    disabled={submitting}
                  >
                    {t("feedback.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submitFeedback}
                    className="cursor-pointer rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/40 disabled:text-slate-800 disabled:opacity-80"
                    disabled={!canSubmit}
                  >
                    {submitting ? t("feedback.sending") : t("feedback.submit")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        , document.body)}
    </>
  );
}

export default FeedbackModalTrigger;
