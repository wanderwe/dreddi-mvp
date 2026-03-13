import { type Locale, defaultLocale } from "@/lib/i18n/locales";

export type WhyCopy = {
  seo: {
    title: string;
    description: string;
  };
  title: string;
  subtitle: string;
  sections: {
    heading?: string;
    paragraphs: string[];
  }[];
  cta: string;
};

export const whyCopy: Record<Locale, WhyCopy> = {
  en: {
    seo: {
      title: "Why Dreddi Exists — Dreddi",
      description:
        "Learn why Dreddi was built and how it turns promises into reputation through real outcomes.",
    },
    title: "Why Dreddi Exists",
    subtitle: "Dreddi knows who delivers.",
    sections: [
      {
        heading: "The promise problem",
        paragraphs: [
          "Every day people make promises.",
          "Deadlines. Deliverables. Agreements.",
          "Most of them live in chats, calls, and memory.",
          "When they are kept — everyone forgets.",
          "When they are broken — everyone argues.",
          "But almost never is there a clear record of what actually happened.",
        ],
      },
      {
        heading: "Trust without evidence",
        paragraphs: [
          "Over time, people stop trusting words.",
          "You hear things like: Can I rely on them? Do they actually deliver? Have they done this before?",
          "Too often, the answers come from opinions and selective memories instead of a clear record of outcomes.",
        ],
      },
      {
        heading: "A simple idea",
        paragraphs: [
          "Dreddi is built on a very simple principle:",
          "Promises should have a record.",
          "Not to judge people.",
          "Not to shame anyone.",
          "But simply to remember what was agreed — and what happened next.",
        ],
      },
      {
        heading: "What Dreddi is not",
        paragraphs: [
          "Dreddi is not a rating system.",
          "It does not collect opinions.",
          "It does not publish reviews.",
          "It does not allow anonymous criticism.",
          "Dreddi does not decide who is good or bad.",
          "It only records commitments and outcomes.",
          "Because reputation should not depend on what people say about you.",
          "It should depend on what actually happened.",
        ],
      },
      {
        heading: "Reputation through actions",
        paragraphs: [
          "In Dreddi, reputation is not built on reviews.",
          "It emerges from outcomes.",
          "Did the promise happen?",
          "Was the deadline met?",
          "Was the commitment completed?",
          "Over time, a pattern appears.",
          "Not through opinions.",
          "Through actions.",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "Trust is one of the most valuable things people have.",
          "But in many situations it depends on vague memories and assumptions.",
          "Dreddi aims to make trust easier by introducing transparent commitments.",
          "A place where promises are visible.",
          "Deadlines are clear.",
          "And results are recorded.",
        ],
      },
      {
        heading: "Our vision",
        paragraphs: [
          "We believe reputation should be earned through actions.",
          "Not through marketing.",
          "Not through stories.",
          "Through what actually happened.",
          "Dreddi is a small step toward a world where promises are clearer and trust is easier.",
        ],
      },
      {
        heading: "Where Dreddi can be used",
        paragraphs: [
          "Dreddi works anywhere people make commitments.",
          "Freelancers and clients — confirming deadlines and deliverables.",
          "Partners and collaborators — recording responsibilities in joint work.",
          "Teams and small businesses — tracking who committed to what.",
          "Individuals — keeping personal promises visible and accountable.",
          "Anywhere a promise matters, a record can help.",
        ],
      },
      {
        heading: "Why now",
        paragraphs: [
          "More and more of our agreements happen online.",
          "In chats.",
          "In calls.",
          "Across platforms.",
          "But these commitments rarely leave a reliable trace.",
          "As digital work and remote collaboration grow, the gap between promises and accountability grows as well.",
          "Dreddi is an attempt to close that gap.",
        ],
      },
    ],
    cta: "Create your first deal",
  },
  uk: {
    seo: {
      title: "Чому існує Dreddi — Dreddi",
      description:
        "Дізнайтесь, чому створили Dreddi і як сервіс перетворює обіцянки на репутацію через реальні результати.",
    },
    title: "Чому існує Dreddi",
    subtitle: "Dreddi знає, хто виконує.",
    sections: [
      {
        heading: "Проблема обіцянок",
        paragraphs: [
          "Щодня люди дають обіцянки.",
          "Дедлайни. Результати. Домовленості.",
          "Більшість із них живе в чатах, дзвінках і памʼяті.",
          "Коли їх виконують — усі забувають.",
          "Коли їх порушують — усі сперечаються.",
          "Але майже ніколи немає чіткого запису того, що сталося насправді.",
        ],
      },
      {
        heading: "Довіра без доказів",
        paragraphs: [
          "З часом люди перестають довіряти словам.",
          "Часто можна почути: «Чи можна на них покластися?», «Вони реально виконують?», «Вони вже робили таке раніше?»",
          "Надто часто відповіді базуються на думках і вибірковій памʼяті, а не на чіткому записі результатів.",
        ],
      },
      {
        heading: "Проста ідея",
        paragraphs: [
          "Dreddi побудований на дуже простому принципі:",
          "Обіцянки мають бути зафіксовані.",
          "Не для того, щоб судити людей.",
          "Не для того, щоб когось соромити.",
          "А просто, щоб памʼятати, про що домовились — і що сталося далі.",
        ],
      },
      {
        heading: "Чим Dreddi не є",
        paragraphs: [
          "Dreddi — це не рейтингова система.",
          "Він не збирає думки.",
          "Він не публікує відгуки.",
          "Він не дозволяє анонімну критику.",
          "Dreddi не вирішує, хто хороший, а хто поганий.",
          "Він лише фіксує зобовʼязання та результати.",
          "Бо репутація не має залежати від того, що про вас говорять.",
          "Вона має залежати від того, що реально сталося.",
        ],
      },
      {
        heading: "Репутація через дії",
        paragraphs: [
          "У Dreddi репутація будується не на відгуках.",
          "Вона виникає з результатів.",
          "Обіцянка була виконана?",
          "Дедлайн дотримано?",
          "Зобовʼязання завершено?",
          "З часом зʼявляється закономірність.",
          "Не через думки.",
          "Через дії.",
        ],
      },
      {
        heading: "Чому це важливо",
        paragraphs: [
          "Довіра — одна з найцінніших речей, які мають люди.",
          "Але в багатьох ситуаціях вона залежить від нечітких спогадів і припущень.",
          "Dreddi прагне спростити довіру через прозорі зобовʼязання.",
          "Місце, де обіцянки видимі.",
          "Дедлайни чіткі.",
          "А результати зафіксовані.",
        ],
      },
      {
        heading: "Наше бачення",
        paragraphs: [
          "Ми віримо, що репутація має зароблятися діями.",
          "Не маркетингом.",
          "Не історіями.",
          "А тим, що реально сталося.",
          "Dreddi — це невеликий крок до світу, де обіцянки чіткіші, а довіра — простіша.",
        ],
      },
      {
        heading: "Де можна використовувати Dreddi",
        paragraphs: [
          "Dreddi працює всюди, де люди беруть зобовʼязання.",
          "Фрілансери та клієнти — підтвердження дедлайнів і результатів.",
          "Партнери та колаборатори — фіксація відповідальностей у спільній роботі.",
          "Команди та малі бізнеси — відстеження, хто і на що погодився.",
          "Окремі люди — видимість і підзвітність особистих обіцянок.",
          "Усюди, де важлива обіцянка, запис може допомогти.",
        ],
      },
      {
        heading: "Чому саме зараз",
        paragraphs: [
          "Все більше наших домовленостей відбувається онлайн.",
          "У чатах.",
          "У дзвінках.",
          "Між різними платформами.",
          "Але ці домовленості рідко лишають надійний слід.",
          "Оскільки цифрова робота і віддалена співпраця зростають, розрив між обіцянками і відповідальністю теж зростає.",
          "Dreddi — це спроба закрити цей розрив.",
        ],
      },
    ],
    cta: "Створити першу угоду",
  },
};

export const getWhyCopy = (locale: Locale): WhyCopy => whyCopy[locale] ?? whyCopy[defaultLocale];
