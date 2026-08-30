# 人物素材（输入规格 · CPU 抠像 · 人脸安全区 · 与 B-roll 同屏）

**边界（2026-08-28 定版）**：人物素材（真人录播或数字人成品视频）对本 skill 是**输入**——
录制/生成它的技术（TTS、数字人模型、超分）不属于本 skill。本文只管合成侧：
素材要长什么样、怎么在 CPU 上抠像、怎么定人脸安全区、怎么和 B-roll 同屏摆。

## 1. 输入规格

- **绿幕 mp4**（推荐输入，抠像自己做）或**已抠好的 alpha WebM**（VP9：
  `-c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0`；Safari 场景另备 HEVC alpha `.mov`）。
- 时长必须与最终配音**逐帧对齐**（人物口型对声音）；对不齐的素材先在源头解决，合成侧不做变速。
- **帧率（2026-08-30 定版）**：人物素材 fps 必须等于成片 fps。不等时**优先把成片 fps 定为素材 fps**
  （动效是生成的，改帧率零成本）；确需保成片帧率则对人物层做光流补帧——
  **禁止靠简单重复帧混入**：25→30 的重复帧让人物每秒卡 5 次，旁边原生帧率的动效丝般顺滑，
  对比之下更扎眼（实测：人物区每 6 帧一次近零帧差、图形区无重复帧）。
- 拿到素材先 `ffprobe` 量真实宽高比——**输出尺寸按素材真实比例算几何**，不要按容器/期望值
  （按错比例排版会把人压扁；建议加自检：容器 w/h 与素材比不符直接抛错）。
- 素材边缘有暗角环/白雾类瑕疵时，处置在**合成几何侧**（可见视频区内缩，v4 实测 ≥3.2% 源宽），不在 key 侧硬抠。

## 2. 抠像（全 CPU，ffmpeg 即可）

绿幕素材三种键控实测排序（deepseek-harness-v4 三轮迭代）：

- **绿优势度键（定版首选）** `A = 255 − clip((G − max(R,B) − bias) × slope)`（bias 6 / slope 24）：
  人全实（黑衣/白 T/溢光皮肤全稳）、背景全透；配 `despill=type=green:mix=0.18` + alpha 1px 羽化
  （boxblur 只作用 alpha 面；素材上到 1024² 时羽化半径同步 ×2）。
- colorkey（RGB 半径）：阈值低了浅绿残留、提高到 0.34 会把溢绿的皮肤啃成半透明——只配快速预览。
- chromakey（UV 距离）：0.28 起吃黑衬衫，窗口窄到不可用。

```bash
# 绿优势度键 → alpha WebM（v4 定版配方；despill mix 只能 0.18 上下，0.5 会把白 T 染粉。
# 首次用在新素材上先裁 3s 样片验证边缘再跑全片）
ffmpeg -i greenscreen.mp4 -vf "format=rgba,\
geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255-clip((g(X,Y)-max(r(X,Y),b(X,Y))-6)*24,0,255)',\
despill=type=green:mix=0.18:expand=0.1,boxblur=0:0:0:0:1:1" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an host.webm
# Safari 走 HEVC alpha：
ffmpeg -i greenscreen.mp4 -vf "<同上>" \
  -c:v hevc_videotoolbox -allow_sw 1 -alpha_quality 0.7 -q:v 55 -tag:v hvc1 -an host.mov
```

**无绿幕实拍**（候选，首次使用先在 3s 样片上验证边缘质量，均可 CPU 跑）：
macOS 上首选 Vision 人像分割（`VNGeneratePersonSegmentationRequest`，Swift 十几行 + 时序平滑/羽化后处理）；
跨平台用 rembg（isnet/u2net，逐帧慢但稳）或 MediaPipe Selfie Segmentation（快，发丝边一般）。
产出统一转上面的 VP9 alpha WebM 规格。

两条排查经验（别用错方法判断 alpha 在不在）：`ffprobe` 报 `pix_fmt=yuv420p` **不代表没 alpha**
（VP9-in-WebM 的 alpha 在 BlockAdditions 里，看 `stream_tags.alpha_mode`）；
`ffmpeg -pix_fmt rgba` 抽 PNG 也取不到它——**解码必须显式 `-c:v libvpx-vp9`**。

## 3. 人脸定位与安全区（`scripts/face_bbox.py`，CPU）

**人物在场的镜头，布局前必须先拿真实人脸 bbox——不目测、不用亮度阈值猜**（2026-08-28 用户定版）。

```bash
python3 scripts/face_bbox.py public/dh/host.webm face-zone.json   # 每秒采样，OpenCV YuNet（CPU，模型 ~230KB）
```

输出：逐采样帧 face bbox + 全时段**并集 bbox** + 建议安全区（脸框向上外扩 60% 含头发、
四周再加 30px 余量，坐标已换算到素材像素系；合成里再按人物层的摆放几何映射到画布系）。

安全区口径：任何文字/卡片/字幕**及其背景**（卡片底、字幕底条都算）在**任何时刻**不得进入；
人物会移动/换形态时，每个停靠状态各查一次并取并集。主信息面板放人物对侧。

## 4. Remotion 接入

- **`<OffthreadVideo transparent />` 是必须的**：默认 `transparent=false` 按不透明取帧，
  alpha WebM 的透明区会被合成到黑底——成片人物带深色方框（2026-08-27 实修）。
- 人物素材是**演示语境素材**，不属于任何卡的动效范围；复用配方卡时替换为片子自己的人物素材。
- 换素材（换人/换分辨率）= 人像几何全部重标定：包围盒、脸中心、场景避让、三形态落位。
  几何写成**分数**（相对源宽高），换分辨率零改动（v4 512→1024 实测）。

## 5. 人物与 B-roll 同屏：两条处置（2026-08-27 用户定版）

**规则**：某镜头既有 B-roll/截图素材，又有对应这段口播的人物素材时，**人物一律降级成角标常驻，
不许占满画幅、也不许把人切走**。B-roll 是这一拍的主角，人物的职责是"证明是这个人在讲"。

| 路 | 做法 | 用在 |
|---|---|---|
| **A 圆形头像章** | 人物层裁成圆窗 + 缩位到画面一角，走 `host-shrink-to-chip◆`（裁切窗 + 内层 scale 同一进度驱动） | 默认路。素材是绿幕/纯底、或抠不干净时；圆窗边界自己吃掉毛边 |
| **B 分割抠人贴角** | 按 §2 取 alpha，**保留人物真实外形**贴在 B-roll 左下或右下角 | 有手势要看、要"人站在素材前面"的临场感 |

两路共用的硬约束：
- **角标位置死锁**：落定后不漂、不呼吸、不换位（让台的语义是"我不抢戏"）。
- **人必须还在动**：角标里是继续口播的视频，不是静态头像/定格帧。
- **方位必须是下角**（2026-08-27 用户定版）：横屏左下/右下皆可，chip 圆心落在画面**下 1/3 带**内
  （1080p 即 y ≥ 720），下缘贴 action-safe（96px）；与字幕冲突时优先换到另一侧下角，
  最多上让一个半径，绝不上浮到中位。竖屏必须左下（右缘是抖音点赞栏）。
- **不许缩小人物去迁就画框**：人被画框切到时，把人整体往画面里挪 / 收窄 B-roll，绝不等比缩小
  （`demo-spec.md` §7 同一条纪律）。
- **交接错峰三段序**（2026-08-28 用户点名）：旧面板**完全退场** → 人物缩位/换位 → 新面板才淡入，
  三者不得交叠；B-roll 接位晚人物 0.15s 从对侧进。
- **人物出镜节奏**：片头 Hook 先满幅/半身建立人物（首句～8s）再缩位；之后形态切换按
  cinematography.md §4.5 布局事件预算（每分钟 2–4 次、语义触发，禁机械往返）。

## 6. demo 侧接入约定

- demo-shell 自动把人物视频注入 `.host-placeholder` 与 `[data-dh-host]` 元素（muted/loop/autoplay），
  加载失败退回灰阶剪影——demo 离线依旧可开。
