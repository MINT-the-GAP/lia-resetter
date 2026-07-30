export const RESETTER_ANCHOR_SELECTOR = "[data-lia-resetter]";
export const RESETTER_BUTTON_CLASS = "lia-resetter__button";
export const RESETTER_HOST_CLASS = "lia-resetter__host";
export const RESETTER_PLACEHOLDER_CLASS = "lia-resetter__placeholder";

const SHADOW_STYLE_ATTRIBUTE = "data-lia-resetter-shadow-style";

const SHADOW_STYLE = `
  :host {
    box-sizing: border-box;
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin: .35rem 0 .75rem;
  }
  :host([hidden]) { display: none; }
  .${RESETTER_BUTTON_CLASS} {
    appearance: none;
    box-sizing: border-box;
    border: 1px solid currentColor;
    border-radius: .25rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    line-height: 1.35;
    padding: .42rem .8rem;
    user-select: none;
    white-space: nowrap;
  }
  .${RESETTER_BUTTON_CLASS}:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .${RESETTER_BUTTON_CLASS}:disabled { cursor: default; opacity: .55; }
  .${RESETTER_BUTTON_CLASS}[aria-busy="true"] { cursor: wait; opacity: .72; }
  .${RESETTER_BUTTON_CLASS}[data-state="success"] { opacity: .82; }
`;

export interface ResetterHostBinding {
  readonly anchor: HTMLElement;
  readonly quiz: HTMLElement;
  readonly button: HTMLInputElement;
  readonly resetId: string;
}

interface InternalBinding extends ResetterHostBinding {
  readonly clickListener: (event: MouseEvent) => void;
}

export interface ResetterHostControllerOptions {
  readonly findQuiz: (anchor: HTMLElement) => HTMLElement | undefined;
  readonly resetId: (anchor: HTMLElement, quiz: HTMLElement) => string;
  readonly onReset: (button: HTMLInputElement) => void;
  readonly onBind?: (binding: ResetterHostBinding) => void;
  readonly onUnbind?: (binding: ResetterHostBinding) => void;
}

function anchorsWithin(root: ParentNode): HTMLElement[] {
  const anchors: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches(RESETTER_ANCHOR_SELECTOR)) {
    anchors.push(root);
  }
  anchors.push(
    ...Array.from(
      root.querySelectorAll<HTMLElement>(RESETTER_ANCHOR_SELECTOR),
    ),
  );
  return anchors;
}

function createButton(resetId: string): HTMLInputElement {
  const button = document.createElement("input");
  button.type = "button";
  button.className = `lia-btn lia-btn--outline ${RESETTER_BUTTON_CLASS}`;
  button.dataset.liaResetterAnchor = resetId;
  button.value = "Reset";
  button.setAttribute("aria-label", "Dieses Quiz zurücksetzen");
  button.setAttribute("part", "button");
  return button;
}

function ensureShadowButton(
  anchor: HTMLElement,
  resetId: string,
): HTMLInputElement | undefined {
  // The light-DOM host is authored by @resetter and therefore known to Elm.
  // Resetter owns only this shadow tree, which is outside Elm's child lists.
  let root = anchor.shadowRoot;
  if (!root) {
    try {
      root = anchor.attachShadow({ mode: "open" });
    } catch {
      return undefined;
    }
  }

  let style = root.querySelector<HTMLStyleElement>(
    `style[${SHADOW_STYLE_ATTRIBUTE}]`,
  );
  if (!style) {
    style = document.createElement("style");
    style.setAttribute(SHADOW_STYLE_ATTRIBUTE, "");
    root.prepend(style);
  }
  style.textContent = SHADOW_STYLE;

  const buttons = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      `input.${RESETTER_BUTTON_CLASS}[type="button"]`,
    ),
  );
  const button = buttons.shift() ?? createButton(resetId);
  for (const duplicate of buttons) duplicate.remove();
  if (!button.isConnected) root.append(button);

  button.dataset.liaResetterAnchor = resetId;
  anchor.dataset.liaResetterId = resetId;
  anchor.classList.add(RESETTER_HOST_CLASS);
  anchor.removeAttribute("aria-hidden");
  anchor.removeAttribute("hidden");
  return button;
}

function deactivateHost(anchor: HTMLElement): void {
  for (const button of anchor.shadowRoot?.querySelectorAll(
    `input.${RESETTER_BUTTON_CLASS}[type="button"]`,
  ) ?? []) {
    button.remove();
  }
  anchor.classList.remove(RESETTER_HOST_CLASS);
  anchor.hidden = true;
  anchor.setAttribute("aria-hidden", "true");
}

export class ResetterHostController {
  readonly #bindings = new Map<HTMLElement, InternalBinding>();
  readonly #buttonToBinding = new WeakMap<HTMLInputElement, InternalBinding>();
  readonly #quizToAnchor = new Map<HTMLElement, HTMLElement>();

  constructor(readonly options: ResetterHostControllerOptions) {}

  scan(root: ParentNode = document): void {
    this.cleanupDisconnected();
    for (const anchor of anchorsWithin(root)) this.bind(anchor);
  }

  bind(anchor: HTMLElement): HTMLInputElement | undefined {
    this.cleanupDisconnected();

    if (anchor.closest(".lia-quiz__control")) {
      this.release(anchor, true);
      return undefined;
    }

    const quiz = this.options.findQuiz(anchor);
    if (!quiz) {
      this.release(anchor, true);
      return undefined;
    }

    const otherAnchor = this.#quizToAnchor.get(quiz);
    if (otherAnchor && otherAnchor !== anchor && otherAnchor.isConnected) {
      this.release(anchor, true);
      return undefined;
    }

    const resetId = this.options.resetId(anchor, quiz);
    const button = ensureShadowButton(anchor, resetId);
    if (!button) {
      this.release(anchor, true);
      return undefined;
    }

    const current = this.#bindings.get(anchor);
    if (current && current.quiz === quiz && current.button === button) {
      const binding = { ...current, resetId } satisfies InternalBinding;
      this.#bindings.set(anchor, binding);
      this.#buttonToBinding.set(button, binding);
      this.#quizToAnchor.set(quiz, anchor);
      this.options.onBind?.(binding);
      return button;
    }

    if (current) this.releaseBinding(current, current.button !== button);

    const clickListener = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.options.onReset(button);
    };
    button.addEventListener("click", clickListener);

    const binding = {
      anchor,
      quiz,
      button,
      resetId,
      clickListener,
    } satisfies InternalBinding;
    this.#bindings.set(anchor, binding);
    this.#buttonToBinding.set(button, binding);
    this.#quizToAnchor.set(quiz, anchor);
    this.options.onBind?.(binding);
    return button;
  }

  buttonForAnchor(anchor: HTMLElement): HTMLInputElement | undefined {
    return this.#bindings.get(anchor)?.button;
  }

  quizForButton(button: HTMLInputElement): HTMLElement | undefined {
    return this.#buttonToBinding.get(button)?.quiz;
  }

  hasQuiz(quiz: HTMLElement): boolean {
    const anchor = this.#quizToAnchor.get(quiz);
    return Boolean(anchor?.isConnected && this.#bindings.has(anchor));
  }

  buttonsForResetId(resetId: string): HTMLInputElement[] {
    return Array.from(this.#bindings.values())
      .filter((binding) => binding.resetId === resetId)
      .map((binding) => binding.button);
  }

  cleanupDisconnected(): void {
    for (const binding of Array.from(this.#bindings.values())) {
      if (!binding.anchor.isConnected || !binding.quiz.isConnected) {
        this.releaseBinding(binding, binding.anchor.isConnected);
      }
    }
  }

  dispose(): void {
    for (const binding of Array.from(this.#bindings.values())) {
      this.releaseBinding(binding, true);
    }
  }

  private release(anchor: HTMLElement, removeButton: boolean): void {
    const binding = this.#bindings.get(anchor);
    if (binding) {
      this.releaseBinding(binding, removeButton);
    } else if (removeButton) {
      deactivateHost(anchor);
    }
  }

  private releaseBinding(binding: InternalBinding, removeButton: boolean): void {
    binding.button.removeEventListener("click", binding.clickListener);
    if (removeButton) deactivateHost(binding.anchor);
    if (this.#bindings.get(binding.anchor) === binding) {
      this.#bindings.delete(binding.anchor);
    }
    this.#buttonToBinding.delete(binding.button);
    if (this.#quizToAnchor.get(binding.quiz) === binding.anchor) {
      this.#quizToAnchor.delete(binding.quiz);
    }
    this.options.onUnbind?.(binding);
  }
}
