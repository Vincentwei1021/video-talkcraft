---
name: chevron-lower-third
标题: 动态人名条
一句话: 姓名行从左推出（x -26→0，0.26s），职称 chip 错峰 0.1s 从左 scaleX 展开 0.22s、chip 内字滞后 2 帧淡入，三枚 chevron 再依次扫过点亮当"条子还在延伸"的收尾；hold 2.0s 后整条从左收回
适用: 真人出镜嘉宾首次开口的 3~5 秒；也用于连线、自我介绍、引用他人观点时标注身份；比 lower-third-nameplate 多一档"节目感/动态感"（vlog、播客、体育/科技节目）；正式访谈与纪录片建议用那张更克制的
时长: 起手静置 0.4s → 姓名推出 0.26s → chip 展开 0.22s（错峰 0.1s，内字滞后 0.067s）→ chevron ×3 错峰 0.07s → hold 2.0s → 整条收回 0.2s；共约 3.5s
能量: 低
类别: 人物互动
优先级: P1
代码: template/cards/chevron-lower-third.tsx
---

## 意图
观众需要在人物开口的头两秒知道"这是谁、凭什么听他说"——人名条是成本最低的信任背书。
这个需求本库已有 `lower-third-nameplate` 在解决，所以本卡的存在必须靠**区别**站住：

**`lower-third-nameplate` = 色条 → 姓名 → 头衔的三段接力**（一根横色条先展开，
文字被 clip 从左揭示；克制、新闻感、"横向语言"统一）。
**本卡 = chip 展开 + chevron 收尾**：职称不是一行灰字，而是坐在**实心 chip** 上
（身份被"发牌"出来，像一枚标签）；收尾多了三枚 chevron 依次点亮，
读作"这条子还在往右延伸"——一个**没有停下来的**收尾。
所以本卡比那张多一档动态感：那张是"贴上去一块名牌"，本卡是"发出一枚标签、并且还在走"。
选卡标准很直接：正式访谈/纪录片用那张，节目感/网感的片子用这张。

命门三条：
① **chip 内的字滞后 chip 2 帧（0.067s）**。字跟着 chip 一起被刷出来读作一整块 PNG；
chip 先成形、字后落，才有"发牌"的两拍。
② **chevron 是收尾不是装饰**。它必须在 chip 落定**之后**依次点亮，且错峰要密
（0.07s）——三枚读作**一道扫过**，不是三个小箭头各自出现。
③ **hold 要给 2.0s**。人名条的本职是让人读完姓名 + 头衔，读不完等于没打；
其他动效 1.5s 够，这张不够。

## 动效核心
- **结构**（@960×540 舞台）：左下安全区内（左 72 / 下 96），第一行 44px/700 墨字姓名；
  第二行是 flex 行：实心 chip（高 40，`border-radius: 12` 小件圆角档，
  内 21px/600 白字）+ 12px 间隙 + 三枚 15×26 的 chevron（4.5px 描边 `round` 端头）。
  整条包在一个 `transform-origin: left center` 的 `.clt` 里（退场时整条一起收回）
- **① 姓名推出**：`x -26→0` + `opacity 0→1`，`0.26s power3.out`
- **② chip 展开**：chip 背景是独立层 `.clt-chip-bg`（`transform-origin: left center`，
  `scaleX 0→1`，`0.22s power3.out`），起步 = 姓名起步 + `0.1s`（错峰，不等姓名走完）；
  chip 内字 `opacity 0→1`（`0.14s`），滞后 chip `0.067s`（≈2 帧 @30fps）。
  **字不参与 scaleX**（否则被横向拉扁），chip 容器加 `overflow: hidden` 兜底
- **③ chevron 扫过**：`opacity 0→1` + `x +5→0`，各 `0.14s power2.out`，错峰 `0.07s`；
  起步 = chip 落定。错峰密到读作一道扫过而不是三个元素
- **④ hold 2.0s**：全部静置（元素小，不需要防呆滞漂移）
- **⑤ 退场**：整条 `.clt` 一起 `scaleX 1→0` + `opacity 1→0`，`0.2s power2.in`
  （比入场的 0.26s 快——出场永远比入场轻，design-language §4）
- **层级**：人物画面 → 人名条（最上，且必须高于字幕安全区）

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| `namePush` | -26px | 姓名推出位移；0 = 纯淡入（少了"推上来"的方向），<-60px 读作从画外飞入，抢了 chip 的戏 |
| `nameDur` | 0.26s | 姓名推出时长；<0.15s 读作硬现，>0.45s 后面两段等不起（整条入场超过 1s 就拖） |
| `chipGap` | 0.1s | chip 相对姓名起步的错峰；0 = 两行一起进（层次塌），>0.3s 读作两个独立动效（"名字来了…哦还有个标签"） |
| `chipDur` | 0.22s | chip 展开；<0.12s 读作色块硬现，>0.4s 观众看着 chip 慢慢长，节奏散 |
| `chipTxtLag` | 0.067s（2 帧 @30fps） | **本卡第一命门**；0 = 字跟着 chip 一起被刷出来（整块 PNG 感），>0.2s 读作 chip 空着等字 |
| `chevStagger` | 0.07s | **本卡第二命门**；<0.04s 三枚几乎同时（读作一个整体图形），>0.15s 读作三个小箭头各自出现（装饰化） |
| `chevDur` | 0.14s | 单枚 chevron 点亮；比 chip 快（它是轻件），拉长会让收尾比主体还重 |
| `chevSlide` | 5px | chevron 点亮时的 x 位移；0 = 纯淡入（可用，"延伸感"弱一点），>12px 读作三个小箭头在飞 |
| chevron 枚数 | 3 | 2 枚"延伸感"不够（读作两个点），≥4 枚在小尺寸下糊成一片；3 是"还在走"的最小可读数量 |
| `hold` | 2.0s | **本卡第三命门**；<1.5s 观众读不完姓名 + 头衔（等于没打），>8s 变成常驻台标（那是另一件事） |
| `outDur` | 0.2s | 退场时长；**必须短于 `nameDur`**（出场比入场轻）；>0.4s 读作"舍不得走" |
| 头衔字数 | ≤12 字一行 | 超过一行读不完；多余身份直接删（"供应链咨询顾问 · 12 年"已是上限） |
| 落位 | 左 72 / 下 96 | 必须在 action-safe 内且**高于字幕安全区**；下缘小于 64px 会和字幕打架 |

## 已知坑
- chip 内的字跟着 chip 一起 `scaleX`——字被横向拉扁，慢放下非常明显；字必须是 chip 背景层之上的独立层。
- chip 内字不滞后（与 chip 同时淡入）——整条读作一张预先做好的 PNG 贴上来，"发牌"的两拍消失。
- chevron 在 chip 落定前就点亮——收尾语义变成"和主体一起进场的装饰"，"条子还在延伸"这层意思全丢。
- chevron 错峰拉到 0.15s 以上——三枚变成三个独立小箭头依次出现，读作装饰而不是一道扫过。
- chevron 加到四枚以上——在实际投放尺寸（手机竖屏）上糊成一片色，还挤占了头衔的横向空间。
- 退场直接整体淡出——像素材播完了自然消失；反向收回才是"完整的一次亮相"（这条与 `lower-third-nameplate` 共享）。
- 退场做得比入场慢——违反 design-language §4（出场永远比入场轻），读作"舍不得走"。
- hold 只给 1.2~1.5s（照抄别的卡）——人名条的本职是让人读完，读不完等于没打；这张卡必须给 2.0s。
- chip 用 `width` 动画而不是 `scaleX`——width 变化触发回流，chip 内的字会跟着换行/跳动。
- 姓名和 chip 用两个不同的强调色——同屏第二个"看这里"色（design-language §1 红线）；chip 与 chevron 共用唯一强调色，姓名走墨色。
- 压在画面正下方字幕区——和字幕打架；人名条的家在左下但必须高于字幕安全区。
- 头衔写两行——读不完，而且 chip 变成一个方块（chip 的语义是"一枚标签"，标签是扁的）。
- 忘了给 `.clt` 设 `transform-origin: left center`——退场时整条从中心收，读作"被吸走"而不是"收回左边"。

## 复用指引
- Remotion/tsx（skill 首选）：template/cards/chevron-lower-third.tsx——自包含单文件，复制进工程即可用；参数在顶部 CONFIG，时长/尺寸在 meta。
- HTML/GSAP：demos/chevron-lower-third/index.html。换文案改 `.clt-name` 与
  `.clt-chip span`（头衔 ≤12 字），chip 宽度自动跟着文字走（`padding: 0 18px`）；
  改强调色只动 `:root --acc`（chip + chevron 共用，姓名保持墨色）；
  节奏全在 `CONFIG`（`namePush`/`nameDur`/`chipGap`/`chipDur`/`chipTxtLag`/
  `chevStagger`/`hold`/`outDur`）；落位改 `.clt` 的 `left`/`bottom`。
  实拍落地时给姓名与 chip 补一层投影或半透明底板——那是**迁移方自加的可读性层**，不属于本卡。
- Remotion 移植：整条包一个 `<div style={{transformOrigin: "left center", transform: `scaleX(${out})`}}>`；
  姓名 `x = interpolate(f, [0, 8], [-26, 0], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"})`；
  chip 背景 `scaleX` 用 `f - 3` 局部时钟、chip 内字用 `f - 3 - 2`；
  chevron 三枚用 `f - 10 - i*2`；退场用 `interpolate(f, [outFrame, outFrame+6], [1, 0])`。
  帧换算 @30fps：`nameDur 0.26s ⇒ 8f`、`chipGap 0.1s ⇒ 3f`、`chipTxtLag 0.067s ⇒ 2f`、
  `chipDur 0.22s ⇒ 7f`、`chevStagger 0.07s ⇒ 2f`、`hold 2.0s ⇒ 60f`、`outDur 0.2s ⇒ 6f`。
- 剪辑软件对应物：剪映/CapCut——"文字模板 → 字幕条/人名条"分类里有大量带 chip 的款，
  但**内置款的 chip 与字基本是一起进场的**（丢掉本卡第一命门）；要做对就自己搭：
  文字层 + 色块层，色块用"向右展开"入场、文字用"渐显"并把入场时间往后拖 2 帧；
  chevron 用三个 `>` 文字层或箭头贴纸，入场时间各差 2 帧。
  AE——Shape Layer 做 chip（Scale X 0→100%，锚点移到左边缘）+ 文字层单独 Opacity 关键帧
  晚 2 帧；三枚 chevron 各自 Position + Opacity，用 `Sequence Layers`（Overlap 关掉）
  自动排 2 帧错峰；整条用一个 Null 父级做退场 Scale X。FCPX 内置 Lower Thirds 生成器
  改不出 chip 滞后，建议自搭。
- 与本库同类卡的分工：**`lower-third-nameplate` = 色条 → 姓名 → 头衔三段接力**
  （克制、新闻/纪录片感、横向语言统一、头衔是灰字）；
  **本卡 = 姓名推出 → chip 展开 → chevron 收尾**（节目感/网感、头衔是一枚实心标签、
  收尾"还在延伸"）。两张不要在同一片子里混用——人名条是全片一致的模板件，
  换款会让观众以为换了节目。`host-shrink-to-chip` = 人物本身缩成角标（构图变化，不是标注）；
  `subscribe-cta` = 行动号召（常驻件）。

## 动效范围
- 属于本卡的：姓名 `x -26→0 + opacity`（0.26s `power3.out`）推出；chip 背景 `scaleX 0→1`（origin left，0.22s）错峰 `0.1s` 跟上、**chip 内字滞后 2 帧（0.067s）淡入且不参与 scaleX**（本卡第一命门）；三枚 chevron 在 chip 落定**之后** `opacity 0→1 + x+5→0`、错峰 `0.07s` 密到读作一道扫过（收尾语义："条子还在延伸"）；hold **2.0s**（人名条专属的长 hold）；退场整条 `scaleX→0 + opacity`（0.2s `power2.in`，**必须快于入场**）且 `transform-origin: left center`；"chip（实心标签）+ chevron（延伸）"这个与三段接力式人名条相区别的组合关系。
- 不属于本卡的：demo 那个「陈知远 / 供应链咨询顾问 · 12 年」的具体人名头衔、44px 与 21px 的字号、蓝色 `#0066cc` 这个具体取值、chip 高 40 与圆角 12 的绝对数值、chevron 的具体形状（`>` 折线可换三角/箭头）、左 72 / 下 96 的具体安全区数值（按画幅重算）、人物画面（demo 用数字人占位）、实拍落地时补的投影或半透明底板（那是可读性层，迁移方自加）。
- 迁移接口：强调色一个变量 `--acc`（chip + chevron 共用，姓名走墨色，同屏不允许第二个）；字号与 chip 高度按画幅等比（44px/40px @540 舞台高 ⇒ ×2 @1080）；落位按目标画幅的 action-safe 重算，且必须**高于字幕安全区**（横屏字幕 bottom 100px ⇒ 人名条 bottom ≥ 170px；竖屏字幕 bottom 350px ⇒ 人名条要么更高要么改到上方）；节奏在 `CONFIG`，`chipTxtLag`（2 帧）与 `chevStagger`（0.07s）是**手感常量**，换尺寸换语速都不要动；`hold` 按"姓名 + 头衔读两遍"给（实拍建议 3~5s，demo 压到 2.0s）；`outDur` 必须短于 `nameDur`。
- 底色要求：白底即可。实拍落地时底色是任意视频画面，因此**对比度要自证**——chip 与姓名必须在目标背景上读得出（浅色背景上墨字姓名成立；深色/花色背景上要给姓名补描边或垫半透明底板）。这是迁移方的责任，不是本卡的动效内容。
