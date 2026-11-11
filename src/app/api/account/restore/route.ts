import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/requireUser";
import { restoreAccount } from "@/lib/account/deletion";

export async function POST(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  try {
    const result = await restoreAccount(supabaseAdmin(), user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[account] restore_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to restore account" }, { status: 500 });
  }
}
