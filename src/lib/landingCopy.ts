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
  publicAgreements: {
    label: string;
    title: string;
    description: string;
    cards: {
      publicCommitments: {
        title: string;
        body: string;
      };
      observing: {
        title: string;
        body: string;
      };
      outcomes: {
        title: string;
        body: string;
      };
    };
    microcopy: {
      commitments: string;
      observers: string;
      privacy: string;
    };
    mockCard: {
      badge: string;
      watchers: string;
      timelineLabel: string;
      timelineValue: string;
      outcomeLabel: string;
      outcomeValue: string;
      viewCta: string;
      watchCta: string;
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
        "Фіксуйте угоди з друзями, партнерами чи клієнтами.\n\nПросто: публічно або приватно. Без контрактів і без тиску.\n\nЛише з видимими наслідками для репутації.",
      whyLink: "Чому існує Dreddi →",
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
    publicAgreements: {
      label: "Публічна відповідальність",
      title: "Публічні угоди роблять відповідальність видимою",
      description:
        "Перетворюйте важливі домовленості на публічні зобовʼязання, за якими можуть стежити інші. Прогрес, дедлайни та фінальний результат стають частиною репутації.",
      cards: {
        publicCommitments: {
          title: "Публічні домовленості",
          body: "Окремі угоди можна зробити видимими та поділитися ними як публічною сторінкою.",
        },
        observing: {
          title: "Стеження без участі",
          body: "Інші користувачі можуть стежити за угодою, не стаючи її учасниками.",
        },
        outcomes: {
          title: "Репутація з результатів",
          body: "Виконані або оскаржені угоди формують репутацію. Без лайків і популярності.",
        },
      },
      microcopy: {
        commitments: "Публічні угоди — це не пости. Це зобовʼязання з результатом.",
        observers: "Люди можуть стежити за угодою, але не втручатися в неї.",
        privacy: "Приватні деталі залишаються приватними. Репутація все одно відображає реальні результати.",
      },
      mockCard: {
        badge: "Публічна",
        watchers: "Стежать",
        timelineLabel: "Статус",
        timelineValue: "У процесі • дедлайн 12 серпня",
        outcomeLabel: "Результат",
        outcomeValue: "Після завершення: «Виконано» або «Оскаржено»",
        viewCta: "Переглянути публічну угоду",
        watchCta: "Стежити за угодою",
      },
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
        "Record deals with friends, partners and clients.\n\nSimple, public or private. No contracts, no pressure.\n\nJust visible consequences for reputation.",
      whyLink: "Why Dreddi exists →",
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
    publicAgreements: {
      label: "Public accountability",
      title: "Public agreements make accountability visible",
      description:
        "Turn important agreements into public commitments people can follow. Share the agreement, let others observe progress, and let the final outcome become part of reputation.",
      cards: {
        publicCommitments: {
          title: "Public commitments",
          body: "Selected agreements can be made visible and shared as a public page.",
        },
        observing: {
          title: "Watching without joining",
          body: "Other users can follow a public agreement without becoming participants.",
        },
        outcomes: {
          title: "Reputation from outcomes",
          body: "Fulfilled and disputed outcomes shape reputation. No likes. No popularity score.",
        },
      },
      microcopy: {
        commitments: "Public agreements are not posts. They are commitments with outcomes.",
        observers: "People can watch the agreement, not interfere with it.",
        privacy: "Private details stay private. Reputation still reflects real outcomes.",
      },
      mockCard: {
        badge: "Public",
        watchers: "Watching",
        timelineLabel: "Timeline",
        timelineValue: "In progress • due Aug 12",
        outcomeLabel: "Outcome",
        outcomeValue: "After completion: “Fulfilled” or “Disputed”",
        viewCta: "View public agreement",
        watchCta: "Watch agreement",
      },
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
