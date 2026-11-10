import assert from "node:assert/strict";
import test from "node:test";

import { disputeMessage, draftMessage, verdictText, type TgDispute } from "../src/lib/telegram/render";
import { closeTime, langFor, langOf } from "../src/lib/telegram/texts";

const dispute = (patch: Partial<TgDispute> = {}): TgDispute => ({
  id: "d1",
  created_at: "2026-11-11T10:00:00.000Z",
  lang: "uk",
  question: "Хто платить штраф <з камери>?",
  position_1: "Водій",
  position_2: "Власник",
  status: "open",
  token: "tok_tok_tok_tok_tok1",
  closes_at: "2026-11-11T11:00:00.000Z",
  closed_at: null,
  creator_user_id: null,
  creator_secret_hash: "creator",
  verdict: null,
  decided_at: null,
  source: "telegram",
  tg_chat_id: -100,
  tg_message_id: 5,
  tg_creator_name: "Ігор",
  tg_shown_count: 0,
  ...patch,
});

test("Ukrainian and Russian Telegram get Ukrainian, everyone else English", () => {
  assert.equal(langOf("uk"), "uk");
  assert.equal(langOf("ru-RU"), "uk");
  assert.equal(langOf("en"), "en");
  assert.equal(langOf(undefined), "en");
  // Telegram in English, the argument in Ukrainian: Ukrainian.
  assert.equal(langFor("я кажу, що помідор це фрукт", "en"), "uk");
  assert.equal(langFor("pineapple on pizza", "uk"), "uk");
  assert.equal(langFor("pineapple on pizza", "en"), "en");
});

test("closing time reads in Kyiv time, with the date only on another day", () => {
  const now = new Date("2026-11-11T10:00:00.000Z");
  assert.equal(closeTime("2026-11-11T11:00:00.000Z", "uk", now), "о 13:00");
  assert.match(closeTime("2026-11-12T10:00:00.000Z", "uk", now), /^12 лист\.? о 12:00$/);
});

test("the draft asks the author when to close; the dispute escapes what people wrote", () => {
  const draft = draftMessage(dispute({ status: "draft", closes_at: null }));
  assert.match(draft.text, /Коли закрити суперечку\?/);
  assert.match(draft.text, /Обирає Ігор/);
  assert.match(draft.text, /&lt;з камери&gt;/);
  assert.deepEqual(
    draft.reply_markup.inline_keyboard.flat().map((button) => button.callback_data),
    ["d:tok_tok_tok_tok_tok1:hour", "d:tok_tok_tok_tok_tok1:day", "d:tok_tok_tok_tok_tok1:manual", "d:tok_tok_tok_tok_tok1:cancel"]
  );

  const open = disputeMessage(dispute(), 2, "open");
  assert.match(open.text, /Стали на бік: 2 · закриття/);
  assert.equal(open.reply_markup.inline_keyboard.length, 3);
  // Cancel until three people are in, then close.
  assert.equal(open.reply_markup.inline_keyboard[2][0].text, "Скасувати");
  assert.equal(disputeMessage(dispute(), 3, "open").reply_markup.inline_keyboard[2][0].text, "Закрити");
  assert.match(disputeMessage(dispute({ closes_at: null }), 0, "open").text, /закриє Ігор/);
  assert.equal(disputeMessage(dispute(), 4, "closed").reply_markup.inline_keyboard.length, 0);
});

test("the verdict says whether the majority was right and quotes the winner's strongest argument", () => {
  const sides = [
    { id: "a", position: 1 as const, argument: "Бо він керував", nickname: "Петя" },
    { id: "b", position: 1 as const, argument: null, nickname: "Оля" },
    { id: "c", position: 2 as const, argument: "Власник отримує лист", nickname: "Вася" },
  ];
  const text = verdictText(
    dispute({
      status: "decided",
      verdict: {
        question_type: "convention",
        winner: "2",
        short_answer: "Платить власник",
        explanation: "Штраф з камери надходить власнику.",
        nuance: null,
        sources: [],
        best_argument_1: "a",
        best_argument_2: "c",
        share_text: "",
        injection_attempt: false,
      },
    }) as never,
    sides,
    "https://dreddi.com"
  );
  assert.match(text, /<b>Праві ті, хто за «Власник»<\/b>/);
  assert.match(text, /Більшість помиляється: 67% були за «Водій»/);
  assert.match(text, /Найсильніший аргумент: «Власник отримує лист», Вася/);
  assert.match(text, /href="https:\/\/dreddi\.com\/(ua\/)?decide\/c\/tok_tok_tok_tok_tok1"/);
});
