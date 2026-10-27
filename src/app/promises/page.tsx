import { Suspense } from "react";
import PromisesClient from "./PromisesClient";

export const dynamic = "force-dynamic";

export default function PromisesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-tone-300">Loading…</div>}>
      <PromisesClient />
    </Suspense>
  );
}
