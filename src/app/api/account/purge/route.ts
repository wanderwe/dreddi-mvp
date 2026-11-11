import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { purgeDueAccounts } from "@/lib/account/deletion";

// Called once a day by pg_cron (account_purge). It only takes accounts whose 30 days are over,
// so an extra call does nothing harmful.
export const maxDuration = 120;

export async function POST() {
  try {
    const results = await purgeDueAccounts(supabaseAdmin());
    return NextResponse.json({
      purged: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (error) {
    console.error("[account] purge_run_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
