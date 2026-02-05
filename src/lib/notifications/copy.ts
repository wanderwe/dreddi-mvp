import {
  NotificationCopy,
  NotificationLocale,
  NotificationRole,
  NotificationType,
  normalizeNotificationType,
} from "./types";
import { stripTrailingPeriod } from "@/lib/text";

const fallbackLocale: NotificationLocale = "en";

const copyByLocale: Record<NotificationLocale, Record<NotificationType, NotificationCopy>> = {
  en: {
    accepted: {
      title: "Agreement accepted",
      body: "Why now: the other party accepted the agreement.",
      ctaLabel: "Open",
    },
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
    invite_declined: {
      title: "Invite declined",
      body: "The invite was declined. No action needed.",
      ctaLabel: "",
    },
    invite_ignored: {
      title: "Invite awaiting response",
      body: "The invite still has no response. No action needed.",
      ctaLabel: "",
    },
    due_soon: {
      title: "Deadline approaching",
      body: "Why now: the due date is within 24 hours. Check the agreement details and plan completion.",
      ctaLabel: "View",
    },
    overdue: {
      title: "Agreement is overdue",
      body: "Why now: the due date has passed. Review the agreement and mark it completed if it’s done.",
      ctaLabel: "Open",
    },
    marked_completed: {
      title: "Action needed",
      body: "Agreement marked completed. Confirm or dispute.",
      ctaLabel: "Review",
    },
    confirmed: {
      title: "Outcome confirmed",
      body: "Why now: the other party confirmed completion. Review the outcome details.",
      ctaLabel: "View",
    },
    disputed: {
      title: "Outcome disputed",
      body: "The agreement was disputed. Check details.",
      ctaLabel: "View",
    },
    reminder_due_24h: {
      title: "Deadline approaching",
      body: "Why now: the due date is within 24 hours. Check the agreement details and plan completion.",
      ctaLabel: "View",
    },
    reminder_overdue: {
      title: "Agreement is overdue",
      body: "Why now: the due date has passed. Review the agreement and mark it completed if it’s done.",
      ctaLabel: "Open",
    },
    completion_waiting: {
      title: "Action needed",
      body: "Agreement marked completed. Confirm or dispute.",
      ctaLabel: "Review",
    },
    completion_followup: {
      title: "Outcome confirmed",
      body: "Why now: the other party confirmed completion. Review the outcome details.",
      ctaLabel: "View",
    },
    dispute: {
      title: "Outcome disputed",
      body: "The agreement was disputed. Check details.",
      ctaLabel: "View",
    },
  },
  uk: {
    accepted: {
      title: "Домовленість прийнято",
      body: "Причина: інша сторона прийняла домовленість.",
      ctaLabel: "Відкрити",
    },
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
    invite_declined: {
      title: "Запрошення відхилено",
      body: "Запрошення було відхилено. Дій не потрібно.",
      ctaLabel: "",
    },
    invite_ignored: {
      title: "Запрошення без відповіді",
      body: "Запрошення досі без відповіді. Дій не потрібно.",
      ctaLabel: "",
    },
    due_soon: {
      title: "Наближається дедлайн",
      body: "Причина: дедлайн уже в межах 24 годин. Перегляньте деталі угоди та сплануйте завершення.",
      ctaLabel: "Переглянути",
    },
    overdue: {
      title: "Дедлайн минув",
      body: "Причина: термін минув. Перегляньте угоду та позначте виконаною, якщо все завершено.",
      ctaLabel: "Відкрити",
    },
    marked_completed: {
      title: "Потрібна дія",
      body: "Домовленість позначено виконаною. Підтвердіть або оскаржте.",
      ctaLabel: "Перевірити",
    },
    confirmed: {
      title: "Результат підтверджено",
      body: "Причина: інша сторона підтвердила виконання. Перегляньте деталі результату.",
      ctaLabel: "Переглянути",
    },
    disputed: {
      title: "Результат оскаржено",
      body: "Домовленість оскаржено. Перевірте деталі.",
      ctaLabel: "Переглянути",
    },
    reminder_due_24h: {
      title: "Наближається дедлайн",
      body: "Причина: дедлайн уже в межах 24 годин. Перегляньте деталі угоди та сплануйте завершення.",
      ctaLabel: "Переглянути",
    },
    reminder_overdue: {
      title: "Дедлайн минув",
      body: "Причина: термін минув. Перегляньте угоду та позначте виконаною, якщо все завершено.",
      ctaLabel: "Відкрити",
    },
    completion_waiting: {
      title: "Потрібна дія",
      body: "Домовленість позначено виконаною. Підтвердіть або оскаржте.",
      ctaLabel: "Перевірити",
    },
    completion_followup: {
      title: "Результат підтверджено",
      body: "Причина: інша сторона підтвердила виконання. Перегляньте деталі результату.",
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
  type: NotificationType;
  role?: NotificationRole;
  followup?: "invite" | "completion24" | "completion72";
  delta?: number | null;
};

export const getNotificationCopy = ({
  locale,
  type,
  role,
  followup,
  delta,
}: NotificationCopyOptions) => {
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
