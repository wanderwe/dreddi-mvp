import { NextResponse } from "next/server";
import { getAdminClient, requireUser } from "../../promises/[id]/common";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const admin = getAdminClient();

    const { data: reputation, error: repErr } = await admin
      .from("user_reputation")
      .select("user_id,score,confirmed_count,disputed_count,on_time_count,total_promises_completed,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (repErr) {
      return NextResponse.json({ error: "Failed to load reputation", detail: repErr.message }, { status: 500 });
    }

    const { data: events, error: eventsErr } = await admin
      .from("reputation_events")
      .select("id,kind,delta,meta,created_at,promise:promise_id(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (eventsErr) {
      return NextResponse.json({ error: "Failed to load events", detail: eventsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      reputation: reputation ?? {
        user_id: user.id,
        score: 50,
        confirmed_count: 0,
        disputed_count: 0,
        on_time_count: 0,
        total_promises_completed: 0,
        updated_at: new Date().toISOString(),
      },
      recent_events: events ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
