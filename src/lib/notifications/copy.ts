import { NotificationCopy, NotificationLocale, NotificationRole, NotificationType } from "./types";

const fallbackLocale: NotificationLocale = "en";

const copyByLocale: Record<NotificationLocale, Record<NotificationType, NotificationCopy>> = {
  en: {
    N1: {
      title: "New agreement invitation",
      body: "Confirm only if you’re ready to take responsibility.",
      ctaLabel: "Review",
    },
    N2: {
      title: "Agreement confirmed",
      body: "Responsibility is now active.",
      ctaLabel: "Open",
    },
    N3: {
      title: "Deadline approaching",
      body: "Time is running out on a confirmed agreement.",
      ctaLabel: "View",
    },
    N4: {
      title: "Agreement is overdue",
      body: "Update the status or mark it completed.",
      ctaLabel: "Open",
    },
    N5: {
      title: "Action needed",
      body: "Agreement marked completed. Confirm or dispute.",
      ctaLabel: "Review",
    },
    N6: {
      title: "Outcome confirmed",
      body: "Reputation updated.",
      ctaLabel: "View",
    },
    N7: {
      title: "Outcome disputed",
      body: "The agreement was disputed. Check details.",
      ctaLabel: "View",
    },
  },
  uk: {
    N1: {
      title: "Запрошення до домовленості",
      body: "Підтверджуйте лише якщо готові взяти відповідальність.",
      ctaLabel: "Переглянути",
    },
    N2: {
      title: "Домовленість підтверджено",
      body: "Відповідальність активна.",
      ctaLabel: "Відкрити",
    },
    N3: {
      title: "Наближається дедлайн",
      body: "Час спливає для підтвердженої домовленості.",
      ctaLabel: "Переглянути",
    },
    N4: {
      title: "Дедлайн минув",
      body: "Оновіть статус або позначте виконаною.",
      ctaLabel: "Відкрити",
    },
    N5: {
      title: "Потрібна дія",
      body: "Домовленість позначено виконаною. Підтвердіть або оскаржте.",
      ctaLabel: "Перевірити",
    },
    N6: {
      title: "Результат підтверджено",
      body: "Репутацію оновлено.",
      ctaLabel: "Переглянути",
    },
    N7: {
      title: "Результат оскаржено",
      body: "Домовленість оскаржено. Перевірте деталі.",
      ctaLabel: "Переглянути",
    },
  },
};

const roleOverrides: Record<NotificationLocale, Partial<Record<NotificationType, Partial<Record<NotificationRole, NotificationCopy>>>>> = {
  en: {
    N2: {
      creator: {
        title: "Agreement accepted",
        body: "The other side confirmed the agreement.",
        ctaLabel: "Open",
      },
    },
    N4: {
      creator: {
        title: "Agreement overdue",
        body: "An agreement you’re waiting for is overdue.",
        ctaLabel: "Open",
      },
    },
  },
  uk: {
    N2: {
      creator: {
        title: "Домовленість прийнято",
        body: "Інша сторона підтвердила домовленість.",
        ctaLabel: "Відкрити",
      },
    },
    N4: {
      creator: {
        title: "Домовленість прострочена",
        body: "Домовленість, на яку ви очікуєте, прострочена.",
        ctaLabel: "Відкрити",
      },
    },
  },
};

const followupOverrides: Record<NotificationLocale, {
  invite: string;
  completion24: string;
  completion72: string;
}> = {
  en: {
    invite: "Still pending. Confirm or decline.",
    completion24: "Pending confirmation. Someone’s reputation depends on it.",
    completion72: "Still pending. Please confirm or dispute.",
  },
  uk: {
    invite: "Все ще очікує. Підтвердьте або відхиліть.",
    completion24: "Очікує підтвердження. Від цього залежить чиясь репутація.",
    completion72: "Все ще очікує. Підтвердіть або оскаржте.",
  },
};

export type NotificationCopyOptions = {
  locale: NotificationLocale;
  type: NotificationType;
  role?: NotificationRole;
  followup?: "invite" | "completion24" | "completion72";
  delta?: number | null;
};

export const getNotificationCopy = ({ locale, type, role, followup, delta }: NotificationCopyOptions) => {
  const baseLocale = copyByLocale[locale] ? locale : fallbackLocale;
  const base = copyByLocale[baseLocale][type];
  const roleOverride = role ? roleOverrides[baseLocale]?.[type]?.[role] : undefined;

  let body = roleOverride?.body ?? base.body;
  let title = roleOverride?.title ?? base.title;
  let ctaLabel = roleOverride?.ctaLabel ?? base.ctaLabel;

  if (type === "N1" && followup === "invite") {
    body = followupOverrides[baseLocale].invite;
  }

  if (type === "N5" && followup === "completion24") {
    body = followupOverrides[baseLocale].completion24;
  }

  if (type === "N5" && followup === "completion72") {
    body = followupOverrides[baseLocale].completion72;
  }

  if (type === "N6" && typeof delta === "number") {
    const formatted = delta >= 0 ? `+${delta}` : `${delta}`;
    body = baseLocale === "uk"
      ? `Репутацію оновлено: ${formatted}.`
      : `Reputation updated: ${formatted}.`;
  }

  return { title, body, ctaLabel };
};
