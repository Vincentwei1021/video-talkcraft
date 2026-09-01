# TalkCraft Workbench · 动效工作台

剪映式的动效编辑工作台：多轨时间线 + 素材库 + schema 属性面板。78 张动效卡与口播成片的每个单元（镜头/字幕句/音效/转场/环境）都能拆成独立 clip 编排，文字内容、颜色、字号、位置逐项可调。

```bash
cd workbench
npm install
npm run dev        # http://localhost:5199
```

## 能做什么

- **素材库四 tab**：素材（成片/拆解单元/实拍文件）· 动效库（**78 张卡全量**，按画廊 7 分类折叠，循环视频预览）· 音效（33 个全量）· 环境光效。**点击=中屏预览，拖拽到时间轨=添加**
- **时间轨**：多轨道（上层覆盖下层）、拖拽移动、两端裁剪、跨轨拖动、吸附、分割（S）、复制（⌘D）、缩放/适配；三栏与时间轨均可拖拽分隔条调整尺寸
- **属性面板（schema 驱动）**：79 张动效卡 100% 参数化——全部文案（多条内容用逐行 DSL）、颜色、字号（派生几何等比联动）、内容块位置 posX/posY、语境节奏；动效节奏命门保持 FIXED 不暴露，保动效品相
- **通用 clip 属性**：起点/时长（裁剪/定格延长）、**变速 0.25×–4×**（`<Freeze>` 时间重映射）、**裁入点**、不透明度/缩放/位移。音频与视频素材卡走 `trimBefore`/`playbackRate` 原生通道，裁剪变速不哑音
- **口播成片拆解**（需链接外部工程，见下）：一键把成片拆为逐句字幕（127 句，文本可改）、23 个镜头（逐镜参数化卡，文案/颜色/字号/位置可调；词锚节拍/相机保持固定）、81 条音效（逐条可挪可调音量）、转场、数字人、环境层
- **保存**：每次改动自动存 localStorage（800ms 防抖 + 关页即时落盘），导出/导入工程 JSON，撤销/重做（⌘Z/⇧⌘Z）
- **Remotion Studio 入口**：`npm run studio`（卡片 Zod schema 自动生成，官方 Inspector 调参 + 渲染 UI）

## 接入口播成片工程（可选）

口播拆解、逐镜编辑、成片素材依赖一个外部 Remotion 工程（video-talkcraft skill 的产物），通过符号链接接入（机器本地路径，不进库）：

```bash
cd workbench
ln -sfn /path/to/<口播工程>/remotion/src kbsrc
mkdir -p public
for f in /path/to/<口播工程>/remotion/public/*; do ln -sfn "$f" "public/$(basename "$f")"; done
```

未链接时工程照常构建运行（`@kbsrc` 自动落到 `kbsrc-stub/` 降级实现），口播相关卡显示占位提示。

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
  cards/
    registry.ts         注册表：手写核心卡 + gen/ 自动收集 + 模板卡兜底
    gen/                批量参数化产物（78 卡 + 23 口播镜头 kscene-*）
    templateCards.ts    template/cards 全量 glob 接入（tplcards 相对符号链接）
    tplMeta.ts          卡 id → 中文名/分类（由 gallery 数据生成）
kbsrc-stub/             外部口播工程未链接时的降级实现
```

## 参数化模式（新卡接入）

模板卡在 `template/cards/<id>.tsx`（正主）。参数化：复制到 `src/cards/gen/<id>.tsx`，把 CONFIG 中"语境级"参数（文案/颜色/字号/位置/起手静置；数据类用 textarea 逐行 DSL）提为 props + schema，"节奏命门"保持 FIXED；`export const card: CardDef`，registry 自动 glob 收集。

## 已知边界

- 同轨允许 clip 重叠（层级用多轨表达）；变速为匀速重映射（无曲线变速）
- 口播镜头改文案不改节拍——动效时机锚在原配音词级时间戳上；换口播词需重新走生产管线（配音+时间戳）
- 未接渲染导出——工程 JSON 已含全部信息，后续可喂 Remotion 渲染管线；Studio 的 Render 按钮可渲染单卡
