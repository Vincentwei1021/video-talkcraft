---
name: scribble-annotation
标题: 手绘圈注箭头
优先级: P0
一句话: 马克笔质感的圈/下划线/箭头按真实笔顺现场画出，画完保持干净静置
适用: 口播点名素材/截图里的具体位置时（"看这个价""就这行小字""点这里"）；测评、锐评、扒皮解说等有"作者在场"感的调性
时长: 单笔 0.3~0.6s（圈 0.55s、下划线 0.4s、箭头杆 0.35s+头 0.15s），笔与笔间隔 0.55s 对齐逐条点名
能量: 中
类别: 强调标注
---

## 意图
口播提到素材里某个细节时，观众的视线需要被"现场的一只手"牵到那儿——
印刷式高亮是排版，手绘线是动作，让人感到作者正在跟你一起看这张图。
命门：**真实笔顺**（一笔从起点画到终点，起收有快慢，匀速就是 loading 条）、

**线要粗且圆头**（4px 以下没有马克笔的"墨量感"）。

## 动效核心
- 标注层 = 盖在假截图上的全屏 SVG（`viewBox="0 0 960 540"`，`pointer-events:none`），每笔一条 path，`fill:none`、`stroke-linecap/linejoin: round`、线宽 6px
- **坐标绑定被标注元素，不写死**（命门）：被标注的 DOM 打 `data-ink="xx"`，运行时量它的盒子换算进 viewBox 再算 path——圈心 = 目标中心、下划线 y = 目标 baseline + 4px、箭尖 = 目标边缘外 8px。文字类目标要量**墨迹盒**（canvas `measureText` 的 `actualBoundingBoxAscent/Descent` + baseline），不是行盒：行盒上下带字体留白，照行盒画圈会整体偏高、下划线会飘出去 15px+
- 描画：`stroke-dasharray` = path 全长，`stroke-dashoffset` 从全长 tween 到 0——圈 0.55s `power2.inOut`、下划线 0.4s `power2.out`、箭头先杆（0.35s `power2.inOut`）后头（0.15s `power2.out`）两笔
- 画完保持静置。本库定版：**不做 line boil / 定格抖动**（用户偏好，见 design-language.md §4 运动 token 附注）。 笔感全部由 path 形状（手绘歪斜的圈、带弧度的线）与描画节奏承担
- 三个标注串行，间隔 0.55s（对应口播逐条点名），起播前截图先静置 0.5s
- 圈不是椭圆工具：path 绕目标画约 1.6 圈、起笔终笔交叉重叠；颜色红 #ff4d4d / 黄 #ffd23e，压在浅色截图上
- 重播语义：每次运行先 `layer.innerHTML = ""` 清掉上次墨迹再重建

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `strokeW` | 6 | <4 没有笔感、读作印刷细线；>10 墨太肥会盖住被标注的字 |
| `gapBetween` | 0.55s | 对齐口播逐条点名的呼吸；<0.3s 三笔糊成一次动作；>1s 观众在等 |
| `marks[].dur` | 圈 0.55 / 线 0.4 / 箭杆 0.35 | >0.8s 单笔像进度条；<0.25s 看不出笔顺方向 |
| `headDur` | 0.15 | 箭头头是收笔快扫，拉长到 0.3s 以上箭头会"迟到" |
| `marks[].ease` | power2.inOut / power2.out | 换成 none（匀速）一眼假；inOut 给圈"起笔快收笔缓"的手劲 |
| 圈 `padX/padY` | 17 / 17 | 椭圆外切一个扁长字块时横向 pad 要比直觉大一档（腰部在字高处已收窄）；padX 小于 12 圈的左右腰会切进首末字 |
| 圈 `turns` / `grow` | 1.6 / 0.05 | turns <1.5 是几何椭圆不是手画；grow=0 第二圈盖住第一圈、看不出绕了两圈 |
| 线 `baselineGap` | 4px | 2~6 才像压着字；>10 线飘在字与下一行之间、指向变模糊 |
| 线 `overhang` | 9px | 两端略超出才像手划；=0 线短于文字读作"没划完" |
| 箭 `tipGap` | 8px | 5~10 是"咬住不压住"；=0 尖端戳进目标、>20 指向变含糊 |

## 已知坑
- 匀速描画——没有起收快慢的线读作加载动画，不是人手。
- 线太细（<4px）——没有马克笔墨量，读作 UI 描边。
- 圈画得太圆——正椭圆是几何工具画的，必须歪、必须绕 1.5 圈以上且首尾交叉才像手。
- **标注没对准目标（最致命）**——path 坐标手填死值，改一次文案/字号就偏出去：圈套错了词、下划线飘在行间、箭头指向空白。观众会先看"这线怎么没对上"，动效再好也白做。坐标一律从被标注元素量出来算。
- 拿行盒当文字位置——`getBoundingClientRect()` 含 line-height 留白（17px 字的行盒可比字形高 10px+），圈会整体偏上、下划线离字太远。要用字形墨迹盒 + baseline。

## 复用指引
- HTML/GSAP：demos/scribble-annotation/index.html。**换标注对象不用改坐标**：给目标元素加 `data-ink="xx"`，在 `CONFIG.marks` 里写 `{kind:"circle"|"underline"|"arrow", target:"xx"}` 即可，位置自动跟着 DOM 走；微调用 `padX/padY`（圈松紧）、`baselineGap/overhang`（线贴合）、`side/tipGap/fromDX/fromDY/bow`（箭头从哪来、指哪条边）。换色改 `marks[].color`，节奏改 `dur`/`gapBetween`。手抖用确定性函数（`sin` 组合 + `seed`）不用 `Math.random()`——重播形状一致，也便于逐帧渲染。核心逻辑 = `CONFIG` + `boxOf/inkBoxOf` + `circlePath/underlinePath/arrowPaths` + `smooth()` + `drawStroke()`，可整体摘走。
- Remotion 移植：用 `@remotion/paths` 的 `evolvePath(progress, d)` 拿 `strokeDasharray/strokeDashoffset`，progress = `interpolate(frame, [start, start+durInFrames], [0,1], {easing: Easing.inOut(Easing.quad)})`；三笔的 start 帧按 gapBetween 换算错开。
- （实测变体）序号点名：要一次点名 5 项时不逐笔画，而是 5 根手绘箭头呈扇形**整组淡入**，数字 1-5 再在各箭头尾部逐个弹入（0.2s 间隔）——描画通道让给数字弹入通道，避免 5 笔描画吃掉 3 秒。见 TheAIScaler（Apm_oCzPEQs）。
- （实测变体）红笔斜划否定（a2iG5GkM8KE）：一笔粗红斜线快速划过要否定的词/选项，是"划掉"不是"圈出"，语义相反、笔速更快（0.2s 级）。
- （实测变体）荧光涂抹划除替换（i2fFSAZb5HM）：荧光笔粗涂抹盖住旧词，同帧新词在涂抹上方压入——把"改口/纠正"做成可见动作；涂抹保持静置，仍不做 line boil。
- 剪辑软件对应物：AE = 形状图层"修剪路径"(Trim Paths) 关键帧描画；剪映/CapCut 没有描画通道，用"贴纸→手绘/涂鸦"类圈注贴纸摆到目标上（选无抖动帧的静置款），或用"画笔"素材包替代。

## 动效范围
- 属于本卡的：**标注几何与被标注目标的绑定关系**（圈心=目标墨迹中心且半径外扩、下划线=baseline 下 2~6px 且两端略超出、箭尖=目标边缘外 5~10px）——"标得准"是本卡的语义，不是实现细节；每笔 `stroke-dasharray` = path 全长、`stroke-dashoffset` 全长→0 的描画（圈 0.55s power2.inOut、下划线 0.4s power2.out、箭头杆 0.35s power2.inOut + 头 0.15s power2.out）；**起收有快慢**的缓动纪律（匀速即读作 loading 条）；箭头先杆后头的两笔笔顺；三笔串行、间隔 0.55s 对齐口播逐条点名；起播前素材静置 0.5s；画完保持干净静置——**不做 line boil / 定格抖动**（本库定版禁项）；手作感由 path 形状本身承担（圈绕 1.6 圈、歪斜、首尾交叉，线带弧度）。标注层盖在素材之上、`pointer-events:none` 的层级关系也属于本卡。
- 不属于本卡的：假商品页截图占位（文案、价格、按钮、线框）、标哪几个元素（那是素材侧的事）、标注色 #ff4d4d / #ffd23e 的具体取值、截图的倾斜与投影（已移除，属于风格）。
- 迁移接口：`strokeW` 按画幅缩放（960 宽用 6px，1080p 上翻倍），`gapBetween`/`marks[].dur`/`headDur` 定节奏；换标注对象改 `data-ink` + `marks[].target`（坐标自动跟随，不需要重算 path）；`padX/padY`、`baselineGap`、`overhang`、`tipGap` 这几个像素量与 `strokeW` 同比缩放；换色改 `marks[].color`（浅底用红/黄，深底换亮色系）。目标不是 DOM（视频/图片素材）时，把 `boxOf()` 换成手填目标矩形，下游几何函数不用改。
- 底色要求：白底即可（马克笔色压在浅底上是本卡的原生语境）。深底上需把标注色换成高亮度色系，否则粗线糊进背景。


