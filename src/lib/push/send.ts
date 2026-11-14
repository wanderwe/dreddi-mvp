import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Web push to every device a person subscribed (public/sw.js shows it). Quiet by design: a failed
// push never fails the action that caused it, and a device that is gone is forgotten.

export type PushMessage = { title: string; body: string; url: string; tag?: string };

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

let configured: boolean | null = null;
const configure = () => {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(publicKey && privateKey);
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@dreddi.com", publicKey!, privateKey!);
  }
  return configured;
};

// The push service says the device no longer takes pushes: the app was removed or permission withdrawn.
export const isGone = (statusCode: number | undefined) => statusCode === 404 || statusCode === 410;

export async function sendPushToUser(admin: SupabaseClient, userId: string, message: PushMessage) {
  if (!configure()) return { sent: 0, removed: 0 };

  const { data } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .returns<SubscriptionRow[]>();
  if (!data?.length) return { sent: 0, removed: 0 };

  const payload = JSON.stringify(message);
  const delivered: string[] = [];
  const gone: string[] = [];
  await Promise.all(
    data.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          { TTL: 24 * 60 * 60, timeout: 8000 }
        );
        delivered.push(row.id);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (isGone(statusCode)) gone.push(row.id);
        else console.error("[push] send_failed", { userId, statusCode, error: error instanceof Error ? error.message : String(error) });
      }
    })
  );

  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  if (delivered.length) {
    await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).in("id", delivered);
  }
  return { sent: delivered.length, removed: gone.length };
}
