"use client";

import { supabaseOptional } from "@/lib/supabaseClient";

// Push notifications on this device, from the browser side: public/sw.js shows them,
// /api/push/subscribe tells the server where to send them.

export type PushState =
  | "unsupported" // this browser cannot do web push at all
  | "needs-install" // an iPhone: push only works once the site is added to the home screen
  | "denied" // the person blocked notifications for dreddi.com in the browser
  | "on" // this device gets pushes
  | "off"; // it could, but is not subscribed

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// The public key arrives base64url-encoded; the browser wants the raw bytes.
const keyBytes = (base64url: string) => {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = (await supabaseOptional?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
};

// Some browsers (seen on Android) never answer getRegistration/getSubscription: give up after a while
// instead of leaving the switch waiting forever.
const within = <T,>(promise: Promise<T>, ms = 3000) =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);

// Older browsers (some Samsung Internet versions) answer through a callback instead of a promise.
const askPermission = () =>
  new Promise<NotificationPermission>((resolve) => {
    const result = Notification.requestPermission((permission) => resolve(permission));
    if (result && typeof result.then === "function") void result.then(resolve);
  });

const registration = async () => {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
};

// What can be told without waiting on the browser; null: it can work, ask the service worker.
const quickState = (): PushState | null => {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isInstalled()) return "needs-install";
  if (!supported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return null;
};

export async function getPushState(): Promise<PushState> {
  const quick = quickState();
  if (quick) return quick;
  const reg = await within(navigator.serviceWorker.getRegistration("/"));
  const subscription = reg ? await within(reg.pushManager.getSubscription()) : undefined;
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

// Must run from a tap or click: browsers only show the permission prompt in answer to one.
export async function enablePush(): Promise<PushState> {
  // The permission prompt comes first: browsers show it only right after the tap, not after a wait.
  const quick = quickState();
  if (quick) return quick;

  const permission = await askPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await within(navigator.serviceWorker.ready, 8000);
  const subscription = await subscribeDevice(reg);
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok ? "on" : "off";
}

// subscribe() hands back the existing subscription when there is one, so there is no separate
// getSubscription() first: Samsung Internet leaves that one unanswered, which cost 3 seconds.
const subscribeDevice = (reg: ServiceWorkerRegistration) =>
  reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string),
  });

// Forget this device: on the server first (while still signed in), then in the browser.
export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const reg = await within(navigator.serviceWorker.getRegistration("/"));
  if (!reg) return;
  // Where getSubscription() goes unanswered, subscribe() still returns the one there is.
  const subscription =
    (await within(reg.pushManager.getSubscription(), 1500)) ??
    (Notification.permission === "granted" ? await within(subscribeDevice(reg)) : undefined);
  if (!subscription) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => null);
  await subscription.unsubscribe().catch(() => false);
}
