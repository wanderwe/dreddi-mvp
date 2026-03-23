"use client";

import { useEffect } from "react";
import { Locale } from "@/lib/i18n/locales";

export function DocumentLanguageSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
