import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  NODE_SQLITE_ERROR,
  assertSupportedRuntime,
  describeRuntime,
  fts5Available,
  nodeSatisfies,
  parseNodeVersion,
  probeSqlite,
} from "../lib/node-runtime.js";
import { nodeSupportsSqlite } from "../scripts/bootstrap-install.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("node:sqlite floor accepts 22.5 and newer, rejects 22.4 and 18", () => {
  assert.equal(NODE_SQLITE_ERROR, "requires Node >=22.5 (node:sqlite)");
  for (const version of ["22.5.0", "22.5", "v22.5.1", "22.16.0", "24.0.0", "26.11.1"]) {
    assert.equal(nodeSatisfies(version), true, version);
    assert.equal(nodeSupportsSqlite(version), true, version);
  }
  for (const version of ["22.4.9", "22.4", "18.20.8", "21.7.3", "0.0.0", "", "nope"]) {
    assert.equal(nodeSatisfies(version), false, version);
    assert.equal(nodeSupportsSqlite(version), false, version);
  }
  assert.deepEqual(parseNodeVersion("v22.5.0-rc.1"), { major: 22, minor: 5, patch: 0 });
});

test("assertSupportedRuntime prints the bin error and can be observed without exiting", () => {
  const lines = [];
  assert.equal(assertSupportedRuntime({ version: "22.4.9", exit: false, stderr: (line) => lines.push(line) }), false);
  assert.deepEqual(lines, [NODE_SQLITE_ERROR]);
  assert.equal(assertSupportedRuntime({ version: "22.5.0", exit: false }), true);
});

test("the runtime guard is the first import of both package bins", () => {
  for (const file of ["bin/community.js", "bin/dsh-purge.js"]) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    const imports = [...text.matchAll(/^import .+$/gm)].map((match) => match[0]);
    assert.match(imports[0], /runtime-guard\.mjs/, file);
  }
});

test("child process prints the exact requirement and exits 1", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { assertSupportedRuntime } from "./lib/node-runtime.js";
    assertSupportedRuntime({ version: "18.20.8" });
  `], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `${NODE_SQLITE_ERROR}\n`);
  assert.equal(result.stdout, "");
});

test("describeRuntime reports sqlite, FTS5, and backup on this process", () => {
  const report = describeRuntime();
  assert.equal(report.ok, true);
  assert.equal(report.node, process.versions.node);
  assert.equal(report.engines, ">=22.5");
  assert.equal(report.satisfies, true);
  assert.equal(report.sqlite, true);
  assert.equal(report.fts5, probeSqlite().fts5);
  const version = parseNodeVersion(process.versions.node);
  const backupExpected = version.major > 22 || (version.major === 22 && version.minor >= 16);
  assert.equal(report.backup, backupExpected);
  assert.equal(describeRuntime("22.4.9").ok, false);
  assert.equal(describeRuntime("22.4.9").sqlite, false);
});

test("REDTEAM_NO_FTS5 forces the store fallback and leaves the runtime probe honest", () => {
  const previous = process.env.REDTEAM_NO_FTS5;
  process.env.REDTEAM_NO_FTS5 = "1";
  try {
    assert.equal(fts5Available(), false);
    assert.equal(typeof probeSqlite().fts5, "boolean");
  } finally {
    if (previous === undefined) delete process.env.REDTEAM_NO_FTS5;
    else process.env.REDTEAM_NO_FTS5 = previous;
  }
});

test("purge-community runtime prints the capability report", () => {
  const result = spawnSync(process.execPath, ["bin/community.js", "runtime"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.sqlite, true);
  assert.equal(report.engines, ">=22.5");
});
