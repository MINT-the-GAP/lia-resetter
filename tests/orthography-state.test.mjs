import assert from "node:assert/strict";
import test from "node:test";

import { resetOrthographyPluginState } from "../src/orthography.ts";

test("resets only mutable lia-orthography progress fields", () => {
  const state = {
    start: "feler",
    solution: "Fehler",
    liveValue: "Fehler",
    solved: true,
    tries: 3,
    checkToken: 8,
    resolvePending: true,
    gate: { mode: "attempts", n: 2 },
  };

  resetOrthographyPluginState(state, "feler");

  assert.deepEqual(state, {
    start: "feler",
    solution: "Fehler",
    liveValue: "feler",
    solved: false,
    tries: 0,
    checkToken: 9,
    resolvePending: false,
    gate: { mode: "attempts", n: 2 },
  });
});

test("repairs a malformed check token while preserving an empty start", () => {
  const state = {
    liveValue: "Benutzereingabe",
    solved: true,
    tries: 1,
    checkToken: "ungültig",
    resolvePending: false,
  };

  resetOrthographyPluginState(state, "");

  assert.equal(state.liveValue, "");
  assert.equal(state.checkToken, 1);
  assert.equal(state.solved, false);
  assert.equal(state.tries, 0);
});
