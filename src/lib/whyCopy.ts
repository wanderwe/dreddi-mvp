import { type Locale, defaultLocale } from "@/lib/i18n/locales";

export type WhySectionKind = "turn" | "body" | "list";

export type WhyCopy = {
  seo: {
    title: string;
    description: string;
  };
  title: string;
  subtitle: string;
  sections: {
    kind: WhySectionKind;
    paragraphs: string[];
  }[];
  cta: string;
};

export const whyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "When to use Dreddi — Dreddi",
      description:
        "When to use Dreddi for real-life agreements where clarity, follow-through, and trust matter",
    },
    title: "When to use Dreddi",
    subtitle: "",
    sections: [
      { kind: "turn", paragraphs: ["When something depends on someone else"] },
      {
        kind: "body",
        paragraphs: ["“I’ll do it tomorrow”", "“I’ll send it later”", "“Let’s follow up next week”"],
      },
      { kind: "body", paragraphs: ["And you don’t want it to disappear in chat"] },
      { kind: "turn", paragraphs: ["When there is no contract"] },
      {
        kind: "body",
        paragraphs: ["You agreed on something", "It matters", "But nothing formally enforces it"],
      },
      { kind: "turn", paragraphs: ["When you work with someone for the first time"] },
      { kind: "body", paragraphs: ["You don’t really know if you can rely on them"] },
      { kind: "body", paragraphs: ["And they don’t know you either"] },
      { kind: "turn", paragraphs: ["When you don’t want to argue later"] },
      { kind: "body", paragraphs: ["Not “you said / I said”", "But something clear"] },
      { kind: "body", paragraphs: ["What was agreed", "And what actually happened"] },
    ],
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Коли використовувати Dreddi — Dreddi",
      description:
        "Коли використовувати Dreddi для реальних домовленостей, де важливі ясність, виконання та довіра",
    },
    title: "Коли використовувати Dreddi",
    subtitle: "",
    sections: [
      { kind: "turn", paragraphs: ["Коли щось залежить від іншої людини"] },
      {
        kind: "body",
        paragraphs: ["“зроблю завтра”", "“скину пізніше”", "“давай повернемось до цього наступного тижня”"],
      },
      { kind: "body", paragraphs: ["І ти не хочеш, щоб це загубилось у чаті"] },
      { kind: "turn", paragraphs: ["Коли немає контракту"] },
      {
        kind: "body",
        paragraphs: ["Ви про щось домовились", "Це має значення", "Але це нічим не закріплено"],
      },
      { kind: "turn", paragraphs: ["Коли працюєш з кимось вперше"] },
      { kind: "body", paragraphs: ["Ти не знаєш, чи можна на нього покластись"] },
      { kind: "body", paragraphs: ["І він не знає тебе"] },
      { kind: "turn", paragraphs: ["Коли не хочеш потім сперечатись"] },
      { kind: "body", paragraphs: ["Не “ти казав / я казав”"] },
      { kind: "body", paragraphs: ["А чітко"] },
      { kind: "body", paragraphs: ["Що було погоджено", "І чим це закінчилось"] },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
