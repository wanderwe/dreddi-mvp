// Local testing of the bot: takes updates from Telegram by polling and hands each to the local server's
// webhook, the way Telegram will in production. Only while no webhook is set (setWebhook stops polling).
// Run: node scripts/telegram-poll.mjs   (local server on :3000, TELEGRAM_BOT_TOKEN in .env.local)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const line = readFileSync(".env.local", "utf8").split("\n").find((row) => row.startsWith("TELEGRAM_BOT_TOKEN="));
const token = line?.split("=")[1]?.replace(/"/g, "").trim();
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not in .env.local");
const secret = createHash("sha256").update(`dreddi-webhook:${token}`).digest("hex");
const local = process.env.LOCAL_URL ?? "http://localhost:3000";

let offset = 0;
console.log("polling…");
for (;;) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ offset, timeout: 30, allowed_updates: ["message", "callback_query", "my_chat_member"] }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  if (!data?.ok) {
    console.log("getUpdates:", data?.description ?? "network");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    continue;
  }
  for (const update of data.result) {
    offset = update.update_id + 1;
    const kind = Object.keys(update).find((key) => key !== "update_id");
    const forwarded = await fetch(`${local}/api/telegram/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
      body: JSON.stringify(update),
    }).catch((error) => ({ status: error.message }));
    console.log(update.update_id, kind, "→", forwarded.status);
  }
}
