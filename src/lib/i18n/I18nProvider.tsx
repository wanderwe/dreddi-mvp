"use client";

import { createContext, useContext, useMemo } from "react";
import { Locale } from "./locales";
import { Messages } from "./getMessages";
import { TFunction, createTranslator } from "./t";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) => {
  const value = useMemo(
    () => ({ locale, messages, t: createTranslator(locale, messages) }),
    [locale, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useT = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx.t;
};
