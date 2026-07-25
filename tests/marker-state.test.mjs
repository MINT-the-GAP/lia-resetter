import assert from "node:assert/strict";
import test from "node:test";

import { filterMarkerQuizHighlights } from "../src/marker.ts";

function highlight(id, kind, scope, slide, color = "red") {
  return {
    id,
    kind,
    color,
    anchor: { sp: [0], so: id, ep: [0], eo: id + 1 },
    rects: [{ x: id, y: id }],
    scope,
    slide,
  };
}

test("removes only user and solution progress from the target marker quiz", () => {
  const targetUser = highlight(1, "user", "S2", "SLIDE_4");
  const targetSolution = highlight(2, "solution", "S2", "SLIDE_4");
  const targetPrefill = highlight(3, "prefill", "S2", "SLIDE_4");
  const siblingUser = highlight(4, "user", "S3", "SLIDE_4");
  const otherSlideSolution = highlight(5, "solution", "S2", "SLIDE_5");
  const globalUser = highlight(6, "user", "S2", "global");
  const highlights = [
    targetUser,
    targetSolution,
    targetPrefill,
    siblingUser,
    otherSlideSolution,
    globalUser,
  ];

  const result = filterMarkerQuizHighlights(highlights, "S2", "SLIDE_4");

  assert.deepEqual(result, [
    targetPrefill,
    siblingUser,
    otherSlideSolution,
    globalUser,
  ]);
  assert.strictEqual(result[0], targetPrefill);
  assert.strictEqual(result[1], siblingUser);
  assert.strictEqual(result[2], otherSlideSolution);
  assert.strictEqual(result[3], globalUser);
});

test("does not mutate the marker registry array or retained entries", () => {
  const target = highlight(11, "user", "S1", "SLIDE_1", "blue");
  const retained = highlight(12, "prefill", "S1", "SLIDE_1", "orange");
  const retainedSnapshot = structuredClone(retained);
  const highlights = [target, retained];

  const result = filterMarkerQuizHighlights(highlights, "S1", "SLIDE_1");

  assert.notStrictEqual(result, highlights);
  assert.deepEqual(highlights, [target, retained]);
  assert.strictEqual(result[0], retained);
  assert.deepEqual(retained, retainedSnapshot);
});
