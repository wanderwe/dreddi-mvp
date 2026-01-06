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
      .select("status,due_at,confirmed_at,completed_at")
      .eq("promisor_id", user.id)
      .in("status", ["confirmed", "disputed"]);

    if (deliveriesErr) {
      return NextResponse.json({ error: "Failed to load deliveries", detail: deliveriesErr.message }, { status: 500 });
    }

    const confirmedDeliveries = (deliveries ?? []).filter((row) => row.status === "confirmed");
    const disputedDeliveries = (deliveries ?? []).filter((row) => row.status === "disputed");

    const onTimeDeliveries = confirmedDeliveries.filter((row) => {
      if (!row.due_at) return false;
      const deadline = new Date(row.due_at).getTime();
      const completion = row.confirmed_at ?? row.completed_at;
      if (!completion) return false;
      return new Date(completion).getTime() <= deadline;
    });

    const deliveryMetrics = {
      confirmed: confirmedDeliveries.length,
      disputed: disputedDeliveries.length,
      onTime: onTimeDeliveries.length,
      totalCompleted: confirmedDeliveries.length + disputedDeliveries.length,
    };

    const { data: events, error: eventsErr } = await admin
      .from("reputation_events")
      .select("id,kind,delta,meta,created_at,promise:promise_id(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (eventsErr) {
      return NextResponse.json({ error: "Failed to load events", detail: eventsErr.message }, { status: 500 });
    }

    const baseReputation =
      reputation ?? {
        user_id: user.id,
        score: 50,
        confirmed_count: 0,
        disputed_count: 0,
        on_time_count: 0,
        total_promises_completed: 0,
        updated_at: new Date().toISOString(),
      };

    return NextResponse.json({
      reputation: {
        ...baseReputation,
        confirmed_count: deliveryMetrics.confirmed,
        disputed_count: deliveryMetrics.disputed,
        on_time_count: deliveryMetrics.onTime,
        total_promises_completed: deliveryMetrics.totalCompleted,
      },
      recent_events: events ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
