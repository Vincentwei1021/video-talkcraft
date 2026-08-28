# CLAUDE.md — video-talkcraft 项目约定

> Git 工作流（远端拓扑与 push 方式）在本地 `CLAUDE.local.md`，不进库。

## 什么不进库
- **制作的成品视频**（所有 `*.mp4`：交付件与 `remotion/out/` 渲染产物）。
- **单片制作工程**（`demo/` 整个目录：音频产物、截图素材、Remotion 工程、SHOTBOOK/REVIEW 过程产物）。
  它们只留在本地盘上；需要跨机器传成片用 scp，不走 git。
- node_modules / tools/.verify 截图缓存 / __pycache__。
- **库作者的制作端工具与过程资产**（2026-08-27 定版：仓库面向"用这个库做口播视频"的用户，
  制作库本身的东西不进）：PLAN.md、research/、references/research/ 调研原稿、
  sfx-studio/sfx-picker/merge-cues/sfx-audition 配音台工具链、demos/_lib/sfx/*.mp3 原始采样
  （内嵌版 sfx-samples.js 才是运行时依赖；ATTRIBUTION.md 留库记录授权）。

仓库只收 **skill 本体**：SKILL.md、references/（方法论+配方卡）、template/（可复制代码）、
scripts/（管线与验收工具）、demos/（配方卡 HTML demo）、gallery/。

## 目录内其他约定
- 本地 `demo/deepseek-harness*` 里的 SHOTBOOK/REVIEW/GAPS/LESSONS 是重要过程资产，虽不进库但不要删除。
