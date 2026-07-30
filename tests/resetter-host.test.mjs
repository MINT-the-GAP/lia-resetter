import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Window } from "happy-dom";
import ts from "typescript";

const hostSource = readFileSync(
  new URL("../src/resetter-host.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(hostSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    useDefineForClassFields: true,
  },
  fileName: "resetter-host.ts",
  reportDiagnostics: true,
});
const errors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.deepEqual(
  errors,
  [],
  errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n"),
);

const hostModuleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const {
  RESETTER_BUTTON_CLASS,
  RESETTER_HOST_CLASS,
  ResetterHostController,
} = await import(hostModuleUrl);

const DOM_GLOBAL_NAMES = [
  "window",
  "document",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "MouseEvent",
  "ShadowRoot",
];

function installDom(t) {
  const window = new Window({ url: "https://example.test/course/" });
  const values = {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    MouseEvent: window.MouseEvent,
    ShadowRoot: window.ShadowRoot,
  };
  const previous = new Map(
    DOM_GLOBAL_NAMES.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );

  for (const name of DOM_GLOBAL_NAMES) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: values[name],
    });
  }

  t.after(async () => {
    for (const name of DOM_GLOBAL_NAMES) {
      const descriptor = previous.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    await window.happyDOM.abort();
  });

  return window;
}

function createQuiz(document, key) {
  const quiz = document.createElement("section");
  quiz.className = "lia-quiz lia-quiz-generic";
  quiz.dataset.quizKey = key;

  const control = document.createElement("div");
  control.className = "lia-quiz__control";
  const check = document.createElement("button");
  check.className = "lia-quiz__check";
  check.textContent = "Prüfen";
  control.append(check);
  quiz.append(control);

  return { quiz, control };
}

function createAnchor(document) {
  const anchor = document.createElement("span");
  anchor.setAttribute("data-lia-resetter", "");
  anchor.setAttribute("aria-hidden", "true");
  return anchor;
}

function appendPair(document, key) {
  const group = document.createElement("div");
  group.dataset.pair = key;
  const { quiz, control } = createQuiz(document, key);
  const anchor = createAnchor(document);
  group.append(quiz, anchor);
  document.body.append(group);
  return { group, quiz, control, anchor };
}

function previousQuiz(anchor) {
  for (
    let candidate = anchor.previousElementSibling;
    candidate;
    candidate = candidate.previousElementSibling
  ) {
    if (candidate.matches(".lia-quiz")) return candidate;
  }
  return undefined;
}

function controllerFixture() {
  const resetButtons = [];
  const bound = [];
  const unbound = [];
  const controller = new ResetterHostController({
    findQuiz: previousQuiz,
    resetId: (_anchor, quiz) => `reset-${quiz.dataset.quizKey}`,
    onReset: (button) => resetButtons.push(button),
    onBind: (binding) => bound.push(binding),
    onUnbind: (binding) => unbound.push(binding),
  });
  return { controller, resetButtons, bound, unbound };
}

function shadowButtons(anchor) {
  return Array.from(
    anchor.shadowRoot?.querySelectorAll(
      `input.${RESETTER_BUTTON_CLASS}[type="button"]`,
    ) ?? [],
  );
}

test("mounts the reset button only in the resetter-owned shadow tree", (t) => {
  const { document, HTMLInputElement } = installDom(t);
  const { quiz, control, anchor } = appendPair(document, "ownership");
  const { controller } = controllerFixture();

  controller.scan(document);

  const button = controller.buttonForAnchor(anchor);
  assert.ok(button instanceof HTMLInputElement);
  assert.ok(anchor.shadowRoot);
  assert.equal(button.getRootNode(), anchor.shadowRoot);
  assert.deepEqual(shadowButtons(anchor), [button]);
  assert.equal(anchor.childElementCount, 0);
  assert.equal(anchor.closest(".lia-quiz__control"), null);
  assert.equal(button.closest(".lia-quiz__control"), null);
  assert.equal(control.contains(button), false);
  assert.equal(quiz.contains(button), false);
  assert.equal(control.querySelector(`.${RESETTER_BUTTON_CLASS}`), null);
  assert.equal(document.querySelector(`.${RESETTER_BUTTON_CLASS}`), null);
  assert.ok(anchor.classList.contains(RESETTER_HOST_CLASS));
  assert.equal(anchor.hasAttribute("aria-hidden"), false);
  assert.equal(controller.quizForButton(button), quiz);
  assert.equal(controller.hasQuiz(quiz), true);
});

test("keeps scans idempotent and invokes one callback per click", (t) => {
  const { document } = installDom(t);
  const { anchor } = appendPair(document, "idempotent");
  const { controller, resetButtons } = controllerFixture();

  controller.scan(document);
  const firstButton = controller.buttonForAnchor(anchor);
  assert.ok(firstButton);

  controller.scan(document);
  controller.scan(anchor);
  controller.bind(anchor);

  assert.equal(controller.buttonForAnchor(anchor), firstButton);
  assert.deepEqual(shadowButtons(anchor), [firstButton]);
  assert.equal(
    anchor.shadowRoot.querySelectorAll("style[data-lia-resetter-shadow-style]")
      .length,
    1,
  );

  firstButton.click();
  assert.deepEqual(resetButtons, [firstButton]);

  controller.scan(document);
  firstButton.click();
  assert.deepEqual(resetButtons, [firstButton, firstButton]);
});

test("keeps two quiz and resetter pairs isolated", (t) => {
  const { document } = installDom(t);
  const first = appendPair(document, "first");
  const second = appendPair(document, "second");
  const { controller, resetButtons } = controllerFixture();

  controller.scan(document);

  const firstButton = controller.buttonForAnchor(first.anchor);
  const secondButton = controller.buttonForAnchor(second.anchor);
  assert.ok(firstButton);
  assert.ok(secondButton);
  assert.notEqual(firstButton, secondButton);
  assert.equal(controller.quizForButton(firstButton), first.quiz);
  assert.equal(controller.quizForButton(secondButton), second.quiz);
  assert.deepEqual(controller.buttonsForResetId("reset-first"), [firstButton]);
  assert.deepEqual(controller.buttonsForResetId("reset-second"), [secondButton]);

  secondButton.click();
  firstButton.click();
  assert.deepEqual(resetButtons, [secondButton, firstButton]);
  assert.deepEqual(shadowButtons(first.anchor), [firstButton]);
  assert.deepEqual(shadowButtons(second.anchor), [secondButton]);
});

test("cleans a removed quiz and binds a single fresh button after remount", (t) => {
  const { document } = installDom(t);
  const { group, quiz, anchor } = appendPair(document, "old");
  const { controller, resetButtons, unbound } = controllerFixture();

  controller.scan(document);
  const oldButton = controller.buttonForAnchor(anchor);
  assert.ok(oldButton);

  quiz.remove();
  controller.scan(document);

  assert.equal(controller.buttonForAnchor(anchor), undefined);
  assert.equal(controller.quizForButton(oldButton), undefined);
  assert.equal(controller.hasQuiz(quiz), false);
  assert.deepEqual(shadowButtons(anchor), []);
  assert.equal(anchor.hidden, true);
  assert.equal(anchor.getAttribute("aria-hidden"), "true");
  assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), false);
  oldButton.click();
  assert.deepEqual(resetButtons, []);
  assert.equal(unbound.length, 1);

  const replacement = createQuiz(document, "replacement");
  group.insertBefore(replacement.quiz, anchor);
  controller.scan(group);

  const newButton = controller.buttonForAnchor(anchor);
  assert.ok(newButton);
  assert.notEqual(newButton, oldButton);
  assert.equal(controller.quizForButton(newButton), replacement.quiz);
  assert.equal(controller.hasQuiz(replacement.quiz), true);
  assert.deepEqual(shadowButtons(anchor), [newButton]);
  assert.equal(anchor.hidden, false);
  assert.equal(anchor.hasAttribute("aria-hidden"), false);
  assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), true);

  newButton.click();
  assert.deepEqual(resetButtons, [newButton]);
});

test("binds an anchor when its quiz appears later", (t) => {
  const { document } = installDom(t);
  const group = document.createElement("div");
  const anchor = createAnchor(document);
  group.append(anchor);
  document.body.append(group);
  const { controller, resetButtons } = controllerFixture();

  controller.scan(group);
  assert.equal(controller.buttonForAnchor(anchor), undefined);
  assert.equal(anchor.shadowRoot, null);
  assert.equal(anchor.hidden, true);
  assert.equal(anchor.getAttribute("aria-hidden"), "true");
  assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), false);

  const delayed = createQuiz(document, "delayed");
  group.insertBefore(delayed.quiz, anchor);
  controller.scan(anchor);

  const button = controller.buttonForAnchor(anchor);
  assert.ok(button);
  assert.equal(controller.quizForButton(button), delayed.quiz);
  assert.deepEqual(shadowButtons(anchor), [button]);
  assert.equal(anchor.hidden, false);
  assert.equal(anchor.hasAttribute("aria-hidden"), false);
  assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), true);
  button.click();
  assert.deepEqual(resetButtons, [button]);
});

test("dispose removes every button, listener, and mapping", (t) => {
  const { document } = installDom(t);
  const first = appendPair(document, "dispose-first");
  const second = appendPair(document, "dispose-second");
  const { controller, resetButtons, unbound } = controllerFixture();

  controller.scan(document);
  const firstButton = controller.buttonForAnchor(first.anchor);
  const secondButton = controller.buttonForAnchor(second.anchor);
  assert.ok(firstButton);
  assert.ok(secondButton);

  controller.dispose();

  assert.equal(controller.buttonForAnchor(first.anchor), undefined);
  assert.equal(controller.buttonForAnchor(second.anchor), undefined);
  assert.equal(controller.quizForButton(firstButton), undefined);
  assert.equal(controller.quizForButton(secondButton), undefined);
  assert.equal(controller.hasQuiz(first.quiz), false);
  assert.equal(controller.hasQuiz(second.quiz), false);
  assert.deepEqual(controller.buttonsForResetId("reset-dispose-first"), []);
  assert.deepEqual(controller.buttonsForResetId("reset-dispose-second"), []);
  assert.deepEqual(shadowButtons(first.anchor), []);
  assert.deepEqual(shadowButtons(second.anchor), []);
  for (const anchor of [first.anchor, second.anchor]) {
    assert.equal(anchor.hidden, true);
    assert.equal(anchor.getAttribute("aria-hidden"), "true");
    assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), false);
  }

  firstButton.click();
  secondButton.click();
  assert.deepEqual(resetButtons, []);
  assert.equal(unbound.length, 2);

  controller.dispose();
  assert.equal(unbound.length, 2);
});

test("rejects an anchor inside an Elm-managed quiz control", (t) => {
  const { document } = installDom(t);
  const { quiz, control } = createQuiz(document, "invalid");
  const anchor = createAnchor(document);
  control.append(anchor);
  document.body.append(quiz);
  const resetButtons = [];
  const controller = new ResetterHostController({
    findQuiz: (candidate) => candidate.closest(".lia-quiz") ?? undefined,
    resetId: () => "reset-invalid",
    onReset: (button) => resetButtons.push(button),
  });

  controller.scan(document);

  assert.equal(controller.buttonForAnchor(anchor), undefined);
  assert.equal(anchor.shadowRoot, null);
  assert.equal(anchor.classList.contains(RESETTER_HOST_CLASS), false);
  assert.equal(control.querySelector(`.${RESETTER_BUTTON_CLASS}`), null);
  assert.deepEqual(resetButtons, []);
});
