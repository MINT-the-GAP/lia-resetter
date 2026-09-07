import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chromium } from "playwright";

const LIASCRIPT_STABLE_URL =
  process.env.LIASCRIPT_STABLE_URL ?? "https://liascript.github.io/course/";
const JSXGRAPH_README_URL =
  "https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md";
const RESETTER_README_URL =
  "https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/main/README.md";
const RESETTER_BUNDLE_URL =
  "https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/main/dist/index.js";
const FALLBACK_BUNDLE_URL = "https://lia-resetter.invalid/dist/index.js";
const COORDINATE_README_URL =
  "https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/main/README.md";

const COORDINATE_BOARD_ID = "coordinate_reconstruction";
const RESETTER_BOARD_ID = "resetter_reconstruction";
const RESETTER_BUTTON_SELECTOR = "input.lia-resetter__button";

function directTemplate(source, title) {
  const match = /^<!--\r?\n([\s\S]*?)\r?\n-->/u.exec(source);
  assert.ok(match, `The ${title} main header is missing.`);
  const directHeader = match[1]
    .split(/\r?\n/)
    .filter((line) => !/^import:\s+/.test(line))
    .join("\n");
  return `<!--\n${directHeader}\n-->\n\n# ${title} integration template\n`;
}

function swapCoordinateAndResetterImports(source) {
  const coordinateImport = `import: ${COORDINATE_README_URL}`;
  const resetterImport = `import: ${RESETTER_README_URL}`;
  const lines = source.split(/\r?\n/);
  const coordinateIndexes = lines.flatMap((line, index) =>
    line === coordinateImport ? [index] : [],
  );
  const resetterIndexes = lines.flatMap((line, index) =>
    line === resetterImport ? [index] : [],
  );

  assert.deepEqual(coordinateIndexes.length, 1);
  assert.deepEqual(resetterIndexes.length, 1);
  const coordinateIndex = coordinateIndexes[0];
  const resetterIndex = resetterIndexes[0];
  [lines[coordinateIndex], lines[resetterIndex]] = [
    lines[resetterIndex],
    lines[coordinateIndex],
  ];
  return lines.join("\n");
}

function diagnostics(label, error, browserErrors, requestFailures) {
  const reason = error instanceof Error ? error.stack ?? error.message : String(error);
  const errors = browserErrors.length > 0 ? browserErrors.join("\n") : "(none)";
  const requests =
    requestFailures.length > 0 ? requestFailures.join("\n") : "(none)";
  return new Error(
    `${label} failed:\n${reason}\n\nBrowser errors:\n${errors}\n\nFailed requests:\n${requests}`,
    { cause: error },
  );
}

async function captureCourseState(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getClientRects().length > 0
      );
    };

    return {
      href: window.location.href,
      visibleHeadings: Array.from(
        document.querySelectorAll("h1, h2, h3"),
      )
        .filter(isVisible)
        .map((element) => element.textContent?.trim() ?? ""),
      visibleText: Array.from(document.querySelectorAll("main, section"))
        .filter(isVisible)
        .map((element) => element.innerText)
        .join("\n")
        .slice(0, 2_000),
      globals: {
        jsxGraph: typeof window.JXG === "object",
        coordinate: typeof window.__coord === "object",
        resetter: window.Resetter?.ready === true,
        reconstructionSetup:
          typeof window.__setupReconstructionQuiz === "function",
      },
      connectedBoards: Object.entries(window.__boards ?? {})
        .filter(([, board]) => board?.containerObj?.isConnected === true)
        .map(([id]) => id),
      reconstructionMarkers: Array.from(
        document.querySelectorAll("[id^='rek-spec-']"),
      ).map((element) => ({
        id: element.id,
        connected: element.isConnected,
        spec: element.getAttribute("data-spec"),
        resetterSpec: element.getAttribute("data-lia-resetter-spec"),
      })),
      resetterHosts: document.querySelectorAll("[data-lia-resetter]").length,
    };
  });
}

async function waitForTemplates(page) {
  await page.waitForFunction(
    () =>
      typeof window.JXG === "object" &&
      typeof window.__coord === "object" &&
      window.Resetter?.ready === true,
    undefined,
    { timeout: 90_000 },
  );
}

async function navigateToSection(page, expectedHeading) {
  await page.waitForFunction(
    () => document.querySelector("h1, h2, h3") instanceof HTMLElement,
    undefined,
    { timeout: 30_000 },
  );

  for (let attempt = 0; attempt <= 3; attempt += 1) {
    const state = await captureCourseState(page);
    if (state.visibleHeadings.includes(expectedHeading)) return;
    if (attempt === 3) {
      throw new Error(
        `Section "${expectedHeading}" was not reached: ${JSON.stringify(state)}`,
      );
    }

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
  }
}

async function verifyCoordinateSection(page) {
  const specPrefix = `${COORDINATE_BOARD_ID};`;
  await page.waitForFunction(
    ({ boardId, expectedSpec }) => {
      const marker = Array.from(
        document.querySelectorAll("span[id^='rek-spec-'][data-spec]"),
      ).find((element) =>
        String(element.getAttribute("data-spec") ?? "").startsWith(expectedSpec),
      );
      if (!(marker instanceof HTMLElement)) return false;
      const uid = marker.id.slice("rek-spec-".length);
      const anchor = document.getElementById(`rek-check-${uid}`);
      return (
        window.Resetter?.ready === true &&
        window.__boards?.[boardId]?.containerObj?.isConnected === true &&
        anchor instanceof HTMLElement &&
        anchor.isConnected &&
        anchor.matches(
          "[data-lia-coordinate-quiz-anchor][data-lia-coordinate-quiz-kind='reconstruction']",
        )
      );
    },
    { boardId: COORDINATE_BOARD_ID, expectedSpec: specPrefix },
    { timeout: 45_000 },
  );

  const snapshot = await page.evaluate(
    ({ boardId, expectedSpec }) => {
      const marker = Array.from(
        document.querySelectorAll("span[id^='rek-spec-'][data-spec]"),
      ).find((element) =>
        String(element.getAttribute("data-spec") ?? "").startsWith(expectedSpec),
      );
      if (!(marker instanceof HTMLElement)) {
        throw new Error("Coordinate reconstruction marker is missing.");
      }
      const uid = marker.id.slice("rek-spec-".length);
      const anchor = document.getElementById(`rek-check-${uid}`);
      if (!(anchor instanceof HTMLElement)) {
        throw new Error("Coordinate reconstruction quiz anchor is missing.");
      }
      const scope = anchor.closest("main.lia-slide__content") ?? document;
      const resetterMarkers = Array.from(
        scope.querySelectorAll("[data-lia-resetter-spec]"),
      ).filter((element) =>
        String(element.getAttribute("data-lia-resetter-spec") ?? "").startsWith(
          expectedSpec,
        ),
      );

      return {
        boardConnected:
          window.__boards?.[boardId]?.containerObj?.isConnected === true,
        markerConnected: marker.isConnected,
        markerHasResetterSpec: marker.hasAttribute("data-lia-resetter-spec"),
        anchorConnected: anchor.isConnected,
        anchorKind: anchor.dataset.liaCoordinateQuizKind,
        markerOwnedByResetterHost: Boolean(marker.closest("[data-lia-resetter]")),
        anchorOwnedByResetterHost: Boolean(anchor.closest("[data-lia-resetter]")),
        resetterMarkersForBoard: resetterMarkers.length,
        resetterHostsOnSlide: scope.querySelectorAll("[data-lia-resetter]").length,
      };
    },
    { boardId: COORDINATE_BOARD_ID, expectedSpec: specPrefix },
  );

  assert.deepEqual(snapshot, {
    boardConnected: true,
    markerConnected: true,
    markerHasResetterSpec: false,
    anchorConnected: true,
    anchorKind: "reconstruction",
    markerOwnedByResetterHost: false,
    anchorOwnedByResetterHost: false,
    resetterMarkersForBoard: 0,
    resetterHostsOnSlide: 0,
  });
}

async function verifyResettableSection(page) {
  const specPrefix = `${RESETTER_BOARD_ID};`;
  await page.waitForFunction(
    ({ boardId, expectedSpec, buttonSelector }) => {
      const marker = Array.from(
        document.querySelectorAll("[data-lia-resetter-spec]"),
      ).find((element) =>
        String(element.getAttribute("data-lia-resetter-spec") ?? "").startsWith(
          expectedSpec,
        ),
      );
      if (!(marker instanceof HTMLElement) || !marker.id.startsWith("rek-spec-")) {
        return false;
      }
      const uid = marker.id.slice("rek-spec-".length);
      const owner = document.getElementById(`rek-check-${uid}`);
      const scope = owner?.closest("main.lia-slide__content") ?? document;
      const host = scope.querySelector("[data-lia-resetter]");
      const button = host?.shadowRoot?.querySelector(buttonSelector);
      return (
        window.Resetter?.ready === true &&
        window.__boards?.[boardId]?.containerObj?.isConnected === true &&
        owner instanceof HTMLElement &&
        owner.isConnected &&
        host instanceof HTMLElement &&
        host.isConnected &&
        button instanceof HTMLInputElement &&
        !button.disabled &&
        button.getAttribute("aria-disabled") !== "true" &&
        button.getAttribute("aria-busy") !== "true"
      );
    },
    {
      boardId: RESETTER_BOARD_ID,
      expectedSpec: specPrefix,
      buttonSelector: RESETTER_BUTTON_SELECTOR,
    },
    { timeout: 45_000 },
  );

  const snapshot = await page.evaluate(
    ({ coordinateBoardId, boardId, expectedSpec, buttonSelector }) => {
      const marker = Array.from(
        document.querySelectorAll("[data-lia-resetter-spec]"),
      ).find((element) =>
        String(element.getAttribute("data-lia-resetter-spec") ?? "").startsWith(
          expectedSpec,
        ),
      );
      if (!(marker instanceof HTMLElement) || !marker.id.startsWith("rek-spec-")) {
        throw new Error("Resetter reconstruction marker is missing.");
      }
      const uid = marker.id.slice("rek-spec-".length);
      const owner = document.getElementById(`rek-check-${uid}`);
      const scope = owner?.closest("main.lia-slide__content") ?? document;
      const hosts = Array.from(scope.querySelectorAll("[data-lia-resetter]"));
      const host = hosts[0];
      const button = host?.shadowRoot?.querySelector(buttonSelector);

      return {
        boardConnected:
          window.__boards?.[boardId]?.containerObj?.isConnected === true,
        boardsAreDistinct:
          window.__boards?.[coordinateBoardId] !== window.__boards?.[boardId],
        markerConnected: marker.isConnected,
        markerSpec: marker.getAttribute("data-lia-resetter-spec"),
        ownerConnected: owner?.isConnected === true,
        ownerContainsGenericQuiz: Boolean(owner?.querySelector(".lia-quiz-generic")),
        hostCount: hosts.length,
        hostIsSidecar: Boolean(
          host && !host.closest(".lia-quiz") && !host.closest(".lia-quiz__control"),
        ),
        buttonOwnedByHost: Boolean(
          button && button.getRootNode() === host?.shadowRoot,
        ),
        buttonReady: Boolean(
          button instanceof HTMLInputElement &&
            !button.disabled &&
            button.getAttribute("aria-disabled") !== "true" &&
            button.getAttribute("aria-busy") !== "true",
        ),
      };
    },
    {
      coordinateBoardId: COORDINATE_BOARD_ID,
      boardId: RESETTER_BOARD_ID,
      expectedSpec: specPrefix,
      buttonSelector: RESETTER_BUTTON_SELECTOR,
    },
  );

  assert.equal(snapshot.boardConnected, true);
  assert.equal(snapshot.boardsAreDistinct, true);
  assert.equal(snapshot.markerConnected, true);
  assert.ok(snapshot.markerSpec?.startsWith(specPrefix));
  assert.equal(snapshot.ownerConnected, true);
  assert.equal(snapshot.ownerContainsGenericQuiz, true);
  assert.equal(snapshot.hostCount, 1);
  assert.equal(snapshot.hostIsSidecar, true);
  assert.equal(snapshot.buttonOwnedByHost, true);
  assert.equal(snapshot.buttonReady, true);
}

async function resetAndObserveCompletion(page) {
  const result = await page.evaluate(
    ({ boardId, expectedSpec, buttonSelector, timeoutMs }) => {
      const marker = Array.from(
        document.querySelectorAll("[data-lia-resetter-spec]"),
      ).find((element) =>
        String(element.getAttribute("data-lia-resetter-spec") ?? "").startsWith(
          expectedSpec,
        ),
      );
      const scope = marker?.closest("main.lia-slide__content") ?? document;
      const host = scope.querySelector("[data-lia-resetter]");
      const button = host?.shadowRoot?.querySelector(buttonSelector);
      if (!(button instanceof HTMLInputElement)) {
        throw new Error("Ready Resetter button is missing.");
      }

      const initialValue = button.value;
      const observedValues = [initialValue];

      return new Promise((resolve, reject) => {
        let sawBusy = false;
        let sawValueChange = false;
        let finished = false;
        let observer;
        let poll;
        let timer;

        const cleanup = () => {
          observer?.disconnect();
          window.clearInterval(poll);
          window.clearTimeout(timer);
        };
        const sample = () => {
          if (finished) return;
          if (
            button.disabled ||
            button.getAttribute("aria-busy") === "true"
          ) {
            sawBusy = true;
          }
          if (button.value !== observedValues.at(-1)) {
            observedValues.push(button.value);
          }
          if (button.value !== initialValue) sawValueChange = true;

          const settled =
            sawBusy &&
            sawValueChange &&
            !button.disabled &&
            button.getAttribute("aria-busy") !== "true" &&
            Boolean(button.dataset.state);
          if (!settled) return;

          finished = true;
          cleanup();
          resolve({
            sawBusy,
            sawValueChange,
            initialValue,
            finalValue: button.value,
            finalState: button.dataset.state ?? "",
            observedValues,
            boardConnected:
              window.__boards?.[boardId]?.containerObj?.isConnected === true,
          });
        };

        observer = new MutationObserver((records) => {
          if (
            records.some(
              (record) =>
                record.attributeName === "aria-busy" ||
                record.attributeName === "disabled",
            )
          ) {
            sawBusy = true;
          }
          sample();
        });
        observer.observe(button, { attributes: true });
        poll = window.setInterval(sample, 10);
        timer = window.setTimeout(() => {
          if (finished) return;
          finished = true;
          cleanup();
          reject(
            new Error(
              `Reset did not settle: ${JSON.stringify({
                sawBusy,
                sawValueChange,
                value: button.value,
                state: button.dataset.state ?? "",
                busy: button.getAttribute("aria-busy"),
                disabled: button.disabled,
                observedValues,
              })}`,
            ),
          );
        }, timeoutMs);

        button.click();
        sample();
      });
    },
    {
      boardId: RESETTER_BOARD_ID,
      expectedSpec: `${RESETTER_BOARD_ID};`,
      buttonSelector: RESETTER_BUTTON_SELECTOR,
      timeoutMs: 15_000,
    },
  );

  assert.equal(result.sawBusy, true);
  assert.equal(result.sawValueChange, true);
  assert.notEqual(result.finalValue, result.initialValue);
  assert.equal(result.finalState, "success");
  assert.equal(result.boardConnected, true);
}

async function exerciseVariant(
  browser,
  variant,
  jsxGraphTemplate,
  coordinateTemplate,
  resetterTemplate,
  bundle,
) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const browserErrors = [];
  const requestFailures = [];
  const courseUrl = `https://lia-resetter.invalid/reconstruction-${variant.slug}.md`;
  let page;

  try {
    await context.route(courseUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "access-control-allow-origin": "*" },
        body: variant.course,
      }),
    );
    await context.route(RESETTER_README_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "access-control-allow-origin": "*" },
        body: resetterTemplate,
      }),
    );
    await context.route(COORDINATE_README_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "access-control-allow-origin": "*" },
        body: coordinateTemplate,
      }),
    );
    await context.route(JSXGRAPH_README_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        headers: { "access-control-allow-origin": "*" },
        body: jsxGraphTemplate,
      }),
    );
    for (const bundleUrl of [RESETTER_BUNDLE_URL, FALLBACK_BUNDLE_URL]) {
      await context.route(bundleUrl, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: bundle,
        }),
      );
    }

    page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(`console: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      browserErrors.push(`pageerror: ${error.stack ?? error.message}`);
    });
    page.on("requestfailed", (request) => {
      requestFailures.push(
        `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`,
      );
    });
    page.on("response", (response) => {
      if (!response.ok()) {
        requestFailures.push(
          `${response.request().method()} ${response.url()}: HTTP ${response.status()}`,
        );
      }
    });

    await page.goto(`${LIASCRIPT_STABLE_URL}?${courseUrl}#1`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await waitForTemplates(page);
    await navigateToSection(page, "Coordinate reconstruction");
    await verifyCoordinateSection(page);
    await navigateToSection(page, "Resettable reconstruction");
    await verifyResettableSection(page);
    await resetAndObserveCompletion(page);

    await page.waitForFunction(
      (boardId) =>
        window.__boards?.[boardId]?.containerObj?.isConnected === true,
      RESETTER_BOARD_ID,
      { timeout: 15_000 },
    );
  } catch (error) {
    if (page) {
      try {
        browserErrors.push(
          `course-state: ${JSON.stringify(await captureCourseState(page))}`,
        );
      } catch (stateError) {
        browserErrors.push(
          `course-state unavailable: ${
            stateError instanceof Error ? stateError.message : String(stateError)
          }`,
        );
      }
    }
    throw diagnostics(
      variant.label,
      error,
      browserErrors,
      requestFailures,
    );
  } finally {
    await context.close();
  }
}

test(
  "keeps Coordinate and Resetter reconstruction macros independent in both import orders",
  { timeout: 360_000 },
  async () => {
    const [
      fixture,
      resetterReadme,
      bundle,
      coordinateReadme,
      jsxGraphReadme,
    ] = await Promise.all([
      readFile(
        new URL("../fixtures/coordinate-reconstruction-imports.md", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../README.md", import.meta.url), "utf8"),
      readFile(new URL("../../dist/index.js", import.meta.url), "utf8"),
      fetch(COORDINATE_README_URL).then(async (response) => {
        assert.equal(
          response.ok,
          true,
          `Coordinate README request failed with HTTP ${response.status}.`,
        );
        return response.text();
      }),
      fetch(JSXGRAPH_README_URL).then(async (response) => {
        assert.equal(
          response.ok,
          true,
          `JSXGraph README request failed with HTTP ${response.status}.`,
        );
        return response.text();
      }),
    ]);
    const resetterTemplate = directTemplate(resetterReadme, "Resetter");
    const coordinateTemplate = directTemplate(coordinateReadme, "Coordinate");
    const jsxGraphTemplate = directTemplate(jsxGraphReadme, "JSXGraph");
    const variants = [
      {
        label: "Coordinate import before Resetter import",
        slug: "coordinate-before-resetter",
        course: fixture,
      },
      {
        label: "Resetter import before Coordinate import",
        slug: "resetter-before-coordinate",
        course: swapCoordinateAndResetterImports(fixture),
      },
    ];
    const browser = await chromium.launch({ channel: "chrome", headless: true });

    try {
      for (const variant of variants) {
        await exerciseVariant(
          browser,
          variant,
          jsxGraphTemplate,
          coordinateTemplate,
          resetterTemplate,
          bundle,
        );
      }
    } finally {
      await browser.close();
    }
  },
);
