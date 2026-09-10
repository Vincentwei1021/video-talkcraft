# 工作台全流程直播 · 设计与实现记录

> 状态（2026-09-11）：用户拍板"先修 kbsrc 解析问题，再做 L1"。**缺口 4 已修**（PR #31：真实路径 + 契约模块逐个回退 + `src/kb/` 适配层），
> **L1 已实现**（本 PR）：`scripts/pipeline_state.mjs` 状态推导 + `pipeline.json` 手工字段 · dev server `/api/pipeline` + SSE ·
> 阶段栏 / 进度轨 / 镜头视图 · `kb-main` 实时成片卡（动态 import 隔离半成品）· `hmr.overlay=false` + 角落提示 + 单 clip ErrorBoundary ·
> 拆解导入稳定 id + 增量同步 · SKILL.md ⑤-2 前移接入（L0 一并落地）。**L2 未做**（§3 L2、§7 问题 2/3 仍待拍板）。
> §1–§8 保留为当时的分析原文；与实现的差异见文末「§9 实现与提案的差异」。

## 0 一句话

把工作台从"⑧ 交付后的后期台"前移成"制作全程的实时看板"：skill 每一步的产物（②-0 配音预剪 EDL → ② 时间戳 →
④ SHOTBOOK / shots.json → ⑤-1 骨架与首镜 → 其余镜头 → 音效 → ⑥⑦ 渲染验收）一落盘就在工作台时间线上出现，
用户随时能看到"做到哪了、哪镜什么状态"，能预览、能微调，不用等成片。

## 1 现状盘点：已经有的、能直接复用的

| 已有能力 | 在哪 | 对"直播"意味着什么 |
|---|---|---|
| Player 直接跑接入工程源码 | `kbsrc` 符号链接 + Vite HMR（`vite.config.ts` preserveSymlinks） | **"实时"这一层其实已经存在**：agent 保存 tsx，预览秒级刷新。只是流程上到 ⑧ 才接入 |
| 拆解导入 `buildKouboProject()` | `src/kouboImport.ts`：从 `SHOTS / SFX_CUES / phrases / WIPE_TIMES` 生成多轨工程 | 这就是"制作中间态 → 时间线"的映射器。缺点：一次性快照，uid 每次重生成，不能增量同步 |
| ⑤-1 首镜先做先确认 | PR #26：合成骨架先搭全、其余镜头 `PlaceholderScene` 占位 | 骨架 = 工作台需要的"进度容器"：全部镜头从第一天起就在时间线上，只是空的 |
| 单镜有声预览 / 分段母版 | `scripts/render_shots.mjs --only sNN --seg-audio --preview-dir` | 每镜的"已渲"态有现成产物（`out/segments/sNN.mp4`、`out/preview/sNN.mp4`） |
| 导出任务 store + 浮层 | PR #29 `src/exportJob.ts` | 进度轨的"渲染中 / 已渲"状态可以复用同一套任务模型 |
| 配音预剪 EDL | PR #28 `audio/cuts.json`（含 `keep` 源 → 新时间轴映射表） | 音频剪辑阶段有了机器可读的数据源，只差可视化 |
| 机器闸产物 | `qa/motion_*.txt`、`sfx_mix_*.txt`、`REVIEW*.md`、`beats.json` | 每镜"过闸 / P0 / P1"状态的原料都在，只是散落 |

结论：**不是从零做一个新东西**，而是把已有的三块（HMR 预览、拆解映射器、骨架）用一份状态清单串起来，再补两个视图。

## 2 缺口（按痛感排序）

1. **阶段状态无处可读**。skill 各步产物散在 `audio/ SHOTBOOK.md remotion/shots.json beats.json src/sfx.ts out/ qa/`，
   没有一份机器可读的"现在到哪一步、每镜什么状态"。工作台想画进度，第一步得有这个文件。
2. **拆解导入是快照不是同步**。文件变了要手动再点一次，且 uid 重生成会丢掉用户已做的微调。
3. **音频剪辑阶段没有视图**。`voice_trim --dry-run` 的"给用户过目"目前是终端里读一张表；没有波形、没有切段高亮、没法点一下听前后一秒。
4. **接入方式脆**。`kbsrc` 符号链接 + `symlinks:false` 让工程引 `src/` 之外的文件时整页挂——2026-09-10 test04 实测：
   `src/shots.ts` 引 `../shots.json`，Vite 整页 500、Remotion 导出 bundling 失败。直播模式下工作台会常开，这个坑会被更频繁踩到。
5. **半成品代码会盖住整页**。agent 写到一半保存、tsx 语法错 → Vite 错误 overlay 盖住全部 UI；直播场景里这是常态而非偶发。
6. **双写冲突**。用户在工作台把某镜字号调小，agent 下一轮按 SHOTBOOK 重写该镜 tsx，改动被冲掉；反过来工作台也不该改 tsx。

## 3 方案：三层递进，每层独立可交付

### L0 · 零代码，只前移流程（改 SKILL.md 即可）

- ⑤-1 骨架搭完就执行 ⑧ 里的那段接入命令（`ln -sfn … kbsrc` + `npm run dev`），而不是等交付；首镜的"样板确认"直接在工作台里看。
- 成本为零。会立刻暴露缺口 4 与 5，所以 L0 本身就是 §6 的实验 1。

### L1 · 状态清单 + 进度轨（工作台真正"看得见进度"）

**数据**：工程根一份 `pipeline.json`，skill 每步落盘后更新（写法进 SKILL.md 各步末尾，一行命令 / 一次 JSON 写入）：

```json
{
  "updatedAt": "2026-09-11T10:20:00+08:00",
  "stage": "⑤",
  "stages": [{ "id": "②-0", "status": "done", "artifacts": ["audio/cuts.json", "audio/full.wav"] }, { "id": "⑤", "status": "running" }],
  "voice": { "raw": "audio/raw.wav", "cuts": "audio/cuts.json", "cleaned": "audio/full.wav", "timestamps": "audio/timestamps.json" },
  "shots": [
    { "id": "s01", "status": "passed",      "preview": "remotion/out/preview/s01.mp4", "issues": [] },
    { "id": "s02", "status": "implemented", "issues": [] },
    { "id": "s03", "status": "placeholder", "issues": [] },
    { "id": "s07", "status": "rendered",    "issues": [{ "level": "P1", "text": "字幕带压到人脸安全区 12.3–12.8s" }] }
  ]
}
```

`shots[].status` 五态：`planned`（只在 SHOTBOOK 里）→ `placeholder`（骨架占位）→ `implemented`（tsx 落地）→ `rendered`（段已渲）→ `passed`（机器闸 + 审片过）；
`issues` 从 `REVIEW.md` / 机器闸输出抽取。

**视图**：

- 顶部一条阶段栏 ①…⑧，当前步高亮，hover 看产物路径。
- 时间线最上面新增一条**进度轨**：每镜一个色块（灰 = 占位 / 蓝 = 已实现 / 青 = 已渲 / 绿 = 已过 / 红 = 有 P0/P1），
  点击跳播放头到该镜，右侧面板显示该镜的 SHOTBOOK 段落 + issues；有 `preview` 的镜头可直接播那条有声单镜预览。
- 拆解导入改为**增量同步**：以 `shot.id`、`cue` 序号、字幕句序号为稳定 key 做 diff 合并（新增补、删除去、变更更新时间与默认 props），
  用户改过的 props 字段保留不覆盖。

**推送**：dev server 用 chokidar 监听 `pipeline.json / shots.json / beats.json / cuts.json / timestamps.json`，
SSE（`/api/pipeline/events`）推到前端；tsx 改动仍走 Vite HMR，不重复造轮子。

**半成品保护**：`server.hmr.overlay = false` + 每个 clip 包 `ErrorBoundary`——单镜报错只把那一格画红、面板显示错误行，不盖全页。

### L2 · 配音预剪视图 + 双向编辑契约

- **配音轨画波形**：`voice_trim` 顺手产出 `peaks.json`（10ms RMS 已经算了，直接落盘），前端 canvas 自绘；
  `cuts.json` 的每段 cut 画成红色遮罩，标 `kind`（filler / repeat / pause）和 `conf`；点一段 → 播它前后各 1s 原声；
  勾「保留这段」或在波形上加一段 → 写 `cuts.json` 的 `overrides`，重跑 `voice_trim --apply-overrides` → 再跑时间戳。
  这就是 ②-0"dry-run 报告给用户过目"的 GUI 版，也是用户最可能真正动手的地方。
- **双向编辑契约**（解缺口 6）：工作台只写一份 `workbench-overrides.json`（按 `shot.id` / cue 序号 / 字幕句序号索引，记录用户改动的**语境级** props：
  文案 / 颜色 / 字号 / 位置 / 音量 / 起止微调）；agent 生成或重写 kscene / sfx / 字幕时**读并合并**这份文件；
  agent 永不改 overrides，工作台永不改 tsx。kscene 参数化卡本来就是 props 驱动，天然契合；导出成片时 overrides 也一并生效。

## 4 数据流

```
 skill（主控）                       文件（唯一真值）                         工作台（看板 + 微调面）
 ─────────────                      ──────────────────                       ──────────────────────
 ②-0 voice_trim ──────────────▶ audio/cuts.json + peaks.json ──chokidar/SSE──▶ 配音轨：波形 + 切段遮罩（L2）
 ②   timestamps_cpu ──────────▶ audio/timestamps.json ───────────────────────▶ 字幕轨（现有拆解逻辑）
 ④   SHOTBOOK / shots.json ───▶ remotion/shots.json + beats.json ───────────▶ 镜头轨（全部占位块，L1）
 ⑤-1 骨架 + 首镜 tsx ─────────▶ remotion/src/**  ─────────Vite HMR──────────▶ Player 预览（已有）
 ⑤   其余镜头 / sfx.ts ────────▶ 同上 ────────────────────────────────────────▶ 镜头块变蓝、音效轨补齐
 ⑥⑦ render_shots / 机器闸 / 审片 ▶ out/preview/*.mp4 + qa/* + REVIEW.md ─────▶ 进度轨变青 / 绿 / 红（L1）
 每步末尾 ──────────────────────▶ pipeline.json（阶段 + 每镜状态）───SSE──────▶ 阶段栏 + 进度轨（L1）
                                                                              │
 agent 生成 / 重写 tsx 时读并合并 ◀── workbench-overrides.json ◀──────────────┘ 用户微调（L2，只写这一份）
```

## 5 风险与取舍

- **性能**：直播工程是 1920×1080 全量 kscene + 字幕 + 音效在浏览器 Player 里跑；已知命门是 playhead 重渲染隔离（`workbench-project` 记忆），
  进度轨 / 阶段栏必须像 `PlayheadLine` 一样只订阅自己那一小片状态。SSE 用增量 patch，不整份重建工程。
- **"看见的 = 渲出的"**：这条已经成立（同一套 Remotion 合成），但要注意工作台 `Main` 是拆解重组版、工程 `MainVideo` 是原版——
  骨架期 `PlaceholderScene` 在工作台里如何呈现？→ `kscene-sNN` 缺失时回退 `koubo-shot` 通用卡，再缺失就画占位块（进度轨灰块已经承担了这层语义）。
- **接入脆弱**（缺口 4）是 L1 的前置：`kbsrc` 别名改为 realpath 解析 + `symlinks: true`，`react / remotion` 用 `resolve.dedupe` 防双实例。
  这是一个独立的小修，建议先于一切做（今天就撞上了）。
- **别做的**：不要让工作台变成 agent 的驾驭器（按钮触发某一步）。skill 是主控、工作台是看板 + 微调面；
  反过来做会把用户 2026-09-09 已否决的"机器闸"复杂度从另一边带回来。也不做"节拍级"进度（beats 级太细，看板会变成 lint 输出）。
- **成本感**：L0 零成本；L1 约 2–3 个工作日（pipeline.json 写入点 ×8、chokidar+SSE、进度轨、增量 diff、ErrorBoundary）；
  L2 约一周（波形 + 切段交互 + overrides 合并进 agent 生成流程，后者要动 SKILL.md ⑤ 的生成契约）。

## 6 最小实验（把"共同未知"变成可验证的）

| # | 实验 | 单一变量 | 成功信号 | 失败信号 | 回收数据 |
|---|---|---|---|---|---|
| 1 | L0：下一个真实项目，⑤-1 骨架搭完立刻接入工作台常开，agent 照常做其余镜头 | **接入时机**（⑤-1 vs ⑧） | 每个新镜头在 agent 保存后 ≤3s 出现在预览，全程不用手动刷新 | 页面被 overlay 盖住 / 需手动刷新 ≥3 次；用户全程没看一眼 | 崩溃次数、HMR 延迟、用户看的频次与在哪一步看 |
| 2 | 缺口 4 修法：`kbsrc` 改 realpath + dedupe，在 test04 上验 | 解析策略 | `../shots.json` 可解析、无 react 双实例、导出 bundling 通过 | 双实例报错或 HMR 失效 | 一次性验证即可 |
| 3 | L1 原型：手写一份 `pipeline.json` + 进度轨只读版（无 SSE，刷新读） | 有 / 无进度轨 | 用户在制作中至少主动看了 3 次、能凭它说出"还差哪几镜" | 用户仍然只看终端 | 看的次数、问的问题类型 |

实验 1 不写代码就能跑，建议下一个项目就做；实验 2 是 L1 的地基，随手就能修；实验 3 决定 L1 值不值得做全。

## 7 需要拍板的三个问题

1. **进度粒度**：镜头级（本文方案）够不够？还是要到节拍级？（建议镜头级，节拍级留给 beat_lint 输出。）
2. **配音预剪视图要不要可改**：只把 dry-run 报告 GUI 化（看 + 听），还是允许勾选保留 / 加剪并写回（L2 前半）？
3. **双向编辑是否必须**：如果用户微调只在成片后做（现状），L2 后半的 overrides 契约可以砍掉，L1 就是终点。

## 8 与近期 PR 的关系

- #26 ⑤-1 骨架：L0 / L1 的前提（全部镜头从第一天起就在时间线上）。
- #28 `voice_trim` / `cuts.json`：L2 配音视图的数据源；`peaks.json` 是它顺手能产出的增量。
- #29 透明导出 / `exportJob.ts`：进度轨"渲染中"态与右下角浮层可复用同一任务模型。

## 9 实现与提案的差异（2026-09-11，L1 落地时）

- **状态由工作台服务端实时推导，不靠 skill 每步写入**：提案是"skill 每步末尾更新 `pipeline.json`（写入点 ×8）"；实现改为 dev server 直接 import
  `scripts/pipeline_state.mjs` 的 `derivePipeline`，按盘上产物算（shots.json → SCENES 表 / scenes/ 文件 → out/segments|preview → review/*.md），
  `pipeline.json` 只保留盘上推不出的 `manual`（`--pass` / `--issue` / `--stage` / `--note`）。写入点从 8 个降到"过闸时 `--pass`、有缺陷时 `--issue`"两个。
- **issues 分两层**：手工 `--issue` 才算"未清"（红点）；REVIEW 里 `[P0]/[P1]/[P2]` 点名镜头的行自动抽成 `mentions`，只在镜头面板里可展开看
  （test04 实测 4 份 REVIEW 抽出 155 条，绝大多数早已修掉——若计红点整条进度轨全红）。
- **画面源是"整条主合成一个 clip"，不是逐镜 clip**：skill 正式工程没有 promo 形态的 PromoScenes 契约，逐镜卡无从拆；
  `kb-main` 按实时代码渲整条 `Main`，进度轨负责逐镜导航。逐镜 clip 化留给拆解导入（promo 形态）。
- **`kb-main` 动态 import**：工程代码语法错时只这张卡报错、初次载入也不白屏；Remotion CLI 导出下 Suspense 正常（已验 2 帧）。
- **发现一个工程侧规则**：`Main` 里调 `getInputProps()` 在 Player 必抛（test04 / promo 都这么写）——看板那一格会红并给出改法提示；SKILL ⑤-2 新增"别在组件里调 getInputProps"。
- **监听**：借 Vite 自己的 chokidar（`server.watcher.add`）+ 4s 轮询兜底（out/ 等目录首次渲染才出现），只在状态 JSON 变了才推。
- **L0 一并落地**：SKILL ⑤-2 把接入时机前移到骨架搭完，`?live` 直接装上实时成片。

