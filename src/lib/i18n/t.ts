import { Locale } from "./locales";
import { MessageValue, Messages } from "./getMessages";

type Params = Record<string, string | number>;

const format = (template: string, params?: Params) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    params && key in params ? String(params[key]) : `{${key}}`
  );

const resolveKey = (messages: Messages, key: string): MessageValue | undefined => {
  return key.split(".").reduce<MessageValue | undefined>((acc, part) => {
    if (
      typeof acc === "string" ||
      acc === undefined ||
      Array.isArray(acc)
    )
      return acc;
    return acc[part];
  }, messages);
};

export type TFunction = (key: string, params?: Params) => string;

export const createTranslator = (_locale: Locale, messages: Messages): TFunction => {
  return (key, params) => {
    const resolved = resolveKey(messages, key);
    if (typeof resolved !== "string") return `⟦missing:${key}⟧`;
    return format(resolved, params);
  };
};
