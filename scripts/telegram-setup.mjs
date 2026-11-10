// The bot's profile in Telegram: name, descriptions and commands in Ukrainian and English, and, with
// --webhook, where Telegram sends updates (production). Safe to run again.
// Run: node scripts/telegram-setup.mjs [--webhook]   (needs TELEGRAM_BOT_TOKEN in .env.local)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]])
);
const token = env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not in .env.local");
const site = process.env.SITE_URL ?? "https://www.dreddi.com";

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(method, body.language_code ?? "", data.ok ? "ok" : data.description);
}

const profile = {
  "": {
    name: "Dreddi",
    short: "I settle arguments in group chats. Add me to a group and type /dreddi with what it's about.",
    description: "Hi, I'm Dreddi. Add me to a group, and when an argument starts there, type /dreddi and what it's about. Everyone takes a side, and I say who is right.",
    commands: [
      { command: "dreddi", description: "Settle an argument" },
    ],
  },
  uk: {
    name: "Dreddi",
    short: "Розсуджу суперечку в чаті. Додайте мене в групу й напишіть /dreddi і в чому суперечка.",
    description: "Привіт, я Дредді. Додайте мене в групу, і коли там почнеться суперечка, напишіть /dreddi і в чому вона. Всі стануть на бік, а я скажу, хто правий.",
    commands: [
      { command: "dreddi", description: "Розсудити суперечку" },
    ],
  },
};

for (const [lang, p] of Object.entries(profile)) {
  const language = lang ? { language_code: lang } : {};
  await call("setMyName", { name: p.name, ...language });
  await call("setMyShortDescription", { short_description: p.short, ...language });
  await call("setMyDescription", { description: p.description, ...language });
  await call("setMyCommands", { commands: p.commands, ...language });
}

if (process.argv.includes("--webhook")) {
  await call("setWebhook", {
    url: `${site}/api/telegram/webhook`,
    secret_token: createHash("sha256").update(`dreddi-webhook:${token}`).digest("hex"),
    allowed_updates: ["message", "callback_query", "my_chat_member"],
    drop_pending_updates: true,
  });
}
