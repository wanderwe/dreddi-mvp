import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  useDreddi: {
    label: string;
    problemTitle: string;
    problemBullets: string[];
    effectTitle: string;
    effectBullets: string[];
    effectLine: string;
  };
  reputation: {
    label: string;
    title: string;
    description: string;
    bullets: string[];
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

export const landingCopy: Record<Locale, LandingCopy> = {
  uk: {
    hero: {
      eyebrow: "Легкий трекер домовленостей",
      headline: "Домовленість починається з підтвердження",
      description:
        "Фіксуйте угоди з друзями, партнерами та клієнтами.\nПросто, публічно або приватно — без контрактів, без тиску.\nАле з видимими наслідками для репутації.",
    },
    useDreddi: {
      label: "Сценарії використання",
      problemTitle: "Знайомо?",
      problemBullets: [
        "Дедлайн “на словах”",
        "Ніхто нічого не памʼятає",
        "Починається “я думав ти…”",
        "І зʼявляється напруга",
      ],
      effectTitle: "Коли це зафіксовано в Dreddi",
      effectBullets: [
        "Є дата",
        "Інша сторона підтвердила участь",
        "Результат буде зафіксований",
        "Це стане частиною профілю",
      ],
      effectLine: "Видимість змінює поведінку.",
    },
    reputation: {
      label: "Перевірка",
      title: "Ви бачите, хто тримає слово",
      description: "Публічний профіль показує не слова — а історію виконання.",
      bullets: [
        "Підтверджені домовленості",
        "Оскаржені випадки",
        "Ритм виконання",
      ],
      cta: "Подивитись приклад профілю",
    },
    cta: {
      getStarted: "Створити угоду",
      publicProfiles: "Переглянути профілі",
      createPromise: "Створити угоду",
      reviewDeals: "Переглянути угоди",
    },
    loading: {
      session: "Завантажуємо вашу сесію…",
      short: "Завантаження…",
      placeholder: "…",
    },
    errors: {
      userSession: "Не вдалося завантажити сесію користувача",
      notAuthenticated: "Не автентифіковано",
      reputation: "Не вдалося завантажити репутацію",
    },
    score: {
      label: "Репутаційний бал",
      shortLabel: "Репутація",
      overviewLabel: "Огляд домовленостей",
      live: "Наживо",
      signIn: "Увійдіть, щоб бачити оновлення",
      demoBadge: "Приклад профілю",
      cards: {
        confirmed: "Дотримано",
        disputed: "Оскаржено",
      },
      onTime: {
        label: "Вчасні виконання",
        helper: "Тут враховуються лише дотримані угоди зі строком",
        empty: "Ще немає даних",
      },
    },
    recentDeals: {
      title: "Останні угоди",
      demoTitle: "Останні угоди",
      seeAll: "Переглянути всі",
      empty: "У вас поки що немає жодної угоди",
      sentiment: {
        positive: "Позитивно",
        negative: "Негативно",
      },
      eventFallbackTitle: "Угода",
      placeholderMetaDue: (date) => `Строк ${date}`,
      placeholderMetaCreated: (date) => `Створено ${date}`,
      status: {
        active: "Активна",
        completedByPromisor: "Очікує перегляду",
        confirmed: "Дотримано",
        disputed: "Оскаржено",
        declined: "Відхилено",
      },
    },
  },
  en: {
    hero: {
      eyebrow: "A lightweight deal tracker",
      headline: "An agreement starts with confirmation",
      description:
        "Track deals with friends, partners and clients.\nSimple, public or private — no contracts, no pressure.\nBut with visible consequences for reputation.",
    },
    useDreddi: {
      label: "Use cases",
      problemTitle: "Sound familiar?",
      problemBullets: [
        "Deadline is agreed only verbally",
        "Nobody remembers exact terms",
        "It turns into “I thought you…”",
        "Tension starts to grow",
      ],
      effectTitle: "When it is recorded in Dreddi",
      effectBullets: [
        "There is a clear date",
        "The other side confirms participation",
        "The result will be recorded",
        "It becomes part of the profile",
      ],
      effectLine: "Visibility changes behavior.",
    },
    reputation: {
      label: "Verification",
      title: "You can see who keeps their word",
      description: "A public profile shows not claims — but execution history.",
      bullets: [
        "Confirmed agreements",
        "Disputed cases",
        "Execution rhythm",
      ],
      cta: "View profile example",
    },
    cta: {
      getStarted: "Create a deal",
      publicProfiles: "Browse profiles",
      createPromise: "Create a deal",
      reviewDeals: "View deals",
    },
    loading: {
      session: "Loading your session…",
      short: "Loading…",
      placeholder: "…",
    },
    errors: {
      userSession: "We couldn’t load your user session",
      notAuthenticated: "Not authenticated",
      reputation: "We couldn’t load reputation",
    },
    score: {
      label: "Reputation score",
      shortLabel: "Reputation",
      overviewLabel: "Agreement Snapshot",
      live: "Live",
      signIn: "Sign in to see updates",
      demoBadge: "Demo profile",
      cards: {
        confirmed: "Fulfilled",
        disputed: "Disputed",
      },
      onTime: {
        label: "On-time outcomes",
        helper: "Only fulfilled deals with a due date count here",
        empty: "No data yet",
      },
    },
    recentDeals: {
      title: "Recent deals",
      demoTitle: "Recent deals",
      seeAll: "View all",
      empty: "You don't have any deals yet",
      sentiment: {
        positive: "Positive",
        negative: "Negative",
      },
      eventFallbackTitle: "Deal",
      placeholderMetaDue: (date) => `Due ${date}`,
      placeholderMetaCreated: (date) => `Created ${date}`,
      status: {
        active: "Active",
        completedByPromisor: "Awaiting review",
        confirmed: "Fulfilled",
        disputed: "Disputed",
        declined: "Declined",
      },
    },
  },
};

export const getLandingCopy = (locale: Locale): LandingCopy =>
  landingCopy[locale] ?? landingCopy[defaultLocale];
