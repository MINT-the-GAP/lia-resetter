import assert from "node:assert/strict";
import test from "node:test";

import { extractNativeCorrectOptionIndexes } from "../src/native-drop-solution.ts";

function elmList(values) {
  return values.reduceRight(
    (tail, value) => ({ $: 1, a: value, b: tail }),
    { $: 0 },
  );
}

function elmArray(values) {
  return { $: 0, a: values.length, c: [], d: values };
}

function optionsArray(optionCounts) {
  return elmArray(
    optionCounts.map((count) =>
      elmList(Array.from({ length: count }, (_, index) => index)),
    ),
  );
}

function solutionArray(indexes) {
  return elmArray(indexes.map((index) => ({ c: elmList([index]) })));
}

function checkButton(optionCounts, indexes, alternates = []) {
  const model = {
    minifiedOptions: optionsArray(optionCounts),
    minifiedSolution: solutionArray(indexes),
  };
  alternates.forEach((alternate, index) => {
    model[`alternate${index}`] = solutionArray(alternate);
  });
  return { elmFs: { click: { q: { unknownMinifiedPath: model } } } };
}

test("extracts one structurally verified native Multi-Drop solution", () => {
  const counts = [1, 3, 2, 1];
  assert.deepEqual(
    extractNativeCorrectOptionIndexes(checkButton(counts, [0, 2, 1, 0]), counts),
    [0, 2, 1, 0],
  );
});

test("fails closed for missing, malformed, or ambiguous listener state", () => {
  const counts = [2, 2];
  assert.equal(extractNativeCorrectOptionIndexes({}, counts), null);
  assert.equal(
    extractNativeCorrectOptionIndexes(
      { elmFs: { click: { onlySolution: solutionArray([0, 1]) } } },
      counts,
    ),
    null,
  );
  assert.equal(
    extractNativeCorrectOptionIndexes(
      checkButton(counts, [0, 1], [[1, 0]]),
      counts,
    ),
    null,
  );
  assert.equal(extractNativeCorrectOptionIndexes(checkButton([], []), []), null);
});
