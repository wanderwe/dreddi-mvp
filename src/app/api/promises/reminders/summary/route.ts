import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "@/app/api/promises/[id]/common";

type Summary = {
  count: number;
  lastSentAt: string | null;
};

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const url = new URL(req.url);
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ reminders: {} as Record<string, Summary> });
    }

    const admin = getAdminClient();

    const { data: visiblePromises, error: promisesError } = await admin
      .from("promises")
      .select("id")
      .in("id", ids)
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`);

    if (promisesError) {
      return NextResponse.json(
        { error: "Could not validate promise access", detail: promisesError.message },
        { status: 500 }
      );
    }

    const allowedIds = (visiblePromises ?? []).map((row) => row.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ reminders: {} as Record<string, Summary> });
    }

    const { data: rows, error } = await admin
      .from("deal_reminders")
      .select("deal_id,created_at")
      .in("deal_id", allowedIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Could not fetch reminders", detail: error.message },
        { status: 500 }
      );
    }

    const reminders = allowedIds.reduce<Record<string, Summary>>((acc, dealId) => {
      acc[dealId] = { count: 0, lastSentAt: null };
      return acc;
    }, {});

    for (const row of rows ?? []) {
      const current = reminders[row.deal_id];
      if (!current) continue;
      current.count += 1;
      if (!current.lastSentAt || new Date(row.created_at).getTime() > new Date(current.lastSentAt).getTime()) {
        current.lastSentAt = row.created_at;
      }
    }

    return NextResponse.json({ reminders });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}
