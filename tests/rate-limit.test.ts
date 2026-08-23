import assert from "node:assert/strict";
import test from "node:test";

import { allowRequest } from "../src/server/rate-limit";

test("allows up to max inside one window", () => {
  const key = `t1-${Math.random()}`;
  for (let i = 0; i < 10; i++) assert.equal(allowRequest(key, 10, 60_000), true);
  assert.equal(allowRequest(key, 10, 60_000), false);
});

test("boundary burst is bounded to ~1 extra, never a fresh allowance", async (t) => {
  const key = `t2-${Math.random()}`;
  const originalNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;
  t.after(() => {
    Date.now = originalNow;
  });

  // open the window, then exhaust the allowance near its END so the prior
  // requests still sit inside the rolling minute after the boundary
  assert.equal(allowRequest(key, 10, 60_000), true);
  clock = 1_000_000 + 59_000;
  for (let i = 0; i < 9; i++) assert.equal(allowRequest(key, 10, 60_000), true);
  assert.equal(allowRequest(key, 10, 60_000), false);

  // 1ms past the boundary a fixed window would grant 10 fresh requests.
  // The weighted window allows at most one (approximation slack), no more.
  clock = 1_000_000 + 60_001;
  let granted = 0;
  for (let i = 0; i < 10; i++) if (allowRequest(key, 10, 60_000)) granted += 1;
  assert.ok(granted <= 1, `boundary grants must be bounded, got ${granted}`);

  // deep into window 2 the old weight decays and room genuinely reopens
  clock = 1_000_000 + 115_000;
  assert.equal(allowRequest(key, 10, 60_000), true);
});
