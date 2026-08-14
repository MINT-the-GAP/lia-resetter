import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const fixture = readFileSync(
  new URL("./fixtures/coordinate-reconstruction-imports.md", import.meta.url),
  "utf8",
);

const JSXGRAPH_IMPORT =
  "https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md";
const COORDINATE_IMPORT =
  "https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/main/README.md";
const RESETTER_IMPORT =
  "https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/main/README.md";
const EXPECTED_IMPORTS = [
  JSXGRAPH_IMPORT,
  COORDINATE_IMPORT,
  RESETTER_IMPORT,
];
const RESETTER_RECONSTRUCTION_MACROS = [
  "ResetterRekonstruktion",
  "ResetterReconstruction",
];

function mainHeader(source) {
  const match = /^\uFEFF?\s*<!--\r?\n([\s\S]*?)\r?\n-->/u.exec(source);
  assert.ok(match, "Der LiaScript-Hauptheader fehlt.");
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function macroBodies(source, name) {
  return Array.from(
    source.matchAll(
      new RegExp(
        `^@${escapeRegExp(name)}_\\r?\\n([\\s\\S]*?)^@end\\r?$`,
        "gm",
      ),
    ),
    (match) => match[1].replace(/\r\n/g, "\n"),
  );
}

function importsFrom(source) {
  return mainHeader(source)
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^import:\s+(\S+)\s*$/.exec(line);
      return match ? [match[1]] : [];
    });
}

function swapCoordinateAndResetterImports(source) {
  const lines = source.split(/\r?\n/);
  const coordinateLine = `import: ${COORDINATE_IMPORT}`;
  const resetterLine = `import: ${RESETTER_IMPORT}`;
  const coordinateIndex = lines.indexOf(coordinateLine);
  const resetterIndex = lines.indexOf(resetterLine);

  assert.ok(coordinateIndex >= 0, "Der direkte Coordinate-Import fehlt.");
  assert.ok(resetterIndex >= 0, "Der direkte Resetter-Import fehlt.");

  [lines[coordinateIndex], lines[resetterIndex]] = [
    lines[resetterIndex],
    lines[coordinateIndex],
  ];
  return lines.join("\n");
}

function relevantResetterMacroNames() {
  return new Set(
    mainHeader(readme)
      .split(/\r?\n/)
      .flatMap((line) => {
        const match =
          /^@(Rekonstruktion|Reconstruction|ResetterRekonstruktion|ResetterReconstruction):/.exec(
            line,
          );
        return match ? [match[1]] : [];
      }),
  );
}

function macroOwners(imports) {
  const macrosByImport = new Map([
    [COORDINATE_IMPORT, new Set(["Rekonstruktion", "Reconstruction"])],
    [RESETTER_IMPORT, relevantResetterMacroNames()],
  ]);
  const owners = new Map();

  for (const imported of imports) {
    for (const macro of macrosByImport.get(imported) ?? []) {
      owners.set(macro, imported);
    }
  }

  return owners;
}

function fixtureCalls(source, name) {
  const pattern = new RegExp(`^@${escapeRegExp(name)}\\(`);
  return source.split(/\r?\n/).filter((line) => pattern.test(line));
}

function boardIdFromCall(call, name) {
  const pattern = "^@" + escapeRegExp(name) + "\\(`([^;`]+);";
  const match = new RegExp(pattern).exec(call);
  assert.ok(match, `Die Board-ID von @${name} fehlt.`);
  return match[1];
}

function validateFixtureVariant(source, expectedTemplateOrder) {
  const imports = importsFrom(source);
  assert.equal(imports.length, EXPECTED_IMPORTS.length);
  assert.deepEqual([...imports].sort(), [...EXPECTED_IMPORTS].sort());
  assert.deepEqual(
    imports.filter((entry) => entry !== JSXGRAPH_IMPORT),
    expectedTemplateOrder,
  );

  const coordinateCalls = fixtureCalls(source, "Reconstruction");
  const resetterCalls = fixtureCalls(source, "ResetterReconstruction");
  assert.equal(coordinateCalls.length, 1);
  assert.equal(resetterCalls.length, 1);

  const coordinateBoard = boardIdFromCall(
    coordinateCalls[0],
    "Reconstruction",
  );
  const resetterBoard = boardIdFromCall(
    resetterCalls[0],
    "ResetterReconstruction",
  );
  assert.notEqual(coordinateBoard, resetterBoard);

  const declaredBoards = new Set(
    Array.from(
      source.matchAll(/^@CoordinateSystem\(\`[^\r\n]*\bid=([^;\`\r\n]+)/gm),
      (match) => match[1],
    ),
  );
  assert.equal(declaredBoards.size, 2);
  assert.ok(declaredBoards.has(coordinateBoard));
  assert.ok(declaredBoards.has(resetterBoard));

  const meaningfulLines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const coordinateCallIndex = meaningfulLines.indexOf(coordinateCalls[0]);
  const resetterCallIndex = meaningfulLines.indexOf(resetterCalls[0]);
  assert.notEqual(meaningfulLines[coordinateCallIndex + 1], "@resetter");
  assert.equal(meaningfulLines[resetterCallIndex + 1], "@resetter");
  assert.match(
    source,
    /^@ResetterReconstruction\([^\r\n]+\)[ \t]*\r?\n(?:[ \t]*\r?\n)*@resetter[ \t]*$/m,
  );

  const owners = macroOwners(imports);
  assert.equal(owners.get("Rekonstruktion"), COORDINATE_IMPORT);
  assert.equal(owners.get("Reconstruction"), COORDINATE_IMPORT);
  assert.equal(owners.get("ResetterRekonstruktion"), RESETTER_IMPORT);
  assert.equal(owners.get("ResetterReconstruction"), RESETTER_IMPORT);
}

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

test("exports only namespaced reconstruction aliases with identical implementations", () => {
  const headerLines = mainHeader(readme).split(/\r?\n/);
  const expectedTarget = "@ResetterRekonstruktion_(@uid,`@0`)";

  for (const name of RESETTER_RECONSTRUCTION_MACROS) {
    const expectedLine = `@${name}: ${expectedTarget}`;
    const headerDefinitions = headerLines.filter((line) =>
      line.startsWith(`@${name}:`),
    );
    const allDefinitions = readme
      .split(/\r?\n/)
      .filter((line) => line.startsWith(`@${name}:`));

    assert.deepEqual(headerDefinitions, [expectedLine]);
    assert.deepEqual(allDefinitions, [expectedLine, expectedLine]);
  }

  const targets = RESETTER_RECONSTRUCTION_MACROS.map((name) => {
    const line = headerLines.find((entry) => entry.startsWith(`@${name}:`));
    return line?.slice(line.indexOf(":") + 1).trim();
  });
  assert.deepEqual(targets, [expectedTarget, expectedTarget]);

  assert.doesNotMatch(readme, /^@(?:Rekonstruktion|Reconstruction):/m);

  const bodies = macroBodies(readme, "ResetterRekonstruktion");
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1], bodies[0]);

  assert.doesNotMatch(readme, /^import:\s+\.\/coordinate-prelude\.md$/m);
});

test("keeps Coordinate and Resetter reconstruction ownership import-order independent", () => {
  const swappedFixture = swapCoordinateAndResetterImports(fixture);
  assert.notEqual(swappedFixture, fixture);

  validateFixtureVariant(fixture, [COORDINATE_IMPORT, RESETTER_IMPORT]);
  validateFixtureVariant(swappedFixture, [RESETTER_IMPORT, COORDINATE_IMPORT]);
});
