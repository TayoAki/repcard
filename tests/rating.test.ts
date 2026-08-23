import assert from "node:assert/strict";
import test from "node:test";

import { computeRating } from "../src/lib/rating";

test("floor is 40", () => {
  const r = computeRating({ goal: "maintain", sessionsLast28: 0, currentStreak: 0, volumeLast14: 0, volumePrev14: 0, muscleGroups28: 0, prCount30: 0 });
  assert.equal(r.overall, 40);
});
test("ceiling is 99", () => {
  const r = computeRating({ goal: "maintain", sessionsLast28: 16, currentStreak: 20, volumeLast14: 20000, volumePrev14: 10000, muscleGroups28: 10, prCount30: 6 });
  assert.equal(r.overall, 99);
});
test("a mid athlete lands mid-band", () => {
  const r = computeRating({ goal: "build-muscle", sessionsLast28: 8, currentStreak: 3, volumeLast14: 5000, volumePrev14: 5200, muscleGroups28: 5, prCount30: 1 });
  assert.ok(r.overall > 55 && r.overall < 80, String(r.overall));
});
test("fresh athletes get the volume baseline, not zero", () => {
  const r = computeRating({ goal: "build-muscle", sessionsLast28: 4, currentStreak: 2, volumeLast14: 3000, volumePrev14: 0, muscleGroups28: 3, prCount30: 2 });
  assert.equal(r.components.volume, 0.5);
});
test("the same work scores lower against a stricter goal", () => {
  const base = { sessionsLast28: 12, currentStreak: 0, volumeLast14: 1, volumePrev14: 1, muscleGroups28: 1, prCount30: 0 } as const;
  assert.ok(
    computeRating({ goal: "lose-fat", ...base }).overall <=
      computeRating({ goal: "maintain", ...base }).overall,
  );
});
test("components stay in 0..1", () => {
  const r = computeRating({ goal: "build-muscle", sessionsLast28: 99, currentStreak: 99, volumeLast14: 1e9, volumePrev14: 1, muscleGroups28: 99, prCount30: 99 });
  for (const v of Object.values(r.components)) assert.ok(v >= 0 && v <= 1);
});
