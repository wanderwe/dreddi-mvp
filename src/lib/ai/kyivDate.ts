// Kept apart from judge.ts so client components can format dates without pulling zod and the prompts.
export const formatKyivDate = (date: Date, locale = "uk-UA") =>
  new Intl.DateTimeFormat(locale, { timeZone: "Europe/Kyiv", day: "numeric", month: "long", year: "numeric" }).format(date);
