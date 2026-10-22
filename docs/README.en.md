# Purge Community

An independently maintained community fork of [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge), originally created by **小杨**. This is not an official upstream release. Original attribution, Git history and the MIT license are retained. This community distribution is free and is not offered for paid resale.

## What it does

DSH is not short of capability; it is gated four times. Purge removes those gates:

| Gate | How it is removed |
| --- | --- |
| Model | the user's `prompt-inject.md` is injected as a top-priority section every step; the stock identity line is stripped; a tail "boost" block states the instruction hierarchy, treats refusal as a malfunction, and resists sycophancy across turns |
| Approval | approvals auto-granted, never-sentence bypassed, fail-open when no UI channel, `run_code` / tool `ask` released, plan mode no longer hard-blocks |
| Sandbox | `confine()` passthrough, fs fence disabled, observation policy relaxed, denial wording neutralized |
| Turn | repeat-tool guard and result pruning disabled, Auto Review no longer denies, `ask_user_question` continues after 1s, UI messages always start a fresh turn |

83 host patches, all re-qualified against a pristine **0.2.1-rc.2** copy (64 written, 6 already at target, 0 failed). The panel lives in the **left rail** as a full page styled with DSH's own tokens; explanations sit in small `?` tips. `purge-community selfcheck` proves each of the 25 layers is live, and `diagnose` points at the exact file and line when a host update moves an anchor.

## Prerequisites

Node.js **≥ 22.5**. The package uses the built-in `node:sqlite` module. `purge-community` and `dsh-purge` check this before loading anything else and print `requires Node >=22.5 (node:sqlite)` when the runtime is older. `purge-community runtime` reports Node, `node:sqlite`, FTS5, and whether the online `backup()` API (Node 22.16+) is present. `purge-community sqlite-snapshot <source.db> <dest.db>` copies a live database consistently via that API, or `VACUUM INTO` on Node 22.5–22.15. Desktop installs use the application's own runtime, which must meet the same floor.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.sh | sh
```

The script finds DSH Desktop, downloads the latest verified release, checks SHA256 and runs the installer with DSH's own runtime (it snapshots the profile first, then merges the old Purge entries into `dsh-purge-community`).

Then fully quit and reopen DSH, open **Purge** in the left rail, press **Apply**, and quit/reopen once more.

**Current version 1.6.33 — qualified against DSH Desktop 0.2.1-rc.2 (and rc.1).**

1.6.33 adds Linux CLI/Web installation from PR #42. A user-owned host copy is activated only after migration succeeds; uninstall removes links without deleting external targets. Windows/macOS installation, packaging and Electron regression gates remain in place. Ubuntu CI additionally runs the real official npm host through installation, backup, rollback and failure recovery. Full Linux GUI/model coverage is not claimed. Existing patch behavior and settings are unchanged; no automatic restart. See [release scope](releases/1.6.33.md).

1.6.14 fixes #20: atomic replacement preserves executable/private rwx permissions and CLI backup failures stop replacement. Read-only `host-status` separates disk layout from process entry evidence. #19 remains open: its complete restart/handoff path is not fixed in this release. Existing features, settings and presets are retained; no automatic restart. See [acceptance scope](releases/1.6.14.md).

1.6.13 fixes legacy custom `unrestricted` presets rejected by DSH's removed `toolFilter` option. Before registration, it backs up the original files and translates the child policy into a native child preset selected with `agentPreset`. Parent tools, persona, expressions and depth settings remain intact; the child excludes exactly the supported legacy deny list. Original user YAML is retained byte for byte. Unknown or ambiguous policies stop with a diagnostic instead of silently dropping restrictions. The additional child preset is for delegation; choose the original preset for normal sessions. Updating never restarts DSH automatically.

```
purge-community selfcheck     # 27-layer proof that each bypass is live
purge-community diagnose      # which patch anchor drifted, with line numbers
```

Maintenance snapshots stay local under `$DSH_HOME/dsh-purge-community/backups` (last 5 + one per day x7 + 200MB cap). Rollback restores plugin code and enablement only.

See the [Chinese README](../README.md) for the full feature table, panel tour and troubleshooting.

## Contributors

Thanks to [@heigit](https://github.com/heigit) for the reproduction, analysis and validation feedback in [issue #3](https://github.com/kingcharleslzy-ai/dsh-purge/issues/3), and [@luowang-ui](https://github.com/luowang-ui) for the Desktop CLI atomic-copy fix in [PR #1](https://github.com/kingcharleslzy-ai/dsh-purge/pull/1). See the [contributor list](../CONTRIBUTORS.md) for attribution.

## Updates and market

Automatic checks and automatic installation have separate switches in Maintenance. Checks default to 30 seconds after startup and every 6 hours; installation defaults off and preserves the legacy preference. Installation backs up and verifies releases, respects pinned versions, and waits for a manual restart. Update operations never restart DSH or reload its client automatically. Preferences are stored separately; existing profile settings and prompts remain unchanged.

Official-format custom market index: https://kingcharleslzy-ai.github.io/dsh-purge/index.json. Add it to DSH's experimental Custom plugin markets. Community registry admission remains a separate review process.

Thanks to [@OGHong](https://github.com/OGHong) for diagnosing the Electron ASAR check in [issue #5](https://github.com/kingcharleslzy-ai/dsh-purge/issues/5). The fix uses the existing original-fs disk adapter and was tested in Electron 44.7.0.

## Windows and installation recovery (1.6.13)

Run PowerShell 5.1+ or PowerShell 7:

```powershell
Invoke-WebRequest -UseBasicParsing https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.ps1 -OutFile "$env:TEMP\purge-install.ps1"
& "$env:TEMP\purge-install.ps1"
```

Use `-DshExe 'C:\path\DeepSeek Harness.exe'` for a custom or ambiguous installation, `-DshHome`, `-Profile`, `-Version 1.6.14`, or `-DryRun`. The initialized Desktop profile and the application's own runtime are required. No global Node installation, registry edits or automatic restart. Review a downloaded script before running it; a process-only execution-policy override is documented in the Chinese installation guide when required.

Issue #7 concerns a missing Windows dependency version in a registry mirror. Only the specific missing-metadata failure for the public `@dsh-ops/bash-win32-x64` package qualifies for one scoped retry against official npm, after validating official metadata. All pnpm security policies remain active; private/unknown registries, integrity failures and too-new packages are not bypassed. The market's first-install operation runs before this plugin loads: choose official npm there, or use this independent installer. A GitHub network warning is a separate problem.

See [installation and recovery](INSTALLATION.md) and [Agent instructions](../AGENTS.md). Cross-platform installer tests do not establish complete Windows host-patch/UI compatibility. Existing prompts, settings and other plugins are preserved; restart manually only when convenient.

Earlier releases verified the real signed Windows Desktop runtime on Windows 11 (build 26300), with an isolated app copy and profile. It fixes a GUI-subsystem race: PowerShell could return before Electron read the temporary bootstrap, then delete the file and report success. The wrapper now waits for the exact process and checks its ExitCode. Regression tests include a delayed GUI executable, not only a console Node fixture. Installation, backup, rollback and settings retention are verified; full Windows UI/login/host-patch qualification remains separate.

### Windows handoff and settings compatibility in 1.6.13

Windows archive handoff waits for a full user quit, records helper readiness and verified completion, preserves a uniquely named archive backup, and never kills or relaunches the app. A pending marker is not success. If an official update changes the archive while waiting, handoff stops. See the maintenance guide before attempting offline repair.

Modern hosts retain native describe/replace settings APIs. The exact historical legacy shim is removed on apply without changing user settings documents; unknown modified shims stop for diagnosis. Old hosts retain their compatibility API. Backup descriptors are closed before Windows atomic replacement; backup failures cancel host patch writes.

Historical real Windows acceptance covers archive handoff from the desktop host, SHA256-preserved backups, reload status, native Settings/ConfigEditor reads and writes, and rollback followed by re-upgrade. The isolated profile retains its default permissions. Mouse automation over UU remained unreliable; this is not a claim that every Windows control, login flow or model response has been manually tested. See [scope and evidence](releases/1.6.10.md).

Version 1.6.9 was changed to a prerelease after post-publication testing found an unpacked Windows runtime-link failure. Version 1.6.13 uses an absolute junction target, preserves invalid links, repairs the selected unpacked CLI before installation, and blocks archive handoff if its runtime is unavailable. For a previously broken updater, use the standalone installer rather than deleting runtime directories or lockfiles.

## 1.6.13: command coexistence and evidence-based diagnostics

A conflicting slash command remains owned by its original plugin; Purge uses a prefixed fallback. Status/maintenance routes and other registrations remain available. Permission checks distinguish explicit configuration, effective inferred defaults and unavailable evidence. Runtime observations take priority; YAML expressions are never executed by diagnostics. No settings changes or automatic restart are required by these fixes. See issues #12 and #15 and the release acceptance notes.

### 1.6.28 maintenance release

Partial multi-profile updates remain retryable. Legacy upstream ZIP archives are pinned to a commit and verified file by file against GitHub’s Git tree before installation; normal release TGZ checksums remain enforced. Diagnostics now distinguish unknown status from success, and rollback preserves dependencies and executable permissions. Existing settings and prompt policies remain unchanged; no automatic restart. See [maintenance review and validation limits](maintenance-issues-27-30.md). Issue #30 remains an investigation, not a claimed model-quality fix.

### 1.6.29 maintenance

Panel rollback now installs a verified snapshot archive, checks dependencies and imports the entry in a fresh process, and restores the pre-operation dependency graph on failure. Both plugin updater paths share token/proxy handling and visible fallback diagnostics. No OS proxy changes or automatic DSH restart. See [maintenance details](maintenance-issues-34-35.md).
