# 素材呈现拓展 · 镜头卡实验室（2026-09-04）

> 状态：**实验室原型**，14 张镜头卡只有 HTML 版（一页多舞台，`index.html`），未经 `verify-demo` / tsx 化 / sfx cue，
> **不计入 79 卡**。目的是把三个问题的调研结论做成能看的画面，供挑选后再按 demo-spec 定版入库。
> 目录在 `demos/_lab/`（画廊构建跳过下划线目录）。

```bash
./fetch-media.sh                 # 首次：拉素材到 media/（不进库；缺素材时页面自动回落远程直链）
open index.html                  # 直开即可；滚到卡片处自动循环播放，悬停出重播 / 0.3x
```

素材授权：视频 Mixkit **Free License**（逐条核过页面授权标签，Restricted 的一律排除——其 1080 直链返回 403 可作旁证）；
图片 Lorem Picsum 稳定 ID（Unsplash License）。ID 清单见 `fetch-media.sh` 与页脚。

三个问题来自用户 2026-09-04 的提问：① video 素材能否做低存在感的动态背景，再叠字幕动效与核心素材的呈现动效；
② 图片运镜能否比推拉更丰富（对角、横移、2.5D、3D 各角度）；③ 多素材同屏时动效、运镜、排版怎么配合。

---

## A · 视频素材做低存在感动态背景（底床）

### 调研结论
1. **不是"调低透明度"**。透明度只在深底上勉强成立，叠在浅底上会把画面洗成灰雾。业界（Vox / Johnny Harris 式解说、新闻包、纪录片字卡）
   的标准处理链是：**压暗 brightness .35~.50 + 去饱和 .5~.7 + 渐变遮罩带（scrim）只压文字区 + 极慢运动**（缩放 ≤0.6%/s 或横移 ≤3px/s）。
   可选两条支线：**模糊**（20~30px，见同源模糊）和**双色调**（先 grayscale 再两层混合染成主题色）。
2. **文字可读性靠 scrim，不靠底床整体变暗**。scrim 是从文字所在边缘起的渐变带（底部 60~78% 不透明到 0），整屏罩＝又回到"调透明度"。
   文字仍加 1~2px 软阴影兜底；底床里的亮斑一穿到字后面就不可读——选片时避开高光大面积移动的素材。
3. **运动关系**：底床只做缩放或极慢横移，不做摇移（观众正在读字，底床一摇就晕）；底床 : 内容 视差比 0.5 : 1.0（对应 G2 Plane）；
   前景核心素材与底床**速度必须错开**（同速读作整屏在缩放，深度感全丢）。
4. **同源模糊底床**（竖屏放横屏的"blur fill"技法泛化）：前景本体清晰装卡，同一素材放大 1.25 + blur 26px + brightness .45 铺满——
   不用找第二条素材，颜色一定和谐。是"只有一条可用素材"的镜头的标准答案。
5. **让位**：底床是 L5/L6 环境层，前景证据入场那一帧它要**再让一档**（brightness .5→.28 + blur 5px，0.5s 与入场同起），
   前景走了再回（回来比让位慢一点，.6s）。让位用 brightness 不用 opacity（透出底色会变灰）。
6. **选片**：慢内容（延时、光斑、俯拍、人流虚化），**避开可读文字与正脸**；看原片平均亮度——本页 A4 初版用城市夜景，.5 再压就是黑屏，
   换成海面才成立。底床片长 < 段落时长时用 0.5s 交叉淡化接缝；**动画循环不要重置视频**（那就是"loop 接缝"这个坑本身）。

### 卡
| # | slug | 一句话 | 关键参数 | 与已有的关系 |
|---|---|---|---|---|
| A1 | `bed-scrim-typo` | 夜景压暗成底床 + 底部渐变遮罩带，标题逐词升起 | brightness .42 / saturate .55 / scrim 底部 78% / 12s 缩放 1→1.06 | 底床**基准式**；背景面新增"实拍底床"基底 |
| A2 | `bed-duotone-wash` | 人流 grayscale → 两层混合双色调，上面数字生长 | grayscale 1 / contrast 1.15 / brightness .62；深色 lighten 提黑 + 主题色 multiply .9 染白 | 换素材不换气质；与 design-language 单强调色一致 |
| A3 | `bed-echo-blur` | 前景视频装卡，同源放大模糊铺底 | echo 1.25→1.32 / blur 26px / brightness .45；卡 1→1.03 | 解决竖屏素材与单素材镜头；建议单独成卡 |
| A4 | `bed-dim-on-focus` | 证据弹入那帧底床再压暗失焦，退场回来；两层视差 | .55 → .28 / blur 5px / 0.5s；视差 0.5 : 1.0 | G3 让位状态机用在背景层 |

### 定版建议
A1 进 `shot-design.md` 背景面菜单（空间基底新增「实拍底床」，参数即 A1）；A3 单独成卡（进「素材呈现」）；
A2/A4 的处理链写进 `design-language.md` 环境层参数表，不必各自成卡。

---

## B · 图片运镜拓展（在已有六式之外）

### 调研结论
已有六式：缓推 / 缓拉 / 横向摇移 / 3D 立面倾斜 / 环绕漂移 / 长页兴趣点巡游。它们缺的不是更多"姿态"，而是四类语言：
1. **带方向的复合运动**：推与移同时发生、从兴趣点 A 到兴趣点 B（对角推移）。市面 Ken Burns 预设九成是"一点原地推"，没有叙事方向。
   缩放与位移必须**同一条曲线**（分两条 tween 中途会甩出一段横漂），B 点位置由"把 B 搬到画面正中"反解并钳制在不露边范围内。
2. **单图假深度（2.5D）**：真 2.5D 要抠前景主体 + 背景补全（AE 3D layers / Photoshop 深度图 / Depthy / LeiaPix / Runway 一类深度图工具）。
   本库有现成的 CPU 人物分割（`host-footage.md`），可直接复用于照片主体抠像。不抠像的替代是**切片视差**：渐变蒙版把风景切成远/中/近三带，
   速度 0.65 : 1 : 1.55，柔边宽度 ≥ 两层最大错位量。只适用有明确远中近分层的风景/街景，不适用人物与建筑立面。
3. **有事件感的 3D 姿态变化**：从一个角度"拿起来 / 转过来"看——俯拍起身（rotateX 58°→0）、侧角转正（rotateY −38°→0→+3°）。
   姿态变化是**事件**，允许收住；之后的 hold 必须继续缓推（末速非零）或带余摆，否则停在 0° 那帧就是 PPT。阴影随姿态走。
4. **变速**：速度曲线本身是语言——停是讲，甩是"看那边"。变速摇移里模糊量跟速度走（峰值在中点，到位帧为 0），停留段仍有 ≤6px 漂移。
5. 共有纪律不变：相机层唯一被 transform、末速非零、放大 ≤1.2、素材分辨率 ≥ 画幅 × 最大缩放（B5 放大 1.5 需 ≥2900px 宽的原图）、
   3D 倾角 ≤25° 才可读（起身/转正的起始角可以更大，因为那是过程不是停留姿态）。

### 卡
| # | slug | 一句话 | 关键参数 | 与已有的关系 |
|---|---|---|---|---|
| B1 | `diagonal-dolly-pan` | 从兴趣点 A 沿对角线推到兴趣点 B，末速续走 | zoom 1.08→1.22 / 7s / camEase 末速比 .6 / 两点距离 ≤ 对角 45% | slow-push-in 是一点推、sway-parallax 是不变焦横移；本卡"从这儿到那儿" |
| B2 | `sliced-parallax-2.5d` | 同图三层渐变蒙版切远中近，横移速度 0.65 : 1 : 1.55 | pan 56px / 8s；近层再推 4%；柔边 8~10% | 无卡对应；真 2.5D 待抠像版 |
| B3 | `flatlay-rise` | 58° 俯角躺在桌面 → 1.3s 起身正视并推近 → 缓推 → 放回 | rotateX 58°→0 power2.inOut；scale .9→1→1.06；perspective 1000 | tilt-3d-page 是静态立面姿态；本卡是"拿起来" |
| B4 | `swing-to-face` | −38° 侧角 2.2s 转到正面推到 1.0，再慢推 1.05 带 +3° 余摆 | rotateY −38→0→+3；translateX −140→0；perspective 1100 | orbit-drift 无始无终；本卡有"来到正面"一拍 |
| B5 | `ramp-pan-sweep` | 停 1.2s → 0.55s 甩到另一端（模糊随速度 0→8→0）→ 停 1.6s → 慢回中段 | 素材放大 1.5；whip power3.inOut；停留 1.2~1.8s | sway-parallax 匀速 ≤190px/s；whip-pan-transition 是两镜之间 |

### 定版建议
B1、B5 直接补进「运镜」类（各自独立语义：方向 / 变速）；B3、B4 合并成一张「3D 姿态事件卡」（俯→正 / 侧→正两个 preset）；
B2 留实验室，等抠像版 2.5D 一起定。

---

## C · 多素材同屏：排版 × 入场 × 运镜

### 调研结论
多素材的问题不是"怎么摆下"，而是**观众该看哪**。
1. **排版先定关系**——版式是关系的视觉化，不是审美选择：
   | 关系 | 版式 | 卡 |
   |---|---|---|
   | 主次 | 一主两辅（主图 55~60% 宽 + 右列等大两张） | C1 |
   | 对比 | 双分屏 + 滑动分割线（两图必须同构图） | C2 |
   | 并列 / 序列 | 3D 照片墙推轨（3~4 张，一站一张） | C3 |
   | 序列 / 列举 | 传送带（≥5 张，匀速 + 关键项减速） | C4 |
   | 汇聚 → 聚焦 | 2×2 网格收成一主 + 一列小图 | C5 |
   错落堆叠 / 情绪板（证据感）已有 `media-pop-in`。
2. **入场有先后有方向**：错峰 100~150ms、同向；全组同时同速淡入 = PPT。主角先落，配角跟进。
3. **任一时刻只有一个主角**：焦点接力靠**其余降权**（brightness .55~.6 / scale .985），主角本身只动 4%；切换 0.4s，两次之间 ≥1.5s。
4. **运镜只做两种**：横向巡览停靠（指到哪看哪，每站缩放绕当前素材发生）与推入单个再拉回全景。停靠段内部要有 1→1.03 微推防死。
5. **统一外观**：白边 / 圆角 / 唯一投影全组一致；横竖混合时统一到同一外框比例（裁切而不是缩放）。
6. **预算不变**：同屏主体组 ≤3（一组网格算 1 组）、留一个空象限给字幕、素材内文字不与字幕相撞。
7. 传送带速度 176px/s（≤220 上限），减速用位置-时间分段积分（匀速 → 0.5s 减速 → 慢速 1.4s → 0.6s 加速 → 匀速），不是硬停；
   减速结束点对齐"关键项居中"。

### 卡
| # | slug | 一句话 | 关键参数 | 与已有的关系 |
|---|---|---|---|---|
| C1 | `hero-duo-layout` | 主图先落，两佐证从右错峰滑入；讲到谁谁亮，其余降权 | 错峰 150ms / dim .6 / focus 1.04 / 主图内推 1→1.06 | media-pop-in 是"拍上来堆着"，本卡是"摆好了讲" |
| C2 | `split-compare-slider` | 左图整屏起手，分割线滑到中线揭右图，nudge 强调，再滑到 8% | clip-path 裁上层 / 滑 1.1s power3.inOut / 停 ≥1.5s / nudge 8% | 无卡对应 |
| C3 | `gallery-wall-dolly` | 三张挂在 −12° 墙上，全景 → 逐张推轨停靠（其余压暗）→ 拉回 | 全景 z .72 / 停靠 z 1.15 / 移 1.0s / 停 .9s | stage-keyframe-tour 巡一张长页；本卡巡多张独立素材 |
| C4 | `filmstrip-conveyor` | 六张传送带匀速左行，经过中线连续放大提亮，关键项减速 | 176px/s / 中线 1.08 / 减速 0.25× 1.4s | shot-design ② 提过"列举用传送带流"但无卡 |
| C5 | `grid-to-hero` | 2×2 错峰落位，讲到谁谁长成主图，其余收成一列不消失 | 错峰 120ms / 重排 0.8s power3.inOut / 主图 65% 宽 | 无卡对应；Remotion 用 transform（FLIP）不动 left/top |

### 定版建议
C1、C2、C4 各自成卡（三种关系语义互斥）；C3 并入 stage-keyframe-tour 作"多素材墙"变体；C5 成卡并写明 FLIP 式实现。
多素材总纲（关系 → 版式表 + 三原则）写进 `shot-design.md` 新节「多素材镜头」。

---

## 实现备忘（从原型到入库）
- 每张卡的 CONFIG 在 `index.html` 对应 `CARDS['<slug>']` 顶部；相机反解 `camTo(z, px, py)`（origin 0 0 + 钳制不露边）与 `camEase(r)` 与 slow-push-in 同源。
- 截帧核对用 `seek(t, false)`：C2 / C4 靠 timeline `onUpdate` 写样式，`pause(t)` 默认 suppressEvents 不触发，冻出来的帧是假的（本次实测踩过）。
- tsx 化时：底床视频用 `<OffthreadVideo muted>`；C5 布局重排改 transform；B2 蒙版用 `maskImage`；A4 的 CSS 变量改为 interpolate 直接算 filter 字串。
- 素材规格：底床 720p 足够（被压暗/模糊）；前景核心视频 1080p；图片 ≥ 画幅 × 最大缩放（B5 需 ≥2900px 宽）。

## 调研对原型的修正（子代理结论 vs 我先做的版本）
三题各派一个全新上下文的子代理做网络调研（搜索引擎多被反爬，改走 Bing/Yahoo + 直读一手来源），回来后按"有出处的才改"改了四处：
- **A3 同源底床**：原型 saturate 1.15 且两条视频同步播。调研指出 blur-fill 原配方不压暗、不慢放，同源同步运动会读作**重影**，
  且要再叠 ~30% 黑 + 去饱和 → 改为 saturate .8 + 底床 **playbackRate 0.5**；"两条同步"从命门里删掉。
- **A4 让位量**：调研给出 UI 模态 scrim 口径（Material 3 `ScrimTokens` 0.32 / Apple 亮底 +35%，300~400ms，blur 8~12px）
  → blur 5→8px、时长 .5→.4s。
- **C2 揭示时长**：行业口径 2~4s 扫过，原型 1.1s 偏急 → 1.4s（口播节奏取下限）；补"分割线必须动过"。
- **C3 其余照片**：调研建议 3D 巡览用景深虚化 4~8px 区分层次 → 非当前照片 brightness .5 之外再加 blur 3px。

没改但要记着的出入：
- **摇移速度**：RED「7 秒横穿一帧」＝ 960 宽约 137px/s、1920 宽 275px/s，比本库 sway-parallax 的 190px/s@960 更严；
  它针对的是实拍细节画面在 24fps 下的 judder。C4 传送带 176px/s 在本库上限内，若成片 24fps 出现抖动先降到 ~150。
- **Scrim 浓度**：NN/g 案例 30% 黑不够、50% 才够；A1 的 brightness .42 ≈ 58% 压暗 + 底部 floor-fade 到 78%，在口径内。
- **错峰**：叙事级 50~100ms/项、戏剧化 100~200ms，总时长 <600ms，≥3 元素时同时在动的 ≤1/3——C1/C5 的 120~150ms 在范围内。
- **降权幅度**：调研给 scale 0.8~0.9 / 亮度 −20~30% / blur 4~8px；本页 C1 用 brightness .6 / scale .985（更轻的缩放、更重的压暗），两套都成立，入库时统一一套。
- **反例**：MKBHD 实测分屏占 0%，对比全靠"顺序镜头 + 标签"——**不是每次多素材都要同屏**，SHOTBOOK 里先问"能不能顺着讲"。
- **Loop**：底床 8~20s 一循环、首尾 ~1s 叠化、验收"连播三遍盯画面中心"（ffmpeg xfade 可程序化生成）。
- **2.5D 真做法**：开源链 DepthFlow + Depth Anything V2（深度图位移 x≈3% 画幅、z≈7%、边缘外推 60px）；AE 链 Z 分布
  背景 +6000~10000 / 中景 +2000~3500 / 前景 −500~+100、源图 ≥5000px。B2 切片视差是无深度图时的替代。
- **3D 可读性**：带文字的面倾角 ≤15°（密排文字 ≤8° 为经验值，未见文献定量）；perspective 800~1000 常规、<500 激进、>2000 近正交。
- **字幕避让**（Netflix / DCMP）：字幕不压脸、嘴、画内文字，避不开就上移——与本库"文字不叠截图文字"同一条。

## 调研来源
**A · 底床**
- Material 3 scrim 0.32：https://m3.material.io/styles/color/roles ·
  https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ScrimTokens.kt
- Apple HIG Materials（亮底 +35%）：https://developer.apple.com/design/human-interface-guidelines/materials
- NN/g 图上文字（30% 不够 / 50%）：https://www.nngroup.com/articles/text-over-images/
- 白字压亮景 / 双色调两步：https://www.premiumbeat.com/blog/white-text-over-bright-footage-tips/ ·
  https://www.premiumbeat.com/blog/davinci-resolve-tip-create-a-duotone-look-in-2-steps/
- 渐变遮罩：https://www.storyblocks.com/resources/tutorials/how-to-create-a-gradient-overlay-in-premiere-pro · https://bitcut.app/guide/subtitle-gradient
- WCAG 对比度 / G18 邻近像素：https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html · https://www.w3.org/WAI/WCAG21/Techniques/general/G18
- 字幕规范 DCMP：https://dcmp.org/learn/captioningkey/597
- 视差层速 / Vox 背景 / 无缝 loop：https://motioncircles.com/knowledge/how-to-create-parallax-scrolling-animation-in-after-effects/ ·
  https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/ · https://anfx.co/blog/seamless-video-loops-guide/
- 同源模糊（blur fill / echo pillarboxing）配方：https://www.junian.dev/tech/ffmpeg-vertical-video-blur/ · https://stackoverflow.com/questions/30789367

**B · 图片运镜**
- Ken Burns 参数：https://frameo.ai/blog/use-ken-burns-effect-images/ · https://www.provideocoalition.com/next-level-ken-burns-effects-in-final-cut-pro/ ·
  https://echowave.io/tools/ken-burns-effect/
- RED 摇移速度：https://www.reddigitalcinema.com/red-101/camera-panning-speed
- GSAP SlowMo（起步缓 → 匀速 → 带速切走）：https://gsap.com/docs/v3/Eases/SlowMo/
- 2.5D：https://designkkashi.com/en/after-effects-parallax-2-5d-depth-map-expression-guide/ · https://www.junoschool.org/article/parallax-effect-single-photo-after-effects/ ·
  https://community.adobe.com/questions-529/fake-parallax-effect-with-2d-layers-and-a-null-60701 ·
  https://github.com/vt-vl-lab/3d-photo-inpainting/blob/master/DOCUMENTATION.md · https://www.schoolofmotion.com/blog/3d-photo-after-effects
- 3D 透视 / 翻面 / 倾角：https://developer.mozilla.org/en-US/docs/Web/CSS/perspective · https://3dtransforms.desandro.com/card-flip ·
  https://github.com/micku7zu/vanilla-tilt.js · https://en.wikipedia.org/wiki/Dolly_zoom
- 串联 / cut on action：https://en.wikipedia.org/wiki/Cutting_on_action · https://www.backstage.com/magazine/article/ken-burns-effect-12862/
- 分辨率 / 亚像素抖动：https://docs.pteavstudio.com/en-us/9.0/techniques/kenburns ·
  https://www.ffmpeg-micro.com/blog/ffmpeg-zoompan-filter-ken-burns-zoom-and-pan-without-the-jitter

**C · 多素材同屏**
- 视觉层级 / 共同区域：https://artofstyleframe.com/blog/visual-hierarchy-motion-graphics/ · https://www.nngroup.com/articles/common-region/
- 编排（错峰 / 同向 / 一个焦点）：https://m1.material.io/motion/choreography.html ·
  https://design-language-website.netlify.app/design/language/motion-ui/choreography/ ·
  https://github.com/LottieFiles/motion-design-skill/blob/main/skills/motion-design/SKILL.md
- 案例：Johnny Harris 节奏 https://blog.editorduel.com/blog/johnny-harris-documentary-editing-formula-vox-emmy-independent ·
  MKBHD 分屏 0% https://www.writepanda.ai/blog/mkbhd-editing-style-measured/
- 对比分屏：https://try.wideframe.com/blog/how-to-create-before-and-after-comparison-videos/ · https://localeyesit.com/blog/split-screen-in-film/ ·
  https://nofilmschool.com/elevate-split-screen-in-post
- 前庭安全（运动面积 / 距离 / 视差不一致）：https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/
- 工作记忆 ≈4：https://en.wikipedia.org/wiki/Working_memory · 解说类每场 1~2 图形 https://www.vyond.com/blog/explainer-video-best-practices/
- 横竖混合填充：https://jpgtomp4.com/blog/jpg-to-mp4-aspect-ratio-guide/
- 字幕避让画内文字（Netflix）：https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements
