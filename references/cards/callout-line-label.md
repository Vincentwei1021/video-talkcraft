---
name: callout-line-label
标题: 标注引出线
一句话: 目标上圆点 pop 亮起并荡开一圈涟漪 → 折线沿 45°/水平拐点向外生长 → 线端文字标签遮罩揭示，三拍严格串行、一气呵成
适用: 口播念到"这里/这个部位/这两处"时，在截图或产品图上指哪看哪；评测、拆解、地图解说类调性，冷静专业不抢戏
时长: 单个标注约 0.95s（圆点 0.2s + 折线 0.4s + 标签 0.25s、文字再滞后 0.1s）；多标注错峰 0.8s；停留 1.6s 后 0.5s 反向收回
能量: 中
类别: 强调标注
优先级: P1
---

## 意图
口播说"真正值钱的是这两处"时，观众的眼睛需要被牵到画面的具体位置——callout 把"用手指"翻译成三拍因果：点亮起（在哪）→ 线生长（往哪看）→ 标签揭示（是什么）。
命门：**三拍必须严格串行**（同时出现就没有引导视线的因果感）；**折线拐点只用 45° 或水平**（工程制图的秩序感，斜率随意像草图）；**标签永远最后出现**（答案不能比手指先到）。

## 动效核心
- 圆点：SVG circle 落在目标上，scale 0→1，0.2s `back.out(2.2)`；同时一圈同色描边涟漪 scale 0.4→3.2、opacity 0.9→0，0.5s `power2.out`
- 折线：SVG path（1~2 个拐点，全部 45° 或水平），`stroke-dasharray` = 总长，`stroke-dashoffset` 从总长→0 描画 0.4s `power2.out`；**起点排在圆点 pop 结束之后**（t0 + dotIn）
- 标签：HTML div 贴在线端，`clip-path: inset()` 从线端方向展开 0.25s `power3.out`（线从右来就 `inset(0 0 0 100%)` 起步），内部文字 opacity 再滞后 0.1s 淡入 0.2s
- 多标注：第二个 callout 整体延迟 0.8s，逐条对齐口播列举的节奏
- 退场：反向收回——标签先收（power2.in）、线回吸、点熄灭，三段按 out 比例分配（0.4/0.4/0.3），第二个标注再错 0.15s

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `dotR` | 7 | 圆点半径 px；>10 像按钮，<5 在视频压缩后看不见 |
| `dotIn` | 0.2s | 圆点 pop 时长；>0.35s 拖沓，<0.1s 没有"叮"的落点感 |
| `lineDraw` | 0.4s | 折线描画时长；>0.6s 观众等得着急，<0.25s 线"闪现"没有生长引导感 |
| `labelIn` | 0.25s | 标签遮罩展开时长（文字固定再滞后 0.1s）；>0.4s 读作幕布拉开，太慢 |
| `hold` | 1.6s | 全部就位后的停留；对齐口播讲完该卖点的时长，讲得长就调大 |
| `out` | 0.5s | 反向收回总时长（标签/线/点按 0.4/0.4/0.3 比例分配）；>0.8s 退场喧宾夺主 |
| `stagger` | 0.8s | 第二个标注的延迟；<0.5s 两个标注抢视线，必须错峰逐条出现 |
| `color` | #d8383a | 点、涟漪、线同色的标注色（白底 demo 用红，深底可换高亮黄）；换品牌色时保持与底图高对比 |
| `callouts[]` | target/points/label | target=圆点坐标；points=拐点+终点（只放 45°/水平位置）；label 的 x/y 贴线端、`from` 定展开方向（"right"=从右往左收拢的线） |

## 已知坑
- 点、线、标签三段同时开始——没有"点→线→字"的因果链，眼睛不知道先看哪，一眼假。
- 折线斜率随手拉——拐点必须落在 45° 或水平网格上，否则像草稿涂鸦而不是标注。
- 标签先于线出现（最常见错序）——答案比手指先到，引出线沦为装饰。
- 标签压在目标本体上或线太短——标注必须把文字引到空白区，盖住本体等于白标。
- 用 opacity 渐显代替 clip-path 展开——标签失去"从线端长出来"的方向感，和线脱节。

## 复用指引
- HTML/GSAP：demos/callout-line-label/index.html。换文案/换位置只改 `CONFIG.callouts`：`label.html` 换标签文字（`<b>`主句+`<small>`补充）、`target`/`points`/`label.x/y` 换坐标、`label.from` 换展开方向；`CONFIG.color` 换主题色；假手机是 `.phone` 一段纯 CSS，替换成自己的截图元素即可。入场基准延迟 0.6s 写死在 register 内的 `t0 = 0.6 + i * CONFIG.stagger`。核心动画即 `DemoShell.register` 回调整段，复制 CONFIG + 回调可直接摘走。
- Remotion 移植：三拍用 `<Sequence>` 串接，`from` 按 `dotIn/lineDraw/labelIn × fps` 换算帧；折线描画用 `interpolate(frame, [0, lineDraw*fps], [len, 0])` 驱动 `strokeDashoffset`（`getTotalLength()` 需在 `useEffect`/`useLayoutEffect` 里量或预先算好写死）；圆点用 `spring({frame, config:{damping:10}})` 出 back.out 的过冲；标签用 `clipPath: inset(0 ${interpolate(...)}% 0 0)` 插值，文字 opacity 延迟 3 帧。
- 剪辑软件对应物：AE 里即 "Call-Out Titles" 类模板，自建 = 形状图层折线加"修剪路径"（Trim Paths）+ 文本层矩形蒙版位移揭示；剪映用贴纸搜"标注/指示线"或线条生长素材叠字幕入场"擦除"；CapCut 搜 callout/annotation 模板。

## 动效范围
- 属于本卡的：圆点 scale 0→1 pop（0.2s、back.out(2.2)）+ 同色描边涟漪 scale 0.4→3.2 淡出（0.5s、power2.out）；折线 stroke-dashoffset 从总长→0 描画（0.4s、power2.out、拐点只走 45°/水平）；标签 clip-path inset 从线端方向展开（0.25s、power3.out）、内部文字再滞后 0.1s 淡入；三拍严格串行的时序（点→线→字，各段起点相接）；多标注整体错峰 0.8s；反向收回（标签 0.4 / 线 0.4 / 点 0.3 比例分段、power2.in）。
- 不属于本卡的：被标注的产品图占位（demo 里那部灰阶线框手机）、标签的排版/边框/字号、示例文案与坐标、字幕行。
- 迁移接口：`CONFIG.color` 一处换标注色（点/涟漪/线同色，需与底图高对比）；`CONFIG.callouts[]` 换 `target`（圆点坐标）/ `points`（拐点+终点，保持 45°/水平）/ `label.x,y` 与 `label.from`（展开方向）；时长四件套 `dotIn / lineDraw / labelIn / hold` 按语速整体乘同一系数缩放；`dotR`、`stroke-width` 随输出分辨率等比缩放。
- 底色要求：白底即可。标注色只需与底图有足够对比——深底把 `CONFIG.color` 换成高亮黄、标签底色改深色即可，动效时序不变。
