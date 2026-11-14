"use client";

import { useEffect } from "react";

// Registers public/sw.js, which only shows push notifications (no page caching). Production only: in
// development a service worker would outlive code changes and confuse reloads.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
  }, []);
  return null;
}
