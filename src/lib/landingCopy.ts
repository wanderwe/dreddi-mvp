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
    subtitle: string;
    bullets: string[];
    cardMicrocopy: string;
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
      title: "Домовились. І що далі?",
      beforeTitle: "Без фіксації",
      beforeBullets: [
        "Дедлайн “на словах”",
        "Ніхто нічого не пам’ятає",
        "Починається “я думав ти…”",
        "Це тихо переростає в конфлікт",
      ],
      afterTitle: "Коли це зафіксовано в Dreddi",
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
      label: "Перевірка",
      title: "Ви бачите, хто тримає слово",
      subtitle: "Профіль показує історію підтверджених та оскаржених домовленостей.",
      bullets: [
        "Дивіться історію домовленостей, а не обіцянки",
        "Розумійте стиль виконання: вчасно / з переносами / з конфліктами",
        "Приймайте рішення швидше — без зайвих пояснень",
      ],
      cardMicrocopy: "Історія виконання — в одному місці",
      ctaPrimary: "Переглянути приклад профілю",
      ctaSecondary: "Переглянути угоди",
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
      title: "You agreed. Now what?",
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
      label: "Verification",
      title: "See who follows through",
      subtitle: "A profile shows a history of confirmed and disputed agreements.",
      bullets: [
        "See history, not promises",
        "Understand the pattern: on time / delayed / disputed",
        "Decide faster — without awkward back-and-forth",
      ],
      cardMicrocopy: "Delivery history in one place",
      ctaPrimary: "View example profile",
      ctaSecondary: "View deals",
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
