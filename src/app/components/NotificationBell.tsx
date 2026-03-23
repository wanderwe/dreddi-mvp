"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthState } from "@/lib/auth/getAuthState";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { IconButton } from "@/app/components/ui/IconButton";
import { fetchUnreadNotificationCount } from "@/lib/notifications/queries";
import {
  isNotificationCountEvent,
  NOTIFICATION_COUNT_EVENT,
} from "@/lib/notifications/clientSync";

export function NotificationBell({ className = "" }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const loadCount = async (supabase: SupabaseClient, userId: string) => {
      if (!active) return;
      const count = await fetchUnreadNotificationCount(supabase, userId);
      if (!active) return;
      setCount(count);
    };

    const init = async () => {
      const authState = await getAuthState();
      if (!active) return;
      if (authState.isMock) {
        setCount(0);
        return;
      }
      const userId = authState.user?.id;
      if (!authState.isLoggedIn || !userId) {
        setCount(0);
        return;
      }

      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }

      await loadCount(supabase, userId);

      channel = supabase
        .channel(`notifications-count-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadCount(supabase, userId);
          }
        )
        .subscribe();

      pollId = setInterval(() => {
        void loadCount(supabase, userId);
      }, 45000);
    };

    const onCountDelta = (event: Event) => {
      if (!isNotificationCountEvent(event)) return;
      const delta = event.detail?.delta ?? 0;
      if (!delta) return;
      setCount((prev) => Math.max(0, prev + delta));
    };

    window.addEventListener(NOTIFICATION_COUNT_EVENT, onCountDelta);

    void init();

    return () => {
      active = false;
      if (channel) {
        try {
          const supabase = requireSupabase();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
      if (pollId) {
        clearInterval(pollId);
      }
      window.removeEventListener(NOTIFICATION_COUNT_EVENT, onCountDelta);
    };
  }, []);

  return (
    <IconButton
      href={localizePath("/notifications", locale)}
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
