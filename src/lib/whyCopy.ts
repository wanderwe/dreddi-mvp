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
  cta: {
    primary: string;
    secondary: string;
  };
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
      {
        kind: "body",
        paragraphs: ["Not every agreement has to be public", "But some deserve visibility"],
      },
      {
        kind: "list",
        paragraphs: [
          "Public initiatives",
          "Partnerships",
          "Deadlines",
          "Commitments made in front of an audience",
          "Projects other people want to follow",
        ],
      },
      {
        kind: "body",
        paragraphs: [
          "In Dreddi, people can observe a public agreement without becoming participants",
          "Not to interfere",
          "Not to rate",
          "Not to pressure",
        ],
      },
      {
        kind: "body",
        paragraphs: [
          "Just to see:",
          "what was agreed",
          "what the deadline was",
          "and what outcome happened in the end",
        ],
      },
      { kind: "turn", paragraphs: ["No likes", "No popularity", "No noise"] },
      { kind: "body", paragraphs: ["Just execution history"] },
      {
        kind: "turn",
        paragraphs: ["When agreements become visible", "reputation stops being an impression"],
      },
      { kind: "body", paragraphs: ["It becomes a history of outcomes"] },
      { kind: "list", paragraphs: ["No contracts", "No pressure", "Just clarity — and consequences"] },
    ],
    cta: {
      primary: "Create your first agreement",
      secondary: "View public agreements",
    },
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
      {
        kind: "body",
        paragraphs: ["Не всі домовленості мають бути публічними", "Але деякі заслуговують на видимість"],
      },
      {
        kind: "list",
        paragraphs: [
          "Публічні ініціативи",
          "Партнерства",
          "Дедлайни",
          "Зобов’язання перед аудиторією",
          "Проєкти, за якими інші хочуть стежити",
        ],
      },
      {
        kind: "body",
        paragraphs: [
          "У Dreddi люди можуть спостерігати за публічною угодою, не стаючи її учасниками",
          "Не втручатися",
          "Не оцінювати",
          "Не тиснути",
        ],
      },
      {
        kind: "body",
        paragraphs: [
          "Просто бачити:",
          "про що домовилися",
          "який був дедлайн",
          "і який результат настав у фіналі",
        ],
      },
      { kind: "turn", paragraphs: ["Без лайків", "Без популярності", "Без шуму"] },
      { kind: "body", paragraphs: ["Лише історія виконання"] },
      {
        kind: "turn",
        paragraphs: ["Бо коли домовленості стають видимими", "репутація перестає бути враженням"],
      },
      { kind: "body", paragraphs: ["Вона стає історією результатів"] },
      { kind: "list", paragraphs: ["Без контрактів", "Без тиску", "Лише ясність — і наслідки"] },
    ],
    cta: {
      primary: "Створити першу угоду",
      secondary: "Переглянути публічні угоди",
    },
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
