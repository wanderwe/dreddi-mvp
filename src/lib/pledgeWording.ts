import { POSITIONING } from "./features";

// "pledge" positioning: the same "agreement" → "promise" swap as src/messages/pledge, for copy kept in code.
// Both Ukrainian words are feminine, so only the noun itself changes. Apply it to templates only,
// never to text users typed (deal titles).

const LETTER = "[а-яіїєґʼ'’]";

const UK_FORMS: Record<string, string> = {
  угода: "обіцянка",
  угоди: "обіцянки",
  угоді: "обіцянці",
  угоду: "обіцянку",
  угодою: "обіцянкою",
  угод: "обіцянок",
  угодам: "обіцянкам",
  угодами: "обіцянками",
  угодах: "обіцянках",
  // "Домовленість" is nominative and accusative alike; in this copy it is almost always accusative.
  домовленість: "обіцянку",
  домовленості: "обіцянки",
  домовленостей: "обіцянок",
};

const UK_NOMINATIVE_PHRASES: [RegExp, string][] = [
  [/Домовленість прострочена/g, "Обіцянка прострочена"],
  [/Домовленість, на яку/g, "Обіцянка, на яку"],
];

const EN_FORMS: Record<string, string> = {
  agreement: "promise",
  agreements: "promises",
  deal: "promise",
  deals: "promises",
};

const matchCase = (replacement: string, source: string) =>
  source[0] === source[0].toUpperCase()
    ? replacement[0].toUpperCase() + replacement.slice(1)
    : replacement;

const ukWord = new RegExp(`(?<!${LETTER})(угод(?:ою|ами|ах|ам|а|и|і|у)?|домовленост(?:ей|і)|домовленість)(?!${LETTER})`, "gi");

export const toPledgeWording = (text: string) =>
  UK_NOMINATIVE_PHRASES.reduce((acc, [pattern, value]) => acc.replace(pattern, value), text)
    .replace(ukWord, (word) => matchCase(UK_FORMS[word.toLowerCase()] ?? word, word))
    .replace(/\b(an|An) (agreement)\b/g, (_, article: string, word: string) => `${article === "An" ? "A" : "a"} ${word}`)
    .replace(/\b(agreements?|deals?)\b/gi, (word) => matchCase(EN_FORMS[word.toLowerCase()] ?? word, word));

export const pledgeWording = (text: string) => (POSITIONING === "pledge" ? toPledgeWording(text) : text);
