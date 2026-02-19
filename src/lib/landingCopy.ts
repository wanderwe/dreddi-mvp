import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  useDreddi: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: {
      title: string;
      description: string;
    }[];
    demoStatus: string;
    demoDealLabel: string;
    demoReminder: string;
    demoConfirmed: string;
    demoDelta: string;
    demoProfileAdded: string;
    ctaPrimary: string;
    ctaSecondary: string;
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
        "Фіксуйте угоди з друзями, партнерами та клієнтами.\nПросто, публічно або приватно — без контрактів, без тиску.",
    },
    useDreddi: {
      eyebrow: "Як це працює",
      title: "Домовленість — не просто слова",
      subtitle: "Зафіксували → нагадали → підтвердили → результат видно",
      steps: [
        {
          title: "Домовились",
          description: "Дедлайн “на словах” швидко плутається",
        },
        {
          title: "Зафіксували в Dreddi",
          description: "Дата + нагадування обом",
        },
        {
          title: "Підтвердили результат",
          description: "Обидві сторони підтверджують — і це видно в профілі",
        },
      ],
      demoStatus: "Очікує підтвердження",
      demoDealLabel: "Домовленість",
      demoReminder: "Нагадування завтра",
      demoConfirmed: "Підтверджено",
      demoDelta: "+1 підтверджено",
      demoProfileAdded: "Додано в профіль",
      ctaPrimary: "Створити домовленість",
      ctaSecondary: "Подивитись приклад профілю",
    },
    cta: {
      getStarted: "Створити угоду",
      publicProfiles: "Переглянути публічні профілі",
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
      cards: {
        confirmed: "Підтверджено",
        disputed: "Оскаржено",
      },
      onTime: {
        label: "Вчасні виконання",
        helper: "Тут враховуються лише підтверджені угоди зі строком",
        empty: "Поки що немає угод зі строком",
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
        confirmed: "Підтверджено",
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
        "Track deals with friends, partners and clients.\nSimple, public or private — no contracts, no pressure.",
    },
    useDreddi: {
      eyebrow: "How it works",
      title: "An agreement is more than words",
      subtitle: "Record → remind → confirm → visible result",
      steps: [
        {
          title: "You agreed",
          description: "A deadline “on words” quickly gets blurry",
        },
        {
          title: "Recorded in Dreddi",
          description: "Date + reminders for both",
        },
        {
          title: "Confirmed the outcome",
          description: "Both sides confirm — and it appears on profile",
        },
      ],
      demoStatus: "Awaiting confirmation",
      demoDealLabel: "Agreement",
      demoReminder: "Reminder tomorrow",
      demoConfirmed: "Confirmed",
      demoDelta: "+1 confirmed",
      demoProfileAdded: "Added to profile",
      ctaPrimary: "Create an agreement",
      ctaSecondary: "View example profile",
    },
    cta: {
      getStarted: "Create a deal",
      publicProfiles: "View public profiles",
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
      cards: {
        confirmed: "Confirmed",
        disputed: "Disputed",
      },
      onTime: {
        label: "On-time outcomes",
        helper: "Only confirmed deals with a due date count here",
        empty: "No deals with a due date yet",
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
        confirmed: "Confirmed",
        disputed: "Disputed",
        declined: "Declined",
      },
    },
  },
};

export const getLandingCopy = (locale: Locale): LandingCopy =>
  landingCopy[locale] ?? landingCopy[defaultLocale];
