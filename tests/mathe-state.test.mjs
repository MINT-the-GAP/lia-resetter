import assert from "node:assert/strict";
import test from "node:test";

import { resetMatheWidgetProgress } from "../src/mathe.ts";

test("opens only the mutable lia-Mathe progress flags", () => {
  const target = { num: 3, den: 8, value: 0.375, raw: "3/8" };
  const meta = {
    uid: "circle-7",
    kind: "circle",
    target,
    parts: 8,
    locked: true,
    solved: true,
    revealed: true,
    ready: true,
  };
  const widget = {
    meta,
    state: [true, true, true, false, false, false, false, false],
  };
  const state = widget.state;

  resetMatheWidgetProgress(widget);

  assert.strictEqual(widget.meta, meta);
  assert.strictEqual(widget.meta.target, target);
  assert.strictEqual(widget.state, state);
  assert.equal(widget.meta.locked, false);
  assert.equal(widget.meta.solved, false);
  assert.equal(widget.meta.revealed, false);
  assert.equal(widget.meta.ready, true);
  assert.equal(widget.meta.parts, 8);
});

test("preserves rect dimensions and readiness while clearing progress", () => {
  const dims = { rows: 3, cols: 4 };
  const widget = {
    meta: {
      uid: "rect-9",
      kind: "rect",
      target: { num: 5, den: 12, value: 5 / 12, raw: "5/12" },
      rows: 3,
      cols: 4,
      locked: true,
      solved: false,
      revealed: true,
      ready: false,
    },
    state: Array.from({ length: 12 }, (_, index) => index < 5),
    dims,
  };

  resetMatheWidgetProgress(widget);

  assert.strictEqual(widget.dims, dims);
  assert.deepEqual(widget.dims, { rows: 3, cols: 4 });
  assert.equal(widget.meta.rows, 3);
  assert.equal(widget.meta.cols, 4);
  assert.equal(widget.meta.ready, false);
  assert.equal(widget.meta.locked, false);
  assert.equal(widget.meta.solved, false);
  assert.equal(widget.meta.revealed, false);
});
