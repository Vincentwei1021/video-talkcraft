---
name: behind-text-title
标题: 人后大字视差
优先级: P1
一句话: 超大标题 0.55s 从人物身后升起、字距由松收紧，下缘被人物剪影遮住；hold 期间标题与人物各 ±4px 反向极缓漂移，平面画面读出伪 3D 层次
适用: 开场题眼、章节大标题、结尾点题；vlog 化 / 电影感调性的真人出镜口播（人物层需抠像，无出镜场景不适用）
时长: 起手延迟 0.4s + 标题升起 0.55s，小字晚 0.35s 跟进；hold 漂移周期 8s 循环，可随口播任意延长
能量: 低
类别: 人物互动
---

## 意图
标题直接叠在人物上面读作"字幕"，从人身后升起、被身体遮挡穿出，观众读到的是**空间**——
一行字瞬间有了片头的仪式感。命门三条：
1. **必须有遮挡**：标题与人物重叠面积 ≥25%（demo 里人物头顶吃进标题下缘），零重叠就是普通标题。
2. **hold 期间反向漂移**：标题与人物各往相反方向极缓移动，视差才成立；同向漂移层次感当场消失。
3. **字要够大且有立体质感**：字号占屏高 40%+（demo 235px），小字被遮一角只会像排版事故；字面用 3D 挤出艺术字（渐变字面 + 灰阶递进 text-shadow 侧面 + 落地投影），平面黑字压不住这个构图。

## 动效核心
- 三层 z-index：背景（z0）→ 大字标题层（z1）→ 前景人物剪影（z2，实拍中来自抠像）；
  另加小字副标（z1，标题上方）与字幕区（z3）
- 标题入场（0.4s 起）：opacity 0→1 + y 40px→0 + letter-spacing 0.2em→0.05em 收拢，0.55s `power3.out`——
  升起与收字距同步，像"从人背后聚拢成形"
- 副标小字：晚 0.35s，opacity 0→1 + y 10px→0，0.4s `power2.out`
- hold（入场完成即开始）：标题 x 0→+4px、人物 x 0→-4px，`sine.inOut` + yoyo 无限往复，
  半周期 4s（整周期 8s）——快了穿帮，慢到 8s 才像"镜头在呼吸"
- 遮挡由层级天然完成，不用 mask；人物剪影高度决定吃进标题多少

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `titleIn` | 0.55s | <0.4s 像弹出失去庄重感；>0.8s 拖沓，观众等字 |
| `riseFrom` | 40px | 越大"从身后钻出"越明显；>80px 会从人物中段穿身而过穿帮 |
| `trackFrom` → `trackTo` | 0.2em → 0.05em | 收拢量越大越有"聚焦成形"感；不收字距入场读作平移 |
| `driftPx` | 4px | >8px 像素材没固定住在漂；0 则 hold 期间死板如截图 |
| `driftPeriod` | 8s | <4s 读作晃动穿帮；越长越像呼吸镜头 |
| `subDelay` | 0.35s | 与主标同帧出=层次塌掉；>0.6s 观众以为没有副标 |
| `.bt-title` font-size | 150px | 屏高 25% 起步；再小遮挡读不出"在身后" |
| `.bt-host` height | 372px | 控制遮挡面积：头顶须吃进标题下缘 ≥25%，矮了就是普通标题 |

## 已知坑
- 文字与人物零重叠——没有遮挡就没有"身后"，一眼只是普通大标题。
- 漂移同向或幅度相同方向相同——视差的本质是层间相对运动，同向等于整体平移。
- hold 期间完全静止——像卡帧/贴图，伪 3D 骗术全靠那 ±4px 维持。
- 字号太小或标题放得太高躲开人物——遮挡消失，效果退化为片头字幕。
- 漂移周期太短——观众看出"元素在动"而不是"镜头在呼吸"，立刻廉价。

## 复用指引
- HTML/GSAP：demos/behind-text-title/index.html。换文案改 `.bt-title`（主标）与 `.bt-sub`（副标）内文本；
  换色改 `.bt-title` 的 `color:#e9e6dc`、`.bt-sub` 的 `color:#9a97a8`、`.bt-bg` 的渐变；
  时序手感全部在顶部 `CONFIG`（titleIn / riseFrom / trackFrom / trackTo / driftPx / driftPeriod / subDelay）；
  遮挡量调 `.bt-host` 的 width/height。核心动画即 `DemoShell.register` 内那一段，连 CONFIG 一起复制可直接摘走。
- Remotion 移植：三个绝对定位层按 z-index 叠放（人物层用抠像视频 `<OffthreadVideo>` 或带 alpha 的序列帧）；
  升起用 `interpolate(frame, [t0, t0+0.55*fps], [40, 0], {easing: Easing.out(Easing.cubic)})` 同步驱动 y、
  opacity 与 letterSpacing（0.2em→0.05em）；hold 漂移用 `Math.sin((frame/fps) * 2*Math.PI / 8) * 4`，
  标题取正、人物层取负，帧驱动天然 seek 安全。
- 剪辑软件对应物：剪映/CapCut 用"智能抠像"复制一层人物置顶、文字轨夹在原片与抠像层之间（教程常叫
  "text behind person / 人物遮挡文字"）；AE 里 Roto Brush 抠前景置顶，标题层 Position 打关键帧 +
  `loopOut("pingpong")` 做反向漂移；FCPX 用 Keyer + 三层堆叠同理。

## 动效范围
- 属于本卡的：3D 挤出艺术字质感（渐变字面 + 灰阶递进阴影侧面——立体靠灰阶层次，颜色是迁移接口）；三层 z 序（背景 → 大字标题 → 前景人物）以及由层级天然完成的遮挡（不用 mask）；标题入场 opacity 0→1 + y 40px→0 + `letter-spacing 0.2em→0.05em` 三者同步（0.55s、`power3.out`，"从人背后聚拢成形"）；副标晚 0.35s 的 opacity + y 10px→0；hold 期标题 +4px / 人物 −4px 的**反向**极缓漂移（`sine.inOut` + yoyo 无限，半周期 4s）；标题与人物重叠面积 ≥25% 这条几何约束。
- 不属于本卡的：背景（demo 已去掉渐变与暗角，纯白）、标题/副标文案与字体、人物剪影的画法（demo 用 host-placeholder 的灰阶版，实拍来自抠像）、字幕、150px 与 372px 这两个绝对值（按画幅折算）。
- 迁移接口：字色改 `.bt-title` 的 `color`（默认墨色 #1d1d1f）与 `.bt-sub` 的辅助灰 #8a8a8a；时序在 `CONFIG`（`titleIn`/`riseFrom`/`trackFrom`/`trackTo`/`driftPx`/`driftPeriod`/`subDelay`）；换尺寸时字号按**屏高 25% 起步**折算、`riseFrom` 与 `driftPx` 同比缩放（`driftPeriod` 不缩放，它是呼吸感的绝对时间）；遮挡量调 `.bt-host` 的 width/height 或换成真实抠像层，务必让头顶吃进标题下缘 ≥25%。
- 底色要求：白底即可，前提是**标题、人物、底三者明度要分得开**——本卡的效果全靠"字被人挡住"这个层次读出来。白底上人物剪影用浅灰（#e3e3e6/#ececef）、字用墨色即成立；实拍落地时人物层是抠像素材，标题色需与人物主色拉开对比，否则遮挡边界看不出来，效果退化成普通标题。


