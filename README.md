<div align="center">

<img src="assets/logo.svg" alt="video-talkcraft logo" width="150">

<h1>video-talkcraft</h1>

[![Gallery](https://img.shields.io/badge/Gallery-live%20previews-7A5AF8)](https://vincentwei1021.github.io/video-talkcraft/)
[![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue)](LICENSE)
[![WeChat](https://img.shields.io/badge/WeChat-%E8%AE%A8%E8%AE%BA%E7%BE%A4-07C160?logo=wechat&logoColor=white)](assets/wechat-group.jpg)

**口播视频的 agent skill：字级配音同步 · 98 张动效配方卡 · 七层反 PPT 镜头系统 · 三重验收**

[中文](README.md) | [English](README_EN.md)

</div>

**video-talkcraft** 是 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
系列的口播视频篇：一个把 Claude Code / Codex 变成口播视频动效工作室的 AI agent skill。
给它一份口播稿和一条成品配音，它在本机对齐字级时间戳、把每个语义拍写进 SHOTBOOK
分镜，然后用 [Remotion](https://www.remotion.dev/) 渲出高质量的解说成片——动态字卡、
证据截图、运镜、素排字幕、影视级音效，全部锁在人声上。

🖼️ [**在线画廊：98 张动效预览一页全览 »**](https://vincentwei1021.github.io/video-talkcraft/)

[![video-talkcraft 在线画廊](assets/gallery-zh.png)](https://vincentwei1021.github.io/video-talkcraft/)

## 🆕 更新（What's new）

**2026-09-05**

- 🔁 **9 张 video-shotcraft 移植卡（89 → 98）**——通读姊妹库 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) 的 157 张产品片镜头卡，按"补口播空白 / 服务讲述不炫产品 / 过运动减法 / 有 Remotion 母本"筛出 18 张进实验室、用户定 9 张：词槽轮换 · 首词占满补句 · 标题降格成标签 · 扫描线逐处点名 · 急推特写 · B-roll 定格圈注 · 点阵比例图 · 多源汇聚 · 线条接力转场；tsx 以母本为起点改成本库自包含契约，「复用指引」带母本溯源（→ `references/taxonomy.md` 第八批◎）。
- 🧩 **10 张多素材同屏新卡（79 → 89）**——并列句排版、三联画接力、对比分屏、传送带、卡堆扇开等，每卡标注输入类型与常用场景，选卡先按素材类型过滤（→ `references/taxonomy.md` 输入类型索引）。
- 📐 **排版规范 `references/layout.md`**——12 栏栅格、间距令牌、字阶最小档、包围盒不相交等九项自检，选中卡的「已知坑 / 落位自检」必须抄进 SHOTBOOK。
- 🎨 **12 款动态幕底入库**——`template/motion-systems/backdrop.tsx` 深浅各 6 款、frame 驱动零随机，默认幕底改为浅 `pastel-mesh-flow` / 深 `mesh-flow-dark`。

**2026-09-04**

- 🎥 **运动系统做减法**——每场景只保留一条极缓推拉相机曲线 + 让位，idle 微动 / 环境呼吸 / 脉冲全部默认关闭。
- 🌐 **网页拍摄不贴图**——网页素材不再静态贴屏，改为镜头滚动 / 巡游 / 放大镜 / 划重点"拍"出来，坐标全吃 Playwright 实测（→ SKILL.md §③、`references/shot-design.md` §2④）。

**2026-09-02**

- 🎛️ **动效工作台 `workbench/`**——剪映式的成片后期台：多轨时间线 + 素材库（素材 / 动效库 / 音效 / 背景）+
  schema 属性面板 + 实时预览 + 一键「导出成片」。98 张动效卡 100% 参数化（文案 / 颜色 / 字号 / 位置可调，
  节奏命门固定不暴露）；口播成片可一键拆成字幕 / 转场 / 环境 / 数字人 / 镜头 / 配音 / 音效七类多轨单元逐项微调。
  skill 交付成片后会主动打开它。→ [**图文指南 workbench/GUIDE.md**](workbench/GUIDE.md)

  <a href="workbench/GUIDE.md"><img src="workbench/docs/img/01-overview.png" alt="动效工作台总览" width="720"></a>

- ⚡ **渲染提速：分段渲染母版制**——`scripts/render_shots.mjs` 按镜头切段并行渲、段内单进程保光栅一致，
  拼装 + 整条音轨混入 + 帧数断言；改一个镜头只重渲该段±邻段。`scripts/render_stills.mjs` 一次 bundle 批量出静帧。
- 🧮 **评审 token 减量**——`scripts/contact_sheet.py` 把 QA 帧拼成 3×4 网格给评审子代理整版浏览；连拍三帧对只对标了
  `"burst": true` 的状态切换锚点抽（曾占评审材料 2/3）。
- ✅ **一轮审片即交付**——机器闸全过后只做 1 轮独立审片、修完 P0/P1 即交付，再询问是否续审（累计封顶 3 轮），
  替代旧的"循环到全过"。

| 实测（201s 竖屏片） | 之前 | 现在 |
|---|---|---|
| 全片首渲 | 13 min | 9 min |
| 改一个镜头出有声新片 | 整渲 | 53 s |
| 43 张静帧抽样 | 11 min | ~1 min |
| 评审读 160 张 QA 帧 | ≈16 万 token / 21 min | ≈4 万 token / 7 min（拼图） |

- 🤝 新卡：社区贡献 **douyin-follow-card 抖音主页关注卡**（[@scpcn01vision-oss](https://github.com/scpcn01vision-oss)），库存 79 张。

## ✨ 亮点

- **字级配音同步**——`scripts/timestamps_cpu.py` 把口播稿对齐到音频
  （默认 FireRedASR2-CTC int8，备选 faster-whisper 免手动下载）。110s 中英混合口播
  对照 GPU 强制对齐器实测：字级偏差中位 20–40ms、最差 200ms、质检零误报。
  每个动效节拍都锚在确切的字上。
- **98 张动效配方卡**——每张有意图、参数、已知坑、可直接复制的自包含 Remotion tsx 源码和可跑的 HTML 预览，
  [在线画廊](https://vincentwei1021.github.io/video-talkcraft/)一页全览
  （本地 `open gallery/index.html` 同款）。动态字卡、数据镜头、证据巡游、
  六式运动承接转场、长镜头世界画布、人物合成等。
- **七层反 PPT 系统**——每场景一条极缓推进 / 拉出的相机曲线 + 让位生命周期 + 六式运动承接转场
  （2026-09-04 起做减法：不再要求主体 idle 与环境呼吸）。
  静止帧在结构上不可能出现（漏网的也会被自动检测抓住）。
- **经得住审片的排版纪律**——语义拍分镜、同屏元素预算、留白锚、枢轴句切镜规则、
  用真实检测（`scripts/face_bbox.py`）量出来的人脸安全区，不靠目测。
- **三重验收**——画面健康双判定（静止段 + 并发光栅抖动，时域缺陷机器抓）、
  纯音效轨逐 cue 能量验证、带动效锚点帧与评审拼图的独立评审。

## 🚀 快速开始

**最直接的方式：把仓库链接丢给你的 agent。**
在 Claude Code / Codex 里直接说：

```text
帮我安装这个 skill：https://github.com/Vincentwei1021/video-talkcraft
```

或用 [skills](https://skills.sh/) CLI / 手动安装：

```bash
npx skills add Vincentwei1021/video-talkcraft
```

```bash
git clone https://github.com/Vincentwei1021/video-talkcraft.git
cd video-talkcraft
ln -s "$(pwd)" ~/.claude/skills/video-talkcraft   # Claude Code
# 或
ln -s "$(pwd)" ~/.codex/skills/video-talkcraft    # Codex
```

环境（agent 会按需自行配置）：

- Node 18+（Remotion 渲染；单片工程内 `npm install`）
- Python 3.10+，时间戳管线 `pip install zhconv pypinyin sherpa-onnx soundfile numpy`
  （首次使用下载一次 767MB 的 FireRedASR2-CTC 模型，地址见
  `scripts/timestamps_cpu.py` 头注释；或加 `--backend whisper` 免手动下载）
- ffmpeg

然后这样下需求：

```text
用 video-talkcraft 把这份口播稿 + voiceover.wav 做成视频。
做一条 100 秒的 <话题> 解说，稿子和音频在这里。
```

## 🎞 你提供什么 vs. 它做什么

| 你提供（输入） | skill 负责 |
| --- | --- |
| 口播稿 | 字级时间戳对齐，逐句质检标记 |
| 成品配音——任何 TTS 或真人录音 | SHOTBOOK 分镜：语义拍、层矩阵、排版预算 |
| 可选的人物素材——普通实拍视频即可（抠像 + 人脸安全区工具已含，绿幕抠得最干净） | Remotion 实现：全局系统（极缓推拉相机/让位）、转场、音效落位 |
| 可选的 B-roll / 截图 | 渲染 + 三重验收（机器闸全过 + 一轮独立审片修完 P0/P1 即交付，可选续审累计 ≤3 轮），响度归一交付 |

## 📦 库里有什么

| 内容 | 说明 |
| --- | --- |
| 98 张动效配方卡 | 意图、能量档、参数、实现要点、已知坑——每张都配自包含 Remotion tsx 源码（`template/cards/`，复制单文件即用）+ 可跑的 HTML demo |
| 画廊 | [在线版](https://vincentwei1021.github.io/video-talkcraft/)或本地 `open gallery/index.html`——98 个预览一页自动播放，按名称/关键词搜索 |
| 动效系统 | CameraRig（极缓推拉）、让位生命周期、六式转场、长镜头世界画布；视差 / 环境层可选（`template/motion-systems/`） |
| 组件 | 素排字幕、花字、砸字、荧光笔、铅笔手绘、数字滚动（`template/components/`） |
| 管线脚本 | 字级时间戳（双 ASR 后端）、人脸安全区检测、静止检测、音效在场检查、QA 抽帧（`scripts/`） |
| 方法论 | 设计语言（Apple 范式默认）、镜头三面工作单、电影感规范、分镜格式、验收口径（`references/`） |
| 内嵌音效 | 逐卡 cue 表 + 真采样内嵌 demo 库（授权见 `demos/_lib/sfx/ATTRIBUTION.md`） |

## 🗂 目录结构

```text
video-talkcraft/
├── SKILL.md                    # agent 入口：八步管线与硬规则
├── references/
│   ├── design-language.md      # 默认视觉系统（色板/字阶/布局/字幕）
│   ├── shot-design.md          # 三面工作单 + 七型镜头预设
│   ├── cinematography.md       # 七层模型、转场、排版预算、验收关卡
│   ├── shotbook-example.md     # 完整分镜范例
│   ├── cards/                  # 98 张动效配方卡
│   ├── taxonomy.md             # 按类别与来源的卡片索引
│   ├── broll-sources.md        # 免署名素材源（API、授权坑）
│   ├── host-footage.md         # 人物素材：输入规格、抠像、人脸安全区
│   └── demo-spec.md            # 卡片/demo 编写规范
├── demos/                      # 98 个可跑的 HTML 预览（共享库内嵌音效）
├── gallery/                    # 单页本地画廊
├── template/                   # 即取即用的 Remotion 代码
│   ├── cards/                  # 98 卡逐卡自包含 tsx 源码（skill 首选引用）
│   ├── motion-systems/         # 相机/视差/让位/环境/转场/长镜头系统
│   └── components/             # 字幕/花字/砸字/铅笔等组件
└── scripts/                    # 时间戳、人脸检测、QA 工具
```

完整工作流从 [SKILL.md](SKILL.md) 进入。

## ❓ FAQ

**video-talkcraft 是什么？**
一个开源的 AI agent skill（Claude Code / Codex 技能包），用于 AI 视频制作：
把口播稿 + 成品配音自动做成带动效的口播视频。它不是剪辑软件，也不是模板站——
agent 读方法论、选动效配方卡、写 [Remotion](https://www.remotion.dev/) 代码、
跑三重验收，产出可直接发布的解说成片。

**能做哪类视频？**
知识科普、产品评测、新闻解读、观点锐评等口播/解说类横屏视频。
中文口播优先设计，中英混排完全支持。

**需要准备什么？**
口播稿（文本）+ 成品配音（任何 TTS 或真人录音）；人物出镜素材与 B-roll 可选。

**免费吗？**
个人、教育、研究用途免费（PolyForm Noncommercial 1.0.0），
用它做出的视频归你所有；工具本身的商业使用需先授权（见下）。

## 📄 许可

[PolyForm Noncommercial 1.0.0](LICENSE)——个人、教育、研究用途免费。
**将本工具用于任何商业用途需事先获得授权**——发邮件至
[vincentwei1021@gmail.com](mailto:vincentwei1021@gmail.com) 或提 GitHub issue 联系。

**用本 skill 做出的视频归你所有。** 如果它帮到了你，欢迎在视频简介里
@ 一下作者的账号——非强制，但对作者是最好的支持。

## 🔊 音频与素材说明

- 内嵌音效采样的来源与授权：[demos/_lib/sfx/ATTRIBUTION.md](demos/_lib/sfx/ATTRIBUTION.md)。
- B-roll 素材源指南只收免署名源（Pexels、Pixabay、Mixkit Free、Coverr、NASA），
  并记录了被排除源的授权陷阱——见 [references/broll-sources.md](references/broll-sources.md)。
- demo 里的主持人素材（`demos/_lib/dh-host.webm`）是 AI 生成的演示形象占位，
  生产时请替换为你自己的人物素材。

## 🙏 致谢

- **[Remotion](https://www.remotion.dev/)**——驱动全部渲染的 React 视频框架
  （注意其自身[许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)）。
- **[FireRedASR2](https://github.com/FireRedTeam/FireRedASR2S)**（经
  **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)**）与
  **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)**——时间戳后端；
  **Qwen3-ASR/ForcedAligner** 是精度基准参照。
- **OpenCV YuNet**——人脸安全区规则背后的检测器。
- **Pexels · Pixabay · NASA · Mixkit**——免署名素材来源。
- **Claude Code**——本库由 AI 编码 agent 构建、迭代与验收，用的正是 skill 自己教的那套评审循环。

## 关注作者

<p>
  <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg"><img alt="在抖音关注作者" src="https://img.shields.io/badge/%E6%8A%96%E9%9F%B3-%E5%85%B3%E6%B3%A8%E6%88%91-000000?style=for-the-badge&logo=tiktok&logoColor=white"></a>
  <a href="https://xhslink.cn/m/At9iP2d5C1V"><img alt="在小红书关注作者" src="https://img.shields.io/badge/%E5%B0%8F%E7%BA%A2%E4%B9%A6-%E5%85%B3%E6%B3%A8%E6%88%91-FF2442?style=for-the-badge&logo=xiaohongshu&logoColor=white"></a>
  <a href="https://x.com/VincentWei93"><img alt="在 X 关注作者" src="https://img.shields.io/badge/X-%E5%85%B3%E6%B3%A8%E6%88%91-000000?style=for-the-badge&logo=x&logoColor=white"></a>
</p>

## 微信讨论群

有建议、反馈或使用问题？扫码加入 video-talkcraft 内测反馈群：

<img src="assets/wechat-group.jpg" alt="video-talkcraft 微信内测反馈群二维码" width="300">

二维码过期后会不定期更新；也可通过上方社媒直接联系作者。
