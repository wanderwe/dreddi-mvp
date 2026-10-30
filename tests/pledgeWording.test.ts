import assert from "node:assert/strict";
import test from "node:test";

import { toPledgeWording } from "../src/lib/pledgeWording";

test("swaps agreement wording in Ukrainian with matching cases", () => {
  assert.equal(toPledgeWording("Угода тепер активна."), "Обіцянка тепер активна.");
  assert.equal(toPledgeWording("Дедлайн угоди досягнуто"), "Дедлайн обіцянки досягнуто");
  assert.equal(toPledgeWording("Перегляньте угоду"), "Перегляньте обіцянку");
  assert.equal(toPledgeWording("5 угод поспіль"), "5 обіцянок поспіль");
  assert.equal(toPledgeWording("Домовленість прийнято"), "Обіцянку прийнято");
  assert.equal(toPledgeWording("Запрошення до домовленості"), "Запрошення до обіцянки");
  assert.equal(toPledgeWording("Домовленість прострочена"), "Обіцянка прострочена");
});

test("swaps agreement wording in English and fixes the article", () => {
  assert.equal(toPledgeWording("You’ve been invited to an agreement."), "You’ve been invited to a promise.");
  assert.equal(toPledgeWording("Agreement accepted"), "Promise accepted");
  assert.equal(toPledgeWording("3 deals"), "3 promises");
});

test("leaves unrelated words alone", () => {
  assert.equal(toPledgeWording("Погодьтеся, що вигоди є"), "Погодьтеся, що вигоди є");
  assert.equal(toPledgeWording("We dealt with it"), "We dealt with it");
});
