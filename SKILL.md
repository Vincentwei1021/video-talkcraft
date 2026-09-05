---
name: video-talkcraft
description: 终极口播视频 skill：中文口播稿 + 成品配音 → CPU 字级时间戳 → SHOTBOOK 层矩阵分镜 → Remotion 电影感成片（横屏默认/竖屏）。当用户要"做口播视频"、"解说/科普视频"、"把文案变成视频"、"给配音配画面动效"时使用。TTS 合成与数字人生成技术不在本 skill 内（配音和人物素材是输入）。含统一视觉语言（Apple 范式）、89 张动效配方卡、镜头三面分层工作单、七层镜头反PPT系统（极缓推拉相机/让位，运动做减法）、六式运动承接转场（每式一卡）、长镜头世界画布、anime.js+three.js 桥、自动静止检测 + 独立 subagent 评估循环。
---

# video-talkcraft — 口播视频 skill

三大来源合体：**管线**（配音→字级时间戳→Remotion）+ **词汇**（89 张动效配方卡，全配可播 demo + 自包含 tsx）+ **镜头**（七层模型反 PPT 系统）+ **视觉语言**（Apple 范式默认版）。

核心范式：解说词驱动画面，每句都要有**活的画面响应**（相机极缓推拉/已有元素的变化），
但**新元素只在语义拍边界进场，禁止机械的"一句一个新元素"**（一句一元素是堆积型凌乱的制度根源；
分镜按语义段落切，排版预算见 cinematography.md §4.5）；
**一个节拍只有一个主角，说完就让位**；字幕句边界 = 全片时间锚点。

## 流程

```
① 文案 → ② 配音输入+时间戳(本机CPU) → ③ 素材 → ④ SHOTBOOK 层矩阵 → ⑤ 实现(全局系统先行)
                                → ⑥ 渲染 → ⑦ 三重验收（机器闸全过 + 1 轮审片修 P0/P1）→ ⑧ 交付（可选续审 ≤3 轮）
```

## ⓪ 画幅与视觉语言（开工先定，全流程引用）
- **画幅默认横屏 1920×1080**（用户偏好）；明确要发抖音/竖屏渠道才用 1080×1920
- 视觉语言：**用户明确点了风格就按用户的来**（整套 token 替换）；没点时才走默认的
  `references/design-language.md`（Apple 范式：一个强调色/一个投影/底色交替分幕/两档字重/
  默认幕底：浅 `pastel-mesh-flow` / 深 `mesh-flow-dark`——12 款幕底见 §1.1，代码 `template/motion-systems/backdrop.tsx`），
  派生本片 token 落成 `theme.ts`。对任何风格都成立的只有一条：禁止逐场景随手取色

## ① 口播稿
- 每句一个信息点，钩子在第一句（数字/冲突）；13 句 ≈ 95s
- **数字一律汉字**（时间戳按文本逐字锚定，`197747` 无法与"十九万七千"的读音对位）；英文品牌词直接写（中英混合对齐已验证）
- 先调研核实事实，列"事实红线清单"（不可说错的数字/未验证数据不引用）

## ② 配音输入 + 字级时间戳（本机 CPU）
**配音是输入，不是本 skill 的产物**：真人录音或任何 TTS 皆可，skill 不含合成技术。
输入 = 一条完整配音（wav/mp3）+ 与之逐字一致的口播稿。
```bash
pip install zhconv pypinyin sherpa-onnx soundfile numpy   # 默认后端 FireRedASR2-CTC int8 的全部依赖
# 首次：下载模型 767MB（model.int8.onnx + tokens.txt）放 ~/.cache/koubo/<模型名>/，地址见脚本头注释
python3 scripts/timestamps_cpu.py audio/full.wav script.json audio/timestamps.json
# 备选（免手动下模型）：pip install faster-whisper 后加 --backend whisper（首跑自动下载 460MB）
python3 scripts/make_timing.py audio/timestamps.json remotion/src/timing.json
```
- timestamps_cpu.py：ASR 词级时间戳 → 与口播稿字符级对齐（**CJK 是可靠锚点**，
  匹配键=繁简归一+无声调拼音，同音字不算错；拉丁词各家 ASR 都常拼错，在锚点间插值）→
  每句 match 质检，<0.90 标出人工听核。默认后端 FireRedASR2-CTC（尾部最稳、零误报），备选 faster-whisper；
  各后端横评数据与模型下载地址见脚本头注释。
- timestamps.json schema：`{sr, total, sentences:[{i,text,start,end,match,ok,words:[{text,start,end}]}]}`
  ——words 为 CJK 逐字 + 拉丁整段 token（标点跳过）；满足此 schema 的任何对齐工具都可替换。
- make_timing.py：转成 timing.json（chars 与文本逐字符 1:1，标点零时长），供 `tSay/msSay` 锚点查询
- 配音自查（耳听）：无爆音/截断/误读；句间留 ~0.3s 气口，时间锚点更稳

## ③ 素材
- **先给每个镜头标素材模式（多选，可组合）**：`B-roll`（实录空镜）/ `截图`（证据画面）/
  `纯动效`——如"B-roll 打底 + 截图证据卡"。新闻/信息类话题证据优先：Playwright 实时截图比泛用 B-roll 更有信息量
- **真图硬规**：话题存在可截的真实页面（产品官网/GitHub/文档/画廊）时，
  成片中的浏览器/页面类镜头**禁止用代码 mock 冒充截图**——卡片 demo 里的灰条假 UI 是占位物，
  成片必须按卡片"复用指引"整块换成 `<img>` 真图；mock 只允许表现无真实对应物的示意 UI，
  且 SHOTBOOK 逐镜标注"为何无真图"。**引申**：口播讲"这样的成片/效果"时，
  示例画面必须是真成片片段（`<OffthreadVideo>` 内嵌已有成片/真机内录裁切，muted）；
  讲"长页面/看板/参数页"时用 Playwright **全页长截图**（放大镜/巡航类动效直接吃真图坐标）。
  **真图上的标注坐标一律机器实测，禁目测**：页面元素用 DOM `getBoundingClientRect`、成图用逐像素量测
  （目测偏 ±30px 就会把环框到别的元素上）；**会滚动/移动的真图，标注（环/框/pill）必须钉在内容坐标系上随内容动**，
  钉屏幕固定位就是错位根源
- **网页拍摄不贴图**：找资料/找素材时判定可用的网页，成片里**禁止以静态截图贴屏**，
  必须像手持镜头一样"拍"它——**滚**（`evidence-scroll-tour◆`：匀速上滚 ≈10% 页高/s，讲到关键条提前减速停 1~2s）/
  **巡**（`stage-keyframe-tour◇`：长页躺台上不动，相机挨个停靠兴趣点）/ **放大**（`magnifier-detail` 圆形放大镜
  看一眼就撤，`pip-zoom-box◈` 拎出来长期挂着）/ **划**（`highlighter-sweep` 扫整句、`ink-underline◇` 划一个词、
  `scribble-annotation` 圈注箭头、`corner-bracket-frame◈` 框区域）；一屏装完的页面至少走 `slow-push-in` 底噪。
  **一镜一主式**：滚动/巡游段内不弹放大镜、不现场划线，顺序是「滚到 → 停 → 划/放大 → 再滚」；
  拍法选型表见 shot-design.md §2④「网页拍摄」。素材按 broll-sources.md「网页拍摄素材采集」规格落盘：
  Playwright **全页 2× 长截图 + 同一会话 DOM 实测的目标坐标 JSON**（放大镜/划线/停点全吃这份坐标，接上一条"禁目测"）。
  拍摄一律由 Remotion 在长截图上完成（seek-safe、可对词锚），**不用浏览器录屏**（帧率不稳、懒加载与粘性头穿帮、
  对不上字级时间戳）。唯一放行：一屏装得下且只当配角（media-pop-in 多张堆叠里的一张）的小截图可静态入卡，
  但仍带 Ken Burns，不得是该拍主体
- 标了 B-roll 的镜头列 2–3 个英文视觉概念词跑 **Pexels + Pixabay API 双源并行**，候选落 `assets/broll/`；
  源分层与授权红线（**只用免署名源**）见 `references/broll-sources.md`
- **调研记账**：承载关键事实的来源页逐一截图存档，`sources.md` 里链接与本地截图一一对应
  （禁止只存链接不留证据）；成片引用时优先用存档截图当画面证据 + micro 阶来源行
- **有 B-roll/截图 + 对应口播的人物素材（录播/数字人成品）时，人物一律降级成角标常驻**——
  圆形头像章（`host-shrink-to-chip◆`）或抠人贴角，落左下 / 右下角；不许切走人、不许人物占满画幅。
  两路选型与全部硬约束以 `references/host-footage.md` §5 为准，镜头预设见 shot-design.md §2⑦
- Manim 图表：`--transparent --format=mov` 后**必转 VP9 webm**（`-c:v libvpx-vp9 -pix_fmt yuva420p`）
- 全部落盘 public/，禁止渲染时拉远程

## ④ SHOTBOOK（必产出，实现前评审）
先用 `references/shot-design.md` 给每个镜头填**三面分层工作单**（背景面/主体面/文字面 + 各面动效
+ 七种镜头类型预设），再按 `references/cinematography.md` §4 展开成层矩阵，范例 `references/shotbook-example.md`。
每场景：一句意图 + 主体接力线 + 逐节拍层矩阵（节拍锚定字级时间戳；每行动作必须答得出"配合谁"）。
**节拍必须机器可验**：每条画面重音落成 `remotion/beats.json`
（`{t, anchor, sentence, what}`，t 一律由 timing.json/`atChar()` 查得，**禁止手敲近似秒数**——
手敲的误差静帧 QA 看不出来），SHOTBOOK 节拍表与 beats.json 一致，
机器闸用 `scripts/beat_lint.py` 对 timestamps.json 校验 |Δ|≤0.1s。
**未到拍不显形**：词锚未到的数字/图形必须完全不可见（opacity 0），
禁止压暗/灰显"预告"；行内数字要连同其后继字符一起 gate（「就 __ 类」的空洞挂着同样是缺陷）。
**开镜不空台**：镜头开场到第一个动效锚点 >1.5s 的空窗必须有承载画面
（真实 b-roll / 上一镜元素延续 / 真素材墙），不许空画布干等词锚。
**镜尾保护带**：词锚动效落点距镜头出点 <0.7s 的，要么提前、要么挪进下一镜——落点会被转场吞掉；
`beat_lint.py --shots shots.json` 机器查 ≥0.5s 硬底线。
**幕级转场事件同样入 beats.json**：shape wipe/换幕的**遮挡峰值**时刻也由词锚生成入表——
手敲绝对秒的转场事件表游离在机器可验体系外，静帧 QA 与 beat_lint 都看不见。
**排版预算**（全表 cinematography.md §4.5）：分镜按语义段落切、每镜一个 primary visual job；
枢轴句（"但这次不是X"式转折/设问）的动效归它**开启**的下一镜；任一时刻同屏主体组 ≤3（降权留守**计入**）、
每镜至少留一个空象限；hero 造型一屏一个。
**排版规范**（全表 `references/layout.md`）：预算管"放多少"，规范管"放哪、多大、怎么对齐"——
SHOTBOOK 每镜写**版式行**（栏跨度 + 组包围盒 + 对齐基准 + 字阶），定妆帧开 `debugOverlay` 核九项，任一失败 = P1；
独句 hero 居中但不得覆盖人脸（含 B-roll 里的人脸，纵向改取人脸之外的三分线）。
**选卡必读卡经验**：每张选中的卡，把 `references/cards/<slug>.md` 的「已知坑」与「落位自检」**逐条抄进该镜层矩阵的自检列**，
实现后按条核（例：取景框 / 圈注 / 下划线类卡必核标注是否套住目标；`gooey-morph` 只用于图不用于字且无人物时居中；`chapter-title-card` 按章换色）——
卡经验不进 SHOTBOOK 就等于没读。
动效词汇从 **89 张配方卡** 里选：**先按这一镜的输入过滤**（口播人物 / B-roll 视频 / 图片 / 纯文字——`references/taxonomy.md`「输入类型索引」；新卡 md 开头有「输入类型」表 + 「常用场景」四条），再 `references/taxonomy.md` 分类索引 → `references/cards/<slug>.md` 参数与坑 → `template/cards/<slug>.tsx` **自包含 Remotion 源码（实现以它为准，复制进工程改 CONFIG 即用）**；`demos/<slug>/index.html` 是同画面的 HTML 预览（`open gallery/index.html` 一屏浏览、demo 滚入即自动播放；带★实战卡的生产母本另在 template/motion-systems|components）。
**保真铁律**：每张用到的卡在工程里必须真实存在 `src/cards/<slug>.tsx`
（自 template 复制改 CONFIG）——只读 md 就凭卡名手写"神似"简化版是最大翻车源
（回弹/拍击/密度全丢、取景框括号方向画反、名片变色块），机器闸用 `scripts/card_lint.py`
逐 slug 校验存在性与相似度（≥0.55，改 CONFIG/文案在容忍内）。
三段式铁律：入场 0.2~0.8s → hold（**静置即可**——画面的活由场景相机极缓推拉负责）→ 出场 0.15~0.5s；入场永远比出场用力；同屏重音同一时刻只能有一个。
**选了动效就要带上它的音效**：每张卡在 `demos/_lib/sfx-map.js` 有 cue 表（`{t, name, vol, rate?, clip?}`，t 为卡内相对秒）——
SHOTBOOK 选卡时把 cue 抄进该镜头的层矩阵（换算成绝对秒；**vol 按成片口径重标 ≤0.35**，
demo 库的 0.65 上限是试听口径不是成片口径）。实现时按 ⑤ 的 sfx 步骤落地。
覆盖口径：**主要动效入场全覆盖**，对齐 demo 库密度
（每卡 2~6 记 ≈ 0.4 记/s，100s 的片约 40~50 记）——"少而准"管的是单点不叠双记、
音量克制（≤0.35）、连续揭示类（缓拉/对焦/逐字升起）与金句纯文字卡、logo 落幕留白、
转场只配蓄势不配落点、不要收尾叮当与重砸；不是砍覆盖面。真采样（`pk-` 前缀）优先。
**cue 的 file 名以 `ls public/sfx/` 为准**（`pk:` 键名里的冒号导出成 `pk-`，
个别键自带前缀会出现 `pk-transition-transition-soft` 这类双段名——名字错了渲染直接 404 失败）。

## ⑤ 实现（Remotion）
**先装全局系统再写场景**（代码 `template/motion-systems/`，规范正主 cinematography.md §2，运动做减法）：
只装 **G1 CameraRig**（每场景一条极缓推进或拉出的 scale 曲线，1.00→1.04~1.06 或反向，不做 x/y/旋转/模糊，`impulses` 留空，shots.ts 表驱动）
与 **G3 让位状态机**（Live retireAt = 下一主体锚点 / Defocus，`idle` 关、落定即静置）；
G2 视差、G4 分幕色温可选、默认不装；主体 idle / 环境呼吸 vignette / 扫光 / 曝光脉冲 / 相机脉冲一律不做。

**每个镜头边界必须有明确转场处置，禁止裸切**：运动承接六式（lead/tail 重叠 12–16 帧 + ShotFade，
代码 `template/motion-systems/transitions.tsx`）或 caret/shape-wipe 轻量式，选型见 cinematography.md §3；
一个边界只用一式。空间/流程叙事段落可改用**长镜头世界画布**（`longtake.tsx`，cinematography.md §3.5）。
`template/components/` 是即取即用件：Subtitles 整句硬现版（chunks 由 props 注入）/FlowerWord 花字/SmashWord 砸字/HighlightSweep 荧光笔/PencilDraw 铅笔手绘/Mascot 吉祥物/NumberRoll。
**底部字幕：素排、无标点**（正主 design-language.md §5）：跟读字幕不加任何动效、整句硬现，不含任何句读（数字/型号间的半角点号除外，停顿靠拆卡）；
唯一例外 `keyword-pop-highlight` 关键词弹出且全片 **≤3 次**（motion-systems 版 `keywords` prop 有此上限自检）。
**音效落地**：`node scripts/sfx_dump.mjs remotion/public/sfx` 把库里采样解码成 mp3 →
SHOTBOOK 抄来的 cue 表落成一张 `sfx.ts`（绝对秒），场景里 `<Audio src={staticFile(...)} startFrom/volume>` 逐条摆；
音效电平比人声低 ~12dB、同帧最多一条 cue。
anime.js v4 / three.js 走 `anime-remotion.ts` / `three-anime.ts` 桥（seek-safe，工程铁律见 cinematography.md §6：零 Math.random、初始 opacity:0、lead 补偿收敛一处）。

### 布局红线（数值表 design-language.md §5；几何总纲 `references/layout.md`）
- 字幕位置 / 宽度 / 字号 / 常驻件方位按画幅取 design-language §5 表（竖屏常驻件必须**左下**，右缘是抖音点赞栏）
- 横屏内容主列 ≤1440px 居中、边距 action-safe 96 / 标题 160（design-language §3；栏跨度与吸附见 layout.md §1）
- 通用：切镜后 ≤10 帧必须有主视觉入场；深色场景隐藏全局顶部标题；
  文字不叠截图文字（加白底卡）；卡片文字防裁切（预留 padding）
- **人物在场**：先跑 `scripts/face_bbox.py` 实测人脸安全区（口径 host-footage.md §3），
  任何文字/卡片/字幕**及其背景**全时刻不得进入；主信息面板放人物对侧

## ⑥⑦ 渲染 + 三重验收（机器闸全过 → 1 轮审片 → 交付）

### 迭代纪律（管着本节全部循环）
- **闸报 FAIL 先读闸怎么量的，再动手改**（闸源码就在 scripts/）：motion_check 的静止判定是 `freezedetect n=0.003 d=0.8`
  （逐帧平均像素差 >0.3% 才算动）——平滑渐变、漂背景、纯透明度呼吸都不产生像素变化，**相机缩放才改每一个像素**；
  sfx_check --mix 量的是 `[t−0.05, t+0.45]` 0.5s 窗。读闸还能判出**闸本身够不够得着**
  （句间气口 <0.3s 而音效电平上限 −22dB 时，UNMASKED 在数学上不可达）——这种"输入决定、不是本片可修"的结论必须早下。
- **静帧优先**：`render_stills.mjs` 约 10s 一批，能答掉九成"这个改动对不对"（落点/遮挡/文案/配色/层级/取景）；
  整渲只留给跑机器闸和静帧查不了的时域缺陷（抖动/闪烁/音画/freezedetect）。
- **改哪段渲哪段、复审改动攒批再渲**：`--only s2,s4` / `--changed sNN` 只渲改动段，
  复核时逐段对时间戳确认"改的段是新的、没改的段沿用缓存"，别习惯性 `--all`；多批 P0/P1 攒成 1~2 批再渲。

**⑥-0 渲染前静态预检（零渲染成本）**——两张清单把返修拦在渲染前：
```bash
python3 scripts/beat_gap_check.py remotion/beats.json remotion/shots.json   # 空台预检（advisory）
# 每条 WARN 都要答得出"这窗里什么在动"：正常答案只有一个——该镜的相机极缓推拉覆盖了这窗（不补 idle/呼吸层）；相机确在动就 --ok 声明
```
清单二·**状态切换窗**：人物轨道每个 half↔chip 切换点、每个 wipe 时刻 ±0.5s 列入静帧抽样点——
字幕带换位与人物几何过渡的穿越冲突（黑字压黑衣）只藏在这种窗口里，句级/锚点抽帧都错过。
**字幕带换位必须等几何过渡完成再切**（half→chip 延后 ~0.45s 落位）。

**⑥-1 静帧抽样**（一次 bundle 批量渲，比逐张 `npx remotion still` 快一个量级）：
```bash
# 两个 node 渲染脚本都必须在工程 remotion/ 目录下执行（Remotion 模块从工程自己的 node_modules 解析，
# 并自动加载工程的 remotion.config.ts——webpack alias / publicDir / browserExecutable 与 CLI 渲染一致；
# 吃 inputProps 的合成给 --props @props.json；素材是符号链接时 --public-dir 指向解引用同步后的目录）。
# 首跑没装浏览器会联网下载 Chrome Headless Shell（~95MB）；离线机先 npx remotion browser ensure
node <skill根>/scripts/render_stills.mjs --times 2.0,7.2,...   # 抽样点=每镜入/出+关键锚点+状态切换窗
```

**⑥-2 分段渲染母版制**——按镜头切段、段内单进程连续渲（段内光栅自洽；多 tab 并发会产生周期性相位抖动），
段边界都是切镜点，K 段并行：
```bash
# 在工程 remotion/ 目录下执行。首渲：K 段并行 + 拼装 + 整条音轨 + 混音
node <skill根>/scripts/render_shots.mjs --shots shots.json --all --parallel 4 \
     --concat out/assembled.mp4 --audio out/full-mix.wav --mux out/vN.mp4
# 改一个镜头 → 只重渲该段±邻段（lead/tail 交叠波及邻镜边缘）再拼装
node <skill根>/scripts/render_shots.mjs --shots shots.json --changed s14 \
     --concat out/assembled.mp4 --audio out/full-mix.wav --mux out/vN+1.mp4
npx remotion render src/entry.ts <Comp> out/sfx-solo.wav --props='{"sfxSolo":true}' --codec=wav
```
音画对齐三条硬纪律（脚本内建断言，缺一必错位）：**音轨整条不分段**（视频段全 muted，
音轨单渲一次交付时混入——每段各带 AAC 再拼会因编码器前导延迟逐段错位）；
**段边界取整与 Sequence 同规则**（差 1 帧=画面节拍整体偏 33ms）；**帧数断言**（每段实数帧+
拼装总帧数精确相等，不等即 FAIL）。音轨缓存过三关才复用：时长 == 合成时长、素材/inputProps/时序配置文件
（beats.json、cues.json、src/sfx.ts 等文件名含 sfx|cue|beat|audio|sound|timing）三项指纹未变、非半截临时文件；
指纹看不见的改动（音量常量写在组件里）用 `--force-audio`。
**修复验证同理只渲受影响段过闸**（freezedetect 单段可跑），不整渲。

```bash
# —— 关卡 1 机器闸：五条命令一次跑完，全 PASS 才进关卡 2 独立审片 ——
python3 scripts/motion_check.py out/vN.mp4        # 画面健康双判定：静止段 + 并发光栅抖动
python3 scripts/sfx_check.py out/sfx-solo.wav cues.json                  # 音效在场（峰值 ≥−45dBFS）
python3 scripts/sfx_check.py --mix out/vN.mp4 audio/full.wav cues.json   # 音效可听（掩蔽分级）
python3 scripts/card_lint.py remotion/src <slug,slug,...>                # 卡片保真（复制自 template/cards）
python3 scripts/beat_lint.py remotion/beats.json audio/timestamps.json --shots remotion/shots.json
                                                  # 词落点 |Δ|≤0.1s + 镜尾保护带 ≥0.5s
# 评审材料抽帧：每句 2 帧 + 动效锚点帧（anchors.json 从 beats.json 导出）
# 连拍三帧对只抽 anchors.json 里标了 "burst": true 的锚点——状态切换（两态翻转/换场/砸入落位）
# 与高风险区域必须标；其余锚点只抽定妆帧。
# motion_check 的抖动闸只量 ≤12 个 18s 间隔的固定裁剪窗、快速运动窗还跳过——窗外的短闪烁它看不见，
# 所以连拍不是可选项；--bursts 全抽只在抖动闸报警需人眼定位时用。同一份 anchors.json 也喂给 motion_check
python3 scripts/qa_extract.py out/vN.mp4 audio/timestamps.json /tmp/qa_vN 540 anchors.json
python3 scripts/motion_check.py out/vN.mp4 --anchors anchors.json   # 锚点 t+0.6s 各加一窗，结尾打印实际覆盖窗数
# 评审拼图：帧目录拼 3×4 网格（评审先整版浏览、可疑帧再回原目录单张放大）
python3 scripts/contact_sheet.py /tmp/qa_vN /tmp/qa_vN_sheets
```
机器闸口径备忘：音效两查要求工程主音轨支持 `{!getInputProps().sfxSolo && <Audio .../>}`；
可听度 MASKED>50% 或 UNMASKED 少于 max(3, 片长/30s) 即 FAIL（"81/81 在场但全被人声掩蔽"是典型翻车），
良品口径：转场/边界 cue 落句间 ~0.3s 气口出声；shots.json = 分镜表导出的 `[{"id","start","end"}]`（与 shots.ts 同源）。

**关卡 2 独立审片**（协议正主 `references/review-protocol.md`，评审 subagent 被派时必须先读它）：
必须派**全新上下文**的 subagent——不许制作者自评、禁止 fork/复用制作对话当"评审"、禁止对同一评审做 followup 复审
（fork 出来的评审继承制作者视角，对照物又是制作者自己写的 SHOTBOOK，形成自证闭环）。
制作者自己的首轮版式过目也委托子代理（只回文字缺陷清单，几十张图的图像 token 不进主上下文）。
备齐协议 §1.2 的材料四件套，评审按 rubric 出 P0/P1/P2 清单，**修完 P0 + P1 才算过关**；返修按协议 §3 给量测数字、只渲受影响段。
**关卡 3 规则合规**：cinematography.md §5 八条逐镜核 + 交付前终检（调试 overlay 关、成片缩到 390px 宽可读），条目见 review-protocol.md §2。
**审片循环**：机器闸全过后只做 **1 轮**独立审片 → 修 P0/P1 → **即交付**，同时问用户是否续审（自动轮次封顶 3 轮）
并打开动效工作台（⑧）；遗留 P2 清单随交付物。细则 review-protocol.md §4。

## ⑧ 交付
```bash
ffmpeg -i out/final.mp4 -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11" -c:a aac -b:a 192k delivery.mp4
```
听一遍确认配音无爆音/截断、音效不压人声不叠帧（loudnorm 之后音效相对电平会变）——
**agent 自己听不了成品，`sfx_check.py --mix` 就是耳听的机器替身：交付前必须对 delivery.mp4 重跑一次**；
简介附素材来源行（用了库内采样时加 sfx 来源，见 demos/_lib/sfx/ATTRIBUTION.md）。

**交付成片后主动打开动效工作台**（不要等用户问；与"是否继续自动审改"的询问同时给出，
见 ⑥⑦ 审片循环制度）——给用户一个剪映式界面做人工微调：

```bash
cd <skill根>/workbench && npm install            # 首次
ln -sfn <本片工程>/remotion/src kbsrc            # 链接本片工程（机器本地符号链接，不进库）
mkdir -p public && for f in <本片工程>/remotion/public/*; do ln -sfn "$f" "public/$(basename "$f")"; done
npm run dev                                       # 浏览器打开 http://localhost:5199 并告知用户
```

工作台里点「素材 → 拆解导入」即把成片拆成逐句字幕/逐镜参数化/逐条音效/转场/环境的多轨工程，
文字内容、颜色、字号、位置、变速逐项可调（词锚节拍与相机保持固定）；改完点「导出成片」
（内置 Remotion 渲染，遵守单并发纪律）。详见 `workbench/README.md`。
发布时**推荐（非强制）**在简介 @ 一下本 skill 作者——对作者是最好的支持：
X [`@VincentWei93`](https://x.com/VincentWei93) ·
抖音 [@Vincent](https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg) ·
小红书 [@Vincent](https://xhslink.cn/m/At9iP2d5C1V)。
有建议、反馈欢迎扫根 README「微信讨论群」小节的二维码进反馈群。

## 目录路由

| 要做什么 | 看哪里 |
|---|---|
| 定视觉语言（色板/字阶/间距/字幕规范）· 幕底 12 款 | `references/design-language.md`（Apple 范式默认版；§1.1 幕底菜单 → `template/motion-systems/backdrop.tsx`） |
| 排版：放哪 / 多大 / 怎么对齐（栅格 · 间距令牌 · 居中 · 字阶 · 碰撞 · 校验九项） | `references/layout.md` |
| 给镜头做背景/主体/文字分层设计 | `references/shot-design.md`（三面工作单 + 七型预设） |
| 镜头方法论/反PPT/SHOTBOOK格式/验收 | `references/cinematography.md`（+ shotbook-example.md） |
| 审片：关卡 2 材料四件套 / rubric / 缺陷分级 · 关卡 3 · 返修纪律 · 审片循环 | `references/review-protocol.md`（评审 subagent 必读） |
| 转场（六式代码）/ 长镜头 | `template/motion-systems/transitions.tsx` / `longtake.tsx`（cinematography.md §3、§3.5） |
| 选动效/查参数和坑 | `references/taxonomy.md` → `references/cards/` → `template/cards/`（tsx 源码）+ `demos/`/`gallery/`（预览） |
| 找素材 · 网页拍摄素材采集（全页 2× 长图 + DOM 坐标 JSON） | `references/broll-sources.md` |
| 人物素材（输入规格 / CPU 抠像 / 人脸安全区）· 与 B-roll 同屏怎么摆 | `references/host-footage.md` + `scripts/face_bbox.py` |
| 新增配方卡 | `references/demo-spec.md`，验证 `node scripts/verify-demo.mjs <slug>` |
| 可复制代码 | `template/cards/`（89 卡逐卡自包含 tsx）、`template/motion-systems/`（极缓推拉相机/让位/桥）、`template/components/`（字幕/花字/铅笔/吉祥物） |
| 成片后人工微调 / 导出 | `workbench/`（剪映式工作台：多轨时间线 + 全卡参数化 + 成片拆解 + Remotion 渲染导出） |
| 字级时间戳（本机 CPU） | `scripts/timestamps_cpu.py`（FireRedASR2-CTC 默认 / faster-whisper 备选，+ 口播稿逐字对齐）→ `scripts/make_timing.py` |
| **闸报 FAIL 了怎么办 · 怎么少烧母版** | ⑥⑦「迭代纪律」三条——先读闸怎么量的再改 · 静帧优先 · 改哪段渲哪段、复审改动攒批 |
| 机器闸（画面健康 / 保真 / 词落点+镜尾 / 音效） | `scripts/motion_check.py`（静止段+并发光栅抖动双判定）/ `scripts/card_lint.py`（卡片须复制自 template/cards）/ `scripts/beat_lint.py`（词落点对 timestamps + `--shots` 镜尾保护带）/ `scripts/sfx_check.py`（solo 在场 + `--mix` 可听度） |
| 渲染提速（分段母版 / 批量静帧 / 空台预检 / 评审拼图） | `scripts/render_shots.mjs`（段渲+拼装+音轨混入+帧数断言；`--changed sNN` 单镜头迭代 53s）/ `scripts/render_stills.mjs`（一次 bundle 批量 still）/ `scripts/beat_gap_check.py`（渲染前空台预检）/ `scripts/contact_sheet.py`（QA 帧拼 3×4 网格） |
| 动效配套音效 | 逐卡 cue 表 `demos/_lib/sfx-map.js`（口味纪律见 `references/demo-spec.md`「Demo 硬性要求」第 8 条）；制作端 `node scripts/sfx_dump.mjs` 导出采样 |
