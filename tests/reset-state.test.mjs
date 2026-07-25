import assert from "node:assert/strict";
import test from "node:test";

import {
  containsDropState,
  isIsolatedReset,
  resetQuizElement,
  resetSerializedState,
} from "../src/reset-state.ts";

test("resets every serialized native quiz state", () => {
  assert.deepEqual(resetSerializedState({ Text: "42" }), { Text: "" });
  assert.deepEqual(resetSerializedState({ Select: 2 }), { Select: -1 });
  assert.deepEqual(resetSerializedState({ Drop: [3, 1] }), { Drop: -1 });
  assert.deepEqual(resetSerializedState({ SingleChoice: [false, true] }), {
    SingleChoice: [false, false],
  });
  assert.deepEqual(resetSerializedState({ MultipleChoice: [true, false, true] }), {
    MultipleChoice: [false, false, false],
  });
  assert.deepEqual(
    resetSerializedState({
      Matrix: [
        { SingleChoice: [false, true] },
        { MultipleChoice: [true, false] },
      ],
    }),
    {
      Matrix: [
        { SingleChoice: [false, false] },
        { MultipleChoice: [false, false] },
      ],
    },
  );
  assert.deepEqual(
    resetSerializedState({ Multi: [{ Text: "x" }, { Select: 1 }, { Drop: [0, 2] }] }),
    { Multi: [{ Text: "" }, { Select: -1 }, { Drop: -1 }] },
  );
  assert.deepEqual(resetSerializedState({ Generic: null }), { Generic: null });
});

test("resets metadata without mutating the captured element", () => {
  const before = {
    solved: 1,
    state: { Text: "42" },
    trial: 3,
    hint: 2,
    error_msg: "alt",
    score: 0.5,
  };
  const after = resetQuizElement(before);

  assert.deepEqual(before.state, { Text: "42" });
  assert.deepEqual(after, {
    solved: 0,
    state: { Text: "" },
    trial: 0,
    hint: 0,
    error_msg: "",
    score: 0.5,
  });
});

test("accepts an isolated target reset and rejects sibling changes", () => {
  const before = [
    { solved: 1, state: { Text: "42" }, trial: 1, hint: 0, error_msg: "" },
    {
      solved: 0,
      state: { MultipleChoice: [true, false] },
      trial: 2,
      hint: 0,
      error_msg: "falsch",
    },
  ];
  const target = resetQuizElement(before[0]);
  const isolated = [target, structuredClone(before[1])];
  const changedSibling = [
    target,
    { ...before[1], state: { MultipleChoice: [false, false] } },
  ];

  assert.equal(isIsolatedReset(before, isolated, 0, target), true);
  assert.equal(isIsolatedReset(before, changedSibling, 0, target), false);
});

test("detects Drop states that LiaScript 1.1.0 cannot restore from JSON", () => {
  assert.equal(containsDropState([{ state: { Multi: [{ Drop: 2 }] } }]), true);
  assert.equal(containsDropState([{ state: { Select: 2 } }]), false);
});
