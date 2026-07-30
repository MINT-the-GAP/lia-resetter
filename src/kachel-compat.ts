import { supportsLosslessNativeReset } from "./lia-bridge";
import { extractNativeCorrectOptionIndexes } from "./native-drop-solution";
import {
  getKachelRoot,
  getKachelSources,
  getKachelTargets,
  kachelTargetsAreEmpty,
  refreshKachelProgression,
  targetDisplayText,
} from "./kachel";

type SourceAddress = readonly [origin: number, option: number];

interface LiaKachelContentApi {
  correctOptions(
    checkButton: Element,
    optionCounts: readonly number[],
  ): number[] | null;
  normalize?(value: unknown): string;
  rendered?(source: Element): string;
}

interface LiaKachelfolgeApi {
  refreshProgressive?(ownerDocument?: Document): void;
  sameAddressMultiset?(
    expected: readonly SourceAddress[],
    actual: readonly SourceAddress[],
  ): boolean;
}

interface LiaKachelApi {
  content?: LiaKachelContentApi;
  kachelfolge?: LiaKachelfolgeApi;
}

interface KachelDescriptor {
  readonly key: string;
  readonly quiz: HTMLElement;
  readonly root: HTMLElement;
  readonly targets: readonly HTMLElement[];
  readonly targetIds: readonly number[];
  readonly track: LiaTrackPoint[];
  readonly sectionId: number;
  readonly quizId: number;
}

interface CompatibilityState {
  readonly status: "correct" | "wrong";
  readonly text: string;
}

const CHECK_SELECTOR = ".lia-quiz__check";
const PROTECTED_CONTROL_SELECTOR =
  ".lia-quiz__resolve, .lia-quiz__hint";
const LEGACY_FEEDBACK_SELECTOR = ".lia-resetter__kachel-feedback";
const INLINE_FEEDBACK_CLASS = "lia-resetter__kachel-inline-feedback";
const COMPATIBILITY_ATTRIBUTE = "data-lia-resetter-kachel-state";
const TARGET_ID_PATTERN =
  /cmd\s*:\s*['"](?:dragtarget|dragenter)['"][\s\S]*?id\s*:\s*(-?\d+)/i;
const SOURCE_ADDRESS_PATTERN =
  /value["']?\s*:\s*\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/i;
const TRACK_PATTERN =
  /track\s*:\s*(\[\s*\[[\s\S]*?\]\s*\])/i;

const compatibilityStates = new Map<string, CompatibilityState>();
const expectedAddresses = new Map<string, SourceAddress[]>();
const nativeControlReentry = new WeakSet<HTMLButtonElement>();
const pendingControls = new WeakSet<HTMLButtonElement>();
const originalInteraction = new WeakMap<
  HTMLElement,
  {
    ariaDisabled: string | null;
    ariaGrabbed: string | null;
    draggable: string | null;
    pointerEvents: string;
    tabIndex: string | null;
  }
>();
let listenerInstalled = false;
let hasResetterForQuiz = (_quiz: HTMLElement): boolean => false;

function normalize(value: unknown): string {
  const api = kachelApi()?.content;
  if (typeof api?.normalize === "function") {
    return api.normalize(value);
  }

  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function kachelApi(): LiaKachelApi | undefined {
  return (window as Window & { LiaKachel?: LiaKachelApi }).LiaKachel;
}

function handlerValues(element: Element): string[] {
  return [
    "onclick",
    "onkeydown",
    "ondragover",
    "ondragleave",
    "ondrop",
    "ondragstart",
    "ondragend",
  ].map((name) =>
    String(
      element.getAttribute(name) ??
        element.getAttribute(`data-${name}`) ??
        "",
    ),
  );
}

function targetId(element: Element): number | undefined {
  for (const value of handlerValues(element)) {
    const match = value.match(TARGET_ID_PATTERN);
    if (!match) continue;
    const id = Number(match[1]);
    if (Number.isSafeInteger(id) && id >= 0) return id;
  }
  return undefined;
}

function sourceAddress(element: Element): SourceAddress | undefined {
  for (const value of handlerValues(element)) {
    const match = value.match(SOURCE_ADDRESS_PATTERN);
    if (!match) continue;
    const origin = Number(match[1]);
    const option = Number(match[2]);
    if (
      Number.isSafeInteger(origin) &&
      origin >= 0 &&
      Number.isSafeInteger(option) &&
      option >= 0
    ) {
      return [origin, option];
    }
  }
  return undefined;
}

function parseTrack(element: Element): LiaTrackPoint[] | undefined {
  for (const value of handlerValues(element)) {
    const serialized = value.match(TRACK_PATTERN)?.[1];
    if (!serialized) continue;

    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (entry) =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "string" &&
            Number.isSafeInteger(entry[1]),
        )
      ) {
        return parsed as LiaTrackPoint[];
      }
    } catch {
      // Try the next native handler.
    }
  }
  return undefined;
}

function descriptorForQuiz(quiz: HTMLElement): KachelDescriptor | undefined {
  const root = getKachelRoot(quiz);
  if (!root) return undefined;

  const entries = getKachelTargets(root)
    .map((target) => ({ id: targetId(target), target, track: parseTrack(target) }))
    .filter(
      (
        entry,
      ): entry is {
        id: number;
        target: HTMLElement;
        track: LiaTrackPoint[];
      } => entry.id !== undefined && entry.track !== undefined,
    )
    .sort((left, right) => left.id - right.id);

  if (!entries.length || entries.length !== getKachelTargets(root).length) {
    return undefined;
  }

  const serializedTrack = JSON.stringify(entries[0].track);
  if (
    new Set(entries.map((entry) => entry.id)).size !== entries.length ||
    entries.some((entry) => JSON.stringify(entry.track) !== serializedTrack)
  ) {
    return undefined;
  }

  const sectionId = entries[0].track.find(([topic]) => topic === "quiz")?.[1];
  const quizId = entries[0].track.find(([topic]) => topic === "input")?.[1];
  if (
    sectionId === undefined ||
    quizId === undefined ||
    !Number.isSafeInteger(sectionId) ||
    !Number.isSafeInteger(quizId)
  ) {
    return undefined;
  }

  return {
    key: JSON.stringify(entries[0].track),
    quiz,
    root,
    targets: entries.map((entry) => entry.target),
    targetIds: entries.map((entry) => entry.id),
    track: entries[0].track,
    sectionId,
    quizId,
  };
}

function renderedSource(source: Element): string {
  const rendered = kachelApi()?.content?.rendered;
  if (typeof rendered === "function") return normalize(rendered(source));

  const text = normalize(source.textContent);
  if (text) return text;
  const imageText = Array.from(source.querySelectorAll("img[alt]"))
    .map((image) => normalize(image.getAttribute("alt")))
    .filter(Boolean)
    .join(" ");
  return imageText || normalize(source.getAttribute("aria-label"));
}

function placedSource(target: Element): Element | undefined {
  return Array.from(target.children).find((child) =>
    Boolean(sourceAddress(child)),
  );
}

function addressKey(address: SourceAddress): string {
  return `${address[0]}:${address[1]}`;
}

function sourceCatalog(descriptor: KachelDescriptor): Map<string, Element> {
  const result = new Map<string, Element>();
  for (const source of getKachelSources(descriptor.root)) {
    const address = sourceAddress(source);
    if (address && !result.has(addressKey(address))) {
      result.set(addressKey(address), source);
    }
  }
  return result;
}

function resolveExpectedAddresses(
  descriptor: KachelDescriptor,
  checkButton: HTMLButtonElement,
): SourceAddress[] | undefined {
  const cached = expectedAddresses.get(descriptor.key);
  if (cached) return cached.map((address) => [...address] as SourceAddress);

  const catalog = sourceCatalog(descriptor);
  const optionCounts = descriptor.targets.map(() => 0);
  for (const source of catalog.values()) {
    const address = sourceAddress(source);
    if (!address || address[0] >= optionCounts.length) continue;
    optionCounts[address[0]] = Math.max(
      optionCounts[address[0]],
      address[1] + 1,
    );
  }

  if (optionCounts.some((count) => count < 1)) return undefined;

  let correctOptions: number[] | null = null;
  const extractor = kachelApi()?.content?.correctOptions;
  try {
    if (typeof extractor === "function") {
      correctOptions = extractor(checkButton, optionCounts);
    }
  } catch (error) {
    console.error("Die native Kachellösung konnte nicht gelesen werden.", error);
  }

  const localOptions = extractNativeCorrectOptionIndexes(
    checkButton,
    optionCounts,
  );
  if (
    correctOptions &&
    localOptions &&
    JSON.stringify(correctOptions) !== JSON.stringify(localOptions)
  ) {
    console.error(
      "Die LiaKachel-API und der lokale native Lösungsleser widersprechen sich.",
    );
    return undefined;
  }
  correctOptions ??= localOptions;

  if (
    !correctOptions ||
    correctOptions.length !== descriptor.targets.length ||
    correctOptions.some(
      (option, origin) =>
        !Number.isSafeInteger(option) ||
        option < 0 ||
        option >= optionCounts[origin],
    )
  ) {
    return undefined;
  }

  const addresses = correctOptions.map(
    (option, origin) => [origin, option] as SourceAddress,
  );
  if (addresses.some((address) => !catalog.has(addressKey(address)))) {
    return undefined;
  }

  expectedAddresses.set(descriptor.key, addresses);
  return addresses.map((address) => [...address] as SourceAddress);
}

function isKachelfolge(descriptor: KachelDescriptor): boolean {
  const selector =
    "[data-lia-kachelfolge],[data-lia-kachelfolge-mode]," +
    ".kachelfolge-wrap,[data-kf-mode]";
  return Boolean(
    descriptor.quiz.matches(selector) ||
      descriptor.root.matches(selector) ||
      descriptor.quiz.closest(selector) ||
      descriptor.root.closest(selector) ||
      descriptor.quiz.querySelector(selector) ||
      descriptor.root.querySelector(selector) ||
      descriptor.root.closest("p")?.querySelector(selector),
  );
}

function usesLegacyMainKachel(): boolean {
  return !kachelApi()?.content && window.__liaTileCrossPatched === 1;
}

function legacySequenceExpected(
  descriptor: KachelDescriptor,
): string[] | undefined {
  if (!usesLegacyMainKachel()) return undefined;
  const owner =
    descriptor.root.closest<HTMLElement>("[data-kf-uid]") ??
    descriptor.root.querySelector<HTMLElement>("[data-kf-uid]") ??
    descriptor.quiz.closest<HTMLElement>("[data-kf-uid]");
  const uid = String(owner?.dataset.kfUid ?? "").trim();
  const expected = uid ? window.__liaKachelfolgeExpected?.[uid] : undefined;
  if (!Array.isArray(expected) || expected.length !== descriptor.targets.length) {
    return undefined;
  }
  return expected.map((value) => normalize(value).toLowerCase());
}

function sameAddressMultiset(
  expected: readonly SourceAddress[],
  actual: readonly SourceAddress[],
): boolean {
  const fromPlugin = kachelApi()?.kachelfolge?.sameAddressMultiset;
  if (typeof fromPlugin === "function") {
    return fromPlugin(expected, actual);
  }

  return (
    expected.length === actual.length &&
    expected
      .map(addressKey)
      .sort()
      .every((value, index) => value === actual.map(addressKey).sort()[index])
  );
}

function gradeKachel(
  descriptor: KachelDescriptor,
  checkButton: HTMLButtonElement,
): boolean | undefined {
  const expected = resolveExpectedAddresses(descriptor, checkButton);
  if (!expected) return undefined;

  const placed = descriptor.targets.map(placedSource);
  const targetTexts = descriptor.targets.map(targetDisplayText);
  if (targetTexts.some((text) => text === "")) return false;

  if (isKachelfolge(descriptor)) {
    const legacyExpected = legacySequenceExpected(descriptor);
    if (legacyExpected) {
      const actual = targetTexts
        .map((text) => normalize(text).toLowerCase())
        .sort();
      return legacyExpected.sort().every((value, index) => value === actual[index]);
    }
    if (placed.some((source) => source === undefined)) return false;
    return sameAddressMultiset(
      expected,
      placed.map((source) => sourceAddress(source!)) as SourceAddress[],
    );
  }

  const catalog = sourceCatalog(descriptor);
  return expected.every((address, index) => {
    const expectedSource = catalog.get(addressKey(address));
    const actualSource = placed[index];
    const expectedText = expectedSource ? renderedSource(expectedSource) : "";
    const actualText = actualSource
      ? renderedSource(actualSource)
      : usesLegacyMainKachel()
        ? targetTexts[index]
        : "";
    const comparableExpected = usesLegacyMainKachel()
      ? expectedText.toLowerCase()
      : expectedText;
    const comparableActual = usesLegacyMainKachel()
      ? actualText.toLowerCase()
      : actualText;
    return Boolean(
      expectedSource &&
        (actualSource || usesLegacyMainKachel()) &&
        comparableExpected !== "" &&
        comparableExpected === comparableActual,
    );
  });
}

function purgeLegacyFeedbackOverlays(): void {
  document
    .querySelectorAll<HTMLElement>(LEGACY_FEEDBACK_SELECTOR)
    .forEach((feedback) => feedback.remove());
}

function inlineFeedbackForQuiz(
  quiz: HTMLElement,
): HTMLElement | undefined {
  return Array.from(quiz.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains(INLINE_FEEDBACK_CLASS),
  );
}

function renderInlineFeedback(
  descriptor: KachelDescriptor,
  state: CompatibilityState,
): void {
  let feedback = inlineFeedbackForQuiz(descriptor.quiz);
  if (!feedback) {
    const nativeFeedback = Array.from(descriptor.quiz.children).some(
      (child) =>
        child instanceof HTMLElement &&
        child.classList.contains("lia-quiz__feedback"),
    );
    if (nativeFeedback) return;

    feedback = document.createElement("div");
    feedback.className =
      `lia-quiz__feedback ${INLINE_FEEDBACK_CLASS}`;
    feedback.setAttribute("aria-live", "polite");

    // Appending leaves every Elm-managed child index untouched. The element is
    // removed before Reset sends any native input event.
    descriptor.quiz.append(feedback);
  }

  feedback.classList.remove("text-success", "text-error", "text-disabled");
  feedback.classList.add(
    state.status === "correct" ? "text-success" : "text-error",
  );
  if (feedback.textContent !== state.text) {
    feedback.textContent = state.text;
  }
}

function rememberInteraction(element: HTMLElement): void {
  if (originalInteraction.has(element)) return;
  originalInteraction.set(element, {
    ariaDisabled: element.getAttribute("aria-disabled"),
    ariaGrabbed: element.getAttribute("aria-grabbed"),
    draggable: element.getAttribute("draggable"),
    pointerEvents: element.style.pointerEvents,
    tabIndex: element.getAttribute("tabindex"),
  });
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  value: string | null,
): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreInteraction(element: HTMLElement): void {
  const original = originalInteraction.get(element);
  if (!original) return;

  restoreAttribute(element, "aria-disabled", original.ariaDisabled);
  restoreAttribute(element, "aria-grabbed", original.ariaGrabbed);
  restoreAttribute(element, "draggable", original.draggable);
  restoreAttribute(element, "tabindex", original.tabIndex);
  if (original.pointerEvents) {
    element.style.pointerEvents = original.pointerEvents;
  } else {
    element.style.removeProperty("pointer-events");
  }
  originalInteraction.delete(element);
}

function applyCompatibilityState(
  descriptor: KachelDescriptor,
  state: CompatibilityState,
): void {
  descriptor.quiz.setAttribute(COMPATIBILITY_ATTRIBUTE, state.status);
  renderInlineFeedback(descriptor, state);

  const checkButton =
    descriptor.quiz.querySelector<HTMLButtonElement>(CHECK_SELECTOR);
  if (state.status === "correct") {
    descriptor.quiz.classList.remove("open", "resolved");
    descriptor.quiz.classList.add("solved");
    if (checkButton) checkButton.disabled = true;

    for (const element of [
      ...descriptor.targets,
      ...getKachelSources(descriptor.root),
    ]) {
      rememberInteraction(element);
      element.setAttribute("aria-disabled", "true");
      element.style.setProperty("pointer-events", "none");
      if (element.matches("[tabindex]")) element.setAttribute("tabindex", "-1");
    }
  } else if (checkButton) {
    checkButton.disabled = false;
  }
}

function hideCompatibilityState(descriptor: KachelDescriptor): void {
  compatibilityStates.delete(descriptor.key);
  inlineFeedbackForQuiz(descriptor.quiz)?.remove();
  descriptor.quiz.removeAttribute(COMPATIBILITY_ATTRIBUTE);
  delete descriptor.quiz.dataset.liaResetterKachelMessage;
  descriptor.quiz.classList.remove("solved", "resolved");
  descriptor.quiz.classList.add("open");

  const checkButton =
    descriptor.quiz.querySelector<HTMLButtonElement>(CHECK_SELECTOR);
  if (checkButton) {
    checkButton.disabled = false;
  }

  for (const element of [
    ...descriptor.targets,
    ...getKachelSources(descriptor.root),
  ]) {
    restoreInteraction(element);
  }

  refreshProgressiveKachelfolgen();
}

function blockPendingClick(
  event: Event,
  button: HTMLButtonElement,
): boolean {
  if (!pendingControls.has(button)) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

async function handleKachelCheck(
  button: HTMLButtonElement,
  descriptor: KachelDescriptor,
): Promise<void> {
  pendingControls.add(button);
  button.disabled = true;

  try {
    if (await supportsLosslessNativeReset(descriptor.sectionId)) {
      nativeControlReentry.add(button);
      button.disabled = false;
      button.click();
      return;
    }

    const correct = gradeKachel(descriptor, button);
    if (correct === undefined) {
      const message =
        "Die Kachellösung konnte nicht sicher gelesen werden; die Eingabe wurde nicht bewertet.";
      button.disabled = false;
      console.error(message);
      return;
    }

    const state: CompatibilityState = correct
      ? {
          status: "correct",
          text: "Herzlichen Glückwunsch, das war die richtige Antwort",
        }
      : {
          status: "wrong",
          text: "Die richtige Antwort wurde noch nicht gegeben",
        };
    compatibilityStates.set(descriptor.key, state);
    applyCompatibilityState(descriptor, state);
  } catch (error) {
    button.disabled = false;
    console.error("Kachelquiz konnte nicht geprüft werden:", error);
  } finally {
    pendingControls.delete(button);
  }
}

async function handleProtectedControl(
  button: HTMLButtonElement,
  descriptor: KachelDescriptor,
): Promise<void> {
  pendingControls.add(button);
  try {
    if (await supportsLosslessNativeReset(descriptor.sectionId)) {
      nativeControlReentry.add(button);
      button.click();
      return;
    }

    const action = button.matches(".lia-quiz__hint") ? "Hinweis" : "Auflösen";
    const message =
      `${action} ist im Kachel-Kompatibilitätsmodus deaktiviert, damit dieses Quiz weiterhin einzeln zurückgesetzt werden kann.`;
    console.warn(message);
  } catch (error) {
    console.error("Kachelsteuerung konnte nicht ausgeführt werden:", error);
  } finally {
    pendingControls.delete(button);
  }
}

function onDocumentClick(event: Event): void {
  const target =
    event.target instanceof Element
      ? event.target
      : event.target instanceof Node
        ? event.target.parentElement
        : null;
  const button = target?.closest<HTMLButtonElement>(
    `${CHECK_SELECTOR}, ${PROTECTED_CONTROL_SELECTOR}`,
  );
  if (!button) return;

  if (nativeControlReentry.has(button)) {
    nativeControlReentry.delete(button);
    return;
  }
  if (blockPendingClick(event, button)) return;

  const quiz = button.closest<HTMLElement>(".lia-quiz");
  if (
    !quiz ||
    !hasResetterForQuiz(quiz) ||
    !getKachelRoot(quiz)
  ) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor) {
    const message =
      "Das Kachelquiz konnte keinem eindeutigen LiaScript-Track zugeordnet werden.";
    console.error(message);
    return;
  }

  if (button.matches(PROTECTED_CONTROL_SELECTOR)) {
    void handleProtectedControl(button, descriptor);
  } else {
    void handleKachelCheck(button, descriptor);
  }
}

export function installKachelCheckCompatibility(
  hasResetter?: (quiz: HTMLElement) => boolean,
): void {
  purgeLegacyFeedbackOverlays();
  if (hasResetter) hasResetterForQuiz = hasResetter;
  if (listenerInstalled) return;

  listenerInstalled = true;
  window.addEventListener("click", onDocumentClick, true);
}

export function maintainKachelCompatibilityState(
  scope: ParentNode = document,
): void {
  purgeLegacyFeedbackOverlays();
  const quizzes: HTMLElement[] = [];
  if (scope instanceof HTMLElement && scope.classList.contains("lia-quiz")) {
    quizzes.push(scope);
  }
  quizzes.push(...Array.from(scope.querySelectorAll<HTMLElement>(".lia-quiz")));

  for (const quiz of quizzes) {
    const descriptor = descriptorForQuiz(quiz);
    const state = descriptor
      ? compatibilityStates.get(descriptor.key)
      : undefined;
    if (descriptor && state) {
      applyCompatibilityState(descriptor, state);
    } else {
      inlineFeedbackForQuiz(quiz)?.remove();
      quiz.removeAttribute(COMPATIBILITY_ATTRIBUTE);
    }
  }
}

export function clearKachelCompatibilityState(quiz: HTMLElement): void {
  const descriptor = descriptorForQuiz(quiz);
  if (descriptor) hideCompatibilityState(descriptor);
}

export function clearKachelWithNativeInputs(
  quiz: HTMLElement,
  sectionId: number,
  quizId: number,
): boolean {
  const descriptor = descriptorForQuiz(quiz);
  if (
    !descriptor ||
    descriptor.sectionId !== sectionId ||
    descriptor.quizId !== quizId
  ) {
    return false;
  }

  hideCompatibilityState(descriptor);
  for (const id of descriptor.targetIds) {
    window.LIA.send({
      reply: true,
      track: descriptor.track.map(([topic, index]) => [topic, index]),
      service: "input",
      message: {
        cmd: "dragtarget",
        param: { id, value: null },
      },
    });
    window.LIA.send({
      reply: true,
      track: descriptor.track.map(([topic, index]) => [topic, index]),
      service: "input",
      message: {
        cmd: "dragsource",
        param: { id, value: [] },
      },
    });
  }

  return true;
}

export function captureKachelDomState(quiz: HTMLElement): string | undefined {
  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor) return undefined;

  const sources = getKachelSources(descriptor.root)
    .filter(
      (source) =>
        !descriptor.targets.some(
          (target) => target === source || target.contains(source),
        ),
    )
    .map((source) => ({
      address: sourceAddress(source),
      ariaDisabled: source.getAttribute("aria-disabled"),
      draggable: source.getAttribute("draggable"),
      hidden: source.getAttribute("aria-hidden"),
      pointerEvents: source.style.pointerEvents,
      text: renderedSource(source),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );

  return JSON.stringify({
    checkDisabled: Boolean(
      descriptor.quiz.querySelector<HTMLButtonElement>(CHECK_SELECTOR)?.disabled,
    ),
    className: Array.from(descriptor.quiz.classList).sort(),
    compatibility: descriptor.quiz.getAttribute(COMPATIBILITY_ATTRIBUTE),
    inlineFeedback: (() => {
      const feedback = inlineFeedbackForQuiz(descriptor.quiz);
      return feedback
        ? {
            ariaLive: feedback.getAttribute("aria-live"),
            className: Array.from(feedback.classList).sort(),
            text: feedback.textContent ?? "",
          }
        : null;
    })(),
    sources,
    targets: descriptor.targets.map((target) => ({
      address: placedSource(target)
        ? sourceAddress(placedSource(target)!)
        : undefined,
      text: targetDisplayText(target),
    })),
  });
}

export function kachelIsPristineAndUsable(quiz: HTMLElement): boolean {
  const descriptor = descriptorForQuiz(quiz);
  if (!descriptor || !kachelTargetsAreEmpty(quiz)) return false;

  const checkButton =
    descriptor.quiz.querySelector<HTMLButtonElement>(CHECK_SELECTOR);
  const bankSources = getKachelSources(descriptor.root).filter(
    (source) =>
      !descriptor.targets.some(
        (target) => target === source || target.contains(source),
      ),
  );

  return (
    descriptor.quiz.getAttribute(COMPATIBILITY_ATTRIBUTE) === null &&
    inlineFeedbackForQuiz(descriptor.quiz) === undefined &&
    !descriptor.quiz.classList.contains("solved") &&
    !descriptor.quiz.classList.contains("resolved") &&
    !checkButton?.disabled &&
    bankSources.some(
      (source) =>
        source.getAttribute("draggable") === "true" &&
        source.getAttribute("aria-disabled") !== "true" &&
        source.style.pointerEvents !== "none",
    )
  );
}

export function refreshProgressiveKachelfolgen(): void {
  try {
    kachelApi()?.kachelfolge?.refreshProgressive?.(document);
  } catch (error) {
    console.warn(
      "Die progressive Kachelansicht konnte nicht aktualisiert werden.",
      error,
    );
  }
  refreshKachelProgression(document);
}
