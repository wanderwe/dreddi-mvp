"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { IconButton } from "@/app/components/ui/IconButton";

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
    <IconButton
      href="/notifications"
      ariaLabel={t("nav.notifications")}
      className={className}
      icon={
        <>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-semibold text-slate-950">
              {count}
            </span>
          )}
        </>
      }
    />
  );
}
