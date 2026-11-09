"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Dices } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { supabaseOptional } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath } from "@/lib/i18n/routing";
import { randomNickname } from "@/lib/quickDisputes/state";

// Shared by the «Хто правий?» pages: calls with the session when there is one (the browser cookie
// covers anonymous sides), whether someone is signed in, the chat bubbles, the steps and the choice
// of how to appear, asked only when the side sends what they wrote.

export const inputClass =
  "w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-3 py-2 text-sm text-tone-white outline-none focus:border-accent-300/60";
export const primaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-accent-500/20 transition hover:-translate-y-0.5 hover:shadow-accent-400/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
export const secondaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-tone-white/15 px-4 py-2.5 text-sm font-semibold text-tone-200 transition hover:border-accent-300/50 hover:text-accent-200 disabled:cursor-not-allowed disabled:opacity-50";

// A row of actions: the main one on the right on desktop, on top on a phone (the DOM lists it last).
export const actionRowClass = "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end";

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

// The signed-in person's own name as other sides will see it (display name, else @handle), for their
// avatar before anything is sent; null while unknown or not signed in.
export function useMyName(signedIn: boolean | null) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!signedIn || !supabaseOptional) return;
    const client = supabaseOptional;
    void client.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) return;
      const { data: profile } = await client.from("profiles").select("display_name,handle").eq("id", userId).maybeSingle();
      const row = profile as { display_name: string | null; handle: string | null } | null;
      setName(row?.display_name?.trim() || (row?.handle ? row.handle : null));
    });
  }, [signedIn]);
  return name;
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

// The nickname an anonymous side would get, picked in the browser (after mount, so the server render
// matches) and rerollable before sending.
export function useDraftNickname() {
  const locale = useLocale();
  const lang = locale === "en" ? "en" : "uk";
  const [nickname, setNickname] = useState<string | null>(null);
  useEffect(() => setNickname(randomNickname(lang)), [lang]);
  const reroll = useCallback(() => setNickname((current) => randomNickname(lang, current ?? undefined)), [lang]);
  return { nickname, reroll };
}

// What a side typed survives a trip to the sign-in page and back.
export function useDraft<T extends Record<string, string>>(key: string, initial: T) {
  const storageKey = `dreddi-decide-draft:${key}`;
  const [draft, setDraft] = useState<T>(initial);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setDraft((current) => ({ ...current, ...(JSON.parse(saved) as Partial<T>) }));
    } catch {
      // No storage: the draft just starts empty.
    }
  }, [storageKey]);
  const update = useCallback(
    (patch: Partial<T>) =>
      setDraft((current) => {
        const next = { ...current, ...patch };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore.
        }
        return next;
      }),
    [storageKey]
  );
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }
  }, [storageKey]);
  return { draft, update, clear };
}

export function NicknameTag({ nickname, onReroll }: { nickname: string | null; onReroll?: () => void }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{nickname ? t("decide.youAs", { nickname }) : t("decide.you")}</span>
      {nickname && onReroll && (
        <Tooltip label={t("decide.anotherNickname")} placement="top">
          <button
            type="button"
            onClick={onReroll}
            aria-label={t("decide.anotherNickname")}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-tone-400 transition hover:bg-tone-white/10 hover:text-accent-200"
          >
            <Dices className="h-3.5 w-3.5" aria-hidden />
          </button>
        </Tooltip>
      )}
    </span>
  );
}

// Asked when an anonymous visitor sends: go on under the nickname, or sign in (the draft is kept).
export function IdentityChoice({
  nickname,
  busy,
  onAnonymous,
}: {
  nickname: string;
  busy: boolean;
  onAnonymous: () => void;
}) {
  const t = useT();
  const loginHref = useLoginHref();
  return (
    <div className="decide-pop space-y-3 rounded-2xl border border-accent-400/30 bg-accent-400/[0.06] p-4">
      <p className="text-base font-semibold text-tone-white">{t("decide.identityAsk")}</p>
      <div className={actionRowClass}>
        <a href={loginHref} className={secondaryButtonClass}>
          {t("decide.signIn")}
        </a>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={onAnonymous}>
          {t("decide.anonAs", { nickname })}
        </button>
      </div>
      <p className="text-xs text-tone-400">{t("decide.anonHint", { nickname })}</p>
    </div>
  );
}

export type StepIndex = 0 | 1 | 2 | 3 | 4;

// Question · Positions · Replies · Verdict; `current` is the step in progress, 4 when all are done.
export function StepsBar({ current }: { current: StepIndex }) {
  const t = useT();
  const labels = [t("decide.steps.question"), t("decide.steps.positions"), t("decide.steps.replies"), t("decide.steps.verdict")];
  return (
    <ol className="grid grid-cols-4 gap-1.5">
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="space-y-1.5">
            <div
              className={`h-1 rounded-full transition-colors ${
                done ? "bg-emerald-400" : active ? "bg-emerald-400/50" : "bg-tone-white/10"
              }`}
            />
            <p className={`truncate text-[11px] font-medium ${active ? "text-tone-white" : done ? "text-tone-300" : "text-tone-500"}`}>
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function Avatar({ name, side }: { name: string; side: "me" | "other" }) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        side === "me" ? "bg-emerald-400 text-slate-950" : "bg-sky-400/80 text-slate-950"
      }`}
      aria-hidden
    >
      {letter}
    </span>
  );
}

// One message in the chat: mine on the right, the other side's on the left, a dashed ghost for a reply
// that is not there yet.
export function Bubble({
  side,
  name,
  label,
  children,
  ghost = false,
  muted = false,
  highlight = false,
  wide = false,
  delayMs = 0,
}: {
  side: "me" | "other";
  name: string;
  label: ReactNode;
  children: ReactNode;
  ghost?: boolean;
  muted?: boolean;
  highlight?: boolean;
  wide?: boolean;
  delayMs?: number;
}) {
  const mine = side === "me";
  return (
    <div
      className={`decide-pop flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {ghost ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-tone-white/25 text-sm text-tone-500" aria-hidden>
          ?
        </span>
      ) : (
        <Avatar name={name} side={side} />
      )}
      <div className={`flex min-w-0 max-w-[85%] flex-col gap-1 ${wide ? "w-full" : ""} ${mine ? "items-end" : "items-start"}`}>
        <p className="px-1 text-xs font-semibold text-tone-400">{label}</p>
        <div
          className={`w-full rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            ghost || muted
              ? "border border-dashed border-tone-white/20 text-tone-500"
              : mine
                ? "rounded-br-md border border-emerald-400/30 bg-emerald-400/[0.12] text-tone-100"
                : "rounded-bl-md border border-sky-400/30 bg-sky-400/[0.10] text-tone-100"
          } ${highlight ? "ring-2 ring-amber-300/70" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="decide-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

// A read-only link with the copy button inside the field: one click copies, the icon turns into a check.
export function CopyField({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <input
        className={`${inputClass} py-3 pr-12`}
        value={text}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <Tooltip label={copied ? copiedLabel : label} placement="top">
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? copiedLabel : label}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition ${
              copied ? "bg-emerald-400 text-slate-950" : "text-tone-300 hover:bg-tone-white/10 hover:text-accent-200"
            }`}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          </button>
        </Tooltip>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </div>
  );
}

// The loading placeholder used across the product: pulsing blocks where content will appear.
export function SkeletonRows({ count = 3, className = "h-[52px]" }: { count?: number; className?: string }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${className} animate-pulse rounded-xl bg-tone-white/5`} />
      ))}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="relative flex min-h-screen items-start justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-tone-white/10 bg-tone-black/40 p-4 shadow-2xl shadow-tone-black/40 backdrop-blur sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
