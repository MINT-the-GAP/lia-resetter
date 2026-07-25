import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

function reconstructionMacro() {
  const start = readme.indexOf("@ResetterRekonstruktion_\n");
  assert.notEqual(start, -1, "Das sichere Reconstruction-Makro fehlt.");
  const end = readme.indexOf("\n@end", start);
  assert.notEqual(end, -1, "Das sichere Reconstruction-Makro ist unvollständig.");
  return readme.slice(start, end);
}

test("keeps the reconstruction marker inert until its body anchor exists", () => {
  const macro = reconstructionMacro();
  const marker = macro.match(/<span id="rek-spec-@0"[^>]*>/)?.[0];

  assert.ok(marker, "Der Reconstruction-Spezifikationsmarker fehlt.");
  assert.match(marker, /\bdata-lia-resetter-spec="@1"/);
  assert.doesNotMatch(marker, /\bdata-spec=/);

  const appendAnchor = macro.indexOf("document.body.appendChild(anchor)");
  const activateMarker = macro.indexOf("node.dataset.spec = spec");
  const callSetup = macro.indexOf("window.__setupReconstructionQuiz('@0', spec)");

  assert.ok(appendAnchor >= 0, "Der externe BODY-Anker wird nicht angelegt.");
  assert.ok(
    appendAnchor < activateMarker && activateMarker < callSetup,
    "BODY-Anker, Bootstrap-Aktivierung und Setup stehen nicht in sicherer Reihenfolge.",
  );
});

test("rearms an identical reconstruction result before every check", () => {
  const macro = reconstructionMacro();
  const clearResult = macro.indexOf("console.clear()");
  const firstChecker = macro.indexOf("window.__checkReconstructionQuiz");

  assert.ok(clearResult >= 0, "Das vorherige LiaScript-Ergebnis wird nicht geleert.");
  assert.ok(
    clearResult < firstChecker,
    "Das LiaScript-Ergebnis muss vor dem Coordinate-Checker geleert werden.",
  );
});

test("exports both reconstruction aliases without a racing prelude import", () => {
  assert.match(
    readme,
    /@Rekonstruktion: @ResetterRekonstruktion_\(@uid,`@0`\)/,
  );
  assert.match(
    readme,
    /@Reconstruction: @ResetterRekonstruktion_\(@uid,`@0`\)/,
  );
  assert.doesNotMatch(readme, /^import:\s+\.\/coordinate-prelude\.md$/m);
});
