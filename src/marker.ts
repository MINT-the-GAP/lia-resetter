type MarkerKind = "user" | "solution" | "prefill";

export interface MarkerHighlight {
  id: number;
  kind: MarkerKind;
  color: string;
  anchor: unknown;
  rects: unknown[];
  scope: string;
  slide: string;
}

interface MarkerInstance {
  __alive: true;
  state: Record<string, unknown>;
  HL: MarkerHighlight[];
  nextId: number;
  __prefillKeys?: unknown;
}

interface MarkerRegistry {
  instances: Record<string, MarkerInstance>;
  setHighlights(highlights: MarkerHighlight[]): void;
}

interface MarkerRuntime {
  readonly view: Window;
  readonly registry: MarkerRegistry;
  readonly instance: MarkerInstance;
  readonly documentId: string;
}

type MarkerInput =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

interface MarkerDescriptor {
  readonly marker: HTMLElement;
  readonly proxy: HTMLElement;
  readonly message: HTMLElement;
  readonly input: MarkerInput;
  readonly quiz: HTMLElement;
  readonly scopeId: string;
  readonly slideId: string;
  readonly targets: readonly HTMLElement[];
}

interface MarkerInputInitial {
  readonly value: string;
  readonly defaultValue: string;
  readonly authoredValue: string | null;
}

export interface MarkerResetContext {
  readonly scopeId: string;
  readonly slideId: string;
  readonly scope: HTMLElement;
  readonly runtime: MarkerRuntime;
  readonly inputInitial: MarkerInputInitial;
  readonly targetSignature: string;
  readonly retainedSignature: string;
  readonly siblingSignature: string;
  readonly toolSignature: string;
  readonly nextId: number;
}

const REGISTRY_KEY = "__LIA_TEXTMARKER_REG_V4__";
const MARKER_SELECTOR = ".markerquiz";
const TARGET_SELECTOR = ".lia-hl-target[data-hl-expected]";
const INPUT_SELECTOR = "input, textarea, select";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isMarkerKind(value: unknown): value is MarkerKind {
  return value === "user" || value === "solution" || value === "prefill";
}

function looksLikeHighlight(value: unknown): value is MarkerHighlight {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) >= 0 &&
    isMarkerKind(value.kind) &&
    typeof value.color === "string" &&
    typeof value.scope === "string" &&
    typeof value.slide === "string" &&
    Array.isArray(value.rects) &&
    isRecord(value.anchor)
  );
}

function looksLikeInstance(value: unknown): value is MarkerInstance {
  return (
    isRecord(value) &&
    value.__alive === true &&
    isRecord(value.state) &&
    Array.isArray(value.HL) &&
    value.HL.every(looksLikeHighlight) &&
    Number.isSafeInteger(value.nextId) &&
    Number(value.nextId) >= 1
  );
}

function looksLikeRegistry(value: unknown): value is MarkerRegistry {
  return (
    isRecord(value) &&
    isRecord(value.instances) &&
    typeof value.setHighlights === "function"
  );
}

function markerDocumentId(): string {
  return (
    (document.baseURI || window.location.href || "") +
    "::" +
    (document.title || "")
  );
}

function sameMarkerDocument(left: string, right: string): boolean {
  if (left === right) return true;

  try {
    const currentUrl = new URL(document.baseURI || window.location.href);
    currentUrl.hash = "";
    const prefix = currentUrl.href;
    const belongsToCurrentUrl = (documentId: string): boolean => {
      if (!documentId.startsWith(prefix)) return false;
      const suffix = documentId.slice(prefix.length);
      return suffix.startsWith("#") || suffix.startsWith("::");
    };
    return belongsToCurrentUrl(left) && belongsToCurrentUrl(right);
  } catch {
    return false;
  }
}

function markerRuntime(): MarkerRuntime | undefined {
  const documentId = markerDocumentId();
  const candidates: MarkerRuntime[] = [];
  const seen = new Set<MarkerRegistry>();

  for (const view of accessibleWindows()) {
    try {
      const registry = (
        view as Window & Record<string, unknown>
      )[REGISTRY_KEY];
      if (!looksLikeRegistry(registry) || seen.has(registry)) continue;
      seen.add(registry);

      const alive = Object.entries(registry.instances).filter(
        ([, entry]) => isRecord(entry) && entry.__alive === true,
      );
      const [registryDocumentId, instance] = alive[0] ?? [];
      if (
        typeof registryDocumentId !== "string" ||
        !looksLikeInstance(instance) ||
        alive.length !== 1 ||
        !sameMarkerDocument(registryDocumentId, documentId)
      ) {
        continue;
      }
      candidates.push({
        view,
        registry,
        instance,
        documentId: registryDocumentId,
      });
    } catch {
      // Cross-origin parents and incompatible marker versions are ignored.
    }
  }

  return candidates.length === 1 ? candidates[0] : undefined;
}

function normalizedText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function descriptorForMarker(
  marker: HTMLElement,
  preferredQuiz?: HTMLElement,
): MarkerDescriptor | undefined {
  const scopeId = (marker.dataset.hlScope ?? "").trim();
  if (!scopeId) return undefined;

  const proxies = Array.from(
    marker.querySelectorAll<HTMLElement>(".hlq-proxy"),
  );
  const quizzes = Array.from(
    marker.querySelectorAll<HTMLElement>(".lia-quiz.lia-quiz-multi"),
  );
  if (
    proxies.length !== 1 ||
    quizzes.length !== 1 ||
    (preferredQuiz && quizzes[0] !== preferredQuiz)
  ) {
    return undefined;
  }

  const proxy = proxies[0];
  const messages = Array.from(
    proxy.querySelectorAll<HTMLElement>(".hlq-msg"),
  );
  const liaContainers = Array.from(
    proxy.querySelectorAll<HTMLElement>(".hlq-lia"),
  );
  if (messages.length !== 1 || liaContainers.length !== 1) return undefined;

  const quiz = quizzes[0];
  const inputs = Array.from(
    liaContainers[0].querySelectorAll<MarkerInput>(INPUT_SELECTOR),
  );
  const targets = Array.from(
    marker.querySelectorAll<HTMLElement>(TARGET_SELECTOR),
  );
  if (inputs.length !== 1 || targets.length === 0) return undefined;

  const slide = marker.closest<HTMLElement>("[data-hl-slideid]");
  const slideId = (slide?.dataset.hlSlideid ?? "").trim() || "global";
  return {
    marker,
    proxy,
    message: messages[0],
    input: inputs[0],
    quiz,
    scopeId,
    slideId,
    targets,
  };
}

function descriptorForQuiz(
  quiz: HTMLElement,
): MarkerDescriptor | undefined {
  if (!quiz.classList.contains("lia-quiz-multi")) return undefined;
  const marker = quiz.closest<HTMLElement>(MARKER_SELECTOR);
  return marker ? descriptorForMarker(marker, quiz) : undefined;
}

function descriptorsForIdentity(
  scopeId: string,
  slideId: string,
): MarkerDescriptor[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(MARKER_SELECTOR),
  )
    .map((marker) => descriptorForMarker(marker))
    .filter(
      (descriptor): descriptor is MarkerDescriptor =>
        descriptor?.scopeId === scopeId &&
        descriptor.slideId === slideId,
    );
}

function descriptorForContext(
  context: Pick<MarkerResetContext, "scopeId" | "slideId">,
  preferredQuiz?: HTMLElement,
): MarkerDescriptor | undefined {
  const matches = descriptorsForIdentity(context.scopeId, context.slideId);
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

function targetSignature(descriptor: MarkerDescriptor): string {
  return JSON.stringify(
    descriptor.targets.map((target) => ({
      expected: target.getAttribute("data-hl-expected"),
      text: normalizedText(target.textContent),
    })),
  );
}

function isTargetProgress(
  item: MarkerHighlight,
  scopeId: string,
  slideId: string,
): boolean {
  return (
    (item.kind === "user" || item.kind === "solution") &&
    item.scope === scopeId &&
    item.slide === slideId
  );
}

export function filterMarkerQuizHighlights(
  highlights: readonly MarkerHighlight[],
  scopeId: string,
  slideId: string,
): MarkerHighlight[] {
  return highlights.filter(
    (item) => !isTargetProgress(item, scopeId, slideId),
  );
}

function anchorSnapshot(anchor: unknown): unknown {
  if (!isRecord(anchor)) return null;
  return {
    sp: anchor.sp ?? null,
    so: anchor.so ?? null,
    ep: anchor.ep ?? null,
    eo: anchor.eo ?? null,
  };
}

function highlightSnapshot(item: MarkerHighlight): unknown {
  return {
    id: item.id,
    kind: item.kind,
    color: item.color,
    anchor: anchorSnapshot(item.anchor),
    scope: item.scope,
    slide: item.slide,
  };
}

function retainedSignature(
  instance: MarkerInstance,
  scopeId: string,
  slideId: string,
): string {
  return JSON.stringify(
    instance.HL
      .filter((item) => !isTargetProgress(item, scopeId, slideId))
      .map(highlightSnapshot),
  );
}

function toolSignature(instance: MarkerInstance): string {
  return JSON.stringify({
    active: instance.state.active ?? null,
    panelOpen: instance.state.panelOpen ?? null,
    tool: instance.state.tool ?? null,
    color: instance.state.color ?? null,
  });
}

function inputInitial(input: MarkerInput): MarkerInputInitial {
  const defaultValue =
    input instanceof HTMLSelectElement ? "" : input.defaultValue;
  const authoredValue = input.getAttribute("value");
  return {
    value: authoredValue ?? defaultValue,
    defaultValue,
    authoredValue,
  };
}

function inputSnapshot(input: MarkerInput): unknown {
  return {
    value: input.value,
    defaultValue:
      input instanceof HTMLSelectElement ? null : input.defaultValue,
    authoredValue: input.getAttribute("value"),
    disabled: input.disabled,
    readOnly:
      input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement
        ? input.readOnly
        : null,
  };
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  if (
    style?.display === "none" ||
    style?.visibility === "hidden" ||
    style?.visibility === "collapse"
  ) {
    return false;
  }
  return element.getClientRects().length > 0;
}

function feedbackSnapshot(quiz: HTMLElement): unknown {
  return Array.from(
    quiz.querySelectorAll<HTMLElement>(".lia-quiz__feedback"),
  ).map((feedback) => ({
    text: normalizedText(feedback.textContent),
    visible: isVisible(feedback),
    ariaHidden: feedback.getAttribute("aria-hidden"),
    hidden: feedback.hidden,
  }));
}

function markerDescriptors(scope: ParentNode): MarkerDescriptor[] {
  const result: MarkerDescriptor[] = [];
  for (const marker of Array.from(
    scope.querySelectorAll<HTMLElement>(MARKER_SELECTOR),
  )) {
    const descriptor = descriptorForMarker(marker);
    if (!descriptor) {
      throw new Error(
        "Ein lia-marker-Quiz auf dieser Folie ist nicht eindeutig initialisiert.",
      );
    }
    result.push(descriptor);
  }
  return result;
}

function siblingSignature(
  scope: ParentNode,
  targetScopeId: string,
  targetSlideId: string,
): string {
  const seen = new Set<string>();
  const entries = markerDescriptors(scope)
    .map((descriptor) => {
      const key = `${descriptor.slideId}::${descriptor.scopeId}`;
      if (seen.has(key)) {
        throw new Error(
          "Ein lia-marker-Scope ist auf dieser Folie nicht eindeutig.",
        );
      }
      seen.add(key);
      if (
        descriptor.scopeId === targetScopeId &&
        descriptor.slideId === targetSlideId
      ) {
        return undefined;
      }

      const check = descriptor.quiz.querySelector<HTMLButtonElement>(
        ".lia-quiz__check",
      );
      return {
        key,
        targets: targetSignature(descriptor),
        message: descriptor.message.textContent ?? "",
        input: inputSnapshot(descriptor.input),
        quiz: {
          solved: descriptor.quiz.classList.contains("solved"),
          resolved: descriptor.quiz.classList.contains("resolved"),
          checkDisabled: check?.disabled ?? null,
          feedback: feedbackSnapshot(descriptor.quiz),
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => left.key.localeCompare(right.key));

  return JSON.stringify(entries);
}

export function captureMarkerContext(
  quiz: HTMLElement,
  scope: HTMLElement,
): MarkerResetContext | undefined {
  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor) return undefined;
  if (!scope.contains(descriptor.marker)) {
    throw new Error("Das lia-marker-Quiz liegt nicht eindeutig auf dieser Folie.");
  }

  const unique = descriptorsForIdentity(
    descriptor.scopeId,
    descriptor.slideId,
  );
  if (unique.length !== 1 || unique[0].quiz !== quiz) {
    throw new Error(
      "Scope und Seite dieses lia-marker-Quiz sind nicht eindeutig.",
    );
  }

  const runtime = markerRuntime();
  if (!runtime) {
    throw new Error(
      "Der Zustand dieses lia-marker-Quiz ist noch nicht eindeutig verfügbar.",
    );
  }

  return {
    scopeId: descriptor.scopeId,
    slideId: descriptor.slideId,
    scope,
    runtime,
    inputInitial: inputInitial(descriptor.input),
    targetSignature: targetSignature(descriptor),
    retainedSignature: retainedSignature(
      runtime.instance,
      descriptor.scopeId,
      descriptor.slideId,
    ),
    siblingSignature: siblingSignature(
      scope,
      descriptor.scopeId,
      descriptor.slideId,
    ),
    toolSignature: toolSignature(runtime.instance),
    nextId: runtime.instance.nextId,
  };
}

function validateRuntime(
  context: MarkerResetContext,
  descriptor: MarkerDescriptor,
): MarkerRuntime {
  const runtime = markerRuntime();
  if (
    !runtime ||
    runtime.registry !== context.runtime.registry ||
    runtime.instance !== context.runtime.instance ||
    runtime.documentId !== context.runtime.documentId
  ) {
    throw new Error(
      "Die lia-marker-Laufzeit wurde während des Resets ausgetauscht.",
    );
  }
  if (
    descriptor.scopeId !== context.scopeId ||
    descriptor.slideId !== context.slideId ||
    targetSignature(descriptor) !== context.targetSignature
  ) {
    throw new Error(
      "Das Ziel des lia-marker-Quiz hat sich während des Resets verändert.",
    );
  }
  return runtime;
}

function setInputValue(input: MarkerInput, value: string): void {
  const ownerView = input.ownerDocument.defaultView;
  let prototype: object;
  if (input instanceof HTMLTextAreaElement) {
    prototype = (ownerView?.HTMLTextAreaElement ?? HTMLTextAreaElement).prototype;
    input.readOnly = false;
  } else if (input instanceof HTMLSelectElement) {
    prototype = (ownerView?.HTMLSelectElement ?? HTMLSelectElement).prototype;
  } else {
    prototype = (ownerView?.HTMLInputElement ?? HTMLInputElement).prototype;
    input.readOnly = false;
  }

  input.disabled = false;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;

  const EventConstructor = ownerView?.Event ?? Event;
  input.dispatchEvent(
    new EventConstructor("input", { bubbles: true, composed: true }),
  );
  input.dispatchEvent(
    new EventConstructor("change", { bubbles: true, composed: true }),
  );
}

function applyMarkerReset(
  context: MarkerResetContext,
  preferredQuiz: HTMLElement,
): { descriptor: MarkerDescriptor; removedIds: string[] } {
  let descriptor = descriptorForContext(context, preferredQuiz);
  if (!descriptor) {
    throw new Error(
      "Das lia-marker-Quiz wurde nach dem Core-Reset nicht gefunden.",
    );
  }
  const runtime = validateRuntime(context, descriptor);
  const removed = runtime.instance.HL.filter((item) =>
    isTargetProgress(item, context.scopeId, context.slideId),
  );
  const filtered = filterMarkerQuizHighlights(
    runtime.instance.HL,
    context.scopeId,
    context.slideId,
  );

  runtime.registry.setHighlights.call(runtime.registry, filtered);
  if (runtime.instance.HL !== filtered) {
    throw new Error(
      "Die lia-marker-Registry hat nicht den Zielzustand übernommen.",
    );
  }

  descriptor = descriptorForContext(context, descriptor.quiz);
  if (!descriptor) {
    throw new Error(
      "Das lia-marker-Quiz wurde beim Aktualisieren seiner Markierungen ausgetauscht.",
    );
  }
  descriptor.message.textContent = "";
  setInputValue(descriptor.input, context.inputInitial.value);

  return {
    descriptor,
    removedIds: removed.map((item) => String(item.id)),
  };
}

function removedOverlayIsGone(removedIds: ReadonlySet<string>): boolean {
  if (removedIds.size === 0) return true;
  const overlay = document.getElementById("lia-hl-overlay");
  if (!overlay) return false;
  return Array.from(
    overlay.querySelectorAll<HTMLElement>(".lia-hl-rect[data-id]"),
  ).every((rect) => !removedIds.has(rect.dataset.id ?? ""));
}

function inputIsPristine(
  input: MarkerInput,
  initial: MarkerInputInitial,
): boolean {
  const readOnly =
    input instanceof HTMLInputElement ||
    input instanceof HTMLTextAreaElement
      ? input.readOnly
      : false;
  const defaultValue =
    input instanceof HTMLSelectElement ? "" : input.defaultValue;
  return (
    input.value === initial.value &&
    defaultValue === initial.defaultValue &&
    input.getAttribute("value") === initial.authoredValue &&
    input.disabled === false &&
    readOnly === false
  );
}

function targetIsPristine(
  context: MarkerResetContext,
  descriptor: MarkerDescriptor,
  removedIds: ReadonlySet<string>,
): boolean {
  let runtime: MarkerRuntime;
  try {
    runtime = validateRuntime(context, descriptor);
  } catch {
    return false;
  }

  const hasTargetProgress = runtime.instance.HL.some((item) =>
    isTargetProgress(item, context.scopeId, context.slideId),
  );
  const check = descriptor.quiz.querySelector<HTMLButtonElement>(
    ".lia-quiz__check",
  );
  return (
    !hasTargetProgress &&
    runtime.instance.nextId === context.nextId &&
    retainedSignature(
      runtime.instance,
      context.scopeId,
      context.slideId,
    ) === context.retainedSignature &&
    toolSignature(runtime.instance) === context.toolSignature &&
    descriptor.message.textContent === "" &&
    inputIsPristine(descriptor.input, context.inputInitial) &&
    !descriptor.quiz.classList.contains("solved") &&
    !descriptor.quiz.classList.contains("resolved") &&
    Array.from(
      descriptor.quiz.querySelectorAll<HTMLElement>(".lia-quiz__feedback"),
    ).every((feedback) => !isVisible(feedback)) &&
    Boolean(check) &&
    check?.disabled === false &&
    removedOverlayIsGone(removedIds) &&
    siblingSignature(
      descriptor.quiz.closest<HTMLElement>("main.lia-slide__content") ??
        context.scope,
      context.scopeId,
      context.slideId,
    ) === context.siblingSignature
  );
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForMarkerSettle(): Promise<void> {
  await waitForAnimationFrame();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
  await waitForAnimationFrame();
}

export async function resetMarkerContext(
  context: MarkerResetContext,
  quiz: HTMLElement,
): Promise<void> {
  const removedIds = new Set<string>();
  let result = applyMarkerReset(context, quiz);
  result.removedIds.forEach((id) => removedIds.add(id));
  await waitForMarkerSettle();

  let descriptor = descriptorForContext(context, result.descriptor.quiz);
  if (!descriptor) {
    throw new Error(
      "Das lia-marker-Quiz wurde während der Stabilitätsprüfung ausgetauscht.",
    );
  }
  if (!targetIsPristine(context, descriptor, removedIds)) {
    result = applyMarkerReset(context, descriptor.quiz);
    result.removedIds.forEach((id) => removedIds.add(id));
    await waitForMarkerSettle();
    descriptor = descriptorForContext(context, result.descriptor.quiz);
    if (!descriptor) {
      throw new Error(
        "Das lia-marker-Quiz wurde während der zweiten Stabilitätsprüfung ausgetauscht.",
      );
    }
  }

  if (!targetIsPristine(context, descriptor, removedIds)) {
    throw new Error(
      "Der lia-marker-Zustand wurde nicht vollständig und stabil geöffnet.",
    );
  }
}
