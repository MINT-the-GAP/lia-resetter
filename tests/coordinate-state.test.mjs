import assert from "node:assert/strict";
import test from "node:test";

import {
  clearCoordinateRegistryTarget,
  parseCreatePointTarget,
  parsePointOnGraphTarget,
  parsePointsOnGraphTarget,
} from "../src/coordinate.ts";

function registries() {
  return {
    points: {
      shared: {
        A: { id: "point-a" },
        A_1: { id: "point-a-1" },
        A_2: { id: "point-a-2" },
        A_10: { id: "point-a-10" },
        B: { id: "point-b" },
      },
      other: { A: { id: "other-point-a" } },
    },
    pointStates: {
      shared: {
        A: { x: 2, y: 3, fixed: true },
        A_1: { x: -1, y: 0, fixed: true },
        A_2: { x: 1, y: 2, fixed: true },
        A_10: { x: 10, y: 11, fixed: false },
        B: { x: 4, y: 5, fixed: false },
      },
      other: { A: { x: 7, y: 8, fixed: false } },
    },
    pointGraphs: {
      shared: {
        "A||f||2*x-1": { id: "target-single-graph" },
        "A||2||f||x-1": { id: "target-multi-graph" },
        "B||g||x+1": { id: "sibling-graph" },
      },
      other: { "A||f||2*x-1": { id: "other-board-graph" } },
    },
    pointGraphStates: {
      shared: {
        "A||f||2*x-1": { visible: true },
        "A||2||f||x-1": { visible: true },
        "B||g||x+1": { visible: true },
      },
      other: { "A||f||2*x-1": { visible: true } },
    },
    pointOnGraphLocks: {
      singleTarget: true,
      singleSibling: true,
    },
    pointsOnGraphLocks: {
      multiTarget: true,
      multiSibling: true,
    },
  };
}

test("recognizes main and Proposal CreatePoint specs by their technical point name", () => {
  const main = parseCreatePointTarget("shared;A;2;3", "createMain");
  const proposal = parseCreatePointTarget(
    "`shared;P=0;2,5;-3,25;#ff00ff;1`",
    "createProposal",
  );

  assert.equal(main.kind, "create-point");
  assert.equal(main.uid, "createMain");
  assert.equal(main.boardId, "shared");
  assert.deepEqual(main.names, ["A"]);
  assert.equal(main.graphKey, undefined);

  assert.equal(proposal.kind, "create-point");
  assert.equal(proposal.uid, "createProposal");
  assert.equal(proposal.boardId, "shared");
  assert.deepEqual(proposal.names, ["P"]);
  assert.equal(proposal.graphKey, undefined);
});

test("parses the compact PointOnGraph syntax and derives its upstream graph key", () => {
  const target = parsePointOnGraphTarget(
    "shared;A;f;2*x-1;0.05",
    "singleTarget",
  );

  assert.equal(target.kind, "point-on-graph");
  assert.equal(target.uid, "singleTarget");
  assert.equal(target.boardId, "shared");
  assert.deepEqual(target.names, ["A"]);
  assert.equal(target.graphKey, "A||f||2*x-1");
});

test("parses the colored PointOnGraph syntax without shifting graph identity", () => {
  const target = parsePointOnGraphTarget(
    "shared;B;#ff00ff;g;x^2;#0055cc;0,1",
    "coloredSingle",
  );

  assert.equal(target.kind, "point-on-graph");
  assert.equal(target.boardId, "shared");
  assert.deepEqual(target.names, ["B"]);
  assert.equal(target.graphKey, "B||g||x^2");
});

test("recovers a PointOnGraph board id whose underscores LiaScript rendered as emphasis", () => {
  const target = parsePointOnGraphTarget(
    "resetcoordgraph;B;f;2*x-1;0.05",
    "markdownBoard",
    ["reset_coord_graph", "another_board"],
  );

  assert.equal(target.boardId, "reset_coord_graph");
  assert.deepEqual(target.names, ["B"]);
  assert.equal(target.graphKey, "B||f||2*x-1");
});

test("rejects an ambiguous markdown-normalized PointOnGraph board id", () => {
  assert.throws(
    () =>
      parsePointOnGraphTarget(
        "resetcoordgraph;B;f;2*x-1;0.05",
        "ambiguousBoard",
        ["reset_coord_graph", "resetc_oord_graph"],
      ),
    /Board-ID|mehrdeutig/i,
  );
});

test("preserves quoted expression tokens in the upstream graph registry key", () => {
  const single = parsePointOnGraphTarget(
    "shared;A;f;'2*x-1';0.05",
    "quotedSingle",
  );
  const multi = parsePointsOnGraphTarget(
    "shared;n=2;d=1;P;g;\"x^2\";0.05",
    "quotedMulti",
  );

  assert.equal(single.graphKey, "A||f||'2*x-1'");
  assert.equal(multi.graphKey, 'P||2||g||"x^2"');
});

test("expands PointsOnGraph names and reproduces the exact upstream graph key", () => {
  const target = parsePointsOnGraphTarget(
    "shared;n=3;d=2;A;f;x-1;0.05",
    "multiTarget",
  );

  assert.equal(target.kind, "points-on-graph");
  assert.equal(target.uid, "multiTarget");
  assert.equal(target.boardId, "shared");
  assert.deepEqual(target.names, ["A_1", "A_2", "A_3"]);
  assert.equal(target.graphKey, "A||3||f||x-1");
});

test("clears only the owned single-point registry entries", () => {
  const state = registries();
  const siblingPoint = state.points.shared.B;
  const siblingGraph = state.pointGraphs.shared["B||g||x+1"];
  const otherBoardPoint = state.points.other.A;
  const otherBoardGraph = state.pointGraphs.other["A||f||2*x-1"];
  const target = parsePointOnGraphTarget(
    "shared;A;f;2*x-1;0.05",
    "singleTarget",
  );
  const sibling = parsePointOnGraphTarget(
    "shared;B;g;x+1;0.05",
    "singleSibling",
  );

  clearCoordinateRegistryTarget(state, target, [sibling]);

  assert.equal(Object.hasOwn(state.points.shared, "A"), false);
  assert.equal(Object.hasOwn(state.pointStates.shared, "A"), false);
  assert.equal(
    Object.hasOwn(state.pointGraphs.shared, "A||f||2*x-1"),
    false,
  );
  assert.equal(
    Object.hasOwn(state.pointGraphStates.shared, "A||f||2*x-1"),
    false,
  );
  assert.equal(Boolean(state.pointOnGraphLocks.singleTarget), false);

  assert.strictEqual(state.points.shared.B, siblingPoint);
  assert.strictEqual(state.pointGraphs.shared["B||g||x+1"], siblingGraph);
  assert.strictEqual(state.points.other.A, otherBoardPoint);
  assert.strictEqual(
    state.pointGraphs.other["A||f||2*x-1"],
    otherBoardGraph,
  );
  assert.equal(state.pointOnGraphLocks.singleSibling, true);
  assert.equal(state.pointsOnGraphLocks.multiTarget, true);
});

test("clears exactly the expanded multi-point names and its lock", () => {
  const state = registries();
  const similarlyNamedPoint = state.points.shared.A_10;
  const siblingPoint = state.points.shared.B;
  const siblingGraph = state.pointGraphs.shared["B||g||x+1"];
  const target = parsePointsOnGraphTarget(
    "shared;n=2;d=2;A;f;x-1;0.05",
    "multiTarget",
  );

  clearCoordinateRegistryTarget(state, target, []);

  assert.equal(Object.hasOwn(state.points.shared, "A_1"), false);
  assert.equal(Object.hasOwn(state.points.shared, "A_2"), false);
  assert.equal(Object.hasOwn(state.pointStates.shared, "A_1"), false);
  assert.equal(Object.hasOwn(state.pointStates.shared, "A_2"), false);
  assert.equal(
    Object.hasOwn(state.pointGraphs.shared, "A||2||f||x-1"),
    false,
  );
  assert.equal(
    Object.hasOwn(state.pointGraphStates.shared, "A||2||f||x-1"),
    false,
  );
  assert.equal(Boolean(state.pointsOnGraphLocks.multiTarget), false);

  assert.strictEqual(state.points.shared.A_10, similarlyNamedPoint);
  assert.strictEqual(state.points.shared.B, siblingPoint);
  assert.strictEqual(state.pointGraphs.shared["B||g||x+1"], siblingGraph);
  assert.equal(state.pointsOnGraphLocks.multiSibling, true);
  assert.equal(state.pointOnGraphLocks.singleTarget, true);
});

test("fails closed before mutation when another quiz owns a target point", () => {
  const state = registries();
  const before = structuredClone(state);
  const target = parsePointOnGraphTarget(
    "shared;A;f;2*x-1;0.05",
    "singleTarget",
  );
  const collidingSibling = parseCreatePointTarget(
    "shared;A;4;5",
    "createSibling",
  );

  assert.throws(
    () => clearCoordinateRegistryTarget(state, target, [collidingSibling]),
    /eindeutig|ownership|besitz|kollision/i,
  );
  assert.deepEqual(state, before);
});

test("fails closed before mutation when another quiz owns the graph key", () => {
  const state = registries();
  const before = structuredClone(state);
  const target = parsePointOnGraphTarget(
    "shared;A;f;2*x-1;0.05",
    "singleTarget",
  );
  const collidingSibling = {
    kind: "point-on-graph",
    uid: "graphSibling",
    boardId: "shared",
    names: ["Z"],
    graphKey: "A||f||2*x-1",
  };

  assert.throws(
    () => clearCoordinateRegistryTarget(state, target, [collidingSibling]),
    /eindeutig|ownership|besitz|kollision/i,
  );
  assert.deepEqual(state, before);
});
