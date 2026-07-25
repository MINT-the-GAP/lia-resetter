import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const packageLock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../dist/index.js", import.meta.url), "utf8");

test("keeps every public release version at 1.0.0", () => {
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(packageLock.version, "1.0.0");
  assert.equal(packageLock.packages[""].version, "1.0.0");
  assert.match(readme, /^version: 1\.0\.0$/m);
  assert.match(source, /const VERSION = "1\.0\.0"/);
  assert.match(bundle, /\$var\$VERSION = "1\.0\.0"/);
});

test("publishes consistent MINT-the-GAP repository and import metadata", () => {
  assert.equal(packageJson.main, "dist/index.js");
  assert.equal(
    packageJson.repository.url,
    "git+https://github.com/MINT-the-GAP/lia-resetter.git",
  );
  assert.match(
    readme,
    /^repository: https:\/\/github\.com\/MINT-the-GAP\/lia-resetter$/m,
  );
  assert.match(
    readme,
    /MINT-the-GAP\/lia-resetter\/1\.0\.0\/README\.md/,
  );
  assert.match(readme, /MINT-the-GAP\/lia-resetter\/main\/README\.md/);
});

test("ships a self-contained bundle without a missing source map", () => {
  assert.doesNotMatch(bundle, /sourceMappingURL=/);
  assert.match(packageJson.scripts.build, /--no-source-maps/);
});
