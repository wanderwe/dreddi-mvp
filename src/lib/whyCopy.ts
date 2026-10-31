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
    // Shown only where the arbitration with Dreddi is on (LAB_ENABLED), so the page promises nothing missing:
    // the whole section, or just the lines in labParagraphs.
    lab?: boolean;
    labParagraphs?: string[];
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

// "pledge" positioning (NEXT_PUBLIC_POSITIONING=pledge): why Dreddi exists, told around promises.
const pledgeWhyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description: "Promised? Dreddi knows. Record promises to yourself and agreements with others: what, by when, and who’s responsible. A kept word becomes your reputation.",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      { kind: "turn", paragraphs: ["Making promises is easy"] },
      { kind: "list", paragraphs: ["“We’ll ship it by October”", "“We’ll launch this year”", "“I’ll start on Monday”"] },
      { kind: "turn", paragraphs: ["And then nobody remembers the details"] },
      { kind: "body", paragraphs: ["Or whether the word was kept"] },
      { kind: "turn", paragraphs: ["Dreddi knows"] },
      { kind: "list", paragraphs: ["Who promised", "What, and by when", "How it ended"] },
      { kind: "turn", paragraphs: ["And if you disagree"], lab: true },
      { kind: "body", paragraphs: ["Dreddi settles it"], lab: true },
      { kind: "list", paragraphs: ["Helps agree on what counts as done", "Checks evidence, not words", "And makes the call"], lab: true },
      { kind: "turn", paragraphs: ["And promising yourself is the easiest"] },
      { kind: "body", paragraphs: ["Because no one asks if you did it"], labParagraphs: ["Dreddi will"] },
      { kind: "body", paragraphs: ["For yourself — discipline", "For others — trust", "Over time — reputation"] },
    ],
    cta: "Record your first promise",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description: "Пообіцяв? Dreddi знає. Записуй обіцянки собі й домовленості з людьми: що саме, до коли і хто відповідає. Дотримане слово стає твоєю репутацією.",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "turn", paragraphs: ["Обіцяти легко"] },
      { kind: "list", paragraphs: ["«Зробимо до жовтня»", "«Запустимо цього року»", "«З понеділка почну»"] },
      { kind: "turn", paragraphs: ["А потім ніхто не пам’ятає деталей"] },
      { kind: "body", paragraphs: ["Ані того, чи слово дотримали"] },
      { kind: "turn", paragraphs: ["Dreddi знає"] },
      { kind: "list", paragraphs: ["Хто пообіцяв", "Що саме і коли", "Чим усе закінчилось"] },
      { kind: "turn", paragraphs: ["А якщо думки розходяться"], lab: true },
      { kind: "body", paragraphs: ["Дредді розсудить"], lab: true },
      { kind: "list", paragraphs: ["Допоможе домовитися, що вважати виконанням", "Перевірить докази, а не слова", "І ухвалить рішення"], lab: true },
      { kind: "turn", paragraphs: ["А собі обіцяти найлегше"] },
      { kind: "body", paragraphs: ["Бо ніхто не спитає, чи виконав"], labParagraphs: ["Але не Дредді"] },
      // The one deliberate exception to "no long dashes": the summary reads as a formula.
      { kind: "body", paragraphs: ["Для себе — це дисципліна", "Для інших — довіра", "З часом — репутація"] },
    ],
    cta: "Зафіксувати першу обіцянку",
  },
};

const LAB_ENABLED = process.env.LAB_ENABLED === "true";

export const getWhyCopy = (locale: Locale): WhyCopy => {
  const all = POSITIONING === "pledge" ? pledgeWhyCopy : whyCopy;
  const copy = all[locale] ?? all[defaultLocale];
  const sections = copy.sections
    .filter((section) => LAB_ENABLED || !section.lab)
    .map((section) => ({
      ...section,
      paragraphs: LAB_ENABLED ? [...section.paragraphs, ...(section.labParagraphs ?? [])] : section.paragraphs,
    }));
  return { ...copy, sections };
};
