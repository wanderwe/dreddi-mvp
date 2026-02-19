import { Locale, defaultLocale } from "@/lib/i18n/locales";
export type LandingCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
  };
  howItWorks: {
    label: string;
    title: string;
    subtitle: string;
    timeline: string[];
    cards: {
      agreement: {
        title: string;
        meta: string;
        status: string;
        cta: string;
      };
      reminder: {
        label: string;
        text: string;
      };
      result: {
        status: string;
        profileHint: string;
        counter: string;
      };
    };
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
    howItWorks: {
      label: "Як це працює",
      title: "Один сценарій — і ви зрозумієте Dreddi",
      subtitle:
        "Без контрактів. Просто зафіксували — і обидві сторони бачать результат.",
      timeline: [
        "Домовились про допомогу з переїздом у суботу",
        "Зафіксували домовленість у Dreddi",
        "Нагадування приходить обом",
        "Після виконання — обидві сторони підтверджують",
      ],
      cards: {
        agreement: {
          title: "Допомога з переїздом",
          meta: "Субота, 12:00",
          status: "Очікує підтвердження",
          cta: "Підтвердити",
        },
        reminder: {
          label: "Нагадування",
          text: 'Завтра дедлайн: "Допомога з переїздом"',
        },
        result: {
          status: "Підтверджено",
          profileHint: "Додано до профілю",
          counter: "Підтверджено: +1",
        },
      },
    },
    reputation: {
      label: "Результат",
      title: "Результат видно обом сторонам",
      steps: [
        "Домовленість зберігається в Dreddi",
        "Після виконання обидві сторони підтверджують результат",
        "Підтверджені результати видно у профілі",
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
    howItWorks: {
      label: "How it works",
      title: "One example, and you’ll get Dreddi",
      subtitle:
        "No contracts. Just capture it — and both sides can confirm the outcome.",
      timeline: [
        "Agreed to help with the move on Saturday",
        "Captured the agreement in Dreddi",
        "Both get a reminder",
        "After it’s done — both confirm",
      ],
      cards: {
        agreement: {
          title: "Help with moving",
          meta: "Saturday, 12:00",
          status: "Pending confirmation",
          cta: "Confirm",
        },
        reminder: {
          label: "Reminder",
          text: 'Deadline tomorrow: "Help with moving"',
        },
        result: {
          status: "Confirmed",
          profileHint: "Added to profile",
          counter: "Confirmed: +1",
        },
      },
    },
    reputation: {
      label: "Outcome",
      title: "Both sides see the outcome",
      steps: [
        "The agreement is captured in Dreddi",
        "After it’s done, both sides confirm what happened",
        "Confirmed outcomes appear on the profile",
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
