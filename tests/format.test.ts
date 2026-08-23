import assert from "node:assert/strict";
import test from "node:test";

import { displayVolume, displayWeight, formatDuration } from "../src/lib/format";

test("zero", () => assert.equal(formatDuration(0), "0 min"));
test("sub-hour", () => assert.equal(formatDuration(2700), "45 min"));
test("exact hour", () => assert.equal(formatDuration(3600), "1h 0m"));
test("59m40s rounds to the next hour, never 60m", () =>
  assert.equal(formatDuration(3580), "1h 0m"));
test("1h59m39s never renders 1h 60m", () => assert.equal(formatDuration(7179), "2h 0m"));
test("kg passthrough", () => assert.equal(displayWeight(22.5, "kg"), "22.5 kg"));
test("lb conversion", () => assert.equal(displayWeight(100, "lb"), "220.5 lb"));
test("volume in lb", () => assert.equal(displayVolume(1000, "lb"), "2,205 lb"));
