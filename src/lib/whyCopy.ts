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
      title: "Why Dreddi Exists — Dreddi",
      description:
        "Learn why Dreddi was built and how it turns promises into reputation through real outcomes",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      { kind: "body", paragraphs: ["You agreed on something"] },
      { kind: "list", paragraphs: ["A deadline", "A result", "A responsibility"] },
      { kind: "turn", paragraphs: ["And then… nothing happens"] },
      {
        kind: "list",
        paragraphs: ["I’ll do it tomorrow", "I’ll send it later", "Let’s follow up next week"],
      },
      { kind: "list", paragraphs: ["No reminder", "No confirmation", "No clear outcome"] },
      { kind: "body", paragraphs: ["Just different memories of what was supposed to happen"] },
      {
        kind: "turn",
        paragraphs: ["That’s the problem"],
      },
      {
        kind: "body",
        paragraphs: ["Not people", "Not intentions", "Just the fact that agreements disappear"],
      },
      { kind: "turn", paragraphs: ["Dreddi exists to keep them visible"] },
      { kind: "list", paragraphs: ["Not to judge", "Not to rate", "Not to argue"] },
      {
        kind: "body",
        paragraphs: ["Just to record:", "what was agreed", "and what actually happened"],
      },
      {
        kind: "turn",
        paragraphs: ["Because reputation is not what people say"],
      },
      { kind: "body", paragraphs: ["It’s what you actually do"] },
      { kind: "body", paragraphs: ["Over time, it becomes obvious", "Who delivers", "And who doesn’t"] },
      { kind: "list", paragraphs: ["No contracts", "No pressure", "Just clarity — and consequences"] },
    ],
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description:
        "Дізнайтесь, чому створили Dreddi і як сервіс перетворює обіцянки на репутацію через реальні результати",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "body", paragraphs: ["Ви про щось домовилися"] },
      { kind: "list", paragraphs: ["Дедлайн", "Результат", "Відповідальність"] },
      { kind: "turn", paragraphs: ["А потім… нічого не відбувається"] },
      {
        kind: "list",
        paragraphs: ["Зроблю завтра", "Скину пізніше", "Давай повернемось до цього наступного тижня"],
      },
      { kind: "list", paragraphs: ["Нагадування немає", "Підтвердження немає", "Чіткого результату немає"] },
      { kind: "body", paragraphs: ["Лише різні спогади про те, що мало статися"] },
      {
        kind: "turn",
        paragraphs: ["Ось у чому проблема"],
      },
      {
        kind: "body",
        paragraphs: ["Не в людях", "Не в намірах", "А в тому, що домовленості зникають"],
      },
      { kind: "turn", paragraphs: ["Dreddi існує, щоб тримати їх видимими"] },
      { kind: "list", paragraphs: ["Не щоб судити", "Не щоб оцінювати", "Не щоб сперечатися"] },
      {
        kind: "body",
        paragraphs: ["Лише щоб зафіксувати:", "про що домовилися", "і що насправді сталося"],
      },
      {
        kind: "turn",
        paragraphs: ["Бо репутація — це не те, що кажуть люди"],
      },
      { kind: "body", paragraphs: ["Це те, що ви реально робите"] },
      { kind: "body", paragraphs: ["З часом це стає очевидно", "Хто виконує", "А хто ні"] },
      { kind: "list", paragraphs: ["Без контрактів", "Без тиску", "Лише ясність — і наслідки"] },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
