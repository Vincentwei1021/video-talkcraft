---
name: highlighter-sweep
标题: 荧光笔高亮扫过
优先级: P0
代码: template/cards/highlighter-sweep.tsx
一句话: 半透明黄色荧光笔从左到右 0.4~0.8s 扫过引用文段的关键句，同帧其余文字压暗，扫完整句轻微浮起，读者视线被押着走
适用: 口播引用报告/文献/新闻截图、念到"就是这一句"的时刻；纪录片解说、知识区拆解等冷静讲证据的调性
时长: 起手静置约 0.7s 等语音到位 → 扫过 0.6s（0.4~0.8s 随语速）+ 压暗 0.45s 同帧 → 扫完 0.3s 浮起定格；卡片全程 8s 极缓推近
能量: 低
类别: 强调标注
---

## 意图
口播念一段引用时，观众不知道该看哪一行——荧光笔扫过 + 其余压暗，等于替观众划重点，
把"听到的那句"和"看到的那句"锁在一起。命门：**色块不许盖字**（multiply 或半透明，盖住字
等于涂掉证据）、**扫速对齐朗读**（0.4~0.8s，跟着语音走才像"现场划"而不是特效）、
**必须压暗其余文字**（只加高亮不减环境，强调失效一半）。
常见于：Vox、Johnny Harris、Cleo Abram、James Jani。

## 动效核心
- 引用截图卡片先在屏（浅纸色 #f7f4ea 卡片 + 微倾斜 -0.4° + 深投影），全程 8s 线性极缓推近到 1.025 倍防呆滞
- 关键句包一层 `position:relative` 的 span，内部绝对定位色块：#FFE949、opacity 0.6、`mix-blend-mode:multiply`
- 色块四角用不规则 border-radius（`12px 5px 10px 4px / 7px 12px 5px 10px`）模拟笔触，左右各溢出 6~8px
- 扫过：色块 `scaleX 0→1`，`transform-origin: left center`，0.6s，`power2.inOut`（起收笔略缓，匀速像 loading）
- 同帧：其余段落 opacity 1→0.55，0.45s，`power2.out`
- 扫完：关键句整句 scale 1→1.03 + y -2px，0.3s，`power2.out`，origin 左侧——强调落定

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `startDelay` | 0.7s | 卡片静置一拍等语音念到关键句；0 则像自动播放的 PPT，>1.5s 观众开始自己乱读 |
| `sweep` | 0.6s | 0.4~0.8 匹配朗读语速；<0.3s 像渲染 bug，>1s 观众读完了笔还没划完 |
| `dimTo` | 0.55 | 其余段落压暗到的透明度；>0.7 强调不出来，<0.4 像上下文被删掉、观众想去读反而读不到 |
| `liftScale` | 1.03 | 扫完的浮起倍数；>1.08 会破行宽挤排版，1.0 则收尾没有"落定"感 |
| `kenburns` | 1.025 | 8s 推近终点倍数；>1.06 明显在动会抢戏，1.0 静止长镜头显呆 |

## 已知坑
- 色块不透明或叠在文字上层不做 multiply——字被涂掉，一眼假（真荧光笔是透的）。
- 匀速或 <0.3s 扫完——读作程序绘制/渲染故障，不是人手在划。
- 只加高亮不压暗其余文字——画面里所有行权重相同，等于没划重点。
- 色块四角规整直角——读作表格选中/文本选区，不是笔触；必须不规则圆角 + 左右微溢出。
- 高亮的不是完整语义句（半句/跨两行断开）——观众读不出"这一句"的完整性。

## 复用指引
- Remotion/tsx（skill 首选）：template/cards/highlighter-sweep.tsx——自包含单文件，复制进工程即可用；参数在顶部 CONFIG，时长/尺寸在 meta。
- HTML/GSAP：demos/highlighter-sweep/index.html。换文案改 `.quote-line` 各行文本，关键句放进 `.hl-wrap` 内（`.hl-block` 保留在最前）；换色改 `.hl-block` 的 `background: #FFE949` 与 `opacity: 0.6`（深色截图上可改 `mix-blend-mode` 为 `screen` 并换深色荧光）；节奏全在顶部 `CONFIG`（`startDelay` / `sweep` / `dimTo` / `liftScale` / `kenburns`）。
- Remotion 移植：色块 `transform: scaleX(${interpolate(frame, [d, d+sweepF], [0, 1], {easing: Easing.inOut(Easing.quad), extrapolateRight: 'clamp'})})` + `transformOrigin: 'left center'`，容器 div 保留 `mixBlendMode: 'multiply'`；压暗用同起点的 opacity interpolate；Ken Burns 用 `interpolate(frame, [0, durationInFrames], [1, 1.025])` 线性；浮起接在 `d+sweepF` 帧之后 spring 或 quad-out。
- 剪辑软件对应物：剪映——黄色色块素材设混合模式"正片叠底"+ 蒙版"线性"关键帧从左扫到右（或贴纸搜"荧光笔"），其余区域盖半透明黑色块压暗；AE——黄色 Solid 设 Multiply 混合 + Linear Wipe 效果（或 scaleX 关键帧、锚点在左），配 Easy Ease；CapCut——"highlight pen" 贴纸或同样的 mask wipe 做法。

## 动效范围
- 属于本卡的：荧光色块从关键句左端 scaleX 0→1 扫过（0.4~0.8s、power2.inOut、origin left、multiply 混合不盖字、不规则圆角笔触）；同帧其余文字压暗至 0.4~0.7 透明度（0.45s）；扫完整句 scale 1.03 + y −2px 浮起落定（0.3s）。三个动作与一个时序是本卡的全部。
- 不属于本卡的：引用卡片的排版/边框/字体字号、示例文案、演示里曾有的 Ken Burns 缓推（那属于镜头层，由全局系统提供）。
- 迁移接口：荧光色换 `background`（深底改 `mix-blend-mode: screen` + 高亮色）；扫速 `sweep` 对齐朗读时长；压暗程度 `dimTo` 随底色明度调；目标行的选择器与色块几何（left/right 内缩）按实际文字盒调整。
- 底色要求：白底即可（multiply 在浅底天然成立；深底需换 screen 混合并复核字的可读性）。

## 落位自检（2026-09-05 用户定版，选卡时抄进 SHOTBOOK 该镜自检列）
- 标注几何（框 / 圈 / 线 / 箭头 / 放大镜锚点）一律由**目标的实测包围盒**反推——DOM `getBoundingClientRect` / `measureText`，四边留白 16~24px 等距，**不目测**。
- 实现后抽该镜定妆帧核对：标注是否恰好套住 / 指向目标，偏差 **> 8px 返工**（`references/layout.md` §3）。
- 目标会滚动 / 移动时，标注钉在内容坐标系随内容动（SKILL.md ③）。
