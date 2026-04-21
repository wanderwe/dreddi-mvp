"use client";

import { FormEvent, useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";

type GroupRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default function PromiseGroupsPage() {
  const t = useT();
  const locale = useLocale();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let active = true;

    const loadGroups = async () => {
      setError(null);
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Authentication is unavailable.");
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = localizeLoginPath(localizePath("/promises/groups", locale), locale);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("promise_groups")
        .select("id,title,description,created_at")
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (loadError) setError(loadError.message);
      else setGroups((data ?? []) as GroupRow[]);
      setLoading(false);
    };

    void loadGroups();
    return () => {
      active = false;
    };
  }, [locale]);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSubmitting(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Authentication is unavailable.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setSubmitting(false);
      window.location.href = localizeLoginPath(localizePath("/promises/groups", locale), locale);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("promise_groups")
      .insert({
        owner_user_id: session.user.id,
        title: trimmedTitle,
        description: description.trim() || null,
      })
      .select("id,title,description,created_at")
      .single();

    setSubmitting(false);

    if (insertError || !inserted) {
      setError(insertError?.message ?? t("groups.errors.createFailed"));
      return;
    }

    setGroups((prev) => [inserted as GroupRow, ...prev]);
    setTitle("");
    setDescription("");
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("groups.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{t("groups.title")}</h1>
          <p className="mt-2 text-sm text-slate-300">{t("groups.subtitle")}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">{t("groups.create.title")}</h2>
        <form className="mt-4 space-y-3" onSubmit={createGroup}>
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300/60"
            placeholder={t("groups.create.titlePlaceholder")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
          />
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300/60"
            placeholder={t("groups.create.descriptionPlaceholder")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={280}
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("groups.create.creating") : t("groups.create.submit")}
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">{t("groups.list.title", { count: groups.length })}</h2>
        {error && <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-400">{t("groups.loading")}</p>
        ) : groups.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">{t("groups.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li key={group.id}>
                <LocalizedLink
                  href={`/promises/groups/${group.id}`}
                  className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-emerald-300/40 hover:bg-white/5"
                >
                  <p className="font-semibold text-white">{group.title}</p>
                  {group.description && <p className="mt-1 text-sm text-slate-300">{group.description}</p>}
                </LocalizedLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
