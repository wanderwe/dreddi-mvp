import { Suspense } from "react";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<div className="text-slate-300">Loading…</div>}>
        <NotificationsClient />
      </Suspense>
    </main>
  );
}
