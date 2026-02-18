import test from "node:test";
import assert from "node:assert/strict";
import { formatStreakLine } from "../src/lib/formatStreakLine";

const cases = [0, 1, 2, 3, 4, 5, 11, 12, 14, 15, 21, 22, 25, 101, 111];

test("formatStreakLine returns correct Ukrainian forms", () => {
  const expected = new Map<number, string>([
    [0, "0 угод поспіль підтверджені без спорів"],
    [1, "1 угода поспіль підтверджена без спорів"],
    [2, "2 угоди поспіль підтверджені без спорів"],
    [3, "3 угоди поспіль підтверджені без спорів"],
    [4, "4 угоди поспіль підтверджені без спорів"],
    [5, "5 угод поспіль підтверджені без спорів"],
    [11, "11 угод поспіль підтверджені без спорів"],
    [12, "12 угод поспіль підтверджені без спорів"],
    [14, "14 угод поспіль підтверджені без спорів"],
    [15, "15 угод поспіль підтверджені без спорів"],
    [21, "21 угода поспіль підтверджена без спорів"],
    [22, "22 угоди поспіль підтверджені без спорів"],
    [25, "25 угод поспіль підтверджені без спорів"],
    [101, "101 угода поспіль підтверджена без спорів"],
    [111, "111 угод поспіль підтверджені без спорів"],
  ]);

  for (const count of cases) {
    assert.equal(formatStreakLine(count, "uk"), expected.get(count));
  }
});

test("formatStreakLine returns correct English forms", () => {
  const expected = new Map<number, string>([
    [0, "0 deals in a row confirmed without disputes"],
    [1, "1 deal in a row confirmed without disputes"],
    [2, "2 deals in a row confirmed without disputes"],
    [3, "3 deals in a row confirmed without disputes"],
    [4, "4 deals in a row confirmed without disputes"],
    [5, "5 deals in a row confirmed without disputes"],
    [11, "11 deals in a row confirmed without disputes"],
    [12, "12 deals in a row confirmed without disputes"],
    [14, "14 deals in a row confirmed without disputes"],
    [15, "15 deals in a row confirmed without disputes"],
    [21, "21 deals in a row confirmed without disputes"],
    [22, "22 deals in a row confirmed without disputes"],
    [25, "25 deals in a row confirmed without disputes"],
    [101, "101 deals in a row confirmed without disputes"],
    [111, "111 deals in a row confirmed without disputes"],
  ]);

  for (const count of cases) {
    assert.equal(formatStreakLine(count, "en"), expected.get(count));
  }
});
