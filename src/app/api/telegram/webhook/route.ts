import { after, NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { webhookSecret, type TgUpdate } from "@/lib/telegram/api";
import { handleUpdate } from "@/lib/telegram/disputes";

// Telegram calls this for every update the bot gets. It answers at once and does the work after, so a
// verdict that takes 20 seconds never makes Telegram send the update again.
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN || req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new NextResponse(null, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update || typeof update.update_id !== "number") return new NextResponse(null, { status: 400 });

  // Each update once: Telegram may send it again.
  const { error } = await getAdminClient().from("telegram_updates").insert({ update_id: update.update_id });
  if (error) return new NextResponse(null, { status: 200 });

  after(async () => {
    try {
      await handleUpdate(update);
    } catch (err) {
      console.error("telegram update:", update.update_id, err instanceof Error ? err.message : err);
    }
  });
  return new NextResponse(null, { status: 200 });
}
