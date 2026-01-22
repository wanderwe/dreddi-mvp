import { Locale, defaultLocale } from "@/lib/i18n/locales";
import { PromiseStatus } from "@/lib/promiseStatus";

type DemoDealDate = "nextSaturday" | "nextMarchFirst" | null;

export type DemoDeal = {
  id: string;
  title: string;
  status: PromiseStatus;
  meta?: string;
  dueDate: DemoDealDate;
};

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
    seeAll: string;
    guestHint: string;
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
  demoDeals: DemoDeal[];
};

export const landingCopy: Record<Locale, LandingCopy> = {
  uk: {
    hero: {
      eyebrow: "Аналітика репутації для угод та обіцянок",
      headline: "Домовленість починається з підтвердження",
      description:
        "Dreddi — сервіс між словами і контрактом.\nВи фіксуєте домовленості, берете відповідальність\nі будуєте репутацію без юридичного тиску —\nале з реальними наслідками для довіри.",
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
      live: "Наживо",
      signIn: "Увійдіть, щоб бачити оновлення наживо",
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
      title: "Ваші останні угоди",
      seeAll: "Переглянути всі",
      guestHint: "Увійдіть, щоб бачити свої актуальні угоди",
      empty: "Створіть свою першу угоду, щоб наповнити стрічку репутації.",
      sentiment: {
        positive: "Позитивно",
        negative: "Негативно",
      },
      eventFallbackTitle: "Угода",
      placeholderMetaDue: (date) => `Строк ${date}`,
      placeholderMetaCreated: (date) => `Створено ${date}`,
      status: {
        active: "Активна",
        completedByPromisor: "Позначено виконаною — очікує підтвердження",
        confirmed: "Підтверджено",
        disputed: "Оскаржено",
        declined: "Відхилено",
      },
    },
    demoDeals: [
      {
        id: "demo-1",
        title: "Підготувати pitch deck для інвесторів",
        status: "active",
        dueDate: null,
      },
      {
        id: "demo-2",
        title: "Допомогти з переїздом у вихідні",
        status: "confirmed",
        dueDate: "nextSaturday",
      },
      {
        id: "demo-3",
        title: "Повернути $500 до 1 березня",
        status: "disputed",
        dueDate: "nextMarchFirst",
        meta: "Результат: перегляд",
      },
    ],
  },
  en: {
    hero: {
      eyebrow: "Reputation analytics for deals and promises",
      headline: "An agreement starts with confirmation",
      description:
        "Dreddi is the service layer between talk and contracts.\nYou capture agreements, take responsibility,\nand build reputation without legal pressure —\nbut with real consequences for trust.",
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
      live: "Live",
      signIn: "Sign in to see live updates",
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
      title: "Your recent deals",
      seeAll: "View all",
      guestHint: "Sign in to see your active deals",
      empty: "Create your first deal to populate your reputation feed.",
      sentiment: {
        positive: "Positive",
        negative: "Negative",
      },
      eventFallbackTitle: "Deal",
      placeholderMetaDue: (date) => `Due ${date}`,
      placeholderMetaCreated: (date) => `Created ${date}`,
      status: {
        active: "Active",
        completedByPromisor: "Marked complete — awaiting confirmation",
        confirmed: "Confirmed",
        disputed: "Disputed",
        declined: "Declined",
      },
    },
    demoDeals: [
      {
        id: "demo-1",
        title: "Prepare an investor pitch deck",
        status: "active",
        dueDate: null,
      },
      {
        id: "demo-2",
        title: "Help with the move this weekend",
        status: "confirmed",
        dueDate: "nextSaturday",
      },
      {
        id: "demo-3",
        title: "Return $500 by March 1",
        status: "disputed",
        dueDate: "nextMarchFirst",
        meta: "Outcome: under review",
      },
    ],
  },
};

export const getLandingCopy = (locale: Locale): LandingCopy =>
  landingCopy[locale] ?? landingCopy[defaultLocale];
