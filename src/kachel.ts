const TARGET_SELECTOR =
  "[onclick],[onkeydown],[ondragover],[ondragleave],[ondrop]," +
  "[data-onclick],[data-onkeydown],[data-ondragover],[data-ondragleave],[data-ondrop]," +
  "[data-reset-tile-role='target']";
const SOURCE_SELECTOR =
  "[onclick],[onkeydown],[ondragstart],[ondragend]," +
  "[data-onclick],[data-onkeydown],[data-ondragstart],[data-ondragend]," +
  "[draggable],[data-reset-tile-role='source']";
const KACHEL_ROOT_SELECTOR =
  ".Kachel, .kachelfolge-wrap, [id^='kachelfolge-wrap-'], " +
  "[data-lia-kachelfolge], [id^='lia-kachelfolge-']";
const COMPATIBILITY_STYLE_ID = "lia-resetter-kachel-compatibility";
const TARGET_COMMAND = /cmd\s*:\s*['"](dragtarget|dragenter)['"]/i;
const SOURCE_COMMAND = /cmd\s*:\s*['"](dragsource|dragstart|dragend)['"]/i;

export interface KachelResetContext {
  readonly root: HTMLElement;
  readonly isTile: boolean;
  readonly keys: readonly string[];
  readonly uids: readonly string[];
  readonly wasFilled: boolean;
}

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: unknown): string {
  return normalize(value).toLowerCase();
}

function hasCommand(element: Element, pattern: RegExp): boolean {
  return ["onclick", "onkeydown", "ondragover", "ondragleave", "ondrop", "ondragstart", "ondragend"]
    .some((name) =>
      pattern.test(
        String(
          element.getAttribute(name) ??
          element.getAttribute(`data-${name}`) ??
          "",
        ),
      ),
    );
}

function isTileTarget(element: Element): boolean {
  return (
    element instanceof HTMLElement &&
    element.dataset.kfSeqDummy !== "1" &&
    (element.dataset.resetTileRole === "target" || hasCommand(element, TARGET_COMMAND))
  );
}

function isTileSource(element: Element): boolean {
  return (
    element instanceof HTMLElement &&
    !isTileTarget(element) &&
    (element.dataset.resetTileRole === "source" ||
      element.hasAttribute("draggable") ||
      hasCommand(element, SOURCE_COMMAND))
  );
}

export function getKachelTargets(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(TARGET_SELECTOR),
  ).filter(isTileTarget);
}

export function getKachelSources(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(SOURCE_SELECTOR),
  ).filter(isTileSource);
}

export function isDropQuiz(quiz: HTMLElement): boolean {
  return (
    quiz.classList.contains("lia-quiz-drop") ||
    Boolean(getKachelRoot(quiz))
  );
}

export function getKachelRoot(quiz: HTMLElement): HTMLElement | undefined {
  if (getKachelTargets(quiz).length > 0) {
    return quiz;
  }

  const semanticRegion = quiz.closest<HTMLElement>(KACHEL_ROOT_SELECTOR);

  // Current LiaScript renders the targets/source bank beside (not inside)
  // .lia-quiz. Find the smallest common owner for exactly this quiz. Requiring
  // either a semantic region or a Kachelfolge marker avoids treating unrelated
  // native Drop quizzes as Kacheln. The per-quiz owner also supports multiple
  // independent quiz paragraphs inside one .Kachel region.
  const slide = quiz.closest("main.lia-slide__content");
  let owner = quiz.parentElement;
  while (owner && owner !== slide && owner !== document.body) {
    const quizzes = Array.from(owner.querySelectorAll<HTMLElement>(".lia-quiz"));
    const belongsToRegion =
      semanticRegion !== null &&
      (owner === semanticRegion || semanticRegion.contains(owner));
    const hasKachelfolgeMarker = Boolean(
      owner.matches("[data-lia-kachelfolge],[data-kf-mode]") ||
        owner.querySelector("[data-lia-kachelfolge],[data-kf-mode]"),
    );
    if (
      quizzes.length === 1 &&
      quizzes[0] === quiz &&
      (belongsToRegion || hasKachelfolgeMarker) &&
      getKachelTargets(owner).length > 0
    ) {
      return owner;
    }
    owner = owner.parentElement;
  }

  return undefined;
}

function collectKachelRoots(scope: ParentNode): HTMLElement[] {
  const quizzes: HTMLElement[] = [];
  if (scope instanceof HTMLElement && scope.classList.contains("lia-quiz")) {
    quizzes.push(scope);
  }
  quizzes.push(...Array.from(scope.querySelectorAll<HTMLElement>(".lia-quiz")));

  const roots: HTMLElement[] = [];
  for (const quiz of quizzes) {
    const root = getKachelRoot(quiz);
    if (root && !roots.includes(root)) {
      roots.push(root);
    }
  }
  return roots;
}

export function targetDisplayText(target: Element): string {
  const display = target.firstElementChild ?? target;
  const hasPlacedSourceChild = Array.from(target.children).some(isTileSource);
  const plainText = normalize(display.textContent);
  const imageText = [
    ...(display.matches("img[alt]") ? [display] : []),
    ...Array.from(display.querySelectorAll("img[alt]")),
  ]
    .map((image) => normalize(image.getAttribute("alt")))
    .filter(Boolean)
    .join(" ");
  const text = plainText || imageText || normalize(display.getAttribute("aria-label"));
  const rememberedText = normalize(
    window.__liaKfAssignedSources?.get(target)?.text,
  );
  const hasPlacedSource =
    hasPlacedSourceChild || (rememberedText !== "" && rememberedText === text);
  const isEmptyPlaceholder =
    !hasPlacedSource && (text === "✛" || text === "+" || text === "?");
  return isEmptyPlaceholder ? "" : text;
}

function ensureCompatibilityStyles(): void {
  if (document.getElementById(COMPATIBILITY_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = COMPATIBILITY_STYLE_ID;
  style.textContent = `
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-onclick*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-onkeydown*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-ondragover*="dragenter"] {
      display: none !important;
    }
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-onclick*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-onkeydown*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-ondragover*="dragenter"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-lia-kachelfolge-visible="true"] {
      display: inline-flex !important;
    }
    [data-lia-resetter-progressive="hidden"] {
      display: none !important;
    }
    [data-lia-resetter-progressive="visible"] {
      display: inline-flex !important;
    }
    [data-kf-mode="seq"] [data-reset-tile-role="target"],
    [data-kf-mode="seq"] [data-kf-seq-dummy="1"] {
      display: none !important;
    }
    [data-kf-mode="seq"] [data-reset-tile-role="target"][data-kf-seq-visible="1"],
    [data-kf-mode="seq"] [data-kf-seq-dummy="1"][data-kf-seq-visible="1"] {
      display: inline-block !important;
    }
  `;
  document.head.append(style);
}

function updateSequentialVisibility(root: HTMLElement): void {
  const progressiveMarker =
    root.matches("[data-lia-kachelfolge-mode='progressive']")
      ? root
      : root.closest<HTMLElement>(
          "[data-lia-kachelfolge-mode='progressive']",
        ) ??
        root.querySelector<HTMLElement>(
          "[data-lia-kachelfolge-mode='progressive']",
        );
  if (progressiveMarker) {
    const targets = getKachelTargets(root);
    let emptyTargetShown = false;

    for (const target of targets) {
      const filled = Array.from(target.children).some(isTileSource);
      const visible = filled || !emptyTargetShown;
      if (!filled && !emptyTargetShown) emptyTargetShown = true;

      if (visible) {
        target.setAttribute("data-lia-kachelfolge-visible", "true");
        target.setAttribute("data-lia-resetter-progressive", "visible");
      } else {
        target.removeAttribute("data-lia-kachelfolge-visible");
        target.setAttribute("data-lia-resetter-progressive", "hidden");
      }
    }
    return;
  }

  const sequentialRoot = root.matches("[data-kf-mode='seq']")
    ? root
    : root.closest<HTMLElement>("[data-kf-mode='seq']") ??
      root.querySelector<HTMLElement>("[data-kf-mode='seq']");
  if (!sequentialRoot) return;
  const targets = getKachelTargets(root);
  if (targets.length === 0) return;

  let dummy =
    sequentialRoot.querySelector<HTMLElement>("[data-kf-seq-dummy='1']");
  if (!dummy) {
    dummy = document.createElement("span");
    dummy.dataset.kfSeqDummy = "1";
    dummy.className = "lia-target-placeholder lia-resetter__kachel-dummy";
    dummy.textContent = "✛";
    dummy.setAttribute("aria-hidden", "true");
    sequentialRoot.append(dummy);
  }

  const filled = targets.filter((target) => targetDisplayText(target) !== "").length;
  const visibleTargets = Math.min(filled + 1, targets.length);
  targets.forEach((target, index) => {
    if (index < visibleTargets) target.dataset.kfSeqVisible = "1";
    else target.removeAttribute("data-kf-seq-visible");
  });

  if (filled >= targets.length) dummy.dataset.kfSeqVisible = "1";
  else dummy.removeAttribute("data-kf-seq-visible");
}

export function refreshKachelProgression(
  scope: ParentNode = document,
): void {
  for (const root of collectKachelRoots(scope)) {
    updateSequentialVisibility(root);
  }
}

export function kachelTargetsAreEmpty(quiz: HTMLElement): boolean {
  const root = getKachelRoot(quiz);
  const targets = root ? getKachelTargets(root) : [];
  return targets.length > 0 && targets.every((target) => targetDisplayText(target) === "");
}

function currentSlideHash(): string {
  const hash = String(window.location.hash ?? "").trim();
  if (!hash) {
    return "nohash";
  }

  const query = hash.indexOf("?");
  const ampersand = hash.indexOf("&");
  let end = hash.length;
  if (query >= 0) end = Math.min(end, query);
  if (ampersand >= 0) end = Math.min(end, ampersand);
  return normalizeKey(hash.slice(0, end) || hash);
}

function domPathToken(node: Element): string {
  const parts: string[] = [];
  let current: Element | null = node;
  let guard = 0;

  while (current && current !== document.body && guard < 16) {
    const tag = String(current.tagName || "x").toLowerCase();
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (String(sibling.tagName || "").toLowerCase() === tag) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }
    parts.push(`${tag}:${index}`);
    current = current.parentElement;
    guard += 1;
  }

  return parts.reverse().join(">");
}

function readParameterId(element: Element, wantedCommand: RegExp): number | undefined {
  for (const name of ["onclick", "onkeydown", "ondragover", "ondrop", "ondragstart", "ondragend"]) {
    const value = String(
      element.getAttribute(name) ??
      element.getAttribute(`data-${name}`) ??
      "",
    );
    if (!value || !wantedCommand.test(value)) continue;
    const match = value.match(/param\s*:\s*\{[^}]*id\s*:\s*(\d+)/i);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function expectedTexts(root: HTMLElement): string[] {
  const uid = String(root.dataset.kfUid ?? "").trim();
  const fromPlugin = uid ? window.__liaKachelfolgeExpected?.[uid] : undefined;
  if (Array.isArray(fromPlugin) && fromPlugin.length > 0) {
    return fromPlugin.map(normalize);
  }

  const targets = getKachelTargets(root);
  const sources = getKachelSources(root).filter(
    (source) => !targets.some((target) => target === source || target.contains(source)),
  );
  const values: string[] = [];

  for (const target of targets) {
    const id = readParameterId(target, TARGET_COMMAND);
    const source = sources.find(
      (candidate) => readParameterId(candidate, SOURCE_COMMAND) === id,
    );
    if (id === undefined || !source) return [];
    values.push(normalize(source.textContent));
  }

  return values;
}

function quizKey(node: HTMLElement): string {
  const quiz = node.closest<HTMLElement>(".lia-quiz");
  const root = quiz ? getKachelRoot(quiz) : node;
  const selected = quiz ?? root;
  if (!selected) return "";

  const id = String(selected.dataset.resetallId ?? "").trim();
  if (id) return `id:${id}`;
  const owner = String(selected.dataset.resetTileOwner ?? "").trim();
  if (owner) return `owner:${owner}`;
  const uid = String(selected.dataset.kfUid ?? "").trim();
  if (uid && !/^inline-\d+$/i.test(uid)) return `kf:${uid}`;
  return "";
}

function stableSignature(
  _quiz: HTMLElement,
  root: HTMLElement,
  expectedOverride?: string,
): string {
  const roots = collectKachelRoots(document.body || document.documentElement);
  const localIndex = roots.indexOf(root);
  const expected =
    expectedOverride ??
    (expectedTexts(root)
      .map(normalizeKey)
      .filter(Boolean)
      .sort()
      .join("|") ||
      "none");
  return `sig:${currentSlideHash()}:${localIndex}:${domPathToken(root) || "nopth"}:${expected}`;
}

function collectFreezeTokens(quiz: HTMLElement, root: HTMLElement): {
  keys: string[];
  uids: string[];
} {
  const keys: string[] = [];
  const uids: string[] = [];
  const addKey = (value: string): void => {
    if (/^(id:|owner:|kf:|sig:)/i.test(value) && !keys.includes(value)) {
      keys.push(value);
    }
  };
  const addUid = (value: string): void => {
    const uid = String(value || "").trim();
    if (!uid) return;
    if (/^inline-\d+$/i.test(uid)) {
      addKey(`sig:${currentSlideHash()}:inline:${uid}`);
    } else if (!uids.includes(uid)) {
      uids.push(uid);
    }
  };

  addKey(quizKey(quiz));
  addKey(quizKey(root));
  addKey(stableSignature(quiz, root));
  // main computes this signature from real on* attributes. Stock LiaScript
  // sanitizes those handlers to data-on*, so plain .Kachel quizzes are stored
  // with the fallback expected segment "none". Keep that exact alternative
  // alongside the richer local signature; the root path and local index still
  // isolate it to this one quiz.
  addKey(stableSignature(quiz, root, "none"));

  for (const node of [quiz, root]) {
    addUid(String(node.dataset.kfUid ?? ""));
    addUid(String(node.closest<HTMLElement>("[data-kf-uid]")?.dataset.kfUid ?? ""));
  }

  return { keys, uids };
}

export function captureKachelContext(quiz: HTMLElement): KachelResetContext {
  const tileRoot = getKachelRoot(quiz);
  const root = tileRoot ?? quiz;
  const { keys, uids } = collectFreezeTokens(quiz, root);
  return {
    root,
    isTile: Boolean(tileRoot),
    keys,
    uids,
    wasFilled: Boolean(tileRoot) && !kachelTargetsAreEmpty(quiz),
  };
}

function deleteFreezeTokens(context: KachelResetContext, quiz: HTMLElement): void {
  const root = getKachelRoot(quiz) ?? context.root;
  const current = collectFreezeTokens(quiz, root);
  const keys = new Set([...context.keys, ...current.keys]);
  const uids = new Set([...context.uids, ...current.uids]);

  for (const key of keys) {
    window.__liaKfFrozenQuizKeys?.delete(key);
    window.__liaKfFrozenQuizFeedback?.delete(`k:${key}`);
  }
  for (const uid of uids) {
    window.__liaKfFrozenQuizUids?.delete(uid);
    window.__liaKfFrozenQuizFeedback?.delete(`u:${uid}`);
  }
}

function thawDom(context: KachelResetContext, quiz: HTMLElement): void {
  const root = getKachelRoot(quiz) ?? context.root;
  const targets = getKachelTargets(root);

  quiz.classList.remove("solved", "resolved");
  quiz.removeAttribute("data-kf-frozen");
  root.removeAttribute("data-kf-frozen");

  const feedback = quiz.querySelector<HTMLElement>(".lia-quiz__feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.hidden = true;
    feedback.classList.remove("text-success", "text-error", "text-disabled");
  }

  for (const target of targets) {
    target.removeAttribute("aria-disabled");
    target.removeAttribute("aria-hidden");
    target.setAttribute("tabindex", "0");
    target.style.removeProperty("pointer-events");
    window.__liaKfAssignedSources?.delete(target);
  }

  for (const source of getKachelSources(root)) {
    source.removeAttribute("aria-disabled");
    source.removeAttribute("aria-hidden");
    source.setAttribute("aria-grabbed", "false");
    source.setAttribute("draggable", "true");
    source.setAttribute("tabindex", "0");
    source.style.removeProperty("pointer-events");
    source.style.removeProperty("display");
  }

  for (const button of Array.from(
    quiz.querySelectorAll<HTMLButtonElement>(".lia-quiz__control button"),
  )) {
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
    button.style.removeProperty("pointer-events");
  }

  const modeRoot = root.matches("[data-kf-mode='seq']")
    ? root
    : root.closest<HTMLElement>("[data-kf-mode='seq']") ??
      root.querySelector<HTMLElement>("[data-kf-mode='seq']");
  if (modeRoot) {
    targets.forEach((target, index) => {
      if (index === 0) target.dataset.kfSeqVisible = "1";
      else target.removeAttribute("data-kf-seq-visible");
    });
    modeRoot
      .querySelectorAll<HTMLElement>("[data-kf-seq-dummy='1']")
      .forEach((dummy) => dummy.removeAttribute("data-kf-seq-visible"));
  }
}

export function releaseKachelFreeze(
  context: KachelResetContext,
  quiz: HTMLElement,
  scheduleRetries: boolean,
): void {
  deleteFreezeTokens(context, quiz);
  thawDom(context, quiz);

  if (!scheduleRetries) return;
  for (const delay of [80, 360, 920]) {
    window.setTimeout(() => {
      const liveQuiz = quiz.isConnected
        ? quiz
        : context.root.matches(".lia-quiz")
          ? context.root
          : context.root.querySelector<HTMLElement>(".lia-quiz");
      if (!liveQuiz?.isConnected || !kachelTargetsAreEmpty(liveQuiz)) return;
      deleteFreezeTokens(context, liveQuiz);
      thawDom(context, liveQuiz);
    }, delay);
  }
}

/**
 * lia-kachel/main exposes no public reset API. Its controlled double-click
 * clearing path does call the internal state updater, however. This adapter is
 * only used after the native inputs or patched core reset the quiz metadata.
 */
export function requestKachelDomClear(quiz: HTMLElement): boolean {
  const root = getKachelRoot(quiz);
  if (!root || !window.__liaTileCrossPatched) return false;

  const targets = getKachelTargets(root).filter(
    (target) => targetDisplayText(target) !== "",
  );
  if (targets.length === 0) return true;

  const previous = window.__liaKfBlockDblclickClear;
  window.__liaKfBlockDblclickClear = false;
  try {
    for (const target of targets) {
      target.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    }
  } finally {
    if (previous === undefined) {
      delete window.__liaKfBlockDblclickClear;
    } else {
      window.__liaKfBlockDblclickClear = previous;
    }
  }

  return true;
}

export function installKachelInterop(): void {
  ensureCompatibilityStyles();
  window.__liaResetGetTileQuizTargetsFromRoot = (root: Element): Element[] =>
    getKachelTargets(root);
  window.__liaResetCollectTileQuizRoots = (scope: Element): Element[] =>
    collectKachelRoots(scope);
  window.__liaResetGetTileQuizRootFromNode = (
    node: Element,
    _scope: Element,
  ): Element | null => {
    const quiz = node.closest<HTMLElement>(".lia-quiz") ??
      (node.matches(".lia-quiz") ? (node as HTMLElement) : null);
    return quiz ? getKachelRoot(quiz) ?? null : null;
  };

  for (const root of collectKachelRoots(document.body || document.documentElement)) {
    root.dataset.resetTileRoot = "1";
    getKachelTargets(root).forEach((target) => {
      target.dataset.resetTileRole = "target";
    });
    getKachelSources(root).forEach((source) => {
      source.dataset.resetTileRole = "source";
    });
    updateSequentialVisibility(root);
  }
}
