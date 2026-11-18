import { NextResponse } from "next/server";
import { closeDueChats } from "@/lib/chatDisputes/server";
import { clearStalePrompts, refreshStaleCounters } from "@/lib/telegram/disputes";

// Every minute (pg_cron in Supabase): closes the chat disputes whose time is up, brings Telegram
// counters up to date and deletes the bot's unanswered questions. It only does what is already due, so anyone may call it.
export const maxDuration = 60;

async function tick() {
  const closed = await closeDueChats();
  if (process.env.TELEGRAM_BOT_TOKEN) {
    await refreshStaleCounters();
    await clearStalePrompts();
  }
  return NextResponse.json({ closed });
}

export const POST = tick;
export const GET = tick;
