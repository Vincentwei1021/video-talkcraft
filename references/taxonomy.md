# 口播动效分类体系与卡片总清单

来源五批：① 4 份平台调研（B站中文长视频 / 英文 YouTube / 抖音竖屏短视频 / 模板生态反推；调研原稿为过程资产不随库分发，结论已蒸馏进本文与各卡），
71 条动效条目交叉去重后精选为 19 张调研卡，另按通用纪录片/评测视频语法补 **5 张运镜卡**（静态素材的相机运动）共 24 张
（后按字幕素排铁律删 1 张字幕卡，现存 23）；② 项目实战沉淀的 **8 张实战卡★**
（来自 deepseek-harness demo、ai-math-video、ann_nnng 复刻——生产母本是 template/motion-systems|components
下的 Remotion 组件，同时配 HTML demo；其中运动承接转场六式各自成卡。2026-08-28 定版后
全库各卡的 frontmatter `代码:` 统一指向逐卡自包含 tsx `template/cards/<slug>.tsx`）；③ 2026-08-23 真实视频挖掘：小Lin说·韩股崩盘 + TheAIScaler shorts top10，
13 段分析 208 条观察策展出 **9 张卡（标记◆）**，同时把 13 条变体观察回填进现有卡；
④ 2026-08-24 remocn 项目（Remotion UI 动效注册表）挖掘适配 + 指定搬运 19 张卡（标记◇，后删 1 张现存 **18**；
个别卡"复用指引"里的 `registry/remocn/...` 是该项目的源码路径，仅溯源用，本库不含 registry/ 目录），
其中「界面自己按脚本演戏」的卡当时另立了第 8 个类别「界面剧场」，2026-08-26 用户定版并回**素材呈现**
（它那些同源卡 terminal-typing-log / chat-gpt / claude-code / glass-code-walk / cursor-actor-demo 本来就都在素材呈现里，单卡成类没有意义）；
⑤ 2026-08-25 参考图逐格复刻：用户提供三张动效库 UI 参考图（暖色卡墙 / 深紫卡墙 / 蓝色模板墙），
逐格设计复刻 26 张、经用户审片筛选后留 **20 张卡（标记◈）**（施工书为过程资产，不随库分发）。
⑥ 2026-09-02 社区贡献：douyin-follow-card（外部 PR #6，抖音主页关注卡）。
⑦ 2026-09-05 素材呈现拓展（标记◉）：三题调研（视频底床 / 图片运镜 / 多素材同屏）+ 抖音并列句排版教程逐帧拆解，实验室 47 张原型经用户两轮筛选留 21，按"它是什么"收成 **10 张卡**（其余落成规则：实拍底床处理链 design-language §1.2、多素材"关系→版式"表 shot-design §2④′、并列句三纪律 layout §7.1、字与画同起同收）。
⑧ 2026-09-05 video-shotcraft 移植（标记◎）：通读姊妹库 video-shotcraft 的 157 张产品片镜头卡，按四条标准（补口播空白 / 服务讲述不炫产品 / 过运动减法纪律 / 有 Remotion 母本改造成本可控）筛出 18 张做实验室原型，用户定 **9 张入库**（字幕花字 3 · 强调标注 3 · 数据信息图 2 · 转场 1）；其余 139 张的淘汰理由分组记在实验室页脚（过程资产不随库分发）。
共 **7 大类 98 张卡，全部有可播 demo + 自包含 tsx 源码**（各批次数字是入库时的历史记录；2026-08-27 用户定版
删 2 张：word-pop-captions 逐词弹跳字幕——与「底部字幕素排」纪律冲突且再无别的用武之地；
kinetic-center-build 逐词推挤居中）。
优先级：P0 = 跨平台高频、几乎所有头部口播在用；P1 = 某一流派的招牌动作。

通用规律（模板工业共识）：所有口播动效遵循**入场（固定 0.2~0.8s）→ hold（可伸缩）→ 出场（固定 0.15~0.5s）**三段式；
入场永远比出场更用力；同屏重音同一时刻只能有一个。

## 分类

| 类别 | 解决什么问题 | 卡 |
|------|--------------|----|
| 字幕花字 | 静音刷视频时也能接收语音信息与重音 | keyword-pop-highlight, typewriter-reveal, quote-card, type-contrast-emphasis◆, soft-blur-in◇, per-character-rise◇, line-by-line-slide◇, tracking-in◇, slab-punch-title◈, speed-slab-title◈, impact-open-title◈, alt-block-lines◈, outline-box-title◈, count-badge-title◈, quote-bracket-pull◈, word-slot-cycle◎, lead-word-zoom-assemble◎, title-demote-to-label◎ |
| 强调标注 | 给听觉重音配视觉重音；在素材上指哪看哪 | highlighter-sweep, scribble-annotation, magnifier-detail, callout-line-label, focus-dim-spotlight◆, strike-and-replace◇, ink-underline◇, hand-drawn-ellipse◈, converging-arrows◈, corner-bracket-frame◈, quote-hold-arrow◈, scanline-annotate◎, crash-zoom-punch◎, freeze-frame-annotate◎ |
| 数据信息图 | 让数字和结论"长"出来而不是贴出来 | number-counter, chart-grow, info-term-card, map-route-pin, line-chart-story-draw◆, ui-prop-theater◆, step-timeline-vertical◈, numbered-step-stack◈, metric-with-sparkline◈, bar-chart-growth◈, number-slab-pop◈, unit-grid-proportion◎, source-converge◎ |
| 素材呈现 | 证据（截图/照片/聊天记录/梗图）的入场仪式感；多素材同屏的排版 × 入场 × 焦点接力；也含「界面按脚本自演」的界面剧场卡 | ui-flow-theater◇, media-pop-in, news-card-desk, **pencil-sketch-draw★**, cursor-actor-demo◆, evidence-scroll-tour◆, motion-blur-slam-in◆, terminal-typing-log◇, chat-message-flow◇, logo-enter◇, chat-gpt◇, claude-code◇, glass-code-walk◇, gooey-morph◇, bed-echo-blur◉, rack-focus-pair◉, still-layout-relay◉, split-compare-slider◉, filmstrip-conveyor◉, grid-to-hero◉, stack-fan-out◉, split-60-40-story◉ |
| 转场结构 | 章节感与节奏切分 | chapter-title-card, shape-wipe-transition, **push-through-transition★**, **overexpose-flip-transition★**, **whip-pan-transition★**, **black-slam-transition★**, **pullback-cool-transition★**, **particle-weld-transition★**, **long-take-world★**, color-slam-beat-card◆, caret-wipe-transition◇, chapter-progress-list◈, line-carry-transition◎ |
| 人物互动 | 真人出镜画面里的信息层与互动引导 | lower-third-nameplate, behind-text-title, subscribe-cta, douyin-follow-card, host-shrink-to-chip◆, x-follow-card◇, chevron-lower-third◈, danmu-bubble-praise◈, parallel-items-with-host◉ |
| 运镜 | 静态素材（截图/图片/文档/UI）不死板：相机替素材动起来 | slow-push-in, slow-pull-reveal, tilt-3d-page, sway-parallax, orbit-drift, stage-keyframe-tour◇, cursor-locked-zoom◇, pip-zoom-box◈, multi-still-tour◉ |

★ = 实战卡；◆ = 真实视频挖掘卡（第三批）；◇ = remocn 适配卡（第四批，原型是 Remotion 组件，
个别卡「复用指引」里带 `registry/` 源码路径与秒↔帧换算）；◈ = 参考图复刻卡（第五批）；◉ = 素材呈现拓展卡（第七批，2026-09-05）；◎ = video-shotcraft 移植卡（第八批，2026-09-05，「复用指引」里带一行母本溯源）。
这些批次记号只是入库历史，不是分类维度，画廊与配方卡均不展示来源
（2026-08-28 用户定版：卡片 frontmatter 的「参考/复刻」来源字段已删除，画廊来源徽标与按来源搜索一并取消）。
## 输入类型索引（2026-09-05 起，选卡第一道过滤）

SHOTBOOK 每镜先写清输入是哪几种，再在这里挑吃得下的卡。代号：**人** = 口播人物在场（抠像 / 原片，必需或可选）· **V** = B-roll 视频（实拍 / 录屏 / 素材站）· **图** = 图片（截图 / 照片 / 海报）· **界** = 界面自演（无外部素材，卡自带界面）· **文** = 纯文字 / 数据（不吃素材）· **场** = 作用于前后两个场景（转场）。◉ 新卡的 md 开头另有三列表逐项说明。

| 类别 | 卡 → 输入 |
|---|---|
| 字幕花字 | 全部 **文**（作用于标题 / 金句 / 要点层）；quote-card 与 quote-bracket-pull 另有 **人**（让位 / 人在框内）；**◎ word-slot-cycle · lead-word-zoom-assemble · title-demote-to-label → 文**（句法级：列举槽 / 首词先占满 / 标题降格成路标） |
| 强调标注 | highlighter-sweep · scribble-annotation · magnifier-detail · callout-line-label · focus-dim-spotlight → **图**（含长截图 / 表格，视频截帧亦可）；strike-and-replace · ink-underline · hand-drawn-ellipse · converging-arrows · corner-bracket-frame · quote-hold-arrow → **文**；**◎ scanline-annotate → 图**（一次扫描点出 N 处）；**◎ crash-zoom-punch → 图 / V（截帧）**；**◎ freeze-frame-annotate → V**（本类唯一吃 B-roll 视频的卡：定格 + 圈注 + 解冻） |
| 数据信息图 | 全部 **文 / 数据**（卡自带图表与矢量）；info-term-card 可配 **人**（从人物对侧滑入）；**◎ unit-grid-proportion → 数据**（比例摊成 100 个可数格子）；**◎ source-converge → 文**（多对一机制图） |
| 素材呈现 | media-pop-in · news-card-desk · motion-blur-slam-in · gooey-morph · logo-enter · evidence-scroll-tour · cursor-actor-demo → **图**；pencil-sketch-draw → 矢量图；ui-flow-theater · terminal-typing-log · chat-message-flow · chat-gpt · claude-code · glass-code-walk → **界**；**◉ bed-echo-blur → 人 / V / 图 均可**（竖屏素材、只有一条素材）；**◉ rack-focus-pair → 图 / V**；**◉ still-layout-relay → 图 / V**；**◉ split-compare-slider → 图 / V（同构图两张）**；**◉ filmstrip-conveyor → 图 / V**；**◉ grid-to-hero → 图 / V 混排**；**◉ stack-fan-out → 图**；**◉ split-60-40-story → 左格 V / 图 / 人 均可 + 右格文** |
| 转场结构 | shape-wipe · caret-wipe · 运动承接六式 · long-take-world · color-slam-beat-card → **场**（作用于前后镜头，素材类型不限）；chapter-title-card · chapter-progress-list → **文**；**◎ line-carry-transition → 场 + 图**（A 镜标题下划线跑出画外围成 B 镜画框，B 内容为图 / 文） |
| 人物互动 | lower-third-nameplate · chevron-lower-third · behind-text-title → **人 + 文**；host-shrink-to-chip → **人 + 图 / V**；**◉ parallel-items-with-host → 人（必需）+ 图（全屏切分四式可 V）**；subscribe-cta · x-follow-card · douyin-follow-card → **界**；danmu-bubble-praise → **文** |
| 运镜 | slow-push-in · slow-pull-reveal · tilt-3d-page · sway-parallax · orbit-drift · stage-keyframe-tour → **图**（长截图 / 页面 / 照片；slow-push-in 也可 V）；cursor-locked-zoom → **界**；pip-zoom-box → **人 / V / 图**（保留全景放大局部）；**◉ multi-still-tour → 图 / V（多张独立素材）** |

转场选型口诀：镜头边界优先**运动承接六式**（各自一卡，共享
lead/tail 交叠 12~16 帧 + 两侧同向的动量交接纪律，代码同为 `template/motion-systems/transitions.tsx`）——
递进用 push-through，翻页用 overexpose-flip，并列用 whip-pan，最大反转用 black-slam（全片限一次），
收束用 pullback-cool，形态变换用 particle-weld；**一个边界只用一式，一片不要六式全上**（100s 的片 5~7 个边界，
重复用同式比集邮更有风格连贯性）。shape-wipe 是无相机系统时的轻量替代；color-slam-beat-card 是零补间的硬切节拍版；
空间叙事段落用 long-take-world 整段一镜。**图形接力**是第三族（2026-09-05 起）：`line-carry-transition◎` 让 A 镜的一条线自己跑到 B 镜去当容器——
相机六式交接的是动量，它交接的是**图形**；一支片只放一次当招牌转场位，且 A 侧信息要在横移前讲完。

---


以下七类**每卡一行**：`slug` 批次记号 中文名 · P 级 · 能量档 —— 一句话（含与兄弟卡的区分）。
参数 / 命门 / 已知坑 / 落位自检一律看 `references/cards/<slug>.md`（**唯一正主**，本文不再复写），实现看 `template/cards/<slug>.tsx`。

## 字幕花字

> 底部字幕素排铁律（正主 design-language.md §5）：跟读字幕**不加任何动效**、整句硬现；唯一例外 keyword-pop-highlight 且全片 ≤3 次。
> 本类其余各卡的作用对象都是**标题/金句/要点等独立文字层**，不是底部字幕。

- **keyword-pop-highlight** 关键词弹出强调 · P0 · 中 —— 字幕念到关键词时该词带色块弹出回落、画面微震；本类唯一允许作用于底部字幕的动效，每片最多三次。
- **typewriter-reveal** 打字机档案戳 · P1 · 低 —— 等宽字体逐字符敲出时间地点戳，末尾方块光标闪烁，档案调取感；它是标注不是标题，占角落不占中央。
- **quote-card** 金句大字卡 · P1 · 中 —— 金句时刻人物让位，实底板盖屏、多行大字逐行弹出、停留后整卡退场；要仪式感的金句用它，不想遮人物用 quote-bracket-pull。
- **soft-blur-in** ◇ 柔焦淡入 · P1 · 低 —— 整句像被镜头对焦出来，边解糊边淡入、位移先停；本类最低能量的一张，唯一可以连着上五句都不闹，不能承担强调。
- **per-character-rise** ◇ 逐字升起 · P1 · 中 —— 每个汉字从下方升到位，位移与淡入分走两条缓动、零模糊零缩放；有方向有力道零回弹的整句立起，同类唯一"有劲但不跳"的一档。
- **line-by-line-slide** ◇ 逐行滑入 · P1 · 中 —— 多行要点一行一行从左滑入、读完再向右穿出去；本类唯一的多行要点卡（不带底板），要让位用 quote-card、边讲边挂用本卡。
- **tracking-in** ◇ 字距收拢 · P1 · 中 —— 一行大标题字距从极松收拢、同一条 spring 同时解糊，零回弹长缓收；本类唯一的标题动作（不是字幕），一片限一两次。
- **slab-punch-title** ◈ 重点放大 · P0 · 高 —— 两行标题的重点词坐在斜切色块上，块先从中心撑开、字后硬切砸落；本批标题色块类的基准式，"铺垫 + 结论"对照句专用。
- **speed-slab-title** ◈ 速度块标题 · P1 · 高 —— 副题斜切色块从画外冲入到位、块左缘张开速度线残影随即淡尽，字比块慢半拍在追；同类里唯一带速度语义的一张。
- **impact-open-title** ◈ 冲击开场 · P0 · 高 —— 整句一次砸出、末词延后换强调色再 punch，四角取景框与点阵网格更慢更淡地做衬；开头三秒钩子，全片限一两次。
- **alt-block-lines** ◈ 双色块对句 · P1 · 中 —— 两行对句各坐在贴合色块上、块从左展开把字"刷"出来，同结构反色表达对照；同类唯一的双行对照块式标题，做关系不做强调。
- **outline-box-title** ◈ 描边框标题 · P1 · 中 —— 圆角描边框沿路径一笔画完一圈，闭合后实心 chip 展开、chevron 依次点亮；给结论加框，机器画的框（对照 hand-drawn-ellipse 的手绘线）。
- **count-badge-title** ◈ 数字重音标题 · P1 · 中 —— 数字先单独缩到位并落定换色，量词被它从右缘推出、第二行再跟上；开场承诺条数（"三个方法"），数字是主语，靠先后不靠砸。
- **quote-bracket-pull** ◈ 引号夹句 · P1 · 中 —— 两枚大引号同帧从对角推入夹出引文区，金句在其中错峰淡入、末行荧光笔扫过；不盖底板的金句卡（人物全程在画面里），"被引用"的话用它。

## 强调标注

- **highlighter-sweep** 荧光笔高亮扫过 · P0 · 低 —— 半透明黄色荧光笔从左到右扫过引用文段的关键句，同帧其余文字压暗——给文档里的一整句划重点，跟着朗读走。
- **scribble-annotation** 手绘圈注箭头 · P0 · 中 —— 马克笔质感的圈/下划线/箭头按真实笔顺在素材截图上现场画出，画完干净静置；作用对象是素材而不是文字。
- **magnifier-detail** 局部放大镜 · P1 · 中 —— 截图目标处弹出圆形放大镜落到旁边空白区，本体同步压暗、连接线指回出处，一次回答"在哪"和"是什么"。
- **callout-line-label** 标注引出线 · P1 · 中 —— 目标上圆点亮起、折线向外生长、线端文字标签揭示，三拍严格串行一气呵成；本类唯一带文字标签的引线（给这个东西起个名）。
- **strike-and-replace** ◇ 划线纠错替换 · P1 · 中 —— 语义色横线划穿旧值，新值从同一位置升起顶上来；本类唯一能表达"否定"的一张，划穿的动作本身就是论证。
- **ink-underline** ◇ 墨迹下划线 · P1 · 低 —— 起笔压满、收笔提细的墨色缎带沿关键词下方生长，画完静置；本类唯一有笔压的下划线，比荧光笔轻、比圈注准，作用在句子里的一个词上。
- **hand-drawn-ellipse** ◈ 手绘圈重点 · P0 · 中 —— 一笔逆时针画出的歪椭圆圈住句子里的关键短语，圈画完短语才 punch 一拍；指认单个短语，比双线强、比爆点字克制。
- **converging-arrows** ◈ 双箭头聚焦 · P1 · 中 —— 两支手绘箭头从对角几乎同时画向关键词、箭尖留白不戳字，都到位后词才换色；本类指向性最强的一张（箭头有方向，圈没有）。
- **corner-bracket-frame** ◈ 对角角框 · P1 · 低 —— 左上与右下两个 L 形角框同帧从外侧对角收进来、框先立住再放标题两行；定题用的取景动作（"本集只讲这一件事"），本类唯一给整块划边界的。
- **quote-hold-arrow** ◈ 金句停留 · P1 · 中 —— 三行金句先全部平淡落地、末行停一拍后才升级高亮并 punch，然后停住；本类唯一强调整句而不是词的一张（有铺垫、有转折）。

## 数据信息图

- **number-counter** 数字滚动计数 · P0 · 中 —— 大号数字从 0 滚到目标值，先快后慢、落定轻弹一拍后单位淡入，变体是逐位滚轮高位先停；展示量级"滚出来"的过程。
- **chart-grow** 图表生长 · P0 · 中 —— 坐标轴先淡入，柱子依次错峰长出、柱顶数字跟着弹出，最高柱高亮并轻 punch；用于逐项列举/对比（整体形状用 bar-chart-growth）。
- **info-term-card** 名词解释悬浮卡 · P1 · 低 —— 说到专业名词时，图标+词条+两行释义的圆角卡从人物对侧滑入，停留期间缓慢上下浮动像悬浮着，念完原路滑出。
- **map-route-pin** 地图路线图钉 · P1 · 中 —— 地图上虚线按叙事顺序从 A 城生长到 B 城，到达瞬间图钉从上方砸下压扁回弹，地名标签从钉侧滑出。
- **step-timeline-vertical** ◈ 竖向步骤线 · P1 · 中 —— 竖线从上往下画，线推到哪节点就在哪弹出、文字跟着淡入，到位后首节点升级成空心环标当前步；用于有先后依赖的流程（并列清单用 numbered-step-stack）。
- **numbered-step-stack** ◈ 编号步骤堆入 · P1 · 中 —— 带编号方块的横条从右侧均匀错峰依次堆入，每枚落定时编号块 punch 一下确认，整组到位后轻微上浮收成一件事；用于并列清单（有先后依赖用 step-timeline-vertical）。
- **metric-with-sparkline** ◈ 数字带趋势 · P0 · 中 —— 大数字滚动与下方小折线同刻起跑，数据点跟线端弹出，数字停住那帧单位和箭头才出现；"一个数 + 它怎么来的"双层信息（孤立数字用 number-slab-pop）。
- **bar-chart-growth** ◈ 柱状增长 · P0 · 中 —— 基线画出后多根柱以密错峰一路升起读作一次连续抬升，最后一根到顶时结论 chip 弹出；讲连续区间趋势的整体形状（不是逐项对比，那用 chart-grow）。
- **number-slab-pop** ◈ 数字弹出 · P0 · 中 —— 实色块先落定，块稳住后巨大整数一次弹出、小数与单位延后淡入、说明行最后上浮；一次弹出的结论感数字（要展示过程用 number-counter / metric-with-sparkline）。

## 素材呈现

- **media-pop-in** 素材弹入堆叠 · P0 · 中 —— 截图/照片带白边投影从 80% 回弹到位、随机歪斜层层压角、多张错峰拍上桌，是证据素材"歪着叠"的入场。
- **news-card-desk** 新闻卡片划重点 · P0 · 中 —— 新闻截图包成白色圆角卡片歪着滑上桌，红色下划线等朗读到关键句才扫过，第二张卡压叠上来，卡片全程极缓 Ken Burns。
- **terminal-typing-log** ◇ 终端逐行推进 · P1 · 中 —— 通用终端当证据的 stdout 流水（对照 claude-code◇ 的因果链）：命令逐字符敲、日志成簇蹦出、缓冲区整跳零插值、`...` 行冻结制造悬念。
- **chat-message-flow** ◇ 聊天记录自演 · P0 · 中 —— 把聊天截图从过去式改成现在进行时：我方经输入框逐字打出再上屏、对方先出三点气泡再回，时刻表由文本长度自动生成。
- **logo-enter** ◇ Logo 登场 · P1 · 低 —— 本类唯一的身份标识入场（其余都是证据素材）：圆牌 spring 弹到位、字标推出、描环合拢三拍收尾，落定即终帧不加微动。
- **chat-gpt** ◇ ChatGPT 对话框 · P1 · 中 —— AI 聊天产品自演（单行药丸 + 首屏三件套那一路）：三件套错峰淡入、提示词打进药丸、语音键原地变形成发送键、回答流式吐出，产品皮即内容。
- **claude-code** ◇ 编码智能体终端 · P1 · 中 —— 演因果链而不是 stdout 流水：Claude Code 终端里命令敲入后「工具调用 → 结果 → diff → 结论」逐行蹦出，讲"AI 帮我写代码"用本卡（界面自己生成内容、没有光标）。
- **glass-code-walk** ◇ 玻璃代码走读 · P1 · 低 —— 带观众读一小段真实代码，整块都在但同时只有一行是亮的：相机与高亮带同源逐行走读、读完拉回全景，是 cursor-locked-zoom◇ 的逐行浅档。
- **gooey-morph** ◇ 图块拼入 · P1 · 中 —— 素材呈现里的"并列拼"（另两张是歪着叠与同向怼）：几张图各走 L 形路径、起飞不按左右顺序，严丝合缝拼成一条横排，拼完即落点。
- **ui-flow-theater** ◇ 界面流程剧场 · P0 · 中 —— 界面剧场子类的架构母卡，讲完整流程：整套灰阶假面板按一张时刻表自演，光标走位与控件换态共享同一时间源，成功 toast 收尾（只演一两个动作用 cursor-actor-demo◆）。

### 界面剧场子类（整套界面按脚本自演）

同源卡 ui-flow-theater◇ / terminal-typing-log◇ / chat-message-flow◇ / chat-gpt◇ / claude-code◇ / glass-code-walk◇ / cursor-actor-demo◆ 共用下面这套纪律。

产品/工具类口播讲"这个东西怎么用""AI 现在在干什么"时，常见三条路都有硬伤：录屏（光标 12px 看不见、
节奏由手速决定、要脱敏就废了）、截图硬切（丢掉"这一步导致了那一步"的因果）、逐个控件各做动效
（每个控件一条时间线，排到第三个就对不上拍了）。这类卡是第四条路：**把整套界面当一个演员，给它一份剧本**
——界面按脚本时间轴自演，观众看到的是"这一下导致了那一变"的因果链，而制作者只维护一张表。
与本类其余各张的区别在于素材的时态：那些是把已发生的证据**拍上台**（过去式），本子类是让界面**当场演**（现在进行时）；
与「运镜」的区别在于动的是谁：运镜里动的只有相机、界面本身一个像素不改，本子类里相机不动、界面自己换态。

共有纪律（本子类通用）：
- **时间只从一处进入**：一张时刻表（`STEPS` / `FRAGMENTS` / 轮数）是唯一的时间源，
  光标、控件、结果都是它的函数。对齐靠共享常量，不靠两处手数——这是能排到三拍以上还不散架的全部原因。
- **换态是硬切，不是动画**：界面状态变化要一帧到位（`transition: none`）或极短（0.27s 一档全卡共用）。
  给状态变化配过渡就变成"样式在做动画"，观众读不出是哪一下触发的。
- **时刻表按内容长度自动累加**，改文案不用重排时间；各动作时长是**手感常量**（不跟着语速缩放——
  语速快时该减少拍数，而不是加快每一拍）。
- **灰阶中性皮 + 唯一语义色**：控件全部灰阶线框，语义色只留给收尾那一拍（成功 toast / 品牌红那一行）。
  做成某个真实产品的配色，观众开始读平台品牌，且你要为仿真背锅。

## 转场结构

- **chapter-title-card** 章节标题卡 · P0 · 中 —— 段落切换时全屏色块压入，超大章节编号先落位、章节名随后遮罩揭示，短停后同向扫出切回口播；只宣告新一幕开始、不给全片进度。
- **shape-wipe-transition** 色块扫屏转场 · P0 · 高 —— 两三层同色系色块错峰从同一方向扫过全屏，换场藏在遮挡帧里观众看不见切换瞬间；色块是不透明遮挡物，无相机系统时的轻量转场。
- **caret-wipe-transition** ◇ 光标擦除转场 · P1 · 中 —— 一条文本光标从左到右扫过完成换场，走过处新场景沉降解糊、未到处旧场景上浮失焦；本库第一个边界本身有语义（编辑器隐喻）的转场。
- **chapter-progress-list** ◈ 章节进度 · P1 · 中 —— 暗场里章节目录错峰滑入、站定后只高亮当前一条并收合电影角框；本类唯一带进度信息的转场，要给全局位置时用它而非 chapter-title-card。

## 人物互动

- **lower-third-nameplate** 人名条展示牌 · P0 · 低 —— 画面左下色条横向展开、姓名遮罩揭示、头衔跟进的三段接力人名条，停留后反向收回；克制的新闻/访谈感，是"这个人是谁"的最小信息。
- **behind-text-title** 人后大字视差 · P1 · 低 —— 超大标题从人物身后升起、下缘被人物遮挡穿出，hold 期两层反向极缓漂移读出伪 3D 层次；人物层需抠像。
- **subscribe-cta** 多平台关注 CTA · P1 · 中 —— 控件弹入→光标弧线移入→状态翻转+确认动效的关注示范，YouTube 订阅/B站三连/通用关注三式共用一套机制、落地只留一段；用在收尾号召观众去点。
- **x-follow-card** ◇ 关注卡弹出 · P1 · 中 —— X 资料卡弹入后十层内容错峰 blur-in 落位，光标走过去点"关注"、按钮翻转且粉丝数 +1；介绍别人的社会证明道具，对照 subscribe-cta 是"卡而非控件、证明而非号召、中段而非收尾"。
- **douyin-follow-card** 抖音主页关注卡 · P1 · 中 —— 抖音用户主页卡弹入、内容错峰 blur-in、光标点"＋关注"翻转并联动"发私信"，粉丝数静态；x-follow-card 的抖音版，介绍"某人在抖音上"时用。
- **chevron-lower-third** ◈ 动态人名条 · P1 · 低 —— 姓名推出、职称 chip 展开、三枚 chevron 依次点亮收尾的人名条；比 lower-third-nameplate 多一档节目感，正式访谈与纪录片仍用那张。
- **danmu-bubble-praise** ◈ 弹幕气泡 · P1 · 中 —— 四枚评论气泡错峰从两侧飘入、短停后上移淡出，进出交叠且只有一枚强调色；"评论区都在说"的社区共识道具，对照 x-follow-card 的个人档案，本卡是多人即时共识。

## 运镜

静态素材（网页截图/图片/文档/UI 界面）一贴上屏画面就死——观众没有理由把眼睛留在上面。
**网页类证据更进一步：禁止静态贴屏，必须"拍"**——滚 / 巡 / 放大 / 划四种拍法的选型表在
shot-design.md §2④「网页拍摄」，采集规格（全页 2× 长图 + DOM 坐标 JSON）在 broll-sources.md「网页拍摄素材采集」。
前七张卡不改素材一个像素，只让**相机**动（末一张 pip-zoom-box◈ 是例外，见下）：素材满画幅铺在一个"相机层"里，相机层是唯一被 transform 的元素。
选型：**默认用 slow-push-in**（任何静态素材的底噪运镜）；素材信息量大且要揭示规模用 slow-pull-reveal；
把页面当"产品/作品"展示用 tilt-3d-page；素材比画幅宽得多用 sway-parallax；
页面要在屏上停留很久（长讲述）用 orbit-drift；素材超出画幅且要"讲到哪儿镜头停到哪儿"用 stage-keyframe-tour◇；
目标本身在移动（光标/进度点/正被填的字段）用 cursor-locked-zoom◇；
要在保留全景的同时长期展示一个局部用 pip-zoom-box◈（唯一不动整幅画幅的一张）。
**一段素材只用一式**——推着又摇着读作手抖。
2D 两式（推/拉）与 3D 三式可以串联：tilt-3d-page 建立立面姿态 → orbit-drift 接管 hold 期底噪是推荐组合。
前五张都是**单段运动 + hold**（一段一个姿态目标），后两张◇是**多目标寻址**：一个走预设兴趣点路径、
一个锁运行时才知道位置的移动目标——这是"单段运镜"与"路径/跟拍"的分界。

共有纪律（前五张通用，也是与其他类别最大的差别）：

- **相机永不静止**：hold 期必须以主段末速继续走。前五张卡的 ease 都是"末速非零"的自定义曲线
  `p + (1−r)·p²·(1−p)`（起速=平均速、末速=r×平均速），**不能用 `power2.out`**——它末速为零，到位那帧镜头停死。
  例外有两处：tilt-3d-page 的立起段是一次"摆放"动作（有始有终的事件），允许收住；
  **stage-keyframe-tour◇ 与 cursor-locked-zoom◇ 整条反过来**——它们的 hold 必须**真的静止**
  （巡游的信息量在 hold 里、跟拍要留时间让人读完），静止在那两张卡里是功能而不是失误。
- **时长跟着口播走，运动量不跟**：`zoomTo`/`ampRot` 这些是观感常量（换时长不改），时长才是节奏变量。
- **可读性是硬上限**：3D 倾斜 ≤25°（超过远端正文读不了）、摇移 ≤190px/s@960 宽（超过观众扫读跟不上）、
  推进 ≤1.2（超过位图发虚）。3D 卡的透视值 900~1200px——太小读作鱼眼变形，不是空间。
- **3D 三式的投影必须跟着姿态变**：与页面同处 `preserve-3d` 空间（被透视自动压扁）+ 浓度随倾斜加深
  + 位置往倾斜反侧偏移。投影不动 = 页面读作贴纸而不是浮在空间里的实体。
- 素材分辨率 ≥ 画幅 × 最大缩放（1080p 画幅推到 1.15 需 ≥2210px 宽的截图），否则运镜即变糊。

- **slow-push-in** 缓推特写 · P0 · 低 —— 静态素材的默认底噪运镜：相机极缓匀速推向兴趣点、hold 期沿末速续推不停死，Ken Burns 的推镜半边。
- **slow-pull-reveal** 缓拉全貌 · P0 · 低 —— 从局部细节匀速拉远到素材原样满画幅以揭示规模，语义与 slow-push-in 互为反面，一段只能选一个方向。
- **tilt-3d-page** 3D 立面展示 · P1 · 中 —— 正视静置后倾斜成 3D 立面，把页面从"信息"变成"物件"，作品/产品展示或让页面降权为背景道具时用。
- **sway-parallax** 左右摇移 · P1 · 低 —— 素材比画幅宽得多时，镜头在长页前横向匀速扫过并极轻 rotateY 跟随，纵向长页归 evidence-scroll-tour。
- **orbit-drift** 环绕微漂 · P1 · 低 —— 两轴正弦相位错开合成闭合椭圆轨迹的环绕微漂，"镜头呼吸"的高级版、本类唯一可无限持续的运镜，页面要长期停留时用。
- **stage-keyframe-tour** ◇ 长页兴趣点巡游 · P1 · 中 —— 超出画幅的长页躺在 3D 舞台上，相机沿多关键帧路径依次停靠预设兴趣点再拉开全貌；相机动页面不动，与页面自滚的 evidence-scroll-tour 相对。
- **cursor-locked-zoom** ◇ 光标锁定跟拍 · P1 · 中 —— 小屏念长命令的唯一解法：相机锁死在光标上跟拍、镜头由打字进度驱动，目标位置运行时才知道，收尾拉回全景。
- **pip-zoom-box** ◈ 画中画放大 · P1 · 中 —— 取景框带着框内画面飞到侧边定居成画中画，本类唯一保留全景的一张；看一眼就撤用 magnifier-detail，要长期挂着用本卡。

## 实战卡（项目沉淀，详情见各卡文件）

- **pencil-sketch-draw** ★ 铅笔手绘揭示 · P1——铅笔骑在 SVG 路径笔尖当场画图，画完干净静置。来自 ann_nnng 手绘卡片技法复刻。代码 template/components/pencil.tsx。

**运动承接转场六式 ★**（六张卡，共享同一套纪律与同一份代码）：六式同属"动量交接"家族：相邻 Sequence 交叠 12~16 帧，`ShotFade` 只管像素淡化，方向与加速度全在两侧相机曲线里；
**两侧必须同向**（方向断裂比硬切更糟），**一个边界只用一式**。来自 ai-math-video 全片实战，
代码同为 template/motion-systems/transitions.tsx（CamKey 生成器 + 叠加层）。

- **push-through-transition** ★ 推穿转场 · P0——出场加速推到 1.35x + 升 blur，入场从模糊的 1.16 高位反向沉降。家族基准式（无叠加层、只有 scale 轴），最安全、可反复用。生成器 pushThroughOut + settleIn。
- **overexpose-flip-transition** ★ 过曝翻页转场 · P0——推向证据物至 1.5x + 重音层以切点为锚冲顶（切前 0.26s 升 / 切后 0.42s 落），入场从亮心拉出。**重音极性随底色换**：深底白色径向过曝 0.42~0.55，白底改压暗一拍。生成器 blowoutOut + settleIn(from 1.3) + Overexpose。
- **whip-pan-transition** ★ 横甩转场 · P0——出场沿横轴甩出 + 8px 方向模糊 + 1.4° 微旋，入场从**同方向对侧**滑回、0.35s 刹住 + 二段回稳只收旋转。处理并列关系；交叠最短（≈9 帧，糊帧本身是遮挡）。生成器 whipOut/whipIn（两侧同 dir）。
- **black-slam-transition** ★ 黑震切转场 · P0——出场相机定格一拍（全片唯一静止）+ 重音冲顶 + 最后 1 帧 hardOut 零交叠，入场满亮直切且开场自带运动（三段递减震位 + 从 1.10 后拉刹住）。**全片唯一硬切，限用一次**，留给最大反转。无生成器（出场是"不加键"）。
- **pullback-cool-transition** ★ 后拉冷却转场 · P0——出场相机收住、内容自己沉暗失焦交出画面；入场是全片唯一 scale<1 起步的后拉（0.90→0.99，settle 0.90s 最慢，交叠 16 帧最长）。全 sine 系缓动的呼吸质感，用在情绪收束点。生成器 pullBackIn。
- **particle-weld-transition** ★ 粒子溶接转场 · P0——出场主体碎成粒子向上飘散，入场用**同 seed** 的同一批粒子从下方继续上升、在新主体位置收拢，主体滞后 0.30s 成形。唯一动量在物质而非相机上的一式；语义必须真的是"同一件东西换形态"。组件 Shatter + 两侧同 seed ParticleDrift。
- **long-take-world** ★ 长镜头世界画布 · P1——内容钉在世界坐标，一台相机随讲述连续运镜，useArrive 让内容在镜头到达前成形。代码 template/motion-systems/longtake.tsx（已实战：deepseek-harness-v2 V3 幕）。

## 真实视频挖掘卡（第三批◆，详情见各卡文件）

来源：小Lin说·韩股崩盘（douyin 362s）+ TheAIScaler shorts 播放量 top10。两频道语言差异值得按调性选卡——
**TheAIScaler** = 硬切 + 高饱和纯色底 + 字体对比的高频节拍（平均 1.5~3s 一个视觉事件），信息靠节奏压强；
**小Lin说** = 图表推演 + 聚焦压暗 + 长页证据的推理链，信息靠空间与因果。

- **type-contrast-emphasis** ◆ 字体对比重音 · P0 · 字幕花字——重音词换衬线斜体放大 1.5~2 倍（或换唯一强调色），强调靠字形气质落差而非弹跳；与 keyword-pop-highlight 同句互斥。
- **focus-dim-spotlight** ◆ 聚焦压暗切换 · P0 · 强调标注——讲到哪里哪里亮：目标保持原亮并点亮发光描边，其余压暗 40% 或整页高斯模糊，焦点随口播 0.2s 跳转。
- **line-chart-story-draw** ◆ 折线分段推演 · P0 · 数据信息图——折线不一次画完：新线段从拐点向右生长、标签段完成即弹出，对比虚线从同一拐点岔出第二种未来。
- **ui-prop-theater** ◆ 界面道具剧场 · P1 · 数据信息图——拟物 UI 道具（进度条/清单/滑杆）的状态按语音节拍分段跳进，界面自己演戏而不是跑 loading。
- **cursor-actor-demo** ◆ 光标演员演示 · P0 · 素材呈现——超大系统光标在 UI 截图上移动-悬停-点击，元素即时响应，一个动作对齐一个口播词。
- **evidence-scroll-tour** ◆ 证据长页慢滚 · P0 · 素材呈现——长截图页作为唯一动元素匀速上滚，预标注随页滚动，讲到关键处减速停留，滚速就是讲述节奏。
- **motion-blur-slam-in** ◆ 模糊甩入急停 · P1 · 素材呈现——素材卡带方向运动模糊从屏外高速飞入、0.2s 内急停落位，模糊由重到清收敛；与 media-pop-in 的 scale 弹跳二选一。
- **color-slam-beat-card** ◆ 纯色硬切节拍卡 · P0 · 转场结构——一帧硬切到高饱和纯色底（零过渡零擦除），色块上大字与素材卡错峰入场，停 1.5~5s 再硬切回，用底色跳变当节拍器。
- **host-shrink-to-chip** ◆ 人物缩位让台 · P1 · 人物互动——图形上台时讲者从全屏 0.4s 缩进角落圆形头像章继续口播，图形讲完再放大回全屏，主角让位但人不消失。

## 素材呈现拓展卡（第七批◉，2026-09-05，详情见各卡文件）

来源：2026-09-04 三题调研（视频底床 / 图片运镜 / 多素材同屏，Vox · Johnny Harris · MKBHD · 小Lin说等拆解 + Material / Apple / NN/g 的 scrim 口径）
+ 抖音 @剪辑李一手 / @剪Bingo子 并列句排版教程逐帧拆解；实验室 47 张原型经用户 2026-09-05 两轮筛选留 21，再按"它到底是什么"收成 10 张卡，其余落成规则
（实拍底床处理链 design-language §1.2 / 多素材"关系→版式"表 shot-design §2④′ / 并列句三纪律 layout §7.1 / 字与画同起同收 cinematography §2 G1、§5.8）。
本批每张卡 md 开头有「输入类型」三列表与「常用场景」四条（选卡时与「落位自检」一起抄进 SHOTBOOK）。

- **parallel-items-with-host** ◉ 并列句排版（人物在场） · P0 · 人物互动——口播讲"A、B、C"三件并列的事而人还在画面里：三项按口播逐个弹出（0.6s 一项）、标签压图且大、人物永远在场（形态随版式变），七式一卡切换（头顶横排 / 三横条灰转彩 / 竖列虚化底 / 顶部卡堆 / 竖切三分 / 斜切三分 / 背景轮换大字），一镜一式。
- **still-layout-relay** ◉ 多图排版 + 焦点接力 · P0 · 素材呈现——一主两辅（主图 57% 宽 + 右列两张等大）或三联竖图，主图先落、其余同向错峰 80~150ms 入场，讲到谁谁亮（其余 brightness .6 / scale .985），接力后全部回位一起退场。
- **split-compare-slider** ◉ 对比双分屏（滑动揭示） · P0 · 素材呈现——两张同构图叠放，分割线与 clip-path 同一进度：1.4s 滑到中线 → 停 → nudge 强调 → 滑到 8% 几乎全露 → 回中；before/after、改造前后、新旧版本。
- **filmstrip-conveyor** ◉ 传送带列举 + 减速停靠 · P1 · 素材呈现——≥5 张接成传送带匀速左行 176px/s，经过中线的按距离连续放大 1.08 提亮，讲到关键一张按位置-时间分段积分减速到 0.25× 停 1.4s 再恢复——速度就是讲述节奏。
- **grid-to-hero** ◉ 网格收成主角 · P1 · 素材呈现——2×2 错峰落位先并列，讲到哪张它 0.8s 长成主图、其余收成一列小图不消失（"从这四个里选的"），Remotion 用 transform（FLIP）。
- **stack-fan-out** ◉ 卡堆扇形展开 · P1 · 素材呈现——五张先叠成一叠 → 0.7s 扇开（±24°、弧心在下方）→ 停 → 0.6s 铺平成一行等距——"这一叠"变成"这五个"；图片专用。
- **split-60-40-story** ◉ 60/40 主从分屏 · P1 · 素材呈现——左 60% 一条素材缓推（时长 = 镜头），右 40% 标题 + 三枚 pastel chip 按口播逐枚弹出；"看着它干活，边听边记要点"，左格 B-roll / 图 / 口播本人均可。
- **bed-echo-blur** ◉ 同源模糊底床 · P0 · 素材呈现——前景素材装白边卡，同一条素材放大 1.25 + blur 26 + brightness .45 慢放 0.5× 铺满当底床，颜色天然统一；竖屏素材放横屏、只有一条素材的镜头的标准答案；输入口播 / B-roll / 图均可。
- **rack-focus-pair** ◉ 焦点接力 · P1 · 素材呈现——两张前后叠放一清一糊（blur 8 / brightness .6），讲到哪张焦点 0.7s 转移过去再转回，被糊的不退场；"A 和 B"来回提及、新旧对照、引用 + 反驳。
- **multi-still-tour** ◉ 多图巡览停靠 · P1 · 运镜——三张挂在 −12° 3D 墙上（wall）或四张沿时间线上下交替（timeline），相机全景 → 逐张停靠（每站缩放绕当前图、其余压暗 + 虚化、当前图 1→1.03 微推）→ 拉回全景；"接下来三个例子"、发展史 / 版本演进。

## video-shotcraft 移植卡（第八批◎，详情见各卡文件）

来源：姊妹库 video-shotcraft（产品宣传片镜头库，157 卡 10 类，全部有 Remotion tsx 母本）通读一遍，按四条标准筛——
① 补口播库空白；② 服务讲述不炫产品（主体能换成口播里的证据 / 数据 / 标题 / 人物）；③ 过运动减法纪律（暗场追光 / 霓虹 / 线条沸腾 / 呼吸同心圆一票否决）；④ 有母本、改造成本可控。
18 张进实验室做原型（本地不进库），用户定 9 张入库。每张卡「复用指引」带一行母本溯源（`video-shotcraft <卡名>`），tsx 以母本为起点改写成本库自包含契约（中文排版 / 浅底色板 / 落定即静）。

- **word-slot-cycle** ◎ 词槽轮换 · P0 · 字幕花字——句干左端锚死不动，句尾深色胶囊每 0.7s 向上翻一格换一个短语（前 8 帧换位、后 13 帧静置读词），胶囊宽随词长插值，上下露 13% 幽灵项；换完 N 个词胶囊上飞、结论带全卡唯一一次过冲落进同一位置。"它能帮你 A / B / C / D"式列举、受众列举、章节预告。
- **lead-word-zoom-assemble** ◎ 首词占满补句 · P1 · 字幕花字——首词 2.3 倍字号独占画面正中并推近 6%，随后一条曲线同时缩回终字号与整行左滑归位（缩回 12 帧 / 左滑 24 帧同缓动），后续词各自被推进槽位（淡入仅 2 帧），落定后上移让副行同窗浮出。一句话主张先立主语、产品名字卡、数字先行、反转句。
- **title-demote-to-label** ◎ 标题降格成标签 · P0 · 字幕花字——章节标题居中解糊显影、站稳 ≥18 帧，单次 inOut 补间 20 帧缩到 0.4 倍飞到左上角落成小节标签常驻，降格进行到 12 帧时内容块已在其下错峰生长（交接无空档）。教程 / 方法论的小节交接、"第 N 点"路标、问答式展开。
- **scanline-annotate** ◎ 扫描线逐处点名 · P1 · 强调标注——一条亮扫描线匀速（零缓动）掠过截图，越过每个目标下缘那一刻取景框 1.75→1 收拢对准 + 7% 对焦确认闪，滞后 5 帧右侧标注淡入，状态行实时计数；触发时刻由 bbox 反算不写死。"这张页面有 N 个问题"逐处点评、评测多功能点、合同 / 财报截图划重点。
- **crash-zoom-punch** ◎ 急推特写 · P1 · 强调标注——全景静置 1s 后 6 帧 ease-in 急推到截图局部（zoom 2.3、中心同步收敛到目标文字块），过冲后 5 帧回收 4.5% 钉死，推进段叠短促 blur；它是一次性的重音（切）不是 hold 期运动。"就是这一行"按住账单 / 条款 / 聊天记录里的那句。
- **freeze-frame-annotate** ◎ 定格圈注 · P1 · 强调标注——B-roll 正常播后瞬时定格（4 帧 18% 白闪当快门），停 8 帧后手绘感椭圆 8 帧描边圈住目标、箭头 6 帧点题、标签浮出，hold ≥1.6s，圈注淡出同帧解冻并 1.4× 追一秒补回时长；画完的圈静置不抖。库内唯一吃 B-roll 视频的标注卡：操作演示定格指键位、纪录片式"注意背景"、投稿视频圈细节。
- **unit-grid-proportion** ◎ 点阵比例图 · P0 · 数据信息图——10×10 = 100 格从中心分环长出（每环 4 帧 + 3 帧抖动，只做 opacity + 0.8→1，无位移），再按阅读顺序逐格染成强调色、右侧大数字同步 0→N，图例最后浮出。"每 100 个观众有 37 个划走"、"10 个人里有 7 个"、转化 / 留存率——把比例摊成可数个体（unit chart）。
- **source-converge** ◎ 多源汇聚 · P2 · 数据信息图——四条贝塞尔曲线错峰 0.15s 逐路描出，来源胶囊沿各自真实曲线滑向汇聚点并三段式缩小（前 75% 瘦身、后 25% 掉光），强调色数据包沿线滑行两整周期，吞并瞬间汇聚点脉冲 +12%，曲线反向擦除后结果胶囊与说明行 0.6s 滑到画面中心静止。"N 个来源汇到一处"的工作流、多渠道一个入口、多线索同一结论。
- **line-carry-transition** ◎ 线条接力转场 · P1 · 转场结构——A 镜标题下画出强调色下划线，停一拍后继续向右冲出画面，镜头跟线横移 960px（线生长 = 镜头位移，笔头钉在画面 x≈640 永不出画也永不落后），到位后直角硬拐围出 560×330 的 B 镜画框，闭合帧笔头卸载、B 内容在框内淡入。全片唯一的招牌转场位；相机六式交接动量，它交接图形。
