// Node floor for this package. `node:sqlite` shipped in 22.5.0; older
// binaries fail later with ERR_UNKNOWN_BUILTIN_MODULE, which hides the cause.
import fs from "node:fs";

export const NODE_SQLITE_ERROR = "requires Node >=22.5 (node:sqlite)";
export const MIN_NODE = Object.freeze({ major: 22, minor: 5, patch: 0 });

export function parseNodeVersion(version = process.versions.node) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(version ?? "").trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] || 0),
    patch: Number(match[3] || 0),
  };
}

export function nodeSatisfies(version = process.versions.node, min = MIN_NODE) {
  const parsed = typeof version === "object" && version ? version : parseNodeVersion(version);
  if (!parsed) return false;
  if (parsed.major !== min.major) return parsed.major > min.major;
  if (parsed.minor !== min.minor) return parsed.minor > min.minor;
  return parsed.patch >= min.patch;
}

/**
 * Print the requirement and stop. Used as the first import of every bin so
 * the message appears before other modules (including `node:sqlite`) load.
 * Pass `{ exit: false }` from tests.
 */
export function assertSupportedRuntime(options = {}) {
  const version = options.version ?? process.versions.node;
  if (nodeSatisfies(version, options.min)) return true;
  const message = options.message ?? NODE_SQLITE_ERROR;
  if (typeof options.stderr === "function") options.stderr(message);
  else fs.writeSync(2, `${message}\n`);
  if (options.exit === false) return false;
  process.exit(options.exitCode ?? 1);
}

let sqliteProbe;

/** Actual `node:sqlite` capability of this process. Does not honor REDTEAM_NO_FTS5. */
export function probeSqlite() {
  if (sqliteProbe) return sqliteProbe;
  const result = { sqlite: false, fts5: false, backup: false, error: "" };
  try {
    const sqlite = process.getBuiltinModule("node:sqlite");
    if (typeof sqlite?.DatabaseSync !== "function") {
      result.error = "node:sqlite DatabaseSync missing";
    } else {
      result.sqlite = true;
      result.backup = typeof sqlite.backup === "function";
      const db = new sqlite.DatabaseSync(":memory:");
      try {
        db.exec("CREATE VIRTUAL TABLE __fts5_probe USING fts5(x)");
        result.fts5 = true;
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (!/no such module:\s*fts5/i.test(message)) result.error = message;
      } finally {
        db.close();
      }
    }
  } catch (error) {
    result.error = error && error.message ? error.message : String(error);
  }
  sqliteProbe = result;
  return result;
}

/** Effective FTS5 switch used by the drill store. `REDTEAM_NO_FTS5=1` forces LIKE search. */
export function fts5Available() {
  if (process.env.REDTEAM_NO_FTS5 === "1") return false;
  return probeSqlite().fts5;
}

export function describeRuntime(version = process.versions.node) {
  const satisfies = nodeSatisfies(version);
  const sqlite = satisfies ? probeSqlite() : { sqlite: false, fts5: false, backup: false, error: "" };
  const report = {
    ok: Boolean(satisfies && sqlite.sqlite),
    node: String(version),
    engines: `>=${MIN_NODE.major}.${MIN_NODE.minor}`,
    satisfies,
    sqlite: sqlite.sqlite,
    fts5: sqlite.fts5,
    backup: sqlite.backup,
  };
  if (sqlite.error) report.error = sqlite.error;
  return report;
}
