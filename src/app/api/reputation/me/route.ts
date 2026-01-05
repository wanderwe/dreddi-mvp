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

    const { data: deliveries, error: deliveriesErr } = await admin
      .from("promises")
      .select("id,title,status,due_at,confirmed_at,disputed_at,created_at")
      .eq("promisor_id", user.id)
      .in("status", ["confirmed", "disputed"])
      .order("confirmed_at", { ascending: false, nullsLast: true })
      .order("disputed_at", { ascending: false, nullsLast: true });

    if (deliveriesErr) {
      return NextResponse.json({ error: "Failed to load delivery metrics", detail: deliveriesErr.message }, { status: 500 });
    }

    const confirmedDeliveries = (deliveries ?? []).filter((p) => p.status === "confirmed");
    const disputedDeliveries = (deliveries ?? []).filter((p) => p.status === "disputed");

    const onTimeDeliveries = confirmedDeliveries.filter((p) => {
      if (!p.due_at || !p.confirmed_at) return false;
      const confirmedAt = new Date(p.confirmed_at);
      const dueAt = new Date(p.due_at);
      return confirmedAt.getTime() <= dueAt.getTime();
    });

    const recentEvents = (deliveries ?? [])
      .map((p) => {
        const timestamp = p.status === "confirmed" ? p.confirmed_at : p.disputed_at ?? p.created_at;
        const delta = p.status === "confirmed" ? (onTimeDeliveries.includes(p) ? 4 : 3) : -6;

        return {
          id: p.id,
          kind: `promise_${p.status}`,
          delta,
          created_at: timestamp ?? p.created_at ?? new Date().toISOString(),
          meta: { due_at: p.due_at, confirmed_at: p.confirmed_at, disputed_at: p.disputed_at },
          promise: { title: p.title },
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return NextResponse.json({
      reputation: {
        user_id: user.id,
        score: reputation?.score ?? 50,
        confirmed_count: confirmedDeliveries.length,
        disputed_count: disputedDeliveries.length,
        on_time_count: onTimeDeliveries.length,
        total_promises_completed: (deliveries ?? []).length,
        updated_at: reputation?.updated_at ?? new Date().toISOString(),
      },
      recent_events: recentEvents,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
