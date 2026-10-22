/** Shared installer: selected Desktop's Electron runtime or Linux CLI's Node. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
const exec = promisify(execFile);
const repo = "kingcharleslzy-ai/dsh-purge";
const hosts = new Set(["api.github.com", "github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"]);

async function get(url, limit, request) {
  for (let n = 0; n < 6; n++) {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || !hosts.has(u.hostname)) throw Error("Untrusted release URL");
    const response = await request(url, { redirect: "manual", signal: AbortSignal.timeout(60000), headers: { "user-agent": "purge-community-installer", accept: "application/vnd.github+json" } });
    if (response.status >= 300 && response.status < 400) {
      if (!response.headers.get("location")) throw Error("Invalid release redirect");
      url = new URL(response.headers.get("location"), u).href;
      continue;
    }
    if (!response.ok) throw Error(`Release download HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > limit) throw Error("Release file too large");
    const parts = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw Error("Release file too large");
      parts.push(chunk);
    }
    return Buffer.concat(parts);
  }
  throw Error("Too many release redirects");
}

/** Same floor as lib/node-runtime.js. Inlined so a lone downloaded bootstrap still runs. */
export function nodeSupportsSqlite(version = process.versions.node) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(version ?? "").trim());
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  return major > 22 || (major === 22 && (minor > 5 || (minor === 5 && patch >= 0)));
}

export function verifyChecksum(bytes, text, filename) {
  const lines = text.trim().split(/\r?\n/).map(line => /^([a-f0-9]{64})\s+\*?([^\s]+)$/i.exec(line));
  const matches = lines.filter(row => row && row[2] === filename);
  if (matches.length !== 1 || matches[0][1].toLowerCase() !== createHash("sha256").update(bytes).digest("hex")) throw Error(`SHA256 verification failed: ${filename}`);
}

export function desktopCli(executable, platform = process.platform) {
  const resources = platform === "darwin"
    ? path.resolve(executable, "../../Resources")
    : path.join(path.dirname(executable), "resources");
  const relative = "dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js";
  const cli = ["app.asar", "app.asar.unpacked", "app"].map(layout => path.join(resources, layout, relative)).find(file => fs.existsSync(file));
  if (!cli) throw Error("Cannot find this DSH Desktop's CLI. Specify the installed DSH executable, not a different Node runtime.");
  return cli;
}

export function webCli(launcher = process.env.PURGE_DSH_CLI) {
  if (!launcher) throw Error("Set PURGE_DSH_CLI to this DSH instance's launcher.");
  const cli = fs.realpathSync(launcher);
  if (!fs.statSync(cli).isFile()) throw Error("DSH CLI must be a file.");
  fs.accessSync(cli, fs.constants.R_OK);
  if (!/\.[cm]?js$/i.test(cli)) fs.accessSync(cli, fs.constants.X_OK);
  return cli;
}

// System npm installations are commonly root-owned. Keep the official package
// intact and run the same code from an owned copy; never weaken /usr permissions.
export function prepareLinuxHost(cli, { userHome = os.homedir(), log = console.log } = {}) {
  // Canonicalize existing parents even on a first install. /var -> /private/var
  // on macOS and linked Linux home directories must compare as the same tree.
  let parent = path.resolve(userHome);
  const suffix = [];
  for (;;) {
    try { userHome = path.join(fs.realpathSync(parent), ...suffix); break; }
    catch (error) {
      if (error.code !== "ENOENT" || path.dirname(parent) === parent) throw error;
      suffix.unshift(path.basename(parent)); parent = path.dirname(parent);
    }
  }
  cli = fs.realpathSync(cli);
  let root = path.dirname(cli), meta;
  for (;;) {
    try {
      const candidate = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
      const bin = typeof candidate.bin === "string" ? candidate.bin : candidate.bin?.dsh;
      if (candidate.name === "@deepseek-ai/dsh" && typeof bin === "string" && fs.realpathSync(path.resolve(root, bin)) === cli) { meta = candidate; break; }
    } catch {}
    const parent = path.dirname(root);
    if (parent === root) return { cli, copied: false };
    root = parent;
  }
  const aiBase = path.join(root, "node_modules/@deepseek-ai");
  try { fs.accessSync(root, fs.constants.W_OK); fs.accessSync(aiBase, fs.constants.W_OK); return { cli, copied: false }; } catch {}
  const inside = (base, file) => file === base || (!path.relative(base, file).startsWith(".." + path.sep) && path.relative(base, file) !== ".." && !path.isAbsolute(path.relative(base, file)));
  const manifestBytes = fs.readFileSync(path.join(root, "package.json"));
  // Hash the raw manifest, not JSON.stringify(parsed). A trailing space is how
  // callers bust the cache, and mtimeMs can stay identical within one tick.
  const identity = createHash("sha256").update(root).update(manifestBytes).update(fs.readFileSync(cli)).digest("hex");
  const hostsDir = path.join(userHome, ".local/share/dsh-purge/hosts");
  const destination = path.join(hostsDir, identity.slice(0, 20));
  const target = path.join(destination, "dsh");
  const targetCli = path.join(target, path.relative(root, cli));
  const launcher = path.join(userHome, ".local/bin/dsh");
  const owner = file => !fs.lstatSync(file).isSymbolicLink() && (typeof process.getuid !== "function" || fs.statSync(file).uid === process.getuid());
  const managed = directory => {
    try { return owner(directory) && JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")).managedBy === "dsh-purge-linux-host"; } catch { return false; }
  };
  // Refuse to replace a user's unrelated command, including dangling symlinks.
  let previousLink = null;
  try {
    const stat = fs.lstatSync(launcher);
    const existing = stat.isSymbolicLink() && fs.realpathSync(launcher);
    previousLink = { target: stat.isSymbolicLink() ? fs.readlinkSync(launcher) : null, ino: stat.ino, dev: stat.dev };
    const directory = existing && path.dirname(path.dirname(path.dirname(existing)));
    if (!existing || !inside(hostsDir, existing) || !managed(directory)) throw Error(`Existing launcher is not managed by Purge: ${launcher}`);
  } catch (error) { if (error.code !== "ENOENT") throw error; else if (fs.existsSync(path.dirname(launcher)) && fs.readdirSync(path.dirname(launcher)).includes("dsh")) throw Error(`Existing launcher is not managed by Purge: ${launcher}`); }
  fs.mkdirSync(hostsDir, { recursive: true, mode: 0o700 });
  if (fs.existsSync(destination)) {
    if (!managed(destination) || JSON.parse(fs.readFileSync(path.join(destination, "manifest.json"), "utf8")).identity !== identity || !owner(target) || !inside(target, fs.realpathSync(targetCli))) throw Error("Invalid managed DSH copy; inspect it before retrying");
  } else {
    const stage = fs.mkdtempSync(path.join(hostsDir, ".stage-"));
    const copy = (source, dest) => {
      const stat = fs.lstatSync(source);
      if (stat.isSymbolicLink()) {
        const resolved = fs.realpathSync(source);
        if (!inside(root, resolved)) throw Error(`DSH dependency symlink escapes installation: ${source}`);
        fs.symlinkSync(path.relative(path.dirname(dest), path.join(stage, "dsh", path.relative(root, resolved))), dest);
      } else if (stat.isDirectory()) {
        fs.mkdirSync(dest, { mode: (stat.mode & 0o777) | 0o700 });
        for (const name of fs.readdirSync(source)) copy(path.join(source, name), path.join(dest, name));
      } else if (stat.isFile()) {
        fs.copyFileSync(source, dest, fs.constants.COPYFILE_FICLONE);
        fs.chmodSync(dest, (stat.mode & 0o777) | 0o200);
      } else throw Error(`Unsupported DSH package entry: ${source}`);
    };
    try {
      log(`System DSH is read-only; copying official ${meta.version} to ${target}...`);
      copy(root, path.join(stage, "dsh"));
      fs.writeFileSync(path.join(stage, "manifest.json"), JSON.stringify({ managedBy: "dsh-purge-linux-host", identity, source: root, version: meta.version }, null, 2) + "\n", { mode: 0o600 });
      fs.renameSync(stage, destination);
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  }
  fs.accessSync(targetCli, fs.constants.X_OK);
  // Copy preparation is not activation. Migration may still fail, so leave
  // the current command (including an older managed host) untouched until then.
  const activate = () => {
    let current = null;
    try {
      const stat = fs.lstatSync(launcher);
      current = { target: stat.isSymbolicLink() ? fs.readlinkSync(launcher) : null, ino: stat.ino, dev: stat.dev };
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (JSON.stringify(current) !== JSON.stringify(previousLink))
      throw Error(`DSH launcher changed during installation; retained current command: ${launcher}`);
    fs.mkdirSync(path.dirname(launcher), { recursive: true });
    if (!current) fs.symlinkSync(targetCli, launcher); // exclusive: never overwrite a new user command
    else if (fs.realpathSync(launcher) !== targetCli) {
      const stage = fs.mkdtempSync(path.join(path.dirname(launcher), ".purge-launcher-"));
      try { fs.symlinkSync(targetCli, path.join(stage, "dsh")); fs.renameSync(path.join(stage, "dsh"), launcher); }
      finally { fs.rmSync(stage, { recursive: true, force: true }); }
    }
    log(`User-owned DSH ready: ${launcher}. Quit the old DSH and launch this path to use it.`);
  };
  return { cli: targetCli, copied: true, launcher, aiBase: path.join(target, "node_modules/@deepseek-ai"), activate };
}

export async function bootstrapInstall(options = {}) {
  const { request = fetch, run = exec, log = console.log, executable = process.execPath, platform = process.platform,
    mode = process.env.PURGE_INSTALL_MODE || "desktop",
    home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh"), profile = process.env.DSH_PROFILE || (mode === "web" ? "web" : "desktop"), dryRun = false } = options;
  if (!["web", "desktop"].includes(mode)) throw Error("Invalid installation mode");
  if (!nodeSupportsSqlite()) throw Error("requires Node >=22.5 (node:sqlite)");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(profile)) throw Error("Invalid profile name");
  if (!fs.existsSync(path.join(home, "profiles", profile, "package.json"))) throw Error("Profile is not initialized; open DSH once first, or specify the correct home/profile.");
  let cli = options.cli || (mode === "web" ? webCli() : desktopCli(executable, platform));
  const local = options.archiveFile !== undefined || options.sha256 !== undefined;
  if (local && (!options.archiveFile || !/^[a-f0-9]{64}$/i.test(options.sha256 || ""))) throw Error("Local install requires --archive and a 64-character --sha256");
  let version = options.version || (local ? /^dsh-purge-community-(\d+\.\d+\.\d+)\.tgz$/.exec(path.basename(options.archiveFile))?.[1] : undefined);
  if (local && !version) throw Error("Specify --version for this local archive");
  if (!version) {
    const release = JSON.parse((await get(`https://api.github.com/repos/${repo}/releases/latest`, 1024 * 1024, request)).toString("utf8"));
    if (release.draft || release.prerelease) throw Error("Latest release is not stable");
    version = String(release.tag_name || "").replace(/^v/, "");
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error("Invalid release version");
  const filename = `dsh-purge-community-${version}.tgz`;
  const base = `https://github.com/${repo}/releases/download/v${version}`;
  log(`${local ? "Verifying local" : "Downloading"} Purge Community ${version}...`);
  if (local && fs.statSync(options.archiveFile).size > 50 * 1024 * 1024) throw Error("Release file too large");
  const archive = local ? fs.readFileSync(options.archiveFile) : await get(`${base}/${filename}`, 50 * 1024 * 1024, request);
  const sums = local ? `${options.sha256}  ${filename}\n` : (await get(`${base}/SHA256SUMS.txt`, 64 * 1024, request)).toString("utf8");
  verifyChecksum(archive, sums, filename);
  if (dryRun) { log("SHA256 verified; dry run, nothing installed."); return { version, dryRun: true }; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "purge-installer-"));
  try {
    const file = path.join(tmp, filename);
    fs.writeFileSync(file, archive, { mode: 0o600 });
    const tar = platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
    // cwd is passed as Unicode by CreateProcess; legacy tar builds mangle Unicode argv.
    const listing = await run(tar, ["-tzf", filename], { cwd: tmp, timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    if (!listing.stdout.trim() || listing.stdout.trim().split(/\r?\n/).some(name => !/^package\//.test(name) || name.includes("\\") || name.split("/").some(part => part === ".."))) throw Error("Invalid archive paths");
    await run(tar, ["-xzf", filename], { cwd: tmp, timeout: 30000, windowsHide: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, "package/package.json"), "utf8"));
    if (manifest.name !== "dsh-purge-community" || manifest.version !== version || manifest.repository?.url !== `git+https://github.com/${repo}.git`) throw Error("Release package identity mismatch");
    const host = platform === "linux" && mode === "web" ? prepareLinuxHost(cli, { userHome: options.userHome, log }) : null;
    if (host) cli = host.cli;
    const result = await run(executable, [path.join(tmp, "package/bin/community.js"), "migrate", file], {
      timeout: 600000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DSH_SURFACE: mode, PURGE_DSH_CLI: cli, DSH_BASE: "", DSH_HOME: home, DSH_PROFILE: profile, PURGE_PROFILE_DIR: path.join(home, "profiles", profile) },
    });
    host?.activate?.();
    if (result.stdout?.trim()) log(result.stdout.trim());
    if (result.stderr?.trim()) log(result.stderr.trim());
    log("Installed. Settings preserved. Quit and reopen DSH manually when convenient; no restart or host patch was performed.");
    return { version, installed: true };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const options = {};
    for (const arg of process.argv.slice(2)) {
      if (arg === "--dry-run") options.dryRun = true;
      else if (arg.startsWith("--version=")) options.version = arg.slice(10);
      else if (arg.startsWith("--profile=")) options.profile = arg.slice(10);
      else if (arg.startsWith("--archive=")) options.archiveFile = arg.slice(10);
      else if (arg.startsWith("--sha256=")) options.sha256 = arg.slice(9);
      else throw Error(`Unknown argument: ${arg}`);
    }
    await bootstrapInstall(options);
  } catch (error) { console.error(error.stderr || error.message); process.exitCode = 1; }
}
