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
  howItWorks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: {
      title: string;
      line: string;
    }[];
    demo: {
      dealTitle: string;
      dealMeta: string;
      dealStatus: string;
      reminder: string;
      confirmed: string;
      confirmedPlus: string;
      addedToProfile: string;
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
    howItWorks: {
      eyebrow: "Як це працює",
      title: "Домовленість — не просто слова",
      subtitle: "Зафіксували → нагадали → підтвердили → результат видно",
      steps: [
        {
          title: "Домовились",
          line: "Дедлайн “на словах” швидко плутається",
        },
        {
          title: "Зафіксували в Dreddi",
          line: "Дата + нагадування обом",
        },
        {
          title: "Підтвердили результат",
          line: "Обидві сторони підтверджують — і це видно в профілі",
        },
      ],
      demo: {
        dealTitle: "Лендінг для клієнта",
        dealMeta: "24 бер, 18:30",
        dealStatus: "Очікує підтвердження",
        reminder: "Нагадування завтра",
        confirmed: "Підтверджено",
        confirmedPlus: "+1 підтверджено",
        addedToProfile: "Додано в профіль",
      },
      primaryCta: "Створити домовленість",
      secondaryCta: "Подивитись приклад профілю",
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
    howItWorks: {
      eyebrow: "How it works",
      title: "An agreement is more than words",
      subtitle: "Record → remind → confirm → visible result",
      steps: [
        {
          title: "Agreed",
          line: "A deadline “on words” gets blurry fast",
        },
        {
          title: "Recorded in Dreddi",
          line: "Date + reminders for both sides",
        },
        {
          title: "Result confirmed",
          line: "Both sides confirm — and it becomes visible in profile",
        },
      ],
      demo: {
        dealTitle: "Client landing page",
        dealMeta: "Mar 24, 6:30 PM",
        dealStatus: "Awaiting confirmation",
        reminder: "Reminder tomorrow",
        confirmed: "Confirmed",
        confirmedPlus: "+1 confirmed",
        addedToProfile: "Added to profile",
      },
      primaryCta: "Create an agreement",
      secondaryCta: "View example profile",
    },
  },
};

export const getLandingCopy = (locale: Locale): LandingCopy =>
  landingCopy[locale] ?? landingCopy[defaultLocale];
