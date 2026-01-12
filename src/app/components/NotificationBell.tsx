"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";

export function NotificationBell({ className = "" }: { className?: string }) {
  const t = useT();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let active = true;

    const loadCount = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session || !active) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .is("read_at", null);

      if (!active) return;
      setCount(count ?? 0);
    };

    void loadCount();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 ${className}`}
      aria-label={t("nav.notifications")}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-semibold text-slate-950">
          {count}
        </span>
      )}
    </Link>
  );
}
