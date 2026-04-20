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
      { kind: "turn", paragraphs: ["Most agreements don’t fail loudly"] },
      { kind: "body", paragraphs: ["They fade"] },
      {
        kind: "list",
        paragraphs: ["“I’ll do it tomorrow”", "“I’ll send it later”", "“Let’s follow up next week”"],
      },
      {
        kind: "turn",
        paragraphs: ["That’s the problem"],
      },
      {
        kind: "body",
        paragraphs: ["It doesn’t matter who it is", "A colleague", "A friend", "A partner"],
      },
      {
        kind: "body",
        paragraphs: [
          "If something matters — you remember what happened",
          "But you don’t have a place to see it clearly",
        ],
      },
      { kind: "turn", paragraphs: ["And that creates a quiet problem"] },
      {
        kind: "body",
        paragraphs: ["You rely on people", "But you don’t really know if you should"],
      },
      { kind: "list", paragraphs: ["You remember impressions", "Not outcomes", "You trust words", "Not results"] },
      { kind: "turn", paragraphs: ["Dreddi exists for this gap"] },
      { kind: "list", paragraphs: ["Not to manage tasks", "Not to replace contracts", "Not to control people"] },
      { kind: "body", paragraphs: ["But to make one thing visible"] },
      { kind: "body", paragraphs: ["What was promised — and what actually happened"] },
      { kind: "turn", paragraphs: ["No pressure"] },
      { kind: "list", paragraphs: ["No contracts", "No enforcement", "No system forcing anyone to act"] },
      { kind: "body", paragraphs: ["Just clarity"] },
      { kind: "list", paragraphs: ["Agreements are visible", "Outcomes are confirmed", "Patterns become obvious"] },
      {
        kind: "turn",
        paragraphs: ["Because reputation is not what people say"],
      },
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
      { kind: "turn", paragraphs: ["Більшість домовленостей не руйнуються гучно"] },
      { kind: "body", paragraphs: ["Вони просто розмиваються"] },
      {
        kind: "list",
        paragraphs: ["«Зроблю завтра»", "«Скину пізніше»", "«Повернемося до цього наступного тижня»"],
      },
      {
        kind: "turn",
        paragraphs: ["Ось у чому проблема"],
      },
      {
        kind: "body",
        paragraphs: ["Неважливо, хто це", "Колега", "Друг", "Партнер"],
      },
      {
        kind: "body",
        paragraphs: [
          "Якщо щось справді важливе — ви пам’ятаєте, що сталося",
          "Але у вас немає місця, де це видно чітко",
        ],
      },
      { kind: "turn", paragraphs: ["І це створює тиху проблему"] },
      { kind: "body", paragraphs: ["Ви покладаєтесь на людей", "Але насправді не знаєте, чи варто"] },
      { kind: "list", paragraphs: ["Ви пам’ятаєте враження", "Не результати", "Ви вірите словам", "Не фактам"] },
      { kind: "turn", paragraphs: ["Dreddi існує саме для цього розриву"] },
      { kind: "list", paragraphs: ["Не щоб керувати задачами", "Не щоб замінити контракти", "Не щоб контролювати людей"] },
      { kind: "body", paragraphs: ["А щоб зробити видимим одне"] },
      { kind: "body", paragraphs: ["Що було обіцяно — і що сталося насправді"] },
      { kind: "turn", paragraphs: ["Без тиску"] },
      { kind: "list", paragraphs: ["Без контрактів", "Без примусу", "Без системи, що змушує когось діяти"] },
      { kind: "body", paragraphs: ["Лише ясність"] },
      { kind: "list", paragraphs: ["Домовленості видимі", "Результати підтверджені", "Патерни стають очевидними"] },
      {
        kind: "turn",
        paragraphs: ["Бо репутація — це не те, що кажуть люди"],
      },
      { kind: "body", paragraphs: ["Це те, що вони реально роблять"] },
      { kind: "body", paragraphs: ["І з часом — різницю бачать усі"] },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
