import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  useDreddi: {
    title: string;
    beforeTitle: string;
    beforeBullets: string[];
    afterTitle: string;
    afterBullets: string[];
    highlightWords: string[];
    ctaLine: string;
    ctaPrimary: string;
    ctaSecondary: string;
    previewDelta: string;
    previewNote: string;
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
      title: "Коли домовленість — це просто слова",
      beforeTitle: "Без фіксації",
      beforeBullets: [
        "Дедлайн “на словах”",
        "Ніхто нічого не пам’ятає",
        "Починається “я думав ти…”",
        "Це тихо переростає в конфлікт",
      ],
      afterTitle: "Коли домовленість зафіксована в Dreddi",
      afterBullets: [
        "Є конкретна дата",
        "Обом приходить нагадування",
        "Виконання підтверджують обидві сторони",
        "Результат видно в профілі",
      ],
      highlightWords: ["дата", "нагадування", "підтверджують", "профілі"],
      ctaLine: "Фіксуйте домовленості до того, як стане незручно.",
      ctaPrimary: "Створити домовленість",
      ctaSecondary: "Подивитись приклад профілю",
      previewDelta: "+1 підтверджено",
      previewNote: "Обидві сторони підтвердили виконання",
    },
    reputation: {
      label: "Результат",
      title: "Репутація будується виконанням",
      steps: [
        "Домовленість фіксується в Dreddi",
        "Виконання підтверджують обидві сторони",
        "Підтвердження формують репутаційний бал",
      ],
      outcomeTitle: "Публічний профіль",
      outcomeDescription: "Відображає підтверджені та оскаржені угоди",
      cta: "Переглянути приклад профілю",
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
      title: "When an agreement is just words",
      beforeTitle: "Without recording",
      beforeBullets: [
        "Deadline “on words”",
        "No one remembers clearly",
        "It turns into “I thought you…”",
        "It quietly turns into conflict",
      ],
      afterTitle: "When it’s recorded in Dreddi",
      afterBullets: [
        "Clear date",
        "Reminders for both",
        "Both confirm completion",
        "Result visible on profile",
      ],
      highlightWords: ["date", "Reminders", "confirm", "profile"],
      ctaLine: "Fix agreements before they turn awkward.",
      ctaPrimary: "Create an agreement",
      ctaSecondary: "View example profile",
      previewDelta: "+1 confirmed",
      previewNote: "Both sides confirmed completion",
    },
    reputation: {
      label: "Outcome",
      title: "Reputation is built by execution",
      steps: [
        "The agreement is recorded in Dreddi",
        "Both sides confirm the outcome",
        "Confirmations build the reputation score",
      ],
      outcomeTitle: "Public profile",
      outcomeDescription: "Shows confirmed and disputed deals",
      cta: "View example profile",
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
