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

test("earns 1 freeze per 7 trained days, capped at 2", () => {
  const many = Array.from({ length: 21 }, (_, i) => d(`2026-08-${String(3 + i).padStart(2, "0")}`));
  assert.equal(summarizeStreak(many, new Date("2026-08-23T18:00:00")).freezesEarned, 2);
});
test("a freeze bridges a single missed day", () => {
  // 8 straight trained days (earns 1 freeze), a gap, then today.
  const dates = [
    ...Array.from({ length: 8 }, (_, i) => d(`2026-08-${String(14 + i).padStart(2, "0")}`)), // 14..21
    d("2026-08-23"), // gap on the 22nd
  ];
  const r = summarizeStreak(dates, new Date("2026-08-23T18:00:00"));
  assert.equal(r.freezesEarned, 1);
  assert.equal(r.current, 9); // 23 + freeze over 22 + 21..14
  assert.equal(r.freezesUsed, 1);
});
test("no freeze earned means a gap still breaks", () => {
  const r = summarizeStreak([d("2026-08-20"), d("2026-08-23")], new Date("2026-08-23T18:00:00"));
  assert.equal(r.freezesEarned, 0);
  assert.equal(r.current, 1);
});
test("best is never less than current", () => {
  const dates = [
    ...Array.from({ length: 8 }, (_, i) => d(`2026-08-${String(14 + i).padStart(2, "0")}`)),
    d("2026-08-23"),
  ];
  const r = summarizeStreak(dates, new Date("2026-08-23T18:00:00"));
  assert.ok(r.best >= r.current);
});
