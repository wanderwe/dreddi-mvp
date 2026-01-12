import { Suspense } from "react";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main className="relative mx-auto max-w-4xl px-6 py-12">
      <Suspense fallback={<div className="text-slate-300">Loading…</div>}>
        <NotificationsClient />
      </Suspense>
    </main>
  );
}
