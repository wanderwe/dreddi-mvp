import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";
import { Locale, defaultLocale } from "./locales";

export type MessageValue =
  | string
  | number
  | boolean
  | null
  | MessageValue[]
  | { [key: string]: MessageValue };

export type Messages = { [key: string]: MessageValue };

const dictionaries: Record<Locale, Messages> = {
  en: enMessages,
  uk: ukMessages,
};

export const getMessages = (locale: Locale): Messages =>
  dictionaries[locale] ?? dictionaries[defaultLocale];
