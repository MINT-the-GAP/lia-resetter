type MatheKind = "circle" | "rect";

interface MatheMeta {
  uid?: unknown;
  kind?: unknown;
  target?: unknown;
  locked?: unknown;
  solved?: unknown;
  revealed?: unknown;
  ready?: unknown;
  parts?: unknown;
  rows?: unknown;
  cols?: unknown;
}

interface MatheWidget {
  meta: MatheMeta;
  state: boolean[];
  dims?: {
    rows?: unknown;
    cols?: unknown;
  };
}

interface MathePublicSnapshot {
  state?: unknown;
  meta?: MatheMeta;
}

interface MathePublicApi {
  getAllWidgets(): Record<string, MathePublicSnapshot>;
}

interface MatheStore {
  readonly version: unknown;
  getWidget(uid: string): MatheWidget;
  refreshNodes(uid: string): unknown;
  setCircleParts(
    uid: string,
    parts: number,
    options: { force: true; preserve: false },
  ): boolean[];
  setRectDims(
    uid: string,
    rows: number,
    cols: number,
    options: { force: true; preserve: false },
  ): boolean[];
  syncInputs(uid: string, forceValue: boolean): void;
  syncDomState(uid: string): void;
  render(uid: string): boolean;
}

interface MatheRuntime {
  readonly view: Window;
  readonly api: MathePublicApi;
  readonly store: MatheStore;
}

interface CircleInitial {
  readonly kind: "circle";
  readonly parts: number;
}

interface RectInitial {
  readonly kind: "rect";
  readonly rows: number;
  readonly cols: number;
}

type MatheInitial = CircleInitial | RectInitial;

interface MatheDescriptor {
  readonly uid: string;
  readonly kind: MatheKind;
  readonly wrap: HTMLElement;
  readonly host: HTMLElement;
  readonly mount: HTMLElement;
  readonly quiz: HTMLElement;
  readonly inputs: readonly HTMLInputElement[];
}

export interface MatheResetContext {
  readonly uid: string;
  readonly initial: MatheInitial;
  readonly scope: HTMLElement;
  readonly runtime: MatheRuntime;
  readonly targetSignature: string;
  readonly siblingSignature: string;
}

const PUBLIC_KEY = "__LIA_FRACTION_QUIZ__";
const STORE_KEY = "__LIA_FRACTION_QUIZ_V3__";
const WRAP_SELECTOR =
  "[id^='fq-circle-wrap-'][data-fq-kind='circle'][data-fq-uid]," +
  "[id^='fq-rect-wrap-'][data-fq-kind='rect'][data-fq-uid]";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
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

function looksLikeApi(value: unknown): value is MathePublicApi {
  return (
    isRecord(value) &&
    typeof value.getAllWidgets === "function"
  );
}

function looksLikeStore(value: unknown): value is MatheStore {
  if (!isRecord(value) || value.version !== 3) return false;

  return [
    "getWidget",
    "refreshNodes",
    "setCircleParts",
    "setRectDims",
    "syncInputs",
    "syncDomState",
    "render",
  ].every((key) => typeof value[key] === "function");
}

function looksLikeWidget(value: unknown, uid: string): value is MatheWidget {
  if (!isRecord(value) || !isRecord(value.meta) || !Array.isArray(value.state)) {
    return false;
  }

  return (
    String(value.meta.uid ?? "") === uid &&
    value.state.every((entry) => typeof entry === "boolean")
  );
}

function runtimeForUid(uid: string): MatheRuntime | undefined {
  for (const view of accessibleWindows()) {
    try {
      const globals = view as Window & Record<string, unknown>;
      const api = globals[PUBLIC_KEY];
      const store = globals[STORE_KEY];
      if (!looksLikeApi(api) || !looksLikeStore(store)) continue;

      const snapshots = api.getAllWidgets();
      if (!isRecord(snapshots) || !hasOwn(snapshots, uid)) continue;

      // getWidget creates unknown UIDs lazily. It is intentionally called only
      // after the public snapshot proved that this UID already exists.
      const widget = store.getWidget(uid);
      if (!looksLikeWidget(widget, uid)) continue;
      return { view, api, store };
    } catch {
      // A cross-origin parent or an incompatible template instance is ignored.
    }
  }

  return undefined;
}

function expectedId(kind: MatheKind, part: string, uid: string): string {
  return `fq-${kind}-${part}-${uid}`;
}

function oneElementById<T extends HTMLElement>(
  id: string,
  parent: HTMLElement,
): T | undefined {
  const element = document.getElementById(id);
  return element instanceof HTMLElement && parent.contains(element)
    ? (element as T)
    : undefined;
}

function singleRange(parent: HTMLElement): HTMLInputElement | undefined {
  const inputs = Array.from(
    parent.querySelectorAll<HTMLInputElement>("input[type='range']"),
  );
  return inputs.length === 1 ? inputs[0] : undefined;
}

function descriptorForWrap(
  wrap: HTMLElement,
  preferredQuiz?: HTMLElement,
): MatheDescriptor | undefined {
  const uid = (wrap.dataset.fqUid ?? "").trim();
  const kindValue = (wrap.dataset.fqKind ?? "").trim();
  if (!uid || (kindValue !== "circle" && kindValue !== "rect")) {
    return undefined;
  }
  const kind: MatheKind = kindValue;
  if (wrap.id !== expectedId(kind, "wrap", uid)) return undefined;

  const quizzes = Array.from(
    wrap.querySelectorAll<HTMLElement>(".lia-quiz.lia-quiz-generic"),
  );
  if (quizzes.length !== 1 || (preferredQuiz && quizzes[0] !== preferredQuiz)) {
    return undefined;
  }

  const host = oneElementById<HTMLElement>(
    expectedId(kind, "host", uid),
    wrap,
  );
  const mount = oneElementById<HTMLElement>(
    expectedId(kind, "mount", uid),
    wrap,
  );
  if (!host || !mount || !host.contains(mount)) return undefined;

  if (kind === "circle") {
    const rangeWrap = oneElementById<HTMLElement>(
      expectedId(kind, "range", uid),
      wrap,
    );
    const input = rangeWrap ? singleRange(rangeWrap) : undefined;
    if (!rangeWrap || !input || !host.contains(rangeWrap)) return undefined;
    return { uid, kind, wrap, host, mount, quiz: quizzes[0], inputs: [input] };
  }

  const rowsWrap = oneElementById<HTMLElement>(
    expectedId(kind, "rows-wrap", uid),
    wrap,
  );
  const colsWrap = oneElementById<HTMLElement>(
    expectedId(kind, "cols-wrap", uid),
    wrap,
  );
  const rows = rowsWrap ? singleRange(rowsWrap) : undefined;
  const cols = colsWrap ? singleRange(colsWrap) : undefined;
  if (
    !rowsWrap ||
    !colsWrap ||
    !rows ||
    !cols ||
    !host.contains(rowsWrap) ||
    !host.contains(colsWrap)
  ) {
    return undefined;
  }

  return {
    uid,
    kind,
    wrap,
    host,
    mount,
    quiz: quizzes[0],
    inputs: [rows, cols],
  };
}

function descriptorForQuiz(quiz: HTMLElement): MatheDescriptor | undefined {
  const wrap = quiz.closest<HTMLElement>(WRAP_SELECTOR);
  return wrap ? descriptorForWrap(wrap, quiz) : undefined;
}

function descriptorForUid(
  uid: string,
  preferredQuiz?: HTMLElement,
): MatheDescriptor | undefined {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>(WRAP_SELECTOR),
  )
    .map((wrap) => descriptorForWrap(wrap))
    .filter(
      (descriptor): descriptor is MatheDescriptor =>
        descriptor?.uid === uid,
    );
  if (matches.length !== 1) return undefined;

  const descriptor = matches[0];
  if (
    preferredQuiz?.isConnected &&
    descriptor.quiz !== preferredQuiz
  ) {
    return undefined;
  }
  return descriptor;
}

function authoredInteger(
  input: HTMLInputElement,
  fallbackMin: number,
  fallbackMax: number,
): number | undefined {
  const raw = input.getAttribute("value") ?? input.defaultValue;
  if (!/^\d+$/.test(raw.trim())) return undefined;

  const value = Number(raw);
  const parsedMin = input.min.trim() ? Number(input.min) : Number.NaN;
  const parsedMax = input.max.trim() ? Number(input.max) : Number.NaN;
  const min = Number.isFinite(parsedMin) ? parsedMin : fallbackMin;
  const max = Number.isFinite(parsedMax) ? parsedMax : fallbackMax;
  return Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function initialForDescriptor(
  descriptor: MatheDescriptor,
): MatheInitial | undefined {
  if (descriptor.kind === "circle") {
    const parts = authoredInteger(descriptor.inputs[0], 1, 32);
    return parts === undefined ? undefined : { kind: "circle", parts };
  }

  const rows = authoredInteger(descriptor.inputs[0], 1, 20);
  const cols = authoredInteger(descriptor.inputs[1], 1, 20);
  return rows === undefined || cols === undefined
    ? undefined
    : { kind: "rect", rows, cols };
}

function targetSignature(widget: MatheWidget): string {
  const meta = widget.meta;
  return JSON.stringify({
    uid: meta.uid ?? null,
    kind: meta.kind ?? null,
    target: meta.target ?? null,
    ready: meta.ready ?? null,
  });
}

function statusAttributes(descriptor: MatheDescriptor): unknown[] {
  return [descriptor.wrap, descriptor.host, descriptor.mount].map((element) => ({
    locked: element.getAttribute("data-fq-locked"),
    solved: element.getAttribute("data-fq-solved"),
    revealed: element.getAttribute("data-fq-revealed"),
  }));
}

function inputSnapshot(input: HTMLInputElement): unknown {
  return {
    value: input.value,
    defaultValue: input.defaultValue,
    authoredValue: input.getAttribute("value"),
    disabled: input.disabled,
  };
}

function widgetSnapshot(
  descriptor: MatheDescriptor,
  runtime: MatheRuntime,
): unknown {
  const publicWidget = runtime.api.getAllWidgets()[descriptor.uid];
  const widget = runtime.store.getWidget(descriptor.uid);
  if (!publicWidget || !looksLikeWidget(widget, descriptor.uid)) {
    throw new Error(
      "Ein lia-Mathe-Zustand konnte nicht eindeutig gelesen werden.",
    );
  }

  return {
    uid: descriptor.uid,
    kind: descriptor.kind,
    public: {
      state: publicWidget.state ?? null,
      meta: publicWidget.meta ?? null,
    },
    internal: {
      state: widget.state.slice(),
      dims: widget.dims
        ? { rows: widget.dims.rows ?? null, cols: widget.dims.cols ?? null }
        : null,
      meta: {
        uid: widget.meta.uid ?? null,
        kind: widget.meta.kind ?? null,
        target: widget.meta.target ?? null,
        locked: widget.meta.locked ?? null,
        solved: widget.meta.solved ?? null,
        revealed: widget.meta.revealed ?? null,
        ready: widget.meta.ready ?? null,
        parts: widget.meta.parts ?? null,
        rows: widget.meta.rows ?? null,
        cols: widget.meta.cols ?? null,
      },
    },
    inputs: descriptor.inputs.map(inputSnapshot),
    status: statusAttributes(descriptor),
    parts: Array.from(
      descriptor.mount.querySelectorAll<SVGElement>("[data-fq-part]"),
    ).map((part) => ({
      index: part.getAttribute("data-fq-part"),
      fill: part.getAttribute("fill"),
    })),
    quiz: {
      solved: descriptor.quiz.classList.contains("solved"),
      resolved: descriptor.quiz.classList.contains("resolved"),
    },
  };
}

function siblingSnapshot(scope: HTMLElement, excludedUid: string): string {
  const entries: Array<{ uid: string; snapshot: unknown }> = [];
  const seen = new Set<string>();

  for (const wrap of Array.from(
    scope.querySelectorAll<HTMLElement>(WRAP_SELECTOR),
  )) {
    const descriptor = descriptorForWrap(wrap);
    if (!descriptor) continue;
    if (seen.has(descriptor.uid)) {
      throw new Error("Eine lia-Mathe-UID ist auf dieser Folie nicht eindeutig.");
    }
    seen.add(descriptor.uid);
    if (descriptor.uid === excludedUid) continue;

    const runtime = runtimeForUid(descriptor.uid);
    if (!runtime) {
      throw new Error(
        "Der Zustand eines benachbarten lia-Mathe-Quiz ist nicht verfügbar.",
      );
    }
    entries.push({
      uid: descriptor.uid,
      snapshot: widgetSnapshot(descriptor, runtime),
    });
  }

  entries.sort((left, right) => left.uid.localeCompare(right.uid));
  return JSON.stringify(entries);
}

export function resetMatheWidgetProgress(widget: MatheWidget): void {
  widget.meta.locked = false;
  widget.meta.solved = false;
  widget.meta.revealed = false;
}

export function captureMatheContext(
  quiz: HTMLElement,
  scope: HTMLElement,
): MatheResetContext | undefined {
  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor) return undefined;
  if (!scope.contains(descriptor.wrap)) {
    throw new Error("Das lia-Mathe-Quiz liegt nicht eindeutig auf dieser Folie.");
  }
  const uniqueDescriptor = descriptorForUid(descriptor.uid, quiz);
  if (!uniqueDescriptor || uniqueDescriptor.wrap !== descriptor.wrap) {
    throw new Error(
      "Die UID dieses lia-Mathe-Quiz ist im Dokument nicht eindeutig.",
    );
  }

  const initial = initialForDescriptor(descriptor);
  const runtime = runtimeForUid(descriptor.uid);
  if (!initial || !runtime) {
    throw new Error(
      "Der Zustand dieses lia-Mathe-Quiz ist noch nicht eindeutig verfügbar.",
    );
  }

  const widget = runtime.store.getWidget(descriptor.uid);
  if (
    !looksLikeWidget(widget, descriptor.uid) ||
    widget.meta.kind !== descriptor.kind ||
    widget.meta.ready !== true
  ) {
    throw new Error(
      "Das lia-Mathe-Quiz ist noch nicht vollständig initialisiert.",
    );
  }

  return {
    uid: descriptor.uid,
    initial,
    scope,
    runtime,
    targetSignature: targetSignature(widget),
    siblingSignature: siblingSnapshot(scope, descriptor.uid),
  };
}

function setRangeValue(input: HTMLInputElement, value: number): void {
  input.disabled = false;
  const ownerView = input.ownerDocument.defaultView;
  const InputConstructor = ownerView?.HTMLInputElement ?? HTMLInputElement;
  const EventConstructor = ownerView?.Event ?? Event;
  const setter = Object.getOwnPropertyDescriptor(
    InputConstructor.prototype,
    "value",
  )?.set;
  if (setter) setter.call(input, String(value));
  else input.value = String(value);

  input.dispatchEvent(
    new EventConstructor("input", { bubbles: true, composed: true }),
  );
  input.dispatchEvent(
    new EventConstructor("change", { bubbles: true, composed: true }),
  );
}

function validateRuntime(
  context: MatheResetContext,
  descriptor: MatheDescriptor,
): { runtime: MatheRuntime; widget: MatheWidget } {
  const runtime = runtimeForUid(context.uid);
  if (
    !runtime ||
    runtime.api !== context.runtime.api ||
    runtime.store !== context.runtime.store
  ) {
    throw new Error(
      "Die lia-Mathe-Laufzeit wurde während des Resets ausgetauscht.",
    );
  }

  const widget = runtime.store.getWidget(context.uid);
  if (
    !looksLikeWidget(widget, context.uid) ||
    widget.meta.kind !== descriptor.kind ||
    descriptor.kind !== context.initial.kind ||
    targetSignature(widget) !== context.targetSignature
  ) {
    throw new Error(
      "Das Ziel des lia-Mathe-Quiz hat sich während des Resets verändert.",
    );
  }
  return { runtime, widget };
}

function applyMatheReset(
  context: MatheResetContext,
  preferredQuiz: HTMLElement,
): MatheDescriptor {
  let descriptor = descriptorForUid(context.uid, preferredQuiz);
  if (!descriptor) {
    throw new Error("Das lia-Mathe-Quiz wurde nach dem Core-Reset nicht gefunden.");
  }

  const { runtime, widget } = validateRuntime(context, descriptor);
  resetMatheWidgetProgress(widget);

  if (context.initial.kind === "circle") {
    runtime.store.setCircleParts(context.uid, context.initial.parts, {
      force: true,
      preserve: false,
    });
  } else {
    runtime.store.setRectDims(
      context.uid,
      context.initial.rows,
      context.initial.cols,
      { force: true, preserve: false },
    );
  }

  runtime.store.refreshNodes(context.uid);
  descriptor = descriptorForUid(context.uid, descriptor.quiz);
  if (!descriptor) {
    throw new Error("Die Eingaben des lia-Mathe-Quiz wurden nicht gefunden.");
  }

  descriptor.inputs.forEach((input, index) => {
    const value =
      context.initial.kind === "circle"
        ? context.initial.parts
        : index === 0
          ? context.initial.rows
          : context.initial.cols;
    setRangeValue(input, value);
  });

  // Range events synchronize LiaScript's own input model. Enforce the same
  // target state once more afterwards because the rect inputs fire separately.
  resetMatheWidgetProgress(widget);
  if (context.initial.kind === "circle") {
    runtime.store.setCircleParts(context.uid, context.initial.parts, {
      force: true,
      preserve: false,
    });
  } else {
    runtime.store.setRectDims(
      context.uid,
      context.initial.rows,
      context.initial.cols,
      { force: true, preserve: false },
    );
  }
  resetMatheWidgetProgress(widget);
  runtime.store.refreshNodes(context.uid);
  runtime.store.syncInputs(context.uid, true);
  runtime.store.syncDomState(context.uid);
  runtime.store.render(context.uid);

  return descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;
}

function publicStateIsPristine(
  snapshot: MathePublicSnapshot | undefined,
  expectedLength: number,
): boolean {
  return (
    Boolean(snapshot) &&
    Array.isArray(snapshot?.state) &&
    snapshot.state.length === expectedLength &&
    snapshot.state.every((value) => value === false) &&
    snapshot.meta?.locked === false &&
    snapshot.meta?.solved === false &&
    snapshot.meta?.revealed === false &&
    snapshot.meta?.ready === true
  );
}

function targetIsPristine(
  context: MatheResetContext,
  descriptor: MatheDescriptor,
): boolean {
  let validated: { runtime: MatheRuntime; widget: MatheWidget };
  try {
    validated = validateRuntime(context, descriptor);
  } catch {
    return false;
  }

  const { runtime, widget } = validated;
  const expectedLength =
    context.initial.kind === "circle"
      ? context.initial.parts
      : context.initial.rows * context.initial.cols;
  const metaIsPristine =
    widget.meta.ready === true &&
    widget.meta.locked === false &&
    widget.meta.solved === false &&
    widget.meta.revealed === false;
  const stateIsPristine =
    widget.state.length === expectedLength &&
    widget.state.every((value) => value === false);
  const dimensionsArePristine =
    context.initial.kind === "circle"
      ? widget.meta.parts === context.initial.parts && widget.dims === undefined
      : widget.meta.rows === context.initial.rows &&
        widget.meta.cols === context.initial.cols &&
        widget.dims?.rows === context.initial.rows &&
        widget.dims?.cols === context.initial.cols;
  const inputsArePristine = descriptor.inputs.every((input, index) => {
    const expected =
      context.initial.kind === "circle"
        ? context.initial.parts
        : index === 0
          ? context.initial.rows
          : context.initial.cols;
    return input.value === String(expected) && input.disabled === false;
  });
  const domStateIsPristine = statusAttributes(descriptor).every(
    (status) =>
      isRecord(status) &&
      status.locked === "0" &&
      status.solved === "0" &&
      status.revealed === "0",
  );
  const parts = Array.from(
    descriptor.mount.querySelectorAll<SVGElement>("[data-fq-part]"),
  );
  const svgIsPristine =
    parts.length === expectedLength &&
    parts.every((part) => part.getAttribute("fill") === "transparent");
  const check = descriptor.quiz.querySelector<HTMLButtonElement>(
    ".lia-quiz__check",
  );
  const coreDomIsPristine =
    !descriptor.quiz.classList.contains("solved") &&
    !descriptor.quiz.classList.contains("resolved") &&
    Boolean(check) &&
    check?.disabled === false;

  return (
    metaIsPristine &&
    stateIsPristine &&
    dimensionsArePristine &&
    inputsArePristine &&
    domStateIsPristine &&
    svgIsPristine &&
    coreDomIsPristine &&
    publicStateIsPristine(
      runtime.api.getAllWidgets()[context.uid],
      expectedLength,
    )
  );
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForMatheSettle(): Promise<void> {
  await waitForAnimationFrame();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 130));
  await waitForAnimationFrame();
}

export async function resetMatheContext(
  context: MatheResetContext,
  quiz: HTMLElement,
): Promise<void> {
  // lia-Mathe schedules reveal handling in a zero-delay task. Let a pending
  // callback finish before the target state is deliberately reopened.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  let descriptor = applyMatheReset(context, quiz);
  await waitForMatheSettle();
  descriptor = descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;

  if (!targetIsPristine(context, descriptor)) {
    descriptor = applyMatheReset(context, descriptor.quiz);
    await waitForMatheSettle();
    descriptor = descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;
  }

  if (!targetIsPristine(context, descriptor)) {
    throw new Error(
      "Der lia-Mathe-Zustand wurde nicht vollständig und stabil geöffnet.",
    );
  }

  const liveScope =
    descriptor.quiz.closest<HTMLElement>("main.lia-slide__content") ??
    context.scope;
  if (
    siblingSnapshot(liveScope, context.uid) !== context.siblingSignature
  ) {
    throw new Error(
      "Beim lia-Mathe-Reset wurde ein anderes lia-Mathe-Quiz verändert.",
    );
  }
}
