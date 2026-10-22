// Audit log: append-only, survives bad input, rotates, and readAudit returns newest first.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { logAudit, readAudit, AUDIT_MAX_BYTES } from "../lib/audit.js";

test("audit appends, rotates and reads newest first", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "purge-audit-"));
  try {
    assert.deepEqual(readAudit({ home }), [], "empty when nothing logged");
    assert.equal(logAudit("apply", { applied: 75 }, home), true);
    assert.equal(logAudit("probe", { nonce: "purge-deadbeef" }, home), true);
    const rows = readAudit({ home });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].event, "probe", "newest first");
    assert.equal(rows[0].nonce, "purge-deadbeef");
    assert(rows[0].at && rows[0].pid);

    // 半行/坏行不会让读取崩
    const file = path.join(home, "dsh-purge-community", "audit.jsonl");
    fs.appendFileSync(file, '{"broken\n');
    assert.equal(readAudit({ home }).length, 2);

    // 超过上限会轮转，旧的进 .1
    fs.writeFileSync(file, "x".repeat(AUDIT_MAX_BYTES + 10));
    logAudit("revert", { reverted: 3 }, home);
    assert(fs.existsSync(file + ".1"), "rotated copy exists");
    assert.equal(readAudit({ home })[0].event, "revert");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("audit keeps the rotated generation visible and rotates more than once", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "purge-audit-keep-"));
  try {
    assert.equal(logAudit("apply", { applied: 1 }, home), true);
    assert.equal(logAudit("probe", { nonce: "purge-aaaaaaaa" }, home), true);
    const file = path.join(home, "dsh-purge-community", "audit.jsonl");
    const first = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, first + "x".repeat(AUDIT_MAX_BYTES));
    assert.equal(logAudit("revert", { reverted: 1 }, home), true);
    const rows = readAudit({ home, limit: 10 });
    assert.equal(rows[0].event, "revert");
    assert.ok(rows.some((row) => row.event === "probe" && row.nonce === "purge-aaaaaaaa"));
    assert.ok(rows.some((row) => row.event === "apply"));

    fs.writeFileSync(file, "y".repeat(AUDIT_MAX_BYTES + 10));
    assert.equal(logAudit("boost", { enabled: false }, home), true);
    fs.writeFileSync(file, "z".repeat(AUDIT_MAX_BYTES + 10));
    assert.equal(logAudit("preset", { action: "install" }, home), true);
    assert.equal(fs.existsSync(file + ".1"), true);
    assert.equal(fs.existsSync(file + ".2"), true);
    assert.equal(fs.existsSync(file + ".3"), false);
    assert.equal(readAudit({ home })[0].event, "preset");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
