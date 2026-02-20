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
  comparison: {
    eyebrow: string;
    title: string;
    withoutTitle: string;
    withoutPoints: string[];
    recordedTitle: string;
    recordedPoints: string[];
    demo: {
      dealTitle: string;
      dealMeta: string;
      dealStatus: string;
      reminder: string;
      confirmed: string;
      addedToProfile: string;
    };
    ctaLine: string;
  };
  verification: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: string[];
    cardLabel: string;
    cardHint: string;
    chips: {
      confirmed: string;
      disputed: string;
      reputation: string;
    };
    primaryCta: string;
    secondaryCta: string;
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
      title: "Коли варто використовувати Dreddi",
      bullets: [
        "Ви погодили дедлайни, але нічого не підписано",
        "На кону гроші, час або репутація",
        "Ви чуєте «давайте поки просто домовимось»",
        "Ви ще не хочете юристів — але й хаосу теж",
      ],
      scenariosTitle: "Типові сценарії",
      scenarios: [
        "Фріланс і послуги до контрактів",
        "Партнерства на ранніх етапах",
        "Переговори з нерухомості",
        "Підрядники та довгі проєкти",
        "Пілотні проєкти / тестова співпраця",
      ],
      noteTitle: "Не для всього",
      framing:
        "Для домовленостей, де ще рано для контрактів, але вже ризиковано покладатися лише на слова",
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
      outcomeDescription: "Відображає дотримані та оскаржені угоди",
      cta: "Переглянути приклад профілю",
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
    comparison: {
      eyebrow: "Ситуація",
      title: "Коли домовленість залишається словами",
      withoutTitle: "Без фіксації",
      withoutPoints: [
        "Дедлайн “на словах”",
        "Ніхто нічого не пам’ятає",
        "Починається “я думав ти…”",
        "Це тихо переростає в конфлікт",
      ],
      recordedTitle: "Зафіксовано в Dreddi",
      recordedPoints: [
        "Є дата і нагадування обом",
        "Після виконання — підтвердження двох сторін",
        "Результат видно в профілі",
      ],
      demo: {
        dealTitle: "Лендінг для клієнта",
        dealMeta: "24 бер, 18:30",
        dealStatus: "Очікує підтвердження",
        reminder: "Нагадування завтра",
        confirmed: "Підтверджено +1",
        addedToProfile: "Додано в профіль",
      },
      ctaLine: "Фіксуйте домовленості до того, як стане незручно",
    },
    verification: {
      eyebrow: "Перевірка",
      title: "Працюйте з тими, хто виконує",
      subtitle: "Профіль показує реальну історію підтверджених та оскаржених домовленостей",
      points: [
        "Історія виконання — не обіцянки",
        "Підтверджені та оскаржені результати",
        "Швидше рішення: довіряти чи ні",
      ],
      cardLabel: "Публічний профіль",
      cardHint: "Історія виконання — в одному місці",
      chips: {
        confirmed: "Дотримано",
        disputed: "Оскаржено",
        reputation: "Репутація",
      },
      primaryCta: "Переглянути приклад профілю",
      secondaryCta: "Переглянути угоди",
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
      title: "Use Dreddi when",
      bullets: [
        "You agree on deadlines, but nothing is signed yet",
        "Money, time, or reputation is at stake",
        "You hear “let’s just agree for now”",
        "You don’t want lawyers yet — but don’t want chaos either",
      ],
      scenariosTitle: "Typical scenarios",
      scenarios: [
        "Freelance & services before contracts",
        "Early-stage partnerships",
        "Real estate negotiations",
        "Contractors & long-term jobs",
        "Pilot projects / test collaborations",
      ],
      noteTitle: "Not for everything",
      framing:
        "For agreements where it’s too early for contracts but already risky to rely on words",
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
      outcomeDescription: "Shows fulfilled and disputed deals",
      cta: "View example profile",
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
    comparison: {
      eyebrow: "Situation",
      title: "When an agreement stays verbal",
      withoutTitle: "Without recording",
      withoutPoints: [
        "Deadline “on words”",
        "No one remembers clearly",
        "It turns into “I thought you…”",
        "It quietly turns into conflict",
      ],
      recordedTitle: "Recorded in Dreddi",
      recordedPoints: [
        "There’s a date with reminders for both",
        "After delivery, both sides confirm",
        "The result appears in the profile",
      ],
      demo: {
        dealTitle: "Client landing page",
        dealMeta: "Mar 24, 6:30 PM",
        dealStatus: "Awaiting confirmation",
        reminder: "Reminder tomorrow",
        confirmed: "Confirmed +1",
        addedToProfile: "Added to profile",
      },
      ctaLine: "Fix agreements before they turn awkward",
    },
    verification: {
      eyebrow: "Verification",
      title: "Work with people who follow through",
      subtitle: "A profile shows the real history of confirmed and disputed agreements",
      points: [
        "Execution history — not promises",
        "Confirmed and disputed outcomes",
        "Faster call: trust or pass",
      ],
      cardLabel: "Public profile",
      cardHint: "Execution history in one place",
      chips: {
        confirmed: "Fulfilled",
        disputed: "Disputed",
        reputation: "Reputation",
      },
      primaryCta: "View example profile",
      secondaryCta: "View deals",
    },
  },
};

export const getLandingCopy = (locale: Locale): LandingCopy =>
  landingCopy[locale] ?? landingCopy[defaultLocale];
