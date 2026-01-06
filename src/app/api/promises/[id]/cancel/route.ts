import { NextResponse } from "next/server";

import { evaluateCancelPermission } from "@/lib/promiseCancellation";

import { getAdminClient, loadPromiseForUser, requireUser } from "../common";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    console.info("[promise-cancel] request", {
      promiseId: id,
      status: promise.status,
      accepted: Boolean(promise.counterparty_id),
      userId: user.id,
    });

    const permission = evaluateCancelPermission(promise, user.id);
    if (!permission.ok) {
      console.warn("[promise-cancel] rejected", {
        promiseId: id,
        status: promise.status,
        accepted: Boolean(promise.counterparty_id),
        userId: user.id,
        reason: permission.code,
      });

      const status = permission.code === "FORBIDDEN_NOT_PROMISOR" ? 403 : 400;
      return NextResponse.json({ error: permission.message, code: permission.code }, { status });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("promises")
      .update({
        status: "active",
        completed_at: null,
        confirmed_at: null,
        disputed_at: null,
        disputed_code: null,
        dispute_reason: null,
      })
      .eq("id", id);

    if (error) {
      console.error("[promise-cancel] update_failed", {
        promiseId: id,
        error: error.message,
      });
      return NextResponse.json(
        { error: "Could not cancel promise", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: "active" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[promise-cancel] unexpected_error", { message });
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
