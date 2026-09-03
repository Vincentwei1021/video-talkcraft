#!/usr/bin/env bash
# 测试页素材重下脚本（素材不进库，media/ 已 gitignore）。
# 视频：Mixkit **Free License**（2026-09-04 逐条核对页面授权标签；Restricted 的已排除，其 1080 直链返回 403 可作旁证）
# 图片：Lorem Picsum 稳定 ID（Unsplash 授权，免署名）。
set -euo pipefail
cd "$(dirname "$0")/media"
UA="Mozilla/5.0"
v() { # id slug res
  [ -f "v-$2.mp4" ] || curl -sL --retry 2 -A "$UA" -o "v-$2.mp4" "https://assets.mixkit.co/videos/$1/$1-$3.mp4"
}
v 1767 city     720   # city-lights-at-night-aerial-shot
v 4455 tokyo    720   # atop-the-city-of-tokyo-at-night
v 2091 ocean    720   # turquoise-ocean-background-with-foaming-waves
v 1609 clouds   720   # moonlit-clouds-in-motion-time-lapse
v 1811 typing   1080  # a-person-typing-on-a-keyboard（前景核心素材，取 1080）
v 4180 crowd    720   # commuters-at-new-yorks-grand-central-station
v 30   bokeh    720   # blurred-abstract-cars-lights-at-night-with-bokeh-effect
v 613  forest   720   # drone-view-over-trees
i() { [ -f "p-$1.jpg" ] || curl -sL --retry 2 -A "$UA" -o "p-$1.jpg" "https://picsum.photos/id/$1/1600/1000"; }
for id in 1015 1018 1036 1043 1047 1050 1057 1059 1067 1069 1074 1080 1039 1044 1053 1061; do i "$id" & done; wait
ls -la
