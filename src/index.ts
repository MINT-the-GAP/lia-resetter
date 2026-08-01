import {
  captureQuizVector,
  sendNativeReset,
  sendRestore,
  supportsLosslessNativeReset,
  waitForLiaRender,
} from "./lia-bridge";
import {
  captureKachelContext,
  installKachelInterop,
  kachelTargetsAreEmpty,
  releaseKachelFreeze,
  requestKachelDomClear,
} from "./kachel";
import {
  captureKachelDomState,
  clearKachelCompatibilityState,
  clearKachelWithNativeInputs,
  installKachelCheckCompatibility,
  kachelIsPristineAndUsable,
  maintainKachelCompatibilityState,
  refreshProgressiveKachelfolgen,
} from "./kachel-compat";
import {
  containsDropState,
  isIsolatedReset,
  resetQuizElement,
  sameJson,
  type JsonObject,
  type SerializedQuizElement,
  type SerializedQuizVector,
} from "./reset-state";
import {
  captureOrthographyContext,
  resetOrthographyContext,
} from "./orthography";
import {
  captureMatheContext,
  resetMatheContext,
} from "./mathe";
import {
  captureMarkerContext,
  resetMarkerContext,
} from "./marker";
import {
  captureCoordinateContext,
  captureCoordinateMacroStateForQuiz,
  resetCoordinateContext,
  setCoordinateMacroCaptureBlocked,
  validateCoordinateResetConfigurationForQuiz,
} from "./coordinate";
import type { CoordinateMacroState } from "./coordinate-macro-state.ts";
import {
  installCoordinateReconstructionPrelude,
} from "./reconstructionPrelude";
import {
  RESETTER_ANCHOR_SELECTOR,
  RESETTER_BUTTON_CLASS,
  RESETTER_PLACEHOLDER_CLASS,
  ResetterHostController,
  type ResetterHostBinding,
} from "./resetter-host";

const VERSION = "1.0.0";
const STYLE_ID = "lia-resetter-styles";

const anchorToQuiz = new WeakMap<HTMLElement, HTMLElement>();
const buttonToQuiz = new WeakMap<HTMLInputElement, HTMLElement>();
interface QuizLocator {
  readonly scope: HTMLElement;
  readonly sectionId: number;
  readonly quizId: number;
}
type QuizMountState =
  | { readonly kind: "mounted"; readonly quiz: HTMLElement; readonly scope: HTMLElement }
  | { readonly kind: "absent" }
  | { readonly kind: "ambiguous"; readonly reason: string };
type UnambiguousQuizMount = Exclude<
  QuizMountState,
  { readonly kind: "ambiguous" }
>;
const buttonToLocator = new WeakMap<HTMLInputElement, QuizLocator>();
const activeResetIds = new Set<string>();
const feedbackGeneration = new Map<string, number>();
const pendingResetById = new Map<string, Promise<void>>();
const coordinateMacroStateByResetId = new Map<string, CoordinateMacroState>();
const coordinateCaptureRetryByResetId = new Map<string, number>();
const coordinateCaptureNotBeforeByResetId = new Map<string, number>();
let anchorCounter = 0;
let observer: MutationObserver | undefined;
let scanScheduled = false;
let operationQueue: Promise<void> = Promise.resolve();

// Defense in depth for courses that call the upstream Reconstruction macro
// directly. The exported README macro is deterministic on its own: it keeps
// data-spec inactive until the external BODY anchor exists. If this bundle is
// evaluated first, the accessor additionally protects other call sites.
installCoordinateReconstructionPrelude();

function directChildByClass(parent: Element, className: string): HTMLElement | undefined {
  return Array.from(parent.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains(className),
  );
}

function quizControl(quiz: HTMLElement): HTMLElement | undefined {
  return directChildByClass(quiz, "lia-quiz__control");
}

function isNativeQuiz(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.classList.contains("lia-quiz")) {
    return false;
  }

  const control = quizControl(element);
  return Boolean(
    control &&
      Array.from(control.children).some((child) =>
        child.classList.contains("lia-quiz__resolve"),
      ),
  );
}

function nativeQuizzes(scope: ParentNode): HTMLElement[] {
  return Array.from(scope.querySelectorAll(".lia-quiz")).filter(isNativeQuiz);
}

function lastQuizBefore(
  anchor: HTMLElement,
  scope: ParentNode,
): HTMLElement | undefined {
  const preceding = nativeQuizzes(scope).filter((quiz) =>
    Boolean(quiz.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING),
  );

  return preceding[preceding.length - 1];
}

function findQuizBefore(anchor: HTMLElement): HTMLElement | undefined {
  const flexChild = anchor.closest<HTMLElement>(".flex-child, .dynFlexItem");
  if (flexChild) {
    // A flex item is an isolated authoring block. Never fall back to a quiz
    // from a neighbouring item while LiaScript or lia-DynFlex is rendering.
    return lastQuizBefore(anchor, flexChild);
  }

  const slide = anchor.closest<HTMLElement>("main.lia-slide__content");
  if (!slide) {
    return lastQuizBefore(anchor, document);
  }

  // Prefer the smallest DOM container shared by quiz and macro anchor. This
  // also covers card/grid helpers that do not use lia-DynFlex class names.
  for (
    let container = anchor.parentElement;
    container && container !== slide;
    container = container.parentElement
  ) {
    const localQuiz = lastQuizBefore(anchor, container);
    if (localQuiz) return localQuiz;
  }

  return lastQuizBefore(anchor, slide);
}

function anchorById(anchorId: string): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>(RESETTER_ANCHOR_SELECTOR),
  ).find((anchor) => anchor.dataset.liaResetterId === anchorId);
}

function purgeLegacyLayoutNodes(): void {
  for (const legacy of document.querySelectorAll<HTMLElement>(
    `.${RESETTER_BUTTON_CLASS}, .${RESETTER_PLACEHOLDER_CLASS}`,
  )) {
    legacy.remove();
  }
}

function locatorForQuiz(quiz: HTMLElement): QuizLocator | undefined {
  const scope = quiz.closest<HTMLElement>("main.lia-slide__content");
  if (!scope) return undefined;

  const quizId = nativeQuizzes(scope).indexOf(quiz);
  if (quizId < 0) return undefined;

  try {
    return { scope, sectionId: readSectionId(quiz), quizId };
  } catch {
    return undefined;
  }
}

function locateQuiz(locator: QuizLocator): QuizMountState {
  const scopes = [
    ...(locator.scope.isConnected ? [locator.scope] : []),
    ...Array.from(
      document.querySelectorAll<HTMLElement>("main.lia-slide__content"),
    ).filter((scope) => scope !== locator.scope),
  ];
  let match: { quiz: HTMLElement; scope: HTMLElement } | undefined;

  for (const scope of scopes) {
    const quizzes = nativeQuizzes(scope);
    if (!quizzes.length) continue;

    let sectionId: number;
    try {
      sectionId = readSectionId(quizzes[0]);
    } catch {
      return {
        kind: "ambiguous",
        reason: "Die Foliennummer eines gerenderten Quizbereichs ist nicht eindeutig.",
      };
    }

    if (sectionId !== locator.sectionId) continue;

    const quiz = quizzes[locator.quizId];
    if (!quiz) {
      return {
        kind: "ambiguous",
        reason: "Das Zielquiz fehlt in der gerenderten Zielsektion.",
      };
    }
    if (match && match.quiz !== quiz) {
      return {
        kind: "ambiguous",
        reason: "Das Zielquiz ist mehrfach gerendert.",
      };
    }
    match = { quiz, scope };
  }

  return match ? { kind: "mounted", ...match } : { kind: "absent" };
}

function quizForLocator(locator: QuizLocator): HTMLElement | undefined {
  const mount = locateQuiz(locator);
  return mount.kind === "mounted" ? mount.quiz : undefined;
}

function unambiguousMount(locator: QuizLocator): UnambiguousQuizMount {
  const mount = locateQuiz(locator);
  if (mount.kind === "ambiguous") {
    throw new Error(mount.reason);
  }
  return mount;
}

function resetIdForAnchor(anchor: HTMLElement, quiz: HTMLElement): string {
  const currentId = anchor.dataset.liaResetterId;
  if (
    currentId &&
    (activeResetIds.has(currentId) || pendingResetById.has(currentId))
  ) {
    return currentId;
  }

  const locator = locatorForQuiz(quiz);
  const anchorId = locator
    ? `section-${locator.sectionId}-quiz-${locator.quizId}`
    : currentId ?? `pending-${++anchorCounter}`;
  anchor.dataset.liaResetterId = anchorId;
  return anchorId;
}

function clearCoordinateCaptureRetry(resetId: string): void {
  const timer = coordinateCaptureRetryByResetId.get(resetId);
  if (timer !== undefined) window.clearTimeout(timer);
  coordinateCaptureRetryByResetId.delete(resetId);
}

function scheduleCoordinateCaptureRetry(
  resetId: string,
  button: HTMLInputElement,
): void {
  if (coordinateCaptureRetryByResetId.has(resetId)) return;
  const timer = window.setTimeout(() => {
    coordinateCaptureRetryByResetId.delete(resetId);
    if (button.isConnected) scheduleScan();
  }, 160);
  coordinateCaptureRetryByResetId.set(resetId, timer);
}

function setCoordinateCapturePending(
  button: HTMLInputElement,
  message: string,
  permanent: boolean,
): void {
  button.dataset.liaCoordinateCapturePending = "true";
  button.disabled = true;
  button.setAttribute("aria-disabled", "true");
  button.title = message;
  button.value = permanent ? "Reset nicht verfügbar" : "Reset wird vorbereitet …";
}

function releaseCoordinateCapturePending(
  button: HTMLInputElement,
  resetId: string,
): void {
  if (button.dataset.liaCoordinateCapturePending !== "true") return;
  delete button.dataset.liaCoordinateCapturePending;
  button.removeAttribute("aria-disabled");
  button.removeAttribute("title");
  if (!activeResetIds.has(resetId) && !pendingResetById.has(resetId)) {
    button.disabled = false;
    button.value = "Reset";
  }
}

function onHostBind({
  anchor,
  quiz,
  button,
  resetId,
}: ResetterHostBinding): void {
  anchorToQuiz.set(anchor, quiz);
  buttonToQuiz.set(button, quiz);
  const locator = locatorForQuiz(quiz);
  if (locator) buttonToLocator.set(button, locator);
  const scope = quiz.closest<HTMLElement>("main.lia-slide__content");
  if (scope) {
    try {
      let isCoordinate = false;
      if (!coordinateMacroStateByResetId.has(resetId)) {
        isCoordinate = validateCoordinateResetConfigurationForQuiz(quiz, scope);
        if (isCoordinate) {
          const now = Date.now();
          const notBefore = coordinateCaptureNotBeforeByResetId.get(resetId);
          if (notBefore === undefined) {
            coordinateCaptureNotBeforeByResetId.set(resetId, now + 260);
            setCoordinateMacroCaptureBlocked(quiz, scope, true);
            setCoordinateCapturePending(
              button,
              "Der Coordinate-Makrozustand wird vollständig aufgebaut.",
              false,
            );
            scheduleCoordinateCaptureRetry(resetId, button);
          } else if (now < notBefore) {
            setCoordinateMacroCaptureBlocked(quiz, scope, true);
            setCoordinateCapturePending(
              button,
              "Der Coordinate-Makrozustand wird vollständig aufgebaut.",
              false,
            );
            scheduleCoordinateCaptureRetry(resetId, button);
          } else {
            const macroState = captureCoordinateMacroStateForQuiz(quiz, scope);
            if (macroState) {
              coordinateMacroStateByResetId.set(resetId, macroState);
              coordinateCaptureNotBeforeByResetId.delete(resetId);
            }
          }
        }
      } else {
        isCoordinate = validateCoordinateResetConfigurationForQuiz(quiz, scope);
      }
      if (isCoordinate && coordinateMacroStateByResetId.has(resetId)) {
        setCoordinateMacroCaptureBlocked(quiz, scope, false);
        clearCoordinateCaptureRetry(resetId);
        releaseCoordinateCapturePending(button, resetId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const permanent = message.includes("genau ein Quiz pro Board-ID");
      if (permanent) {
        try {
          setCoordinateMacroCaptureBlocked(quiz, scope, false);
        } catch {
          // Keep the original configuration error visible on the button.
        }
      }
      setCoordinateCapturePending(button, message, permanent);
      if (permanent) {
        coordinateCaptureNotBeforeByResetId.delete(resetId);
        clearCoordinateCaptureRetry(resetId);
      }
      else scheduleCoordinateCaptureRetry(resetId, button);
    }
  }
  if (activeResetIds.has(resetId) || pendingResetById.has(resetId)) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.value = "Reset ...";
  }
}

function onHostUnbind({
  anchor,
  quiz,
  button,
  resetId,
}: ResetterHostBinding): void {
  const scope = quiz.closest<HTMLElement>("main.lia-slide__content");
  if (scope) {
    try {
      setCoordinateMacroCaptureBlocked(quiz, scope, false);
    } catch {
      // A disconnected Coordinate board has no remaining interaction to free.
    }
  }
  if (anchorToQuiz.get(anchor) === quiz) anchorToQuiz.delete(anchor);
  if (buttonToQuiz.get(button) === quiz) buttonToQuiz.delete(button);
  if (!activeResetIds.has(resetId) && !pendingResetById.has(resetId)) {
    buttonToLocator.delete(button);
    feedbackGeneration.delete(resetId);
  }
  if (!button.isConnected) {
    coordinateCaptureNotBeforeByResetId.delete(resetId);
    clearCoordinateCaptureRetry(resetId);
  }
}

const hostController = new ResetterHostController({
  findQuiz: findQuizBefore,
  resetId: resetIdForAnchor,
  onBind: onHostBind,
  onUnbind: onHostUnbind,
  onReset(button) {
    void enqueueReset(button).catch(() => undefined);
  },
});

function bindAnchor(anchor: HTMLElement): void {
  hostController.bind(anchor);
}

function scan(root: ParentNode = document): void {
  installKachelInterop();
  purgeLegacyLayoutNodes();
  hostController.scan(root);
  installKachelCheckCompatibility((quiz) => hostController.hasQuiz(quiz));
  maintainKachelCompatibilityState(root);
}

function scheduleScan(): void {
  if (scanScheduled) {
    return;
  }

  scanScheduled = true;
  queueMicrotask(() => {
    scanScheduled = false;
    scan(document);
  });
}

function injectStyles(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.append(style);
  }
  style.textContent = `
    .lia-resetter__kachel-feedback { display: none !important; }
  `;
}

function readSectionId(quiz: HTMLElement): number {
  const slide = quiz.closest(".lia-slide");
  const counter = slide?.querySelector(".lia-pagination__current");
  const textNode = counter
    ? Array.from(counter.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
    : undefined;
  const match = (textNode?.textContent ?? counter?.textContent ?? "").match(/\d+/);
  const oneBased = match ? Number.parseInt(match[0], 10) : Number.NaN;

  if (!Number.isSafeInteger(oneBased) || oneBased < 1) {
    throw new Error("Die aktuelle LiaScript-Foliennummer konnte nicht ermittelt werden.");
  }

  return oneBased - 1;
}

function stateKey(state: unknown): string | undefined {
  if (typeof state !== "object" || state === null || Array.isArray(state)) {
    return undefined;
  }

  return Object.keys(state as JsonObject)[0];
}

function expectedStateKey(quiz: HTMLElement): string | undefined {
  const mappings: Array<[string, string]> = [
    ["lia-quiz-generic", "Generic"],
    ["lia-quiz-text", "Text"],
    ["lia-quiz-select", "Select"],
    ["lia-quiz-drop", "Drop"],
    ["lia-quiz-single-choice", "SingleChoice"],
    ["lia-quiz-multiple-choice", "MultipleChoice"],
    ["lia-quiz-matrix", "Matrix"],
    ["lia-quiz-multi", "Multi"],
  ];

  return mappings.find(([className]) => quiz.classList.contains(className))?.[1];
}

function validateMapping(
  quiz: HTMLElement,
  quizzes: HTMLElement[],
  vector: SerializedQuizVector,
): number {
  if (quizzes.length !== vector.length) {
    throw new Error(
      "Die sichtbaren Quizze lassen sich nicht eindeutig dem LiaScript-Zustand zuordnen.",
    );
  }

  const quizId = quizzes.indexOf(quiz);
  if (quizId < 0 || !vector[quizId]) {
    throw new Error("Das zugehörige LiaScript-Quiz wurde nicht gefunden.");
  }

  const expected = expectedStateKey(quiz);
  const actual = stateKey(vector[quizId].state);
  if (!expected || expected !== actual) {
    throw new Error("Quiztyp und LiaScript-Zustand stimmen nicht eindeutig überein.");
  }

  return quizId;
}

function expectedVector(
  before: SerializedQuizVector,
  quizId: number,
): { vector: SerializedQuizVector; element: SerializedQuizElement } {
  const vector = JSON.parse(JSON.stringify(before)) as SerializedQuizVector;
  const element = resetQuizElement(vector[quizId]);
  vector[quizId] = element;
  return { vector, element };
}

function quizForButton(button: HTMLInputElement): HTMLElement | undefined {
  const closest = button.closest<HTMLElement>(".lia-quiz");
  if (closest?.isConnected) return closest;

  const managed = hostController.quizForButton(button);
  if (managed?.isConnected) return managed;

  const mapped = buttonToQuiz.get(button);
  if (mapped?.isConnected) return mapped;

  const located = buttonToLocator.get(button);
  const locatedQuiz = located ? quizForLocator(located) : undefined;
  if (locatedQuiz) return locatedQuiz;

  const anchorId = button.dataset.liaResetterAnchor;
  const anchor = anchorId ? anchorById(anchorId) : undefined;
  if (!anchor) return undefined;
  bindAnchor(anchor);
  return anchorToQuiz.get(anchor);
}

async function waitForKachelToClear(
  button: HTMLInputElement,
  timeoutMs = 1_400,
): Promise<HTMLElement | undefined> {
  const deadline = performance.now() + timeoutMs;
  do {
    const quiz = quizForButton(button);
    if (quiz && kachelTargetsAreEmpty(quiz)) return quiz;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 45));
  } while (performance.now() < deadline);

  return quizForButton(button);
}

async function settleLegacyKachelFreeze(
  context: ReturnType<typeof captureKachelContext>,
  button: HTMLInputElement,
  quiz: HTMLElement,
): Promise<HTMLElement> {
  if (!context.isTile || !window.__liaTileCrossPatched) return quiz;

  // main restores frozen quizzes after an action (up to 760 ms) and also runs
  // an initial sweep after 1,100 ms. A quick reset can otherwise be frozen
  // again after it already looked successful. Wait past both schedules, then
  // thaw the current Elm node twice so the mutation-driven style repair has
  // also completed before Reset reports success.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 1_220));
  let liveQuiz = quizForButton(button) ?? quiz;
  if (kachelTargetsAreEmpty(liveQuiz)) {
    releaseKachelFreeze(context, liveQuiz, false);
    refreshProgressiveKachelfolgen();
  }
  await waitForLiaRender();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 180));

  liveQuiz = quizForButton(button) ?? liveQuiz;
  if (kachelTargetsAreEmpty(liveQuiz)) {
    releaseKachelFreeze(context, liveQuiz, false);
    refreshProgressiveKachelfolgen();
  }
  await waitForLiaRender();
  return quizForButton(button) ?? liveQuiz;
}

async function performReset(button: HTMLInputElement): Promise<void> {
  const quiz = quizForButton(button);
  const scope = quiz?.closest<HTMLElement>("main.lia-slide__content");
  if (!quiz || !scope || !isNativeQuiz(quiz)) {
    throw new Error("Der Reset-Button ist keinem nativen LiaScript-Quiz zugeordnet.");
  }

  const orthographyContext = captureOrthographyContext(quiz, scope);
  const matheContext = captureMatheContext(quiz, scope);
  const markerContext = captureMarkerContext(quiz, scope);
  const coordinateResetId = button.dataset.liaResetterAnchor;
  const coordinateMacroState = coordinateResetId
    ? coordinateMacroStateByResetId.get(coordinateResetId)
    : undefined;
  const coordinateContext = captureCoordinateContext(
    quiz,
    scope,
    coordinateMacroState,
  );
  const sectionId = readSectionId(quiz);
  const quizzes = nativeQuizzes(scope);
  const nativeReset = await supportsLosslessNativeReset(sectionId);

  const freezeContext = captureKachelContext(quiz);
  const before = await captureQuizVector(sectionId);
  const quizId = validateMapping(quiz, quizzes, before);
  const locator = { scope, sectionId, quizId } satisfies QuizLocator;
  buttonToLocator.set(button, locator);
  const expected = expectedVector(before, quizId);

  if (nativeReset) {
    clearKachelCompatibilityState(quiz);
    sendNativeReset(sectionId, quizId);
    await waitForLiaRender();
    await waitForLiaRender();
    let afterNativeReset = await captureQuizVector(sectionId);

    if (!isIsolatedReset(before, afterNativeReset, quizId, expected.element)) {
      throw new Error(
        "Der native LiaScript-Reset hat keinen isolierten Zielzustand geliefert.",
      );
    }

    let mount = unambiguousMount(locator);
    if (freezeContext.isTile && mount.kind === "absent") {
      releaseKachelFreeze(freezeContext, quiz, false);
      return;
    }
    let currentQuiz = mount.kind === "mounted" ? mount.quiz : quiz;

    if (freezeContext.isTile) {
      if (!kachelTargetsAreEmpty(currentQuiz)) {
        requestKachelDomClear(currentQuiz);
        await waitForKachelToClear(button);
        afterNativeReset = await captureQuizVector(sectionId);
        mount = unambiguousMount(locator);
        if (mount.kind === "absent") {
          if (
            !isIsolatedReset(before, afterNativeReset, quizId, expected.element)
          ) {
            throw new Error(
              "Der native LiaScript-Reset hat keinen isolierten Zielzustand geliefert.",
            );
          }
          releaseKachelFreeze(freezeContext, quiz, false);
          return;
        }
        currentQuiz = mount.quiz;
      }

      if (
        !kachelTargetsAreEmpty(currentQuiz) ||
        !isIsolatedReset(before, afterNativeReset, quizId, expected.element)
      ) {
        throw new Error(
          "Der Kachelzustand wurde nicht vollständig und isoliert geleert.",
        );
      }

    }

    releaseKachelFreeze(
      freezeContext,
      currentQuiz,
      Boolean(freezeContext.isTile && window.__liaTileCrossPatched),
    );
    await waitForLiaRender();
    mount = unambiguousMount(locator);
    if (freezeContext.isTile && mount.kind === "absent") {
      releaseKachelFreeze(freezeContext, quiz, false);
      return;
    }
    currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
    currentQuiz = await settleLegacyKachelFreeze(
      freezeContext,
      button,
      currentQuiz,
    );
    mount = unambiguousMount(locator);
    if (freezeContext.isTile && mount.kind === "absent") {
      releaseKachelFreeze(freezeContext, quiz, false);
      return;
    }
    currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
    if (
      currentQuiz.hasAttribute("data-kf-frozen") ||
      currentQuiz.classList.contains("solved") ||
      currentQuiz.classList.contains("resolved") ||
      (freezeContext.isTile && !kachelTargetsAreEmpty(currentQuiz))
    ) {
      throw new Error("Das Quiz ließ sich nach dem Reset nicht freigeben.");
    }
    if (orthographyContext) {
      await resetOrthographyContext(orthographyContext, currentQuiz);
    }
    if (matheContext) {
      await resetMatheContext(matheContext, currentQuiz);
    }
    if (markerContext) {
      await resetMarkerContext(markerContext, currentQuiz);
    }
    if (coordinateContext) {
      await resetCoordinateContext(coordinateContext, currentQuiz);
    }
    if (
      orthographyContext ||
      matheContext ||
      markerContext ||
      coordinateContext
    ) {
      const afterExternalReset = await captureQuizVector(sectionId);
      if (
        !isIsolatedReset(
          before,
          afterExternalReset,
          quizId,
          expected.element,
        )
      ) {
        throw new Error(
          "Die Synchronisierung des externen Quizzustands hat den LiaScript-Core verändert.",
        );
      }
    }

    return;
  }

  if (freezeContext.isTile) {
    const target = before[quizId];
    if (
      target.solved !== 0 ||
      target.trial !== 0 ||
      target.hint !== 0 ||
      target.error_msg !== ""
    ) {
      throw new Error(
        "Dieses Kachelquiz wurde bereits vom unveränderten LiaScript-Core bewertet und kann deshalb nicht mehr einzeln geöffnet werden. Bitte die Seite neu laden und danach den neuen Kompatibilitätsmodus verwenden.",
      );
    }

    const siblingDomBefore = quizzes.map((entry, index) =>
      index === quizId ? undefined : captureKachelDomState(entry),
    );
    if (!clearKachelWithNativeInputs(quiz, sectionId, quizId)) {
      throw new Error(
        "Das Kachelquiz konnte keinem eindeutigen LiaScript-Eingabetrack zugeordnet werden.",
      );
    }

    await waitForLiaRender();
    await waitForLiaRender();
    await waitForKachelToClear(button);
    let mount = unambiguousMount(locator);
    let currentQuiz = mount.kind === "mounted" ? mount.quiz : quiz;
    if (mount.kind === "mounted" && !kachelTargetsAreEmpty(currentQuiz)) {
      requestKachelDomClear(currentQuiz);
      await waitForKachelToClear(button);
      mount = unambiguousMount(locator);
      currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
    }
    if (mount.kind === "mounted") {
      clearKachelCompatibilityState(currentQuiz);
      releaseKachelFreeze(
        freezeContext,
        currentQuiz,
        Boolean(window.__liaTileCrossPatched),
      );
      refreshProgressiveKachelfolgen();
      await waitForLiaRender();
      mount = unambiguousMount(locator);
      if (mount.kind === "mounted") {
        currentQuiz = await settleLegacyKachelFreeze(
          freezeContext,
          button,
          mount.quiz,
        );
      }
    }

    const after = await captureQuizVector(sectionId);
    if (!isIsolatedReset(before, after, quizId, before[quizId])) {
      throw new Error(
        "Beim Kachelreset wurde außerhalb des Zielquiz ein Zustand verändert.",
      );
    }

    if (!sameJson(after[quizId], before[quizId])) {
      throw new Error(
        "Der Kachelzustand wurde nicht vollständig und isoliert geleert.",
      );
    }

    mount = unambiguousMount(locator);
    if (mount.kind === "absent") {
      releaseKachelFreeze(freezeContext, quiz, false);
      return;
    }
    currentQuiz = mount.quiz;

    const currentQuizzes = nativeQuizzes(mount.scope);
    const siblingsUnchanged =
      currentQuizzes.length === quizzes.length &&
      siblingDomBefore.every(
        (signature, index) =>
          index === quizId ||
          signature === undefined ||
          signature === captureKachelDomState(currentQuizzes[index]),
      );

    if (
      !siblingsUnchanged ||
      !kachelIsPristineAndUsable(currentQuiz)
    ) {
      throw new Error(
        "Der Kachelzustand wurde nicht vollständig und isoliert geleert.",
      );
    }

    return;
  }

  if (containsDropState(before)) {
    throw new Error(
      "Dieses Quiz benötigt für einen sicheren Einzelreset die mitgelieferte LiaScript-Core-Erweiterung.",
    );
  }

  sendRestore(sectionId, expected.vector);
  await waitForLiaRender();
  const afterRestore = await captureQuizVector(sectionId);

  if (!isIsolatedReset(before, afterRestore, quizId, expected.element)) {
    throw new Error("LiaScript hat keinen nachweislich isolierten Reset bestätigt.");
  }

  const currentQuiz = quizForButton(button) ?? quiz;
  releaseKachelFreeze(freezeContext, currentQuiz, false);
  await waitForLiaRender();
  const releasedQuiz = quizForButton(button) ?? currentQuiz;
  if (
    releasedQuiz.hasAttribute("data-kf-frozen") ||
    releasedQuiz.classList.contains("solved") ||
    releasedQuiz.classList.contains("resolved")
  ) {
    throw new Error("Das Quiz ließ sich nach dem Reset nicht freigeben.");
  }
  if (orthographyContext) {
    await resetOrthographyContext(orthographyContext, releasedQuiz);
  }
  if (matheContext) {
    await resetMatheContext(matheContext, releasedQuiz);
  }
  if (markerContext) {
    await resetMarkerContext(markerContext, releasedQuiz);
  }
  if (coordinateContext) {
    await resetCoordinateContext(coordinateContext, releasedQuiz);
  }
  if (
    orthographyContext ||
    matheContext ||
    markerContext ||
    coordinateContext
  ) {
    const afterExternalReset = await captureQuizVector(sectionId);
    if (
      !isIsolatedReset(
        before,
        afterExternalReset,
        quizId,
        expected.element,
      )
    ) {
      throw new Error(
        "Die Synchronisierung des externen Quizzustands hat den LiaScript-Core verändert.",
      );
    }
  }
}

function setButtonState(
  button: HTMLInputElement,
  text: string,
  state?: "success" | "error",
): void {
  for (const current of relatedButtons(button)) {
    current.value = text;
    if (state) {
      current.dataset.state = state;
    } else {
      delete current.dataset.state;
    }
  }
}

function relatedButtons(button: HTMLInputElement): HTMLInputElement[] {
  const anchorId = button.dataset.liaResetterAnchor;
  const buttons = anchorId
    ? hostController.buttonsForResetId(anchorId)
    : [];
  if (!buttons.includes(button)) buttons.push(button);
  return buttons;
}

function setButtonBusy(button: HTMLInputElement, busy: boolean): void {
  for (const current of relatedButtons(button)) {
    current.disabled = busy;
    if (busy) current.setAttribute("aria-busy", "true");
    else current.removeAttribute("aria-busy");
  }
}

function setButtonTitle(button: HTMLInputElement, title?: string): void {
  for (const current of relatedButtons(button)) {
    if (title) current.title = title;
    else current.removeAttribute("title");
  }
}

function mayExpireFeedback(resetId: string, generation: number): boolean {
  return (
    feedbackGeneration.get(resetId) === generation &&
    !activeResetIds.has(resetId) &&
    !pendingResetById.has(resetId)
  );
}

async function resetWithFeedback(button: HTMLInputElement): Promise<void> {
  const resetId =
    button.dataset.liaResetterAnchor ?? `detached-${++anchorCounter}`;
  const generation = (feedbackGeneration.get(resetId) ?? 0) + 1;
  feedbackGeneration.set(resetId, generation);
  activeResetIds.add(resetId);
  setButtonBusy(button, true);
  setButtonTitle(button);
  setButtonState(button, "Reset …");

  try {
    await performReset(button);
    setButtonTitle(button);
    setButtonState(button, "Zurückgesetzt", "success");
    window.setTimeout(() => {
      if (mayExpireFeedback(resetId, generation)) {
        setButtonState(button, "Reset");
        feedbackGeneration.delete(resetId);
      }
    }, 900);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setButtonTitle(button, message);
    setButtonState(button, "Reset fehlgeschlagen", "error");
    console.error("LiaScript-Quiz konnte nicht zurückgesetzt werden:", error);
    window.setTimeout(() => {
      if (mayExpireFeedback(resetId, generation)) {
        setButtonState(button, "Reset");
        setButtonTitle(button);
        feedbackGeneration.delete(resetId);
      }
    }, 2_500);
    throw error;
  } finally {
    activeResetIds.delete(resetId);
    setButtonBusy(button, false);
  }
}

function enqueueReset(button: HTMLInputElement): Promise<void> {
  const resetId =
    button.dataset.liaResetterAnchor ?? `detached-${++anchorCounter}`;
  const pending = pendingResetById.get(resetId);
  if (pending) return pending;

  setButtonBusy(button, true);
  setButtonTitle(button);
  setButtonState(button, "Reset …");
  const result = operationQueue.then(
    () => resetWithFeedback(button),
    () => resetWithFeedback(button),
  );
  pendingResetById.set(resetId, result);
  const cleanup = (): void => {
    if (pendingResetById.get(resetId) === result) {
      pendingResetById.delete(resetId);
      setButtonBusy(button, false);
      if (!button.isConnected) {
        buttonToQuiz.delete(button);
        buttonToLocator.delete(button);
      }
    }
  };
  void result.then(cleanup, cleanup);
  operationQueue = result.catch(() => undefined);
  return result;
}

function mount(root: ParentNode = document): void {
  installKachelInterop();
  injectStyles();
  scan(root);

  if (!observer) {
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

const resetter: ResetterApi = Object.freeze({
  ready: true,
  version: VERSION,
  mount,
  reset(trigger: HTMLElement): Promise<void> {
    let button = trigger.closest<HTMLInputElement>(
      `.${RESETTER_BUTTON_CLASS}`,
    );
    if (!button) {
      const anchor = trigger.closest<HTMLElement>(RESETTER_ANCHOR_SELECTOR);
      if (anchor) {
        bindAnchor(anchor);
        button = hostController.buttonForAnchor(anchor) ?? null;
      }
    }
    return button
      ? enqueueReset(button)
      : Promise.reject(new Error("Kein Resetter-Button gefunden."));
  },
});

window.Resetter = resetter;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
} else {
  mount();
}

export {};
