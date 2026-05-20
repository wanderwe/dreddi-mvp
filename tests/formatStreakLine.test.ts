import test from "node:test";
import assert from "node:assert/strict";
import { formatStreakLine } from "../src/lib/formatStreakLine";

const cases = [0, 1, 2, 3, 4, 5, 11, 12, 14, 15, 21, 22, 25, 101, 111];

test("formatStreakLine returns correct Ukrainian forms", () => {
  const expected = new Map<number, string>([
    [0, "0 угод поспіль дотримані як виконавець"],
    [1, "1 угода поспіль дотримана як виконавець"],
    [2, "2 угоди поспіль дотримані як виконавець"],
    [3, "3 угоди поспіль дотримані як виконавець"],
    [4, "4 угоди поспіль дотримані як виконавець"],
    [5, "5 угод поспіль дотримані як виконавець"],
    [11, "11 угод поспіль дотримані як виконавець"],
    [12, "12 угод поспіль дотримані як виконавець"],
    [14, "14 угод поспіль дотримані як виконавець"],
    [15, "15 угод поспіль дотримані як виконавець"],
    [21, "21 угода поспіль дотримана як виконавець"],
    [22, "22 угоди поспіль дотримані як виконавець"],
    [25, "25 угод поспіль дотримані як виконавець"],
    [101, "101 угода поспіль дотримана як виконавець"],
    [111, "111 угод поспіль дотримані як виконавець"],
  ]);

  for (const count of cases) {
    assert.equal(formatStreakLine(count, "uk"), expected.get(count));
  }
});

test("formatStreakLine returns correct English forms", () => {
  const expected = new Map<number, string>([
    [0, "0 agreements fulfilled in a row as responsible side"],
    [1, "1 agreement fulfilled in a row as responsible side"],
    [2, "2 agreements fulfilled in a row as responsible side"],
    [3, "3 agreements fulfilled in a row as responsible side"],
    [4, "4 agreements fulfilled in a row as responsible side"],
    [5, "5 agreements fulfilled in a row as responsible side"],
    [11, "11 agreements fulfilled in a row as responsible side"],
    [12, "12 agreements fulfilled in a row as responsible side"],
    [14, "14 agreements fulfilled in a row as responsible side"],
    [15, "15 agreements fulfilled in a row as responsible side"],
    [21, "21 agreements fulfilled in a row as responsible side"],
    [22, "22 agreements fulfilled in a row as responsible side"],
    [25, "25 agreements fulfilled in a row as responsible side"],
    [101, "101 agreements fulfilled in a row as responsible side"],
    [111, "111 agreements fulfilled in a row as responsible side"],
  ]);

  for (const count of cases) {
    assert.equal(formatStreakLine(count, "en"), expected.get(count));
  }
});
