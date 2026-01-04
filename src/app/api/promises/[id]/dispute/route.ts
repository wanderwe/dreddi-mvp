import { NextResponse } from "next/server";
import {
  DISPUTE_CODES,
  DisputeCode,
  getAdminClient,
  loadPromiseForUser,
  requireUser,
} from "../common";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const body = await req.json().catch(() => null);
    const code = body?.code as DisputeCode | undefined;
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    if (!code || !DISPUTE_CODES.includes(code)) {
      return NextResponse.json({ error: "Invalid dispute code" }, { status: 400 });
    }

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.counterparty_id !== user.id) {
      return NextResponse.json({ error: "Only the counterparty can dispute" }, { status: 403 });
    }

    if (promise.status !== "completed_by_promisor") {
      return NextResponse.json({ error: "Promise is not awaiting confirmation" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("promises")
      .update({
        status: "disputed",
        disputed_at: new Date().toISOString(),
        disputed_code: code,
        dispute_reason: reason ?? null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Could not update promise", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
