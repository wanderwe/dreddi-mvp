"use client";

import type { EventName } from "./names";

const VISITOR_KEY = "dreddi_vid";

// A random id kept in this browser so that one person opening a card five times counts once.
function visitorId() {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Fire and forget: a lost event never gets in the way of the page.
export function track(name: EventName, ref: string) {
  try {
    const body = JSON.stringify({ name, ref, visitor: visitorId() });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
      () => undefined
    );
  } catch {
    // Nothing to do.
  }
}
