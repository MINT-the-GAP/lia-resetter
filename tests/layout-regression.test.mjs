import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const kachelCompat = readFileSync(
  new URL("../src/kachel-compat.ts", import.meta.url),
  "utf8",
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("uses one in-flow native control without fixed portal positioning", () => {
  assert.match(source, /document\.createElement\("input"\)/);
  assert.match(source, /button\.type = "button"/);
  assert.match(source, /control\.append\(button\)/);
  assert.match(source, /document\.addEventListener\("click", onClick, true\)/);
  assert.doesNotMatch(source, /function schedulePortalLayout/);
  assert.doesNotMatch(source, /position:\s*fixed/);
  assert.doesNotMatch(source, /addEventListener\("scroll"/);
  assert.doesNotMatch(source, /addEventListener\("resize"/);
});

test("binds reset anchors inside their nearest flex item", () => {
  assert.match(
    source,
    /anchor\.closest<HTMLElement>\("\.flex-child, \.dynFlexItem"\)/,
  );
  assert.match(source, /return lastQuizBefore\(anchor, flexChild\)/);
  assert.match(
    source,
    /section-\$\{locator\.sectionId\}-quiz-\$\{locator\.quizId\}/,
  );
  assert.match(source, /const locator = \{ scope, sectionId, quizId \} satisfies QuizLocator/);
  assert.match(source, /buttonToLocator\.set\(button, locator\)/);
  assert.match(source, /pendingResetById/);
  assert.match(source, /feedbackGeneration/);
});

test("validates a remounted quiz by section instead of a connected stale scope", () => {
  assert.match(source, /type QuizMountState/);
  assert.match(source, /function locateQuiz\(locator: QuizLocator\)/);
  assert.match(source, /sectionId !== locator\.sectionId/);
  assert.match(source, /kind: "absent"/);
  assert.match(source, /kind: "ambiguous"/);
  assert.doesNotMatch(
    source,
    /if \(locator\.scope\.isConnected\) \{\s*return nativeQuizzes\(locator\.scope\)/,
  );
  assert.match(source, /nativeQuizzes\(mount\.scope\)/);
});

test("keeps queued reset feedback busy until the newer operation starts", () => {
  assert.match(source, /function mayExpireFeedback/);
  assert.match(source, /!pendingResetById\.has\(resetId\)/);
  assert.equal((source.match(/mayExpireFeedback\(resetId, generation\)/g) ?? []).length, 2);
  assert.match(
    source,
    /setButtonBusy\(button, true\);\s*setButtonTitle\(button\);\s*setButtonState\(button, "Reset …"\);\s*const result = operationQueue/,
  );
});

test("accepts an absent Kachel DOM only after isolated core verification", () => {
  const isolatedCheck = source.indexOf(
    "if (!isIsolatedReset(before, after, quizId, before[quizId]))",
  );
  const absentCheck = source.indexOf('if (mount.kind === "absent")', isolatedCheck);
  assert.ok(isolatedCheck >= 0 && absentCheck > isolatedCheck);
  assert.match(source, /sameJson\(after\[quizId\], before\[quizId\]\)/);
  assert.match(source, /releaseKachelFreeze\(freezeContext, quiz, false\);\s*return;/);
});

test("keeps the stock-core flex demo free of Drop siblings", () => {
  const flexStart = readme.indexOf("## Kombitest");
  const flexEnd = readme.indexOf("## Kombitest: Auswahl-Quiz", flexStart);
  assert.ok(flexStart >= 0 && flexEnd > flexStart);

  const flexSection = readme.slice(flexStart, flexEnd);
  assert.equal((flexSection.match(/class="flex-child"/g) ?? []).length, 5);
  assert.equal((flexSection.match(/@resetter/g) ?? []).length, 5);
  assert.doesNotMatch(flexSection, /\[->\[/);
});

test("activates Kachel compatibility through the inline reset control", () => {
  assert.ok(
    kachelCompat.includes(
      'input.lia-resetter__button[type=\\"button\\"]',
    ),
  );
  assert.doesNotMatch(kachelCompat, /lia-resetter__placeholder/);
});
