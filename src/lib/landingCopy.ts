import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  sections: {
    situation: {
      label: string;
      title: string;
      triggers: string[];
      cardMetaLabel: string;
      cardMetaCount: string;
      clearTitle: string;
      clearBullets: string[];
    };
    howItWorks: {
      label: string;
      title: string;
      steps: string[];
      stepMicrocopy: string[];
      previewDealTitle: string;
      previewDealStatus: string;
      previewDealMeta: string;
      previewReminderTitle: string;
      previewReminderMeta: string;
      previewOutcomeTitle: string;
      previewOutcomeStatus: string;
      previewOutcomeMeta: string;
    };
    trustCheck: {
      label: string;
      title: string;
      lead: string;
      bullets: string[];
      profilePreviewLabel: string;
      profilePreviewScore: string;
      profilePreviewConfirmed: string;
      profilePreviewDisputed: string;
      exampleProfileCta: string;
    };
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
    sections: {
      situation: {
        label: "Ситуація",
        title: "Знайомо?",
        triggers: [
          "Дедлайн “на словах”",
          "Ніхто нічого не памʼятає",
          "Починається “я думав ти…”",
          "Це тихо переростає в конфлікт",
        ],
        cardMetaLabel: "В Dreddi",
        cardMetaCount: "4 речі",
        clearTitle: "Коли це зафіксовано в Dreddi",
        clearBullets: [
          "Є дата",
          "Нагадування обом",
          "Обидві сторони підтверджують",
          "Результат видно",
        ],
      },
      howItWorks: {
        label: "Як це працює",
        title: "Домовились — і це не губиться",
        steps: [
          "Записали домовленість",
          "Нагадування обом",
          "Підтвердили результат",
        ],
        stepMicrocopy: ["Дата і умови зафіксовані", "Перед дедлайном обидва отримують пінг", "Сторони позначають факт виконання"],
        previewDealTitle: "Оновити брендбук",
        previewDealStatus: "Активна",
        previewDealMeta: "Строк 12 березня",
        previewReminderTitle: "Нагадування",
        previewReminderMeta: "Надіслано за 24 години до дедлайну",
        previewOutcomeTitle: "Результат підтверджено",
        previewOutcomeStatus: "Підтверджено",
        previewOutcomeMeta: "Подію видно в історії домовленості",
      },
      trustCheck: {
        label: "Перевірка",
        title: "Ви бачите, хто тримає слово",
        lead: "Профіль — це короткий зріз: підтвердження, оскарження, ритм виконання",
        bullets: [
          "Не обіцянки — фактичні результати",
          "Патерн: вчасно / переносить / спірні",
          "Простіше вирішити: довіряти чи ні",
        ],
        profilePreviewLabel: "Приклад профілю",
        profilePreviewScore: "Репутація 78",
        profilePreviewConfirmed: "14 підтверджено",
        profilePreviewDisputed: "2 оскаржено",
        exampleProfileCta: "Подивитись приклад профілю",
      },
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
    sections: {
      situation: {
        label: "Situation",
        title: "Recognize this?",
        triggers: [
          "A deadline “on words”",
          "No one remembers clearly",
          "It turns into “I thought you…”",
          "It quietly turns into conflict",
        ],
        cardMetaLabel: "In Dreddi",
        cardMetaCount: "4 points",
        clearTitle: "When it’s recorded in Dreddi",
        clearBullets: [
          "Clear date",
          "Reminders for both",
          "Both confirm",
          "Outcome is visible",
        ],
      },
      howItWorks: {
        label: "How it works",
        title: "Agreed — and it doesn’t get lost",
        steps: ["Record the agreement", "Reminders for both", "Confirm outcome"],
        stepMicrocopy: [
          "Date and terms are locked in",
          "Both sides get a pre-deadline reminder",
          "Both mark the final outcome",
        ],
        previewDealTitle: "Update brand guideline",
        previewDealStatus: "Active",
        previewDealMeta: "Due March 12",
        previewReminderTitle: "Reminder",
        previewReminderMeta: "Sent 24h before the due date",
        previewOutcomeTitle: "Outcome confirmed",
        previewOutcomeStatus: "Confirmed",
        previewOutcomeMeta: "Recorded in the deal history",
      },
      trustCheck: {
        label: "Trust check",
        title: "See who keeps their word",
        lead: "A profile shows confirmed and disputed outcomes",
        bullets: [
          "Outcomes, not promises",
          "Pattern: on time / delayed / disputed",
          "Decide faster: trust or not",
        ],
        profilePreviewLabel: "Profile preview",
        profilePreviewScore: "Reputation 78",
        profilePreviewConfirmed: "14 confirmed",
        profilePreviewDisputed: "2 disputed",
        exampleProfileCta: "View example profile",
      },
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
