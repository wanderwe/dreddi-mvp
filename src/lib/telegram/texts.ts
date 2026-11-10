import type { QuickLang } from "../ai/quickVerdict";

// What the bot says, in Ukrainian and English. Agreed in docs/telegram-bot-plan.md.

export const TG_TEXTS = {
  uk: {
    start: "Привіт, я Дредді. Додайте мене в групу, і коли там почнеться суперечка, напишіть /dreddi і в чому вона. Всі стануть на бік, а я скажу, хто правий.",
    addToGroup: "Додати в групу",
    greeting: "Дредді в чаті. Коли почнеться суперечка, напишіть /dreddi і в чому вона. Я бачу лише команди й відповіді на мої повідомлення.",
    empty: "Напишіть після /dreddi, в чому суперечка. Наприклад: /dreddi Вася каже, що штраф платить водій, а Петя, що власник",
    notFound: "Не бачу двох позицій. Напишіть, хто що каже, і я розберу",
    title: "Дредді, розсуди!",
    whenClose: "Коли закрити суперечку?",
    close: { hour: "За годину", day: "За добу", manual: "Вручну" },
    cancel: "Скасувати",
    decides: (name: string) => `Обирає ${name}`,
    cancelled: "Скасовано",
    pickSide: "Оберіть бік. Чому, можна написати відповіддю на це повідомлення.",
    counter: (count: number, time: string) => `Стали на бік: ${count} · закриття ${time}`,
    counterManual: (count: number, name: string) => `Стали на бік: ${count} · закриє ${name}`,
    counterClosed: (count: number) => `Стали на бік: ${count}`,
    sideButton: (position: string) => `За: ${position}`,
    closeButton: "Закрити",
    picked: (position: string) => `Ви за «${position}»`,
    switched: (position: string) => `Тепер ви за «${position}»`,
    onlyCreator: (name: string) => `Закрити може лише ${name}`,
    onlyCreatorCancel: (name: string) => `Скасувати може лише ${name}`,
    argumentNoSide: (name: string) => `${name}, спершу оберіть бік кнопкою`,
    thinking: "Суперечку закрито, Дредді думає",
    verdictTitle: "Вердикт Дредді",
    majorityRight: (percent: number, position: string) => `Більшість права: ${percent}% були за «${position}»`,
    majorityWrong: (percent: number, position: string) => `Більшість помиляється: ${percent}% були за «${position}»`,
    bestArgument: (text: string, name: string) => `Найсильніший аргумент: «${text}», ${name}`,
    more: "Детальніше",
    tooFew: "Замало учасників для вердикту: треба хоча б 3",
    limit: "На сьогодні Дредді вже розсудив забагато суперечок. Спробуйте завтра.",
    failed: "Дредді не зміг винести вердикт. Спробую ще раз за кілька хвилин",
    expired: "Ця суперечка вже закрита",
    at: (time: string) => `о ${time}`,
  },
  en: {
    start: "Hi, I'm Dreddi. Add me to a group, and when an argument starts there, type /dreddi and what it's about. Everyone takes a side, and I say who is right.",
    addToGroup: "Add to a group",
    greeting: "Dreddi is here. When an argument starts, type /dreddi and what it's about. I only see commands and replies to my messages.",
    empty: "Type what the argument is after /dreddi. For example: /dreddi Sam says the driver pays the fine, Alex says the owner does",
    notFound: "I can't see two positions. Say who claims what, and I'll sort it out",
    title: "Dreddi, settle it!",
    whenClose: "When should it close?",
    close: { hour: "In an hour", day: "In a day", manual: "Manually" },
    cancel: "Cancel",
    decides: (name: string) => `${name} decides`,
    cancelled: "Cancelled",
    pickSide: "Pick a side. Reply to this message to say why.",
    counter: (count: number, time: string) => `Sides taken: ${count} · closes ${time}`,
    counterManual: (count: number, name: string) => `Sides taken: ${count} · ${name} closes it`,
    counterClosed: (count: number) => `Sides taken: ${count}`,
    sideButton: (position: string) => `For: ${position}`,
    closeButton: "Close",
    picked: (position: string) => `You're for «${position}»`,
    switched: (position: string) => `Now you're for «${position}»`,
    onlyCreator: (name: string) => `Only ${name} can close it`,
    onlyCreatorCancel: (name: string) => `Only ${name} can cancel it`,
    argumentNoSide: (name: string) => `${name}, pick a side with the buttons first`,
    thinking: "Closed, Dreddi is thinking",
    verdictTitle: "Dreddi's verdict",
    majorityRight: (percent: number, position: string) => `The majority is right: ${percent}% were for «${position}»`,
    majorityWrong: (percent: number, position: string) => `The majority is wrong: ${percent}% were for «${position}»`,
    bestArgument: (text: string, name: string) => `The strongest argument: «${text}», ${name}`,
    more: "More",
    tooFew: "Too few people for a verdict: at least 3 needed",
    limit: "Dreddi has settled too many arguments today. Try again tomorrow.",
    failed: "Dreddi couldn't reach a verdict. I'll try again in a few minutes",
    expired: "This dispute is already closed",
    at: (time: string) => `at ${time}`,
  },
} as const;

export type TgTexts = (typeof TG_TEXTS)[QuickLang];

// Ukrainian (and Russian, for Ukrainians on a Russian interface) get Ukrainian; everyone else English.
export const langOf = (code: string | undefined): QuickLang => (code && /^(uk|ru)/i.test(code) ? "uk" : "en");

// The language people actually write in wins over the app's: many here run Telegram in English but
// argue in Ukrainian. Cyrillic means Ukrainian; otherwise the app's language decides.
export const langFor = (text: string | null | undefined, code: string | undefined): QuickLang =>
  text && /[а-яіїєґ]/i.test(text) ? "uk" : langOf(code);

export const textsFor = (lang: QuickLang): TgTexts => TG_TEXTS[lang];

// When it closes, in Kyiv time: today «о 15:40», another day «11 лист. о 15:40».
export function closeTime(iso: string, lang: QuickLang, now: Date = new Date()) {
  const date = new Date(iso);
  const locale = lang === "uk" ? "uk-UA" : "en-GB";
  const zone = "Europe/Kyiv";
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: zone }).format(date);
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(d);
  const at = textsFor(lang).at(lang === "en" ? `${time} Kyiv time` : time);
  if (day(date) === day(now)) return at;
  const dateText = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: zone }).format(date);
  return `${dateText} ${at}`;
}
