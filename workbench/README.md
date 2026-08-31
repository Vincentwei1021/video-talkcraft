# TalkCraft Workbench · 动效工作台

剪映式的动效编辑工作台：时间轨 + 多轨道 + 属性面板，把 78 张动效卡拆成可调属性来编排。

```bash
cd workbench
npm install
npm run dev        # http://localhost:5199
```

## 能做什么

- **时间轨**：多轨道（上层轨覆盖下层轨）、拖拽移动、两端裁剪、跨轨拖动、吸附（播放头/相邻片段边缘）、缩放、分割（S）、复制（⌘D）、删除
- **卡片属性**：每张接入的卡声明自己的 schema（文字内容、字号、颜色、强调色、动画节奏参数），属性面板按 schema 自动渲染控件
- **通用属性**（任何卡都有，无须改卡）：
  - 时间：起点 / 时长（可短于或长于卡片原始时长——裁剪 / 尾帧定格延长）
  - **变速**：0.25×–4×，基于 Remotion `<Freeze>` 时间重映射，对所有卡安全（卡片全部是 frame 的纯函数）
  - **裁入点**：从卡片素材第几秒开始播（= 调进场时机）
  - 图层：不透明度 / 缩放 / 位移 X/Y
- **预览**：`@remotion/player` 实时播放，播放头与时间轨双向同步
- **工程**：自动保存 localStorage，导出 / 导入 JSON，撤销 / 重做（⌘Z / ⇧⌘Z）

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
  store.ts              zustand 状态仓库（撤销栈 / 自动保存）
  preview/Composition.tsx   clip → <Sequence> + TimeRemap(Freeze) + 图层包裹
  preview/PreviewPanel.tsx  Player + 走带控制
  timeline/             标尺 / 轨道 / clip 拖拽裁剪
  panels/               素材库 / schema 驱动的属性面板
  cards/                参数化卡片 + 注册表
```

## 接入更多卡（78 张卡的参数化模式）

每张卡来自 `template/cards/<id>.tsx`（正主），接入步骤：

1. 复制到 `src/cards/<id>.tsx`，把 CONFIG 中"**语境级**"参数（文案、颜色、字号、起手静置等）提为组件 props；"**节奏命门**"参数（各段时长/错峰比例）保持 `FIXED` 不暴露——命门交给 clip 级变速统一调
2. 导出 `CardDef`：`{ id, name, category, durationInFrames, component, schema }`
3. 在 `cards/registry.ts` 的 `CARD_LIST` 里注册即可，属性面板与时间轨自动生效

已接入：通用文字（工作台原生）、冲击开场、数字重音标题、荧光笔高亮、章节标题卡。

## 已知边界（v1）

- 同轨允许 clip 重叠（同轨内后开始的画面在上）；用多轨道表达明确层级
- 变速只做匀速重映射（曲线变速未做）
- 尚未接渲染导出（Player 预览为主）；工程 JSON 已含全部信息，后续可直接喂 Remotion CLI 渲染
