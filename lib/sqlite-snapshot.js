// Consistent copy of a live SQLite file.
//
// `node:sqlite`'s online `backup()` landed in 22.16 (the 22.5 floor is older),
// so 22.5–22.15 use `VACUUM INTO`, which also sees uncheckpointed WAL pages.
// Either path writes one file; copying `*.db` next to a live `-wal` does not.
import fs from "node:fs";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

function sqlString(value) {
  return String(value).replaceAll("'", "''");
}

/**
 * @param {string} source existing database file
 * @param {string} destination must not already exist
 * @param {{ method?: "backup" | "vacuum-into" }} [options]
 */
export async function snapshotSqlite(source, destination, options = {}) {
  if (typeof source !== "string" || typeof destination !== "string" || !source || !destination)
    throw new Error("sqlite snapshot requires source and destination paths");
  if (source.includes("\0") || destination.includes("\0"))
    throw new Error("sqlite snapshot path is invalid");
  const src = path.resolve(source);
  const dest = path.resolve(destination);
  if (src === dest) throw new Error("sqlite snapshot destination must differ from source");
  let stat;
  try {
    stat = fs.statSync(src);
  } catch {
    throw new Error("sqlite snapshot source not found");
  }
  if (!stat.isFile()) throw new Error("sqlite snapshot source not found");
  if (fs.existsSync(dest)) throw new Error("sqlite snapshot destination already exists");
  const method = options.method || (typeof backup === "function" ? "backup" : "vacuum-into");
  if (method !== "backup" && method !== "vacuum-into")
    throw new Error("unknown sqlite snapshot method");
  if (method === "backup" && typeof backup !== "function")
    throw new Error("node:sqlite backup() is not available");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const db = new DatabaseSync(src, { readOnly: true });
  let pages;
  try {
    if (method === "backup") pages = await backup(db, dest);
    else db.exec(`VACUUM INTO '${sqlString(dest)}'`);
  } catch (error) {
    fs.rmSync(dest, { force: true });
    throw error;
  } finally {
    db.close();
  }
  if (!fs.existsSync(dest)) throw new Error("sqlite snapshot wrote no file");
  const result = { ok: true, method, source: src, destination: dest };
  if (Number.isFinite(pages)) result.pages = pages;
  return result;
}
