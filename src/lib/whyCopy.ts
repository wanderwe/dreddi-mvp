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

// "pledge" positioning (the default): why Dreddi exists, told around promises.
const pledgeWhyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description: "Promised? Dreddi knows. Keep your word to others and to yourself. Record promises, agreements and dispute stakes, and each one you keep becomes a reputation people trust.",
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
      { kind: "turn", paragraphs: ["Disagree?"] },
      { kind: "body", paragraphs: ["Judge Dreddi settles it"] },
      { kind: "list", paragraphs: ["Helps agree on what counts as done", "Checks evidence, not words", "And makes the call"] },
      { kind: "turn", paragraphs: ["Promising yourself is the easiest"] },
      { kind: "body", paragraphs: ["And the easiest to put off", "Here a promise has a deadline and a judge"] },
      { kind: "turn", paragraphs: ["An open profile shows how you keep your word"] },
      { kind: "body", paragraphs: ["For yourself — discipline", "For others — trust", "Over time — reputation"] },
      { kind: "body", paragraphs: ["Dreddi exists so a word means something again"] },
    ],
    cta: "Record your first promise",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description: "Пообіцяв? Dreddi знає. Тримай слово перед іншими й перед собою. Фіксуй обіцянки, домовленості й ставки в суперечках, а кожна виконана стане репутацією, якій довіряють.",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "turn", paragraphs: ["Обіцяти легко"] },
      { kind: "list", paragraphs: ["«Зробимо до жовтня»", "«Запустимо цього року»", "«З понеділка почну»"] },
      { kind: "turn", paragraphs: ["А потім ніхто не пам’ятає деталей"] },
      { kind: "body", paragraphs: ["Ані того, чи дотримали слово"] },
      { kind: "turn", paragraphs: ["Dreddi знає"] },
      { kind: "list", paragraphs: ["Хто пообіцяв", "Що саме і коли", "Чим усе закінчилось"] },
      { kind: "turn", paragraphs: ["Думки розійшлися?"] },
      { kind: "body", paragraphs: ["Суддя Дредді розсудить"] },
      { kind: "list", paragraphs: ["Допоможе домовитися, що вважати виконанням", "Перевірить докази, а не слова", "І ухвалить рішення"] },
      { kind: "turn", paragraphs: ["Собі обіцяти найлегше"] },
      { kind: "body", paragraphs: ["І найлегше відкласти", "Тут у обіцянки є строк і суддя"] },
      { kind: "turn", paragraphs: ["Відкритий профіль показує, як ви тримаєте слово"] },
      // The one deliberate exception to "no long dashes": the summary reads as a formula.
      { kind: "body", paragraphs: ["Для себе — це дисципліна", "Для інших — довіра", "З часом — репутація"] },
      { kind: "body", paragraphs: ["Dreddi існує, щоб слово знову щось важило"] },
    ],
    cta: "Зафіксувати першу обіцянку",
  },
};


export const getWhyCopy = (locale: Locale): WhyCopy => {
  const all = POSITIONING === "pledge" ? pledgeWhyCopy : whyCopy;
  return all[locale] ?? all[defaultLocale];
};
