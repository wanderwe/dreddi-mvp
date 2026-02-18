import { Locale } from "@/lib/i18n/locales";

type UkForms = {
  one: string;
  few: string;
  many: string;
};

export const pluralizeUk = (count: number, forms: UkForms) => {
  const absCount = Math.abs(count);
  const mod100 = absCount % 100;
  const mod10 = absCount % 10;

  if (mod10 === 1 && mod100 !== 11) {
    return forms.one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms.few;
  }

  return forms.many;
};

export const pluralizeEn = (count: number, singular: string, plural: string) =>
  Math.abs(count) === 1 ? singular : plural;

export const formatStreakLine = (count: number, locale: Locale) => {
  const formattedCount = new Intl.NumberFormat(locale).format(count);

  if (locale === "uk") {
    const dealWord = pluralizeUk(count, {
      one: "угода",
      few: "угоди",
      many: "угод",
    });
    const confirmationWord = pluralizeUk(count, {
      one: "підтверджена",
      few: "підтверджені",
      many: "підтверджені",
    });

    return `${formattedCount} ${dealWord} поспіль ${confirmationWord} без спорів`;
  }

  return `${formattedCount} ${pluralizeEn(count, "deal", "deals")} in a row confirmed without disputes`;
};
