import { type Locale, defaultLocale } from "@/lib/i18n/locales";

export type WhyCopy = {
  seo: {
    title: string;
    description: string;
  };
  title: string;
  subtitle: string;
  sections: {
    heading?: string;
    paragraphs: string[];
  }[];
  cta: string;
};

const narrativeSections = [
  {
    paragraphs: [
      "You agreed on something",
    ],
  },
  {
    paragraphs: [
      "A deadline",
      "A result",
      "A responsibility",
    ],
  },
  {
    paragraphs: [
      "And then… nothing happens",
    ],
  },
  {
    paragraphs: [
      "No reminder",
      "No confirmation",
      "No clear outcome",
    ],
  },
  {
    paragraphs: [
      "Just different memories of what was supposed to happen",
    ],
  },
  {
    paragraphs: [
      "That’s the problem",
    ],
  },
  {
    paragraphs: [
      "Not people",
      "Not intentions",
    ],
  },
  {
    paragraphs: [
      "Just the fact that agreements disappear",
    ],
  },
  {
    paragraphs: [
      "Dreddi exists to keep them visible",
    ],
  },
  {
    paragraphs: [
      "Not to judge",
      "Not to rate",
      "Not to argue",
    ],
  },
  {
    paragraphs: [
      "Just to record:",
    ],
  },
  {
    paragraphs: [
      "what was agreed",
      "and what actually happened",
    ],
  },
  {
    paragraphs: [
      "Because reputation is not what people say",
    ],
  },
  {
    paragraphs: [
      "It’s what you actually do",
    ],
  },
  {
    paragraphs: [
      "Over time, it becomes obvious",
    ],
  },
  {
    paragraphs: [
      "Who delivers",
      "And who doesn’t",
    ],
  },
  {
    paragraphs: [
      "No contracts",
      "No pressure",
    ],
  },
  {
    paragraphs: [
      "Just clarity — and consequences",
    ],
  },
] as const;

export const whyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description:
        "Learn why Dreddi was built and how it turns promises into reputation through real outcomes",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: narrativeSections.map((section) => ({ ...section, paragraphs: [...section.paragraphs] })),
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description:
        "Дізнайтесь, чому створили Dreddi і як сервіс перетворює обіцянки на репутацію через реальні результати",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: narrativeSections.map((section) => ({ ...section, paragraphs: [...section.paragraphs] })),
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
