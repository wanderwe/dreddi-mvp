import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";
import enPledge from "@/messages/pledge/en.json";
import ukPledge from "@/messages/pledge/uk.json";
import { POSITIONING } from "@/lib/features";
import { Locale, defaultLocale } from "./locales";

export type MessageValue =
  | string
  | number
  | boolean
  | null
  | MessageValue[]
  | { [key: string]: MessageValue };

export type Messages = { [key: string]: MessageValue };

const isPlainObject = (value: MessageValue | undefined): value is Messages =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Overlay wins key by key; anything it does not mention comes from the base dictionary.
const mergeMessages = (base: Messages, overlay: Messages): Messages => {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value) ? mergeMessages(current, value) : value;
  }
  return merged;
};

const baseDictionaries: Record<Locale, Messages> = {
  en: enMessages,
  uk: ukMessages,
};

// The "pledge" positioning only rewrites the strings that differ (src/messages/pledge/*).
const pledgeOverlays: Record<Locale, Messages> = {
  en: enPledge,
  uk: ukPledge,
};

const dictionaries: Record<Locale, Messages> =
  POSITIONING === "pledge"
    ? {
        en: mergeMessages(baseDictionaries.en, pledgeOverlays.en),
        uk: mergeMessages(baseDictionaries.uk, pledgeOverlays.uk),
      }
    : baseDictionaries;

export const getMessages = (locale: Locale): Messages =>
  dictionaries[locale] ?? dictionaries[defaultLocale];
