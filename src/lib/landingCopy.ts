import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  useDreddi: {
    label: string;
    title: string;
    chaosBullets: string[];
    clarityTitle: string;
    clarityBullets: string[];
    previewRows: {
      date: string;
      reminder: string;
      confirmed: string;
      plusOne: string;
    };
    statusTags: string[];
    transitionLine: string;
    primaryCta: string;
    secondaryCta: string;
  };
  reputation: {
    label: string;
    title: string;
    description: string;
    bullets: string[];
    profilePreviewTitle: string;
    profilePreviewItems: string[];
    profilePreviewStats: string[];
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
        "Фіксуйте угоди з друзями, партнерами та клієнтами.\nПросто, публічно або приватно — без контрактів, без тиску.\nАле з видимими наслідками для репутації.",
    },
    useDreddi: {
      label: "Як це працює",
      title: "Коли домовленість залишається словами",
      chaosBullets: [
        "Дедлайн “на словах”",
        "Ніхто нічого не пам’ятає",
        "Починається “я думав ти...”",
        "Це тихо переростає в конфлікт",
      ],
      clarityTitle: "Зафіксовано в Dreddi",
      clarityBullets: [
        "Є конкретна дата",
        "Нагадування приходить обом",
        "Виконання підтверджують обидві сторони",
        "Результат видно в профілі",
      ],
      previewRows: {
        date: "Дата: 24 квітня, 18:00",
        reminder: "Нагадування: за 24 години",
        confirmed: "Підтвердження: обидві сторони",
        plusOne: "+1 підтверджено",
      },
      statusTags: ["Підтверджено", "Оскаржено", "Репутація"],
      transitionLine: "Фіксуйте домовленості до того, як стане незручно",
      primaryCta: "Створити домовленість",
      secondaryCta: "Подивитися приклад профілю",
    },
    reputation: {
      label: "Публічний профіль",
      title: "Ви бачите, хто тримає слово",
      description:
        "Історія підтверджених і оскаржених домовленостей — в одному місці",
      bullets: [
        "Історія виконання — не обіцянки",
        "Видно підтверджені та оскаржені результати",
        "Простіше вирішити — довіряти чи ні",
      ],
      profilePreviewTitle: "Профіль довіри",
      profilePreviewItems: [
        "12 підтверджено",
        "2 оскаржено",
        "89% виконано вчасно",
      ],
      profilePreviewStats: ["Підтверджено", "Оскаржено", "Репутація"],
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
        "Track deals with friends, partners and clients.\nSimple, public or private — no contracts, no pressure.\nBut with visible consequences for reputation.",
    },
    useDreddi: {
      label: "How it works",
      title: "When an agreement stays just words",
      chaosBullets: [
        "Deadlines are only verbal",
        "No one remembers the details",
        "It turns into “I thought you…”",
        "That quietly becomes conflict",
      ],
      clarityTitle: "Captured in Dreddi",
      clarityBullets: [
        "A clear date is set",
        "Both sides get reminders",
        "Both parties confirm completion",
        "Result appears on profile",
      ],
      previewRows: {
        date: "Date: Apr 24, 18:00",
        reminder: "Reminder: 24 hours before",
        confirmed: "Confirmation: both parties",
        plusOne: "+1 confirmed",
      },
      statusTags: ["Confirmed", "Disputed", "Reputation"],
      transitionLine: "Record agreements before things get awkward",
      primaryCta: "Create agreement",
      secondaryCta: "View profile example",
    },
    reputation: {
      label: "Public profile",
      title: "You can see who keeps their word",
      description: "History of confirmed and disputed agreements in one place",
      bullets: [
        "Execution history, not promises",
        "See confirmed and disputed outcomes",
        "Decide faster who to trust",
      ],
      profilePreviewTitle: "Trust profile",
      profilePreviewItems: ["12 confirmed", "2 disputed", "89% on-time"],
      profilePreviewStats: ["Confirmed", "Disputed", "Reputation"],
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
