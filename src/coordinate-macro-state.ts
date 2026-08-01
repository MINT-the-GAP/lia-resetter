type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonRecord = Record<string, JsonValue>;
type LiveRecord = Record<string, unknown>;

interface CoordinateContainer {
  readonly isConnected?: boolean;
  readonly offsetWidth?: number;
  readonly offsetHeight?: number;
  readonly style?: CSSStyleDeclaration | Record<string, unknown>;
  getBoundingClientRect?: () => { width: number; height: number };
  querySelector?: (selector: string) => Element | null;
}

export interface CoordinateMacroBoard extends LiveRecord {
  readonly containerObj?: CoordinateContainer;
  getBoundingBox?: () => number[];
  setBoundingBox?: (bbox: number[], keepAspect?: boolean) => unknown;
  resizeContainer?: (
    width: number,
    height: number,
    dontSetBoundingBox?: boolean,
    dontSetSize?: boolean,
  ) => unknown;
  removeObject?: (object: unknown, ...args: unknown[]) => unknown;
  update?: () => unknown;
}

export interface CoordinateMacroRuntime {
  readonly view: Window;
  readonly globals: LiveRecord;
  readonly board: CoordinateMacroBoard;
}

export interface CoordinateMacroRequirements {
  readonly requireDgs?: boolean;
  readonly requireSchar?: boolean;
  readonly requireRegression?: boolean;
  readonly scharUids?: readonly string[];
  readonly sliderUids?: readonly string[];
  readonly tableUids?: readonly string[];
  readonly plotInputUids?: readonly string[];
  readonly pointNames?: readonly string[];
  readonly dgsMacroKeys?: readonly string[];
  readonly dgsMacroKeyPrefixes?: readonly string[];
}

interface CoordinateSliderMacroState {
  readonly uid: string;
  readonly boardId: string;
  readonly name: string;
  readonly value: number;
  readonly points?: readonly [
    Readonly<{ x: number; y: number }>,
    Readonly<{ x: number; y: number }>,
  ];
}

interface CoordinateTableMacroState {
  readonly uid: string;
  readonly boardId: string;
  readonly values: readonly Readonly<{ x: string; y: string }>[];
  readonly cellWidths: JsonRecord;
}

interface CoordinatePlotInputMacroState {
  readonly uid: string;
  readonly boardId: string;
  readonly raw: string;
  readonly plotted: boolean;
}

/**
 * Immutable, JSON-only projection of one lia-coordinate board as authored by
 * its macros. It is captured before the learner can use the Resetter button.
 */
export interface CoordinateMacroState {
  readonly boardId: string;
  readonly boardState: JsonRecord;
  readonly pointStates: JsonRecord;
  readonly pointGraphStates: JsonRecord;
  readonly hadDgsSnapshot: boolean;
  readonly dgsSnapshot?: JsonValue;
  readonly scharStates: JsonRecord;
  readonly regressionSnapshots: JsonRecord;
  readonly regressionUids: readonly string[];
  readonly sliderStates: Readonly<Record<string, CoordinateSliderMacroState>>;
  readonly tableStates: Readonly<Record<string, CoordinateTableMacroState>>;
  readonly plotInputStates: Readonly<
    Record<string, CoordinatePlotInputMacroState>
  >;
}

function isRecord(value: unknown): value is LiveRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function finite(value: unknown): number | undefined {
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function validBoundingBox(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const result = value.map(finite);
  if (
    result.some((entry) => entry === undefined) ||
    (result[2] as number) <= (result[0] as number) ||
    (result[1] as number) <= (result[3] as number)
  ) {
    return undefined;
  }
  return result as number[];
}

function cloneJson(value: unknown): JsonValue | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined
      ? undefined
      : (JSON.parse(serialized) as JsonValue);
  } catch {
    return undefined;
  }
}

function cloneRecord(value: unknown): JsonRecord {
  const cloned = cloneJson(value);
  return isRecord(cloned) ? (cloned as JsonRecord) : {};
}

function recordStore(globals: LiveRecord, key: string): LiveRecord {
  const current = globals[key];
  if (isRecord(current)) return current;
  const created: LiveRecord = {};
  globals[key] = created;
  return created;
}

function method(
  container: LiveRecord | undefined,
  key: string,
): ((...args: unknown[]) => unknown) | undefined {
  const value = container?.[key];
  return typeof value === "function"
    ? (value as (...args: unknown[]) => unknown)
    : undefined;
}

function call(
  receiver: LiveRecord | undefined,
  key: string,
  args: readonly unknown[] = [],
): unknown {
  const callback = method(receiver, key);
  return callback ? Reflect.apply(callback, receiver, args) : undefined;
}

function withRestoreFlag<T>(
  globals: LiveRecord,
  callback: () => T,
): T {
  const key = "__liaFreezeCoordinateRestoreActive";
  const existed = hasOwn(globals, key);
  const previous = globals[key];
  globals[key] = true;
  try {
    return callback();
  } finally {
    if (existed) globals[key] = previous;
    else delete globals[key];
  }
}

function coordinateApi(globals: LiveRecord): LiveRecord | undefined {
  return isRecord(globals.__coord) ? globals.__coord : undefined;
}

function boardStateStore(globals: LiveRecord): LiveRecord {
  const api = coordinateApi(globals);
  const fromApi = call(api, "getBoardStateStore");
  if (isRecord(fromApi)) return fromApi;
  return recordStore(globals, "__coordBoardStates");
}

function boardSize(
  container: CoordinateContainer | undefined,
  dimension: "width" | "height",
): number | undefined {
  if (!container) return undefined;
  const offset = dimension === "width"
    ? finite(container.offsetWidth)
    : finite(container.offsetHeight);
  if (offset !== undefined && offset > 0) return Math.round(offset);

  const style = container.style;
  const inline = style && finite(style[dimension]);
  if (inline !== undefined && inline > 0) return Math.round(inline);

  try {
    const rect = container.getBoundingClientRect?.();
    const measured = rect && finite(rect[dimension]);
    return measured !== undefined && measured > 0
      ? Math.round(measured)
      : undefined;
  } catch {
    return undefined;
  }
}

function liveBoardState(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): JsonRecord {
  const stored = cloneRecord(boardStateStore(runtime.globals)[boardId]);
  let bbox: number[] | undefined;
  try {
    bbox = validBoundingBox(runtime.board.getBoundingBox?.());
  } catch {
    bbox = undefined;
  }
  bbox ??= validBoundingBox(stored.bbox);
  if (!bbox) {
    throw new Error("Der Makro-Viewport des lia-coordinate-Boards ist nicht lesbar.");
  }

  stored.bbox = bbox;
  const exportBBox = validBoundingBox(runtime.board.__coordExportBBox) ?? bbox;
  stored.exportBBox = exportBBox;

  const width = boardSize(runtime.board.containerObj, "width");
  const height = boardSize(runtime.board.containerObj, "height");
  if (width !== undefined) stored.width = width;
  if (height !== undefined) stored.height = height;

  const sizeMode = String(runtime.board.__coordSizeMode ?? stored.sizeMode ?? "auto");
  stored.sizeMode = ["auto", "capped", "manual"].includes(sizeMode)
    ? sizeMode
    : "auto";
  const maximum = finite(runtime.board.__coordMaxStartWidth ?? stored.maxStartWidth);
  stored.maxStartWidth = maximum !== undefined && maximum > 0 ? maximum : null;
  stored.manualSize = stored.sizeMode === "manual";
  const zoomMode = String(
    runtime.board.__liaDgsZoomMode ?? stored.zoomMode ?? "",
  );
  if (["both", "vertical", "horizontal"].includes(zoomMode)) {
    stored.zoomMode = zoomMode;
  }
  const axisScaleMode = String(
    runtime.board.__liaDgsAxisScaleMode ?? stored.axisScaleMode ?? "",
  );
  if (["cartesian", "log-x", "log-y", "log-log"].includes(axisScaleMode)) {
    stored.axisScaleMode = axisScaleMode;
  }
  return stored;
}

function scopedBucket(
  globals: LiveRecord,
  storeName: string,
  boardId: string,
): JsonRecord {
  const store = isRecord(globals[storeName]) ? globals[storeName] : undefined;
  return cloneRecord(store?.[boardId]);
}

function pointPosition(value: unknown): { x: number; y: number } | undefined {
  if (!isRecord(value)) return undefined;
  try {
    const readX = method(value, "X");
    const readY = method(value, "Y");
    const x = readX ? finite(Reflect.apply(readX, value, [])) : undefined;
    const y = readY ? finite(Reflect.apply(readY, value, [])) : undefined;
    return x !== undefined && y !== undefined ? { x, y } : undefined;
  } catch {
    return undefined;
  }
}

function liveScharStates(globals: LiveRecord, boardId: string): JsonRecord {
  const result: JsonRecord = {};
  const store = isRecord(globals.__liaScharStateStore)
    ? globals.__liaScharStateStore
    : undefined;
  for (const [key, value] of Object.entries(store ?? {})) {
    if (!key.endsWith(`::${boardId}`)) continue;
    const cloned = cloneJson(value);
    if (cloned !== undefined) result[key] = cloned;
  }

  const entries = isRecord(globals.__scharEntries)
    ? globals.__scharEntries
    : undefined;
  for (const value of Object.values(entries ?? {})) {
    if (!isRecord(value) || String(value.boardId ?? "") !== boardId) continue;
    const uid = String(value.uid ?? "").trim();
    if (!uid) continue;
    const live = cloneRecord({
      values: value.values,
      panelScale: finite(value.panelScale) ?? 0.55,
      panelMinimized: value.panelMinimized === true,
      termVisible: value.termVisible === true,
    });
    result[`${uid}::${boardId}`] = live;
  }
  return result;
}

const REGRESSION_ANALYSIS_GROUPS = [
  ["analysisEntries", "linear"],
  ["quadraticAnalysisEntries", "quadratic"],
  ["cubicAnalysisEntries", "cubic"],
  ["quarticAnalysisEntries", "quartic"],
  ["sinAnalysisEntries", "sin"],
  ["expAnalysisEntries", "exp"],
  ["logAnalysisEntries", "log"],
  ["sqrtAnalysisEntries", "sqrt"],
  ["hyperbolaAnalysisEntries", "hyperbola"],
  ["hyperbola2AnalysisEntries", "hyperbola2"],
] as const;

function regressionPointData(value: unknown): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  const key = String(value.key ?? "").trim();
  let x = finite(value.x);
  let y = finite(value.y);
  if (x === undefined || y === undefined) {
    const point = pointPosition(
      isRecord(value.point) ? value.point : value,
    );
    x ??= point?.x;
    y ??= point?.y;
  }
  return key && x !== undefined && y !== undefined
    ? cloneRecord({ key, x, y })
    : undefined;
}

function regressionPointList(value: unknown): JsonValue[] {
  if (!Array.isArray(value)) return [];
  const result: JsonValue[] = [];
  for (const point of value) {
    const projected = regressionPointData(point);
    if (!projected) {
      throw new Error("Ein Regression-Punkt ist nicht sicher kopierbar.");
    }
    result.push(projected);
  }
  return result;
}

function regressionPanelScale(panel: unknown): number {
  if (!isRecord(panel)) return 0.55;
  const style = isRecord(panel.style) ? panel.style : undefined;
  const transform = String(style?.transform ?? "");
  const parsed = /scale\(([-+0-9.eE]+)\)/.exec(transform);
  return finite(parsed?.[1]) ?? 0.55;
}

function regressionPanelMinimized(panel: unknown): boolean {
  if (!isRecord(panel)) return false;
  try {
    const query = method(panel, "querySelector");
    const mini = query
      ? Reflect.apply(query, panel, [".lia-plot-analysis-mini-wrap"])
      : undefined;
    if (!isRecord(mini)) return false;
    const style = isRecord(mini.style) ? mini.style : undefined;
    return String(style?.display ?? "").toLowerCase() !== "none";
  } catch {
    return false;
  }
}

function liveRegressionAnalyses(state: LiveRecord): JsonRecord[] {
  const result: JsonRecord[] = [];
  let fallbackOrder = 0;
  for (const [listName, fallbackClass] of REGRESSION_ANALYSIS_GROUPS) {
    const entries = Array.isArray(state[listName]) ? state[listName] : [];
    for (const value of entries) {
      if (!isRecord(value)) {
        throw new Error("Eine Regression-Analyse ist nicht sicher kopierbar.");
      }
      fallbackOrder += 1;
      const parsedOrder = finite(String(value.id ?? "").split("-").pop());
      const model = cloneJson(value.model ?? {});
      const probabilities = cloneJson(value.classProbabilities);
      const linkedModels = cloneJson(value.linkedModels);
      if (model === undefined) {
        throw new Error("Ein Regression-Modell ist nicht sicher kopierbar.");
      }
      result.push(cloneRecord({
        id: String(value.id ?? ""),
        classKey: String(value.classKey ?? fallbackClass),
        title: String(value.title ?? ""),
        color: String(value.color ?? state.drawColor ?? "#ff0000"),
        model,
        ...(probabilities !== undefined
          ? { classProbabilities: probabilities }
          : {}),
        ...(linkedModels !== undefined ? { linkedModels } : {}),
        overlayScale: regressionPanelScale(value.panel),
        minimized: regressionPanelMinimized(value.panel),
        order: parsedOrder ?? fallbackOrder,
      }));
    }
  }
  return result.sort(
    (left, right) => Number(left.order ?? 0) - Number(right.order ?? 0),
  );
}

function regressionSnapshotFromLive(
  state: LiveRecord,
  boardId: string,
  stored: unknown,
): JsonRecord {
  const previous = isRecord(stored) ? stored : undefined;
  const drawingHistory = cloneJson({
    strokes: state.strokes ?? [],
    undoActions: state.undoActions ?? [],
    redoActions: state.redoActions ?? [],
  });
  if (drawingHistory === undefined) {
    throw new Error("Die Regression-Zeichenhistorie ist nicht sicher kopierbar.");
  }
  return cloneRecord({
    revision:
      finite(previous?.revision) ??
      finite(state.restoredSnapshotRevision) ??
      0,
    boardId,
    drawColor: String(state.drawColor ?? "#ff0000"),
    drawColorMenuOpen: state.drawColorMenuOpen === true,
    toolsMenuOpen: state.toolsMenuOpen === true,
    activeTool: String(state.activeTool ?? ""),
    regressionMode: String(state.regressionMode ?? ""),
    drawingHistory,
    regressionPoints: regressionPointList(state.regressionPoints),
    autoCreatedPointsData: regressionPointList(
      state.autoCreatedPointsData,
    ),
    analysisSeq: Math.max(0, finite(state.analysisSeq) ?? 0),
    analyses: liveRegressionAnalyses(state),
  });
}

function liveRegressionSnapshots(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): JsonRecord {
  const result: JsonRecord = {};
  const { globals } = runtime;
  const snapshots = isRecord(globals.__liaRegressionSnapshots)
    ? globals.__liaRegressionSnapshots
    : undefined;
  for (const [key, value] of Object.entries(snapshots ?? {})) {
    const snapshot = isRecord(value) ? value : undefined;
    if (key !== `board:${boardId}` && String(snapshot?.boardId ?? "") !== boardId) {
      continue;
    }
    const cloned = cloneJson(value);
    if (cloned !== undefined) result[key] = cloned;
  }
  const states = isRecord(globals.__liaRegressionStates)
    ? globals.__liaRegressionStates
    : undefined;
  for (const value of Object.values(states ?? {})) {
    if (
      !isRecord(value) ||
      String(value.boardId ?? "") !== boardId ||
      value.board !== runtime.board
    ) {
      continue;
    }
    const key = `board:${boardId}`;
    result[key] = regressionSnapshotFromLive(value, boardId, result[key]);
    break;
  }
  return result;
}

function liveRegressionUids(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): string[] {
  const states = isRecord(runtime.globals.__liaRegressionStates)
    ? runtime.globals.__liaRegressionStates
    : undefined;
  return Object.entries(states ?? {})
    .filter(
      ([, value]) =>
        isRecord(value) &&
        String(value.boardId ?? "") === boardId &&
        value.board === runtime.board,
    )
    .map(([uid]) => uid)
    .sort();
}

function tableValues(value: unknown): Array<{ x: string; y: string }> {
  const source = isRecord(value) && Array.isArray(value.values)
    ? value.values
    : Array.isArray(value)
      ? value
      : [];
  return source.map((entry) => {
    const cell = isRecord(entry) ? entry : {};
    return {
      x: String(cell.x ?? ""),
      y: String(cell.y ?? ""),
    };
  });
}

function liveTableStates(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): Record<string, CoordinateTableMacroState> {
  const result: Record<string, CoordinateTableMacroState> = {};
  const states = isRecord(runtime.globals.__tableStates)
    ? runtime.globals.__tableStates
    : undefined;
  for (const [uid, value] of Object.entries(states ?? {})) {
    if (!isRecord(value) || String(value.boardId ?? "") !== boardId) continue;
    let data: unknown = value;
    try {
      data = call(runtime.globals, "getTableData", [uid]) ?? value;
    } catch {
      data = value;
    }
    result[uid] = {
      uid,
      boardId,
      values: tableValues(data),
      cellWidths: cloneRecord(value.cellWidths),
    };
  }
  return result;
}

function livePlotInputStates(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): Record<string, CoordinatePlotInputMacroState> {
  const result: Record<string, CoordinatePlotInputMacroState> = {};
  const states = isRecord(runtime.globals.__plotInputStates)
    ? runtime.globals.__plotInputStates
    : undefined;
  for (const [uid, value] of Object.entries(states ?? {})) {
    if (!isRecord(value) || String(value.boardId ?? "") !== boardId) continue;
    result[uid] = {
      uid,
      boardId,
      raw: String(value.raw ?? ""),
      plotted:
        Boolean(value.graph) &&
        (!isRecord(value.graph) || value.graph.board === runtime.board),
    };
  }
  return result;
}

function liveSliderStates(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): Record<string, CoordinateSliderMacroState> {
  const result: Record<string, CoordinateSliderMacroState> = {};
  const entries = isRecord(runtime.globals.__sliderEntries)
    ? runtime.globals.__sliderEntries
    : undefined;
  for (const [key, value] of Object.entries(entries ?? {})) {
    if (!isRecord(value) || String(value.boardId ?? "") !== boardId) continue;
    const slider = isRecord(value.slider) ? value.slider : undefined;
    if (
      !slider ||
      slider.board !== runtime.board ||
      slider.__liaDgsSliderDeleted === true
    ) {
      continue;
    }
    const readValue = method(slider, "Value");
    let current: number | undefined;
    try {
      current = readValue
        ? finite(Reflect.apply(readValue, slider, []))
        : finite(slider.__liaDgsSliderValue);
    } catch {
      current = undefined;
    }
    const uid = String(value.uid ?? "").trim();
    const name = String(value.name ?? "").trim();
    if (current === undefined || !uid || !name) continue;
    const first = pointPosition(slider.point1);
    const second = pointPosition(slider.point2);
    result[key] = {
      uid,
      boardId,
      name,
      value: current,
      ...(first && second ? { points: [first, second] as const } : {}),
    };
  }
  return result;
}

function flushDgs(runtime: CoordinateMacroRuntime, boardId: string): void {
  try {
    call(runtime.globals, "__persistDgsBoardState", [boardId, false]);
  } catch {
    // A board without @DGS legitimately has no persistence controller.
  }
}

function readMacroState(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): CoordinateMacroState {
  flushDgs(runtime, boardId);
  const dgsStore = isRecord(runtime.globals.__dgsConstructionStates)
    ? runtime.globals.__dgsConstructionStates
    : undefined;
  const hadDgsSnapshot = Boolean(dgsStore && hasOwn(dgsStore, boardId));
  const dgsSnapshot = hadDgsSnapshot ? cloneJson(dgsStore?.[boardId]) : undefined;
  if (hadDgsSnapshot && dgsSnapshot === undefined) {
    throw new Error("Der DGS-Makrozustand ist nicht sicher kopierbar.");
  }
  const dgsBoards = isRecord(runtime.globals.__dgsConstructionBoards)
    ? runtime.globals.__dgsConstructionBoards
    : undefined;
  if (hadDgsSnapshot && dgsBoards?.[boardId] !== runtime.board) {
    throw new Error("Der DGS-Controller des Coordinate-Boards ist noch nicht bereit.");
  }

  return Object.freeze({
    boardId,
    boardState: liveBoardState(runtime, boardId),
    pointStates: scopedBucket(runtime.globals, "__pointStates", boardId),
    pointGraphStates: scopedBucket(
      runtime.globals,
      "__pointGraphStates",
      boardId,
    ),
    hadDgsSnapshot,
    ...(dgsSnapshot !== undefined ? { dgsSnapshot } : {}),
    scharStates: liveScharStates(runtime.globals, boardId),
    regressionSnapshots: liveRegressionSnapshots(runtime, boardId),
    regressionUids: liveRegressionUids(runtime, boardId),
    sliderStates: liveSliderStates(runtime, boardId),
    tableStates: liveTableStates(runtime, boardId),
    plotInputStates: livePlotInputStates(runtime, boardId),
  });
}

export function captureCoordinateMacroState(
  runtime: CoordinateMacroRuntime,
  boardId: string,
  requirements: CoordinateMacroRequirements = {},
): CoordinateMacroState {
  const state = readMacroState(runtime, boardId);
  if (requirements.requireDgs && !state.hadDgsSnapshot) {
    throw new Error("Der DGS-Makrozustand ist noch nicht bereit.");
  }
  if (
    requirements.requireSchar &&
    Object.keys(state.scharStates).length === 0
  ) {
    throw new Error("Der Schar-Makrozustand ist noch nicht bereit.");
  }
  if (requirements.requireRegression && state.regressionUids.length === 0) {
    throw new Error("Der Regression-Makrozustand ist noch nicht bereit.");
  }
  const missingSchar = (requirements.scharUids ?? []).filter(
    (uid) => {
      if (!hasOwn(state.scharStates, `${uid}::${boardId}`)) return true;
      const entries = isRecord(runtime.globals.__scharEntries)
        ? runtime.globals.__scharEntries
        : undefined;
      return !Object.values(entries ?? {}).some(
        (value) =>
          isRecord(value) &&
          String(value.uid ?? "") === uid &&
          String(value.boardId ?? "") === boardId &&
          value.board === runtime.board,
      );
    },
  );
  if (missingSchar.length > 0) {
    throw new Error("Der Schar-Makrozustand ist noch nicht vollständig bereit.");
  }
  const sliderUids = new Set(
    Object.values(state.sliderStates).map((entry) => entry.uid),
  );
  if ((requirements.sliderUids ?? []).some((uid) => !sliderUids.has(uid))) {
    throw new Error("Der Slider-Makrozustand ist noch nicht vollständig bereit.");
  }
  if (
    (requirements.tableUids ?? []).some(
      (uid) => !hasOwn(state.tableStates, uid),
    )
  ) {
    throw new Error("Der Tabellen-Makrozustand ist noch nicht vollständig bereit.");
  }
  if (
    (requirements.plotInputUids ?? []).some(
      (uid) => !hasOwn(state.plotInputStates, uid),
    )
  ) {
    throw new Error("Der PlotInput-Makrozustand ist noch nicht vollständig bereit.");
  }
  if (
    (requirements.pointNames ?? []).some(
      (name) => !hasOwn(state.pointStates, name),
    )
  ) {
    throw new Error("Der Punkt-Makrozustand ist noch nicht vollständig bereit.");
  }
  if ((requirements.dgsMacroKeys ?? []).length > 0) {
    const snapshot = isRecord(state.dgsSnapshot) ? state.dgsSnapshot : undefined;
    const records = Array.isArray(snapshot?.records) ? snapshot.records : [];
    const keys = new Set(
      records.flatMap((record) =>
        isRecord(record)
          ? [String(record.id ?? ""), String(record.macroKey ?? "")]
          : [],
      ),
    );
    if ((requirements.dgsMacroKeys ?? []).some((key) => !keys.has(key))) {
      throw new Error("Der authored DGS-Makrozustand ist noch nicht vollständig bereit.");
    }
    if (
      (requirements.dgsMacroKeyPrefixes ?? []).some(
        (prefix) => !Array.from(keys).some((key) => key.startsWith(prefix)),
      )
    ) {
      throw new Error("Die authored DGS-Makroobjekte sind noch nicht vollständig bereit.");
    }
  } else if ((requirements.dgsMacroKeyPrefixes ?? []).length > 0) {
    const snapshot = isRecord(state.dgsSnapshot) ? state.dgsSnapshot : undefined;
    const records = Array.isArray(snapshot?.records) ? snapshot.records : [];
    const keys = records.flatMap((record) =>
      isRecord(record)
        ? [String(record.id ?? ""), String(record.macroKey ?? "")]
        : [],
    );
    if (
      (requirements.dgsMacroKeyPrefixes ?? []).some(
        (prefix) => !keys.some((key) => key.startsWith(prefix)),
      )
    ) {
      throw new Error("Die authored DGS-Makroobjekte sind noch nicht vollständig bereit.");
    }
  }
  return state;
}

function replaceBoardBucket(
  globals: LiveRecord,
  storeName: string,
  boardId: string,
  value: JsonRecord,
): void {
  recordStore(globals, storeName)[boardId] = cloneRecord(value);
}

function replaceScopedStore(
  globals: LiveRecord,
  storeName: string,
  belongsToBoard: (key: string, value: unknown) => boolean,
  replacement: JsonRecord,
): void {
  const store = recordStore(globals, storeName);
  for (const [key, value] of Object.entries(store)) {
    if (belongsToBoard(key, value)) delete store[key];
  }
  for (const [key, value] of Object.entries(replacement)) {
    const cloned = cloneJson(value);
    if (cloned !== undefined) store[key] = cloned;
  }
}

function seedMacroStores(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const { globals } = runtime;
  const boardStore = boardStateStore(globals);
  boardStore[state.boardId] = cloneRecord(state.boardState);
  if (isRecord(globals.__coordBoardStates) && globals.__coordBoardStates !== boardStore) {
    globals.__coordBoardStates[state.boardId] = cloneRecord(state.boardState);
  }

  replaceBoardBucket(
    globals,
    "__pointStates",
    state.boardId,
    state.pointStates,
  );
  replaceBoardBucket(
    globals,
    "__pointGraphStates",
    state.boardId,
    state.pointGraphStates,
  );

  replaceScopedStore(
    globals,
    "__liaScharStateStore",
    (key) => key.endsWith(`::${state.boardId}`),
    state.scharStates,
  );
  replaceScopedStore(
    globals,
    "__liaRegressionSnapshots",
    (key, value) =>
      key === `board:${state.boardId}` ||
      (isRecord(value) && String(value.boardId ?? "") === state.boardId),
    state.regressionSnapshots,
  );
}

function restoreBoard(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const sizeMode = String(state.boardState.sizeMode ?? "auto");
  const bbox =
    (sizeMode === "manual"
      ? validBoundingBox(state.boardState.bbox)
      : validBoundingBox(state.boardState.exportBBox)) ??
    validBoundingBox(state.boardState.bbox) ??
    validBoundingBox(state.boardState.exportBBox);
  if (!bbox) throw new Error("Der gespeicherte Coordinate-Viewport ist ungültig.");

  const width = finite(state.boardState.width);
  const height = finite(state.boardState.height);
  runtime.board.__restoreLockUntil = Date.now() + 800;
  runtime.board.__coordSizeMode = sizeMode;
  runtime.board.__coordMaxStartWidth = state.boardState.maxStartWidth;
  runtime.board.__manualWidth = sizeMode === "manual" ? width ?? null : null;
  runtime.board.__manualHeight = sizeMode === "manual" ? height ?? null : null;
  runtime.board.__coordExportBBox = (
    validBoundingBox(state.boardState.exportBBox) ?? bbox
  ).slice();
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    try {
      runtime.board.resizeContainer?.(width, height, false, true);
    } catch {
      // The upstream restore helper still restores the viewport below.
    }
  }

  const api = coordinateApi(runtime.globals);
  try {
    if (method(api, "restoreSavedBoardState")) {
      call(api, "restoreSavedBoardState", [
        runtime.board,
        bbox.slice(),
        state.boardId,
      ]);
    } else {
      runtime.board.setBoundingBox?.(bbox.slice(), true);
    }
  } catch {
    runtime.board.setBoundingBox?.(bbox.slice(), true);
  }
  runtime.board.setBoundingBox?.(bbox.slice(), true);
  runtime.board.update?.();

  // Bounding-box and resize handlers persist asynchronously. Keep their
  // source of truth on the immutable macro state as well as on the live board.
  boardStateStore(runtime.globals)[state.boardId] = cloneRecord(state.boardState);
}

function firstSpecValue(spec: unknown): string {
  let value = String(spec ?? "").trim();
  if (
    value.length >= 2 &&
    ((value.startsWith("`") && value.endsWith("`")) ||
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  let first = String(value.split(";")[0] ?? "")
    .trim()
    .replace(/^id\s*=\s*/i, "")
    .trim();
  if (
    first.length >= 2 &&
    ((first.startsWith("`") && first.endsWith("`")) ||
      (first.startsWith("'") && first.endsWith("'")) ||
      (first.charCodeAt(0) === 34 && first.charCodeAt(first.length - 1) === 34))
  ) {
    first = first.slice(1, -1).trim();
  }
  return first;
}

function dgsSpecElements(
  runtime: CoordinateMacroRuntime,
  boardId: string,
): HTMLElement[] {
  try {
    return Array.from(
      runtime.view.document?.querySelectorAll<HTMLElement>(
        "[id^='dgs-ui-'][data-spec]",
      ) ?? [],
    ).filter((node) => firstSpecValue(node.dataset.spec) === boardId);
  } catch {
    return [];
  }
}

function clickElement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const click = method(value, "click");
  if (!click) return false;
  Reflect.apply(click, value, []);
  return true;
}

function elementDataMode(value: unknown): string {
  return isRecord(value) && isRecord(value.dataset)
    ? String(value.dataset.mode ?? "")
    : "";
}

function restoreDgsViewModes(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const zoomMode = String(state.boardState.zoomMode ?? "");
  const zoomModes = ["both", "vertical", "horizontal"];
  if (zoomModes.includes(zoomMode)) {
    const container = runtime.board.containerObj;
    const button = container?.querySelector?.(".lia-dgs-zoom-mode-button");
    if (state.hadDgsSnapshot && runtime.view.document && !button) {
      throw new Error("Der DGS-Zoomcontroller ist nicht verfügbar.");
    }
    let current = elementDataMode(button) ||
      String(runtime.board.__liaDgsZoomMode ?? "");
    for (let attempts = 0; current !== zoomMode && attempts < 3; attempts += 1) {
      if (!clickElement(button)) break;
      current = elementDataMode(button) ||
        String(runtime.board.__liaDgsZoomMode ?? "");
    }
    if (button && current !== zoomMode) {
      throw new Error("Der DGS-Zoommodus wurde nicht live wiederhergestellt.");
    }
    runtime.board.__liaDgsZoomMode = zoomMode;
  }

  const axisScaleMode = String(state.boardState.axisScaleMode ?? "");
  const axisModes = ["cartesian", "log-x", "log-y", "log-log"];
  if (axisModes.includes(axisScaleMode)) {
    const mainButton = runtime.board.containerObj?.querySelector?.(
      ".lia-dgs-axis-scale-button",
    );
    const controlledId = mainButton?.getAttribute?.("aria-controls") ?? "";
    const marker = dgsSpecElements(runtime, state.boardId)[0];
    const uid = marker?.id.replace(/^dgs-ui-/, "") ?? "";
    const menuId = controlledId || (uid ? `dgs-axis-scale-submenu-${uid}` : "");
    const containerMenu = runtime.board.containerObj?.querySelector?.(
      ".lia-dgs-axis-scale-submenu",
    );
    const menu = containerMenu ?? (menuId ? specElement(runtime, menuId) : undefined);
    if (state.hadDgsSnapshot && runtime.view.document && (!menu || !mainButton)) {
      throw new Error("Der DGS-Achsenskalierungscontroller ist nicht verfügbar.");
    }
    let current = elementDataMode(mainButton) ||
      String(runtime.board.__liaDgsAxisScaleMode ?? "");
    if (current !== axisScaleMode && menu) {
      const buttons = Array.from(
        menu.querySelectorAll<HTMLElement>("[role='menuitemradio']"),
      );
      clickElement(buttons[axisModes.indexOf(axisScaleMode)]);
      current = elementDataMode(mainButton) ||
        String(runtime.board.__liaDgsAxisScaleMode ?? "");
    }
    if (mainButton && current !== axisScaleMode) {
      throw new Error("Die DGS-Achsenskalierung wurde nicht live wiederhergestellt.");
    }
    runtime.board.__liaDgsAxisScaleMode = axisScaleMode;
  }

  boardStateStore(runtime.globals)[state.boardId] = cloneRecord(state.boardState);
}

function restorePointPositions(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const bucket = isRecord(runtime.globals.__points)
    ? runtime.globals.__points[state.boardId]
    : undefined;
  if (!isRecord(bucket)) return;
  for (const [name, value] of Object.entries(state.pointStates)) {
    if (!isRecord(value)) continue;
    const x = finite(value.x);
    const y = finite(value.y);
    const point = isRecord(bucket[name]) ? bucket[name] : undefined;
    if (!point || x === undefined || y === undefined) continue;
    try {
      const moveTo = method(point, "moveTo");
      if (moveTo) Reflect.apply(moveTo, point, [[x, y], 0]);
    } catch {
      // A removed macro point will be recreated by the next bootstrap pass.
    }
  }
}

function restoreSliders(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const entries = isRecord(runtime.globals.__sliderEntries)
    ? runtime.globals.__sliderEntries
    : undefined;
  for (const [key, saved] of Object.entries(state.sliderStates)) {
    const candidates = [entries?.[key], ...Object.values(entries ?? {})];
    const entry = candidates.find(
      (value) =>
        isRecord(value) &&
        String(value.uid ?? "") === saved.uid &&
        String(value.boardId ?? "") === saved.boardId &&
        String(value.name ?? "") === saved.name,
    );
    if (!isRecord(entry) || !isRecord(entry.slider)) continue;
    const slider = entry.slider;
    if (slider.board !== runtime.board) continue;
    try {
      const setValue = method(slider, "setValue");
      if (setValue) Reflect.apply(setValue, slider, [saved.value]);
      slider.__liaDgsSliderValue = saved.value;
      if (saved.points) {
        for (const [point, position] of [
          [slider.point1, saved.points[0]],
          [slider.point2, saved.points[1]],
        ] as const) {
          if (!isRecord(point)) continue;
          const moveTo = method(point, "moveTo");
          if (moveTo) {
            Reflect.apply(moveTo, point, [[position.x, position.y], 0]);
          }
        }
      }
    } catch {
      // A late slider is handled by the following reset pass.
    }
  }
}

function restoreScharPanels(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const entries = isRecord(runtime.globals.__scharEntries)
    ? runtime.globals.__scharEntries
    : undefined;
  for (const [key, savedValue] of Object.entries(state.scharStates)) {
    if (!isRecord(savedValue)) continue;
    const separator = key.indexOf("::");
    const uid = separator >= 0 ? key.slice(0, separator) : key;
    const entry = Object.values(entries ?? {}).find(
      (value) =>
        isRecord(value) &&
        String(value.uid ?? "") === uid &&
        String(value.boardId ?? "") === state.boardId,
    );
    if (!isRecord(entry)) continue;
    entry.values = cloneRecord(savedValue.values);
    entry.panelScale = finite(savedValue.panelScale) ?? 0.55;
    entry.panelMinimized = savedValue.panelMinimized === true;
    entry.termVisible = savedValue.termVisible === true;
    const panel = isRecord(entry.panel) ? entry.panel : undefined;
    const style = isRecord(panel?.style) ? panel.style : undefined;
    if (style) {
      style.transformOrigin = "top left";
      style.transform = `scale(${entry.panelScale})`;
    }
  }
}

function specElement(
  runtime: CoordinateMacroRuntime,
  id: string,
): HTMLElement | undefined {
  try {
    const node = runtime.view.document?.getElementById(id);
    return node ?? undefined;
  } catch {
    return undefined;
  }
}

function restoreTargetScharRenderer(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const render = method(runtime.globals, "renderScharFromSpec");
  if (!render) return;
  for (const key of Object.keys(state.scharStates)) {
    const separator = key.indexOf("::");
    const uid = separator >= 0 ? key.slice(0, separator) : key;
    const node = specElement(runtime, `schar-spec-${uid}`);
    const spec = String(node?.dataset.spec ?? "");
    if (!uid || !spec) continue;
    Reflect.apply(render, runtime.view, [uid, spec]);
  }
}

function restoreTargetSliderRenderers(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
  recreateDeleted: boolean,
): void {
  const render = method(runtime.globals, "renderSliderFromSpec");
  if (!render) return;
  const entries = isRecord(runtime.globals.__sliderEntries)
    ? runtime.globals.__sliderEntries
    : undefined;
  const rendered = new Set<string>();
  for (const saved of Object.values(state.sliderStates)) {
    if (rendered.has(saved.uid)) continue;
    rendered.add(saved.uid);
    if (recreateDeleted && entries) {
      for (const [key, value] of Object.entries(entries)) {
        if (
          isRecord(value) &&
          String(value.uid ?? "") === saved.uid &&
          String(value.boardId ?? "") === state.boardId &&
          isRecord(value.slider) &&
          value.slider.__liaDgsSliderDeleted === true
        ) {
          delete entries[key];
        }
      }
    }
    const node = specElement(runtime, `slider-spec-${saved.uid}`);
    const spec = String(node?.dataset.spec ?? "");
    if (!spec) continue;
    Reflect.apply(render, runtime.view, [
      saved.uid,
      spec,
      String(node?.dataset.language ?? "de"),
    ]);
  }
}

function restoreTargetStaticPointRenderers(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  if (!isRecord(state.dgsSnapshot) || !Array.isArray(state.dgsSnapshot.records)) {
    return;
  }
  const liveKeys = new Set<string>();
  for (const object of liveBoardObjectSet(runtime.board)) {
    liveKeys.add(String(object.__liaDgsMacroKey ?? ""));
    liveKeys.add(String(object.__liaDgsPersistentId ?? ""));
  }
  const render = method(runtime.globals, "renderStaticPointFromSpec");
  if (!render) return;
  for (const record of state.dgsSnapshot.records) {
    if (!isRecord(record)) continue;
    const key = String(record.macroKey || record.id || "");
    const match = /^macro:point:(.+)$/.exec(key);
    if (!match || liveKeys.has(key)) continue;
    const uid = match[1];
    const node = specElement(runtime, `point-spec-${uid}`);
    const spec = String(node?.dataset.spec ?? "");
    if (!spec) continue;
    Reflect.apply(render, runtime.globals, [uid, spec]);
  }
}

function restoreTables(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const store = isRecord(runtime.globals.__tableStates)
    ? runtime.globals.__tableStates
    : undefined;
  for (const [uid, saved] of Object.entries(state.tableStates)) {
    const live = isRecord(store?.[uid]) ? store[uid] : undefined;
    if (!live || String(live.boardId ?? "") !== state.boardId) continue;
    const values = saved.values.map((value) => ({
      x: value.x,
      y: value.y,
    }));
    live.values = values;
    live.cols = values.length;
    live.cellWidths = cloneRecord(saved.cellWidths);
    try {
      call(runtime.globals, "setTableValues", [uid, values]);
      const root = specElement(runtime, `lia-table-${uid}`);
      const render = method(runtime.globals, "renderTableFromSpec");
      if (root && render && Object.keys(saved.cellWidths).length > 0) {
        Reflect.apply(render, runtime.view, [
          uid,
          String(root.dataset.spec ?? live.spec ?? ""),
          true,
        ]);
      }
    } catch {
      // A late table is handled by the following reset pass.
    }
  }
}

function restorePlotInputs(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const states = isRecord(runtime.globals.__plotInputStates)
    ? runtime.globals.__plotInputStates
    : undefined;
  const instances = isRecord(runtime.globals.__plotInputInstances)
    ? runtime.globals.__plotInputInstances
    : undefined;
  const api = isRecord(runtime.globals.__plotInput)
    ? runtime.globals.__plotInput
    : undefined;
  for (const [uid, saved] of Object.entries(state.plotInputStates)) {
    const live = isRecord(states?.[uid]) ? states[uid] : undefined;
    if (!live || String(live.boardId ?? "") !== state.boardId) continue;
    try {
      call(api, "removePlotObjects", [runtime.board, live]);
      live.raw = saved.raw;
      const instance = isRecord(instances?.[uid]) ? instances[uid] : undefined;
      const input = instance?.input;
      if (isRecord(input) && "value" in input) input.value = saved.raw;
      if (saved.plotted) {
        const plot = method(api, "plotIntoBoard");
        if (!plot) {
          throw new Error("Der PlotInput-Renderer ist nicht verfügbar.");
        }
        Reflect.apply(plot, api, [runtime.board, live, saved.raw]);
      }
    } catch {
      // Verifikation meldet einen nicht wiederherstellbaren PlotInput.
    }
  }
}

function setupTargetRegression(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  const setup = method(runtime.globals, "__setupRegressionUI");
  if (!setup) {
    throw new Error("Der Regression-Renderer ist nicht verfügbar.");
  }
  const dgsMarkers = dgsSpecElements(runtime, state.boardId);
  for (const uid of state.regressionUids) {
    const explicit = specElement(runtime, `regression-ui-${uid}`);
    const dgsUid = uid.startsWith("dgs-regression-")
      ? uid.slice("dgs-regression-".length)
      : "";
    const dgsMarker = dgsUid
      ? dgsMarkers.find((node) => node.id === `dgs-ui-${dgsUid}`)
      : undefined;
    const spec = String(explicit?.dataset.spec ?? state.boardId);
    const language = String(
      explicit?.dataset.language ?? dgsMarker?.dataset.language ?? "de",
    );
    Reflect.apply(setup, runtime.globals, [uid, spec, language]);
  }

  if (state.regressionUids.some((uid) => uid.startsWith("dgs-regression-"))) {
    const setupDgs = method(runtime.globals, "__setupDGS");
    if (!setupDgs || dgsMarkers.length === 0) return;
    for (const marker of dgsMarkers) {
      const uid = marker.id.replace(/^dgs-ui-/, "");
      const spec = String(marker.dataset.spec ?? "");
      if (!uid || !spec) continue;
      Reflect.apply(setupDgs, runtime.globals, [
        uid,
        spec,
        String(marker.dataset.language ?? "de"),
      ]);
    }
  }
}

function restoreRegression(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  if (state.regressionUids.length === 0) return;
  const currentUids = liveRegressionUids(runtime, state.boardId);
  const currentSnapshots = liveRegressionSnapshots(runtime, state.boardId);
  if (
    sameJson(currentUids, state.regressionUids) &&
    sameJson(currentSnapshots, state.regressionSnapshots)
  ) {
    return;
  }

  const key = `board:${state.boardId}`;
  const snapshot = state.regressionSnapshots[key];
  if (snapshot === undefined) {
    throw new Error("Der Regression-Makrozustand ist beschädigt.");
  }
  const snapshots = recordStore(runtime.globals, "__liaRegressionSnapshots");
  const states = isRecord(runtime.globals.__liaRegressionStates)
    ? runtime.globals.__liaRegressionStates
    : undefined;
  const descriptor = Object.getOwnPropertyDescriptor(snapshots, key);
  try {
    Object.defineProperty(snapshots, key, {
      value: cloneJson(snapshot),
      writable: false,
      enumerable: true,
      configurable: true,
    });
    for (const uid of state.regressionUids) {
      const live = isRecord(states?.[uid]) ? states[uid] : undefined;
      if (!live || String(live.boardId ?? "") !== state.boardId) continue;
      call(isRecord(live.drawLayer) ? live.drawLayer : undefined, "remove");
    }
    withRestoreFlag(runtime.globals, () => {
      setupTargetRegression(runtime, state);
    });
  } finally {
    Object.defineProperty(snapshots, key, {
      value: cloneJson(snapshot),
      writable: true,
      enumerable: descriptor?.enumerable ?? true,
      configurable: descriptor?.configurable ?? true,
    });
  }
}

function liveBoardObjectSet(board: CoordinateMacroBoard): Set<LiveRecord> {
  const result = new Set<LiveRecord>();
  if (Array.isArray(board.objectsList)) {
    for (const value of board.objectsList) {
      if (isRecord(value)) result.add(value);
    }
  }
  if (isRecord(board.objects)) {
    for (const value of Object.values(board.objects)) {
      if (isRecord(value)) result.add(value);
    }
  }
  return result;
}

function isMacroManagedBoardObject(value: LiveRecord): boolean {
  if (value.__liaDgsDesignOwner || value.__liaDgsTraceMarker === true) {
    return false;
  }
  return (
    value.__liaDgsMacroManaged === true ||
    String(value.__liaDgsMacroKey ?? "").startsWith("macro:") ||
    String(value.__liaDgsPersistentId ?? "").startsWith("macro:") ||
    finite(value.__liaMacroSourceLayer) !== undefined
  );
}

const MACRO_OWNED_SINGLE_CHILDREN = [
  "label",
  "arc",
  "dot",
  "__liaDgsMeasurementLabel",
  "__liaDgsAngleLabel",
  "__liaDgsCircleLabel",
  "__liaDgsCircleNameLabel",
  "__liaDgsCircleMeasurementLabel",
  "__liaDgsFunctionLabel",
  "__liaDgsArcLabel",
  "__liaDgsPolygonBorderLabel",
  "__liaDgsTangentPoint",
  "__liaDgsTangentHelper",
] as const;

const MACRO_OWNED_ARRAY_CHILDREN = [
  "borders",
  "__liaDgsPolygonBorders",
] as const;

function addOwnedBoardObject(
  value: unknown,
  candidates: ReadonlySet<LiveRecord>,
  result: Set<LiveRecord>,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) addOwnedBoardObject(entry, candidates, result);
    return;
  }
  if (isRecord(value) && candidates.has(value)) result.add(value);
}

function macroManagedBoardObjects(
  board: CoordinateMacroBoard,
): Set<LiveRecord> {
  const candidates = liveBoardObjectSet(board);
  const result = new Set(
    Array.from(candidates).filter(isMacroManagedBoardObject),
  );
  let previousSize = -1;
  while (previousSize !== result.size) {
    previousSize = result.size;
    for (const object of Array.from(result)) {
      for (const property of MACRO_OWNED_SINGLE_CHILDREN) {
        addOwnedBoardObject(object[property], candidates, result);
      }
      for (const property of MACRO_OWNED_ARRAY_CHILDREN) {
        addOwnedBoardObject(object[property], candidates, result);
      }
      if (
        object.__liaDgsSlider === true ||
        object.__liaMacroSlider === true ||
        String(object.elType ?? "").toLowerCase() === "slider"
      ) {
        for (const property of ["baseline", "highline", "point1", "point2"]) {
          addOwnedBoardObject(object[property], candidates, result);
        }
      }
    }
    for (const candidate of candidates) {
      if (
        (isRecord(candidate.__liaDgsOwner) &&
          result.has(candidate.__liaDgsOwner)) ||
        (isRecord(candidate.__liaDgsSliderOwner) &&
          result.has(candidate.__liaDgsSliderOwner)) ||
        (isRecord(candidate.__liaDgsPolygonBorderOwner) &&
          result.has(candidate.__liaDgsPolygonBorderOwner))
      ) {
        result.add(candidate);
      }
    }
  }
  return result;
}

function withProtectedMacroObjects<T>(
  runtime: CoordinateMacroRuntime,
  boardId: string,
  callback: () => T,
): T {
  const protectedObjects = macroManagedBoardObjects(runtime.board);
  if (protectedObjects.size === 0) return callback();
  const originalRemove = runtime.board.removeObject;
  if (typeof originalRemove !== "function") {
    throw new Error("Das Coordinate-Board kann Makroobjekte nicht sicher schützen.");
  }

  const registry = isRecord(runtime.globals.__points)
    ? runtime.globals.__points
    : undefined;
  const bucket = isRecord(registry?.[boardId]) ? registry[boardId] : undefined;
  const pointAliases = Object.entries(bucket ?? {}).filter(
    ([, value]) => isRecord(value) && protectedObjects.has(value),
  );
  const tangentLinks = Array.from(protectedObjects)
    .filter((object) => object.__liaDgsTangent === true)
    .map((tangent) => ({
      tangent,
      source: isRecord(tangent.__liaDgsTangentSource)
        ? tangent.__liaDgsTangentSource
        : undefined,
    }));
  const ownDescriptor = Object.getOwnPropertyDescriptor(
    runtime.board,
    "removeObject",
  );
  const protectedRemove = function (
    this: CoordinateMacroBoard,
    object: unknown,
    ...args: unknown[]
  ): unknown {
    const requested = Array.isArray(object) ? object : [object];
    const removable = requested.filter(
      (value) => !isRecord(value) || !protectedObjects.has(value),
    );
    if (removable.length === 0) return this;
    const target = Array.isArray(object) ? removable : removable[0];
    return Reflect.apply(originalRemove, this, [target, ...args]);
  };

  try {
    Object.defineProperty(runtime.board, "removeObject", {
      value: protectedRemove,
      writable: true,
      enumerable: ownDescriptor?.enumerable ?? false,
      configurable: true,
    });
  } catch {
    throw new Error("Das Coordinate-Board kann Makroobjekte nicht sicher schützen.");
  }

  try {
    return callback();
  } finally {
    if (ownDescriptor) {
      Object.defineProperty(runtime.board, "removeObject", ownDescriptor);
    } else {
      delete runtime.board.removeObject;
    }
    if (pointAliases.length > 0) {
      const points = recordStore(runtime.globals, "__points");
      const liveBucket = isRecord(points[boardId])
        ? points[boardId]
        : (points[boardId] = {});
      for (const [name, point] of pointAliases) liveBucket[name] = point;
    }
    for (const object of protectedObjects) {
      if (object.__liaDgsSlider === true) {
        object.__liaDgsSliderDeleted = false;
      }
    }
    for (const { tangent, source } of tangentLinks) {
      if (!source) continue;
      const tangents = Array.isArray(source.__liaDgsTangents)
        ? source.__liaDgsTangents
        : [];
      if (!tangents.includes(tangent)) {
        source.__liaDgsTangents = [...tangents, tangent];
      }
    }
  }
}

function applyDgsSnapshot(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
): void {
  if (!state.hadDgsSnapshot) {
    delete recordStore(runtime.globals, "__dgsConstructionStates")[state.boardId];
    return;
  }
  const apply = method(runtime.globals, "__applyDgsHistory");
  const controllers = isRecord(runtime.globals.__dgsConstructionBoards)
    ? runtime.globals.__dgsConstructionBoards
    : undefined;
  if (
    !apply ||
    state.dgsSnapshot === undefined ||
    controllers?.[state.boardId] !== runtime.board
  ) {
    throw new Error("lia-coordinate stellt keinen vollständigen DGS-Reset bereit.");
  }
  const snapshot = cloneJson(state.dgsSnapshot);
  if (snapshot === undefined) throw new Error("Der DGS-Makrozustand ist beschädigt.");
  withProtectedMacroObjects(runtime, state.boardId, () => {
    Reflect.apply(apply, runtime.globals, [state.boardId, snapshot]);
  });
  const stored = isRecord(runtime.globals.__dgsConstructionStates)
    ? runtime.globals.__dgsConstructionStates[state.boardId]
    : undefined;
  if (
    controllers[state.boardId] !== runtime.board ||
    !sameJson(stored, snapshot)
  ) {
    throw new Error("Der DGS-Makrozustand wurde nicht live angewendet.");
  }
}

export function restoreCoordinateMacroState(
  runtime: CoordinateMacroRuntime,
  state: CoordinateMacroState,
  options: Readonly<{ applyDgs?: boolean }> = {},
): void {
  seedMacroStores(runtime, state);
  const applyDgs = options.applyDgs !== false;
  if (applyDgs) {
    applyDgsSnapshot(runtime, state);
    // DGS clears point registries while rebuilding its learner construction.
    // Re-seed the authored stores after the protected live apply as well.
    seedMacroStores(runtime, state);
  }
  restoreTargetStaticPointRenderers(runtime, state);
  restoreTargetScharRenderer(runtime, state);
  restoreTargetSliderRenderers(
    runtime,
    state,
    applyDgs && state.hadDgsSnapshot,
  );
  restorePointPositions(runtime, state);
  restoreSliders(runtime, state);
  restoreScharPanels(runtime, state);
  restoreTables(runtime, state);
  restorePlotInputs(runtime, state);
  restoreRegression(runtime, state);
  restoreBoard(runtime, state);
  restoreDgsViewModes(runtime, state);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonical(value[key])]),
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function sameNumber(left: unknown, right: unknown, tolerance = 1e-7): boolean {
  const a = finite(left);
  const b = finite(right);
  return a !== undefined && b !== undefined && Math.abs(a - b) <= tolerance;
}

function sameBoardView(left: JsonRecord, right: JsonRecord): boolean {
  const leftMode = String(left.sizeMode ?? "auto");
  const rightMode = String(right.sizeMode ?? "auto");
  const leftBox =
    validBoundingBox(left.exportBBox) ?? validBoundingBox(left.bbox);
  const rightBox =
    validBoundingBox(right.exportBBox) ?? validBoundingBox(right.bbox);
  if (
    !leftBox ||
    !rightBox ||
    !leftBox.every((value, index) => sameNumber(value, rightBox[index]))
  ) {
    return false;
  }
  if (leftMode !== rightMode) {
    return false;
  }
  if (leftMode === "manual") {
    for (const dimension of ["width", "height"] as const) {
      if (
        finite(left[dimension]) !== undefined &&
        finite(right[dimension]) !== undefined &&
        !sameNumber(left[dimension], right[dimension], 1)
      ) {
        return false;
      }
    }
  }
  for (const mode of ["zoomMode", "axisScaleMode"] as const) {
    const expected = String(right[mode] ?? "");
    if (expected && String(left[mode] ?? "") !== expected) return false;
  }
  return true;
}

function missingLiveDgsMacroObjects(
  runtime: CoordinateMacroRuntime,
  expected: CoordinateMacroState,
): string[] {
  if (!expected.hadDgsSnapshot || !isRecord(expected.dgsSnapshot)) return [];
  const records = Array.isArray(expected.dgsSnapshot.records)
    ? expected.dgsSnapshot.records
    : [];
  const expectedKeys = records
    .filter(
      (record) =>
        isRecord(record) &&
        (record.origin === "macro" ||
          Boolean(record.macroKey) ||
          String(record.id ?? "").startsWith("macro:")),
    )
    .map((record) =>
      isRecord(record)
        ? String(record.macroKey || record.id || "")
        : "",
    )
    .filter(Boolean);
  if (expectedKeys.length === 0) return [];
  const liveKeys = new Set<string>();
  for (const object of liveBoardObjectSet(runtime.board)) {
    for (const value of [
      object.__liaDgsMacroKey,
      object.__liaDgsPersistentId,
    ]) {
      const key = String(value ?? "");
      if (key) liveKeys.add(key);
    }
  }
  return expectedKeys.filter((key) => !liveKeys.has(key));
}

export function coordinateMacroStateMatches(
  runtime: CoordinateMacroRuntime,
  expected: CoordinateMacroState,
): boolean {
  return coordinateMacroStateMismatch(runtime, expected) === undefined;
}

export function coordinateMacroStateMismatch(
  runtime: CoordinateMacroRuntime,
  expected: CoordinateMacroState,
): string | undefined {
  let current: CoordinateMacroState;
  try {
    current = readMacroState(runtime, expected.boardId);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  const differences: string[] = [];
  if (!sameBoardView(current.boardState, expected.boardState)) {
    differences.push("Viewport/Boardgröße");
  }
  if (!sameJson(current.pointStates, expected.pointStates)) {
    differences.push("Punktzustände");
  }
  if (!sameJson(current.pointGraphStates, expected.pointGraphStates)) {
    differences.push("Punktgraphen");
  }
  if (
    current.hadDgsSnapshot !== expected.hadDgsSnapshot ||
    !sameJson(current.dgsSnapshot, expected.dgsSnapshot)
  ) {
    differences.push("DGS");
  }
  if (missingLiveDgsMacroObjects(runtime, expected).length > 0) {
    differences.push("DGS-Makroobjekte");
  }
  if (!sameJson(current.scharStates, expected.scharStates)) {
    differences.push("Schar");
  }
  if (
    !sameJson(current.regressionSnapshots, expected.regressionSnapshots) ||
    !sameJson(current.regressionUids, expected.regressionUids)
  ) {
    differences.push("Regression");
  }
  if (!sameJson(current.sliderStates, expected.sliderStates)) {
    differences.push("Slider");
  }
  if (!sameJson(current.tableStates, expected.tableStates)) {
    differences.push("Tabelle");
  }
  if (!sameJson(current.plotInputStates, expected.plotInputStates)) {
    differences.push("PlotInput");
  }
  return differences.length > 0 ? differences.join(", ") : undefined;
}
