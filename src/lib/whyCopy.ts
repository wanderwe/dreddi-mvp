import { type Locale, defaultLocale } from "@/lib/i18n/locales";

export type WhySectionKind =
  | "setup"
  | "list"
  | "trigger"
  | "quote"
  | "realization"
  | "positioning"
  | "outcome"
  | "closing";

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
        "Why Dreddi exists: to keep agreements clear, visible, and accountable without becoming a marketplace",
    },
    title: "Why Dreddi exists",
    subtitle: "",
    sections: [
      { kind: "setup", paragraphs: ["You agreed on something"] },
      { kind: "list", paragraphs: ["A deadline", "A result", "A responsibility"] },
      { kind: "setup", paragraphs: ["A few days pass", "Nothing happens"] },
      { kind: "quote", paragraphs: ["You think:", "“I thought we agreed”"] },
      { kind: "quote", paragraphs: ["They think:", "“That wasn’t urgent”"] },
      { kind: "realization", paragraphs: ["No one is wrong", "There was just no clear record"] },
      {
        kind: "trigger",
        paragraphs: ["No reminder", "No confirmation", "No final state", "No shared reality"],
      },
      { kind: "setup", paragraphs: ["Just memory", "And memory is unreliable"] },
      { kind: "realization", paragraphs: ["That’s the problem", "Not people", "Not intentions"] },
      { kind: "trigger", paragraphs: ["The agreement itself disappears"] },
      { kind: "positioning", paragraphs: ["Dreddi exists to prevent that"] },
      {
        kind: "positioning",
        paragraphs: ["It doesn’t find people", "It doesn’t assign work", "It doesn’t act as a marketplace"],
      },
      {
        kind: "setup",
        paragraphs: ["It simply records:", "what was agreed", "and what actually happened"],
      },
      { kind: "realization", paragraphs: ["And that changes everything"] },
      {
        kind: "outcome",
        paragraphs: ["Because now there is:", "a clear start", "a visible expectation", "a defined outcome"],
      },
      {
        kind: "outcome",
        paragraphs: ["And over time, something else appears", "Not opinions", "Not ratings", "A pattern of behavior"],
      },
      { kind: "trigger", paragraphs: ["Who delivers", "And who doesn’t"] },
      { kind: "closing", paragraphs: ["No contracts", "No pressure", "Just clarity — and consequences"] },
    ],
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description:
        "Чому існує Dreddi: щоб домовленості не зникали в чатах, памʼяті та припущеннях, без перетворення на маркетплейс",
    },
    title: "Чому існує Dreddi",
    subtitle: "",
    sections: [
      { kind: "setup", paragraphs: ["Ви про щось домовилися"] },
      { kind: "list", paragraphs: ["Дедлайн", "Результат", "Відповідальність"] },
      { kind: "setup", paragraphs: ["Минає кілька днів", "Нічого не відбувається"] },
      { kind: "quote", paragraphs: ["Ви думаєте:", "«Ми ж домовилися»"] },
      { kind: "quote", paragraphs: ["Вони думають:", "«Я не думав, що це терміново»"] },
      { kind: "realization", paragraphs: ["Ніхто не винен", "Просто не було чіткої фіксації"] },
      {
        kind: "trigger",
        paragraphs: ["Немає нагадування", "Немає підтвердження", "Немає фінального стану", "Немає спільної реальності"],
      },
      { kind: "setup", paragraphs: ["Лише памʼять", "А памʼять ненадійна"] },
      { kind: "realization", paragraphs: ["Ось у чому проблема", "Не в людях", "Не в намірах"] },
      { kind: "trigger", paragraphs: ["Сама домовленість просто зникає"] },
      { kind: "positioning", paragraphs: ["Dreddi існує, щоб цього не сталося"] },
      {
        kind: "positioning",
        paragraphs: ["Він не шукає людей", "Він не роздає задачі", "Він не є маркетплейсом"],
      },
      {
        kind: "setup",
        paragraphs: ["Він просто фіксує:", "про що домовилися", "і що насправді сталося"],
      },
      { kind: "realization", paragraphs: ["І це змінює все"] },
      {
        kind: "outcome",
        paragraphs: ["Бо тепер є:", "чіткий старт", "видиме очікування", "визначений результат"],
      },
      {
        kind: "outcome",
        paragraphs: ["А з часом проявляється інше", "Не думки", "Не рейтинги", "А модель поведінки"],
      },
      { kind: "trigger", paragraphs: ["Хто виконує", "А хто ні"] },
      { kind: "closing", paragraphs: ["Без контрактів", "Без тиску", "Лише ясність — і наслідки"] },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
