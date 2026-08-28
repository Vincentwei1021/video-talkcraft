---
name: video-talkcraft
description: 终极口播视频 skill：中文口播稿 + 成品配音 → CPU 字级时间戳 → SHOTBOOK 层矩阵分镜 → Remotion 电影感成片（横屏默认/竖屏）。当用户要"做口播视频"、"解说/科普视频"、"把文案变成视频"、"给配音配画面动效"时使用。TTS 合成与数字人生成技术不在本 skill 内（配音和人物素材是输入）。含统一视觉语言（Apple 范式）、78 张动效配方卡、镜头三面分层工作单、七层镜头反PPT系统（CameraRig/视差/让位/环境）、六式运动承接转场（每式一卡）、长镜头世界画布、anime.js+three.js 桥、自动静止检测 + 独立 subagent 评估循环。
---

# video-talkcraft — 口播视频 skill

三大来源合体：**管线**（配音→字级时间戳→Remotion，实测跑通）+ **词汇**（78 张动效配方卡：23 调研 + 8 实战★ + 9 真实视频挖掘◆ + 18 remocn 适配◇ + 20 参考图复刻◈，全配可播 demo）+ **镜头**（七层模型反 PPT 系统，多轮调试验证）+ **视觉语言**（Apple 范式默认版）。

核心范式：解说词驱动画面，每句都要有**活的画面响应**（相机乐句/idle/已有元素的变化），
但**新元素只在语义拍边界进场，禁止机械的"一句一个新元素"**（一句一元素是堆积型凌乱的制度根源，
2026-08-28 用户定版；分镜按语义段落切，排版预算见 cinematography.md §4）；
**一个节拍只有一个主角，说完就让位**；字幕句边界 = 全片时间锚点。

## 流程

```
① 文案 → ② 配音输入+时间戳(本机CPU) → ③ 素材 → ④ SHOTBOOK 层矩阵 → ⑤ 实现(全局系统先行)
                                → ⑥ 渲染 → ⑦ 三重验收循环 → ⑧ 交付
```

## ⓪ 画幅与视觉语言（开工先定，全流程引用）
- **画幅默认横屏 1920×1080**（用户偏好）；明确要发抖音/竖屏渠道才用 1080×1920
- 视觉语言：**用户明确点了风格就按用户的来**（整套 token 替换）；没点时才走默认的
  `references/design-language.md`（Apple 范式：一个强调色/一个投影/底色交替分幕/两档字重），
  派生本片 token 落成 `theme.ts`。对任何风格都成立的只有一条：禁止逐场景随手取色

## ① 口播稿
- 每句一个信息点，钩子在第一句（数字/冲突）；13 句 ≈ 95s
- **数字一律汉字**（时间戳按文本逐字锚定，`197747` 无法与"十九万七千"的读音对位）；英文品牌词直接写（中英混合对齐已验证）
- 先调研核实事实，列"事实红线清单"（不可说错的数字/未验证数据不引用）

## ② 配音输入 + 字级时间戳（本机 CPU）
**配音是输入，不是本 skill 的产物**（2026-08-28 定版）：真人录音或任何 TTS 皆可，
skill 不含合成技术。输入 = 一条完整配音（wav/mp3）+ 与之逐字一致的口播稿。
```bash
pip install zhconv pypinyin sherpa-onnx soundfile numpy   # 默认后端 FireRedASR2-CTC int8 的全部依赖
# 首次：下载模型 767MB（model.int8.onnx + tokens.txt）放 ~/.cache/koubo/<模型名>/，地址见脚本头注释
python3 scripts/timestamps_cpu.py audio/full.wav script.json audio/timestamps.json
# 备选（免手动下模型）：pip install faster-whisper 后加 --backend whisper（首跑自动下载 460MB）
python3 scripts/make_timing.py audio/timestamps.json remotion/src/timing.json
```
- timestamps_cpu.py：ASR 词级时间戳 → 与口播稿字符级对齐（**CJK 是可靠锚点**，
  匹配键=繁简归一+无声调拼音，同音字不算错；拉丁词各家 ASR 都常拼错，在锚点间插值）→
  每句 match 质检，<0.90 标出人工听核。2026-08-28 四配置横评（110s 中英混合，
  对照 GPU ForcedAligner 真值）：**FireRed 尾部最稳**（字级 |Δ| 最大 200ms=6帧、零误报，24s）＞
  whisper small（中位 20ms 但最大 413ms + 2 句边缘误报，26s）＞ Qwen3-ASR-0.6B+Aligner
  （p95 60ms 最优但 5GB 体积 + torch，78s）——数据与模型下载地址见脚本头注释。
- timestamps.json schema：`{sr, total, sentences:[{i,text,start,end,match,ok,words:[{text,start,end}]}]}`
  ——words 为 CJK 逐字 + 拉丁整段 token（标点跳过）；满足此 schema 的任何对齐工具都可替换。
- make_timing.py：转成 timing.json（chars 与文本逐字符 1:1，标点零时长），供 `tSay/msSay` 锚点查询
- 配音自查（耳听）：无爆音/截断/误读；句间留 ~0.3s 气口，时间锚点更稳

## ③ 素材
- **先给每个镜头标素材模式（多选，可组合，2026-08-28 定版）**：`B-roll`（实录空镜）/ `截图`（证据画面）/
  `纯动效`——如"B-roll 打底 + 截图证据卡"。新闻/信息类话题证据优先：Playwright 实时截图比泛用 B-roll 更有信息量
- 标了 B-roll 的镜头列 2–3 个英文视觉概念词跑 **Pexels + Pixabay API 双源并行**，候选落 `assets/broll/`；
  源分层与授权红线（**只用免署名源**）见 `references/broll-sources.md`
- **调研记账**：承载关键事实的来源页逐一截图存档，`sources.md` 里链接与本地截图一一对应
  （禁止只存链接不留证据）；成片引用时优先用存档截图当画面证据 + micro 阶来源行
- **有 B-roll/截图 + 对应口播的人物素材（录播/数字人成品）时**：人物一律降级成角标常驻——
  圆形头像章（`host-shrink-to-chip◆`）或 segmentation 抠人贴角；不许切走人、不许人物占满画幅。
  **两路都必须落在左下或右下角**（chip 圆心在画面下 1/3 带内），不许飘在中高位（2026-08-27 用户定版）。
  选型与硬约束见 `references/host-footage.md`「人物与 B-roll 同屏」，镜头预设见 shot-design.md §2⑦
- Manim 图表：`--transparent --format=mov` 后**必转 VP9 webm**（`-c:v libvpx-vp9 -pix_fmt yuva420p`）
- 全部落盘 public/，禁止渲染时拉远程

## ④ SHOTBOOK（必产出，实现前评审）
先用 `references/shot-design.md` 给每个镜头填**三面分层工作单**（背景面/主体面/文字面 + 各面动效
+ 七种镜头类型预设），再按 `references/cinematography.md` §4 展开成层矩阵，范例 `references/shotbook-example.md`。
每场景：一句意图 + 主体接力线 + 逐节拍层矩阵（节拍锚定字级时间戳；每行动作必须答得出"配合谁"）。
**排版预算（2026-08-28 用户定版，细则 cinematography.md §4）**：分镜按语义段落切、每镜一个 primary visual job；
枢轴句（"但这次不是X"式转折/设问）的动效归它**开启**的下一镜，上清过场的舞台；任一时刻同屏主体组 ≤3
（降权留守的元素**计入**）、每镜至少留一个空象限；人物在场先跑 `scripts/face_bbox.py` 定人脸安全区。
动效词汇从 **78 张配方卡** 里选：`references/taxonomy.md` 索引 → `references/cards/<slug>.md` 参数与坑 → `template/cards/<slug>.tsx` **自包含 Remotion 源码（实现以它为准，复制进工程改 CONFIG 即用）**；`demos/<slug>/index.html` 是同画面的 HTML 预览（`open gallery/index.html` 一屏浏览、demo 滚入即自动播放；带★实战卡的生产母本另在 template/motion-systems|components）。
三段式铁律（模板工业共识）：入场 0.2~0.8s → hold（**必须带 idle 微动**）→ 出场 0.15~0.5s；入场永远比出场用力；同屏重音同一时刻只能有一个。
**选了动效就要带上它的音效**：每张卡在 `demos/_lib/sfx-map.js` 有 cue 表（`{t, name, vol, rate?, clip?}`，t 为卡内相对秒）——
SHOTBOOK 选卡时把 cue 抄进该镜头的层矩阵（换算成绝对秒；**vol 按成片口径重标 ≤0.35**，
demo 库的 0.65 上限是试听口径不是成片口径）。实现时按 ⑤ 的 sfx 步骤落地。
覆盖口径（2026-08-28 用户反馈修订）：**主要动效入场全覆盖**，对齐 demo 库密度
（每卡 2~6 记 ≈ 0.4 记/s，100s 的片约 40~50 记）——"少而准"管的是单点不叠双记、
音量克制（≤0.35）、连续揭示类（缓拉/对焦/逐字升起）与金句纯文字卡、logo 落幕留白、
转场只配蓄势不配落点、不要收尾叮当与重砸；不是砍覆盖面。真采样（`pk-` 前缀）优先。
**cue 的 file 名以 `ls public/sfx/` 为准**（`pk:` 键名里的冒号导出成 `pk-`，
个别键自带前缀会出现 `pk-transition-transition-soft` 这类双段名——名字错了渲染直接 404 失败）。

## ⑤ 实现（Remotion）
**先装四套全局系统再写场景**（代码 `template/motion-systems/`，用法见 cinematography.md §2）：
1. G1 CameraRig：每场景一条连续相机曲线 + 重音脉冲（加法叠加不重置）；路径表驱动（shots.ts）
2. G2 Plane 视差：背景 0.5 / 主内容 1.0 / 前景 1.2
3. G3 Live/Defocus：idle 微动 + 让位状态机（retireAt=下一主体锚点）
4. G4 Environment：呼吸 vignette + 扫光 + 分幕色温 + 曝光脉冲（四张事件表按片配置）

**每个镜头边界必须有明确转场处置，禁止裸切**：运动承接六式（lead/tail 重叠 12–16 帧 + ShotFade，
代码 `template/motion-systems/transitions.tsx`）或 caret/shape-wipe 轻量式，选型见 cinematography.md §3；
一个边界只用一式。空间/流程叙事段落可改用**长镜头世界画布**（`longtake.tsx`，cinematography.md §3.5）。
`template/components/` 是即取即用件：Subtitles 整句硬现版（chunks 由 props 注入）/FlowerWord 花字/SmashWord 砸字/HighlightSweep 荧光笔/PencilDraw 铅笔手绘/Mascot 吉祥物/NumberRoll。
**底部字幕素排铁律（2026-08-27 用户定版）**：底部跟读字幕**不加任何动效**——整句硬现、素排，
两个组件（components 版 / motion-systems/Subtitles.tsx 素排版）都遵守。唯一例外是 `keyword-pop-highlight`
关键词弹出，且同一个视频**最多 3 次**，除非用户明确要求更多（motion-systems 版的 `keywords` prop 有此上限自检）。
**字幕文本无标点（2026-08-28 用户定版）**：句读全去掉，长句停顿靠拆卡；唯一例外是数字/型号间的
半角点号——细则 design-language.md §5。
**音效落地**：`node scripts/sfx_dump.mjs remotion/public/sfx` 把库里采样解码成 mp3 →
SHOTBOOK 抄来的 cue 表落成一张 `sfx.ts`（绝对秒），场景里 `<Audio src={staticFile(...)} startFrom/volume>` 逐条摆；
音效电平比人声低 ~12dB、同帧最多一条 cue。
anime.js v4 / three.js 走 `anime-remotion.ts` / `three-anime.ts` 桥（seek-safe，工程铁律见 cinematography.md §6：零 Math.random、初始 opacity:0、lead 补偿收敛一处）。

### 布局红线（按画幅，详表见 design-language.md §5）
- **横屏（默认）**：字幕 bottom 100、maxWidth 66%、字号 44/600（>24 字降 38）；内容主列 ≤1440px 居中；
  边距 action-safe 96px / 标题 160px；常驻件任一下角
- **竖屏（抖音）**：字幕 bottom 350、maxWidth 90%、>15 字缩字号；吉祥物/常驻件放**左下**（右缘是抖音点赞栏）
- 通用：切镜后 ≤10 帧必须有主视觉入场；深色场景隐藏全局顶部标题；
  文字不叠截图文字（加白底卡）；卡片文字防裁切（预留 padding）
- **人物在场**：人脸安全区用 `scripts/face_bbox.py` 实测 bbox 定（不目测、不用亮度阈值猜），
  任何文字/卡片/字幕**及其背景**全时刻不得进入；主信息面板放人物对侧（2026-08-28 用户定版）

## ⑥⑦ 渲染 + 三重验收（循环到全过）
```bash
npx remotion render src/entry.ts <Comp> out/vN.mp4 --concurrency=4
python3 scripts/motion_check.py out/vN.mp4        # 关卡1：无 ≥0.8s 静止段，FAIL 必修
# 关卡1.5：音效在场（渲一条 sfxSolo 纯音效轨逐 cue 验能量——名字打错/音量为零当场现形；
# 工程主音轨要支持 `{!getInputProps().sfxSolo && <Audio .../>}`）
npx remotion render src/entry.ts <Comp> out/sfx-solo.wav --props='{"sfxSolo":true}' --codec=wav
python3 scripts/sfx_check.py out/sfx-solo.wav cues.json
# 抽帧：每句 2 帧 + 动效锚点帧（anchors.json 从 SHOTBOOK 重音表导出）+ 连拍三帧对
python3 scripts/qa_extract.py out/vN.mp4 audio/timestamps.json /tmp/qa_vN 540 anchors.json
```
关卡 2（**必须派独立 subagent，不许制作者自评**——做的人对自己的画面有盲区，2026-08-27 用户定版）：
subagent 读 SHOTBOOK + 抽帧全集，**以视觉效果为主**，按 rubric（可读性/构图/信息传达/质感/事实一致）
出 [P0/P1/P2] 缺陷清单（提醒它：入场中间态不是缺陷）。自查盯的是**成片质量缺陷**，不是规则合规
（规则项在关卡 3）：元素重叠/覆盖/堆积、动效位置不准（标注没落在目标上、强调错位、元素出画）、
画面噪点/压缩伪影/渲染残影、非有意的抖动或闪烁、文字贴边裁切、**排版凌乱**（同屏主体组 >3、
无空象限的满盘布局、画面文字与字幕整句重复双份、人脸安全区被文字或其背景侵入、多个 hero 造型互相抢戏）。
**只按句抽帧看不见的三类缺陷，必须给对应材料（v4 实战教训，2026-08-28）**：
- **短命动效的错位**（标注/箭头只活 1~2s，句级抽帧大概率错过）→ 用**动效锚点帧**
  （每个重音 +0.25s 的定妆帧）逐个核"框住/指向/圈住目标了没有"；
- **抖动/闪烁**（时域缺陷，单帧永远看不见）→ 用**连拍三帧对**，三帧间只该有设计内的连续运动，
  出现来回振荡、细纹理爬行即缺陷；
- **设计没落地**（SHOTBOOK §0 计划的背景/音效/常驻件默默缺席——评审不知道"应该有"就不会报）
  → 把 SHOTBOOK §0 的**设计清单**（背景资产落位表、音效 cue 数、人物形态表）发给 subagent
  做逐项"计划 vs 成片"核对。
**用户反馈的返修三纪律（2026-08-28 借鉴 video-agent 复盘制定版）**：
- 用户批注**时间码三段闭环**：修改前抽该帧 → 修改后抽同帧 → 最终成片再抽同帧，三张路径写进 REVIEW；
- 状态型动画（让位/换位/揭示）的修复必须覆盖**完整受影响区间的并集**（起点/中点/终点 + 每个边界前后），
  不能用"批注帧已正常"代替整段验收；
- 同一问题二次返工时，REVIEW 必须留下"第一次修复为何失效"的记录。
关卡 3：cinematography.md §5 验收口径（静息帧 ≥2 层动、转场运动连续、让位无堆积、排版预算达标）。
可读性终检：把成片**缩到 390px 宽**（手机上刷到横屏片的实际宽度）复看一遍，每行都要能读——
桌面全屏预览不是验收标准；排不下时先删次要文案，不缩字号、不留孤字行。
修完 P0+P1 与 motion FAIL → 重渲 → 重评，直到全过。

## ⑧ 交付
```bash
ffmpeg -i out/final.mp4 -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11" -c:a aac -b:a 192k delivery.mp4
```
听一遍确认配音无爆音/截断、音效不压人声不叠帧（loudnorm 之后音效相对电平会变，以成品耳听为准）；
简介附素材来源行（用了库内采样时加 sfx 来源，见 demos/_lib/sfx/ATTRIBUTION.md）。
发布时**推荐（非强制）**在简介 @ 一下本 skill 作者：X `@VincentWei93` · 抖音/小红书 @Vincent
（链接见根 README「Follow me」）——对作者是最好的支持。

## 目录路由

| 要做什么 | 看哪里 |
|---|---|
| 定视觉语言（色板/字阶/间距/字幕规范） | `references/design-language.md`（Apple 范式默认版） |
| 给镜头做背景/主体/文字分层设计 | `references/shot-design.md`（三面工作单 + 七型预设） |
| 镜头方法论/反PPT/SHOTBOOK格式/验收 | `references/cinematography.md`（+ shotbook-example.md） |
| 转场（六式代码）/ 长镜头 | `template/motion-systems/transitions.tsx` / `longtake.tsx`（cinematography.md §3、§3.5） |
| 选动效/查参数和坑 | `references/taxonomy.md` → `references/cards/` → `template/cards/`（tsx 源码）+ `demos/`/`gallery/`（预览） |
| 找素材 | `references/broll-sources.md` |
| 人物素材（输入规格 / CPU 抠像 / 人脸安全区）· 与 B-roll 同屏怎么摆 | `references/host-footage.md` + `scripts/face_bbox.py` |
| 新增配方卡 | `references/demo-spec.md`，验证 `node scripts/verify-demo.mjs <slug>` |
| 可复制代码 | `template/cards/`（78 卡逐卡自包含 tsx）、`template/motion-systems/`（相机/让位/环境/桥）、`template/components/`（字幕/花字/铅笔/吉祥物） |
| 字级时间戳（本机 CPU） | `scripts/timestamps_cpu.py`（FireRedASR2-CTC 默认 / faster-whisper 备选，+ 口播稿逐字对齐）→ `scripts/make_timing.py` |
| 动效配套音效 | 逐卡 cue 表 `demos/_lib/sfx-map.js`（口味纪律见 `references/demo-spec.md` §8）；制作端 `node scripts/sfx_dump.mjs` 导出采样 |
