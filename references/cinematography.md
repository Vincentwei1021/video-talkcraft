# 电影感规范：消除 PPT 感（口播视频的镜头方法论）

来源：ai-math-video 项目多轮调试结论（诊断 → 重构 → 实测）。这不是可选的风格建议，
是**结构性要求**——不满足时成片必然像"播放 PPT"。

## 0. PPT 感的四个病根（自检用）

1. **没有相机层**：画布静止，元素只是在固定舞台上淡入滑入。加"每场景 100%→106% 慢推 + 前后景视差"就能消掉一半 PPT 感。
2. **元素入场后就死了**：动画全是 entrance（opacity/translate 到位即冻结）——这正是 PPT"进入效果"的模型。动画感来自持续运动。
3. **场景之间硬切翻页**：Sequence 边界内容整体瞬间替换。转场要靠**运动承接**，不是靠 crossfade。
4. **文档版式 + 信息堆积**：标题左上、要点网格是排版思路不是构图思路；元素只进不出，说到后面满屏静物。**一个节拍只讲一个主角**，说完就让位。

## 1. 七层镜头模型（词汇表）

| 层 | 职责 | 典型动作 |
|---|---|---|
| L1 相机 | 带观众穿过空间 | 推/拉/轨道环绕/dutch angle/持续微漂 |
| L2 焦点 | 决定什么在光学上可读 | 虚→实入场、rack focus、集体退焦只留主体 |
| L3 主体 | 唯一主角的运动与变形 | 入场、接力、morph、kinetic type |
| L4 附着效果 | 主体的材质与状态提示 | 辉光、rim、粒子、闪光 |
| L5 配角 | 与主体互动、强化主体 | 反向运动、光束、环、时间轴、视差层 |
| L6 环境 | 氛围与曝光 | vignette 呼吸、色温、扫光、曝光脉冲 |
| L7 遮罩 | 控制可见性与取景 | 描边旅行、扫描线揭示、clip reveal |

层预算：**英雄时刻 4–6 层活跃；过渡镜头 2–3 层；任何镜头不允许只有 1 层**（至少留相机微漂/焦点变化 + 环境响应）。

## 2. 四套全局系统（先于任何场景实现，模板已提供代码）

代码在 `template/motion-systems/`，全部确定性（零 Math.random）、seek-safe。

### G1 CameraRig（camera.tsx）
- 每场景一条**全程连续**的相机曲线（scale/x/y/rot/blur 各字段独立稀疏关键帧，inOutSine）。
- 重音词处叠加 3–6 帧**冲击脉冲**（scale +0.02~0.04 或 shake，二次衰减包络），**加法叠加、永不重置慢曲线**。
- `CamState`（含 progress）放进 Context；3D 场景用同一 progress 驱动 THREE 相机——一台相机两套投影。
- 相机路径 + impulses 集中在 shots.ts 一张表里（表驱动，与场景实现解耦），每条写导演意图注释。

### G2 Parallax 深度平面（camera.tsx 的 Plane）
- 场景内容分层：网格背景 depth 0.5、粒子 0.72、主内容 1.0、3D 画布 1.08、前景强调 1.12–1.2。
- `位移 = cam.x × (depth − 1)`，scale 同法偏置。背景永远进视差层，不做静态贴图。

### G3 Idle + Retire 让位状态机（life.tsx）
- 生命周期：forming → resolved → **handing-off** → gone，全部 frame 纯函数。
- resolved 期**必须有微动**：`idle(seed, frame)` 双不可通约频率正弦（scale ±0.5%、y ±3px、glow ±15%），seed 错开同屏元素相位。
- 让位规则：新主体入场帧 −6f，旧主体开始 `<Live retireAt={新主体锚点秒}>`（0.5s 内缩 0.92 + 上移 + 亮度 −66% + 3px 模糊）。声明式：把下一主体的 ASR 锚点直接传给上一主体。
- `<Defocus>` 做 L2 集体退焦（只加模糊降透明度，不动位置）。
- **让位有三种方式，按"这元素还回不回来"选**（2026-08-28 用户定版）：本拍讲完不再回指 →
  **真退场**（0.15–0.5s 出场后从版面消失）；马上还要回指/对照 → 降权留守（Live retire / Defocus，原位保留）；
  长镜头段 → 相机离开即让位。降权是合法手段，但**降权留守的元素仍占版面**——§4.5 排版预算
  （同屏 ≤3 组、空象限）必须把它计入；浅底上降权糊影依旧醒目，同屏留守别超 1 组。

### G4 Environment 常活层（env.tsx）
- 呼吸 vignette（8s 周期 ±6%）+ 12s 斜向扫光，全片不停，`mixBlendMode: screen`。
- 分幕色温做情绪曲线（幕边界 1.2s cross-fade——"让变化被感到而不是被看到"）。
- 重音帧三段曝光脉冲：2 帧升 / 2 帧平台 / 8 帧 quad-out 衰减。
- 四张事件表（ACTS/EXPOSURE_HITS/TRANSITION_FLASHES/VIGNETTE_TIGHTEN）是每片配置，不是库代码。

## 3. 运动转场库（Sequence 重叠 12–16 帧）

**硬规则（2026-08-27 用户定版）：每个镜头边界都必须有明确的转场处置，禁止裸切**——
六式之一 / caret-wipe / shape-wipe / 长镜头连续运镜，四选一；SHOTBOOK 里每个边界写明用哪式。
（black-slam 的"最后 1 帧 opacity=0 硬出"是设计过的转场，不算裸切；Sequence 边界内容无处置地
整体瞬间替换才是裸切。）

机制：shots.ts 里每镜头声明 `lead`（叙事前多渲的帧）和 `tail`，相邻 Sequence 重叠；
`ShotFade` 只做像素淡化，**运动由两侧相机曲线同向承接**。
代码：`template/motion-systems/transitions.tsx`——ShotFade + 六式的 CamKey 生成器
（pushThroughOut/settleIn/whipOut/whipIn/blowoutOut/pullBackIn，直接 spread 进 path）
+ 叠加层（Overexpose 过曝亮心、Shatter+ParticleDrift 粒子溶接）。

每式一张配方卡（参数表/已知坑/HTML demo 见 `references/cards/<slug>.md`）：

| 转场 | 出场侧 | 入场侧 | 卡 |
|---|---|---|---|
| 推穿 | 相机加速推 + blur 升 | 从模糊高 scale 起步反向沉降（同向） | push-through-transition |
| 过曝翻页 | 推向证据物至 1.5x + 白色径向过曝（不对称包络：切前 10 帧升、切后 10 帧降） | 从亮心拉出 | overexpose-flip-transition |
| whip-pan 甩镜 | x 甩出 + blur 8 + 微旋 | **同向**进入，0.35s 刹住 + 二段回稳 | whip-pan-transition |
| 黑震切 | 定格闪光 → 最后 1 帧 opacity=0（hardOut） | lead:0 满亮进场，且开场自带运动 | black-slam-transition |
| 后拉冷却 | 一切沉入近黑 + 色温转变 | 全片唯一 scale<1 起步后拉 + rack focus | pullback-cool-transition |
| 粒子溶接 | 主体碎成粒子（index 确定性函数）上飘 | 下一场的粒子/星野承接同位置生成（物质连续性） | particle-weld-transition |

黑震切全片只许用一次，留给最大反转。**一个边界只用一式**；100s 的片 5~7 个边界，重复用同式比六式全上更有风格连贯性。

### 3.5 长镜头模式（one-take，转场的替代范式）

多镜头是剪辑思维，长镜头是空间思维：全部内容钉在一张世界画布的不同坐标上，
一台相机随讲述**连续运镜**过去，新内容在镜头快到时才成形——没有 Sequence 切换，空间连续性本身就是转场。
代码 `template/motion-systems/longtake.tsx`（WorldRig 站点表 + WorldPlane 视差 + WorldItem 钉点 + useArrive 接近度揭示），
选型与铁律见 `references/cards/long-take-world.md`。适合有空间/流程/时间线隐喻的段落；
可以整幕用长镜头、幕间仍走六式转场。长镜头不豁免七层：idle/让位/环境照旧，
运镜速度 ≤1.5 屏宽/秒，站点布局要防"途中穿帮"（相邻站点半成品入画）。

## 4. SHOTBOOK 规范（分镜必须写成层矩阵）

写层矩阵之前，先用 `references/shot-design.md` 的**三面分层工作单**（背景面/主体面/文字面
+ 各面动效菜单 + 七种镜头类型预设）把每个镜头的骨架定下来，再展开成逐节拍矩阵。

实现前必须产出 SHOTBOOK.md（完整范例见 `references/shotbook-example.md`）：

```markdown
### S3 · 25.04–43.24 · 意图：一个卡了46年的数字被顶开     ← 一句话意图
| 节拍 | Layer | 对象 | 动作 | 角色 |
|---|---|---|---|---|
| 36.08 卡在指数 | L3' | 0.5991 大数字 | 中心浮现；球群亮度−25% | 数字接任主体，环境让能量 |
| 41.52 零点六零四四 | L3'' | 0.6044 | 旧数字划线击落、新数字同帧punch入 | 单帧替换=英雄时刻 |
```

- 节拍列 = ASR 字级时间戳的锚字 + 绝对秒；**每行动作必须能回答"它在配合谁"，答不上来就删**。
- 每场景写一句意图 + 唯一主体接力线（谁让位给谁）。
- 结尾附静息期检查（哪几层在动）和英雄时刻层数。

### 4.5 排版预算（凌乱的克星，2026-08-28 用户定版）

v4 实战教训：用户判"凌乱"的两个镜头（定机位 + 多拍 + 浅底）都不是单个动效错了，而是**排版没有预算**
——元素只进不出、四角+中带全占、同一信息写两遍。写 SHOTBOOK 时逐镜核：

1. **分镜按语义段落切**，禁止机械一句一镜；每镜只许一个 primary visual job
   （钩子/定义/数据/流程/对比/结论/CTA 之一）。
2. **枢轴句归下一镜**："但这次不是X"式转折/否定/设问是下一镜的**第一拍**——切镜点提前到枢轴句起点，
   旧镜先清场，开题动效（strike-and-replace/设问框）上干净的舞台，不叠在旧话题的满画面上。
3. **同屏预算**：任一时刻主体组 ≤3（字幕/常驻件不计；**降权留守的元素计入**）；
   第 4 组进场前必须有一组真退场。层矩阵加一列"同屏计数"自检。
4. **留白锚**：每镜全程保留至少一个空象限；四角+中带全占的环形满盘 = 画心空洞、视线无路径，判凌乱。
5. **hero 造型一屏一个**：多个数字/大字同屏时只有一个享受 hero 档造型（大字号/色块/换色），
   其余降行内注——三个数字三种 hero 造型互相抢戏是实测反例（v4 用户亲判）。
6. **画面文字不照抄字幕**：画面文字是 ≤12 字的提炼，不是口播誊写；与字幕整句重复 = 同一信息双份同屏。
7. **布局事件预算**：人物形态切换/构图重排这类布局级变化每分钟 2–4 次，"切换是标点不是节拍器"——
   合法触发只有新论点/图表替换/前后对比/结论；纯时间流逝、每条字幕都不算。
8. **错峰三段序（用户点名重要）**：旧面板**完全退场** → 人物换位/新主体入场 → 新面板才淡入，
   三者不得交叠。人物在场的镜头先用 `scripts/face_bbox.py` 定**人脸安全区**（实测 bbox，
   不目测、不用亮度阈值猜），文字/卡片/字幕**及其背景**全时刻禁入，主信息面板放人物对侧。

## 5. 验收口径（渲染后逐条核）

1. 英雄帧活跃层 4–6；任意静息帧 **≥2 层在动**（相机漂/idle/环境呼吸计入）
2. **任意 1 秒抽帧不允许全静止** —— `python3 scripts/motion_check.py <video>` 自动检测（工具默认阈值 0.8s，严于 1s 口径），FAIL 必修
   - 有两类**卡定版要求的静止**会撞这一关：`logo-enter◇`「落定即终帧、不加 idle」、
     `stage-keyframe-tour◇`「hold 必须真静止」。**处置不是豁免，是把运动量交给别的层**
     ——相机极缓续走 + 环境 vignette 继续收拢，卡本体一个像素不动（实测可从 FAIL 转 PASS）。
3. **每个镜头边界都有明确转场处置（对照 SHOTBOOK 逐边界核，禁止裸切）**；转场处前后镜头运动方向连续（黑震切除外）
4. 锚点→帧量化误差 ≤16.7ms（30fps）；不宣称 <5ms（那需要 120fps）
5. 一个节拍只有一个主角；说完必须让位，不许堆积满屏（让位方式三选见 §2 G3，降权留守计入同屏预算）
6. 排版预算（§4.5）逐镜核：同屏主体组 ≤3、空象限在、hero 造型唯一、画面文字与字幕无整句重复、
   人脸安全区全时刻未被侵入（**文字的背景也算侵入**）
7. **网页证据无一处静态贴屏**（2026-09-04 用户定版）：每个网页 / 长页类镜头对照 SHOTBOOK 核出它的拍法
   （滚 / 巡 / 放大 / 划 / 推之一，shot-design.md §2④）与坐标来源（`targets.json`）；静态截图当该拍主体 = P1

## 6. 工程铁律（从可工作代码中提炼）

- anime.js v4 桥（anime-remotion.ts）：`engine.useDefaultMainLoop = false`；useLayoutEffect 建 timeline（autoplay:false）+ 每帧 `tl.seek(((frame-lead)/fps)*1000)`——seek 必须在 Remotion 截帧前同步完成。
- three.js 桥（three-anime.ts）：裸 WebGLRenderer + `import 'animejs/adapters/three'`；渲染顺序 seek → onCamera → render；remotion.config 需 `setChromiumOpenGlRenderer('angle')`。
- **零 Math.random**：一切随机走 `rand(seed)` sin-hash / index 取模 / 双正弦。
- **"永不发生"的哨兵用有限大数，不用 `Infinity`**（`const NEVER = 1e6`）：
  `until = Infinity` / `outAt ?? Infinity` 一旦进了 `interpolate` 的 inputRange，
  Remotion 第一帧就抛 `inputRange must contain only finite numbers`——是硬错误不是静默降级。
- **相机曲线的末键要落在片尾之外**：CameraRig 所有轨都走 `Easing.inOut(Easing.sin)`，
  **终点速度为零**。末键正好压在片尾时，最后 0.8~0.9s 会慢到停死，motion_check 照样报静止
  （实测）。把末键推到片长之后（值也随之外推），曲线就永远不在片内收住——
  这与运镜类「相机永不静止／不能用 power2.out」是同一件事，只是发生在**相机表**上。
- **新写卡片组件默认带 `if (abs < at) return null`**：少了它，组件会在整镜开头就以 p=0 的
  样子挂在屏上（实测比自己的锚点早 4.5s 显形）。
- **细密纹理禁入相机缩放层**（2026-08-28 实战定版）：特征 ≤2px、间距 ≤24px 的点阵/细网格
  放在被相机连续缩放的层里会亚像素爬行，整块读作"画面在抖"。要么把特征放大
  （点径 ≥2.5px、间距 ≥32px），要么把纹理挪到屏幕空间静态层（CanvasBands 一类）。
- **失焦（blur）出场只在深底成立**：浅底上出场侧加 blur 会叠上下一镜交叠的白纱，
  整页读作"变糊"而不是"冷却"——与「浅底白闪失效」同理，浅底出场只走 ShotFade + 极轻回缩。
  顺带：镜内的收尾运镜（拉远/回正）要在交叠开始前**停稳**，拉远中间态 + 白纱叠着必糊。
- **场景代码里的绝对秒只许出现在具名 props 上**（`at=` / `retireAt=` / `tl(...)`），
  不要写进 `ease(abs, 106.9, ...)` 这类函数实参——重映射/重剪工具按语法位找锚点，
  函数实参里的字面量是批量改期时最容易漏的一批（v4 实测 31 处漏改直接产出 P0）。
- anime 目标元素初始 `opacity:0` 写在内联 style（防 timeline 未 seek 时闪现）。
- lead 补偿统一走一处：现成件 `motion-systems/time.ts`（useAbs/useToLocal）。三种时间基——绝对秒（SHOTBOOK 真相源）/ shot-local（CameraRig/WorldRig 内部）/ Sequence-local（Live/Defocus/粒子等模板件，含 lead）——场景组件一律经 time.ts 换算，别各算各的（已知易错点：Counter 的 startSec 要加 lead/fps）。
- 时间以**绝对秒**为分析真相源，只在 Remotion 边界换算一次帧；不要提前取整。镜头 ≠ 句子（聚合多句）时锚点一律写绝对秒字面量，tSay 的句级 scene-local 只在单句镜头里用。
