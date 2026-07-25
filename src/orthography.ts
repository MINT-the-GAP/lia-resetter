interface OrthographyPluginState {
  start?: unknown;
  solution?: unknown;
  liveValue?: unknown;
  solved?: unknown;
  tries?: unknown;
  checkToken?: unknown;
  resolvePending?: unknown;
  gate?: {
    mode?: unknown;
    n?: unknown;
  };
}

interface OrthographyPluginApi {
  getAllStates(): Record<string, OrthographyPluginState>;
  setState(uid: string, value: string): void;
}

interface OrthographyDescriptor {
  readonly uid: string;
  readonly ui: HTMLElement;
  readonly wrap: HTMLElement;
  readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly start: string;
  readonly quiz: HTMLElement;
}

export interface OrthographyResetContext {
  readonly uid: string;
  readonly start: string;
  readonly scope: HTMLElement;
  readonly siblingSignature: string;
}

const MODULE_KEY = "__ORTHOGRAPHY_EXPORT_V8__";
const UI_SELECTOR =
  ".orthography-ui, [id^='orthography-ui-'], [id^='orthographytext-ui-']";
const INPUT_SELECTOR =
  "input[id^='orthography-input-'], textarea[id^='orthographytext-input-']," +
  "input[data-id^='lia-quiz-'], textarea[data-id^='lia-quiz-']";

function normalizeString(value: unknown): string {
  return String(value ?? "");
}

function uidFromId(id: string): string {
  for (const prefix of [
    "orthography-ui-",
    "orthographytext-ui-",
    "orthography-check-",
    "orthographytext-check-",
    "orthography-input-",
    "orthographytext-input-",
    "lia-quiz-",
  ]) {
    if (id.startsWith(prefix)) return id.slice(prefix.length);
  }
  return "";
}

function uidFromElement(element: Element | null): string {
  if (!element) return "";
  const direct = normalizeString(
    (element as HTMLElement).dataset?.orthoUid,
  ).trim();
  if (direct) return direct;

  const dataId = normalizeString(element.getAttribute("data-id")).trim();
  return uidFromId(element.id || "") || uidFromId(dataId);
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

function orthographyApi(): OrthographyPluginApi | undefined {
  for (const view of accessibleWindows()) {
    try {
      const candidate = (
        view as Window & {
          [MODULE_KEY]?: Partial<OrthographyPluginApi>;
        }
      )[MODULE_KEY];
      if (
        candidate &&
        typeof candidate.getAllStates === "function" &&
        typeof candidate.setState === "function"
      ) {
        return candidate as OrthographyPluginApi;
      }
    } catch {
      // A cross-origin parent is intentionally ignored.
    }
  }
  return undefined;
}

function allOrthographyUis(scope: ParentNode = document): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (scope instanceof HTMLElement && scope.matches(UI_SELECTOR)) {
    result.push(scope);
  }
  result.push(...Array.from(scope.querySelectorAll<HTMLElement>(UI_SELECTOR)));
  return result.filter((ui, index) => result.indexOf(ui) === index);
}

function uiUid(ui: HTMLElement): string {
  const direct = uidFromElement(ui);
  if (direct) return direct;
  return uidFromElement(ui.querySelector<HTMLElement>(INPUT_SELECTOR));
}

function uiForQuiz(quiz: HTMLElement): HTMLElement | undefined {
  const closest = quiz.closest<HTMLElement>(UI_SELECTOR);
  if (closest) return closest;

  const uid =
    uidFromElement(quiz) ||
    uidFromElement(quiz.querySelector<HTMLElement>("[data-ortho-uid]"));
  if (!uid) return undefined;

  return allOrthographyUis(document).find((ui) => uiUid(ui) === uid);
}

function quizForUi(ui: HTMLElement, uid: string): HTMLElement | undefined {
  const contained = Array.from(ui.querySelectorAll<HTMLElement>(".lia-quiz"));
  if (contained.length === 1) return contained[0];
  if (contained.length > 1) return undefined;

  return Array.from(document.querySelectorAll<HTMLElement>(".lia-quiz")).find(
    (quiz) => uidFromElement(quiz) === uid,
  );
}

function descriptorForQuiz(
  quiz: HTMLElement,
): OrthographyDescriptor | undefined {
  const ui = uiForQuiz(quiz);
  if (!ui) return undefined;

  const inputs = Array.from(
    ui.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(INPUT_SELECTOR),
  );
  if (inputs.length !== 1) return undefined;

  const input = inputs[0];
  const uid = uiUid(ui) || uidFromElement(quiz) || uidFromElement(input);
  if (!uid) return undefined;

  const ownedQuiz = quizForUi(ui, uid);
  if (ownedQuiz !== quiz) return undefined;

  const wrap = input.closest<HTMLElement>(".orthography-wrap");
  if (!wrap) return undefined;

  const startNode =
    ui.querySelector<HTMLElement>(`#orthography-start-${CSS.escape(uid)}`) ??
    ui.querySelector<HTMLElement>(
      `#orthographytext-start-${CSS.escape(uid)}`,
    ) ??
    wrap.querySelector<HTMLElement>(
      "[id^='orthography-start-'], [id^='orthographytext-start-']",
    );
  const start = startNode
    ? normalizeString(startNode.textContent)
    : normalizeString(input.getAttribute("value") ?? input.defaultValue);

  return { uid, ui, wrap, input, start, quiz };
}

function descriptorForUid(
  uid: string,
  preferredQuiz?: HTMLElement,
): OrthographyDescriptor | undefined {
  if (preferredQuiz) {
    const preferred = descriptorForQuiz(preferredQuiz);
    if (preferred?.uid === uid) return preferred;
  }

  for (const ui of allOrthographyUis(document)) {
    if (uiUid(ui) !== uid) continue;
    const quiz = quizForUi(ui, uid);
    if (!quiz) return undefined;
    return descriptorForQuiz(quiz);
  }
  return undefined;
}

function finiteInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : fallback;
}

export function resetOrthographyPluginState(
  state: OrthographyPluginState,
  start: string,
): void {
  state.checkToken = finiteInteger(state.checkToken) + 1;
  state.resolvePending = false;
  state.solved = false;
  state.tries = 0;
  state.liveValue = start;
}

function stateSnapshot(
  scope: ParentNode,
  excludedUid: string,
): string {
  const states = orthographyApi()?.getAllStates() ?? {};
  const entries = allOrthographyUis(scope)
    .map((ui) => {
      const uid = uiUid(ui);
      if (!uid || uid === excludedUid) return undefined;
      const quiz = quizForUi(ui, uid);
      const descriptor = quiz ? descriptorForQuiz(quiz) : undefined;
      const state = states[uid];
      if (!descriptor) return undefined;

      return {
        uid,
        value: descriptor.input.value,
        defaultValue: descriptor.input.defaultValue,
        readOnly: descriptor.input.readOnly,
        wrapSolved: descriptor.wrap.dataset.orthoSolved ?? null,
        wrapTries: descriptor.wrap.dataset.orthoTries ?? null,
        state: state
          ? {
              liveValue: state.liveValue ?? null,
              solved: state.solved ?? null,
              tries: state.tries ?? null,
              checkToken: state.checkToken ?? null,
              resolvePending: state.resolvePending ?? null,
            }
          : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => left.uid.localeCompare(right.uid));

  return JSON.stringify(entries);
}

export function captureOrthographyContext(
  quiz: HTMLElement,
  scope: HTMLElement,
): OrthographyResetContext | undefined {
  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor) return undefined;

  const api = orthographyApi();
  const state = api?.getAllStates()?.[descriptor.uid];
  if (!api || !state) {
    throw new Error(
      "Der Zustand dieses lia-orthography-Quiz ist noch nicht eindeutig verfügbar.",
    );
  }

  return {
    uid: descriptor.uid,
    start: descriptor.start,
    scope,
    siblingSignature: stateSnapshot(scope, descriptor.uid),
  };
}

function setInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;

  input.defaultValue = value;
  if (input instanceof HTMLInputElement) input.setAttribute("value", value);
  input.readOnly = false;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function resolveGateIsInitial(
  quiz: HTMLElement,
  state: OrthographyPluginState,
): boolean {
  const resolve = quiz.querySelector<HTMLButtonElement>(".lia-quiz__resolve");
  if (!resolve || !state.gate) return true;

  const mode = normalizeString(state.gate.mode);
  const attempts = finiteInteger(state.gate.n);
  if (mode === "off" || (mode === "attempts" && attempts > 0)) {
    return (
      resolve.disabled &&
      (resolve.hidden ||
        resolve.style.display === "none" ||
        resolve.getAttribute("aria-hidden") === "true")
    );
  }

  return !resolve.disabled && resolve.getAttribute("aria-hidden") !== "true";
}

function isPristine(
  context: OrthographyResetContext,
  descriptor: OrthographyDescriptor,
  state: OrthographyPluginState,
): boolean {
  return (
    state.solved === false &&
    finiteInteger(state.tries, -1) === 0 &&
    state.resolvePending === false &&
    normalizeString(state.liveValue) === context.start &&
    descriptor.input.value === context.start &&
    descriptor.input.defaultValue === context.start &&
    descriptor.input.readOnly === false &&
    descriptor.wrap.dataset.orthoSolved === "0" &&
    descriptor.wrap.dataset.orthoTries === "0" &&
    !descriptor.quiz.classList.contains("solved") &&
    !descriptor.quiz.classList.contains("resolved") &&
    resolveGateIsInitial(descriptor.quiz, state)
  );
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function resetOrthographyContext(
  context: OrthographyResetContext,
  quiz: HTMLElement,
): Promise<void> {
  const api = orthographyApi();
  const state = api?.getAllStates()?.[context.uid];
  if (!api || !state) {
    throw new Error(
      "Der Zustand dieses lia-orthography-Quiz konnte nicht zurückgesetzt werden.",
    );
  }

  resetOrthographyPluginState(state, context.start);
  api.setState(context.uid, context.start);

  let descriptor = descriptorForUid(context.uid, quiz);
  if (!descriptor) {
    throw new Error(
      "Das Eingabefeld dieses lia-orthography-Quiz wurde nicht wiedergefunden.",
    );
  }
  setInputValue(descriptor.input, context.start);

  // lia-orthography schedules an additional synchronization after 90 ms.
  await waitForAnimationFrame();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 130));
  await waitForAnimationFrame();

  descriptor = descriptorForUid(context.uid, quiz);
  const currentState = api.getAllStates()?.[context.uid];
  if (
    !descriptor ||
    !currentState ||
    !isPristine(context, descriptor, currentState)
  ) {
    throw new Error(
      "Der lia-orthography-Zustand wurde nicht vollständig geöffnet.",
    );
  }

  const liveScope = descriptor.quiz.closest<HTMLElement>(
    "main.lia-slide__content",
  );
  if (
    stateSnapshot(liveScope ?? context.scope, context.uid) !==
    context.siblingSignature
  ) {
    throw new Error(
      "Beim Orthografie-Reset wurde ein anderes Orthografiequiz verändert.",
    );
  }
}
