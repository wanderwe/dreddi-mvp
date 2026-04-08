import { type Locale, defaultLocale } from "@/lib/i18n/locales";

export type WhySectionKind = "setup" | "list" | "trigger" | "quote" | "realization" | "positioning" | "outcome" | "closing";

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
        "Dreddi exists so agreements don’t disappear into memory, chats, and assumptions — with clear accountability, not marketplace hiring",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      { kind: "setup", paragraphs: ["You agreed on something"] },
      { kind: "list", paragraphs: ["A deadline", "A result", "A responsibility"] },
      { kind: "setup", paragraphs: ["A few days pass", "Silence"] },
      { kind: "trigger", paragraphs: ["You expected it yesterday", "They thought it was not urgent"] },
      { kind: "quote", paragraphs: ["You: “I thought we agreed on this.”", "Them: “That’s not how I understood it.”"] },
      {
        kind: "list",
        paragraphs: ["No reminder", "No confirmation", "No follow-up", "No final state"],
      },
      { kind: "realization", paragraphs: ["Was it done or not?", "No one recorded the outcome"] },
      { kind: "trigger", paragraphs: ["Now you have to remind them", "And it already feels awkward"] },
      { kind: "setup", paragraphs: ["No fact", "Only chats, calls, memory, assumptions"] },
      { kind: "realization", paragraphs: ["That’s the real failure", "Not people", "Not intentions"] },
      { kind: "positioning", paragraphs: ["The agreement itself disappears"] },
      { kind: "positioning", paragraphs: ["Dreddi exists to prevent that"] },
      {
        kind: "positioning",
        paragraphs: [
          "It is not a labor marketplace",
          "Not a freelance hiring platform",
          "Not a job board",
          "Not a place to find strangers for gigs",
        ],
      },
      {
        kind: "outcome",
        paragraphs: ["Dreddi simply records", "what was agreed", "and what actually happened"],
      },
      { kind: "realization", paragraphs: ["Then accountability becomes real"] },
      {
        kind: "outcome",
        paragraphs: ["A clear start", "A visible expectation", "A defined outcome"],
      },
      { kind: "trigger", paragraphs: ["Over time: a pattern of behavior", "Who delivers", "Who doesn’t"] },
      { kind: "closing", paragraphs: ["No contracts", "No pressure", "Just clarity — and consequences"] },
    ],
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description:
        "Dreddi існує, щоб домовленості не зникали в памʼяті, чатах і припущеннях: чітка відповідальність без моделі маркетплейсу",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "setup", paragraphs: ["Ви про щось домовилися"] },
      { kind: "list", paragraphs: ["Дедлайн", "Результат", "Відповідальність"] },
      { kind: "setup", paragraphs: ["Минає кілька днів", "Тиша"] },
      { kind: "trigger", paragraphs: ["Ви чекали ще вчора", "Вони думали, що це не терміново"] },
      { kind: "quote", paragraphs: ["Ви: «Я думав, ми це погодили.»", "Вони: «Я зрозумів це інакше.»"] },
      {
        kind: "list",
        paragraphs: ["Немає нагадування", "Немає підтвердження", "Немає подальшого контакту", "Немає фінального стану"],
      },
      { kind: "realization", paragraphs: ["То зроблено чи ні?", "Ніхто не зафіксував результат"] },
      { kind: "trigger", paragraphs: ["Тепер треба наздоганяти самому", "І це вже незручно"] },
      { kind: "setup", paragraphs: ["Немає факту", "Лише чати, дзвінки, памʼять і припущення"] },
      { kind: "realization", paragraphs: ["Ось де справжній збій", "Не в людях", "Не в намірах"] },
      { kind: "positioning", paragraphs: ["Зникає сама домовленість"] },
      { kind: "positioning", paragraphs: ["Для цього і існує Dreddi"] },
      {
        kind: "positioning",
        paragraphs: [
          "Це не маркетплейс послуг",
          "Не фриланс-платформа для найму",
          "Не дошка вакансій",
          "Не місце, де шукають виконавців на разові задачі",
        ],
      },
      {
        kind: "outcome",
        paragraphs: ["Dreddi просто фіксує", "про що домовилися", "і що реально сталося"],
      },
      { kind: "realization", paragraphs: ["І тоді відповідальність стає реальною"] },
      {
        kind: "outcome",
        paragraphs: ["Чіткий старт", "Видиме очікування", "Визначений результат"],
      },
      { kind: "trigger", paragraphs: ["З часом видно патерн поведінки", "Хто виконує", "А хто ні"] },
      { kind: "closing", paragraphs: ["Без контрактів", "Без тиску", "Лише ясність — і наслідки"] },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
