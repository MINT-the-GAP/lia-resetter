type CoordinatePointKind =
  | "create-point"
  | "point-on-graph"
  | "points-on-graph";

type CoordinatePassiveKind =
  | "reconstruction"
  | "perimeter-quiz"
  | "area-quiz"
  | "construction-quiz";

type CoordinateKind = CoordinatePointKind | CoordinatePassiveKind;

interface CoordinatePointTarget {
  readonly kind: CoordinatePointKind;
  readonly uid: string;
  readonly boardId: string;
  readonly names: readonly string[];
  readonly graphKey?: string;
}

interface CoordinateRegistryState {
  points?: Record<string, unknown>;
  pointStates?: Record<string, unknown>;
  pointGraphs?: Record<string, unknown>;
  pointGraphStates?: Record<string, unknown>;
  pointOnGraphLocks?: Record<string, unknown>;
  pointsOnGraphLocks?: Record<string, unknown>;
}

interface CoordinateBoard extends Record<string, unknown> {
  objects?: Record<string, unknown>;
  removeObject(object: unknown): unknown;
  update?: () => unknown;
}

interface CoordinateRuntime {
  readonly view: Window;
  readonly globals: Record<string, unknown>;
  readonly board: CoordinateBoard;
  readonly state: CoordinateRegistryState;
}

interface PointDescriptor {
  readonly kind: CoordinatePointKind;
  readonly uid: string;
  readonly spec: string;
  readonly quiz: HTMLElement;
  readonly target: CoordinatePointTarget;
}

interface PassiveDescriptor {
  readonly kind: CoordinatePassiveKind;
  readonly uid: string;
  readonly spec: string;
  readonly boardId: string;
  readonly quiz: HTMLElement;
}

type CoordinateDescriptor = PointDescriptor | PassiveDescriptor;

interface SnapshotSlot {
  readonly container: Record<string, unknown>;
  readonly key: string;
  readonly existed: boolean;
  readonly value: unknown;
  readonly serialized?: string;
}

interface CoordinatePointResetContext {
  readonly mode: "point";
  readonly kind: CoordinatePointKind;
  readonly uid: string;
  readonly spec: string;
  readonly scope: HTMLElement;
  readonly target: CoordinatePointTarget;
  readonly siblings: readonly CoordinatePointTarget[];
  readonly ownership: readonly CoordinatePointTarget[];
  readonly runtime: CoordinateRuntime;
  readonly siblingSnapshot: readonly SnapshotSlot[];
  readonly retainedBoardObjects: readonly object[];
  readonly initiallyOwnedBoardObjects: readonly object[];
  readonly removedObjects: Set<object>;
}

interface CoordinatePassiveResetContext {
  readonly mode: "passive";
  readonly kind: CoordinatePassiveKind;
  readonly uid: string;
  readonly spec: string;
  readonly boardId: string;
  readonly scope: HTMLElement;
  readonly runtime: CoordinateRuntime;
  readonly retainedBoardObjects: readonly object[];
  readonly reconstructionState?: string;
}

type CoordinateResetContext =
  | CoordinatePointResetContext
  | CoordinatePassiveResetContext;

const GENERIC_QUIZ_SELECTOR = ".lia-quiz.lia-quiz-generic";
const FOLLOWING = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function unquote(value: string): string {
  const text = String(value ?? "").trim();
  if (text.length < 2) return text;
  const first = text[0];
  const last = text[text.length - 1];
  return first === last && (first === "\"" || first === "'" || first === "`")
    ? text.slice(1, -1)
    : text;
}

function splitTopLevel(value: string, separator = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let quote = "";
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = "";
      continue;
    }
    if (character === "'") {
      let previous = index - 1;
      while (previous >= 0 && /\s/.test(value[previous])) previous -= 1;
      const atValueStart =
        previous < 0 || ";,([{=:".includes(value[previous]);
      let hasClosingQuote = false;
      let escapedQuote = false;
      for (let next = index + 1; atValueStart && next < value.length; next += 1) {
        if (escapedQuote) {
          escapedQuote = false;
          continue;
        }
        if (value[next] === "\\") {
          escapedQuote = true;
          continue;
        }
        if (value[next] === character) {
          hasClosingQuote = true;
          break;
        }
      }
      if (!atValueStart || !hasClosingQuote) {
        current += character;
        continue;
      }
    }
    if (character === "\"" || character === "'" || character === "`") {
      current += character;
      quote = character;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      current += character;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
      current += character;
      continue;
    }
    if (character === separator && depth === 0) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  result.push(current.trim());
  return result;
}

function specParts(spec: string): string[] {
  return splitTopLevel(unquote(String(spec ?? "")), ";").map((part) =>
    unquote(part).trim(),
  );
}

// The two graph subsystems build their registry key from the raw, trimmed
// semicolon tokens. They unquote the expression only for evaluation, not for
// identity. Keep that seemingly unusual distinction byte-for-byte compatible.
function graphSpecParts(spec: string): string[] {
  return unquote(String(spec ?? ""))
    .split(";")
    .map((part) => part.trim());
}

function technicalName(value: string, fallback: string): string {
  const source = unquote(value).trim() || fallback;
  const hidden = source.match(/^(.+?)\s*=\s*0$/);
  return (hidden?.[1] ?? source).trim();
}

function isColorToken(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
    value.trim(),
  );
}

function requireIdentity(value: string, label: string): string {
  const result = value.trim();
  if (!result) {
    throw new Error(`Die ${label} des lia-coordinate-Quiz ist nicht eindeutig.`);
  }
  return result;
}

export function parseCreatePointTarget(
  spec: string,
  uid: string,
): CoordinatePointTarget {
  const parts = specParts(spec);
  const boardId = requireIdentity(parts[0] ?? "", "Board-ID");
  const name = requireIdentity(
    technicalName(parts[1] ?? "", "A"),
    "Punkt-ID",
  );
  return {
    kind: "create-point",
    uid: requireIdentity(uid, "Quiz-UID"),
    boardId,
    names: [name],
  };
}

export function parsePointOnGraphTarget(
  spec: string,
  uid: string,
  knownBoardIds: readonly string[] = [],
): CoordinatePointTarget {
  const parts = graphSpecParts(spec);
  const renderedBoardId = requireIdentity(parts[0] ?? "", "Board-ID");
  const exactBoardIds = new Set(
    knownBoardIds.filter((boardId) => boardId === renderedBoardId),
  );
  const normalizedRenderedBoardId = renderedBoardId.replace(/_/g, "");
  const recoveredBoardIds = new Set(
    knownBoardIds.filter(
      (boardId) =>
        boardId.replace(/_/g, "") === normalizedRenderedBoardId,
    ),
  );
  if (exactBoardIds.size === 0 && recoveredBoardIds.size > 1) {
    throw new Error(
      "Die durch LiaScript formatierte Board-ID des PointOnGraph-Quiz ist mehrdeutig.",
    );
  }
  const boardId = exactBoardIds.size === 1
    ? renderedBoardId
    : recoveredBoardIds.values().next().value ?? renderedBoardId;
  const name = requireIdentity(
    parts[1] || "A",
    "Punkt-ID",
  );
  const colored = isColorToken(parts[2] ?? "");
  const graphName = requireIdentity(
    parts[colored ? 3 : 2] || "f",
    "Graph-ID",
  );
  const expression = requireIdentity(
    parts[colored ? 4 : 3] ?? "",
    "Funktionsvorschrift",
  );
  return {
    kind: "point-on-graph",
    uid: requireIdentity(uid, "Quiz-UID"),
    boardId,
    names: [name],
    graphKey: `${name}||${graphName}||${expression}`,
  };
}

export function parsePointsOnGraphTarget(
  spec: string,
  uid: string,
): CoordinatePointTarget {
  const parts = graphSpecParts(spec);
  const boardId = requireIdentity(parts[0] ?? "", "Board-ID");
  const countText = (parts[1] ?? "1").replace(/^n\s*=\s*/i, "");
  const parsedCount = Number.parseInt(countText, 10);
  const count =
    Number.isSafeInteger(parsedCount) && parsedCount > 0 ? parsedCount : 1;
  const prefix = requireIdentity(
    parts[3] || "A",
    "Punktpräfix-ID",
  );
  const colored = isColorToken(parts[4] ?? "");
  const graphName = requireIdentity(
    parts[colored ? 5 : 4] || "f",
    "Graph-ID",
  );
  const expression = requireIdentity(
    parts[colored ? 6 : 5] ?? "",
    "Funktionsvorschrift",
  );
  return {
    kind: "points-on-graph",
    uid: requireIdentity(uid, "Quiz-UID"),
    boardId,
    names: Array.from({ length: count }, (_, index) => `${prefix}_${index + 1}`),
    graphKey: `${prefix}||${count}||${graphName}||${expression}`,
  };
}

function collisionError(): Error {
  return new Error(
    "Ownership-Kollision: Der lia-coordinate-Zustand gehört nicht eindeutig nur diesem Quiz.",
  );
}

function assertNoOwnershipCollision(
  target: CoordinatePointTarget,
  siblings: readonly CoordinatePointTarget[],
): void {
  if (new Set(target.names).size !== target.names.length) {
    throw collisionError();
  }
  const names = new Set(target.names);
  for (const sibling of siblings) {
    if (samePointTarget(target, sibling)) continue;
    if (sibling.uid === target.uid) throw collisionError();
    if (sibling.boardId !== target.boardId) continue;
    if (sibling.names.some((name) => names.has(name))) {
      throw collisionError();
    }
    if (
      target.graphKey &&
      sibling.graphKey &&
      target.graphKey === sibling.graphKey
    ) {
      throw collisionError();
    }
  }
}

function boardBucket(
  registry: Record<string, unknown> | undefined,
  boardId: string,
): Record<string, unknown> | undefined {
  if (!registry || !hasOwn(registry, boardId)) return undefined;
  const value = registry[boardId];
  if (!isRecord(value)) {
    throw new Error(
      "Der lia-coordinate-Zustand besitzt keine eindeutige Board-Struktur.",
    );
  }
  return value;
}

function assertDeletable(
  container: Record<string, unknown> | undefined,
  key: string,
): void {
  if (!container || !hasOwn(container, key)) return;
  const descriptor = Object.getOwnPropertyDescriptor(container, key);
  if (descriptor?.configurable === false) {
    throw new Error("Der lia-coordinate-Zielzustand ist nicht sicher löschbar.");
  }
}

function assertAssignable(container: Record<string, unknown>, key: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(container, key);
  if (descriptor && "writable" in descriptor && descriptor.writable === false) {
    throw new Error("Der lia-coordinate-Sperrzustand ist nicht sicher änderbar.");
  }
  if (!descriptor && !Object.isExtensible(container)) {
    throw new Error("Der lia-coordinate-Sperrzustand ist nicht sicher änderbar.");
  }
}

export function clearCoordinateRegistryTarget(
  state: CoordinateRegistryState,
  target: CoordinatePointTarget,
  siblings: readonly CoordinatePointTarget[],
): void {
  preflightCoordinateRegistryTarget(state, target, siblings);

  const points = boardBucket(state.points, target.boardId);
  const pointStates = boardBucket(state.pointStates, target.boardId);
  const pointGraphs = boardBucket(state.pointGraphs, target.boardId);
  const pointGraphStates = boardBucket(
    state.pointGraphStates,
    target.boardId,
  );
  const lockRegistry =
    target.kind === "point-on-graph"
      ? state.pointOnGraphLocks
      : target.kind === "points-on-graph"
        ? state.pointsOnGraphLocks
        : undefined;

  for (const name of target.names) {
    if (points) delete points[name];
    if (pointStates) delete pointStates[name];
  }
  if (target.graphKey) {
    if (pointGraphs) delete pointGraphs[target.graphKey];
    if (pointGraphStates) delete pointGraphStates[target.graphKey];
  }
  if (lockRegistry) lockRegistry[target.uid] = false;
}

function preflightCoordinateRegistryTarget(
  state: CoordinateRegistryState,
  target: CoordinatePointTarget,
  siblings: readonly CoordinatePointTarget[],
): void {
  assertNoOwnershipCollision(target, siblings);

  const points = boardBucket(state.points, target.boardId);
  const pointStates = boardBucket(state.pointStates, target.boardId);
  const pointGraphs = boardBucket(state.pointGraphs, target.boardId);
  const pointGraphStates = boardBucket(
    state.pointGraphStates,
    target.boardId,
  );

  for (const name of target.names) {
    assertDeletable(points, name);
    assertDeletable(pointStates, name);
  }
  if (target.graphKey) {
    assertDeletable(pointGraphs, target.graphKey);
    assertDeletable(pointGraphStates, target.graphKey);
  }

  const lockRegistry =
    target.kind === "point-on-graph"
      ? state.pointOnGraphLocks
      : target.kind === "points-on-graph"
        ? state.pointsOnGraphLocks
        : undefined;
  if (lockRegistry) assertAssignable(lockRegistry, target.uid);
}

function accessibleWindows(): Window[] {
  const result: Window[] = [];
  let current: Window | null = window;
  for (let depth = 0; current && depth < 12; depth += 1) {
    if (!result.includes(current)) result.push(current);
    try {
      if (!current.parent || current.parent === current) break;
      current = current.parent;
    } catch {
      break;
    }
  }
  return result;
}

function availableCoordinateBoardIds(requiredRender: string): string[] {
  const result = new Set<string>();
  for (const view of accessibleWindows()) {
    try {
      const globals = view as unknown as Record<string, unknown>;
      const boards = globals.__boards;
      if (
        !isRecord(boards) ||
        typeof globals[requiredRender] !== "function"
      ) {
        continue;
      }
      for (const [boardId, board] of Object.entries(boards)) {
        if (isRecord(board) && typeof board.removeObject === "function") {
          result.add(boardId);
        }
      }
    } catch {
      // Cross-origin parents and incompatible template instances are ignored.
    }
  }
  return Array.from(result);
}

function pointOnGraphRuntimeSpec(spec: string, boardId: string): string {
  const parts = graphSpecParts(spec);
  if (parts.length === 0) return spec;
  parts[0] = boardId;
  return parts.join(";");
}

function runtimeState(
  globals: Record<string, unknown>,
): CoordinateRegistryState | undefined {
  const values = {
    points: globals.__points,
    pointStates: globals.__pointStates,
    pointGraphs: globals.__pointGraphs,
    pointGraphStates: globals.__pointGraphStates,
    pointOnGraphLocks: globals.__pointOnGraphLocks,
    pointsOnGraphLocks: globals.__pointsOnGraphLocks,
  };
  return Object.values(values).every(isRecord)
    ? (values as CoordinateRegistryState)
    : undefined;
}

function renderFunctionName(kind: CoordinatePointKind): string {
  if (kind === "create-point") return "renderCreatePointFromSpec";
  if (kind === "point-on-graph") return "renderPointOnGraphFromSpec";
  return "renderPointsOnGraphFromSpec";
}

function coordinateRuntimeForBoard(
  boardId: string,
  requiredRender?: string,
  ownerDocument?: Document,
): CoordinateRuntime {
  const candidates: CoordinateRuntime[] = [];
  const seenBoards = new Set<object>();
  for (const view of accessibleWindows()) {
    try {
      const globals = view as unknown as Record<string, unknown>;
      const boards = globals.__boards;
      const state = runtimeState(globals);
      if (!isRecord(boards) || !state) continue;
      const board = boards[boardId];
      if (
        !isRecord(board) ||
        typeof board.removeObject !== "function" ||
        (requiredRender !== undefined &&
          typeof globals[requiredRender] !== "function")
      ) {
        continue;
      }
      if (seenBoards.has(board)) continue;
      seenBoards.add(board);
      candidates.push({
        view,
        globals,
        board: board as CoordinateBoard,
        state,
      });
    } catch {
      // Cross-origin parents and incompatible template instances are ignored.
    }
  }

  // A LiaScript course can expose an additional parent runtime (for example
  // through the preview shell) with the same board id. Prefer the board whose
  // actual JSXGraph container belongs to the document of the target quiz. A
  // ShadowRoot is intentional here: `ownerDocument` remains stable even when
  // `scope.contains(containerObj)` is false for JSXGraph web components.
  const documentCandidates = ownerDocument
    ? candidates.filter((candidate) => {
        const container = candidate.board.containerObj;
        if (typeof container !== "object" || container === null) return false;
        const node = container as {
          readonly ownerDocument?: unknown;
          readonly isConnected?: unknown;
        };
        return (
          node.ownerDocument === ownerDocument &&
          node.isConnected !== false
        );
      })
    : [];
  const eligible = documentCandidates.length > 0
    ? documentCandidates
    : candidates;
  if (eligible.length !== 1) {
    throw new Error(
      `Die Laufzeit dieses lia-coordinate-Quiz ist nicht eindeutig verfügbar (${eligible.length} Kandidaten).`,
    );
  }
  return eligible[0];
}

function coordinateRuntime(
  target: CoordinatePointTarget,
  ownerDocument?: Document,
): CoordinateRuntime {
  return coordinateRuntimeForBoard(
    target.boardId,
    renderFunctionName(target.kind),
    ownerDocument,
  );
}

function genericQuizzes(scope: ParentNode): HTMLElement[] {
  const quizzes: HTMLElement[] = [];
  if (scope instanceof HTMLElement && scope.matches(GENERIC_QUIZ_SELECTOR)) {
    quizzes.push(scope);
  }
  quizzes.push(
    ...Array.from(scope.querySelectorAll<HTMLElement>(GENERIC_QUIZ_SELECTOR)),
  );
  return quizzes.filter((quiz, index) => quizzes.indexOf(quiz) === index);
}

function elementsWithId(scope: ParentNode, id: string): HTMLElement[] {
  const elements: HTMLElement[] = [];
  if (scope instanceof HTMLElement && scope.id === id) elements.push(scope);
  elements.push(
    ...Array.from(scope.querySelectorAll<HTMLElement>("[id]")).filter(
      (element) => element.id === id,
    ),
  );
  return elements.filter((element, index) => elements.indexOf(element) === index);
}

function oneElementWithId(scope: ParentNode, id: string): HTMLElement {
  const elements = elementsWithId(scope, id);
  if (elements.length !== 1) {
    throw new Error(
      `Das lia-coordinate-Element ${id} ist nicht eindeutig vorhanden.`,
    );
  }
  return elements[0];
}

function ownerWithPrefix(
  quiz: HTMLElement,
  prefix: string,
): HTMLElement | undefined {
  const owner = quiz.closest<HTMLElement>(`[id^='${prefix}']`);
  return owner?.id.startsWith(prefix) ? owner : undefined;
}

function validateDirectOwner(owner: HTMLElement, quiz: HTMLElement): string {
  const owned = genericQuizzes(owner);
  const uid = owner.id.slice(owner.id.indexOf("-") + 1);
  if (owned.length !== 1 || owned[0] !== quiz || !uid) {
    throw new Error(
      "Das lia-coordinate-Quiz ist seinem Makro nicht eindeutig zugeordnet.",
    );
  }
  return uid;
}

function uidAfterPrefix(owner: HTMLElement, prefix: string): string {
  return requireIdentity(owner.id.slice(prefix.length), "Quiz-UID");
}

function firstSpecPart(spec: string): string {
  return requireIdentity(specParts(spec)[0] ?? "", "Board-ID");
}

function nextQuiz(
  marker: HTMLElement,
  quizzes: readonly HTMLElement[],
): HTMLElement | undefined {
  return quizzes.find(
    (quiz) =>
      Boolean(marker.compareDocumentPosition(quiz) & FOLLOWING),
  );
}

function proposalDescriptor(
  quiz: HTMLElement,
  scope: HTMLElement,
): PassiveDescriptor | undefined {
  // A Proposal marker belongs only to the first native quiz of any kind that
  // follows it. Looking merely for the next Generic quiz could jump over an
  // unrelated Text/Choice quiz and misclassify a later exercise.
  const quizzes = Array.from(
    scope.querySelectorAll<HTMLElement>(".lia-quiz"),
  );
  const candidates: PassiveDescriptor[] = [];
  for (const marker of Array.from(
    scope.querySelectorAll<HTMLElement>(
      "[id^='polygon-metric-quiz-spec-'],[id^='construction-quiz-spec-']",
    ),
  )) {
    if (nextQuiz(marker, quizzes) !== quiz) continue;
    const spec = requireIdentity(
      marker.dataset.spec ?? marker.textContent ?? "",
      "Quiz-Spezifikation",
    );
    if (marker.id.startsWith("polygon-metric-quiz-spec-")) {
      const uid = uidAfterPrefix(marker, "polygon-metric-quiz-spec-");
      const metric = (marker.dataset.kind ?? "").trim();
      if (metric !== "perimeter" && metric !== "area") {
        throw new Error(
          "Die Metrik des lia-coordinate-Quiz ist nicht eindeutig.",
        );
      }
      candidates.push({
        kind: metric === "perimeter" ? "perimeter-quiz" : "area-quiz",
        uid,
        spec,
        boardId: firstSpecPart(spec),
        quiz,
      });
    } else {
      candidates.push({
        kind: "construction-quiz",
        uid: uidAfterPrefix(marker, "construction-quiz-spec-"),
        spec,
        boardId: firstSpecPart(spec),
        quiz,
      });
    }
  }
  if (candidates.length > 1) {
    throw new Error(
      "Die Proposal-Spezifikation dieses lia-coordinate-Quiz ist nicht eindeutig.",
    );
  }
  return candidates[0];
}

function descriptorForQuiz(
  quiz: HTMLElement,
  scope: HTMLElement,
): CoordinateDescriptor | undefined {
  if (!quiz.matches(GENERIC_QUIZ_SELECTOR) || !scope.contains(quiz)) {
    return undefined;
  }

  const createOwner = ownerWithPrefix(quiz, "point-check-");
  if (createOwner) {
    validateDirectOwner(createOwner, quiz);
    const uid = uidAfterPrefix(createOwner, "point-check-");
    const ui = oneElementWithId(scope, `point-ui-${uid}`);
    if (!ui.contains(createOwner)) {
      throw new Error("Das CreatePoint-Quiz ist nicht eindeutig verschachtelt.");
    }
    const spec = requireIdentity(ui.dataset.spec ?? "", "Quiz-Spezifikation");
    return {
      kind: "create-point",
      uid,
      spec,
      quiz,
      target: parseCreatePointTarget(spec, uid),
    };
  }

  const graphOwner = ownerWithPrefix(quiz, "graph-check-");
  if (graphOwner) {
    validateDirectOwner(graphOwner, quiz);
    const uid = uidAfterPrefix(graphOwner, "graph-check-");
    const ui = oneElementWithId(scope, `graph-ui-${uid}`);
    if (!ui.contains(graphOwner)) {
      throw new Error("Das PointOnGraph-Quiz ist nicht eindeutig verschachtelt.");
    }
    const specNode = oneElementWithId(scope, `graph-spec-${uid}`);
    const renderedSpec = requireIdentity(
      specNode.dataset.spec ?? specNode.textContent ?? "",
      "Quiz-Spezifikation",
    );
    const target = parsePointOnGraphTarget(
      renderedSpec,
      uid,
      availableCoordinateBoardIds("renderPointOnGraphFromSpec"),
    );
    const spec = pointOnGraphRuntimeSpec(renderedSpec, target.boardId);
    return {
      kind: "point-on-graph",
      uid,
      spec,
      quiz,
      target,
    };
  }

  const multiOwner = ownerWithPrefix(quiz, "multi-graph-check-");
  if (multiOwner) {
    validateDirectOwner(multiOwner, quiz);
    const uid = uidAfterPrefix(multiOwner, "multi-graph-check-");
    const ui = oneElementWithId(scope, `multi-graph-ui-${uid}`);
    if (!ui.contains(multiOwner)) {
      throw new Error("Das PointsOnGraph-Quiz ist nicht eindeutig verschachtelt.");
    }
    const spec = requireIdentity(ui.dataset.spec ?? "", "Quiz-Spezifikation");
    return {
      kind: "points-on-graph",
      uid,
      spec,
      quiz,
      target: parsePointsOnGraphTarget(spec, uid),
    };
  }

  const reconstructionOwner = ownerWithPrefix(quiz, "rek-check-");
  if (reconstructionOwner) {
    validateDirectOwner(reconstructionOwner, quiz);
    const uid = uidAfterPrefix(reconstructionOwner, "rek-check-");
    const specNode = oneElementWithId(scope, `rek-spec-${uid}`);
    const spec = requireIdentity(
      specNode.dataset.spec ?? specNode.textContent ?? "",
      "Quiz-Spezifikation",
    );
    return {
      kind: "reconstruction",
      uid,
      spec,
      boardId: firstSpecPart(spec),
      quiz,
    };
  }

  return proposalDescriptor(quiz, scope);
}

function descriptorsInScope(scope: HTMLElement): CoordinateDescriptor[] {
  const result = genericQuizzes(scope)
    .map((quiz) => descriptorForQuiz(quiz, scope))
    .filter(
      (descriptor): descriptor is CoordinateDescriptor =>
        descriptor !== undefined,
    );
  const identities = new Set<string>();
  for (const descriptor of result) {
    const identity = `${descriptor.kind}\u0000${descriptor.uid}`;
    if (identities.has(identity)) {
      throw new Error(
        "Eine lia-coordinate-Quiz-UID ist auf dieser Folie nicht eindeutig.",
      );
    }
    identities.add(identity);
  }
  return result;
}

function staticPointTargets(scope: ParentNode): CoordinatePointTarget[] {
  return Array.from(
    scope.querySelectorAll<HTMLElement>("[id^='point-spec-'][data-spec]"),
  ).map((node) =>
    parseCreatePointTarget(
      requireIdentity(node.dataset.spec ?? "", "Punkt-Spezifikation"),
      `static:${uidAfterPrefix(node, "point-spec-")}`,
    ),
  );
}

function serializable(value: unknown): string {
  try {
    const result = JSON.stringify(value);
    return result === undefined ? "undefined" : result;
  } catch {
    throw new Error(
      "Ein benachbarter lia-coordinate-Zustand ist nicht sicher vergleichbar.",
    );
  }
}

const REGRESSION_ANALYSIS_LISTS = [
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
] as const;

function reconstructionStateSnapshot(
  globals: Record<string, unknown>,
  boardId: string,
): string {
  const scharStore = isRecord(globals.__liaScharStateStore)
    ? Object.fromEntries(
        Object.entries(globals.__liaScharStateStore)
          .filter(([key]) => key.endsWith(`::${boardId}`))
          .sort(([left], [right]) => left.localeCompare(right)),
      )
    : {};
  const scharEntries = isRecord(globals.__scharEntries)
    ? Object.entries(globals.__scharEntries)
        .filter(([, value]) => isRecord(value) && value.boardId === boardId)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => {
          const entry = value as Record<string, unknown>;
          return {
            key,
            uid: entry.uid,
            boardId: entry.boardId,
            params: entry.params,
            values: entry.values,
            panelScale: entry.panelScale,
            panelMinimized: entry.panelMinimized,
            termVisible: entry.termVisible,
          };
        })
    : [];
  const regressionStates = isRecord(globals.__liaRegressionStates)
    ? Object.entries(globals.__liaRegressionStates)
        .filter(([, value]) => isRecord(value) && value.boardId === boardId)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => {
          const state = value as Record<string, unknown>;
          return {
            key,
            uid: state.uid,
            boardId: state.boardId,
            drawColor: state.drawColor,
            activeTool: state.activeTool,
            regressionMode: state.regressionMode,
            strokes: state.strokes,
            regressionPoints: state.regressionPoints,
            autoCreatedPointsData: state.autoCreatedPointsData,
            analyses: REGRESSION_ANALYSIS_LISTS.map((list) => ({
              list,
              entries: Array.isArray(state[list])
                ? state[list].map((value) => {
                    if (!isRecord(value)) return value;
                    return {
                      id: value.id,
                      title: value.title,
                      color: value.color,
                      classKey: value.classKey,
                      model: value.model,
                      classProbabilities: value.classProbabilities,
                      linkedModels: value.linkedModels,
                    };
                  })
                : [],
            })),
          };
        })
    : [];

  return serializable({ scharStore, scharEntries, regressionStates });
}

function captureSlot(
  result: SnapshotSlot[],
  container: Record<string, unknown> | undefined,
  key: string,
  serialize: boolean,
): void {
  if (!container) return;
  const existed = hasOwn(container, key);
  const value = container[key];
  result.push({
    container,
    key,
    existed,
    value,
    serialized: serialize && existed ? serializable(value) : undefined,
  });
}

function siblingSnapshot(
  state: CoordinateRegistryState,
  siblings: readonly CoordinatePointTarget[],
): SnapshotSlot[] {
  const result: SnapshotSlot[] = [];
  for (const sibling of siblings) {
    const points = boardBucket(state.points, sibling.boardId);
    const pointStates = boardBucket(state.pointStates, sibling.boardId);
    for (const name of sibling.names) {
      captureSlot(result, points, name, false);
      captureSlot(result, pointStates, name, true);
    }
    if (sibling.graphKey) {
      captureSlot(
        result,
        boardBucket(state.pointGraphs, sibling.boardId),
        sibling.graphKey,
        false,
      );
      captureSlot(
        result,
        boardBucket(state.pointGraphStates, sibling.boardId),
        sibling.graphKey,
        true,
      );
    }
    if (sibling.kind === "point-on-graph") {
      captureSlot(result, state.pointOnGraphLocks, sibling.uid, false);
    } else if (sibling.kind === "points-on-graph") {
      captureSlot(result, state.pointsOnGraphLocks, sibling.uid, false);
    }
  }
  return result;
}

function verifySnapshot(snapshot: readonly SnapshotSlot[]): boolean {
  return snapshot.every((slot) => {
    const exists = hasOwn(slot.container, slot.key);
    if (exists !== slot.existed) return false;
    if (!exists) return true;
    return slot.serialized === undefined
      ? slot.container[slot.key] === slot.value
      : serializable(slot.container[slot.key]) === slot.serialized;
  });
}

function targetRegistryObjects(
  state: CoordinateRegistryState,
  target: CoordinatePointTarget,
): { points: unknown[]; graphEntry?: Record<string, unknown> } {
  const pointBucket = boardBucket(state.points, target.boardId);
  const points = target.names
    .map((name) => pointBucket?.[name])
    .filter((value) => value !== undefined);
  const graphBucket = boardBucket(state.pointGraphs, target.boardId);
  const entry = target.graphKey ? graphBucket?.[target.graphKey] : undefined;
  if (entry !== undefined && !isRecord(entry)) {
    throw new Error("Der lia-coordinate-Lösungsgraph ist nicht eindeutig.");
  }
  return { points, graphEntry: entry };
}

function objectChildren(value: unknown): object[] {
  if (!isRecord(value)) return [];
  const children = value.childElements;
  return isRecord(children)
    ? Object.values(children).filter(
        (child): child is object => typeof child === "object" && child !== null,
      )
    : [];
}

function preflightOwnedObjects(
  runtime: CoordinateRuntime,
  target: CoordinatePointTarget,
): void {
  const objects = targetRegistryObjects(runtime.state, target);
  for (const value of objects.points) {
    if (!isRecord(value)) {
      throw new Error("Der lia-coordinate-Zielpunkt ist nicht eindeutig.");
    }
    if (value.board !== undefined && value.board !== runtime.board) {
      throw new Error("Der lia-coordinate-Zielpunkt gehört zu einem anderen Board.");
    }
    const macroKey = String(value.__liaDgsMacroKey ?? "");
    const expectedMacroKey = `macro:point:${target.uid}`;
    if (macroKey && (target.kind !== "create-point" || macroKey !== expectedMacroKey)) {
      throw collisionError();
    }
    const label = isRecord(value.label) ? value.label : undefined;
    const foreignChildren = objectChildren(value).filter(
      (child) => child !== label,
    );
    if (foreignChildren.length > 0) {
      throw new Error(
        "Der lia-coordinate-Zielpunkt besitzt fremde abhängige Konstruktionen.",
      );
    }
  }
  if (objects.graphEntry) {
    const graphObjects = Object.values(objects.graphEntry).filter(
      (value): value is object => typeof value === "object" && value !== null,
    );
    const ownedGraphObjects = new Set(graphObjects);
    for (const value of graphObjects) {
      if (
        isRecord(value) &&
        value.board !== undefined &&
        value.board !== runtime.board
      ) {
        throw new Error(
          "Der lia-coordinate-Lösungsgraph gehört zu einem anderen Board.",
        );
      }
      const foreignChildren = objectChildren(value).filter(
        (child) => !ownedGraphObjects.has(child),
      );
      if (foreignChildren.length > 0) {
        throw new Error(
          "Der lia-coordinate-Lösungsgraph besitzt fremde abhängige Konstruktionen.",
        );
      }
    }
  }
}

function ownedBoardObjects(
  runtime: CoordinateRuntime,
  target: CoordinatePointTarget,
): Set<object> {
  const result = new Set<object>();
  const objects = targetRegistryObjects(runtime.state, target);
  for (const point of objects.points) {
    if (typeof point === "object" && point !== null) result.add(point);
    if (isRecord(point) && typeof point.label === "object" && point.label !== null) {
      result.add(point.label);
    }
  }
  if (objects.graphEntry) {
    for (const value of Object.values(objects.graphEntry)) {
      if (typeof value === "object" && value !== null) result.add(value);
    }
  }
  return result;
}

function liveBoardObjects(board: CoordinateBoard): object[] {
  return isRecord(board.objects)
    ? Object.values(board.objects).filter(
        (value): value is object => typeof value === "object" && value !== null,
      )
    : [];
}

function samePointTarget(
  left: CoordinatePointTarget,
  right: CoordinatePointTarget,
): boolean {
  return (
    left.kind === right.kind &&
    left.uid === right.uid &&
    left.boardId === right.boardId &&
    left.graphKey === right.graphKey &&
    left.names.length === right.names.length &&
    left.names.every((name, index) => name === right.names[index])
  );
}

function sameDescriptor(
  descriptor: CoordinateDescriptor,
  context: CoordinateResetContext,
): boolean {
  if (
    descriptor.kind !== context.kind ||
    descriptor.uid !== context.uid ||
    descriptor.spec !== context.spec
  ) {
    return false;
  }
  return context.mode === "passive" ||
    ("target" in descriptor && samePointTarget(descriptor.target, context.target));
}

function liveDescriptor(context: CoordinateResetContext): CoordinateDescriptor {
  if (!context.scope.isConnected) {
    throw new Error("Die Folie des lia-coordinate-Quiz ist nicht mehr verbunden.");
  }
  const matches = descriptorsInScope(context.scope).filter((descriptor) =>
    sameDescriptor(descriptor, context),
  );
  if (matches.length !== 1) {
    throw new Error(
      "Das lia-coordinate-Quiz wurde nach dem Core-Reset nicht eindeutig gefunden.",
    );
  }
  return matches[0];
}

function coreIsOpen(quiz: HTMLElement): boolean {
  const check = quiz.querySelector<HTMLElement>(".lia-quiz__check");
  const disabled =
    check instanceof HTMLButtonElement || check instanceof HTMLInputElement
      ? check.disabled
      : check?.getAttribute("aria-disabled") === "true";
  return (
    Boolean(check) &&
    disabled === false &&
    !quiz.classList.contains("solved") &&
    !quiz.classList.contains("resolved")
  );
}

function currentRuntime(context: CoordinatePointResetContext): CoordinateRuntime {
  const runtime = coordinateRuntime(context.target, context.scope.ownerDocument);
  if (
    runtime.board !== context.runtime.board ||
    runtime.state.points !== context.runtime.state.points ||
    runtime.state.pointStates !== context.runtime.state.pointStates ||
    runtime.state.pointGraphs !== context.runtime.state.pointGraphs ||
    runtime.state.pointGraphStates !== context.runtime.state.pointGraphStates ||
    runtime.state.pointOnGraphLocks !== context.runtime.state.pointOnGraphLocks ||
    runtime.state.pointsOnGraphLocks !== context.runtime.state.pointsOnGraphLocks
  ) {
    throw new Error(
      "Die lia-coordinate-Laufzeit wurde während des Resets ausgetauscht.",
    );
  }
  return runtime;
}

function currentPassiveRuntime(
  context: CoordinatePassiveResetContext,
): CoordinateRuntime {
  const runtime = coordinateRuntimeForBoard(
    context.boardId,
    undefined,
    context.scope.ownerDocument,
  );
  if (
    runtime.board !== context.runtime.board ||
    runtime.state.points !== context.runtime.state.points ||
    runtime.state.pointStates !== context.runtime.state.pointStates ||
    runtime.state.pointGraphs !== context.runtime.state.pointGraphs ||
    runtime.state.pointGraphStates !== context.runtime.state.pointGraphStates ||
    runtime.state.pointOnGraphLocks !== context.runtime.state.pointOnGraphLocks ||
    runtime.state.pointsOnGraphLocks !== context.runtime.state.pointsOnGraphLocks
  ) {
    throw new Error(
      "Die geteilte lia-coordinate-Laufzeit wurde während des Resets ausgetauscht.",
    );
  }
  return runtime;
}

function removeBoardObject(
  runtime: CoordinateRuntime,
  value: unknown,
  removed: Set<object>,
): void {
  if (typeof value !== "object" || value === null || removed.has(value)) return;
  removed.add(value);
  runtime.board.removeObject(value);
}

function removeTargetBoardObjects(
  runtime: CoordinateRuntime,
  target: CoordinatePointTarget,
  removed: Set<object>,
): void {
  const objects = targetRegistryObjects(runtime.state, target);
  if (objects.graphEntry) {
    for (const key of ["text", "anchor", "graph"]) {
      removeBoardObject(runtime, objects.graphEntry[key], removed);
    }
  }
  for (const point of objects.points) {
    removeBoardObject(runtime, point, removed);
  }
}

function callCoordinateRender(
  runtime: CoordinateRuntime,
  target: CoordinatePointTarget,
  spec: string,
): void {
  const render = runtime.globals[renderFunctionName(target.kind)];
  if (typeof render !== "function") {
    throw new Error("Die lia-coordinate-Oberfläche kann nicht aktualisiert werden.");
  }
  const result = Reflect.apply(render, runtime.view, [target.uid, spec]);
  if (result === false) {
    throw new Error("Die lia-coordinate-Oberfläche wurde nicht wieder geöffnet.");
  }
}

function persistProposalBoard(runtime: CoordinateRuntime, boardId: string): void {
  const persist = runtime.globals.__persistDgsBoardState;
  if (typeof persist === "function") {
    Reflect.apply(persist, runtime.view, [boardId, false]);
  }
}

function applyPointReset(context: CoordinatePointResetContext): void {
  const runtime = currentRuntime(context);
  assertNoOwnershipCollision(context.target, context.ownership);
  preflightOwnedObjects(runtime, context.target);
  // Validate every registry write before JSXGraph removes the first object.
  // A malformed/non-configurable registry must fail closed without a partial
  // visual reset.
  preflightCoordinateRegistryTarget(
    runtime.state,
    context.target,
    context.ownership,
  );
  removeTargetBoardObjects(runtime, context.target, context.removedObjects);
  clearCoordinateRegistryTarget(
    runtime.state,
    context.target,
    context.ownership,
  );
  callCoordinateRender(runtime, context.target, context.spec);
  try {
    runtime.board.update?.();
  } catch {
    throw new Error("Das lia-coordinate-Board konnte nicht aktualisiert werden.");
  }
  persistProposalBoard(runtime, context.target.boardId);
}

function targetRegistryIsEmpty(
  state: CoordinateRegistryState,
  target: CoordinatePointTarget,
): boolean {
  const points = boardBucket(state.points, target.boardId);
  const pointStates = boardBucket(state.pointStates, target.boardId);
  if (
    target.names.some(
      (name) =>
        Boolean(points && hasOwn(points, name)) ||
        Boolean(pointStates && hasOwn(pointStates, name)),
    )
  ) {
    return false;
  }
  if (target.graphKey) {
    const graphs = boardBucket(state.pointGraphs, target.boardId);
    const graphStates = boardBucket(state.pointGraphStates, target.boardId);
    if (
      Boolean(graphs && hasOwn(graphs, target.graphKey)) ||
      Boolean(graphStates && hasOwn(graphStates, target.graphKey))
    ) {
      return false;
    }
  }
  if (target.kind === "point-on-graph") {
    return state.pointOnGraphLocks?.[target.uid] !== true;
  }
  if (target.kind === "points-on-graph") {
    return state.pointsOnGraphLocks?.[target.uid] !== true;
  }
  return true;
}

function proposalMacroSnapshotIsEmpty(
  runtime: CoordinateRuntime,
  target: CoordinatePointTarget,
): boolean {
  if (target.kind !== "create-point") return true;
  const snapshots = runtime.globals.__dgsConstructionStates;
  if (snapshots === undefined) return true;
  if (!isRecord(snapshots)) return false;
  const snapshot = snapshots[target.boardId];
  if (snapshot === undefined) return true;
  if (!isRecord(snapshot) || !Array.isArray(snapshot.records)) return false;
  const macroKey = `macro:point:${target.uid}`;
  return snapshot.records.every(
    (record) =>
      !isRecord(record) ||
      (String(record.macroKey ?? "") !== macroKey &&
        String(record.id ?? "") !== macroKey),
  );
}

function placementButton(
  descriptor: PointDescriptor,
  scope: ParentNode,
): HTMLButtonElement | undefined {
  const prefix =
    descriptor.kind === "create-point"
      ? "btn-"
      : descriptor.kind === "point-on-graph"
        ? "graph-btn-"
        : "multi-graph-btn-";
  const candidates = elementsWithId(scope, `${prefix}${descriptor.uid}`);
  return candidates.length === 1 && candidates[0] instanceof HTMLButtonElement
    ? candidates[0]
    : undefined;
}

function verifyPointReset(context: CoordinatePointResetContext): void {
  const descriptor = liveDescriptor(context);
  if (!("target" in descriptor) || !samePointTarget(descriptor.target, context.target)) {
    throw new Error("Das Ziel des lia-coordinate-Quiz hat sich verändert.");
  }
  const runtime = currentRuntime(context);
  if (!coreIsOpen(descriptor.quiz)) {
    throw new Error("Der lia-coordinate-Core-Zustand wurde nicht geöffnet.");
  }
  if (!targetRegistryIsEmpty(runtime.state, context.target)) {
    throw new Error(
      "Der lia-coordinate-Zielzustand wurde nicht vollständig geleert.",
    );
  }
  if (!proposalMacroSnapshotIsEmpty(runtime, context.target)) {
    throw new Error(
      "Der persistierte Proposal-DGS-Zustand des Coordinate-Quiz wurde nicht geleert.",
    );
  }
  const currentObjects = new Set(liveBoardObjects(runtime.board));
  if (
    context.retainedBoardObjects.some((object) => !currentObjects.has(object)) ||
    context.initiallyOwnedBoardObjects.some((object) => currentObjects.has(object)) ||
    Array.from(context.removedObjects).some((object) => currentObjects.has(object))
  ) {
    throw new Error(
      "Beim lia-coordinate-Reset wurde der JSXGraph-Zustand nicht isoliert verändert.",
    );
  }
  if (!verifySnapshot(context.siblingSnapshot)) {
    throw new Error(
      "Beim lia-coordinate-Reset wurde ein anderes Koordinatenquiz verändert.",
    );
  }
  const place = placementButton(descriptor, context.scope);
  if (
    !place ||
    place.disabled ||
    place.getAttribute("aria-disabled") === "true" ||
    place.style.pointerEvents === "none"
  ) {
    throw new Error(
      "Das lia-coordinate-Quiz ist nach dem Reset nicht wieder bedienbar.",
    );
  }
  for (const object of liveBoardObjects(runtime.board)) {
    if (
      isRecord(object) &&
      object.__liaDgsMacroKey === `macro:point:${context.uid}`
    ) {
      throw new Error(
        "Der Proposal-DGS-Zustand des Coordinate-Quiz wurde nicht geleert.",
      );
    }
  }
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForCoordinateSettle(): Promise<void> {
  await waitForAnimationFrame();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
  await waitForAnimationFrame();
}

export function captureCoordinateContext(
  quiz: HTMLElement,
  scope: HTMLElement,
): CoordinateResetContext | undefined {
  const descriptor = descriptorForQuiz(quiz, scope);
  if (!descriptor) return undefined;

  if (!("target" in descriptor)) {
    const runtime = coordinateRuntimeForBoard(
      descriptor.boardId,
      undefined,
      scope.ownerDocument,
    );
    return {
      mode: "passive",
      kind: descriptor.kind,
      uid: descriptor.uid,
      spec: descriptor.spec,
      boardId: descriptor.boardId,
      scope,
      runtime,
      retainedBoardObjects: liveBoardObjects(runtime.board),
      reconstructionState:
        descriptor.kind === "reconstruction"
          ? reconstructionStateSnapshot(runtime.globals, descriptor.boardId)
          : undefined,
    };
  }

  const descriptors = descriptorsInScope(scope);
  const siblings = descriptors
    .filter(
      (candidate): candidate is PointDescriptor =>
        "target" in candidate && candidate.quiz !== quiz,
    )
    .map((candidate) => candidate.target);
  const staticTargets = staticPointTargets(document);
  const ownership = [...siblings, ...staticTargets];
  assertNoOwnershipCollision(descriptor.target, ownership);

  const runtime = coordinateRuntime(descriptor.target, scope.ownerDocument);
  preflightOwnedObjects(runtime, descriptor.target);
  const owned = ownedBoardObjects(runtime, descriptor.target);
  const retainedBoardObjects = liveBoardObjects(runtime.board).filter(
    (object) => !owned.has(object),
  );

  return {
    mode: "point",
    kind: descriptor.kind,
    uid: descriptor.uid,
    spec: descriptor.spec,
    scope,
    target: descriptor.target,
    siblings,
    ownership,
    runtime,
    siblingSnapshot: siblingSnapshot(runtime.state, siblings),
    retainedBoardObjects,
    initiallyOwnedBoardObjects: Array.from(owned),
    removedObjects: new Set<object>(),
  };
}

export async function resetCoordinateContext(
  context: CoordinateResetContext,
  quiz: HTMLElement,
): Promise<void> {
  const descriptor = liveDescriptor(context);
  if (quiz.isConnected && descriptor.quiz !== quiz) {
    throw new Error(
      "Das lia-coordinate-Quiz stimmt nicht mit dem Core-Ziel überein.",
    );
  }
  if (!coreIsOpen(descriptor.quiz)) {
    throw new Error("Der lia-coordinate-Core-Zustand wurde nicht geöffnet.");
  }

  if (context.mode === "passive") {
    // These quizzes inspect a deliberately shared DGS/Schar/Regression board.
    // Only LiaScript's own Generic state belongs exclusively to this quiz.
    await waitForCoordinateSettle();
    const settled = liveDescriptor(context);
    if (!coreIsOpen(settled.quiz)) {
      throw new Error(
        "Der passive lia-coordinate-Quizzustand blieb nicht geöffnet.",
      );
    }
    const runtime = currentPassiveRuntime(context);
    const currentObjects = new Set(liveBoardObjects(runtime.board));
    const reconstructionPreserved =
      context.kind === "reconstruction" &&
      currentObjects.size === context.retainedBoardObjects.length &&
      context.reconstructionState ===
        reconstructionStateSnapshot(runtime.globals, context.boardId);
    const sharedObjectsPreserved =
      context.kind !== "reconstruction" &&
      context.retainedBoardObjects.every((object) => currentObjects.has(object));
    if (!reconstructionPreserved && !sharedObjectsPreserved) {
      throw new Error(
        "Der geteilte lia-coordinate-Boardzustand wurde beim Einzelreset verändert.",
      );
    }
    return;
  }

  applyPointReset(context);
  await waitForCoordinateSettle();
  applyPointReset(context);
  await waitForCoordinateSettle();
  if (context.kind === "create-point") {
    // Proposal may retry a DGS restore after 160 + 360 + 700 ms. Wait past
    // that complete chain, remove a possibly restored macro point once more,
    // then also outwait the render helper's own 120-ms retry.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1_260));
    applyPointReset(context);
    await waitForCoordinateSettle();
  }
  verifyPointReset(context);
}
