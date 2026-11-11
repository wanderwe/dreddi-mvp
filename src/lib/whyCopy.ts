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

// The «Чому Dreddi» page. The earlier «Угоди» version's texts are in docs/obsolete-copy.md.
export const whyCopy: Record<Locale, WhyCopy> = {
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description: "Пообіцяв? Dreddi знає. Тримай слово перед іншими й перед собою. Фіксуй обіцянки і ставки в суперечках. Кожна виконана додає до репутації, якій довіряють."
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      {
        kind: "turn",
        paragraphs: [
          "Обіцяти легко"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "«Зробимо до жовтня»",
          "«Запустимо цього року»",
          "«З понеділка почну»"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "А потім ніхто не пам’ятає деталей"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Ані того, чи дотримали слово"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Dreddi знає"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "Хто пообіцяв",
          "Що саме і коли",
          "Чим усе закінчилось"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Думки розійшлися?"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Дредді розсудить"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "Допоможе домовитися, що вважати виконанням",
          "Перевірить докази, а не слова",
          "І ухвалить рішення"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Собі обіцяти найлегше"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "І найлегше відкласти",
          "Тут у обіцянки є строк і суддя"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Відкритий профіль показує, як ви тримаєте слово"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Для себе — це дисципліна",
          "Для інших — довіра",
          "З часом — репутація"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Dreddi існує, щоб слово знову щось важило"
        ]
      }
    ],
    cta: "Зафіксувати першу обіцянку"
  },
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description: "Promised? Dreddi knows. Keep your word to others and to yourself. Record your promises and dispute stakes. Every one you keep adds to a reputation people trust."
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      {
        kind: "turn",
        paragraphs: [
          "Making promises is easy"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "“We’ll ship it by October”",
          "“We’ll launch this year”",
          "“I’ll start on Monday”"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "And then nobody remembers the details"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Or whether the word was kept"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Dreddi knows"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "Who promised",
          "What, and by when",
          "How it ended"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Disagree?"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Dreddi settles it"
        ]
      },
      {
        kind: "list",
        paragraphs: [
          "Helps agree on what counts as done",
          "Checks evidence, not words",
          "And makes the call"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "Promising yourself is the easiest"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "And the easiest to put off",
          "Here a promise has a deadline and a judge"
        ]
      },
      {
        kind: "turn",
        paragraphs: [
          "An open profile shows how you keep your word"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "For yourself — discipline",
          "For others — trust",
          "Over time — reputation"
        ]
      },
      {
        kind: "body",
        paragraphs: [
          "Dreddi exists so a word means something again"
        ]
      }
    ],
    cta: "Record your first promise"
  }
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
