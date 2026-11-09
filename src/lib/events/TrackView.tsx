"use client";

import { useEffect } from "react";
import { track } from "./client";
import type { EventName } from "./names";

// Logs one event when a page opens, for server-rendered pages.
export function TrackView({ name, refId }: { name: EventName; refId: string }) {
  useEffect(() => track(name, refId), [name, refId]);
  return null;
}
