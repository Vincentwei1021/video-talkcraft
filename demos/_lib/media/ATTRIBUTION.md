# demos/_lib/media —— 卡 demo 的示意素材（展示层，不属于任何一张卡）

只给 `demos/<slug>/index.html` 当演示画面用；卡的契约（`references/cards/<slug>.md` + `template/cards/<slug>.tsx`）不含这些文件，
成片一律经 `src` / `srcs` 注入自己的素材。全部为免署名授权，来源与实验室（demos/_lab/material-presentation，2026-09-04 采集）一致：

- **视频**（Mixkit **Free License**，可商用免署名；2026-09-04 逐条核对页面授权标签）：
  `v-ocean.webm` = Mixkit 2091 海面（截前 10s，960 宽） · `v-crowd.webm` = Mixkit 4180 车站人流（截前 8s） · `v-typing.webm` = Mixkit 1811 打字。
  原 mp4 → VP9 webm 960 宽静音（仓库 .gitignore 排除 *.mp4）。
- **图片**（Lorem Picsum 稳定 ID，Unsplash License）：`p-<id>.jpg` = `https://picsum.photos/id/<id>/1600/1000` 缩到 1200 宽，
  ID：0 24 63 160 177 180 250 274 319 349 355 366 367 392 816 823 845 866 1015 1018 1027 1036 1039 1043 1050 1053 1057 1059 1067（JPEG q≈80）。

用在哪（demo → 文件）：bed-echo-blur v-ocean ×2 · split-60-40-story v-typing · freeze-frame-annotate v-crowd ·
rack-focus-pair 367/24 · split-compare-slider 1043 · filmstrip-conveyor 1015/1036/1039/1050/1057/1018 · grid-to-hero 1018/1050/1059/1036 ·
multi-still-tour 1015/1036/1039/1059 · parallel-items-with-host 每式一组：① 63/24/250 ② 1018/1053/1067 ③ 366/180/160 ④ 823/0/816 ⑤ 1015/866/1050 ⑥ 1036/845/177 ⑦ 1067/392/274 · stack-fan-out 1015/1036/1050/1057/1018 ·
still-layout-relay 250/355/319/1027/349/823 · word-relay-filmstrip 63/24/250/366/160 · info-card-assemble 24 · line-carry-transition 180。
