import {
  captureCoordinateMacroState,
  coordinateMacroStateMismatch,
  restoreCoordinateMacroState,
  type CoordinateMacroState,
} from "./coordinate-macro-state.ts";

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
  containerObj?: HTMLElement;
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
  readonly macroState: CoordinateMacroState;
  readonly siblingSnapshot: readonly SnapshotSlot[];
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
  readonly macroState: CoordinateMacroState;
}

type CoordinateResetContext =
  | CoordinatePointResetContext
  | CoordinatePassiveResetContext;

const GENERIC_QUIZ_SELECTOR = ".lia-quiz.lia-quiz-generic";
const FOLLOWING = 4;
const coordinateCaptureInteraction = new WeakMap<
  HTMLElement,
  readonly Readonly<{
    element: HTMLElement;
    inert: boolean;
    pointerEvents: string;
    ariaBusy: string | null;
  }>[]
>();

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
  const mismatch = coordinateMacroStateMismatch(runtime, context.macroState);
  if (mismatch) {
    throw new Error(
      `Das lia-coordinate-Board entspricht nach dem Reset nicht seinem Makrozustand${mismatch ? ` (${mismatch})` : ""}.`,
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
  await new Promise<void>((resolve) => window.setTimeout(resolve, 260));
  await waitForAnimationFrame();
}

function descriptorBoardId(descriptor: CoordinateDescriptor): string {
  return "target" in descriptor
    ? descriptor.target.boardId
    : descriptor.boardId;
}

interface CoordinateMacroMarker {
  readonly node: HTMLElement;
  readonly uid: string;
  readonly spec: string;
  readonly language: string;
}

interface CoordinateStaticPointMarker extends CoordinateMacroMarker {
  readonly name: string;
}

type CoordinateMacroRenderMode = "plain" | "language" | "kind-language";

interface CoordinateAuthoredObjectMarker extends CoordinateMacroMarker {
  readonly macroKind: string;
  readonly renderer: string;
  readonly renderMode: CoordinateMacroRenderMode;
  readonly dgsKeyPrefix?: string;
}

interface CoordinateMacroManifest {
  readonly dgs: readonly CoordinateMacroMarker[];
  readonly dgsInstruments: readonly CoordinateMacroMarker[];
  readonly schar: readonly CoordinateMacroMarker[];
  readonly regression: readonly CoordinateMacroMarker[];
  readonly sliders: readonly CoordinateMacroMarker[];
  readonly tables: readonly CoordinateMacroMarker[];
  readonly plotInputs: readonly CoordinateMacroMarker[];
  readonly staticPoints: readonly CoordinateStaticPointMarker[];
  readonly authoredObjects: readonly CoordinateAuthoredObjectMarker[];
}

interface CoordinateAuthoredMarkerDefinition {
  readonly macroKind: string;
  readonly selector: string;
  readonly prefix: string;
  readonly renderer: string;
  readonly renderMode: CoordinateMacroRenderMode;
  readonly dgsKeyPrefix?: (uid: string) => string;
}

const COORDINATE_AUTHORED_MARKERS: readonly CoordinateAuthoredMarkerDefinition[] = [
  {
    macroKind: "point",
    selector: "[id^='point-spec-'][data-spec]",
    prefix: "point-spec-",
    renderer: "renderStaticPointFromSpec",
    renderMode: "plain",
    dgsKeyPrefix: (uid) => `macro:point:${uid}`,
  },
  {
    macroKind: "coord-text",
    selector: ".lia-coord-text-spec[id][data-spec],[id^='coord-text-spec-'][data-spec]",
    prefix: "coord-text-spec-",
    renderer: "renderCoordTextFromSpec",
    renderMode: "plain",
    dgsKeyPrefix: (uid) => `macro:coordTextEntries:coord-text-${uid}:text`,
  },
  {
    macroKind: "distance",
    selector: "[id^='distance-spec-'][data-spec]",
    prefix: "distance-spec-",
    renderer: "renderDistanceFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:distanceEntries:distance-${uid}:`,
  },
  {
    macroKind: "linear",
    selector: "[id^='linear-spec-'][data-spec]",
    prefix: "linear-spec-",
    renderer: "renderLinearObjectFromSpec",
    renderMode: "kind-language",
    dgsKeyPrefix: (uid) => `macro:linearObjectEntries:linear-${uid}:`,
  },
  {
    macroKind: "arc",
    selector: "[id^='arc-spec-'][data-spec]",
    prefix: "arc-spec-",
    renderer: "renderArcFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:arcEntries:arc-${uid}:`,
  },
  {
    macroKind: "relation",
    selector: "[id^='relation-spec-'][data-spec]",
    prefix: "relation-spec-",
    renderer: "renderRelationObjectFromSpec",
    renderMode: "kind-language",
    dgsKeyPrefix: (uid) => `macro:relationObjectEntries:relation-${uid}:`,
  },
  {
    macroKind: "area",
    selector: "[id^='area-spec-'][data-spec]",
    prefix: "area-spec-",
    renderer: "renderAreaFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:areaEntries:area-${uid}:`,
  },
  {
    macroKind: "angle",
    selector: "[id^='angle-spec-'][data-spec]",
    prefix: "angle-spec-",
    renderer: "renderAngleFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:angleEntries:angle-${uid}:angle`,
  },
  {
    macroKind: "circle",
    selector: "[id^='circle-spec-'][data-spec]",
    prefix: "circle-spec-",
    renderer: "renderCircleFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:circleEntries:circle-${uid}:circle`,
  },
  {
    macroKind: "tangent",
    selector: "[id^='tangent-spec-'][data-spec]",
    prefix: "tangent-spec-",
    renderer: "renderTangentFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:tangentEntries:tangent-${uid}:`,
  },
  {
    macroKind: "sector",
    selector: "[id^='sector-spec-'][data-spec]",
    prefix: "sector-spec-",
    renderer: "renderCircularSectorFromSpec",
    renderMode: "language",
    dgsKeyPrefix: (uid) => `macro:sectorEntries:sector-${uid}:sector`,
  },
  {
    macroKind: "plot",
    selector: "[id^='plot-spec-'][data-spec]",
    prefix: "plot-spec-",
    renderer: "renderPlotFunctionFromSpec",
    renderMode: "plain",
    dgsKeyPrefix: (uid) => `macro:plotFunctionEntries:plot-${uid}:graph`,
  },
  {
    macroKind: "function-analysis",
    selector: "[id^='function-analysis-spec-'][data-spec]",
    prefix: "function-analysis-spec-",
    renderer: "renderFunctionAnalysisPointsFromSpec",
    renderMode: "kind-language",
  },
  {
    macroKind: "object-analysis",
    selector: "[id^='object-analysis-spec-'][data-spec]",
    prefix: "object-analysis-spec-",
    renderer: "renderObjectAnalysisPointsFromSpec",
    renderMode: "kind-language",
  },
];

function markerUid(node: HTMLElement, prefix: string): string {
  return node.id.startsWith(prefix) ? node.id.slice(prefix.length) : "";
}

function marker(
  node: HTMLElement,
  prefix: string,
): CoordinateMacroMarker | undefined {
  const uid = markerUid(node, prefix);
  const spec = String(node.dataset.spec ?? "").trim();
  return uid && spec
    ? {
        node,
        uid,
        spec,
        language: String(node.dataset.language ?? "de"),
      }
    : undefined;
}

function markersForBoard(
  scope: HTMLElement,
  selector: string,
  prefix: string,
  boardId: string,
  boardPart = 0,
): CoordinateMacroMarker[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(selector))
    .map((node) => marker(node, prefix))
    .filter(
      (entry): entry is CoordinateMacroMarker =>
        entry !== undefined && specParts(entry.spec)[boardPart] === boardId,
    );
}

function tableBoardId(spec: string): string {
  for (const part of specParts(spec).slice(3)) {
    const match = /^id\s*=\s*(.+)$/i.exec(part);
    if (match) return unquote(match[1]).trim();
  }
  return "";
}

function coordinateMacroManifest(
  scope: HTMLElement,
  boardId: string,
): CoordinateMacroManifest {
  const authoredObjects = COORDINATE_AUTHORED_MARKERS.flatMap((definition) =>
    markersForBoard(
      scope,
      definition.selector,
      definition.prefix,
      boardId,
    ).map((entry) => ({
      ...entry,
      macroKind: definition.macroKind,
      renderer: definition.renderer,
      renderMode: definition.renderMode,
      ...(definition.dgsKeyPrefix
        ? { dgsKeyPrefix: definition.dgsKeyPrefix(entry.uid) }
        : {}),
    })),
  );
  const staticPoints = authoredObjects
    .filter((entry) => entry.macroKind === "point")
    .map((entry) => ({
    ...entry,
    name: parseCreatePointTarget(entry.spec, entry.uid).names[0] ?? "",
    }));
  const tables = Array.from(
    scope.querySelectorAll<HTMLElement>("[id^='lia-table-'][data-spec]"),
  )
    .map((node) => marker(node, "lia-table-"))
    .filter(
      (entry): entry is CoordinateMacroMarker =>
        entry !== undefined && tableBoardId(entry.spec) === boardId,
    );
  return {
    dgs: markersForBoard(
      scope,
      "[id^='dgs-ui-'][data-spec]",
      "dgs-ui-",
      boardId,
    ),
    dgsInstruments: markersForBoard(
      scope,
      "[id^='dgs-instrument-ui-'][data-spec][data-instrument]",
      "dgs-instrument-ui-",
      boardId,
    ),
    schar: markersForBoard(
      scope,
      "[id^='schar-spec-'][data-spec]",
      "schar-spec-",
      boardId,
      3,
    ),
    regression: markersForBoard(
      scope,
      "[id^='regression-ui-'][data-spec]",
      "regression-ui-",
      boardId,
    ),
    sliders: markersForBoard(
      scope,
      "[id^='slider-spec-'][data-spec]",
      "slider-spec-",
      boardId,
    ),
    tables,
    plotInputs: markersForBoard(
      scope,
      "[id^='lia-plot-input-'][data-spec]",
      "lia-plot-input-",
      boardId,
    ),
    staticPoints,
    authoredObjects,
  };
}

function invokeMacroRenderer(
  runtime: CoordinateRuntime,
  name: string,
  args: readonly unknown[],
): void {
  const renderer = runtime.globals[name];
  if (typeof renderer === "function") {
    Reflect.apply(renderer, runtime.view, args);
  }
}

function prepareCoordinateMacroBoard(
  runtime: CoordinateRuntime,
  manifest: CoordinateMacroManifest,
): void {
  for (const entry of manifest.authoredObjects) {
    const args: unknown[] = [entry.uid, entry.spec];
    if (entry.renderMode === "kind-language") {
      args.push(String(entry.node.dataset.kind ?? ""));
    }
    if (entry.renderMode !== "plain") args.push(entry.language);
    invokeMacroRenderer(runtime, entry.renderer, args);
  }
  for (const entry of manifest.schar) {
    invokeMacroRenderer(runtime, "renderScharFromSpec", [
      entry.uid,
      entry.spec,
    ]);
  }
  for (const entry of manifest.sliders) {
    invokeMacroRenderer(runtime, "renderSliderFromSpec", [
      entry.uid,
      entry.spec,
      entry.language,
    ]);
  }
  for (const entry of manifest.tables) {
    invokeMacroRenderer(runtime, "renderTableFromSpec", [
      entry.uid,
      entry.spec,
      false,
    ]);
  }
  for (const entry of manifest.plotInputs) {
    invokeMacroRenderer(runtime, "renderPlotInputFromSpec", [
      entry.uid,
      entry.spec,
    ]);
  }
  for (const entry of manifest.regression) {
    invokeMacroRenderer(runtime, "__setupRegressionUI", [
      entry.uid,
      entry.spec,
      entry.language,
    ]);
  }
  for (const entry of manifest.dgs) {
    invokeMacroRenderer(runtime, "__setupDGS", [
      entry.uid,
      entry.spec,
      entry.language,
    ]);
  }
  for (const entry of manifest.dgsInstruments) {
    invokeMacroRenderer(runtime, "__setupDGSInstrument", [
      entry.uid,
      entry.spec,
      String(entry.node.dataset.instrument ?? ""),
      entry.language,
    ]);
  }
}

function assertExclusiveCoordinateBoard(
  descriptor: CoordinateDescriptor,
  scope: HTMLElement,
): void {
  const boardId = descriptorBoardId(descriptor);
  const owners = descriptorsInScope(scope).filter(
    (candidate) => descriptorBoardId(candidate) === boardId,
  );
  if (owners.length !== 1 || owners[0].quiz !== descriptor.quiz) {
    throw new Error(
      "Ein vollständiger Coordinate-Reset benötigt genau ein Quiz pro Board-ID.",
    );
  }
}

export function captureCoordinateMacroStateForQuiz(
  quiz: HTMLElement,
  scope: HTMLElement,
): CoordinateMacroState | undefined {
  const descriptor = descriptorForQuiz(quiz, scope);
  if (!descriptor) return undefined;
  assertExclusiveCoordinateBoard(descriptor, scope);
  const boardId = descriptorBoardId(descriptor);
  const runtime = "target" in descriptor
    ? coordinateRuntime(descriptor.target, scope.ownerDocument)
    : coordinateRuntimeForBoard(boardId, undefined, scope.ownerDocument);
  const manifest = coordinateMacroManifest(scope, boardId);
  prepareCoordinateMacroBoard(runtime, manifest);
  const requiresDgs =
    manifest.dgs.length > 0 || manifest.dgsInstruments.length > 0;
  const requirements = {
    requireDgs: requiresDgs,
    requireRegression:
      descriptor.kind === "reconstruction" ||
      requiresDgs ||
      manifest.regression.length > 0,
    scharUids: manifest.schar.map((entry) => entry.uid),
    sliderUids: manifest.sliders.map((entry) => entry.uid),
    tableUids: manifest.tables.map((entry) => entry.uid),
    plotInputUids: manifest.plotInputs.map((entry) => entry.uid),
    pointNames: manifest.staticPoints.map((entry) => entry.name).filter(Boolean),
    dgsMacroKeys: requiresDgs
      ? manifest.staticPoints.map((entry) => `macro:point:${entry.uid}`)
      : [],
    dgsMacroKeyPrefixes: requiresDgs
      ? [
          ...manifest.authoredObjects.flatMap((entry) =>
            entry.dgsKeyPrefix ? [entry.dgsKeyPrefix] : [],
          ),
          ...manifest.sliders.map(
            (entry) => `macro:sliderEntries:slider-${entry.uid}:slider`,
          ),
        ]
      : [],
  };
  return captureCoordinateMacroState(runtime, boardId, requirements);
}

export function validateCoordinateResetConfigurationForQuiz(
  quiz: HTMLElement,
  scope: HTMLElement,
): boolean {
  const descriptor = descriptorForQuiz(quiz, scope);
  if (!descriptor) return false;
  assertExclusiveCoordinateBoard(descriptor, scope);
  return true;
}

export function setCoordinateMacroCaptureBlocked(
  quiz: HTMLElement,
  scope: HTMLElement,
  blocked: boolean,
): boolean {
  const previous = coordinateCaptureInteraction.get(quiz);
  if (!blocked) {
    if (!previous) return false;
    for (const state of previous) {
      state.element.inert = state.inert;
      state.element.style.pointerEvents = state.pointerEvents;
      if (state.ariaBusy === null) state.element.removeAttribute("aria-busy");
      else state.element.setAttribute("aria-busy", state.ariaBusy);
    }
    coordinateCaptureInteraction.delete(quiz);
    return true;
  }
  if (previous) return true;

  const descriptor = descriptorForQuiz(quiz, scope);
  if (!descriptor) return false;
  const boardId = descriptorBoardId(descriptor);
  const runtime = "target" in descriptor
    ? coordinateRuntime(descriptor.target, scope.ownerDocument)
    : coordinateRuntimeForBoard(boardId, undefined, scope.ownerDocument);
  const elements = [quiz, runtime.board.containerObj].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  );
  const unique = elements.filter(
    (element, index) => elements.indexOf(element) === index,
  );
  coordinateCaptureInteraction.set(
    quiz,
    unique.map((element) => ({
      element,
      inert: element.inert,
      pointerEvents: element.style.pointerEvents,
      ariaBusy: element.getAttribute("aria-busy"),
    })),
  );
  for (const element of unique) {
    element.inert = true;
    element.style.pointerEvents = "none";
    element.setAttribute("aria-busy", "true");
  }
  return true;
}

export function captureCoordinateContext(
  quiz: HTMLElement,
  scope: HTMLElement,
  macroState?: CoordinateMacroState,
): CoordinateResetContext | undefined {
  const descriptor = descriptorForQuiz(quiz, scope);
  if (!descriptor) return undefined;
  assertExclusiveCoordinateBoard(descriptor, scope);
  const boardId = descriptorBoardId(descriptor);
  if (!macroState || macroState.boardId !== boardId) {
    throw new Error(
      "Der unveränderte lia-coordinate-Makrozustand wurde vor der Interaktion nicht erfasst.",
    );
  }

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
      macroState,
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
    macroState,
    siblingSnapshot: siblingSnapshot(runtime.state, siblings),
    initiallyOwnedBoardObjects: Array.from(owned),
    removedObjects: new Set<object>(),
  };
}

function rebootstrapPassiveCoordinateQuiz(
  context: CoordinatePassiveResetContext,
): void {
  if (context.kind !== "reconstruction") return;
  const runtime = currentPassiveRuntime(context);
  for (const name of [
    "__setupReconstructionQuiz",
    "__setupRekonstruktionQuiz",
  ]) {
    const setup = runtime.globals[name];
    if (typeof setup !== "function") continue;
    Reflect.apply(setup, runtime.view, [context.uid, context.spec]);
    return;
  }
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
    restoreCoordinateMacroState(currentPassiveRuntime(context), context.macroState);
    rebootstrapPassiveCoordinateQuiz(context);
    await waitForCoordinateSettle();
    restoreCoordinateMacroState(
      currentPassiveRuntime(context),
      context.macroState,
      { applyDgs: false },
    );
    rebootstrapPassiveCoordinateQuiz(context);
    await waitForCoordinateSettle();
    // Proposal retries macro/DGS restores at 120, 160, 360 and 700 ms.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1_260));
    restoreCoordinateMacroState(
      currentPassiveRuntime(context),
      context.macroState,
      { applyDgs: false },
    );
    rebootstrapPassiveCoordinateQuiz(context);
    await waitForCoordinateSettle();
    const settled = liveDescriptor(context);
    if (!coreIsOpen(settled.quiz)) {
      throw new Error(
        "Der passive lia-coordinate-Quizzustand blieb nicht geöffnet.",
      );
    }
    const runtime = currentPassiveRuntime(context);
    const mismatch = coordinateMacroStateMismatch(runtime, context.macroState);
    if (mismatch) {
      throw new Error(
        `Das lia-coordinate-Board entspricht nach dem Reset nicht seinem Makrozustand${mismatch ? ` (${mismatch})` : ""}.`,
      );
    }
    return;
  }

  applyPointReset(context);
  restoreCoordinateMacroState(currentRuntime(context), context.macroState);
  await waitForCoordinateSettle();
  applyPointReset(context);
  restoreCoordinateMacroState(
    currentRuntime(context),
    context.macroState,
    { applyDgs: false },
  );
  await waitForCoordinateSettle();
  // Outwait Proposal's complete delayed macro/DGS restore chain.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 1_260));
  applyPointReset(context);
  restoreCoordinateMacroState(
    currentRuntime(context),
    context.macroState,
    { applyDgs: false },
  );
  await waitForCoordinateSettle();
  verifyPointReset(context);
}
