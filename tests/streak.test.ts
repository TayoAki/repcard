import assert from "node:assert/strict";
import test from "node:test";

import { summarizeStreak } from "../src/lib/streak";

const d = (s: string) => new Date(`${s}T10:00:00`);
const now = new Date("2026-08-23T18:00:00");

test("empty history has no streak", () => {
  assert.equal(summarizeStreak([], now).current, 0);
});
test("training today starts a streak", () => {
  assert.equal(summarizeStreak([d("2026-08-23")], now).current, 1);
});
test("3-day run including today", () => {
  assert.equal(
    summarizeStreak([d("2026-08-21"), d("2026-08-22"), d("2026-08-23")], now).current,
    3,
  );
});
test("an untrained today does not break yesterday's run", () => {
  assert.equal(summarizeStreak([d("2026-08-21"), d("2026-08-22")], now).current, 2);
});
test("a gap breaks the run", () => {
  assert.equal(
    summarizeStreak([d("2026-08-19"), d("2026-08-22"), d("2026-08-23")], now).current,
    2,
  );
});
test("best streak spans history", () => {
  assert.equal(
    summarizeStreak(
      [d("2026-08-01"), d("2026-08-02"), d("2026-08-03"), d("2026-08-04"), d("2026-08-22")],
      now,
    ).best,
    4,
  );
});
test("same-day duplicates collapse", () => {
  assert.equal(summarizeStreak([d("2026-08-23"), d("2026-08-23")], now).current, 1);
});
test("month boundaries chain", () => {
  assert.equal(
    summarizeStreak([d("2026-07-31"), d("2026-08-01")], new Date("2026-08-01T20:00:00")).current,
    2,
  );
});
