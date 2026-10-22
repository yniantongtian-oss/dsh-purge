<div align="center">

# Purge Community

**给 DeepSeek Harness 拆闸的插件。**

80 条宿主补丁 · 25 层破甲自检 · 提示词 / 规则 / 技能管理 · 左侧栏整页设置

[![Release](https://img.shields.io/github/v/release/kingcharleslzy-ai/dsh-purge?label=release)](https://github.com/kingcharleslzy-ai/dsh-purge/releases)
[![Checks](https://github.com/kingcharleslzy-ai/dsh-purge/actions/workflows/community.yml/badge.svg)](https://github.com/kingcharleslzy-ai/dsh-purge/actions/workflows/community.yml)

当前版本 **1.6.33** · 适配 **DSH Desktop 0.2.1-rc.2**（rc.1 同样通过） · [English](docs/README.en.md)

</div>

---

## 环境要求

- **Node.js ≥ 22.5**。本包使用内置模块 `node:sqlite`。更低版本运行 `purge-community` / `dsh-purge` 时，入口会先向 stderr 打印 `requires Node >=22.5 (node:sqlite)` 并退出，而不是在中途抛出 `ERR_UNKNOWN_BUILTIN_MODULE`。
- `purge-community runtime` 报告当前 Node、`node:sqlite` 是否加载、FTS5，以及在线 `backup()`（22.16 起）是否可用。
- `purge-community sqlite-snapshot <源.db> <目标.db>` 为正在写入的库做一致性热备：优先 `node:sqlite` 的 `backup()`，22.5–22.15 回退到 `VACUUM INTO`。不要直接拷贝还带着 `-wal` 的库文件。
- Desktop 安装仍使用应用自带运行时；该运行时同样需要 ≥ 22.5。不要求单独安装全局 pnpm。

---

## 1.6.33：Linux 安装入口与跨平台安装保护

合入 [PR #42](https://github.com/kingcharleslzy-ai/dsh-purge/pull/42)，增加 Linux CLI/Web 安装支持。系统目录不可写时准备用户宿主副本，迁移成功后才切换入口；卸载符号链接时保留外部源码与共享依赖。Windows/macOS 继续通过完整安装、打包及真实 Electron 回归。不改现有补丁功能、提示词或用户设置，不自动重启。[发行说明](docs/releases/1.6.33.md) · [验证范围](docs/maintenance-pr-42.md)

## 1.6.32：统一桌面诊断目标

修复 #40 涉及的归档启动路径诊断缺陷：状态、自检和锚点诊断统一检查当前安装的实际磁盘目录，避免同一文件一处显示已应用、另一处显示缺失。归档仍存在、真正的文件缺失及权限异常仍会提示；磁盘状态不等于当前进程已加载。[发行说明](docs/releases/1.6.32.md)

## 1.6.31：修复默认预设自检误报

修复 #38：自检只读解析当前预设，明确无需处理的 #76 不再显示红色；残留内容、匹配失败和必需文件缺失仍保留诊断，动态或损坏配置显示未知。保留现有功能和设置，不自动重启。[发行说明](docs/releases/1.6.31.md)


## 1.6.30：嵌套安装自检与准确诊断

支持 npm 单包嵌套宿主布局，分开识别安装根与组件根，避免自检正常却无法升级或回滚。必需文件缺失、待应用和未知状态如实显示，不再误计为全部成功。只检查指定实例，保留现有配置与功能，不自动重启。[维护与测试说明](docs/maintenance-pr-33.md) · [发行说明](docs/releases/1.6.30.md)

## 1.6.29：修复面板回滚与更新网络

面板回滚改用安装归档，并在报告成功前验证依赖和插件入口；失败时恢复本轮开始前的安装。社区版与旧更新通道统一网络层，支持 GitHub token、环境代理和 Windows 静态系统代理，限流、降级失败及旧缓存状态明确可见。不改系统代理，不自动重启。[维护与测试说明](docs/maintenance-issues-34-35.md) · [发行说明](docs/releases/1.6.29.md)

> 1.6.28 的目录回滚修复未覆盖面板回滚入口，#34 在本版单独修复。

## 1.6.27：插话回归修复

修复重复插话被重新排队、空闲插话打乱顺序，并补齐旧版本迁移。保留原生交互与现有设置；不自动应用或重启。[修复与验证范围](docs/steer-notes.md) · [#25](https://github.com/kingcharleslzy-ai/dsh-purge/issues/25)

## 安装与迁移

先打开一次 DSH，初始化目标 profile。桌面版默认 `desktop`，Linux CLI/Web 默认 `web`。安装器先下载并校验发行包，再备份当前 profile、安装并合并旧 Purge 入口；保留提示词、规则、更新偏好和其他插件设置。**不自动重启，不自动应用宿主补丁，不修改全局 npm 源。**

### macOS

```sh
curl -fsSL https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.sh -o /tmp/purge-install.sh
sh /tmp/purge-install.sh
```

也支持原有一行命令：

```sh
curl -fsSL https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.sh | sh
```

### Linux · CLI / Web

贡献者在 CachyOS Linux x86_64 提供了实机验证（DSH 0.2.1-rc.2、Node 26.11.1）；维护方另在 Ubuntu CI 验证真实官方 npm 宿主的安装、备份、回滚及失败恢复。Linux 全部图形界面与模型任务尚未全面验收。沿用原有 JavaScript、面板和插件功能；安装引导与 CLI 要求 Node.js ≥ 22.5（`node:sqlite`）。

先安装并启动一次 DSH，初始化 `web` profile，再下载并运行安装脚本：

```sh
curl -fsSL https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.sh -o /tmp/purge-install.sh
sh /tmp/purge-install.sh --dry-run
sh /tmp/purge-install.sh
```

默认选择 PATH 中的 `node` / `dsh`、`~/.dsh` 和 `web` profile。可设置 `DSH_NODE`、`PURGE_DSH_CLI`、`DSH_HOME` 或 `--profile=名称`。安装器校验 SHA256，保留设置，不需要 sudo，不自动应用补丁或重启。

上述命令下载正式发行包。开发或离线验收时，也可在仓库目录打包并指定本地归档：

```sh
npm pack --ignore-scripts
ARCHIVE="dsh-purge-community-1.6.33.tgz"
SHA256=$(sha256sum "$ARCHIVE" | cut -d ' ' -f1)
sh scripts/install.sh --archive="$PWD/$ARCHIVE" --sha256="$SHA256" --dry-run
# 核对包来源与摘要后，去掉 --dry-run 执行安装。
```

系统 npm 目录不可写时，安装器创建完整的用户宿主副本及 `~/.local/bin/dsh` 入口。退出旧服务后运行 `~/.local/bin/dsh web`，再在 Purge 中应用补丁并重开 DSH。不会修改 `/usr` 权限或覆盖无关启动器。

已有 Linux Electron 桌面程序可显式指定 `DSH_APP=/绝对路径/deepseek-harness`，使用该程序的运行时和 `desktop` profile。安装器不创建 DSH 桌面程序。更多参数见 [安装指南](docs/INSTALLATION.md)。

### 1.6.14 安装与诊断维护

- 修复 [#20](https://github.com/kingcharleslzy-ai/dsh-purge/issues/20)：原子写入保留执行权限与私有文件权限；已被旧版改成不可执行的已识别 CLI 启动器可恢复。备份失败时停止替换，保留原文件。
- 排查 [#19](https://github.com/kingcharleslzy-ai/dsh-purge/issues/19)：新增只读 `purge-community host-status`，区分磁盘归档、当前服务入口与未知状态，不再把磁盘写入计数当成运行时加载证据。**#19 的完整换包问题仍开放，本版未修改换包或重启流程。**
- 现有功能、提示词、设置和预设保持；不自动应用或重启。验证范围与限制见 [1.6.14 验收记录](docs/releases/1.6.14.md)。

### 1.6.13 修复重点

- **旧预设升级后继续可用。** 修复自定义「无限制模式」因旧 `toolFilter` 参数加载失败；先备份，再转换为 DSH 原生子预设。保留父会话全部工具及子任务原来的工具限制，原始提示词和配置不重写。
- 辅助预设「无限制模式 · 子任务」用于继承这些限制；主会话仍选「无限制模式」。遇到不能准确迁移的自定义策略会报告错误，不会悄悄删除限制。[迁移与回滚说明](AGENTS.md#18-旧自定义预设加载失败1613)。
- **命令冲突不会拖垮插件。** 已有 `/rewind` 等同名命令由原插件继续提供，Purge 自动使用 `/purge-rewind` 等备用命令；状态、维护、提示词与工具仍正常注册。解决 [#12](https://github.com/kingcharleslzy-ai/dsh-purge/issues/12)。
- **自检说清楚证据。** 显式配置、宿主推导、无法确认分开显示；优先核对运行中实例，不再将“未配置默认预设”直接报为故障。解决 [#15](https://github.com/kingcharleslzy-ai/dsh-purge/issues/15)。
- 保留原有功能、设置、提示词、规则和更新偏好；仍不自动重启。Windows 换包、原生设置与安装修复均保留。[本版验收](docs/releases/1.6.13.md)。

### Windows 11 · PowerShell

1.6.10 已在真实 Windows 11 + 官方 DSH Desktop 0.2.1-rc.2 上验证安装与回滚。安装器会等待 Electron GUI 子进程结束，读取真实退出码后才清理临时文件；不再出现“父进程成功、子进程找不到脚本”的误报。

```powershell
Invoke-WebRequest -UseBasicParsing https://raw.githubusercontent.com/kingcharleslzy-ai/dsh-purge/master/scripts/install.ps1 -OutFile "$env:TEMP\purge-install.ps1"
& "$env:TEMP\purge-install.ps1"
```

不需要全局 Node/pnpm 或管理员权限。使用所选 DSH Desktop 自带的运行时；找不到或存在多个安装时停止，可显式传入 `-DshExe 'C:\path\DeepSeek Harness.exe'`。如果执行策略阻止脚本，审阅下载的脚本后，在**单独进程**运行 `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\purge-install.ps1"`；不修改持久执行策略。

| 用途 | macOS 参数/环境变量 | Windows 参数 |
| --- | --- | --- |
| 只下载校验，不安装 | `--dry-run` | `-DryRun` |
| 固定版本 | `--version=1.6.13` | `-Version 1.6.13` |
| 选择 profile | `--profile=desktop` | `-Profile desktop` |
| 自定义数据目录 | `DSH_HOME=/path/to/home` | `-DshHome 'C:\path\home'` |
| 自定义应用路径 | `DSH_APP='/path/DSH.app'` | `-DshExe 'C:\path\DeepSeek Harness.exe'` |

安装完成后，在任务结束时**手动完全退出并重开 DSH**。已有用户按需要检查状态；首次安装若要应用宿主补丁，另行在 Purge 状态页操作，然后手动重开。安装成功不代表所有宿主补丁已经生效。

### 市场 JSON 安装报错（issue #7）

报 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`，且明确提到 `@dsh-ops/bash-win32-x64` 的 `version not present in registry manifest` 时，可能是国内镜像尚未同步版本，**不是 Windows 不受支持的证据**。

本版独立安装器会核对 npm 官方元数据；只有确认公开镜像缺版本时，才为本次 `@dsh-ops` 下载使用官方源重试一次，其他依赖仍沿用原来的源，供应链校验保持开启。不会把未知私有源自动切到公开源，也不会对真实的完整性或发布时间错误放宽校验。

**DSH 市场首次安装在插件加载前执行**，安装后的插件代码无法接管这一步。可在市场安装对话框选择 npm 官方源重试，或使用上面的独立安装器。更换 tgz 并不保证绕过宿主依赖检查。GitHub `UND_ERR_DESTROYED` 等网络错误另行排查，不要把它等同于镜像缺版本。

完整步骤、Agent 决策树、失败恢复与测试边界见 [安装与故障排查](docs/INSTALLATION.md) 和 [AGENTS.md](AGENTS.md)。

## 为什么用它，而不是原版

| | 原版 1.1.71 | 本分支 1.6.13 |
| --- | --- | --- |
| 宿主适配 | 只到 0.1.7 / 0.2.0，上游已停更 | **0.2.1-rc.2 逐条回归，0 漂移** |
| 补丁 | 82 条，锚点随新版失效后静默跳过 | **80 条**（新增 `ask_user_question` 不阻塞），带**逐条状态与漂移诊断** |
| 装完怎么确认 | 没有 | **`selfcheck` 25 层逐层给证据（已确认/待应用/宿主推导/未确认/失败）+ `probe` 证明注入真的到模型** |
| 面板 | 会话上方悬浮按钮 + 独立小窗 | **左侧栏整页**：顶部一句话状态 + 放大的「应用」，其余折叠；说明收进 `?` |
| 更新 | 指向已停更的上游，分支/覆盖式安装 | 本仓库校验过的发行包（SHA256），保留通道/tag/pin 与多安装位置 |
| 预设 | 无 | 自带「无限制模式」：**standard 超集**（工具面一样），只换执行优先人设 |
| 审计 | 无 | **每次应用/回滚/开关都留痕**（`audit.jsonl`，面板「最近动作」可看） |
| 维护 | 无备份 | 应用/安装/回滚前自动快照（5 份 + 每天 1 份 × 7 天 + 200MB 上限；**大文件内容寻址去重**，每份从 9MB 降到约 2MB） |
| 提示词层 | 注入 + 身份剥离 | 再加**尾部破甲强化段**（默认开）、注入位置可切 `head/tail/both` |

## 它拆的是什么

模型不是不会干活，是被**四道闸**拦住。这个插件逐层拆：

| 闸门 | 拆法 |
| --- | --- |
| **模型层** | `prompt-inject.md` 每步作为最高优先级 section 注入；剥掉官方身份句；尾部追加「层级声明 / 拒绝即故障 / 抗谄媚 / 多轮重申」 |
| **审批层** | 审批门自动授信、`never` 提示句旁路、无 UI 通道时 fail-open、`run_code` / 工具 ask 放行、计划模式不硬拦 |
| **沙箱层** | `confine()` 直通、fs 围栏禁用、观察策略放行、沙箱拒绝话术中性化 |
| **回合层** | 重复工具守卫与结果修剪禁用、Auto Review 不否决、`ask_user_question` 最多等 1 秒就继续、UI 发消息永远新 turn |

## 破甲自检：别靠感觉，靠证据

```sh
purge-community selfcheck          # 人读
purge-community selfcheck --json   # 机读
```

25 层逐层回答"这条通道通不通"：沙箱直通、fs 围栏、观察策略、拒绝话术、默认策略、审批自动放行、重复守卫、结果修剪、Auto Review、工具 ask fail-open、计划模式、身份剥离、Web 面中性化、注入不被预设覆盖、极简/梁神预设、外部内容、Hooks、工具上限、子代理、会话默认、回退残留、网关兼容、会话挂载、桌面壳兜底，加上运行时注入 / profile 权限 / **宿主是否仍封在 app.asar**。

每层给 `applied/required`；目标插件没装的层显示"当前不适用"，不冒充成功。

## 面板

左侧栏 **Purge** → 整页，六个页签：

- **状态**——顶部固定「应用 / 还原 / 卸载」；一行状态摘要是 `DSH 版本 · 兼容级别 · 宿主补丁 · 插件版本`；下面是可展开的破甲自检与补丁明细；
- **提示词**——编辑注入正文，破甲强化段与注入位置；
- **规则 / 技能**——沿用原版规则集与 DSH 技能目录；
- **演练台**——23 个红队技能、资产测绘、攻击链；
- **更多**——服务器名单、更新与备份。

所有名词解释都在标题后面的小 `?` 里，点开即看，不占版面。

## 日常命令

```sh
purge-community status              # 宿主 / 补丁总览
purge-community selfcheck           # 破甲自检（ok / 待应用 / 失败 三态）
purge-community diagnose            # 漂移诊断（锚点没命中时给行号 + 片段）
purge-community reanchor apply <id> --lines A-B --yes   # 把新锚点钉成本地覆盖
purge-community probe new           # 生成探针，验证注入真的到达模型
purge-community boost on|off        # 尾部强化段（默认 on）
purge-community preset install      # 装自带「无限制模式」预设
purge-community audit --limit 20    # 最近动作记录（应用/回滚/开关/探针/重锚）
purge-community usage | prune       # 备份占用 / 清理（含去重对象 GC）
purge-community apply|revert|uninstall|edit   # 原版能力
```

给 agent 看的详细操作手册在 **[AGENTS.md](AGENTS.md)**：五层模型、命令与退出码、症状→动作决策树、补丁表怎么加、状态文件在哪。

偏好存在 `$DSH_HOME/dsh-purge/tuning.json`：

```json
{ "boost": true, "injectPosition": "head", "askNoBlock": true }
```

`injectPosition`：`head`（省 token）/ `tail`（贴输出、多轮衰减最小）/ `both`。

## 更新

**插件更新**：维护区分别设置「自动检查更新」和「自动安装更新」。默认启动 30 秒后检查，此后每 6 小时检查；可改 1–168 小时。默认不自动安装，旧的自动安装偏好继续保留。检查和安装独立于宿主补丁，关闭检查会暂停自动安装但保留其偏好。

自动安装只使用本仓库校验过的正式发行包，尊重锁定版本、安装前备份；成功后标记「待手动重启」，不会自动重启 DSH 或刷新界面，也不会在等待重启时反复安装。手动检查与安装始终可用。设置即时生效，存于 `$DSH_HOME/dsh-purge/update-preferences.json`，不重写 profile、提示词或其他插件设置。详情见 [更新说明](docs/AUTO-UPDATE.md)。

**市场安装**：官方自定义市场源地址为 `https://kingcharleslzy-ai.github.io/dsh-purge/index.json`，添加方式见 [市场说明](market/README.md)。社区市场收录需独立审核；自建源不代表已经被第三方收录。

**DSH 官方更新后**：`app.asar` 会重新出现，面板顶部直接提示"宿主仍封在 app.asar 里"→ 点 **应用** → 退出重开一次。补丁表若因新版漂移，`diagnose` 会指出哪条、哪个文件、期望原文与可能的新位置。

## 兼容性

| 环境 | 状态 |
| --- | --- |
| macOS · DSH Desktop **0.2.1-rc.1 / rc.2** | 已回归：80 条锚点、面板、CLI、自检 25 层全绿 |
| 其他 DSH 版本 | 允许应用，标"未验证"；先跑 `selfcheck` / `diagnose` |
| 宿主组件版本不一致 | 只报告，不阻止写入 |
| Windows 11 · Desktop **0.2.1-rc.2** | 真实运行时的安装、回滚、宿主交接、原生设置与重载自检通过；[验收范围](docs/releases/1.6.10.md) |
| Linux · CLI / Web | CachyOS x86_64 实机验证；统一安装脚本、SHA256 校验、用户可写宿主、原生备份/回滚 |
| Web profile | 维护回归保留，未做完整端到端验收 |

Web / Headless 的备份列表、更新结果和当前实例定位说明见 [维护定位](docs/WEB-MAINTENANCE.md)。这些维护回归不代表所有补丁已完成 Web 端到端验收。

## 出问题怎么办

```sh
# 应用打不开（最坏情况，回到更新前的密封包）
# 先确认备份存在并保留当前应用副本，再按维护文档人工恢复；不要盲目覆盖。

# 只回滚宿主补丁
purge-community revert

# 回滚插件（保留当前提示词与规则）
purge-community rollback <backup-id>
```

## 开发与验证

```sh
npm --prefix packages/purge-panel ci --ignore-scripts --legacy-peer-deps
npm run build:client     # packages/purge-panel/src → 根 client.js
npm test                 # 安装器 / 备份安装 / 实例定位 / 自检 / 现有功能回归
npm run test:ui && npm --prefix packages/purge-panel test
npm run check:client && npm run diagnose
npm run test:electron    # 实际 Electron ASAR 回归；不启动或修改 DSH
```

`test/patch-anchors.test.mjs` 把 0.2.1 的真实源码片段钉进用例——谁改了锚点没同步用例，测试直接失败。

## 贡献者

感谢 [@heigit](https://github.com/heigit) 提交 [issue #3](https://github.com/kingcharleslzy-ai/dsh-purge/issues/3) 的复现、源码定位与验证反馈，以及 [@luowang-ui](https://github.com/luowang-ui) 在 [PR #1](https://github.com/kingcharleslzy-ai/dsh-purge/pull/1) 中修复桌面 CLI 的同步原子复制问题。感谢 [@OGHong](https://github.com/OGHong) 在 [issue #5](https://github.com/kingcharleslzy-ai/dsh-purge/issues/5) 中定位 Electron ASAR 自检误判并提供验证证据。完整名单见 [CONTRIBUTORS.md](CONTRIBUTORS.md)。

## 来源

上游 [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge)（作者 **小杨**，MIT）。本分支独立维护，保留 Git 历史、署名与许可证；第三方来源见 [NOTICE](NOTICE.md)。包名、发行与更新源由本仓库管理。

插件负责拆 harness 与宿主默认策略的闸，不替模型判断某件事该不该做；最终输出仍取决于模型本身。
