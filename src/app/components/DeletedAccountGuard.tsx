"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { supabaseOptional } from "@/lib/supabaseClient";

const RESTORE_PATH = "/account/restore";

// Someone who asked to delete their account and signs in again within 30 days lands on the restore
// screen, whatever page they open.
export function DeletedAccountGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const client = supabaseOptional;
    if (!client) return;
    let active = true;

    const check = async (userId: string | undefined) => {
      if (!userId || pathname?.endsWith(RESTORE_PATH)) return;
      const { data } = await client
        .from("profiles")
        .select("deleted_at")
        .eq("id", userId)
        .maybeSingle<{ deleted_at: string | null }>();
      if (active && data?.deleted_at) router.replace(localizePath(RESTORE_PATH, locale));
    };

    void client.auth.getSession().then(({ data }) => check(data.session?.user.id));
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") void check(session?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router, locale]);

  return null;
}
