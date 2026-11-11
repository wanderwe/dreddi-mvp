import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/requireUser";
import { countActiveSharedDeals, requestAccountDeletion } from "@/lib/account/deletion";
import { sendAccountDeletionEmail } from "@/lib/account/deletionEmail";

// GET: what the confirmation dialog shows. POST: starts the 30-day grace period.
export async function GET(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  try {
    const activeSharedDeals = await countActiveSharedDeals(supabaseAdmin(), user.id);
    return NextResponse.json({ activeSharedDeals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  const body = (await req.json().catch(() => null)) as { locale?: string } | null;
  const admin = supabaseAdmin();

  try {
    const { deletesAt, alreadyRequested } = await requestAccountDeletion(admin, user.id);
    if (!alreadyRequested) {
      await sendAccountDeletionEmail(admin, user.id, deletesAt, body?.locale ?? "en");
    }
    return NextResponse.json({ deletesAt: deletesAt.toISOString() });
  } catch (error) {
    console.error("[account] delete_request_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
