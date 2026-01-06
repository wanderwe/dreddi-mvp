import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";
import { Locale, defaultLocale } from "./locales";

export type Messages = Record<string, string | Messages>;

const dictionaries: Record<Locale, Messages> = {
  en: enMessages,
  uk: ukMessages,
};

export const getMessages = (locale: Locale): Messages =>
  dictionaries[locale] ?? dictionaries[defaultLocale];
