import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    whyLink: string;
  };
  useDreddi: {
    label: string;
    title: string;
    bullets: string[];
    scenariosTitle: string;
    scenarios: string[];
    noteTitle: string;
    framing: string;
  };
  reputation: {
    label: string;
    title: string;
    steps: string[];
    outcomeTitle: string;
    outcomeDescription: string;
    cta: string;
  };
  cta: {
    getStarted: string;
    publicProfiles: string;
    createPromise: string;
    reviewDeals: string;
  };
  loading: {
    session: string;
    short: string;
    placeholder: string;
  };
  errors: {
    userSession: string;
    notAuthenticated: string;
    reputation: string;
  };
  score: {
    label: string;
    shortLabel: string;
    overviewLabel: string;
    live: string;
    signIn: string;
    demoBadge: string;
    cards: {
      confirmed: string;
      disputed: string;
    };
    onTime: {
      label: string;
      helper: string;
      empty: string;
    };
  };
  recentDeals: {
    title: string;
    demoTitle: string;
    seeAll: string;
    empty: string;
    sentiment: {
      positive: string;
      negative: string;
    };
    eventFallbackTitle: string;
    placeholderMetaDue: (date: string) => string;
    placeholderMetaCreated: (date: string) => string;
    status: {
      active: string;
      completedByPromisor: string;
      confirmed: string;
      disputed: string;
      declined: string;
    };
  };
};

// The homepage, told around promises. The earlier «Угоди» version's texts are in docs/obsolete-copy.md.
export const landingCopy: Record<Locale, LandingCopy> = {
  uk: {
    hero: {
      eyebrow: "Легкий трекер домовленостей",
      headline: "Пообіцяв? Dreddi знає",
      description: "Тримай слово перед іншими й перед собою.\nФіксуй обіцянки і ставки в суперечках. Кожна виконана додає до репутації, якій довіряють.",
      whyLink: "Чому Dreddi →"
    },
    useDreddi: {
      label: "Сценарії використання",
      title: "Коли варто використовувати Dreddi",
      bullets: [
        "Ви погодили дедлайни, але нічого не підписано",
        "На кону гроші, час або репутація",
        "Ви чуєте «давайте поки просто домовимось»",
        "Ви ще не хочете юристів — але й хаосу теж"
      ],
      scenariosTitle: "Типові сценарії",
      scenarios: [
        "Фріланс і послуги до контрактів",
        "Партнерства на ранніх етапах",
        "Переговори з нерухомості",
        "Підрядники та довгі проєкти",
        "Пілотні проєкти / тестова співпраця"
      ],
      noteTitle: "Не для всього",
      framing: "Для домовленостей, де ще рано для контрактів, але вже ризиковано покладатися лише на слова"
    },
    reputation: {
      label: "Результат",
      title: "Репутація будується виконанням",
      steps: [
        "Домовленість фіксується в Dreddi",
        "Виконання підтверджують обидві сторони",
        "Підтвердження формують репутаційний бал"
      ],
      outcomeTitle: "Публічний профіль",
      outcomeDescription: "Відображає дотримані та оскаржені угоди",
      cta: "Переглянути приклад профілю"
    },
    cta: {
      getStarted: "Зафіксувати обіцянку",
      publicProfiles: "Переглянути профілі",
      createPromise: "Зафіксувати обіцянку",
      reviewDeals: "Мої обіцянки"
    },
    loading: {
      session: "Завантажуємо вашу сесію…",
      short: "Завантаження…",
      placeholder: "…"
    },
    errors: {
      userSession: "Не вдалося завантажити сесію користувача",
      notAuthenticated: "Не автентифіковано",
      reputation: "Не вдалося завантажити репутацію"
    },
    score: {
      label: "Репутаційний бал",
      shortLabel: "Репутація",
      overviewLabel: "Огляд обіцянок",
      live: "Наживо",
      signIn: "Увійдіть, щоб бачити оновлення",
      demoBadge: "Приклад профілю",
      cards: {
        confirmed: "Дотримано",
        disputed: "Оскаржено"
      },
      onTime: {
        label: "Вчасні виконання",
        helper: "Тут враховуються лише дотримані угоди зі строком",
        empty: "Ще немає даних"
      }
    },
    recentDeals: {
      title: "Останні обіцянки",
      demoTitle: "Останні обіцянки",
      seeAll: "Переглянути всі",
      empty: "У вас поки що немає жодної обіцянки",
      sentiment: {
        positive: "Позитивно",
        negative: "Негативно"
      },
      eventFallbackTitle: "Обіцянка",
      placeholderMetaDue: (date: string) => `Строк ${date}`,
      placeholderMetaCreated: (date: string) => `Створено ${date}`,
      status: {
        active: "Активна",
        completedByPromisor: "Очікує перегляду",
        confirmed: "Дотримано",
        disputed: "Оскаржено",
        declined: "Відхилено"
      }
    }
  },
  en: {
    hero: {
      eyebrow: "A lightweight deal tracker",
      headline: "Promised? Dreddi knows",
      description: "Keep your word to others and to yourself.\nRecord your promises and dispute stakes. Every one you keep adds to a reputation people trust.",
      whyLink: "Why Dreddi →"
    },
    useDreddi: {
      label: "Use cases",
      title: "Use Dreddi when",
      bullets: [
        "You agree on deadlines, but nothing is signed yet",
        "Money, time, or reputation is at stake",
        "You hear “let’s just agree for now”",
        "You don’t want lawyers yet — but don’t want chaos either"
      ],
      scenariosTitle: "Typical scenarios",
      scenarios: [
        "Freelance & services before contracts",
        "Early-stage partnerships",
        "Real estate negotiations",
        "Contractors & long-term jobs",
        "Pilot projects / test collaborations"
      ],
      noteTitle: "Not for everything",
      framing: "For agreements where it’s too early for contracts but already risky to rely on words"
    },
    reputation: {
      label: "Outcome",
      title: "Reputation is built by execution",
      steps: [
        "The agreement is recorded in Dreddi",
        "Both sides confirm the outcome",
        "Confirmations build the reputation score"
      ],
      outcomeTitle: "Public profile",
      outcomeDescription: "Shows fulfilled and disputed deals",
      cta: "View example profile"
    },
    cta: {
      getStarted: "Record a promise",
      publicProfiles: "Browse profiles",
      createPromise: "Record a promise",
      reviewDeals: "My promises"
    },
    loading: {
      session: "Loading your session…",
      short: "Loading…",
      placeholder: "…"
    },
    errors: {
      userSession: "We couldn’t load your user session",
      notAuthenticated: "Not authenticated",
      reputation: "We couldn’t load reputation"
    },
    score: {
      label: "Reputation score",
      shortLabel: "Reputation",
      overviewLabel: "Promises overview",
      live: "Live",
      signIn: "Sign in to see updates",
      demoBadge: "Demo profile",
      cards: {
        confirmed: "Fulfilled",
        disputed: "Disputed"
      },
      onTime: {
        label: "On-time outcomes",
        helper: "Only fulfilled deals with a due date count here",
        empty: "No data yet"
      }
    },
    recentDeals: {
      title: "Recent promises",
      demoTitle: "Recent promises",
      seeAll: "View all",
      empty: "You don't have any promises yet",
      sentiment: {
        positive: "Positive",
        negative: "Negative"
      },
      eventFallbackTitle: "Promise",
      placeholderMetaDue: (date: string) => `Due ${date}`,
      placeholderMetaCreated: (date: string) => `Created ${date}`,
      status: {
        active: "Active",
        completedByPromisor: "Awaiting review",
        confirmed: "Fulfilled",
        disputed: "Disputed",
        declined: "Declined"
      }
    }
  }
};

export const getLandingCopy = (locale: Locale): LandingCopy => landingCopy[locale] ?? landingCopy[defaultLocale];
