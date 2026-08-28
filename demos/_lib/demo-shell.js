/* 口播动效卡库 · demo 统一运行时
   用法（demo 页内）：
     DemoShell.register(({ speed }) => {
       // 每次调用都要从头重建动画（replay 语义）。
       // GSAP demo：新建 timeline 并 tl.timeScale(speed)，返回值可忽略。
       // 非 GSAP demo：自行按 speed 缩放时长。
     });
   外壳负责：控制条（重播 / 1x / 0.3x）、舞台自适应缩放、加载后自动播一遍。 */
(function () {
  var runFn = null;
  var speed = 1;

  // ?embed=1：嵌入模式（画廊小窗）——无留边、贴满视口；播完回卷到开头暂停（不自动循环）
  // ?controls=1（或非嵌入直开）：视频内叠层控制条（悬停显示）——播放/暂停、进度、倍速、全屏
  var EMBED = /[?&]embed=1/.test(location.search);
  var CONTROLS = !EMBED || /[?&]controls=1/.test(location.search);
  // 声音：主屏（embed+controls）与独立打开有声；画廊小窗（纯 embed）静音。
  // 音效引擎 sfx.js + 逐卡 cue 表 sfx-map.js 由外壳动态加载，demo 页面零改动。
  var SOUND = CONTROLS;

  var loopTimer = null;
  var runStart = 0;   // 本次 run 在 globalTimeline 上的起点（秒）
  var runDur = 0;     // 本次 run 的有限动画总时长（不含 repeat:-1 的 idle 微动）

  // —— 音效：cue 表跟随动画时钟触发 ——
  // cue 表来自 _lib/sfx-map.js（按 slug 键控，时间以 speed=1 的 demo 秒设计）。
  // 派发器挂在 rAF 上读 GSAP 全局时钟：暂停不走、重播复位、慢放自动等比延后。
  var SLUG = (location.pathname.match(/\/demos\/([^/]+)\//) || [])[1] || "";
  var cues = [];
  var cueIdx = 0;
  // 加载完成（或失败/超时）后回调——首播必须等 cue 表就位，否则 t≈0 起手的卡首个 cue 会丢
  function loadSound(cb) {
    if (!SOUND) { cb(); return; }
    var pending = 3, done = false;
    function fin() {
      pending--;
      if (!done && pending <= 0) { done = true; cb(); }
    }
    // sfx-samples.js = 真实采样（base64 MP3）；先于 sfx.js 就位与否都行——引擎首个 play 时才解码
    ["sfx-samples.js", "sfx.js", "sfx-map.js"].forEach(function (f) {
      var s = document.createElement("script");
      s.src = "../_lib/" + f;
      s.onload = fin;
      s.onerror = fin;
      document.head.appendChild(s);
    });
    // 兜底：1.5s 没回来也照常开播（无声可接受，卡住不开播不可接受）
    setTimeout(function () { if (!done) { done = true; cb(); } }, 1500);
    (function tick() {
      try {
        if (window.SFX && cues.length && window.gsap) {
          var t = window.gsap.globalTimeline.time() - runStart;
          while (cueIdx < cues.length && cues[cueIdx].t / speed <= t) {
            var c = cues[cueIdx++];
            // 补触发窗 0.25s：seek 拖过去的旧 cue 不追着响一串
            if (t - c.t / speed < 0.25) {
              // clip 与 dur 同样按 speed 放大：慢放时截断窗随动画等比拉长
              window.SFX.play(c.name, { vol: c.vol, dur: (c.dur || 0) / speed, rate: c.rate, clip: (c.clip || 0) / speed });
            }
          }
        }
      } catch (e) { /* 忽略 */ }
      requestAnimationFrame(tick);
    })();
  }
  function resetCues() {
    cueIdx = 0;
    var map = window.SFX_MAP || {};
    cues = (map[SLUG] || []).slice().sort(function (a, b) { return a.t - b.t; });
  }

  // 从 GSAP 时间线推算本次动画的结束点（endTime 已把 timeScale 换算进父时间）
  function computeDur() {
    var end = 0;
    try {
      if (window.gsap) {
        window.gsap.globalTimeline.getChildren(true, true, true).forEach(function (t) {
          var e = t.endTime(true);
          if (isFinite(e)) end = Math.max(end, e);
        });
      }
    } catch (e) { /* 忽略 */ }
    runDur = end > runStart ? Math.min(end - runStart, 60) : 0;
  }

  // 播完不自动循环（2026-08-28 用户定版）：回卷到开头并暂停，等下一次手动播放/重播。
  // 画廊小窗滚出视野会卸载 iframe、滚回来重建，天然还是“进视野就播一遍”。
  function finishRun() {
    clearTimeout(loopTimer);
    try {
      if (window.gsap && runDur > 0) {
        window.gsap.globalTimeline.pause();
        window.gsap.globalTimeline.time(runStart);
        cueIdx = 0;
        setPauseUI(true);
        if (window.SFX) window.SFX.suspend();
      }
    } catch (e) { /* 忽略 */ }
  }
  function scheduleLoop() {
    clearTimeout(loopTimer);
    var dur = runDur > 0 ? runDur : 8;
    var t = 0;
    try { if (window.gsap) t = Math.max(0, window.gsap.globalTimeline.time() - runStart); } catch (e) { /* 忽略 */ }
    loopTimer = setTimeout(finishRun, (Math.max(0, dur - t) + 0.4) * 1000);
  }

  function run() {
    if (!runFn) return;
    try {
      if (window.gsap) {
        window.gsap.globalTimeline.clear();
        window.gsap.killTweensOf("*");
        window.gsap.globalTimeline.play();
        runStart = window.gsap.globalTimeline.time();
      }
    } catch (e) { /* gsap 未加载时忽略 */ }
    setPauseUI(false);
    resetCues();
    runFn({ speed: speed });
    document.body.dataset.runs = (parseInt(document.body.dataset.runs || "0", 10) + 1);
    // 动画通常在 register 回调里同步建好；延迟一拍再量，容忍 delayedCall 类写法
    setTimeout(function () { computeDur(); scheduleLoop(); }, 60);
  }

  function fitStage() {
    var stage = document.getElementById("stage");
    var wrap = document.querySelector(".stage-wrap");
    var scaler = document.querySelector(".stage-scaler");
    if (!stage || !wrap || !scaler) return;
    var w = stage.offsetWidth;
    var h = stage.offsetHeight;
    var availW = EMBED ? window.innerWidth : window.innerWidth - 40;
    var availH = EMBED ? window.innerHeight : window.innerHeight - 90;
    var scale = EMBED
      ? Math.min(availW / w, availH / h)
      : Math.min(availW / w, availH / h, 1.4);
    scaler.style.transform = "scale(" + scale + ")";
    wrap.style.width = w * scale + "px";
    wrap.style.height = h * scale + "px";
  }

  var pauseBtn = null;
  var paused = false;

  // HUD 图标：统一 SVG（unicode 字形各字体度量不一，按钮大小永远对不齐）
  var ICONS = {
    play: '<svg viewBox="0 0 16 16"><path d="M4.5 2.8 12.6 8l-8.1 5.2z"/></svg>',
    pause: '<svg viewBox="0 0 16 16"><rect x="3.4" y="2.8" width="3.2" height="10.4" rx="0.8"/><rect x="9.4" y="2.8" width="3.2" height="10.4" rx="0.8"/></svg>',
    replay: '<svg viewBox="0 0 16 16"><path d="M8 2.6a5.4 5.4 0 1 1-5.06 3.5" fill="none" stroke-width="1.8" stroke-linecap="round"/><path d="M2.2 2.2v4h4z"/></svg>',
    soundOn: '<svg viewBox="0 0 16 16"><path d="M2.5 6v4h2.6L9 13V3L5.1 6z"/><path d="M11 5.4a3.6 3.6 0 0 1 0 5.2M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke-width="1.5" stroke-linecap="round"/></svg>',
    soundOff: '<svg viewBox="0 0 16 16"><path d="M2.5 6v4h2.6L9 13V3L5.1 6z"/><path d="M11 6l4 4M15 6l-4 4" fill="none" stroke-width="1.5" stroke-linecap="round"/></svg>',
    fullscreen: '<svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  function setIcon(btn, name) { btn.innerHTML = ICONS[name]; }

  function setPauseUI(p) {
    paused = p;
    if (pauseBtn) setIcon(pauseBtn, p ? "play" : "pause");
    // 数字人视频与 GSAP 同步暂停/恢复
    document.querySelectorAll("video.dh-host").forEach(function (v) {
      if (p) v.pause(); else v.play().catch(function () {});
    });
  }

  function togglePause() {
    try {
      if (window.gsap) {
        if (paused) window.gsap.globalTimeline.play();
        else window.gsap.globalTimeline.pause();
      }
    } catch (e) { /* 忽略 */ }
    setPauseUI(!paused);
    try {
      if (window.SFX) { if (paused) window.SFX.suspend(); else window.SFX.resume(); }
    } catch (e) { /* 忽略 */ }
    if (paused) clearTimeout(loopTimer);
    else scheduleLoop();
  }

  // 进度条：rAF 轮询 globalTimeline 相对本次 run 的位置
  function buildProgress(bar) {
    var wrap = document.createElement("div");
    wrap.className = "demo-progress";
    var fill = document.createElement("div");
    fill.className = "demo-progress-fill";
    wrap.appendChild(fill);
    bar.appendChild(wrap);
    function tick() {
      try {
        if (window.gsap && runDur > 0) {
          var t = window.gsap.globalTimeline.time() - runStart;
          var p = Math.max(0, Math.min(1, t / runDur));
          fill.style.width = (p * 100) + "%";
        }
      } catch (e) { /* 忽略 */ }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // 点进度条 seek
    wrap.addEventListener("click", function (ev) {
      try {
        if (window.gsap && runDur > 0) {
          var r = wrap.getBoundingClientRect();
          var p = (ev.clientX - r.left) / r.width;
          var nt = p * runDur;
          window.gsap.globalTimeline.time(runStart + nt);
          // 音效 cue 指针跟着 seek 走：往回拖后 cue 还能再响
          cueIdx = 0;
          while (cueIdx < cues.length && cues[cueIdx].t / speed < nt) cueIdx++;
        }
      } catch (e) { /* 忽略 */ }
    });
  }

  // 全屏（含 Safari webkit 前缀兜底）。画廊 iframe 需带 allowfullscreen 属性
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFullscreen() {
    try {
      if (fsEl()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      }
    } catch (e) { /* 忽略 */ }
  }

  // 视频内叠层控制条（HUD）：悬停显示——播放/暂停 · 重播 · 进度 · 倍速 · 全屏
  function buildHud(wrap) {
    if (!wrap) return;
    var hud = document.createElement("div");
    hud.className = "demo-hud";

    if (!EMBED) {
      var title = document.createElement("span");
      title.className = "demo-title";
      title.textContent = document.title || "demo";
      hud.appendChild(title);
    }

    pauseBtn = document.createElement("button");
    pauseBtn.className = "ico";
    pauseBtn.title = "播放/暂停";
    setIcon(pauseBtn, "pause");
    pauseBtn.addEventListener("click", togglePause);
    hud.appendChild(pauseBtn);

    var replay = document.createElement("button");
    replay.className = "ico hud-replay";
    replay.title = "重播";
    setIcon(replay, "replay");
    replay.addEventListener("click", run);
    hud.appendChild(replay);

    buildProgress(hud);

    var speeds = [[1, "1x"], [0.3, "0.3x"]];
    var speedBtns = speeds.map(function (s) {
      var b = document.createElement("button");
      b.className = "spd";
      b.textContent = s[1];
      b.title = s[0] === 1 ? "原速" : "慢放";
      if (s[0] === 1) b.classList.add("active");
      b.addEventListener("click", function () {
        speed = s[0];
        speedBtns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        run();
      });
      hud.appendChild(b);
      return b;
    });

    if (SOUND) {
      var mute = document.createElement("button");
      mute.className = "ico";
      mute.title = "声音开/关";
      setIcon(mute, "soundOn");
      mute.addEventListener("click", function () {
        if (!window.SFX) return;
        window.SFX.setMuted(!window.SFX.isMuted());
        setIcon(mute, window.SFX.isMuted() ? "soundOff" : "soundOn");
      });
      hud.appendChild(mute);
    }

    var fs = document.createElement("button");
    fs.className = "ico";
    fs.title = "全屏";
    setIcon(fs, "fullscreen");
    fs.addEventListener("click", toggleFullscreen);
    hud.appendChild(fs);

    wrap.appendChild(hud);
  }

  // 主持人占位升级：往每个 .host-placeholder / [data-dh-host] 注入数字人 alpha 视频
  // （加载失败保持灰阶剪影兜底；数字人是演示语境素材，不属于任何卡的动效本体）
  function injectHost() {
    var hosts = document.querySelectorAll(".host-placeholder, [data-dh-host]");
    if (!hosts.length) return;
    hosts.forEach(function (h) {
      var v = document.createElement("video");
      v.className = "dh-host";
      v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute("playsinline", "");
      var safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      v.src = "../_lib/dh-host." + (safari ? "mov" : "webm");
      v.addEventListener("loadeddata", function () { h.classList.add("dh-live"); v.play().catch(function () {}); });
      v.addEventListener("error", function () { v.remove(); h.classList.remove("dh-live"); });
      h.appendChild(v);
    });
  }

  function init() {
    var stage = document.getElementById("stage");
    var wrap = stage && stage.closest(".stage-wrap");
    if (stage && !wrap) {
      wrap = document.createElement("div");
      wrap.className = "stage-wrap";
      var scaler = document.createElement("div");
      scaler.className = "stage-scaler";
      stage.parentNode.insertBefore(wrap, stage);
      wrap.appendChild(scaler);
      scaler.appendChild(stage);
    }
    if (EMBED) document.body.style.background = "transparent";
    if (CONTROLS) buildHud(wrap);
    injectHost();
    fitStage();
    window.addEventListener("resize", fitStage);
    loadSound(run);   // 首播等 cue 表就位（≤1.5s），t≈0 起手的卡首个 cue 才不丢
  }

  window.DemoShell = {
    register: function (fn) {
      runFn = fn;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        init();
      }
    },
    /* —— 外部控制口（音效配音台 sfx-studio.html 用，普通 demo 不碰）——
       配音台把 demo 装在 iframe 里，要能换 cue 表、从任意时刻重播、读时长。 */
    replay: run,
    // 覆盖本 demo 的 cue 表（配音台改一个节点就立刻重播听效果）
    setCues: function (list) {
      var map = window.SFX_MAP || (window.SFX_MAP = {});
      map[SLUG] = (list || []).slice();
      resetCues();
    },
    // 跳到 t 秒（speed=1 的 demo 秒）；cue 指针跟着走，往回跳后 cue 还能再响
    seek: function (t) {
      try {
        if (!window.gsap) return;
        var nt = Math.max(0, t) / speed;
        window.gsap.globalTimeline.time(runStart + nt);
        cueIdx = 0;
        while (cueIdx < cues.length && cues[cueIdx].t / speed < nt) cueIdx++;
      } catch (e) { /* 忽略 */ }
    },
    getDuration: function () { return runDur; },
    getSlug: function () { return SLUG; },
    // 当前播放位置（本次 run 内的 demo 秒，已折算 speed）——配音台画播放头用
    getTime: function () {
      try {
        if (!window.gsap) return 0;
        return Math.max(0, (window.gsap.globalTimeline.time() - runStart) * speed);
      } catch (e) { return 0; }
    },
  };
})();
