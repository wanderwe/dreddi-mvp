import { createClient } from "@supabase/supabase-js";

const getArg = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const dealId = getArg("deal");
const receiverId = getArg("receiver");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

if (!dealId || !receiverId) {
  throw new Error("Usage: node scripts/diagnose-reminder.mjs --deal=<deal_id> --receiver=<user_id>");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date();
const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const dayBucket = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
const dedupeKeyPrefix = `reminder:${dealId}:reminder_manual:`;

const { data: profile } = await admin
  .from("profiles")
  .select("id,handle,email,email_notifications_enabled,deadline_reminders_enabled")
  .eq("id", receiverId)
  .maybeSingle();

const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(receiverId);

const { data: reminders } = await admin
  .from("deal_reminders")
  .select("id,deal_id,sender_id,receiver_id,created_at")
  .eq("deal_id", dealId)
  .eq("receiver_id", receiverId)
  .order("created_at", { ascending: false })
  .limit(10);

const { data: notifications } = await admin
  .from("notifications")
  .select("id,type,dedupe_key,created_at,last_email_attempt_at,last_email_attempt_status,last_email_attempt_error")
  .eq("promise_id", dealId)
  .eq("user_id", receiverId)
  .in("type", ["reminder_manual", "marked_completed"])
  .order("created_at", { ascending: false })
  .limit(10);

const { data: emailSends } = await admin
  .from("notification_email_sends")
  .select("id,event_id,type,status,provider,error_message,to_email,created_at,dedupe_key")
  .eq("user_id", receiverId)
  .eq("promise_id", dealId)
  .in("type", ["reminder_manual", "marked_completed"])
  .order("created_at", { ascending: false })
  .limit(20);

const possibleTodayDedupe = `${dedupeKeyPrefix}${dayBucket}`;
const matchingTodayNotification = (notifications || []).find((n) => n.dedupe_key === possibleTodayDedupe);
const matchingTodayEmailSend = (emailSends || []).find((row) => row.dedupe_key === possibleTodayDedupe);

const diagnosis = {
  inputs: { dealId, receiverId, since24h, dayBucket, possibleTodayDedupe },
  receiver: {
    id: receiverId,
    handle: profile?.handle ?? null,
    profileEmail: profile?.email ?? null,
    authEmail: authUser?.user?.email ?? null,
    authUserError: authUserError?.message ?? null,
    emailNotificationsEnabled: profile?.email_notifications_enabled ?? null,
    deadlineRemindersEnabled: profile?.deadline_reminders_enabled ?? null,
  },
  inLast24h: {
    remindersCount: (reminders || []).filter((r) => r.created_at >= since24h).length,
    notificationsCount: (notifications || []).filter((n) => n.created_at >= since24h).length,
    emailAttemptsCount: (emailSends || []).filter((e) => e.created_at >= since24h).length,
  },
  latest: {
    reminder: reminders?.[0] ?? null,
    notification: notifications?.[0] ?? null,
    emailAttempt: emailSends?.[0] ?? null,
  },
  todayKey: {
    notification: matchingTodayNotification ?? null,
    emailAttempt: matchingTodayEmailSend ?? null,
  },
  likelyReason:
    profile?.email_notifications_enabled === false
      ? "Recipient has email notifications disabled"
      : !authUser?.user?.email
      ? "Recipient has no auth email (cannot send email)"
      : matchingTodayNotification && !matchingTodayEmailSend
      ? "Notification exists but no email send log for this dedupe key (investigate worker/runtime errors)"
      : matchingTodayEmailSend?.status === "failed"
      ? `Provider failed: ${matchingTodayEmailSend.error_message || "unknown"}`
      : matchingTodayEmailSend?.status === "disabled"
      ? "Email attempt skipped as disabled"
      : matchingTodayEmailSend?.status === "provider_not_configured"
      ? "Email provider not configured"
      : "No direct failure marker found; inspect app logs for reminder route + email provider",
};

console.log(JSON.stringify(diagnosis, null, 2));
