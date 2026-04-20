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
      { kind: "turn", paragraphs: ["Most agreements don’t fail loudly"] },
      { kind: "body", paragraphs: ["They fade"] },
      {
        kind: "body",
        paragraphs: ["“I’ll do it tomorrow”", "“I’ll send it later”", "“Let’s follow up next week”"],
      },
      { kind: "body", paragraphs: ["Nothing dramatic happens"] },
      { kind: "list", paragraphs: ["No conflict", "No confrontation", "No consequences"] },
      { kind: "turn", paragraphs: ["Just silence"] },
      { kind: "body", paragraphs: ["Over time, you start noticing a pattern"] },
      { kind: "list", paragraphs: ["Some people deliver", "Some people don’t"] },
      { kind: "body", paragraphs: ["It doesn’t matter who it is"] },
      { kind: "list", paragraphs: ["A colleague", "A friend", "A partner"] },
      {
        kind: "body",
        paragraphs: [
          "If something matters — you remember what happened",
          "But you don’t have a place to see it clearly",
        ],
      },
      { kind: "turn", paragraphs: ["And that creates a quiet problem"] },
      { kind: "body", paragraphs: ["You rely on people", "But you don’t really know if you should"] },
      { kind: "body", paragraphs: ["You remember impressions", "Not outcomes"] },
      { kind: "body", paragraphs: ["You trust words", "Not results"] },
      { kind: "turn", paragraphs: ["Dreddi exists for this gap"] },
      { kind: "list", paragraphs: ["Not to manage tasks", "Not to replace contracts", "Not to control people"] },
      { kind: "body", paragraphs: ["But to make one thing visible"] },
      { kind: "body", paragraphs: ["What was promised — and what actually happened"] },
      { kind: "turn", paragraphs: ["A simple shift"] },
      {
        kind: "body",
        paragraphs: [
          "An agreement is not real",
          "until the other side confirms it",
          "And it is not completed",
          "until the other side acknowledges the result",
        ],
      },
      { kind: "body", paragraphs: ["No pressure"] },
      { kind: "list", paragraphs: ["No contracts", "No enforcement", "No system forcing anyone to act"] },
      { kind: "body", paragraphs: ["Just clarity"] },
      { kind: "body", paragraphs: ["Agreements are visible", "Outcomes are confirmed", "Patterns become obvious"] },
      { kind: "turn", paragraphs: ["Because reputation is not what people say"] },
      { kind: "body", paragraphs: ["It’s what they actually do"] },
      { kind: "body", paragraphs: ["And over time — everyone sees the difference"] },
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
