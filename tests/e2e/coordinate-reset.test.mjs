import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chromium } from "playwright";

const LIASCRIPT_STABLE_URL =
  process.env.LIASCRIPT_STABLE_URL ?? "https://liascript.github.io/course/";
const COURSE_URL = "https://lia-resetter.invalid/coordinate-reset-e2e.md";
const TEMPLATE_URL = "https://lia-resetter.invalid/coordinate-reset-template.md";
const BUNDLE_URL = "https://lia-resetter.invalid/dist/index.js";
const BOARD_ID = "reset-coordinate-e2e";
const DGS_BOARD_ID = "reset-coordinate-dgs-e2e";

const COURSE = `<!--
author: lia-resetter Coordinate E2E
version: 1.0.0
language: de
import: ${TEMPLATE_URL}
import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/Proposal/README.md
-->

# Coordinate Reset E2E

@CoordinateSystem(\`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=${BOARD_ID}\`)

@AxisLabel(\`id=${BOARD_ID};xlabel=$x$;ylabel=$y$\`)

Ziehe den Punkt $A$ auf die Koordinaten $(2|3)$.

@CreatePoint(\`${BOARD_ID};A;2;3\`,\`<!-- data-solution-button="2" -->\`)

@resetter

## DGS Reset E2E

@CoordinateSystem(\`xmin=-1;xmax=6;ymin=-1;ymax=5;width=;id=${DGS_BOARD_ID}\`)

@Point(\`${DGS_BOARD_ID};M;0;0;#e63946;1\`)

@DGS(\`${DGS_BOARD_ID};tools=[200;510;920]\`)

Ziehe den Punkt $Q$ auf die Koordinaten $(1|1)$.

@CreatePoint(\`${DGS_BOARD_ID};Q;1;1\`,\`<!-- data-solution-button="2" -->\`)

@resetter
`;

const TEMPLATE = `<!--
author: lia-resetter Coordinate E2E
version: 1.0.0
language: de
script: ${BUNDLE_URL}

@resetter: <lia-resetter-host data-lia-resetter></lia-resetter-host>
-->

# Minimal Coordinate Resetter Template
`;

function boxesAlmostEqual(actual, expected, tolerance = 0.02) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance)
  );
}

async function mutateViewport(page, boardId, bbox) {
  await page.evaluate(
    ({ boardId, nextBox }) => {
      const board = window.__boards?.[boardId];
      if (!board) throw new Error("Coordinate-Board fehlt.");
      board.setBoundingBox(nextBox.slice(), false);
      board.__coordExportBBox = nextBox.slice();
      const store =
        window.__coord?.getBoardStateStore?.() ?? window.__coordBoardStates;
      const current = store?.[boardId] ?? {};
      store[boardId] = {
        ...current,
        bbox: nextBox.slice(),
        exportBBox: nextBox.slice(),
      };
      if (window.__coordBoardStates && window.__coordBoardStates !== store) {
        window.__coordBoardStates[boardId] = {
          ...window.__coordBoardStates[boardId],
          bbox: nextBox.slice(),
          exportBBox: nextBox.slice(),
        };
      }
      board.update?.();
    },
    { boardId, nextBox: bbox },
  );
  await page.waitForTimeout(250);
}

async function readMacroPoint(page, boardId) {
  return page.evaluate((targetBoardId) => {
    const board = window.__boards?.[targetBoardId];
    const point = window.__points?.[targetBoardId]?.M;
    if (!board || !point || point.board !== board) return null;
    return {
      x: point.X(),
      y: point.Y(),
      macroKey: String(point.__liaDgsMacroKey ?? ""),
      persistentId: String(point.__liaDgsPersistentId ?? ""),
    };
  }, boardId);
}

async function createLearnerDgsPoint(page, boardId) {
  const beforeIds = await page.evaluate(
    (targetBoardId) =>
      (window.__dgsConstructionStates?.[targetBoardId]?.records ?? [])
        .filter((record) => record.origin === "dgs")
        .map((record) => record.id),
    boardId,
  );

  const pointButton = page.locator(
    ".lia-dgs-top-menu .lia-dgs-point-button:visible",
  );
  await pointButton.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await pointButton.count(), 1);
  if ((await pointButton.getAttribute("aria-pressed")) !== "true") {
    await pointButton.focus();
    await page.keyboard.press("Enter");
  }
  assert.equal(await pointButton.getAttribute("aria-pressed"), "true");

  const clickAt = await page.evaluate((targetBoardId) => {
    const container = window.__boards?.[targetBoardId]?.containerObj;
    if (!(container instanceof HTMLElement)) {
      throw new Error("DGS-Boardcontainer fehlt.");
    }
    container.scrollIntoView({ block: "center" });
    const rect = container.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.68,
      y: rect.top + rect.height * 0.64,
    };
  }, boardId);
  await page.mouse.click(clickAt.x, clickAt.y);

  await page.waitForFunction(
    ({ targetBoardId, previousIds }) =>
      (window.__dgsConstructionStates?.[targetBoardId]?.records ?? []).some(
        (record) =>
          record.origin === "dgs" && !previousIds.includes(record.id),
      ),
    { targetBoardId: boardId, previousIds: beforeIds },
    { timeout: 15_000 },
  );

  return page.evaluate(
    ({ targetBoardId, previousIds }) =>
      window.__dgsConstructionStates[targetBoardId].records.find(
        (record) =>
          record.origin === "dgs" && !previousIds.includes(record.id),
      ).id,
    { targetBoardId: boardId, previousIds: beforeIds },
  );
}

async function clickResetAndWait(
  page,
  browserErrors,
  baseline,
  boardId = BOARD_ID,
) {
  const reset = page
    .locator("[data-lia-resetter]")
    .locator("input.lia-resetter__button");
  await reset.click();
  try {
    await page.waitForFunction(
      () => {
        const host = document.querySelector("[data-lia-resetter]");
        const button = host?.shadowRoot?.querySelector(
          "input.lia-resetter__button",
        );
        return (
          button instanceof HTMLInputElement &&
          button.value === "Zurückgesetzt" &&
          !button.disabled &&
          button.getAttribute("aria-busy") !== "true"
        );
      },
      undefined,
      { timeout: 15_000 },
    );
  } catch (error) {
    const status = await reset.evaluate((button) => ({
      value: button.value,
      title: button.title,
      disabled: button.disabled,
      busy: button.getAttribute("aria-busy"),
    }));
    const boardState = await page.evaluate((boardId) => {
      const board = window.__boards?.[boardId];
      const store =
        window.__coord?.getBoardStateStore?.() ?? window.__coordBoardStates;
      return {
        bbox: board?.getBoundingBox?.(),
        width: board?.containerObj?.offsetWidth,
        height: board?.containerObj?.offsetHeight,
        sizeMode: board?.__coordSizeMode,
        stored: store?.[boardId],
      };
    }, boardId);
    throw new Error(
      `Resetstatus: ${JSON.stringify(status)}; Ausgang: ${JSON.stringify(baseline)}; Board: ${JSON.stringify(boardState)}; Browserfehler: ${browserErrors.join(" | ")}`,
      { cause: error },
    );
  }
}

async function waitForResetReady(page) {
  await page.waitForFunction(
    () => {
      const button = document
        .querySelector("[data-lia-resetter]")
        ?.shadowRoot?.querySelector("input.lia-resetter__button");
      return (
        button instanceof HTMLInputElement &&
        !button.disabled &&
        button.getAttribute("aria-disabled") !== "true" &&
        button.value === "Reset"
      );
    },
    undefined,
    { timeout: 30_000 },
  );
}

test(
  "restores lia-coordinate macro and DGS state on every reset",
  { timeout: 180_000 },
  async () => {
    const bundle = await readFile(
      new URL("../../dist/index.js", import.meta.url),
      "utf8",
    );
    const browser = await chromium.launch({ channel: "chrome", headless: true });

    try {
      const context = await browser.newContext({ serviceWorkers: "block" });
      await context.route(COURSE_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/plain; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: COURSE,
        }),
      );
      await context.route(TEMPLATE_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/plain; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: TEMPLATE,
        }),
      );
      await context.route(BUNDLE_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: bundle,
        }),
      );

      const page = await context.newPage();
      const browserErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      page.on("pageerror", (error) => {
        browserErrors.push(error.stack ?? error.message);
      });
      const courseHref = `${LIASCRIPT_STABLE_URL}?${COURSE_URL}#1`;
      await page.goto(courseHref, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await page.waitForFunction(
        (boardId) =>
          window.Resetter?.ready === true &&
          window.__boards?.[boardId]?.containerObj?.isConnected === true,
        BOARD_ID,
        { timeout: 90_000 },
      );
      await page.waitForFunction(
        () =>
          document.querySelector("[data-lia-resetter]")?.shadowRoot?.querySelector(
            "input.lia-resetter__button",
          ) instanceof HTMLInputElement,
        undefined,
        { timeout: 30_000 },
      );
      await waitForResetReady(page);

      const baseline = await page.evaluate((boardId) =>
        window.__boards[boardId].getBoundingBox().slice(),
      BOARD_ID);

      for (const changed of [
        [-12, 10, 14, -9],
        [-25, 18, 22, -16],
      ]) {
        await mutateViewport(page, BOARD_ID, changed);
        const mutated = await page.evaluate((boardId) =>
          window.__boards[boardId].getBoundingBox().slice(),
        BOARD_ID);
        assert.equal(boxesAlmostEqual(mutated, baseline), false);

        await clickResetAndWait(page, browserErrors, baseline, BOARD_ID);
        const restored = await page.evaluate((boardId) =>
          window.__boards[boardId].getBoundingBox().slice(),
        BOARD_ID);
        assert.equal(
          boxesAlmostEqual(restored, baseline),
          true,
          `Viewport blieb verändert: ${JSON.stringify(restored)}`,
        );
      }

      await mutateViewport(page, BOARD_ID, [-30, 24, 32, -22]);

      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        (boardId) => {
          const board = window.__boards?.[boardId];
          const macroPoint = window.__points?.[boardId]?.M;
          return (
            board?.containerObj?.isConnected === true &&
            window.__dgsConstructionBoards?.[boardId] === board &&
            Object.hasOwn(window.__dgsConstructionStates ?? {}, boardId) &&
            macroPoint?.board === board &&
            String(macroPoint.__liaDgsMacroKey ?? "").startsWith(
              "macro:point:",
            )
          );
        },
        DGS_BOARD_ID,
        { timeout: 45_000 },
      );
      await page.evaluate(() => window.Resetter.mount());
      await page.waitForFunction(
        () =>
          document.querySelector("[data-lia-resetter]")?.shadowRoot?.querySelector(
            "input.lia-resetter__button",
          ) instanceof HTMLInputElement,
        undefined,
        { timeout: 30_000 },
      );
      await waitForResetReady(page);

      await page.evaluate((boardId) =>
        window.__persistDgsBoardState?.(boardId, false),
      DGS_BOARD_ID);
      const dgsBaseline = await page.evaluate((boardId) => ({
        bbox: window.__boards[boardId].getBoundingBox().slice(),
        recordIds: window.__dgsConstructionStates[boardId].records
          .map((record) => record.id)
          .sort(),
      }), DGS_BOARD_ID);
      const macroBaseline = await readMacroPoint(page, DGS_BOARD_ID);
      assert.ok(macroBaseline);
      assert.match(macroBaseline.macroKey, /^macro:point:/);
      assert.equal(macroBaseline.persistentId, macroBaseline.macroKey);

      const otherBoardBaseline = await page.evaluate((boardId) => {
        const store =
          window.__coord?.getBoardStateStore?.() ?? window.__coordBoardStates;
        return {
          bbox: window.__boards?.[boardId]?.getBoundingBox?.().slice(),
          storedBbox: store?.[boardId]?.bbox?.slice(),
          exportBBox: store?.[boardId]?.exportBBox?.slice(),
        };
      }, BOARD_ID);

      for (const [index, changed] of [
        [-16, 14, 18, -12],
        [-24, 20, 26, -18],
      ].entries()) {
        await mutateViewport(page, DGS_BOARD_ID, changed);
        await page.evaluate(
          ({ boardId, x, y, removeMacro }) => {
            const point = window.__points?.[boardId]?.M;
            if (!point) throw new Error("Makropunkt M fehlt.");
            if (removeMacro) {
              window.__boards[boardId].removeObject(point);
              delete window.__points[boardId].M;
              delete window.__pointStates[boardId].M;
            } else {
              point.moveTo([x, y], 0);
            }
            window.__boards[boardId].update?.();
            window.__persistDgsBoardState?.(boardId, true);
          },
          {
            boardId: DGS_BOARD_ID,
            x: 2 + index,
            y: 2 + index,
            removeMacro: index === 1,
          },
        );
        const learnerPointId = await createLearnerDgsPoint(page, DGS_BOARD_ID);

        await clickResetAndWait(
          page,
          browserErrors,
          dgsBaseline.bbox,
          DGS_BOARD_ID,
        );

        const restored = await page.evaluate(({ boardId, learnerId }) => ({
          bbox: window.__boards[boardId].getBoundingBox().slice(),
          recordIds: window.__dgsConstructionStates[boardId].records
            .map((record) => record.id)
            .sort(),
          learnerObjectExists: Object.values(
            window.__boards[boardId].objects ?? {},
          ).some(
            (object) => object?.__liaDgsPersistentId === learnerId,
          ),
        }), { boardId: DGS_BOARD_ID, learnerId: learnerPointId });
        assert.equal(boxesAlmostEqual(restored.bbox, dgsBaseline.bbox), true);
        assert.deepEqual(restored.recordIds, dgsBaseline.recordIds);
        assert.equal(restored.learnerObjectExists, false);

        const macroRestored = await readMacroPoint(page, DGS_BOARD_ID);
        assert.deepEqual(macroRestored, macroBaseline);

        const otherBoard = await page.evaluate((boardId) => {
          const store =
            window.__coord?.getBoardStateStore?.() ?? window.__coordBoardStates;
          return {
            bbox: window.__boards?.[boardId]?.getBoundingBox?.().slice(),
            storedBbox: store?.[boardId]?.bbox?.slice(),
            exportBBox: store?.[boardId]?.exportBBox?.slice(),
          };
        }, BOARD_ID);
        assert.deepEqual(otherBoard, otherBoardBaseline);
      }

      await context.close();
    } finally {
      await browser.close();
    }
  },
);
