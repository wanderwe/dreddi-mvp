import { POSITIONING } from "@/lib/features";
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

// "pledge" positioning (NEXT_PUBLIC_POSITIONING=pledge): why Dreddi exists, told around public promises.
const pledgeWhyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description: "Promises you can see: companies’ and people’s public promises with a deadline and an open outcome",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      { kind: "body", paragraphs: ["Making promises is easy"] },
      { kind: "list", paragraphs: ["“We’ll ship it by October”", "“We’ll launch this year”", "“I’ll start on Monday”"] },
      { kind: "turn", paragraphs: ["And then nobody remembers what exactly was promised"] },
      { kind: "body", paragraphs: ["Or by when"] },
      { kind: "turn", paragraphs: ["Dreddi remembers"] },
      { kind: "list", paragraphs: ["A promise with a deadline", "A day counter", "An open outcome"] },
      { kind: "body", paragraphs: ["For companies, it’s trust", "For people, it’s discipline", "For everyone, it’s visible"] },
      { kind: "list", paragraphs: ["No pressure", "Just clarity — and consequences"] },
    ],
    cta: "Record your first promise",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description: "Обіцянки, які видно: публічні обіцянки компаній і людей з дедлайном і відкритим результатом",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "body", paragraphs: ["Обіцяти легко"] },
      { kind: "list", paragraphs: ["«Зробимо до жовтня»", "«Запустимо цього року»", "«З понеділка почну»"] },
      { kind: "turn", paragraphs: ["А потім ніхто не пам’ятає, що саме обіцяли"] },
      { kind: "body", paragraphs: ["І до коли"] },
      { kind: "turn", paragraphs: ["Dreddi пам’ятає"] },
      { kind: "list", paragraphs: ["Обіцянка з дедлайном", "Лічильник днів", "Відкритий результат"] },
      { kind: "body", paragraphs: ["Для компаній — це довіра", "Для людей — це дисципліна", "Для всіх — це видно"] },
      { kind: "list", paragraphs: ["Без тиску", "Просто ясність — і наслідки"] },
    ],
    cta: "Зафіксувати першу обіцянку",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => {
  const copy = POSITIONING === "pledge" ? pledgeWhyCopy : whyCopy;
  return copy[locale] ?? copy[defaultLocale];
};
