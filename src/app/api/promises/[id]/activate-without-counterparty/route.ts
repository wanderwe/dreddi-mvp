import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    if (promise.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can activate without counterparty" }, { status: 403 });
    }

    if (promise.status !== "active") {
      return NextResponse.json({ error: "Deal is not active" }, { status: 400 });
    }

    if (promise.invite_status !== "awaiting_acceptance") {
      return NextResponse.json({ error: "Deal is not awaiting counterparty acceptance" }, { status: 400 });
    }

    if (promise.activated_without_counterparty) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const admin = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await admin
      .from("promises")
      .update({
        invite_status: "accepted",
        activated_without_counterparty: true,
        activated_without_counterparty_at: now,
      })
      .eq("id", id)
      .eq("invite_status", "awaiting_acceptance");

    if (error) {
      return NextResponse.json({ error: "Could not activate deal", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
