"use client";

import React, { createContext, useContext, useMemo } from "react";

const IntlContext = createContext({ locale: "en", messages: {} });

function replaceParams(text, params = {}) {
  return Object.keys(params).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, "g"), String(params[key]));
  }, text);
}

function NextIntlClientProvider({ locale, messages, children }) {
  const value = useMemo(() => ({ locale, messages: messages || {} }), [locale, messages]);
  return React.createElement(IntlContext.Provider, { value }, children);
}

function useTranslations(namespace) {
  const { messages = {} } = useContext(IntlContext);
  const scoped = namespace ? messages?.[namespace] ?? {} : messages;
  return (key, params) => {
    const message = scoped?.[key];
    if (typeof message === "string") {
      return replaceParams(message, params);
    }
    return key;
  };
}

function useLocale() {
  return useContext(IntlContext).locale;
}

function useMessages() {
  return useContext(IntlContext).messages;
}

export { NextIntlClientProvider, useLocale, useMessages, useTranslations };
