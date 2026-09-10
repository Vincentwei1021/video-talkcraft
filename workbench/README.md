# TalkCraft Workbench · 动效工作台

剪映式的动效编辑工作台：多轨时间线 + 素材库 + schema 属性面板。108 张动效卡与口播成片的每个单元（镜头/字幕句/音效/转场/环境）都能拆成独立 clip 编排，文字内容、颜色、字号、位置逐项可调。

📖 **图文指南：[GUIDE.md](GUIDE.md)**——五个区域的功能逐一截图讲解（素材库 / 预览 / 属性面板 / 时间轨 / 拆解导入 / 导出）。

```bash
cd workbench
npm install
npm run dev        # http://localhost:5199
```

## 能做什么

- **素材库四 tab**：素材（成片/拆解单元/实拍文件，网格自动循环预览）· 动效库（**108 张卡全量**，按画廊 7 分类折叠，循环视频预览）· 音效（33 个全量）· 背景（design-language §1.1 预设背景 6 款：**pastel mesh（skill 默认幕底）**/浅底白/羊皮纸/深底近黑/细网格/居中追光，均可调参）。**点击=中屏预览，拖拽到时间轨=添加**
- **时间轨**：多轨道（上层覆盖下层，拖轨道头可排序）、拖拽移动、两端裁剪、跨轨拖动、吸附、分割（S）、复制（⌘D）、缩放/适配；三栏与时间轨均可拖拽分隔条调整尺寸
- **属性面板（schema 驱动）**：108 张动效卡 100% 参数化——全部文案（多条内容用逐行 DSL）、颜色、字号（派生几何等比联动）、内容块位置 posX/posY、语境节奏；动效节奏命门保持 FIXED 不暴露，保动效品相
- **通用 clip 属性**：起点/时长（裁剪/定格延长）、**变速 0.25×–4×**（`<Freeze>` 时间重映射）、**裁入点**、不透明度/缩放/位移。音频与视频素材卡走 `trimBefore`/`playbackRate` 原生通道，裁剪变速不哑音
- **口播成片拆解**（需链接外部工程，见下）：一键把成片拆为逐句字幕（127 句，文本可改）、23 个镜头（逐镜参数化卡，文案/颜色/字号/位置可调；词锚节拍/相机保持固定）、81 条音效（逐条可挪可调音量）、转场、数字人、环境层
- **保存**：每次改动自动存 localStorage（800ms 防抖 + 关页即时落盘），导出/导入工程 JSON，撤销/重做（⌘Z/⇧⌘Z）
- **导出成片**：顶栏「导出成片」→ dev server 内起 Remotion CLI 渲染当前工程为 MP4（内容精确时长、单并发保光栅一致），输出到 `exports/`，完成后一键在 Finder 显示
- **Remotion Studio 入口**：`npm run studio`（卡片 Zod schema 自动生成，官方 Inspector 调参 + 渲染 UI）

## 制作全程实时看板（L1）

skill 在 ⑤-1 合成骨架搭完就把工程接进来、开着工作台（SKILL.md ⑤-2），此后制作过程在这里实时可见：

- **阶段栏**（顶栏下）：①…⑧ 当前步高亮、hover 看产物路径；右侧镜头计数（占位 / 已实现 / 已渲 / 已过 / 过期 / P0-P1）与直播点（SSE 连接状态）。
- **进度轨**（时间轨最上一行，随标尺吸顶）：每镜一个色块——灰 占位 · 蓝 已实现 · 青 已渲 · 绿 已过闸 · 黄框 过期（场景文件比渲出的段新）· 红点 未清 P0/P1。
  点一下：播放头跳到该镜，属性面板切成**镜头视图**（区间 / 场景文件 / 渲出时间 / 单镜有声预览可直接播 / 未清 issues / 评审提及 / SHOTBOOK 段落）。
- **成片（实时）**：`?live` 打开或点「▶ 实时看板」，时间线装上接入工程的主合成（一条轨一个 clip，画幅随工程横竖屏），
  agent 存盘即经 Vite HMR 刷新。工程代码有语法错时**不再盖整页**（右下角提示 + 画面停在上一版）；单 clip 渲染出错只把那一格画红。
- **状态从哪来**：dev server 按盘上产物实时推导（`scripts/pipeline_state.mjs` 的 `derivePipeline`：shots.json → SCENES 表 / scenes/ 文件 → out/segments|preview → review/*.md），
  再合上工程根 `pipeline.json` 里 `manual` 一节（`--pass` / `--issue` / `--stage`，盘上推不出的才手写）。文件变化经 Vite 的 chokidar + 4s 兜底轮询，只在状态变了才推（`/api/pipeline/events`）。
- **拆解导入可增量同步**：拆解单元 id 稳定（`kb-shot-s03`、`kb-sfx-12`…），再点一次变成「⟳ 同步拆解」——起点 / 时长跟新，你改过的文案 / 颜色 / 图层保留。
- 看板只看不驱动：没有"点按钮触发某一步"的接口，skill 是主控。设计、取舍与 L2（配音预剪波形视图 + 双向编辑契约）见 [docs/live-pipeline.md](docs/live-pipeline.md)。

## 接入口播成片工程（可选）

口播拆解、逐镜编辑、成片素材依赖一个外部 Remotion 工程（video-talkcraft skill 的产物），通过符号链接接入（机器本地路径，不进库）：

```bash
cd workbench
ln -sfn /path/to/<口播工程>/remotion/src kbsrc
mkdir -p public
for f in /path/to/<口播工程>/remotion/public/*; do ln -sfn "$f" "public/$(basename "$f")"; done
```

链接后跑一次 `npm run gen`（`npm install` 的 prepare 与 dev/build/studio 的前置钩子也会跑）：它扫描 `public/`
生成素材清单 `src/mediaManifest.ts`，并从工程读出换幕时刻表生成 `src/kbMeta.ts`——两个文件按本机链接生成、不进库。
换幕时刻表的取值顺序：工程 `Environment.tsx` 导出的 `WIPE_TIMES`（推荐显式导出）→ 其中 ShapeWipes 的 `times = [...]`
字面量 → `beats.json` 里 `what` 含 wipe/换幕 的 `t`；都没有则转场轨为空并在控制台提示。
未链接时工程照常构建运行（`@kbsrc` 自动落到 `kbsrc-stub/` 降级实现），口播相关卡显示占位提示，素材清单为空。

**解析规则（`kbsrc.map.mjs`，Vite / Remotion CLI / `npm run gen` 三处共用）**：

- `@kbsrc` 指向链接的**真实路径**，工程 `src/` 里引 `src/` 之外的文件（如 `../shots.json`）照常成立；
  `react` / `react-dom` / `remotion` 去重到本工程的 node_modules（工程自己的 node_modules 只供它的其它依赖，如 animejs）。
- **契约模块 = `kbsrc-stub/` 里的每个文件**（camera / Environment / Host / PromoScenes / Subtitles / theme / timing / longtake / shots / sfx / cards/…）：
  接入工程有同名文件就用真实的，没有就那一个模块回退 stub——缺文件只影响用到它的卡，不再整页 500。
- 导出形态差异（有文件但缺某个导出、字段改名，如 `CUES` vs `SFX_CUES`、shots 无 `label` / `darkAt`）由 `src/kb/*.ts` 适配层归一，
  工作台源码只从 `src/kb/` 取接入工程的东西，不直接 `import "@kbsrc/…"`。
- **两种接入形态**：口播成片 promo 工程（全部契约模块都有）→ 拆解导入 / 逐镜参数化 / 数字人 / 环境全可用；
  skill 正式产出的工程（`Main.tsx` + `scenes/` + `motion-systems/`，没有 PromoScenes 等模块）→ 页面、素材、导出照常，
  「拆解导入」按钮禁用并说明原因（`kbMeta.ts` 的 `KB_PROMO=false`），promo 专属卡不进素材库。
  `npm run gen` 的末行会打印接入工程名、真实模块数、是否满足拆解契约、主合成模块与画幅。

## 快捷键

| 键 | 动作 |
|---|---|
| 空格 | 播放 / 暂停 |
| S | 在播放头处分割选中片段 |
| Delete / Backspace | 删除选中片段 |
| ⌘D | 复制选中片段 |
| ⌘Z / ⇧⌘Z | 撤销 / 重做 |
| ← / →（+Shift） | 步进 1 帧（10 帧） |

## 架构

```
src/
  types.ts              数据模型：Project → Track → Clip（时间量单位=帧）
  store.ts              zustand 状态（撤销栈 / 自动保存）
  dnd.ts                素材库 → 时间轨拖拽协议
  kouboImport.ts        口播成片一键拆解导入器
  preview/Composition.tsx   clip → <Sequence> + TimeRemap(Freeze) / 媒体原生通道
  preview/PreviewPanel.tsx  Player + 走带 + 素材点击预览
  timeline/             标尺 / 轨道 / clip 拖拽裁剪 / 拖放接收
  panels/               素材库四 tab / schema 属性面板
  remotion/             Remotion CLI 入口（Studio + 渲染导出共用 Main 合成）
  kb/                   接入工程适配层：按契约归一导出形态（缺导出 / 改名 → stub 兜底），工作台源码只从这里取接入工程的东西
    liveProject.ts      实时看板工程：一条轨一个 kb-main clip（接入工程主合成）
  pipeline/             实时看板：store（SSE 客户端 + vite:error 接住）/ StageBar / ProgressTrack / ShotPanel / CodeErrorToast
  cards/
    registry.ts         注册表：手写核心卡 + gen 参数化卡 + 模板卡兜底
    gen/                批量参数化产物（108 卡 + 23 口播镜头 kscene-*）
    gen-index.ts        静态索引（scripts/gen-index.mjs 生成，webpack/Vite 双兼容）
    background-cards.tsx 预设背景 6 款（design-language §1 色板 + §1.1 背景菜单）
    templateCards.ts    template/cards 全量接入（tplcards 相对符号链接 + @tpl 别名）
    tplMeta.ts          卡 id → 中文名/分类（由 gallery 数据生成）
scripts/gen-index.mjs   卡片静态索引生成（dev/build/studio 前置钩子自动跑）
remotion.config.ts      Remotion CLI 打包配置（@kbsrc/@tpl 别名 + 单并发）
vite.config.ts          Vite + 导出渲染 API（POST /api/export → Remotion CLI）+ 实时看板 API（/api/pipeline[/events|/shotbook|/file|/refresh]）
kbsrc.map.mjs           kbsrc 解析地图：真实路径 + 契约模块逐个回退 stub（vite.config / remotion.config / gen-index 共用）
kbsrc-stub/             外部口播工程未链接（或缺某模块）时的降级实现——它的文件清单就是契约
exports/                导出成片输出目录（不进库）
```

## 参数化模式（新卡接入）

模板卡在 `template/cards/<id>.tsx`（正主）。参数化：复制到 `src/cards/gen/<id>.tsx`，把 CONFIG 中"语境级"参数（文案/颜色/字号/位置/起手静置；数据类用 textarea 逐行 DSL）提为 props + schema，"节奏命门"保持 FIXED；`export const card: CardDef`，registry 自动 glob 收集。

## 已知边界

- 同轨允许 clip 重叠（层级用多轨表达）；变速为匀速重映射（无曲线变速）
- 口播拆解后相邻动效镜头各自带 8 帧重叠——这是原片的交叠转场设计（前后镜头在换幕期间同时在场），不是 bug；对齐首尾会丢转场交叠
- 口播镜头改文案不改节拍——动效时机锚在原配音词级时间戳上；换口播词需重新走生产管线（配音+时间戳）
- 拆解导入 / 逐镜参数化卡（kscene-sNN）是按口播成片 promo 工程做的：接入形态不同的工程时它们自动隐藏 / 禁用，成片预览、素材、导出不受影响
- 导出成片走 dev server（`npm run dev` 时可用）。Remotion 静态服务器**拒绝服务符号链接**（默认 404），
  所以导出前会自动把 `public/` 解引用同步到 `.render-public/` 再渲染；命令行手动渲染同理：
  `npx remotion render src/remotion/index.ts Main out.mp4 --props=<{"project":…,"renderExact":true}> --public-dir=.render-public`
