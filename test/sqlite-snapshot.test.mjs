import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { snapshotSqlite } from "../lib/sqlite-snapshot.js";
import { parseNodeVersion } from "../lib/node-runtime.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function seed() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "purge-sqlite-"));
  const source = path.join(dir, "live.db");
  const db = new DatabaseSync(source);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE note (id INTEGER PRIMARY KEY, body TEXT)");
  db.prepare("INSERT INTO note (body) VALUES (?)").run("o'hara");
  return { dir, source, db };
}

function names(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare("SELECT body FROM note ORDER BY id").all().map((row) => row.body);
  } finally {
    db.close();
  }
}

test("snapshot copies a live WAL database without touching the source", async () => {
  const { dir, source, db } = seed();
  try {
    db.prepare("INSERT INTO note (body) VALUES (?)").run("beta");
    const dest = path.join(dir, "out", "copy.db");
    const snap = await snapshotSqlite(source, dest);
    const version = parseNodeVersion(process.versions.node);
    const method = version.major > 22 || (version.major === 22 && version.minor >= 16) ? "backup" : "vacuum-into";
    assert.equal(snap.ok, true);
    assert.equal(snap.method, method);
    if (method === "backup") assert.ok(snap.pages > 0);
    assert.deepEqual(names(dest), ["o'hara", "beta"]);
    db.prepare("INSERT INTO note (body) VALUES (?)").run("later");
    assert.deepEqual(names(dest), ["o'hara", "beta"], "snapshot is not a live alias");
    assert.deepEqual(names(source), ["o'hara", "beta", "later"]);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("VACUUM INTO fallback matches backup contents", async () => {
  const { dir, source, db } = seed();
  try {
    db.prepare("INSERT INTO note (body) VALUES (?)").run("wal-page");
    const dest = path.join(dir, "vacuum.db");
    const snap = await snapshotSqlite(source, dest, { method: "vacuum-into" });
    assert.equal(snap.method, "vacuum-into");
    assert.equal(snap.pages, undefined);
    assert.deepEqual(names(dest), ["o'hara", "wal-page"]);
    await assert.rejects(snapshotSqlite(source, dest), /already exists/);
    await assert.rejects(snapshotSqlite(source, source), /must differ/);
    await assert.rejects(snapshotSqlite(path.join(dir, "missing.db"), path.join(dir, "x.db")), /not found/);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("purge-community sqlite-snapshot writes a readable copy", () => {
  const { dir, source, db } = seed();
  try {
    db.close();
    const dest = path.join(dir, "cli.db");
    const result = spawnSync(process.execPath, ["bin/community.js", "sqlite-snapshot", source, dest], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.destination, dest);
    assert.deepEqual(names(dest), ["o'hara"]);
  } finally {
    try { db.close(); } catch { /* already closed */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
