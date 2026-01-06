import { Locale } from "./locales";
import { Messages } from "./getMessages";

type Params = Record<string, string | number>;

const format = (template: string, params?: Params) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    params && key in params ? String(params[key]) : `{${key}}`
  );

const resolveKey = (messages: Messages, key: string): string | undefined => {
  return key.split(".").reduce<string | Messages | undefined>((acc, part) => {
    if (typeof acc === "string" || acc === undefined) return acc as string | undefined;
    const next = acc[part];
    return next as string | Messages | undefined;
  }, messages) as string | undefined;
};

export type TFunction = (key: string, params?: Params) => string;

export const createTranslator = (_locale: Locale, messages: Messages): TFunction => {
  return (key, params) => {
    const resolved = resolveKey(messages, key);
    if (typeof resolved !== "string") return `⟦missing:${key}⟧`;
    return format(resolved, params);
  };
};
