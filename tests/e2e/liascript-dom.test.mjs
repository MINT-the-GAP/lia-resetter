import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chromium } from "playwright";

const LIASCRIPT_STABLE_URL =
  process.env.LIASCRIPT_STABLE_URL ?? "https://liascript.github.io/course/";
const COURSE_URL = "https://lia-resetter.invalid/ownership-e2e.md";
const TEMPLATE_URL = "https://lia-resetter.invalid/resetter-template.md";
const BUNDLE_URL = "https://lia-resetter.invalid/dist/index.js";

const COURSE = `<!--
author: lia-resetter E2E
version: 1.0.0
language: de
import: ${TEMPLATE_URL}
-->

# Resetter Ownership E2E

<label for="lia-resetter-e2e-answer">Antwort</label>
<input id="lia-resetter-e2e-answer" type="text" autocomplete="off">

[[!]]
<script>
document.querySelector("#lia-resetter-e2e-answer")?.value.trim() === "4"
</script>

@resetter

## Zwischenfolie

Diese Folie erzwingt Unmount und Remount des Quiz.
`;

const TEMPLATE = `<!--
author: lia-resetter E2E
version: 1.0.0
language: de
script: ${BUNDLE_URL}

@resetter: <lia-resetter-host data-lia-resetter></lia-resetter-host>
-->

# Minimal Resetter Template
`;

async function waitForCorrectFeedback(page, timeout = 5_000) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll(".lia-quiz-generic")).some((quiz) =>
        /richtige Antwort/i.test(quiz.textContent ?? ""),
      ),
    undefined,
    { timeout },
  );
}

async function ownershipSnapshot(page) {
  return page.locator("[data-lia-resetter]").evaluateAll((hosts) =>
    hosts.map((host) => {
      const root = host.shadowRoot;
      const buttons = root
        ? Array.from(root.querySelectorAll("input.lia-resetter__button"))
        : [];
      return {
        inQuiz: Boolean(host.closest(".lia-quiz")),
        inControl: Boolean(host.closest(".lia-quiz__control")),
        lightChildren: host.childElementCount,
        shadowButtons: buttons.length,
        buttonOwnedByHost: buttons.every(
          (button) => button.getRootNode() === root && root?.host === host,
        ),
      };
    }),
  );
}

test(
  "keeps the Resetter outside Elm-owned quiz controls in Stable LiaScript",
  { timeout: 120_000 },
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
      const pageErrors = [];
      const runtimeExceptions = [];
      let mainFrameNavigations = 0;
      page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) mainFrameNavigations += 1;
      });

      const cdp = await context.newCDPSession(page);
      await cdp.send("Runtime.enable");
      cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
        runtimeExceptions.push(
          exceptionDetails.exception?.description ?? exceptionDetails.text,
        );
      });

      const courseHref = `${LIASCRIPT_STABLE_URL}?${COURSE_URL}#1`;
      await page.goto(courseHref, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await page.waitForFunction(() => window.Resetter?.ready === true, undefined, {
        timeout: 60_000,
      });
      await page.waitForSelector(".lia-quiz-generic .lia-quiz__check", {
        state: "visible",
        timeout: 60_000,
      });
      await page.waitForFunction(
        () =>
          document.querySelector("[data-lia-resetter]")?.shadowRoot?.querySelector(
            "input.lia-resetter__button",
          ) instanceof HTMLInputElement,
        undefined,
        { timeout: 30_000 },
      );

      await page.evaluate(() => {
        window.Resetter.mount();
        window.Resetter.mount();
        window.Resetter.mount();
      });
      assert.deepEqual(await ownershipSnapshot(page), [
        {
          inQuiz: false,
          inControl: false,
          lightChildren: 0,
          shadowButtons: 1,
          buttonOwnedByHost: true,
        },
      ]);

      const answer = page.locator("#lia-resetter-e2e-answer");
      const check = page.locator(".lia-quiz-generic .lia-quiz__check");
      const reset = page
        .locator("[data-lia-resetter]")
        .locator("input.lia-resetter__button");
      const navigationsBeforeChecking = mainFrameNavigations;

      await answer.fill("4");
      const firstCheckStarted = Date.now();
      await check.click();
      await waitForCorrectFeedback(page);
      assert.ok(
        Date.now() - firstCheckStarted < 5_000,
        "Die erste Rückmeldung erschien nicht unmittelbar.",
      );
      assert.equal(mainFrameNavigations, navigationsBeforeChecking);

      await answer.fill("");
      await reset.click();
      await page.waitForFunction(
        () => {
          const quiz = document.querySelector(".lia-quiz-generic");
          const checkButton = quiz?.querySelector(".lia-quiz__check");
          const host = document.querySelector("[data-lia-resetter]");
          const resetButton = host?.shadowRoot?.querySelector(
            "input.lia-resetter__button",
          );
          return (
            quiz instanceof HTMLElement &&
            !quiz.classList.contains("solved") &&
            !quiz.classList.contains("resolved") &&
            checkButton instanceof HTMLElement &&
            checkButton.getAttribute("aria-hidden") !== "true" &&
            getComputedStyle(checkButton).display !== "none" &&
            resetButton instanceof HTMLInputElement &&
            !resetButton.disabled &&
            resetButton.getAttribute("aria-busy") !== "true" &&
            !/richtige Antwort/i.test(quiz.textContent ?? "")
          );
        },
        undefined,
        { timeout: 10_000 },
      );

      await answer.fill("4");
      const secondCheckStarted = Date.now();
      await check.click();
      await waitForCorrectFeedback(page);
      assert.ok(
        Date.now() - secondCheckStarted < 5_000,
        "Die Rückmeldung nach dem Reset erschien nicht unmittelbar.",
      );
      assert.equal(mainFrameNavigations, navigationsBeforeChecking);

      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
      await page.keyboard.press("ArrowRight");
      await page.waitForSelector("[data-lia-resetter]", {
        state: "detached",
        timeout: 10_000,
      });
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(
        () => {
          const hosts = Array.from(
            document.querySelectorAll("[data-lia-resetter]"),
          );
          return (
            hosts.length === 1 &&
            hosts[0].shadowRoot?.querySelectorAll(
              "input.lia-resetter__button",
            ).length === 1
          );
        },
        undefined,
        { timeout: 15_000 },
      );
      assert.deepEqual(await ownershipSnapshot(page), [
        {
          inQuiz: false,
          inControl: false,
          lightChildren: 0,
          shadowButtons: 1,
          buttonOwnedByHost: true,
        },
      ]);

      await page.waitForTimeout(500);
      assert.deepEqual(pageErrors, [], pageErrors.join("\n\n"));
      assert.deepEqual(
        runtimeExceptions,
        [],
        runtimeExceptions.join("\n\n"),
      );
      assert.ok(
        ![...pageErrors, ...runtimeExceptions].some((message) =>
          message.includes("created_by_elm"),
        ),
      );

      await cdp.detach();
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
