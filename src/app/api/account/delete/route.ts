import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DeleteRequestBody = {
  locale?: "en" | "uk";
};

const ACTIVE_PROMISE_STATUSES = ["active", "completed_by_promisor"] as const;

const deletedDisplayNames: Record<"en" | "uk", string> = {
  en: "User deleted account",
  uk: "Користувач видалив акаунт",
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const user = await requireUser(req, cookieStore);
  if (user instanceof NextResponse) return user;

  const admin = supabaseAdmin();
  let body: DeleteRequestBody = {};
  try {
    body = (await req.json()) as DeleteRequestBody;
  } catch {
    body = {};
  }
  const locale = body.locale === "uk" ? "uk" : "en";

  const { count, error: activeError } = await admin
    .from("promises")
    .select("id", { count: "exact", head: true })
    .or(
      `creator_id.eq.${user.id},counterparty_id.eq.${user.id},promisor_id.eq.${user.id},promisee_id.eq.${user.id}`
    )
    .in("status", [...ACTIVE_PROMISE_STATUSES]);

  if (activeError) {
    return NextResponse.json(
      { error: "Failed to check active agreements", detail: activeError.message },
      { status: 500 }
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "active_agreements" }, { status: 409 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      email: null,
      display_name: deletedDisplayNames[locale],
      handle: null,
      avatar_url: null,
      profile_tags: [],
      is_public_profile: false,
      deleted_at: new Date().toISOString(),
      is_deleted: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json(
      { error: "Failed to anonymize profile", detail: profileError.message },
      { status: 500 }
    );
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    return NextResponse.json(
      { error: "Failed to delete auth user", detail: authDeleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
