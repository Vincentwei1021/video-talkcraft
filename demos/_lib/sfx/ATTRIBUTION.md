# demos/_lib/sfx/ 采样来源与授权

> 本目录的原始 mp3 是库作者本地制作素材，**不随库分发**——demo 运行时用的是
> `demos/_lib/sfx-samples.js` 里的 base64 内嵌版（由这些 mp3 生成）。
> 本文件保留在库里，作为内嵌采样的来源与授权记录。

2026-08-25 从 `~/personal/video-shotcraft/assets/audio/sfx/`（Mixkit 音效库，
授权与试听记录见那边的 ATTRIBUTION.md / AUDITION-2026-07-27.md）挑选复制，
按本库 sfx.js 的音色名重命名。全部 **Mixkit Sound Effects Free License**（免署名可商用）。

预处理（复制时已做）：`silenceremove` 去头部静音（-45dB 阈）+ 峰值归一到 -3dB
+ 重编码 192k/44.1kHz MP3——cue 的 t 直接就是发声时刻，音量彼此可比。

| 本库文件 | 音色 | 源文件（video-shotcraft） | Mixkit 原名 | URL |
|---|---|---|---|---|
| whoosh.mp3 | whoosh | transition/sweep-fast-small.mp3 | Fast small sweep transition | https://assets.mixkit.co/active_storage/sfx/166/166-preview.mp3 |
| swipe.mp3 | swipe | transition/sweep-short.mp3 | Short transition sweep | https://assets.mixkit.co/active_storage/sfx/175/175-preview.mp3 |
| pop.mp3 | pop | ui/ui-popup-dry.mp3 | Dry pop up notification alert | https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3 |
| click.mp3 | click | camera/click-camera.mp3 | Camera shutter click | https://assets.mixkit.co/active_storage/sfx/1133/1133-preview.mp3 |
| tick.mp3 | tick | counter/clock-tick-single.mp3 | Clock ticker single | https://assets.mixkit.co/active_storage/sfx/1061/1061-preview.mp3 |
| slam.mp3 | slam | impact/bass-hit-short.mp3 | Short bass hit | https://assets.mixkit.co/active_storage/sfx/2299/2299-preview.mp3 |
| ding.mp3 | ding | ui/chime-crystal.mp3 | Crystal chime | https://assets.mixkit.co/active_storage/sfx/3108/3108-preview.mp3 |
| typekey-1.mp3 | typekey | text/typewriter-hit-single.mp3 | Mechanical typewriter single hit | https://assets.mixkit.co/active_storage/sfx/1382/1382-preview.mp3 |
| typekey-2.mp3 | typekey | text/typewriter-hit-soft.mp3 | Typewriter soft hit | https://assets.mixkit.co/active_storage/sfx/1366/1366-preview.mp3 |
| scratch.mp3 | scratch | text/marker-pen-line.mp3 | Pen marker line | https://assets.mixkit.co/active_storage/sfx/2998/2998-preview.mp3 |
| paper.mp3 | paper | paper/paper-move-quick.mp3 | Paper quick movement | https://assets.mixkit.co/active_storage/sfx/2380/2380-preview.mp3 |

无采样、仍走 sfx.js 合成的音色：**riser / ping / lowpad**
（riser 源库只有 4.8s 的电影 riser，对 0.4~0.8s 的 demo 蓄势太长；ping/lowpad 合成音本就干净贴合）。

typekey 是双样本（hard/soft），引擎连打时自动交替（防机枪感，源库 AUDITION 的建议用法）。

## picked/ 与配音台

`picked/` 是用 `node scripts/sfx-picker.mjs` 从源库挑出来的原始采样（不进库，来源记在
`picked/MANIFEST.md`）。`node scripts/sfx-studio.mjs <slug>` 配音台把它们列进音色库，
配到某张卡的 cue 上时**保存会自动内嵌进 sfx-samples.js**（键名 `pk:<文件名>`，
归一到 -3dB 后重编码 192k）——所以 `sfx-samples.js` 里除了下表 11 个基础音色，
还可能有 `pk:*` 键，那些的来源查 `picked/MANIFEST.md` 再回到源库 ATTRIBUTION.md。

2026-08-26 全库定音后已内嵌的 18 个 `pk:*`（cue 表里 90% 的记数都落在这些上）：

| 用途 | 采样 |
|---|---|
| 打字/终端 | text-keyboard（长采样，靠 clip 截到该段打字的长度） |
| 流式输出/进度 | data-data-load-os |
| 画线/描边/荧光笔 | text-marker-pen-line、text-pencil-write-short |
| 卡片/纸张滑动 | paper-paper-slide、paper-paper-slice-quick |
| 弹出/点亮 | ui-pop、ui-ui-click-tone |
| 计数/落定/咬合 | mech-lock-quick |
| 冲击/硬切 | impact-hit-fast-exciting、impact-impact-deep-whoosh |
| 转场/空气 | transition-transition-soft、transition-wind-swoosh-short、transition-air-whoosh-powerful、transition-sweep-scifi-fast |
| 镜头推拉 | camera-ui-zoom-in |
| 界面细声 | scifi-scifi-click、scifi-hitech-bleep |

仍走合成的只剩 **riser / ping**（蓄势与高音 ping，合成音比源库的电影 riser 更贴短动效）。

## 重新生成 sfx-samples.js

demo 从 `file://` 打开时 fetch 不到本地 mp3（CORS），所以采样以 base64 内嵌进
`demos/_lib/sfx-samples.js`。改动本目录 mp3 后重新生成：

```bash
node -e '
const fs = require("fs");
const b64 = (f) => fs.readFileSync("demos/_lib/sfx/" + f).toString("base64");
const map = { whoosh: b64("whoosh.mp3"), swipe: b64("swipe.mp3"), pop: b64("pop.mp3"),
  click: b64("click.mp3"), tick: b64("tick.mp3"), slam: b64("slam.mp3"), ding: b64("ding.mp3"),
  scratch: b64("scratch.mp3"), paper: b64("paper.mp3"),
  typekey: [b64("typekey-1.mp3"), b64("typekey-2.mp3")] };
let out = "/* 真实采样音效（base64 内嵌 MP3）—— 由 demos/_lib/sfx/*.mp3 生成。\n";
out += "   为什么内嵌：demo 从 file:// 打开时 fetch 拿不到本地 mp3（CORS），内嵌才能离线发声。\n";
out += "   来源与授权见 demos/_lib/sfx/ATTRIBUTION.md；重新生成命令也在那里。\n";
out += "   typekey 是双样本（hard/soft 交替防机枪感）；riser/ping/lowpad 无采样，走 sfx.js 合成。 */\n";
out += "window.SFX_SAMPLES = " + JSON.stringify(map) + ";\n";
fs.writeFileSync("demos/_lib/sfx-samples.js", out);
'
```
