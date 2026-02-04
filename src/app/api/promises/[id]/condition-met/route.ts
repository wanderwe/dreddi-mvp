import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { getAdminClient, loadPromiseForUser } from "../common";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const counterpartyId = resolveCounterpartyId(promise);
    const executorId = resolveExecutorId(promise);
    if (!executorId || !counterpartyId) {
      console.warn("[promises] missing participant id for condition met", {
        promiseId: id,
        executorId,
        counterpartyId,
        userId: user.id,
      });
    }
    if (!counterpartyId || counterpartyId !== user.id || executorId === user.id) {
      return NextResponse.json(
        { error: "Only the other side can mark the condition" },
        { status: 403 }
      );
    }

    if (!promise.condition_text) {
      return NextResponse.json({ error: "No counter-condition exists" }, { status: 400 });
    }

    if (promise.condition_met_at) {
      return NextResponse.json({ error: "Condition is already met" }, { status: 409 });
    }

    const admin = getAdminClient();
    const conditionMetAt = new Date().toISOString();

    const { error } = await admin
      .from("promises")
      .update({
        condition_met_at: conditionMetAt,
        condition_met_by: user.id,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Could not update condition", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
