import {
  NotificationCopy,
  NotificationLocale,
  NotificationRole,
  NotificationType,
  NotificationTypeInput,
  normalizeNotificationType,
} from "./types";
import { stripTrailingPeriod } from "@/lib/text";

const fallbackLocale: NotificationLocale = "en";

const copyByLocale: Record<NotificationLocale, Record<NotificationType, NotificationCopy>> = {
  en: {
    invite: {
      title: "New agreement invitation",
      body: "Confirm only if you’re ready to take responsibility",
      ctaLabel: "Review",
    },
    invite_followup: {
      title: "Agreement confirmed",
      body: "Responsibility is now active",
      ctaLabel: "Open",
    },
    due_soon: {
      title: "Deadline approaching",
      body: "Time is running out on a confirmed agreement",
      ctaLabel: "View",
    },
    overdue: {
      title: "Agreement is overdue",
      body: "Update the status or mark it completed",
      ctaLabel: "Open",
    },
    completion_waiting: {
      title: "Action needed",
      body: "Agreement marked completed. Confirm or dispute.",
      ctaLabel: "Review",
    },
    completion_followup: {
      title: "Outcome confirmed",
      body: "Reputation updated",
      ctaLabel: "View",
    },
    dispute: {
      title: "Outcome disputed",
      body: "The agreement was disputed. Check details.",
      ctaLabel: "View",
    },
  },
  uk: {
    invite: {
      title: "Запрошення до домовленості",
      body: "Підтверджуйте лише якщо готові взяти відповідальність",
      ctaLabel: "Переглянути",
    },
    invite_followup: {
      title: "Домовленість підтверджено",
      body: "Відповідальність активна",
      ctaLabel: "Відкрити",
    },
    due_soon: {
      title: "Наближається дедлайн",
      body: "Час спливає для підтвердженої домовленості",
      ctaLabel: "Переглянути",
    },
    overdue: {
      title: "Дедлайн минув",
      body: "Оновіть статус або позначте виконаною",
      ctaLabel: "Відкрити",
    },
    completion_waiting: {
      title: "Потрібна дія",
      body: "Домовленість позначено виконаною. Підтвердіть або оскаржте.",
      ctaLabel: "Перевірити",
    },
    completion_followup: {
      title: "Результат підтверджено",
      body: "Репутацію оновлено",
      ctaLabel: "Переглянути",
    },
    dispute: {
      title: "Результат оскаржено",
      body: "Домовленість оскаржено. Перевірте деталі.",
      ctaLabel: "Переглянути",
    },
  },
};

const roleOverrides: Record<NotificationLocale, Partial<Record<NotificationType, Partial<Record<NotificationRole, NotificationCopy>>>>> = {
  en: {
    invite_followup: {
      creator: {
        title: "Agreement accepted",
        body: "The other side confirmed the agreement",
        ctaLabel: "Open",
      },
    },
    overdue: {
      creator: {
        title: "Agreement overdue",
        body: "An agreement you’re waiting for is overdue",
        ctaLabel: "Open",
      },
    },
  },
  uk: {
    invite_followup: {
      creator: {
        title: "Домовленість прийнято",
        body: "Інша сторона підтвердила домовленість",
        ctaLabel: "Відкрити",
      },
    },
    overdue: {
      creator: {
        title: "Домовленість прострочена",
        body: "Домовленість, на яку ви очікуєте, прострочена",
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
  type: NotificationTypeInput;
  role?: NotificationRole;
  followup?: "invite" | "completion24" | "completion72";
  delta?: number | null;
};

export const getNotificationCopy = ({ locale, type, role, followup, delta }: NotificationCopyOptions) => {
  const normalizedType = normalizeNotificationType(type);
  const baseLocale = copyByLocale[locale] ? locale : fallbackLocale;
  const base = copyByLocale[baseLocale][normalizedType];
  const roleOverride = role ? roleOverrides[baseLocale]?.[normalizedType]?.[role] : undefined;

  let body = roleOverride?.body ?? base.body;
  const title = roleOverride?.title ?? base.title;
  const ctaLabel = roleOverride?.ctaLabel ?? base.ctaLabel;

  if (normalizedType === "invite" && followup === "invite") {
    body = followupOverrides[baseLocale].invite;
  }

  if (normalizedType === "completion_waiting" && followup === "completion24") {
    body = followupOverrides[baseLocale].completion24;
  }

  if (normalizedType === "completion_waiting" && followup === "completion72") {
    body = followupOverrides[baseLocale].completion72;
  }

  if (normalizedType === "completion_followup" && typeof delta === "number") {
    const formatted = delta >= 0 ? `+${delta}` : `${delta}`;
    body = baseLocale === "uk"
      ? `Репутацію оновлено: ${formatted}`
      : `Reputation updated: ${formatted}`;
  }

  return {
    title: stripTrailingPeriod(title),
    body: stripTrailingPeriod(body),
    ctaLabel,
  };
};
