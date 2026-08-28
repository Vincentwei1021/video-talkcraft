---
name: news-card-desk
标题: 新闻卡片划重点
一句话: 新闻截图包成白色圆角卡片、带 1~2° 歪度从下方 0.4s 滑上桌，1s 后红色下划线 0.3s 扫过标题关键句，第二张卡再从右侧压叠上来，卡片全程 8s 极缓 Ken Burns
适用: 解读/评论新闻、引用报道原文做证据的段落；财经、时事、盘点类口播的"先看这条新闻"时刻，调性冷静专业
时长: 单卡上桌 0.4s；红线在 1.0s 处扫 0.3s；第二卡 1.9s 入场；Ken Burns 全程 8s 铺底
能量: 中
类别: 素材呈现
优先级: P0
代码: template/cards/news-card-desk.tsx
---

## 意图
口播里直接糊一张新闻截图 = 静态 PPT；把截图包成"摆上桌"的卡片并当着观众的面划出重点，
既给素材入场仪式感，又替观众完成"该看哪一句"的视线引导。命门三条：
**Ken Burns 必须极缓**（8s 才推 4%，快了读作镜头晃）；**红线要等朗读到关键词才扫**
（与卡片同时出现就不是"划重点"而是"印刷体"）；**卡片必须轻微歪 1~2°**
（直挺挺立在正中读作软件弹窗，歪了才像"摆上桌"的实物）。

## 动效核心
- 卡片结构：白底圆角（radius 8px）+ 描边 #e0e0e0 + 投影（白底桌面上 0 14px 30px rgba(0,0,0,.14) 足够分层；深底桌面需加深）+ 假新闻排版：报头/日期一行 + 粗底线、标题 h2、正文用灰条代替
- 卡 A 入场：opacity 0→1 + y 60px→0，0.4s，`power3.out`，带 rotate -1.5° 定歪
- Ken Burns：卡内包一层 `.kb-inner`（transform-origin 50% 40%），落位后 scale 1→1.04，8s，`ease:none`——卡片"活着"但不晃
- 红线：标题关键词包 span，内嵌绝对定位红条（#d8383a，高 5px，贴字底），1.0s 时 scaleX 0→1，0.3s，`power2.out`，`transform-origin: left center`——从左往右"划"出来
- 卡 B 堆叠：1.9s 时从右侧 x 320px→0 + 淡入，0.4s，`power3.out`，rotate +2°（与卡 A 反向歪），DOM 顺序在后自然压在卡 A 之上，落位后同样开始自己的 Ken Burns
- 层级：卡片层之上留 `.caption-zone` 字幕区，口播台词与红线时刻呼应（"重点是这一万亿"）

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| slideIn | 0.4s | >0.6s 上桌拖沓像浮现；<0.25s 读作弹窗 |
| slideY | 60px | 越大"从桌外拿进来"感越强；>120px 滑程抢戏 |
| tiltA / tiltB | -1.5° / 2° | 归零立刻假（软件弹窗感）；>4° 读作东倒西歪 |
| redlineAt | 1.0s | 必须对齐朗读到关键词的时刻；提前=印刷体，滞后=划错重点 |
| redline | 0.3s | >0.5s 像慢镜头描字；<0.15s 看不出"划"的动作 |
| cardBAt | 1.9s | 跟着口播列举节奏走；太近两卡打架，太远堆叠感断掉 |
| kenburns | 1.04 | >1.08 开始读作 zoom 镜头；1.0 卡片死板 |
| kbDur | 8s | 越长越沉稳；<4s 就像手持晃动 |

## 已知坑
- Ken Burns 推快了（<4s 或倍数 >1.08）——观众读到的是"镜头在晃"而不是"素材活着"。
- 红线和朗读不同步——红线先于人声划出等于剧透，一眼看穿是预渲染动画。
- 卡片直挺挺立在画面正中——零旋转 + 居中 = 软件 alert 弹窗，歪 1~2° 才是"摆上桌"。
- 两张卡不重叠、各占一边——没有压叠就没有"桌面越摆越满"的列举感，成了并排 PPT。
- 红线用 width 动画而不是 scaleX——width 回流抖动且不吃 GPU，扫动不顺滑。

## 复用指引
- Remotion/tsx（skill 首选）：template/cards/news-card-desk.tsx——自包含单文件，复制进工程即可用；参数在顶部 CONFIG，时长/尺寸在 meta。
- HTML/GSAP：demos/news-card-desk/index.html。换文案改两张卡里的 `.paper`（报头）、`.date`、`h2` 标题即可；要划的关键句包在 `<span class="kw">…<span class="redline"></span></span>` 里；红线颜色改 `.redline` 的 `background: #d8383a`，卡底色改 `.news-card` 的 `background`。节奏全部在顶部 `CONFIG`：`redlineAt` 对齐你的语音重音，`cardBAt` 对齐第二条素材的口播时刻，`tiltA/tiltB` 控制歪度。核心动画即 `DemoShell.register` 内那一段 timeline，连同 CONFIG 复制可直接摘走。
- （实测变体）译文条覆盖：外文截图不用红线划重点，而是在关键句上直接叠一条白底黑字的译文横条（宽度对齐该句，压在原文之上）——观众省掉"读外文再理解"的一步；适合引用英文报道/推文的段落，与红线通道二选一。见小Lin说·韩股崩盘。
- Remotion 移植：卡片入场用 `spring({frame, config:{damping:200}})` 驱动 y/opacity；Ken Burns 用 `interpolate(frame, [inFrame, inFrame+8*fps], [1, 1.04])` 慢推（clamp）；红线单独包 `<Sequence from={redlineAt*fps}>`，内部 `interpolate(frame, [0, 0.3*fps], [0, 1])` 驱动 scaleX；第二张卡再包一个 `<Sequence from={cardBAt*fps}>` 重复同一入场组件。
- 剪辑软件对应物：剪映——素材加"白色边框"贴纸打底 + 入场动画"向上滑动"，红线用"画笔/线条贴纸"的擦除入场，缓推用"缩放"关键帧拉满全程；AE——卡片做预合成，Position/Opacity 关键帧 + Scale 100→104 线性，红线是 Shape Layer + Trim Paths；CapCut——"Photo frame" 模板 + "wipe right" 的线条 element，zoom 用 keyframe 手动拉。

## 动效范围
- 属于本卡的：卡片"摆上桌"入场——opacity 0→1 + y 60px→0（0.4s、power3.out）并带 1~2° 定歪（零旋转即读作软件弹窗）；落位即起的极缓 Ken Burns（内层 `.kb-inner`、scale 1→1.04、8s、ease none，origin 50% 40%）；划重点的下划线 scaleX 0→1（0.3s、power2.out、origin left center）且必须等朗读到关键词才扫（早于人声＝剧透）；第二张卡延迟入场从侧向滑入 + 反向歪度、DOM 顺序在后自然压叠，落位后各自跑自己的 Ken Burns；卡片必须离开背景一层（投影/描边）这条约束。
- 不属于本卡的：假新闻的排版（报头、日期、灰条正文）、标题与字幕文案、卡片圆角与字号、下划线的具体色值、桌面底色。
- 迁移接口：`redlineAt` 对齐你的语音重音、`cardBAt` 对齐第二条素材的口播时刻（两者是唯一需要跟音频对齐的参数）；`slideIn` / `slideY` 调上桌行程；`tiltA` / `tiltB` 控歪度（保持一正一负）；`kenburns` / `kbDur` 控"活着但不晃"（>1.08 或 <4s 就读作镜头晃）；`cardBFrom` 换第二张卡的进场方向；划重点色换 `.redline` 的 `background` 一处。
- 底色要求：白底即可。卡片本身也是白底，靠 #e0e0e0 描边 + 一层 14% 黑投影与舞台分层——这两者不能同时去掉。深底桌面时把卡片保持白、投影加深即可，时序不变。
