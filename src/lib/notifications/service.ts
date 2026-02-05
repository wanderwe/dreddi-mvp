import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLocale } from "@/lib/i18n/locales";
import { getNotificationCopy } from "@/lib/notifications/copy";
import {
  CRITICAL_NOTIFICATION_TYPES,
  CAP_BYPASS_NOTIFICATION_TYPES,
  DAILY_NOTIFICATION_CAP,
  isDailyCapExceeded,
  isPerDealCapExceeded,
  isWithinQuietHours,
} from "./policy";
import { normalizeNotificationType } from "./types";
import type {
  NotificationPriority,
  NotificationRole,
  NotificationSettings,
  NotificationType,
} from "./types";

export type NotificationRequest = {
  userId: string;
  promiseId: string;
  type: NotificationType;
  role?: NotificationRole;
  dedupeKey: string;
  ctaUrl: string;
  ctaLabel?: string | null;
  priority: NotificationPriority;
  title?: string;
  body?: string;
  followup?: "invite" | "completion24" | "completion72";
  delta?: number | null;
  requiresDeadlineReminder?: boolean;
};

export type NotificationOutcome = {
  created: boolean;
  skippedReason?: string;
};

const defaultSettings: NotificationSettings = {
  locale: "en",
  pushEnabled: true,
  deadlineRemindersEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "09:00",
};

const logNotificationSkip = (
  request: NotificationRequest,
  skippedReason: string,
  settings: NotificationSettings | null,
  extra?: { dbError?: string }
) => {
  console.info("[notifications] skipped", {
    userId: request.userId,
    promiseId: request.promiseId,
    type: normalizeNotificationType(request.type),
    dedupeKey: request.dedupeKey,
    role: request.role ?? null,
    requiresDeadlineReminder: request.requiresDeadlineReminder ?? false,
    quietHoursEnabled: settings?.quietHoursEnabled ?? null,
    deadlineRemindersEnabled: settings?.deadlineRemindersEnabled ?? null,
    skippedReason,
    dbError: extra?.dbError ?? null,
  });
};

const logQuietHoursDefer = (request: NotificationRequest, settings: NotificationSettings) => {
  console.info("[notifications] quiet_hours_defer", {
    userId: request.userId,
    promiseId: request.promiseId,
    type: normalizeNotificationType(request.type),
    dedupeKey: request.dedupeKey,
    role: request.role ?? null,
    requiresDeadlineReminder: request.requiresDeadlineReminder ?? false,
    quietHoursEnabled: settings.quietHoursEnabled,
    deadlineRemindersEnabled: settings.deadlineRemindersEnabled,
  });
};

export async function getUserNotificationSettings(
  admin: SupabaseClient,
  userId: string
): Promise<NotificationSettings> {
  const { data } = await admin
    .from("profiles")
    .select(
      "locale,push_notifications_enabled,deadline_reminders_enabled,quiet_hours_enabled,quiet_hours_start,quiet_hours_end"
    )
    .eq("id", userId)
    .maybeSingle();

  const locale = normalizeLocale(data?.locale) ?? defaultSettings.locale;

  return {
    locale,
    pushEnabled: data?.push_notifications_enabled ?? defaultSettings.pushEnabled,
    deadlineRemindersEnabled:
      data?.deadline_reminders_enabled ?? defaultSettings.deadlineRemindersEnabled,
    quietHoursEnabled: data?.quiet_hours_enabled ?? defaultSettings.quietHoursEnabled,
    quietHoursStart: data?.quiet_hours_start ?? defaultSettings.quietHoursStart,
    quietHoursEnd: data?.quiet_hours_end ?? defaultSettings.quietHoursEnd,
  };
}

async function countNotificationsSince(
  admin: SupabaseClient,
  userId: string,
  sinceIso: string
) {
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  return count ?? 0;
}

async function fetchLastDealNotificationTime(
  admin: SupabaseClient,
  userId: string,
  promiseId: string,
  type: NotificationType
) {
  const { data } = await admin
    .from("notifications")
    .select("created_at")
    .eq("user_id", userId)
    .eq("promise_id", promiseId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ? new Date(data.created_at) : null;
}

export async function createNotification(
  admin: SupabaseClient,
  request: NotificationRequest,
  now = new Date()
): Promise<NotificationOutcome> {
  const settings = await getUserNotificationSettings(admin, request.userId);

  const skip = (skippedReason: string, extra?: { dbError?: string }): NotificationOutcome => {
    logNotificationSkip(request, skippedReason, settings, extra);
    return { created: false, skippedReason };
  };

  const normalizedType = normalizeNotificationType(request.type);

  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", request.userId)
    .eq("dedupe_key", request.dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    return skip("dedupe");
  }

  if (request.requiresDeadlineReminder && !settings.deadlineRemindersEnabled) {
    return skip("deadline_reminders_disabled");
  }

  const lastDealNotification = await fetchLastDealNotificationTime(
    admin,
    request.userId,
    request.promiseId,
    normalizedType
  );

  if (isPerDealCapExceeded(lastDealNotification, now, request.type)) {
    return skip("per_deal_cap");
  }

  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const count = await countNotificationsSince(admin, request.userId, cutoff);

  if (isDailyCapExceeded(count, request.type)) {
    return skip("daily_cap");
  }

  const quietHours = isWithinQuietHours(now, {
    enabled: settings.quietHoursEnabled,
    start: settings.quietHoursStart,
    end: settings.quietHoursEnd,
  });

  const shouldSendPush =
    settings.pushEnabled &&
    (!quietHours || CRITICAL_NOTIFICATION_TYPES.includes(normalizedType));

  if (settings.pushEnabled && quietHours && !CRITICAL_NOTIFICATION_TYPES.includes(normalizedType)) {
    logQuietHoursDefer(request, settings);
  }

  const copy = getNotificationCopy({
    locale: settings.locale,
    type: normalizedType,
    role: request.role,
    followup: request.followup,
    delta: request.delta,
  });

  const { error } = await admin.from("notifications").insert({
    user_id: request.userId,
    promise_id: request.promiseId,
    type: normalizedType,
    title: request.title ?? copy.title ?? "",
    body: request.body ?? copy.body ?? "",
    cta_label: request.ctaLabel ?? copy.ctaLabel ?? null,
    cta_url: request.ctaUrl,
    priority: request.priority,
    delivered_at: shouldSendPush ? now.toISOString() : null,
    dedupe_key: request.dedupeKey,
  });

  if (error) {
    return skip("db_error", { dbError: error.message });
  }

  if (shouldSendPush) {
    await sendPush({
      userId: request.userId,
      type: normalizedType,
      ctaUrl: request.ctaUrl,
    });
  }

  return { created: true };
}

export async function sendPush(payload: {
  userId: string;
  type: NotificationType;
  ctaUrl: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications] push stub", payload);
  }
}

export const buildDedupeKey = (parts: Array<string | number>) => parts.join(":");

export const buildCtaUrl = (promiseId: string, path?: string) => {
  if (path) return path;
  return `/promises/${promiseId}`;
};

export const mapPriorityForType = (type: NotificationType): NotificationPriority => {
  switch (normalizeNotificationType(type)) {
    case "marked_completed":
    case "completion_waiting":
      return "critical";
    case "completion_followup":
    case "dispute":
    case "disputed":
      return "high";
    case "overdue":
    case "reminder_overdue":
      return "high";
    default:
      return "normal";
  }
};

export const shouldBypassDailyCap = (type: NotificationType) =>
  CAP_BYPASS_NOTIFICATION_TYPES.includes(normalizeNotificationType(type));

export const getDailyCap = () => DAILY_NOTIFICATION_CAP;
