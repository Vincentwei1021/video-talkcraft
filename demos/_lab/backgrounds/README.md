# 动态幕底实验室（2026-09-04）

> 状态：**实验室原型**，16 款幕底只有 HTML 版（`index.html`，一页多舞台），未进 design-language §1.1 背景菜单。
> 起因：用户判"默认的黑色场景太丑"（深底 = `#131317` + 圆形追光 + vignette），要一批更好看、有动态感的背景，深浅都要。
> 调研范围是网页动态背景生态（landing page / hero 背景），筛选标准是**能叠字、够慢、帧号可复现**。

```bash
open index.html        # 滚到卡片处自动播放；顶部可切换「前景样片」「噪点抗色带」，悬停出暂停
```

## 与运动系统减法的关系
2026-09-04 同日定版：口播的运动系统只保留场景相机极缓推拉 + 让位（cinematography.md §2）。幕底属于**空间基底**，
允许自带极慢流动（周期 20~40s、GLSL time 系数 0.03~0.08），但它不是运动系统的一部分、不作要求——静态幕底 + 相机推拉一样合规。
判据：盯字幕 3 秒，眼睛不该被背景带走。

## 调研结论
1. **网页背景生态的四条技术路线**，全部能在 Remotion 里确定性复刻（time = frame / fps，禁 Math.random）：
   | 路线 | 代表 | 视频落地 |
   |---|---|---|
   | 纯 CSS + 关键帧（渐变、blur 光球、网格 + mask） | Aceternity Aurora / Background Gradient Animation / Spotlight / Grid & Dot；Magic UI Dot / Grid / Retro Grid | 直接 div + interpolate，最稳 |
   | Canvas 2D 逐帧重画 | Aceternity Wavy / Sparkles / Meteors；Magic UI Particles / Ripple；react-bits Threads | demo-spec 已允许"依赖帧号逐帧全量重画" |
   | WebGL GLSL 全屏片元（fbm / 域扭曲 / 抖动） | react-bits Silk / Iridescence / Dither / Liquid Chrome；Aceternity Cloud Shader / Noise；whatamesh（Stripe 网格渐变） | 裸 WebGL 或 three-anime 桥，uniform 只有 u_time |
   | 物理 / 粒子模拟、鼠标交互 | Vanta.js Birds / Net / Cells；tsParticles；Ballpit 一类 | 状态累积、依赖随机与交互——**不复刻**，要用就录屏当素材 |
2. **深底怎么不丑**：黑不是问题，"死黑 + 一盏追光"才是。四个方向——① 流动的多色低饱和渐变（Stripe 一路）；② 顶部悬垂的极光 / 光束 + 下半压暗给字幕（Linear / Vercel / Raycast 一路）；
   ③ 单色 fbm 绸缎 / 云气（react-bits Silk 一路，最耐看、字最好读）；④ 有秩序的点阵 / 网格 + 一道慢慢经过的亮波（Magic UI 一路）。共同点：最亮处 L ≤ 45%、四角有 vignette、全画面能叠白字。
3. **浅底怎么活**：现有 pastel mesh 是对的方向，只差"会流动"；其余是纸纹 + 窗光（Notion 一路）、彩团 + 磨砂玻璃（Figma / Arc 一路）、极淡薄膜虹彩（珠光纸）、底部柔波与细线束（只占下半，上半留白给标题）。
   浅底字幕必须是 `#1d1d1f` 级实色（白底基线亮度 ≈237，无路可涨——design-language 已有此红线）。
4. **色带（banding）是深色渐变进视频的头号坑**：8-bit 量化 + H.264 会把平滑渐变切成一圈圈台阶，Mach band 效应还会放大它。
   标准解法是**抖动 / 噪点**（本页每款默认叠一层静态 feTurbulence 噪点，opacity .06 overlay；浅色 .09）或提高位深 / 渲染端 deband。
   CSS 生态的 grainy gradient 配方：`feTurbulence type=fractalNoise baseFrequency .65 numOctaves 3 stitchTiles=stitch` + `contrast(170%) brightness(1000%)` 提噪，再 `mix-blend-mode: multiply` 压回去。
   噪点用**静态贴图**（一张 tile）而不是逐帧新噪声——逐帧噪声在 H.264 里是最贵的比特、也最容易被压成脏块。
5. **细密纹理与相机缩放不兼容**（本库已有铁律）：点阵 / 网格 / 细线这三款只能放**屏幕空间静态层**，不进 CameraRig 缩放层；点径 ≥2.5px、间距 ≥32px、线距 ≥6px。
6. **速度**：网页背景默认速度普遍偏快（为了"活"），做幕底一律再慢 2~3 倍：光球轨道 30~45s 一圈、光束 18~26s 一扫、GLSL time 系数 0.03~0.05、点阵亮波 14s 一过。
7. **fbm 域扭曲**是这批里最通用的一个算子（Book of Shaders §13 / Inigo Quilez）：`f(p) = fbm(p + fbm(p + fbm(p)))`，5 个八度、lacunarity 2、gain .5；
   把它的输出当"权重"去混色就是网格渐变，当"明度"就是绸缎，当"alpha"就是云气，再过一次 Bayer 量化就是抖动波纹——本页 D1 / D5 / D8 / L1 / L5 / L7 六款共用同一段 GLSL。

## 16 款清单
| # | slug | 深/浅 | 技术 | 一句话 | 关键参数 | 建议用在 |
|---|---|---|---|---|---|---|
| D1 | `mesh-flow-dark` | 深 | GLSL | Stripe 式四色流动网格渐变 | time .04；最亮 L≤35 | 片头 / 品牌 / 通用 |
| D2 | `aurora-veil` | 深 | GLSL | 顶部极光带，下半压暗 | 三条带、形变周期 30s | 科技 / 金句 / 反转 |
| D3 | `beams-grid` | 深 | CSS+GSAP | 透视网格 + 两道斜光束 | 网格 100px；光束 18s / 26s | 技术 / 数据 |
| D4 | `spotlight-stage` | 深 | CSS+Canvas | 双追光 + 悬浮尘埃（现追光款的升级） | 主光 40s、副光 55s；尘埃 60 粒 | 金句 / 人物 |
| D5 | `silk-noise` | 深 | GLSL | 单色蓝灰绸缎，最耐看 | time .03；明度 8%~22% | 万能深底、文字密集 |
| D6 | `dot-field-wave` | 深 | Canvas | 点阵 + 14s 一过的亮度波 | 36px 间距、2.6px 点径 | 数据 / 技术 |
| D7 | `orbs-dark` | 深 | CSS+GSAP | Apple 发布会式三团柔光 | blur 70px；30~45s 轨道 | 片头 / 情绪 |
| D8 | `dither-wave` | 深 | GLSL | 4×4 Bayer 抖动的复古波纹 | 像素块 6px | 复古 / 反转，一片限一幕 |
| L1 | `pastel-mesh-flow` | 浅 | GLSL | 现默认 pastel mesh 的流动版 | time .035；四色 alpha .30~.42 | **默认幕底候选** |
| L2 | `paper-grain` | 浅 | CSS+GSAP | 暖白纸纹 + 60s 窗光 | 纸纹 opacity .12 | 文档 / 人文 / 文字密集 |
| L3 | `grid-spot-light` | 浅 | CSS+GSAP | 细网格 + 45s 巡回柔光 | 线 .055、光 .22 | 数据 / 技术（浅） |
| L4 | `soft-waves` | 浅 | Canvas | 底部三层 pastel 柔波 | 只占下 40%；20~32s | 片头 / 轻松题材 |
| L5 | `iridescent-sheen` | 浅 | GLSL | 极淡薄膜虹彩（珠光纸） | 饱和 18%、amp .12 | 品牌 / 设计 |
| L6 | `glass-blobs` | 浅 | CSS+GSAP | 高彩色球 + 磨砂玻璃 | 玻璃 .55 + blur 40px | 产品 / 设计 |
| L7 | `ink-wash` | 浅 | GLSL | 宣纸淡墨云气（最慢） | time .025；墨 alpha ≤.16 | 人文 / 国风 |
| L8 | `threads-light` | 浅 | Canvas | 噪声驱动的 40 条细线束 | 线距 9px、振幅 60px | 数据 / 流程 / 连接 |

## 定版建议
- **默认幕底**：浅色 L1（现 pastel mesh 的流动版，规则全部沿用）；深色默认从"追光 + vignette"换成 **D5 绸缎**（最不抢字）或 **D1 流动网格**（更有品牌感），
  D4 作为金句 / 人物幕的深色选项保留。
- 进 design-language §1.1 时每款写成"配方（1920×1080）+ 使用条件"两列，与现有三款同格式；GLSL 款以 `template/motion-systems/` 里的一个 `Backdrop.tsx`
  （裸 WebGL，uniform u_time = frame/fps，含共用的 fbm 段）承载，CSS / Canvas 款各 60 行以内。
- 网格 / 点阵 / 细线三款进屏幕空间静态层（不随 CameraRig 缩放），其余可进 G2 depth 0.5 视差层（可选）。
- 每款交付前用 `motion_check.py` 跑一次成片：深色渐变款如出色带，先加噪点再考虑 10-bit。

## 来源
- Aceternity UI 组件总表（Aurora Background / Background Beams / Background Gradient Animation / Wavy / Cloud Shader / Noise / Spotlight / Grid and Dot）：https://ui.aceternity.com/components
- Magic UI Backgrounds（Dot Pattern / Grid / Ripple / Flickering Grid / Animated Grid / Retro Grid / Light Rays / Noise Texture）：https://magicui.design/docs/components/dot-pattern
- react-bits（Aurora / Silk / Iridescence / Dither / Threads / Liquid Chrome / Waves 等，OGL/WebGL 与 CSS 混合）：https://www.reactbits.dev/ · https://github.com/DavidHDev/react-bits
- whatamesh（Stripe 网格渐变复刻，WebGL，四色 CSS 变量）：https://github.com/jordienr/whatamesh · https://whatamesh.vercel.app/
- Vanta.js（three.js / p5 物理类背景：Fog / Waves / Net / Topology / Birds——交互与模拟，不复刻）：https://www.vantajs.com/
- The Book of Shaders §13 fbm 与域扭曲：https://thebookofshaders.com/13/
- Grainy gradients（feTurbulence 参数与 contrast/brightness 提噪配方）：https://css-tricks.com/grainy-gradients/
- 色带成因与抖动 / 位深 / deband 解法：https://en.wikipedia.org/wiki/Colour_banding
- 本库既有红线：design-language.md §1.1（浅底白字无路可涨、dim 件禁叠 opacity）、cinematography.md §6（细密纹理禁入相机缩放层）
