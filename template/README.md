# 模板件说明

## cards/（78 张动效卡的逐卡自包含 tsx，2026-08-28 起）

每张配方卡一个单文件 Remotion 源码（`cards/<slug>.tsx`），与 `demos/<slug>/index.html`
逐帧同画面——skill 做片选卡后**以它为实现基准**，复制进工程改顶部 CONFIG 即用。
契约见 `references/demo-spec.md`「tsx 源码硬性要求」：只 import react/remotion、
`export const meta`（尺寸/fps/时长）+ default 组件、演示语境素材经 `hostSrc?/handSrc?` prop
注入（不传则灰阶剪影/矢量兜底）。改 HTML demo 后必须同步改对应 tsx。

## motion-systems/（来自 ai-math-video，反 PPT 四系统 + 桥）

从可工作项目原样抽出、import 已收敛到目录内。用法见 `references/cinematography.md`。
**拷贝方式：整目录平铺进新工程的 `remotion/src/`**（timing.ts 的 `./timing.json`、
SKILL.md 的 `make_timing.py ... remotion/src/timing.json` 输出路径、文件间相互 import
都以平铺为前提；不要拷成 `src/motion-systems/` 子目录）。

| 文件 | 内容 | 注意 |
|---|---|---|
| camera.tsx | CameraRig / Plane / useCamera | L1 相机 + L5 视差核心，直接照抄 |
| life.tsx | Live / Defocus / idle / phaseOf | idle + 让位状态机，直接照抄 |
| env.tsx | Environment / GridField | **ACTS/EXPOSURE_HITS/TRANSITION_FLASHES/VIGNETTE_TIGHTEN 四张表是每片配置**，新项目必须重写表内容 |
| anime-remotion.ts | useAnimeTimeline | anime.js v4 ↔ Remotion seek 桥（杀 rAF 主循环） |
| three-anime.ts | useThreeAnime / ThreeCtx | three ↔ anime 桥；remotion.config 需 `setChromiumOpenGlRenderer('angle')`；依赖 `animejs/adapters/three` |
| timing.ts | tSay / msSay / sceneFrameRanges | 依赖同目录 `timing.json`（由 `scripts/make_timing.py` 从 timestamps.json 生成） |
| shots.ts | Shot 类型 / shotSequence / L() | **表驱动镜头脚本的骨架**；SHOTS 数据是上一片的，新项目照格式重写 |
| transitions.tsx | ShotFade + 六式转场（CamKey 生成器 + Overexpose/Shatter/ParticleDrift） | 生成器 spread 进 shots.ts 的 path；每式一张卡：push-through / overexpose-flip / whip-pan / black-slam / pullback-cool / particle-weld-transition |
| longtake.tsx | WorldRig/WorldPlane/WorldItem/useArrive 长镜头世界画布 | 已实战（deepseek-harness-v2 V3 幕 23s 三站）；两坑：世界网格自铺大 div、站点内容自证视觉中心（见文件注释） |
| time.ts | useAbs/useToLocal 时间基收敛 | 三种时间基（绝对秒/shot-local/Sequence-local）的唯一换算处，场景组件一律经它 |
| hooks.ts / theme.ts / ui.tsx | useSceneSec、默认主题、Chars/Particles/rand | theme.ts 按 `references/design-language.md` 派生（深空蓝是深底模式实战变体）；rand(seed) 是全项目唯一随机源 |
| Subtitles.tsx / Counter.tsx | 素排字幕（整句硬现，keywords prop 做 ≤3 次关键词弹出）/ 数字滚动 | 字幕默认即横屏红线（bottom 100/字号44/宽66%），竖屏传 props；Counter 的 startSec 需 +SHOT.lead/fps（已知坑） |
| MainVideo-example.tsx | Sequence 重叠 + ShotFade + hardOut 的组装范例 | 仅作参考，scene import 指向原项目 |

依赖：`remotion@4.0.x` 必装；`animejs@^4.5` / `three@^0.170` **仅两座桥需要**——
不用 anime/three 桥的工程直接删掉 `anime-remotion.ts` / `three-anime.ts`（留着不装依赖 tsc 必挂）。

## components/（来自 deepseek-harness demo，即取即用件）

lib.tsx（keyframes/DirBlur/缓动/drift）、components.tsx（Subtitles 整句硬现版/FlowerWord/SmashWord/HighlightSweep/Card/Screenshot/NumberRoll/DrawPath/Chip/TypeCode）、pencil.tsx（PencilDraw 铅笔手绘）、mascot.tsx（r(θ) 形变吉祥物）。
组件级动效参数已按逐帧调研标定，坑和参数依据见 `references/cards/` 对应卡。

## 音频时间戳

TTS 合成/数字人生成是制作端输入，不在本库（2026-08-28 定版）。字级时间戳用库内
`scripts/timestamps_cpu.py`（本机 CPU，FireRedASR2-CTC 默认 / faster-whisper 备选，+ 口播稿逐字对齐）。
