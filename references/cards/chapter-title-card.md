---
name: chapter-title-card
标题: 章节标题卡
一句话: 段落切换时全屏色块 0.3s 压入盖屏，屏高 40% 的章节编号先落位，章节名随后从编号旁遮罩揭示，停 1.2s 后色块同向扫出切回口播
适用: 长口播（5 分钟以上）的段落切换点；财经解读、事件复盘、纪录片式叙事等需要"翻页感"的调性
时长: 单卡约 2.5s：扫入 0.3s + 编号 0.4s + 章节名 0.35s + hold 1.2s + 扫出 0.3s；两卡示范间隔 0.7s
能量: 中
类别: 转场结构
优先级: P0
参考: 差评君, 小Lin说, LEMMiNO, Johnny Harris, IC实验室
---

## 意图
长口播讲到第 4 分钟观众注意力必然涣散——章节卡是一次强制"翻页"，让观众喘口气并重置预期（"哦，进入新话题了"）。
命门：**层次**（编号先落位立骨架，章节名再进——同时出现层次就塌了）、
**不呆滞**（hold 期间整组带极缓漂移，完全静止 1 秒读作视频卡帧）、
**快进快出**（全程 ≤2.5s，转场比内容还长就是喧宾夺主）。

## 动效核心
- 全屏色块 `.chapter-card`（品牌色/深色，flex 居中排编号+文字组）：`xPercent -100 → 0`，0.3s，`power4.inOut`，从左压入盖住口播画面
- 章节编号 `.chapter-num`（衬线体 Georgia/宋体，216px ≈ 屏高 40%）：色块盖屏后 opacity 0→1 + scale 1.3→1，0.4s，`power3.out`
- 章节名 `.chapter-name`：外层 `overflow:hidden` 容器内做 `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)` 侧向遮罩揭示，0.35s，`power3.out`，起点比编号晚 0.18s
- 小字戳 `.chapter-sub`（英文章节号+日期，字距拉大）：比章节名再晚 0.1s，opacity 0→1 + x -14px→0，0.3s
- hold：编号与文字组整体 x 0→10px 线性漂移贯穿停留期（1.7s），防卡帧感
- 出场：色块继续同方向 `xPercent 0 → 100`，0.3s，`power4.in`，露出底下口播画面（主持人+字幕区一直在色块下层没动过）
- demo 连演两张卡（01 蓝 → 02 红），中间回到口播 0.7s，示意真实节奏

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `wipeIn` | 0.3s | >0.5s 像幕布拉过没有"压入"劲；<0.2s 观众没意识到发生了转场 |
| `numIn` | 0.4s | 编号是骨架，太快（<0.25s）立不住；太慢挤压后面节拍 |
| `nameIn` | 0.35s | 遮罩揭示再慢就读作"加载中"；比编号晚 0.18s 起是层次的来源 |
| `subDelay` | 0.1s | 小字与章节名的错峰；0 则三层同出层次塌掉 |
| `hold` | 1.2s | 观众读完标题所需时间；>2s 拖节奏，<0.8s 长标题读不完 |
| `driftPx` | 10 | hold 期防呆滞的漂移量；>20px 读作运镜失误，0 则像卡帧 |
| `wipeOut` | 0.3s | 出场比入场可略快；用 `power4.in` 加速离场才有"翻过去"感 |
| `gapBetween` | 0.7s | 两章之间回口播的间隔，仅 demo 示范用；实际由口播内容决定 |

## 已知坑
- 编号和章节名同帧出现——没有先后就没有层次，读作一张静态 PPT 突然糊上来。
- hold 期间所有元素完全静止——观众会怀疑视频卡了；极缓漂移是"活着"的最低成本证明。
- 全程超过 2.5s——转场比正文还隆重，观众等得不耐烦，一眼业余。
- 编号用细无衬线小字——章节感靠的就是超大衬线编号的"书卷分量"，缩小或换细体立刻廉价。
- 色块出场换方向（从右回弹）——观众预期"翻页"是单向的，来回晃读作撤销。

## 复用指引
- HTML/GSAP：demos/chapter-title-card/index.html。换文案改 `.chapter-num` / `.chapter-name` / `.chapter-sub` 内文本；换色改 `.chapter-card.c1` / `.c2` 的 `background`；节奏全部在顶部 `CONFIG`（`wipeIn`/`numIn`/`nameIn`/`subDelay`/`hold`/`driftPx`/`wipeOut`/`gapBetween`）。加第三章 = 复制一段 `.chapter-card` DOM + 在 register 里多调一次 `chapterBeat(tl, cards[2], at)`。核心节拍函数 `chapterBeat` 可整段摘走。
- Remotion 移植：每章一个 `<Sequence>`；色块用 `interpolate(frame, [0, wipeIn*fps], [-100, 0], {easing: Easing.inOut(Easing.quart)})` 驱动 `translateX%`；编号 scale/opacity 与章节名 `clipPath` 的 inset 百分比同样用 interpolate（`Easing.out(Easing.cubic)`）；hold 漂移是一条贯穿的线性 interpolate；出场放同一 Sequence 尾部用 `Easing.in(Easing.quart)`。
- （实测变体）暗色纹理版：黑底 + 星座粒子 + 同心环做底，eyebrow 英文小字先出、主标衬线大字随后、副字再延迟 0.4s——三层错峰的骨架不变，只把"品牌色块"换成有纹理的暗场，适合叙事更重的长片开幕。见小Lin说·韩股崩盘。
- （实测变体）荧光菱形徽章版：不用满屏色块压入，而是一枚菱形渐变徽章带章节数字从小弹大立在画面中，截图卡随后升入接管画面——章节卡与素材入场合成一拍，比"盖屏再揭开"省 0.5s，适合竖屏快节奏。见 TheAIScaler（Apm_oCzPEQs）。
- 剪辑软件对应物：剪映"文字模板→片头/章节"类 + "向右擦除"转场叠色块；AE 里是纯色层 Position 关键帧（Easy Ease 拉重入场）+ 文字层 Scale 关键帧 + 轨道遮罩（Track Matte）做章节名揭示；CapCut 搜 "chapter title" 模板。

## 动效范围
- 属于本卡的：全屏色块 `xPercent -100→0` 压入盖屏（0.3s、`power4.inOut`）；编号 opacity 0→1 + scale 1.3→1 落位（0.4s、`power3.out`，在色块盖屏之后）；章节名 `clip-path inset(0 100%→0)` 侧向遮罩揭示（0.35s，比编号晚 0.18s）；小字再晚 0.1s 的 opacity + x −14→0；hold 期整组 x 0→10px 线性漂移防卡帧；色块**同方向**继续 `xPercent 0→100` 扫出（0.3s、`power4.in`）。这五段的先后与那条单向进出的运动语言就是本卡全部。
- 不属于本卡的：色块的颜色、编号的衬线字体与 216px 字号、章节名/小字的具体文案与字距、底下口播画面（主持人占位 + 字幕）、demo 连演两张卡与 `gapBetween` 间隔（仅示范节奏，实际由口播内容决定）。
- 迁移接口：**色块颜色 = 复用者的品牌色接口**——改 `.chapter-card.c1` / `.c2` 的 `background`（demo 收敛成中性灰阶两档 #1d1d1f / #55565a，换成品牌深色即可），色块上的文字色随之取反（当前 #ffffff）；节奏全在顶部 `CONFIG`（`wipeIn`/`numIn`/`nameIn`/`subDelay`/`hold`/`driftPx`/`wipeOut`）；编号字号按屏高 40% 折算，换尺寸时同比缩放；加章节 = 复制一段 `.chapter-card` DOM + 多调一次 `chapterBeat`。扫入扫出方向要保持同向，改方向须同时改两处。
- 底色要求：白底即可（色块自带满屏遮盖，底色只在色块进出的前后两拍露出）。色块本身必须与底色有足够明度差，白底配深色块、深底配亮色块。


