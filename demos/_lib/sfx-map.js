/* 口播动效卡库 · 逐卡音效 cue 表
   键 = demo slug；值 = cue 数组 { t, name, vol?, dur?, rate?, clip?, note? }
     t    = 触发时刻（speed=1 的 demo 秒，与各 demo GSAP 时间轴对齐）
     name = _lib/sfx.js 音色名：whoosh swipe pop click tick slam riser ding
                                scratch typekey paper ping lowpad
            或 pk:<采样名> = picked/ 里的采样（配音台配的，已内嵌进 sfx-samples.js）
     clip = 只放前 N 秒（长采样配短动效时截断，末尾自动淡出）
     note = 这一记配的是哪个动作（配音台里写的备注，引擎忽略）
   改 cue 推荐用配音台：node scripts/sfx-studio.mjs <slug>（逐节点试听即时生效）。
   设计原则：音效是"确认感"不是配乐——每卡 2~6 个 cue（连发 tick/typekey 除外），
   跟动效的命门拍。改 demo 时序后要同步改这里的 t。
   由 demo-shell.js 的 rAF 派发器按 GSAP 时钟触发（暂停/慢放/重播自动同步）。 */
window.SFX_MAP = {
  "alt-block-lines": [
    {"t": 0.66, "name": "click", "vol": 0.4},
    {"t": 0.78, "name": "click", "vol": 0.36, "rate": 1.1},
  ],
  "bar-chart-growth": [
    {"t": 0.42, "name": "pk:text-marker-pen-line", "vol": 0.32, "dur": 0.24},
    {"t": 0.62, "name": "pk:mech-lock-quick", "vol": 0.34, "rate": 0.92},
    {"t": 0.68, "name": "pk:mech-lock-quick", "vol": 0.36},
    {"t": 0.74, "name": "pk:mech-lock-quick", "vol": 0.38, "rate": 1.08},
    {"t": 0.8, "name": "pk:mech-lock-quick", "vol": 0.4, "rate": 1.16},
    {"t": 0.86, "name": "pk:mech-lock-quick", "vol": 0.42, "rate": 1.24},
    {"t": 0.92, "name": "pk:mech-lock-quick", "vol": 0.44, "rate": 1.32},
    {"t": 0.98, "name": "pk:mech-lock-quick", "vol": 0.48, "rate": 1.4},
    {"t": 1.26, "name": "pk:ui-pop", "vol": 0.55, "clip": 0.2},
  ],
  "bed-echo-blur": [
    {"t": 0.0, "name": "pk:transition-air-whoosh-powerful", "vol": 0.22, "clip": 1.2, "note": "底床起（空气底噪）"},
    {"t": 0.3, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.6, "note": "前景竖卡落位"},
    {"t": 0.8, "name": "pk:ui-ui-click-tone", "vol": 0.3, "note": "标题第一行升入"},
  ],
  "behind-text-title": [
    {"t": 0.4, "name": "pk:impact-impact-deep-whoosh", "vol": 0.6, "dur": 0.55, "clip": 0.9},
  ],
  "black-slam-transition": [
    {"t": 0.46, "name": "riser", "vol": 0.5, "dur": 0.46},
  ],
  "callout-line-label": [
    {"t": 0.6, "name": "ping", "vol": 0.55},
    {"t": 0.8, "name": "pk:text-marker-pen-line", "vol": 0.45},
    {"t": 1.2, "name": "pk:impact-hit-fast-exciting", "vol": 0.45, "clip": 0.9},
    {"t": 1.4, "name": "ping", "vol": 0.55, "rate": 1.12},
    {"t": 1.6, "name": "pk:text-marker-pen-line", "vol": 0.45, "rate": 1.1},
    {"t": 2, "name": "pk:impact-hit-fast-exciting", "vol": 0.45, "rate": 1.08, "clip": 0.9},
  ],
  "chapter-progress-list": [
    {"t": 0.41, "name": "pk:ui-ui-click-tone", "vol": 0.4},
    {"t": 0.51, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.06},
    {"t": 0.61, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.12},
    {"t": 0.71, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.18},
  ],
  "chapter-title-card": [
    {"t": 0.5, "name": "pk:paper-paper-slide", "vol": 0.65, "dur": 0.34},
    {"t": 2.75, "name": "pk:paper-paper-slide", "vol": 0.55, "dur": 0.34, "rate": 1.15, "clip": 0.9},
    {"t": 3.75, "name": "pk:paper-paper-slide", "vol": 0.65, "dur": 0.34},
    {"t": 6, "name": "pk:paper-paper-slide", "vol": 0.55, "dur": 0.34, "rate": 1.15},
  ],
  "chart-grow": [
    {"t": 0.52, "name": "pk:mech-lock-quick", "vol": 0.45},
    {"t": 0.66, "name": "pk:mech-lock-quick", "vol": 0.45, "rate": 1.08},
    {"t": 0.8, "name": "pk:mech-lock-quick", "vol": 0.5, "rate": 1.17},
    {"t": 0.96, "name": "pk:mech-lock-quick", "vol": 0.5, "rate": 1.26},
    {"t": 1.14, "name": "pk:mech-lock-quick", "vol": 0.6, "rate": 1.35},
  ],
  "chevron-lower-third": [
    {"t": 0.4, "name": "pk:scifi-scifi-click", "vol": 0.2, "clip": 0.9},
  ],
  "color-slam-beat-card": [
    {"t": 0.9, "name": "pk:impact-hit-fast-exciting", "vol": 0.5, "clip": 0.9, "note": "硬切蓝"},
    {"t": 1.35, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.9, "note": "素材卡升入"},
    {"t": 3.97, "name": "pk:impact-hit-fast-exciting", "vol": 0.5, "rate": 1.08, "clip": 0.9, "note": "硬切红"},
    {"t": 4.42, "name": "pk:paper-paper-slide", "vol": 0.4, "rate": 1.06, "clip": 0.9, "note": "素材卡升入"},
  ],
  "converging-arrows": [
    {"t": 0.42, "name": "pk:text-marker-pen-line", "vol": 0.4, "clip": 0.45, "note": "箭杆1"},
    {"t": 0.48, "name": "pk:text-marker-pen-line", "vol": 0.34, "rate": 1.12, "clip": 0.45, "note": "箭杆2"},
    {"t": 0.85, "name": "pk:ui-pop", "vol": 0.5, "note": "关键词变橙"},
  ],
  "corner-bracket-frame": [
    {"t": 0.4, "name": "pk:camera-ui-zoom-in", "vol": 0.34, "clip": 0.5, "note": "角框咬合"},
    {"t": 0.72, "name": "pk:camera-camera-lens-shutter", "vol": 0.22, "rate": 1.08, "note": "行2淡入"},
  ],
  "count-badge-title": [
    {"t": 0.63, "name": "pk:ui-pop", "vol": 0.45, "clip": 0.9, "note": "数字落定变紫"},
  ],
  "cursor-actor-demo": [
    {"t": 1.19, "name": "pk:ui-ui-click-tone", "vol": 0.5, "note": "点开关1"},
    {"t": 1.93, "name": "pk:ui-ui-click-tone", "vol": 0.5, "rate": 1.06, "note": "点开关2"},
    {"t": 2.95, "name": "paper", "vol": 0.34, "note": "抓起缩略图"},
    {"t": 3.13, "name": "pk:transition-transition-soft", "vol": 0.24, "clip": 0.6, "note": "拖移"},
    {"t": 3.75, "name": "pk:ui-pop", "vol": 0.5, "note": "落入插槽"},
  ],
  "danmu-bubble-praise": [
    {"t": 0.4, "name": "pk:ui-pop", "vol": 0.42, "note": "弹幕1"},
    {"t": 0.95, "name": "pk:ui-pop", "vol": 0.55, "rate": 1.14, "note": "弹幕2"},
    {"t": 1.5, "name": "pk:ui-pop", "vol": 0.42, "rate": 0.92, "note": "弹幕3"},
    {"t": 2.05, "name": "pk:ui-pop", "vol": 0.42, "rate": 1.06, "note": "弹幕4"},
  ],
  "evidence-scroll-tour": [
    {"t": 0.6, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.9, "note": "长页起滚"},
    {"t": 5.18, "name": "pk:ui-pop", "vol": 0.38, "rate": 0.94, "note": "红框停定"},
    {"t": 6.68, "name": "pk:paper-paper-slide", "vol": 0.34, "rate": 1.08, "clip": 0.9, "note": "再起滚"},
  ],
  "filmstrip-conveyor": [
    /* 传送带匀速不配声（持续运动不是命门）；只跟减速停靠 / 重新加速两处拍；标题入场一记极轻 */
    {"t": 0.05, "name": "pk:ui-pop", "vol": 0.3, "note": "标题在场"},
    {"t": 2.14, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 0.95, "clip": 1.0, "note": "减速起点（第四格将居中）"},
    {"t": 2.64, "name": "pk:mech-lock-quick", "vol": 0.36, "clip": 0.5, "note": "减速结束、第四格正对中线（慢速停靠开始）"},
    {"t": 4.04, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "rate": 0.9, "clip": 0.6, "note": "重新加速回匀速"},
  ],
  "focus-dim-spotlight": [
    {"t": 0.45, "name": "ping", "vol": 0.45, "note": "压暗+亮环"},
    {"t": 2, "name": "pk:ui-ui-click-tone", "vol": 0.3, "note": "焦点跳行2"},
    {"t": 3.2, "name": "pk:ui-ui-click-tone", "vol": 0.3, "rate": 1.06, "note": "跳行3"},
    {"t": 4.4, "name": "pk:ui-ui-click-tone", "vol": 0.3, "rate": 1.12, "note": "跳行4"},
    {"t": 5.6, "name": "pk:transition-air-whoosh-powerful", "vol": 0.34, "clip": 0.9, "note": "通道切换撑开"},
  ],
  "grid-to-hero": [
    {"t": 0.3, "name": "pk:ui-pop", "vol": 0.4, "note": "四格错峰落位（一记盖住）"},
    {"t": 2.41, "name": "pk:camera-ui-zoom-in", "vol": 0.4, "note": "重排：主图长大、其余收成一列"},
    {"t": 3.21, "name": "pk:mech-lock-quick", "vol": 0.3, "note": "主图落定咬合"},
    {"t": 5.21, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "note": "回到网格"},
  ],
  "hand-drawn-ellipse": [
    {"t": 0.42, "name": "pk:text-marker-pen-line", "vol": 0.45, "clip": 0.5, "note": "手绘圈画出"},
  ],
  "highlighter-sweep": [
    {"t": 0.7, "name": "pk:text-marker-pen-line", "vol": 0.45, "clip": 0.6, "note": "荧光笔扫过"},
  ],
  "host-shrink-to-chip": [
    {"t": 0.8, "name": "pk:camera-ui-zoom-in", "vol": 0.4, "note": "人物缩位"},
    {"t": 0.95, "name": "pk:paper-paper-slide", "vol": 0.42, "clip": 0.9, "note": "图形卡滑入"},
  ],
  "impact-open-title": [
    {"t": 0.4, "name": "pk:impact-impact-deep-whoosh", "vol": 0.6, "clip": 0.9, "note": "标题冲击入场"},
    {"t": 0.7, "name": "pk:impact-hit-fast-exciting", "vol": 0.4, "rate": 1.1, "clip": 0.9, "note": "重点变橙"},
  ],
  "info-term-card": [
    {"t": 0.05, "name": "pk:ui-pop", "vol": 0.45, "clip": 0.9, "note": "卡滑入"},
  ],
  "keyword-pop-highlight": [
    {"t": 0.55, "name": "pk:transition-wind-swoosh-short", "vol": 0.5, "clip": 0.9, "note": "关键词弹出+镜头震"},
  ],
  "line-chart-story-draw": [
    {"t": 0.6, "name": "pk:ui-pop", "vol": 0.5, "note": "红点弹出"},
    {"t": 1.2, "name": "pk:text-marker-pen-line", "vol": 0.38, "clip": 0.6, "note": "段1描画"},
    {"t": 1.8, "name": "ping", "vol": 0.45, "note": "▲5%标签"},
    {"t": 2.15, "name": "pk:text-marker-pen-line", "vol": 0.34, "rate": 1.06, "clip": 0.6, "note": "段2描画"},
    {"t": 3.15, "name": "pk:text-marker-pen-line", "vol": 0.36, "rate": 0.94, "clip": 0.7, "note": "虚线推演"},
    {"t": 3.85, "name": "ping", "vol": 0.45, "rate": 1.1, "note": "涨幅×2标签"},
  ],
  "long-take-world": [
    {"t": 1.11, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "rate": 0.9, "clip": 1.2, "note": "起飞去B"},
    {"t": 3.81, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "rate": 0.85, "clip": 1.2, "note": "起飞去C"},
  ],
  "lower-third-nameplate": [
    {"t": 0.4, "name": "pk:scifi-scifi-click", "vol": 0.2, "clip": 0.9, "note": "墨条扫开"},
  ],
  "magnifier-detail": [
    {"t": 0.45, "name": "pk:camera-ui-zoom-in", "vol": 0.45, "note": "放大镜弹出飞出"},
    {"t": 0.7, "name": "pk:text-marker-pen-line", "vol": 0.3, "clip": 0.35, "note": "引线描画"},
  ],
  "map-route-pin": [
    {"t": 0.4, "name": "pk:impact-hit-fast-exciting", "vol": 0.45, "clip": 0.9, "note": "图钉1砸落"},
    {"t": 0.85, "name": "pk:text-marker-pen-line", "vol": 0.3, "clip": 1, "note": "航线1描画"},
    {"t": 2.2, "name": "pk:impact-hit-fast-exciting", "vol": 0.45, "rate": 1.06, "clip": 0.9, "note": "图钉2砸落"},
    {"t": 2.95, "name": "pk:text-marker-pen-line", "vol": 0.3, "rate": 1.05, "clip": 1, "note": "航线2描画"},
    {"t": 4.3, "name": "pk:impact-hit-fast-exciting", "vol": 0.5, "rate": 1.1, "clip": 0.9, "note": "图钉3砸落"},
  ],
  "media-pop-in": [
    {"t": 0.45, "name": "pk:ui-pop", "vol": 0.5, "note": "素材1"},
    {"t": 0.6, "name": "pk:ui-pop", "vol": 0.5, "rate": 1.1, "note": "素材2"},
    {"t": 0.75, "name": "pk:ui-pop", "vol": 0.5, "rate": 0.92, "note": "素材3"},
  ],
  "metric-with-sparkline": [
    {"t": 0.5, "name": "pk:scifi-scifi-click", "vol": 0.3, "rate": 0.9, "clip": 2.5, "note": "计数"},
  ],
  "motion-blur-slam-in": [
    {"t": 0.4, "name": "pk:transition-wind-swoosh-short", "vol": 0.34, "clip": 0.5, "note": "卡A甩出"},
    {"t": 0.6, "name": "pk:impact-hit-fast-exciting", "vol": 0.5, "clip": 0.9, "note": "卡A急停"},
    {"t": 0.8, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "rate": 1.1, "clip": 0.5, "note": "卡B甩出"},
    {"t": 1, "name": "pk:impact-hit-fast-exciting", "vol": 0.45, "rate": 1.08, "clip": 0.9, "note": "卡B急停"},
  ],
  "multi-still-tour": [
    /* 运镜卡：每段相机起步一记停靠 tick（stage-keyframe-tour 纪律，hold 段绝对不配）；拉回 / 拉开配一记压低的空气声。
       两式巡演，timeline 式的 t = 8.2 + 式内秒；成片一镜只用一式 → 抄对应那几记（timeline 记数减 8.2） */
    {"t": 0.8, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 1.05, "clip": 1.0, "note": "wall 推到第一张"},
    {"t": 2.7, "name": "pk:counter-clock-tick-single", "vol": 0.4, "clip": 1.0, "note": "wall 推到第二张"},
    {"t": 4.6, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 0.95, "clip": 1.0, "note": "wall 推到第三张"},
    {"t": 6.5, "name": "pk:transition-air-whoosh-powerful", "vol": 0.26, "rate": 0.9, "clip": 1.2, "note": "wall 拉回全景"},
    {"t": 9.6, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 1.05, "clip": 0.9, "note": "timeline 横移到第二站（式内 1.4）"},
    {"t": 11.5, "name": "pk:counter-clock-tick-single", "vol": 0.4, "clip": 0.9, "note": "timeline 横移到第三站（式内 3.3）"},
    {"t": 13.4, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 0.95, "clip": 0.9, "note": "timeline 横移到第四站（式内 5.2）"},
    {"t": 15.3, "name": "pk:transition-air-whoosh-powerful", "vol": 0.26, "rate": 0.9, "clip": 1.1, "note": "timeline 拉开看全条（式内 7.1）"},
  ],
  "news-card-desk": [
    {"t": 0.1, "name": "pk:paper-paper-slide", "vol": 0.5, "clip": 0.9, "note": "卡A铺上"},
    {"t": 1, "name": "pk:text-marker-pen-line", "vol": 0.45, "clip": 0.4, "note": "划重点"},
    {"t": 1.9, "name": "pk:paper-paper-slide", "vol": 0.45, "rate": 1.1, "clip": 0.9, "note": "卡B滑入"},
  ],
  "number-counter": [
    {"t": 0.3, "name": "pk:data-data-load-os", "vol": 0.34, "rate": 0.9, "clip": 2, "note": "计数"},
  ],
  // 运镜类（5 卡）：纯相机运动，音效极克制——只在"镜头起步/姿态到位"各一记，
  // 且都压在 vol 0.3 以下当空气声。运镜本身没有"事件"，多配一记就变成音效在演戏。
  "number-slab-pop": [
    {"t": 0.54, "name": "pk:ui-pop", "vol": 0.55, "note": "数字弹出"},
  ],
  "numbered-step-stack": [
    {"t": 0.64, "name": "pk:mech-lock-quick", "vol": 0.4, "note": "步骤1堆入"},
    {"t": 0.75, "name": "pk:mech-lock-quick", "vol": 0.4, "rate": 1.06, "note": "步骤2"},
    {"t": 0.86, "name": "pk:mech-lock-quick", "vol": 0.4, "rate": 1.12, "note": "步骤3"},
    {"t": 0.97, "name": "pk:mech-lock-quick", "vol": 0.44, "rate": 1.18, "note": "步骤4"},
  ],
  "orbit-drift": [

  ],
  "outline-box-title": [
    {"t": 0.4, "name": "pk:text-marker-pen-line", "vol": 0.4, "clip": 0.45, "note": "描边框画出"},
    {"t": 0.86, "name": "pk:paper-paper-slice-quick", "vol": 0.36, "note": "紫块展开"},
  ],
  "overexpose-flip-transition": [
    {"t": 0.85, "name": "riser", "vol": 0.5, "dur": 0.4, "note": "过曝前蓄势"},
  ],
  "particle-weld-transition": [
    {"t": 0.8, "name": "pk:transition-sweep-scifi-fast", "vol": 0.34, "clip": 0.6, "note": "粒子炸开"},
  ],
  "parallel-items-with-host": [
    /* 七式巡演，每式一镜三记（成片一镜只用一式 → 抄对应那三记；卡内相对秒 = 下列 t − 该式起点 k×3.1） */
    {"t": 0.4, "name": "pk:ui-pop", "vol": 0.5, "note": "① 卡1"},
    {"t": 1.0, "name": "pk:ui-pop", "vol": 0.5, "rate": 1.08, "note": "① 卡2"},
    {"t": 1.6, "name": "pk:ui-pop", "vol": 0.5, "rate": 0.94, "note": "① 卡3"},
    {"t": 3.5, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "② 第一条回彩"},
    {"t": 4.1, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.06, "note": "② 第二条回彩"},
    {"t": 4.7, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.12, "note": "② 第三条回彩"},
    {"t": 6.6, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.5, "note": "③ 卡1 滑入"},
    {"t": 7.2, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.5, "rate": 1.05, "note": "③ 卡2 滑入"},
    {"t": 7.8, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.5, "rate": 0.96, "note": "③ 卡3 滑入"},
    {"t": 9.7, "name": "pk:paper-paper-slide", "vol": 0.42, "clip": 0.6, "note": "④ 第一张压上"},
    {"t": 10.3, "name": "pk:paper-paper-slide", "vol": 0.42, "clip": 0.6, "rate": 1.05, "note": "④ 第二张压上"},
    {"t": 10.9, "name": "pk:paper-paper-slide", "vol": 0.42, "clip": 0.6, "rate": 1.1, "note": "④ 第三张压上"},
    {"t": 12.8, "name": "pk:text-marker-pen-line", "vol": 0.35, "dur": 0.3, "note": "⑤ 第一条擦入"},
    {"t": 13.4, "name": "pk:text-marker-pen-line", "vol": 0.35, "dur": 0.3, "rate": 1.05, "note": "⑤ 第二条擦入"},
    {"t": 14.0, "name": "pk:text-marker-pen-line", "vol": 0.35, "dur": 0.3, "rate": 1.1, "note": "⑤ 第三条擦入"},
    {"t": 15.9, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "clip": 0.5, "note": "⑥ 第一条斜带滑入"},
    {"t": 16.5, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "clip": 0.5, "rate": 1.06, "note": "⑥ 第二条斜带滑入"},
    {"t": 17.1, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "clip": 0.5, "rate": 1.12, "note": "⑥ 第三条斜带滑入"},
    {"t": 19.0, "name": "pk:transition-wind-swoosh-short", "vol": 0.28, "clip": 0.6, "rate": 0.9, "note": "⑦ 背景换第一张"},
    {"t": 19.75, "name": "pk:transition-wind-swoosh-short", "vol": 0.28, "clip": 0.6, "rate": 0.95, "note": "⑦ 背景换第二张"},
    {"t": 20.5, "name": "pk:transition-wind-swoosh-short", "vol": 0.28, "clip": 0.6, "note": "⑦ 背景换第三张"},
  ],
  "pencil-sketch-draw": [
    {"t": 0.3, "name": "pk:text-pencil-write-short", "vol": 0.45, "clip": 0.9, "note": "铅笔描1"},
    {"t": 1.65, "name": "pk:text-pencil-write-short", "vol": 0.45, "rate": 0.95, "clip": 0.9, "note": "铅笔描2"},
    {"t": 3.2, "name": "pk:text-pencil-write-short", "vol": 0.42, "rate": 1.08, "clip": 0.45, "note": "铅笔描3"},
  ],
  "pip-zoom-box": [
    {"t": 0.4, "name": "click", "vol": 0.4, "note": "取景框弹上脸"},
    {"t": 0.75, "name": "pk:camera-ui-zoom-in", "vol": 0.4, "clip": 0.55, "note": "推拉放大"},
    {"t": 1.25, "name": "pk:mech-lock-quick", "vol": 0.38, "clip": 0.5, "note": "停靠锁定"},
  ],
  "pullback-cool-transition": [
    {"t": 1.25, "name": "pk:camera-click-camera", "vol": 0.36, "clip": 1, "note": "长溶解后拉"},
  ],
  "push-through-transition": [
    {"t": 0.8, "name": "pk:transition-wind-swoosh-short", "vol": 0.5, "dur": 0.55, "note": "加速推穿蓄势"},
  ],
  "quote-bracket-pull": [
    {"t": 0.35, "name": "pk:mech-lock-quick", "vol": 0.34, "clip": 0.6, "note": "引号夹入"},
    {"t": 1.09, "name": "pk:text-marker-pen-line", "vol": 0.42, "clip": 0.4, "note": "荧光笔扫过"},
  ],
  "quote-card": [
    {"t": 0.35, "name": "pk:ui-pop", "vol": 0.34, "rate": 1.06, "note": "行1"},
  ],
  "quote-hold-arrow": [
    {"t": 0.4, "name": "pk:ui-pop", "vol": 0.24, "note": "行1"},
    {"t": 1.26, "name": "pk:text-marker-pen-line", "vol": 0.42, "clip": 0.35, "note": "高亮框展开"},
  ],
  "rack-focus-pair": [
    {"t": 0.2, "name": "pk:paper-paper-slide", "vol": 0.35, "clip": 0.6, "note": "两张入场"},
    {"t": 2.0, "name": "pk:camera-ui-zoom-in", "vol": 0.4, "clip": 0.7, "note": "焦点交给后张"},
    {"t": 4.6, "name": "pk:camera-ui-zoom-in", "vol": 0.4, "rate": 0.94, "clip": 0.7, "note": "焦点交回前张"},
  ],
  "scribble-annotation": [
    {"t": 0.5, "name": "pk:text-marker-pen-line", "vol": 0.45, "clip": 0.55, "note": "圈注1"},
    {"t": 1.6, "name": "pk:text-marker-pen-line", "vol": 0.42, "rate": 1.12, "clip": 0.4, "note": "圈注2"},
    {"t": 2.55, "name": "pk:text-marker-pen-line", "vol": 0.4, "rate": 0.92, "clip": 0.35, "note": "箭头"},
  ],
  "shape-wipe-transition": [
    {"t": 0.9, "name": "pk:transition-wind-swoosh-short", "vol": 0.42, "clip": 0.6, "note": "色块扫过"},
  ],
  "slab-punch-title": [
    {"t": 0.65, "name": "pk:paper-paper-slice-quick", "vol": 0.4, "note": "红块中心展开"},
    {"t": 0.87, "name": "pk:camera-camera-lens-shutter", "vol": 0.5, "clip": 0.9, "note": "白字硬切+punch"},
  ],
  "slow-pull-reveal": [

  ],
  "slow-push-in": [

  ],
  "speed-slab-title": [
    {"t": 0.66, "name": "pk:transition-wind-swoosh-short", "vol": 0.45, "clip": 0.45, "note": "紫块飞入"},
  ],
  "split-60-40-story": [
    {"t": 0.3, "name": "pk:ui-ui-click-tone", "vol": 0.3, "note": "标题升入"},
    {"t": 1.0, "name": "pk:ui-pop", "vol": 0.45, "note": "chip①"},
    {"t": 1.6, "name": "pk:ui-pop", "vol": 0.45, "rate": 1.08, "note": "chip②"},
    {"t": 2.2, "name": "pk:ui-pop", "vol": 0.45, "rate": 0.94, "note": "chip③"},
  ],
  "split-compare-slider": [
    /* 分割线每次"动起来"一记纸滑（clip 盖住滑动段），停靠不配；两图极慢推与标签亮起不配 */
    {"t": 0.6, "name": "pk:paper-paper-slide", "vol": 0.42, "clip": 1.4, "note": "分割线从右端滑到中线"},
    {"t": 3.5, "name": "pk:ui-ui-click-tone", "vol": 0.3, "rate": 1.08, "clip": 0.4, "note": "nudge 到 42%（看右边）"},
    {"t": 4.5, "name": "pk:paper-paper-slide", "vol": 0.4, "rate": 0.96, "clip": 1.0, "note": "滑到近端几乎全露右图"},
    {"t": 7.0, "name": "pk:paper-paper-slide", "vol": 0.36, "rate": 1.04, "clip": 1.0, "note": "回中线"},
  ],
  "stack-fan-out": [
    {"t": 0.2, "name": "pk:paper-paper-slide", "vol": 0.35, "clip": 0.4, "note": "卡堆现身"},
    {"t": 1.0, "name": "pk:transition-wind-swoosh-short", "vol": 0.4, "note": "扇开"},
    {"t": 2.5, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.6, "note": "铺平成一行"},
    {"t": 3.1, "name": "pk:mech-lock-quick", "vol": 0.3, "note": "铺平落定"},
  ],
  "step-timeline-vertical": [
    {"t": 0.52, "name": "pk:mech-lock-quick", "vol": 0.34, "clip": 0.5, "note": "节点1"},
    {"t": 0.7, "name": "pk:mech-lock-quick", "vol": 0.36, "rate": 1.08, "clip": 0.5, "note": "节点2"},
    {"t": 0.88, "name": "pk:mech-lock-quick", "vol": 0.38, "rate": 1.16, "clip": 0.5, "note": "节点3"},
  ],
  "still-layout-relay": [
    /* 两式巡演，每式四记（成片一镜只用一式 → 抄对应那四记；② 的卡内相对秒 = 下列 t − 8.08） */
    {"t": 0.3, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.5, "note": "① 主图落"},
    {"t": 0.8, "name": "pk:paper-paper-slide", "vol": 0.35, "clip": 0.5, "rate": 1.06, "note": "① 两佐证滑入（一记盖两张）"},
    {"t": 2.4, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "① 亮佐证 1"},
    {"t": 4.2, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.06, "note": "① 亮佐证 2"},
    {"t": 8.38, "name": "pk:paper-paper-slide", "vol": 0.4, "clip": 0.5, "note": "② 三张滑入（一记盖三张）"},
    {"t": 9.48, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "② 亮左"},
    {"t": 10.88, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.06, "note": "② 亮中"},
    {"t": 12.28, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.12, "note": "② 亮右"},
  ],
  "subscribe-cta": [
    {"t": 1.4, "name": "pk:ui-ui-click-tone", "vol": 0.5, "note": "点订阅"},
    {"t": 4.75, "name": "pk:ui-ui-click-tone", "vol": 0.45, "rate": 0.94, "note": "长按点赞"},
    {"t": 4.8, "name": "pk:data-data-load-os", "vol": 0.3, "rate": 1.3, "clip": 0.55, "note": "进度环走满"},
    {"t": 5.35, "name": "pk:ui-pop", "vol": 0.45, "note": "三连点亮1"},
    {"t": 5.55, "name": "pk:ui-pop", "vol": 0.45, "rate": 1.1, "note": "点亮2"},
    {"t": 5.75, "name": "pk:ui-pop", "vol": 0.5, "rate": 1.2, "note": "点亮3"},
    {"t": 8.4, "name": "pk:ui-ui-click-tone", "vol": 0.5, "rate": 1.05, "note": "点关注"},
  ],
  "sway-parallax": [

  ],
  "tilt-3d-page": [

  ],
  "type-contrast-emphasis": [
    {"t": 1.17, "name": "pk:ui-pop", "vol": 0.45, "rate": 0.92, "note": "重音流量"},
    {"t": 1.67, "name": "pk:ui-pop", "vol": 0.5, "note": "重音信任"},
  ],
  "typewriter-reveal": [
    {"t": 0.455, "name": "pk:text-keyboard", "vol": 0.3, "clip": 0.8, "note": "打字第一段"},
    {"t": 3.205, "name": "pk:text-keyboard", "vol": 0.22, "rate": 1.05, "clip": 0.9, "note": "打字第二段"},
  ],
  "ui-prop-theater": [
    {"t": 1.66, "name": "pk:text-typewriter-hit-soft", "vol": 0.28, "clip": 0.4, "note": "清单1打勾"},
    {"t": 2.51, "name": "pk:text-typewriter-hit-soft", "vol": 0.28, "rate": 1.06, "clip": 0.4, "note": "清单2打勾"},
    {"t": 4.71, "name": "pk:ui-pop", "vol": 0.5, "note": "大对勾弹出"},
  ],
  "whip-pan-transition": [
    {"t": 0.8, "name": "pk:transition-wind-swoosh-short", "vol": 0.5, "clip": 0.9, "note": "横甩"},
  ],
  "chat-message-flow": [
    {"t": 0.4, "name": "pk:text-keyboard", "vol": 0.26, "clip": 1},
    {"t": 1.87, "name": "pk:ui-pop", "vol": 0.34, "rate": 1.06},
    {"t": 4.26, "name": "pk:ui-pop", "vol": 0.5},
    {"t": 6.71, "name": "pk:ui-pop", "vol": 0.5, "rate": 1.06},
    {"t": 7.45, "name": "pk:ui-ui-click-tone", "vol": 0.45, "rate": 1.3},
  ],
  "terminal-typing-log": [
    {"t": 0.32, "name": "pk:text-keyboard", "vol": 0.32, "clip": 0.55, "note": "敲命令1"},
    {"t": 1.042, "name": "pk:data-data-load-os", "vol": 0.28, "rate": 1.2, "note": "输出流1"},
    {"t": 3.635, "name": "pk:text-keyboard", "vol": 0.32, "rate": 1.02, "clip": 0.5, "note": "敲命令2"},
    {"t": 4.269, "name": "pk:data-data-load-os", "vol": 0.28, "rate": 1.25, "note": "输出流2"},
  ],
  "ui-flow-theater": [
    {"t": 0.6, "name": "pk:data-data-load-os", "vol": 0.24, "clip": 0.6, "note": "面板揭示"},
    {"t": 2.1, "name": "pk:mech-lock-quick", "vol": 0.5, "note": "点开关"},
    {"t": 3.1, "name": "pk:mech-lock-quick", "vol": 0.5, "rate": 1.06, "note": "点分段控件"},
    {"t": 4.05, "name": "pk:counter-clock-tick-single", "vol": 0.45, "rate": 0.94, "note": "按住滑块"},
    {"t": 5.9, "name": "pk:ui-ui-click-tone", "vol": 0.55, "rate": 0.96, "note": "点保存"},
    {"t": 6.02, "name": "pk:ui-pop", "vol": 0.45, "note": "成功对勾"},
  ],
  "caret-wipe-transition": [

  ],
  "cursor-locked-zoom": [
    {"t": 0.45, "name": "pk:text-keyboard", "vol": 0.3, "rate": 0.98, "clip": 3.3, "note": "打字全段"},
    {"t": 4.6, "name": "pk:transition-air-whoosh-powerful", "vol": 0.26, "rate": 0.9, "clip": 0.8, "note": "镜头拉回"},
  ],
  "stage-keyframe-tour": [
    {"t": 0.9, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 1.05, "clip": 1, "note": "推进Hero"},
    {"t": 2.8, "name": "pk:counter-clock-tick-single", "vol": 0.4, "clip": 1.1, "note": "飞到数据带"},
    {"t": 4.9, "name": "pk:counter-clock-tick-single", "vol": 0.4, "rate": 0.95, "clip": 1.15, "note": "飞到价格卡"},
  ],
  "strike-and-replace": [
    {"t": 0.35, "name": "pk:paper-paper-slice-quick", "vol": 0.5, "note": "红线划过"},
    {"t": 0.6, "name": "pk:ui-pop", "vol": 0.44, "rate": 1.08, "note": "换成1M"},
  ],
  "chat-gpt": [
    {"t": 1.518, "name": "pk:text-keyboard", "vol": 0.3, "clip": 1.2},
    {"t": 3.2, "name": "click", "vol": 0.34, "rate": 1.2},
    {"t": 4, "name": "pk:data-data-load-os", "vol": 0.36, "rate": 1.28, "clip": 1.2},
  ],
  "claude-code": [
    {"t": 1.691, "name": "pk:text-keyboard", "vol": 0.32, "rate": 0.96, "clip": 2},
    {"t": 4.36, "name": "pk:data-data-load-os", "vol": 0.3, "rate": 1.25, "clip": 2.5},
  ],
  // 源码原始视觉重做后代码是 10 行（含 1 空行）⇒ 9 个停靠点、8 次跳行。
  // 时刻：pushAt 1.40 / 跳行 2.27 + k×0.58（dwell .32 + stepDur .26）/ 拉回 6.89。
  "glass-code-walk": [
    {"t": 0.06, "name": "pk:mech-lock-quick", "vol": 0.34, "clip": 0.6, "note": "玻璃块弹入"},
    {"t": 1.4, "name": "pk:camera-ui-zoom-in", "vol": 0.3, "clip": 0.5, "note": "推进阅读焦距"},
    {"t": 6.89, "name": "pk:transition-air-whoosh-powerful", "vol": 0.26, "rate": 0.88, "clip": 0.9, "note": "拉回全貌"},
  ],
  "gooey-morph": [
    {"t": 1, "name": "pk:mech-lock-quick", "vol": 0.34, "clip": 0.45, "note": "图2咬到位（最先）"},
    {"t": 1.133, "name": "pk:mech-lock-quick", "vol": 0.34, "rate": 1.08, "clip": 0.45, "note": "图3咬到位"},
    {"t": 1.267, "name": "pk:mech-lock-quick", "vol": 0.36, "rate": 1.16, "clip": 0.45, "note": "图1咬到位"},
    {"t": 1.433, "name": "pk:mech-lock-quick", "vol": 0.4, "rate": 1.24, "clip": 0.45, "note": "图4咬到位（收尾）"},
  ],
  "ink-underline": [
    {"t": 0.55, "name": "pk:text-marker-pen-line", "vol": 0.42, "clip": 0.5, "note": "墨迹划1"},
    {"t": 1.8, "name": "pk:text-marker-pen-line", "vol": 0.4, "rate": 1.08, "clip": 0.45, "note": "墨迹划2"},
  ],
  "line-by-line-slide": [
    {"t": 0.3, "name": "pk:transition-wind-swoosh-short", "vol": 0.36, "note": "行1滑入"},
    {"t": 0.433, "name": "pk:transition-wind-swoosh-short", "vol": 0.36, "rate": 1.08, "note": "行2"},
    {"t": 0.567, "name": "pk:transition-wind-swoosh-short", "vol": 0.36, "rate": 1.16, "note": "行3"},
  ],
  "logo-enter": [
    {"t": 0.35, "name": "pk:mech-lock-quick", "vol": 0.55, "rate": 0.94, "note": "Logo弹入"},
  ],
  "per-character-rise": [
    {"t": 0.3, "name": "pk:transition-transition-soft", "vol": 0.26, "note": "字1"},
  ],
  "soft-blur-in": [
    {"t": 0.28, "name": "riser", "vol": 0.34, "clip": 0.9, "note": "柔焦淡入"},
  ],
  "tracking-in": [
    {"t": 0.3, "name": "pk:transition-transition-soft", "vol": 0.4, "rate": 1.05, "clip": 0.9, "note": "字距收拢"},
  ],
  "x-follow-card": [
    {"t": 0.05, "name": "pk:ui-pop", "vol": 0.5, "rate": 0.94, "note": "卡弹入"},
    {"t": 2.68, "name": "pk:mech-lock-quick", "vol": 0.3, "clip": 0.4, "note": "粉丝数滚动"},
  ],
  "douyin-follow-card": [
    {"t": 0.05, "name": "pk:ui-pop", "vol": 0.5, "rate": 0.94, "note": "卡弹入"},
    {"t": 0.34, "name": "paper", "vol": 0.26, "rate": 1.12, "note": "内容错峰铺底"},
    {"t": 2.58, "name": "click", "vol": 0.55, "note": "点击关注"},
  ],
  "scanline-annotate": [
    {"t": 0.5, "name": "pk:data-data-load-os", "vol": 0.3, "clip": 2.4, "note": "扫描线匀速掠过"},
    {"t": 1.22, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "取景框 1 收拢"},
    {"t": 2.09, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "取景框 2 收拢"},
    {"t": 2.41, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "取景框 3 收拢"},
    {"t": 2.68, "name": "pk:ui-ui-click-tone", "vol": 0.4, "note": "取景框 4 收拢"},
    {"t": 3.1, "name": "pk:mech-lock-quick", "vol": 0.4, "note": "分析完成"},
  ],
  "crash-zoom-punch": [
    {"t": 1.0, "name": "pk:camera-ui-zoom-in", "vol": 0.5, "clip": 0.5, "note": "6 帧急推"},
    {"t": 1.2, "name": "pk:mech-lock-quick", "vol": 0.35, "note": "回收落定"},
  ],
  "freeze-frame-annotate": [
    {"t": 1.3, "name": "pk:camera-camera-lens-shutter", "vol": 0.45, "note": "定格快门"},
    {"t": 1.57, "name": "pk:text-marker-pen-line", "vol": 0.45, "clip": 0.35, "note": "椭圆描边"},
    {"t": 1.84, "name": "pk:text-marker-pen-line", "vol": 0.35, "rate": 1.1, "clip": 0.25, "note": "箭头"},
    {"t": 3.64, "name": "pk:transition-transition-soft", "vol": 0.3, "clip": 0.5, "note": "解冻追赶"},
  ],
  "word-slot-cycle": [
    {"t": 0.2, "name": "pk:paper-paper-slide", "vol": 0.3, "clip": 0.5, "note": "句干 + 胶囊入场"},
    {"t": 1.1, "name": "pk:ui-ui-click-tone", "vol": 0.35, "note": "换词 1"},
    {"t": 1.8, "name": "pk:ui-ui-click-tone", "vol": 0.38, "rate": 1.03, "note": "换词 2"},
    {"t": 2.5, "name": "pk:ui-ui-click-tone", "vol": 0.4, "rate": 1.06, "note": "换词 3"},
    {"t": 3.55, "name": "pk:transition-wind-swoosh-short", "vol": 0.3, "clip": 0.4, "note": "末 pill 上飞"},
    {"t": 3.95, "name": "pk:mech-lock-quick", "vol": 0.45, "note": "结论过冲落定"},
  ],
  "lead-word-zoom-assemble": [
    {"t": 0.1, "name": "pk:ui-pop", "vol": 0.4, "note": "首词 2.3× 现"},
    {"t": 0.5, "name": "pk:camera-ui-zoom-in", "vol": 0.35, "clip": 0.6, "note": "缩回 + 左滑"},
    {"t": 0.7, "name": "pk:paper-paper-slide", "vol": 0.3, "clip": 0.5, "note": "后续词推入（一记盖整段）"},
    {"t": 1.4, "name": "pk:transition-transition-soft", "vol": 0.25, "clip": 0.5, "note": "整行上移 + 副行"},
  ],
  "title-demote-to-label": [
    {"t": 0.2, "name": "pk:transition-transition-soft", "vol": 0.3, "clip": 0.5, "note": "标题显影"},
    {"t": 1.3, "name": "pk:camera-ui-zoom-in", "vol": 0.35, "clip": 0.7, "note": "降格飞到左上"},
    {"t": 1.7, "name": "pk:ui-pop", "vol": 0.35, "note": "内容块 1 生长"},
    {"t": 2.25, "name": "pk:ui-pop", "vol": 0.38, "note": "内容块 2 生长"},
    {"t": 2.8, "name": "pk:ui-pop", "vol": 0.4, "note": "内容块 3 生长"},
  ],
  "unit-grid-proportion": [
    {"t": 0.2, "name": "pk:data-data-load-os", "vol": 0.3, "clip": 1.0, "note": "网格分环生长"},
    {"t": 1.4, "name": "pk:ui-pop", "vol": 0.4, "note": "大数字入场"},
    {"t": 1.7, "name": "pk:counter-clock-tick-single", "vol": 0.3, "clip": 1.3, "note": "逐格染色 + 计数起点（连发只配起点）"},
    {"t": 3.0, "name": "pk:mech-lock-quick", "vol": 0.4, "note": "37 落定"},
  ],
  "source-converge": [
    {"t": 0.5, "name": "pk:text-marker-pen-line", "vol": 0.35, "clip": 0.9, "note": "四条曲线逐路接通"},
    {"t": 1.5, "name": "pk:transition-air-whoosh-powerful", "vol": 0.25, "clip": 1.5, "note": "节点沿线汇入"},
    {"t": 2.85, "name": "pk:mech-lock-quick", "vol": 0.45, "note": "吞并脉冲"},
    {"t": 3.8, "name": "pk:paper-paper-slide", "vol": 0.3, "clip": 0.6, "note": "结果滑到居中"},
  ],
  "line-carry-transition": [
    {"t": 0.4, "name": "pk:text-marker-pen-line", "vol": 0.4, "clip": 0.6, "note": "A 下划线画出"},
    {"t": 1.2, "name": "pk:transition-wind-swoosh-short", "vol": 0.35, "clip": 1.2, "note": "镜头跟线横移"},
    {"t": 3.2, "name": "pk:mech-lock-quick", "vol": 0.4, "note": "画框闭合"},
    {"t": 3.3, "name": "pk:ui-pop", "vol": 0.3, "note": "B 内容淡入"},
  ],
};
