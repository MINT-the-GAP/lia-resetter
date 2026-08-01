import assert from "node:assert/strict";
import test from "node:test";

import {
  captureCoordinateMacroState,
  coordinateMacroStateMatches,
  restoreCoordinateMacroState,
} from "../src/coordinate-macro-state.ts";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function movablePoint(board, x, y) {
  return {
    board,
    x,
    y,
    X() {
      return this.x;
    },
    Y() {
      return this.y;
    },
    moveTo([nextX, nextY]) {
      this.x = nextX;
      this.y = nextY;
    },
  };
}

function fixture({ withDgs = true } = {}) {
  const initialBox = [-5, 4, 5, -4];
  const container = {
    isConnected: true,
    offsetWidth: 640,
    offsetHeight: 512,
    style: {},
  };
  const board = {
    containerObj: container,
    __coordSizeMode: "capped",
    __coordMaxStartWidth: 640,
    __coordExportBBox: initialBox.slice(),
    bbox: initialBox.slice(),
    updates: 0,
    getBoundingBox() {
      return this.bbox.slice();
    },
    setBoundingBox(bbox) {
      this.bbox = bbox.slice();
    },
    resizeContainer(width, height) {
      container.offsetWidth = width;
      container.offsetHeight = height;
    },
    objects: {},
    removeObject(object) {
      const requested = Array.isArray(object) ? object : [object];
      for (const target of requested) {
        for (const [key, value] of Object.entries(this.objects)) {
          if (value === target) delete this.objects[key];
        }
      }
      return this;
    },
    update() {
      this.updates += 1;
    },
  };
  const otherBoard = {
    containerObj: { isConnected: true },
    getBoundingBox: () => [-2, 2, 2, -2],
  };
  const regressionLayer = () => ({
    connected: true,
    remove() {
      this.connected = false;
    },
  });
  const targetRegression = {
    boardId: "target",
    board,
    restoredSnapshotRevision: 1,
    drawLayer: regressionLayer(),
    drawColor: "#ff0000",
    drawColorMenuOpen: false,
    toolsMenuOpen: false,
    activeTool: "",
    regressionMode: "",
    strokes: [],
    undoActions: [],
    redoActions: [],
    regressionPoints: [],
    autoCreatedPointsData: [],
    analysisSeq: 0,
    analysisEntries: [],
    quadraticAnalysisEntries: [],
    cubicAnalysisEntries: [],
    quarticAnalysisEntries: [],
    sinAnalysisEntries: [],
    expAnalysisEntries: [],
    logAnalysisEntries: [],
    sqrtAnalysisEntries: [],
    hyperbolaAnalysisEntries: [],
    hyperbola2AnalysisEntries: [],
  };
  const otherRegression = {
    boardId: "other",
    board: otherBoard,
    drawLayer: regressionLayer(),
    strokes: [{ id: "other-learner-stroke" }],
  };

  const staticPoint = movablePoint(board, 1, 2);
  staticPoint.elType = "point";
  staticPoint.__liaDgsMacroManaged = true;
  staticPoint.__liaDgsMacroKey = "macro:point:static";
  staticPoint.__liaDgsPersistentId = "macro:point:static";
  board.objects.static = staticPoint;
  const sliderStart = movablePoint(board, -3, -3);
  const sliderEnd = movablePoint(board, 3, -3);
  const slider = {
    board,
    point1: sliderStart,
    point2: sliderEnd,
    current: 2,
    Value() {
      return this.current;
    },
    setValue(value) {
      this.current = value;
    },
  };
  const otherSlider = {
    board: otherBoard,
    current: 9,
    Value() {
      return this.current;
    },
    setValue(value) {
      this.current = value;
    },
  };
  const scharEntry = {
    uid: "family",
    boardId: "target",
    board,
    values: { m: 1, n: 0 },
    panelScale: 0.55,
    panelMinimized: false,
    termVisible: false,
    panel: { style: {} },
  };

  const boardBaseline = {
    width: 640,
    height: 512,
    bbox: initialBox.slice(),
    exportBBox: initialBox.slice(),
    sizeMode: "capped",
    maxStartWidth: 640,
    manualSize: false,
    zoomMode: "both",
    axisScaleMode: "cartesian",
  };
  const dgsBaseline = {
    boardId: "target",
    language: "de",
    macroSpecSignature: "macro-v1",
    axisLabels: { x: "x", y: "y" },
    records: [
      { id: "macro:point:static", type: "point", x: 1, y: 2 },
    ],
  };

  let bootstrapCalls = 0;
  let regressionBootstrapCalls = 0;
  const appliedDgs = [];
  const globals = {
    __boards: { target: board, other: otherBoard },
    __coordBoardStates: {
      target: copy(boardBaseline),
      other: {
        width: 300,
        height: 300,
        bbox: [-2, 2, 2, -2],
        sizeMode: "auto",
      },
    },
    __points: {
      target: { A: staticPoint },
      other: { Z: { sentinel: true } },
    },
    __pointStates: {
      target: { A: { x: 1, y: 2, fixed: false } },
      other: { Z: { x: 8, y: 9, fixed: true } },
    },
    __pointGraphStates: {
      target: { "A||f||x": { visible: false } },
      other: { "Z||g||x": { visible: true } },
    },
    __dgsConstructionStates: withDgs
      ? { target: copy(dgsBaseline), other: { records: [{ id: "other" }] } }
      : { other: { records: [{ id: "other" }] } },
    __dgsConstructionBoards: withDgs ? { target: board } : {},
    __liaScharStateStore: {
      "family::target": {
        values: { m: 1, n: 0 },
        panelScale: 0.55,
        panelMinimized: false,
        termVisible: false,
      },
      "other::other": { values: { a: 7 } },
    },
    __scharEntries: { "schar-family": scharEntry },
    __liaRegressionStates: {
      "dgs-regression-target": targetRegression,
      "regression-other": otherRegression,
    },
    __liaRegressionSnapshots: {
      "board:target": {
        boardId: "target",
        revision: 1,
        regressionPoints: [],
      },
      "board:other": { boardId: "other", revision: 7 },
    },
    __sliderEntries: {
      "slider-s": {
        uid: "slider",
        boardId: "target",
        name: "s",
        slider,
      },
      "slider-other": {
        uid: "other-slider",
        boardId: "other",
        name: "t",
        slider: otherSlider,
      },
    },
    __tableStates: {
      "table-target": {
        boardId: "target",
        values: [{ x: "1", y: "2" }],
        cellWidths: { x0: 80, y0: 90 },
      },
      "table-other": {
        boardId: "other",
        values: [{ x: "7", y: "8" }],
        cellWidths: {},
      },
    },
    getTableData(uid) {
      return this.__tableStates[uid];
    },
    setTableValues(uid, values) {
      this.__tableStates[uid].values = copy(values);
      return true;
    },
    __plotInputStates: {
      "plot-target": {
        boardId: "target",
        raw: "",
        graph: null,
      },
      "plot-other": {
        boardId: "other",
        raw: "x+7",
        graph: { board: otherBoard },
      },
    },
    __plotInputInstances: {
      "plot-target": { input: { value: "" } },
      "plot-other": { input: { value: "x+7" } },
    },
    __plotInput: {
      removePlotObjects(targetBoard, plotState) {
        if (plotState.graph?.board === targetBoard) plotState.graph = null;
      },
      plotIntoBoard(targetBoard, plotState, raw) {
        plotState.raw = raw;
        plotState.graph = { board: targetBoard };
      },
    },
    __bootstrapSliders() {
      otherSlider.current = -999;
    },
    __setupRegressionUI() {
      regressionBootstrapCalls += 1;
      const saved = this.__liaRegressionSnapshots["board:target"];
      targetRegression.restoredSnapshotRevision = saved.revision;
      targetRegression.drawLayer = regressionLayer();
      targetRegression.drawColor = saved.drawColor;
      targetRegression.drawColorMenuOpen = saved.drawColorMenuOpen;
      targetRegression.toolsMenuOpen = saved.toolsMenuOpen;
      targetRegression.activeTool = saved.activeTool;
      targetRegression.regressionMode = saved.regressionMode;
      targetRegression.strokes = copy(saved.drawingHistory?.strokes ?? []);
      targetRegression.undoActions = copy(
        saved.drawingHistory?.undoActions ?? [],
      );
      targetRegression.redoActions = copy(
        saved.drawingHistory?.redoActions ?? [],
      );
      targetRegression.regressionPoints = copy(
        saved.regressionPoints ?? [],
      );
      targetRegression.autoCreatedPointsData = copy(
        saved.autoCreatedPointsData ?? [],
      );
      targetRegression.analysisSeq = saved.analysisSeq ?? 0;
      for (const key of [
        "analysisEntries",
        "quadraticAnalysisEntries",
        "cubicAnalysisEntries",
        "quarticAnalysisEntries",
        "sinAnalysisEntries",
        "expAnalysisEntries",
        "logAnalysisEntries",
        "sqrtAnalysisEntries",
        "hyperbolaAnalysisEntries",
        "hyperbola2AnalysisEntries",
      ]) {
        targetRegression[key] = [];
      }
    },
    __bootstrapDGS() {},
    __persistDgsBoardState() {},
    __applyDgsHistory(boardId, snapshot) {
      appliedDgs.push(copy(snapshot));
      for (const object of Object.values(board.objects)) {
        board.removeObject(object);
      }
      this.__points[boardId] = {};
      this.__pointStates[boardId] = {};
      this.__dgsConstructionStates[boardId] = copy(snapshot);
      this.__dgsConstructionBoards[boardId] = board;
    },
  };
  globals.__coord = {
    getBoardStateStore() {
      return globals.__coordBoardStates;
    },
    runExternalBootstraps() {
      bootstrapCalls += 1;
      const saved = globals.__liaScharStateStore["family::target"];
      scharEntry.values = copy(saved.values);
      scharEntry.panelScale = saved.panelScale;
      scharEntry.panelMinimized = saved.panelMinimized;
      scharEntry.termVisible = saved.termVisible;
    },
    restoreSavedBoardState(targetBoard, fallback, boardId) {
      const saved = globals.__coordBoardStates[boardId];
      targetBoard.setBoundingBox(saved?.bbox ?? fallback, true);
      return true;
    },
  };

  return {
    runtime: { view: globalThis, globals, board },
    board,
    container,
    staticPoint,
    slider,
    sliderStart,
    sliderEnd,
    otherSlider,
    scharEntry,
    targetRegression,
    otherRegression,
    globals,
    appliedDgs,
    get bootstrapCalls() {
      return bootstrapCalls;
    },
    get regressionBootstrapCalls() {
      return regressionBootstrapCalls;
    },
  };
}

function mutateTarget(state, cycle) {
  state.board.bbox = [-12 - cycle, 10, 14, -9];
  state.board.__coordSizeMode = "manual";
  state.board.__coordExportBBox = state.board.bbox.slice();
  state.board.__liaDgsZoomMode = "vertical";
  state.board.__liaDgsAxisScaleMode = "log-x";
  state.container.offsetWidth = 900 + cycle;
  state.container.offsetHeight = 700 + cycle;
  state.globals.__coordBoardStates.target = {
    width: 900 + cycle,
    height: 700 + cycle,
    bbox: state.board.bbox.slice(),
    exportBBox: state.board.bbox.slice(),
    sizeMode: "manual",
    manualSize: true,
    zoomMode: "vertical",
    axisScaleMode: "log-x",
  };
  state.board.objects[`learner-${cycle}`] = {
    board: state.board,
    elType: "point",
    __liaDgsPersistentId: `learner-${cycle}`,
  };
  state.staticPoint.childElements = {
    learner: state.board.objects[`learner-${cycle}`],
  };
  state.board.objects[`design-cap-${cycle}`] = {
    board: state.board,
    __liaDgsDesignOwner: state.staticPoint,
    __liaMacroSourceLayer: 1,
  };
  state.staticPoint.__liaDgsStyleCapSegments = [
    state.board.objects[`design-cap-${cycle}`],
  ];
  state.globals.__pointStates.target.A = {
    x: 20 + cycle,
    y: -20 - cycle,
    fixed: false,
  };
  state.staticPoint.moveTo([20 + cycle, -20 - cycle]);
  state.globals.__pointGraphStates.target["A||f||x"] = { visible: true };
  state.globals.__dgsConstructionStates.target = {
    boardId: "target",
    records: [{ id: `learner-${cycle}`, type: "polygon" }],
  };
  state.globals.__liaScharStateStore["family::target"] = {
    values: { m: 4 + cycle, n: -3 },
    panelScale: 1.2,
    panelMinimized: true,
    termVisible: true,
  };
  state.scharEntry.values = { m: 4 + cycle, n: -3 };
  state.scharEntry.panelScale = 1.2;
  state.scharEntry.panelMinimized = true;
  state.scharEntry.termVisible = true;
  state.globals.__liaRegressionSnapshots["board:target"] = {
    boardId: "target",
    revision: 10 + cycle,
    regressionPoints: [{ x: cycle, y: cycle }],
  };
  state.targetRegression.strokes = [
    { points: [{ x: cycle, y: cycle }] },
  ];
  state.targetRegression.regressionPoints = [
    { key: `learner-${cycle}`, x: cycle, y: cycle },
  ];
  state.targetRegression.activeTool = "draw";
  state.globals.__tableStates["table-target"].values = [
    { x: String(cycle + 10), y: String(cycle + 20) },
  ];
  state.globals.__plotInputStates["plot-target"].raw = `x+${cycle}`;
  state.globals.__plotInputStates["plot-target"].graph = {
    board: state.board,
  };
  state.globals.__plotInputInstances["plot-target"].input.value = `x+${cycle}`;
  state.slider.current = 8 + cycle;
  state.sliderStart.moveTo([-8, -8]);
  state.sliderEnd.moveTo([8, -8]);
}

test("restores the same immutable Coordinate macro state on every reset", () => {
  const state = fixture();
  const baseline = captureCoordinateMacroState(state.runtime, "target");
  const baselineJson = JSON.stringify(baseline);
  const otherBefore = copy({
    board: state.globals.__coordBoardStates.other,
    points: state.globals.__pointStates.other,
    graphs: state.globals.__pointGraphStates.other,
    dgs: state.globals.__dgsConstructionStates.other,
    schar: state.globals.__liaScharStateStore["other::other"],
    regression: state.globals.__liaRegressionSnapshots["board:other"],
    liveRegression: state.otherRegression.strokes,
    slider: state.otherSlider.Value(),
    table: state.globals.__tableStates["table-other"],
    plot: state.globals.__plotInputStates["plot-other"].raw,
  });

  for (const cycle of [1, 2]) {
    mutateTarget(state, cycle);
    restoreCoordinateMacroState(state.runtime, baseline);

    assert.equal(coordinateMacroStateMatches(state.runtime, baseline), true);
    assert.equal(JSON.stringify(baseline), baselineJson);
    assert.deepEqual(state.board.getBoundingBox(), [-5, 4, 5, -4]);
    assert.equal(state.board.__liaDgsZoomMode, "both");
    assert.equal(state.board.__liaDgsAxisScaleMode, "cartesian");
    assert.deepEqual(Object.values(state.board.objects), [state.staticPoint]);
    assert.deepEqual(
      [state.container.offsetWidth, state.container.offsetHeight],
      [640, 512],
    );
    assert.deepEqual(
      [state.staticPoint.X(), state.staticPoint.Y()],
      [1, 2],
    );
    assert.deepEqual(state.scharEntry.values, { m: 1, n: 0 });
    assert.deepEqual(state.targetRegression.strokes, []);
    assert.deepEqual(state.targetRegression.regressionPoints, []);
    assert.equal(state.targetRegression.activeTool, "");
    assert.deepEqual(
      state.globals.__tableStates["table-target"].values,
      [{ x: "1", y: "2" }],
    );
    assert.equal(state.globals.__plotInputStates["plot-target"].raw, "");
    assert.equal(state.globals.__plotInputStates["plot-target"].graph, null);
    assert.equal(
      state.globals.__plotInputInstances["plot-target"].input.value,
      "",
    );
    assert.equal(state.slider.Value(), 2);
    assert.deepEqual(
      [state.sliderStart.X(), state.sliderStart.Y()],
      [-3, -3],
    );
    assert.deepEqual(
      [state.sliderEnd.X(), state.sliderEnd.Y()],
      [3, -3],
    );
    assert.deepEqual(
      {
        board: state.globals.__coordBoardStates.other,
        points: state.globals.__pointStates.other,
        graphs: state.globals.__pointGraphStates.other,
        dgs: state.globals.__dgsConstructionStates.other,
        schar: state.globals.__liaScharStateStore["other::other"],
        regression: state.globals.__liaRegressionSnapshots["board:other"],
        liveRegression: state.otherRegression.strokes,
        slider: state.otherSlider.Value(),
        table: state.globals.__tableStates["table-other"],
        plot: state.globals.__plotInputStates["plot-other"].raw,
      },
      otherBefore,
    );
  }

  assert.equal(state.appliedDgs.length, 2);
  assert.equal(state.bootstrapCalls, 0);
  assert.equal(state.regressionBootstrapCalls, 2);
});

test("removes a later DGS store when the authored board had no DGS state", () => {
  const state = fixture({ withDgs: false });
  const baseline = captureCoordinateMacroState(state.runtime, "target");
  assert.equal(baseline.hadDgsSnapshot, false);

  state.globals.__dgsConstructionStates.target = {
    boardId: "target",
    records: [{ id: "late-learner-object", type: "point" }],
  };
  restoreCoordinateMacroState(state.runtime, baseline);

  assert.equal(
    Object.hasOwn(state.globals.__dgsConstructionStates, "target"),
    false,
  );
  assert.equal(coordinateMacroStateMatches(state.runtime, baseline), true);
  assert.deepEqual(state.appliedDgs, []);
});

test("rejects an incomplete asynchronous Coordinate macro mount", () => {
  const complete = fixture();
  assert.doesNotThrow(() =>
    captureCoordinateMacroState(complete.runtime, "target", {
      requireDgs: true,
      requireRegression: true,
      scharUids: ["family"],
      sliderUids: ["slider"],
      tableUids: ["table-target"],
      plotInputUids: ["plot-target"],
      pointNames: ["A"],
      dgsMacroKeys: ["macro:point:static"],
    }),
  );

  const missingDgs = fixture({ withDgs: false });
  assert.throws(
    () =>
      captureCoordinateMacroState(missingDgs.runtime, "target", {
        requireDgs: true,
      }),
    /DGS-Makrozustand ist noch nicht bereit/,
  );

  const missingSchar = fixture();
  delete missingSchar.globals.__liaScharStateStore["family::target"];
  delete missingSchar.globals.__scharEntries["schar-family"];
  assert.throws(
    () =>
      captureCoordinateMacroState(missingSchar.runtime, "target", {
        requireSchar: true,
      }),
    /Schar-Makrozustand ist noch nicht bereit/,
  );

  const missingRegression = fixture();
  delete missingRegression.globals.__liaRegressionStates[
    "dgs-regression-target"
  ];
  assert.throws(
    () =>
      captureCoordinateMacroState(missingRegression.runtime, "target", {
        requireRegression: true,
      }),
    /Regression-Makrozustand ist noch nicht bereit/,
  );

  const missingExactSlider = fixture();
  delete missingExactSlider.globals.__sliderEntries["slider-s"];
  assert.throws(
    () =>
      captureCoordinateMacroState(missingExactSlider.runtime, "target", {
        sliderUids: ["slider"],
      }),
    /Slider-Makrozustand ist noch nicht vollständig bereit/,
  );

  const missingAuthoredDgsRecord = fixture();
  missingAuthoredDgsRecord.globals.__dgsConstructionStates.target.records = [];
  assert.throws(
    () =>
      captureCoordinateMacroState(
        missingAuthoredDgsRecord.runtime,
        "target",
        { dgsMacroKeys: ["macro:point:static"] },
      ),
    /authored DGS-Makrozustand ist noch nicht vollständig bereit/,
  );
});

test("fails closed when DGS cannot apply the baseline to the live board", () => {
  const missingController = fixture();
  const baseline = captureCoordinateMacroState(
    missingController.runtime,
    "target",
  );
  mutateTarget(missingController, 1);
  delete missingController.globals.__dgsConstructionBoards.target;
  assert.throws(
    () => restoreCoordinateMacroState(missingController.runtime, baseline),
    /keinen vollständigen DGS-Reset/,
  );

  const noOpApply = fixture();
  const secondBaseline = captureCoordinateMacroState(
    noOpApply.runtime,
    "target",
  );
  mutateTarget(noOpApply, 2);
  noOpApply.globals.__applyDgsHistory = () => {};
  assert.throws(
    () => restoreCoordinateMacroState(noOpApply.runtime, secondBaseline),
    /nicht live angewendet/,
  );
});
