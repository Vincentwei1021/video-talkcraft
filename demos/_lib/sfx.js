/* 口播动效卡库 · WebAudio 合成音效引擎
   零外部素材：全部音效用振荡器/噪声实时合成，参数可调、确定性。
   用法：SFX.play("whoosh", { at: 0.2, vol: 0.8, dur: 0.4, rate: 1 })
     at   = 相对现在的延迟秒（AudioContext 时钟）
     vol  = 0~1 音量（默认 1，再乘主音量）
     dur  = 时长类音效的持续秒
     rate = 音高倍率（1 = 原始设计音高）
   浏览器自动播放策略：AudioContext 可能起始 suspended——引擎在首次
   pointerdown/keydown 时 resume；画廊 iframe 需带 allow="autoplay"。 */
(function () {
  var ctx = null;
  var master = null;
  var muted = false;
  var forwardAll = false;      // 转发模式：所有 play 交给父页（配音台 iframe 用——
                               // 父页才认识运行时注册的 pk: 采样，且避免两处同时出声）
  var userSuspended = false;   // 外壳暂停时挂起音频时钟（区别于自动播放策略的 suspended）

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended" && !userSuspended) ctx.resume().catch(function () {});
    return ctx;
  }
  ["pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function () { ensureCtx(); decodeSamples(); }, { capture: true });
  });
  // 画廊切换视频 = 换了个新 iframe，文档内没有用户手势。http 下 allow="autoplay"
  // 委托可解，但 file:// 下 iframe 是 opaque origin、委托不生效——所以本地播不了时
  // 把 cue 转发给父页（画廊）播：用户点卡片就是父页手势，父页的 AudioContext 一直活着。
  var wake = setInterval(function () {
    if (userSuspended) return;
    var c = ensureCtx();
    // 时钟一活就把采样解出来：cue 里只有 pk: 采样的卡（音效全用真采样，
    // 一个合成音都没有）否则会卡死在 play() 的 "名字不认识" 早退上——
    // 解码只在 play() 里触发，而 play() 又要求先解码完，谁都不动 ⇒ 整卡全程无声。
    if (c && c.state === "running") { decodeSamples(); clearInterval(wake); }
  }, 400);
  function forwardToParent(name, opts) {
    if (window.parent === window) return false;
    try {
      window.parent.postMessage({ __sfx: { name: name, opts: opts || {} } }, "*");
      return true;
    } catch (e) { return false; }
  }

  // 共享噪声缓冲（2s 白噪声，循环用）
  var noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    return src;
  }

  // 包络工具：t0 起，attack 秒升到 v，随后 decay 秒指数衰减到近零
  function env(node, t0, v, attack, decay) {
    var g = node.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(v, 0.0001), t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  /* —— 真实采样层（2026-08-25 起）——
     window.SFX_SAMPLES 来自 sfx-samples.js（base64 内嵌 MP3，源于 video-shotcraft 的
     Mixkit 音效库，见 sfx/ATTRIBUTION.md）。有采样的音色优先播采样（真实拟音质感
     好过振荡器合成）；没有采样的（riser/ping/lowpad）与解码失败时退回合成 LIB。
     采样以 -3dB 峰值归一、去掉了头部静音——cue 的 t 直接就是发声时刻。 */
  var sampleBufs = {};      // name → AudioBuffer | AudioBuffer[]（typekey 双样本）
  var sampleDecoded = false;
  var typekeyFlip = 0;      // typekey 连打时 hard/soft 交替，防机枪感
  function decodeSamples() {
    if (sampleDecoded || !window.SFX_SAMPLES || !ctx) return;
    sampleDecoded = true;
    Object.keys(window.SFX_SAMPLES).forEach(function (name) {
      var v = window.SFX_SAMPLES[name];
      var list = Array.isArray(v) ? v : [v];
      var out = [];
      list.forEach(function (b64, i) {
        var bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        // decodeAudioData 的旧回调签名在所有目标浏览器都可用
        ctx.decodeAudioData(bytes.buffer, function (buf) {
          out[i] = buf;
          sampleBufs[name] = Array.isArray(v) ? out : buf;
        }, function () { /* 解码失败 → 该音色保持走合成 */ });
      });
    });
  }
  /* 抢跑补救：采样是异步解码的，而不少卡第一记 cue 就落在 t≈0.05~0.4。
     解码没赶上时，合成音色还能退回 LIB 顶一下，但 pk: 采样没有合成兜底——
     直接丢就是"这一记永远不响"。所以声明过但未解码的先挂起、每 40ms 重试，
     最多 25 次（1s）。t0 保持原值：WebAudio 对已过去的 start 时刻按"立刻"处理，
     所以补上的这记最多迟 40ms，不会跑到别的节拍上去。 */
  function playSampleSoon(name, t0, o, tries) {
    if (playSample(name, t0, o)) return;
    if (tries <= 0) return;
    setTimeout(function () { playSampleSoon(name, t0, o, tries - 1); }, 40);
  }

  /* 抢在第一记 cue 之前解码：sfx-samples.js 是外壳动态插进来的，就位时刻不定。
     每 100ms 看一眼（最多 3s），一见 SFX_SAMPLES 就建 ctx 并开始解码——
     等到 play() 里才解码的话，t≈0.05 起手的卡第一记必然赶不上。 */
  var early = setInterval(function () {
    if (!window.SFX_SAMPLES) return;
    clearInterval(early);
    if (!userSuspended) { ensureCtx(); decodeSamples(); }
  }, 100);
  setTimeout(function () { clearInterval(early); }, 3000);

  function playSample(name, t0, o) {
    var v = sampleBufs[name];
    if (!v) return false;
    var buf = Array.isArray(v) ? v[(typekeyFlip++) % v.length] : v;
    if (!buf) return false;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    var g = ctx.createGain();
    g.gain.value = o.vol;
    src.connect(g); g.connect(master);
    // clip = 只放前 clip 秒（源库有 2~20s 的长采样，配到 0.4s 的动效上要截）：
    // 末尾 40ms 淡出，硬切会爆 pop 音
    var clip = o.clip || 0;
    if (clip > 0 && clip < buf.duration / src.playbackRate.value) {
      var fade = Math.min(0.04, clip * 0.3);
      g.gain.setValueAtTime(o.vol, t0 + clip - fade);
      g.gain.linearRampToValueAtTime(0.0001, t0 + clip);
      src.start(t0);
      src.stop(t0 + clip);
    } else {
      src.start(t0);
    }
    return true;
  }

  /* 运行时注册采样（音效配音台用）：把任意 mp3 的 ArrayBuffer 挂成一个音色名，
     之后 SFX.play(那个名字) 就能播。配音台据此让每个 cue 指向 picked/ 里任一采样，
     不必先内嵌进 sfx-samples.js——改一个节点立刻能听。 */
  function registerSample(name, arrayBuf) {
    var c = ensureCtx();
    if (!c) return Promise.reject(new Error("no AudioContext"));
    return new Promise(function (res, rej) {
      c.decodeAudioData(arrayBuf, function (buf) {
        sampleBufs[name] = buf;
        res(buf.duration);
      }, function (e) { rej(e || new Error("decode failed")); });
    });
  }

  /* —— 音色库（合成兜底）——
     每个音色 = function(t0, o)：t0 是 AudioContext 绝对时间，o = {vol, dur, rate}。
     设计基准：干净、短促、不喧宾夺主（demo 主角是动效，音效是"确认感"）。 */
  var LIB = {

    // 呼啸（入场/滑入/转场）：带通噪声 + 频率扫掠
    whoosh: function (t0, o) {
      var dur = o.dur || 0.45;
      var n = noise(), bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(300 * o.rate, t0);
      bp.frequency.exponentialRampToValueAtTime(2400 * o.rate, t0 + dur * 0.6);
      bp.frequency.exponentialRampToValueAtTime(500 * o.rate, t0 + dur);
      var g = ctx.createGain();
      env(g, t0, 0.5 * o.vol, dur * 0.35, dur * 0.65);
      n.connect(bp); bp.connect(g); g.connect(master);
      n.start(t0); n.stop(t0 + dur + 0.05);
    },

    // 短扫（快速位移/擦过）：高频短呼啸
    swipe: function (t0, o) {
      LIB.whoosh(t0, { vol: o.vol * 0.8, dur: o.dur || 0.22, rate: o.rate * 1.8 });
    },

    // 弹出（pop-in / 徽章 / 图标出现）：正弦下滑 + 咔哒瞬态
    pop: function (t0, o) {
      var s = ctx.createOscillator(), g = ctx.createGain();
      s.type = "sine";
      s.frequency.setValueAtTime(620 * o.rate, t0);
      s.frequency.exponentialRampToValueAtTime(180 * o.rate, t0 + 0.09);
      env(g, t0, 0.55 * o.vol, 0.008, 0.11);
      s.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + 0.15);
      LIB.click(t0, { vol: o.vol * 0.4, rate: o.rate, dur: 0 });
    },

    // 咔哒（点击/开关/落定）：高通噪声爆点
    click: function (t0, o) {
      var n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = "highpass"; hp.frequency.value = 2200 * o.rate;
      env(g, t0, 0.5 * o.vol, 0.002, 0.03);
      n.connect(hp); hp.connect(g); g.connect(master);
      n.start(t0); n.stop(t0 + 0.06);
    },

    // 轻嗒（计数跳动/逐项点亮）：比 click 更软更高
    tick: function (t0, o) {
      var s = ctx.createOscillator(), g = ctx.createGain();
      s.type = "triangle";
      s.frequency.value = 1500 * o.rate;
      env(g, t0, 0.28 * o.vol, 0.002, 0.045);
      s.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + 0.08);
    },

    // 重击（黑震切/slam-in/砸落）：低频正弦捶 + 噪声拍
    slam: function (t0, o) {
      var s = ctx.createOscillator(), g = ctx.createGain();
      s.type = "sine";
      s.frequency.setValueAtTime(140 * o.rate, t0);
      s.frequency.exponentialRampToValueAtTime(42 * o.rate, t0 + 0.16);
      env(g, t0, 0.95 * o.vol, 0.004, 0.3);
      s.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + 0.4);
      var n = noise(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.value = 900;
      env(ng, t0, 0.4 * o.vol, 0.002, 0.12);
      n.connect(lp); lp.connect(ng); ng.connect(master);
      n.start(t0); n.stop(t0 + 0.2);
    },

    // 上升（蓄势/riser，转场前奏）：噪声 + 上扫
    riser: function (t0, o) {
      var dur = o.dur || 0.6;
      var n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 2.2;
      bp.frequency.setValueAtTime(220 * o.rate, t0);
      bp.frequency.exponentialRampToValueAtTime(3200 * o.rate, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4 * o.vol, t0 + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08);
      n.connect(bp); bp.connect(g); g.connect(master);
      n.start(t0); n.stop(t0 + dur + 0.15);
    },

    // 叮（强调/达成/高亮定格）：谐波钟声，长尾
    ding: function (t0, o) {
      [1, 2.76, 5.4].forEach(function (h, i) {
        var s = ctx.createOscillator(), g = ctx.createGain();
        s.type = "sine";
        s.frequency.value = 880 * o.rate * h;
        env(g, t0, (i === 0 ? 0.4 : 0.12) * o.vol, 0.004, 0.7 - i * 0.18);
        s.connect(g); g.connect(master);
        s.start(t0); s.stop(t0 + 0.9);
      });
    },

    // 铅笔沙沙（描画期）：低通噪声 + 幅度抖动，持续 dur
    scratch: function (t0, o) {
      var dur = o.dur || 1.0;
      var n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 0.8;
      bp.frequency.value = 3400 * o.rate;
      var steps = Math.max(6, Math.floor(dur * 14));
      g.gain.setValueAtTime(0.0001, t0);
      for (var i = 0; i < steps; i++) {
        var tt = t0 + (dur * i) / steps;
        // 确定性抖动（正弦组合，不用 Math.random——重播一致）
        var a = 0.16 + 0.1 * Math.abs(Math.sin(i * 2.7) * Math.cos(i * 1.3));
        g.gain.linearRampToValueAtTime(a * o.vol, tt);
      }
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      n.connect(bp); bp.connect(g); g.connect(master);
      n.start(t0); n.stop(t0 + dur + 0.05);
    },

    // 打字键（typewriter / 终端）：双瞬态机械感
    typekey: function (t0, o) {
      LIB.click(t0, { vol: o.vol * 0.8, rate: o.rate * 1.2, dur: 0 });
      LIB.click(t0 + 0.018, { vol: o.vol * 0.35, rate: o.rate * 0.7, dur: 0 });
    },

    // 纸响（卡片/翻页/便签）：中频噪声簇
    paper: function (t0, o) {
      var n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 0.6;
      bp.frequency.value = 1600 * o.rate;
      env(g, t0, 0.3 * o.vol, 0.01, 0.14);
      n.connect(bp); bp.connect(g); g.connect(master);
      n.start(t0); n.stop(t0 + 0.2);
    },

    // 高频短鸣（标注点亮/连线命中）：一记高音 ping
    ping: function (t0, o) {
      var s = ctx.createOscillator(), g = ctx.createGain();
      s.type = "sine";
      s.frequency.value = 1720 * o.rate;
      env(g, t0, 0.3 * o.vol, 0.004, 0.22);
      s.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + 0.3);
    },

    // 低鸣垫底（压暗/聚焦氛围转变）：低正弦缓入缓出
    lowpad: function (t0, o) {
      var dur = o.dur || 0.8;
      var s = ctx.createOscillator(), g = ctx.createGain();
      s.type = "sine";
      s.frequency.value = 110 * o.rate;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22 * o.vol, t0 + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + dur + 0.05);
    },
  };

  window.SFX = {
    // 名字取音色库（或 registerSample 注册过的名字），at 秒后播放；
    // muted / 无 AudioContext 时静默跳过
    play: function (name, opts) {
      if (muted) return;
      // 转发模式（配音台 iframe）：一律交父页播，本地不出声——
      // 父页才认识运行时注册的 pk: 采样，名字本地不认识也照转
      if (forwardAll) { forwardToParent(name, opts); return; }
      // 认得的名字 = 合成音色 / 已解码采样 / sfx-samples.js 里声明过的采样。
      // 声明过但还没解码也要放行：否则首个 cue 落在解码完成前就被判成"不认识"丢掉，
      // 而 decodeSamples 又只在这条路后面被调 ⇒ 全采样的卡永远开不了口。
      var declared = window.SFX_SAMPLES && window.SFX_SAMPLES[name];
      if (!LIB[name] && !sampleBufs[name] && !declared) return;
      var c = ensureCtx();
      // 本地拿不到声音（无手势解锁）→ 转发给父页播；父页也播不了才丢弃。
      // suspended 期间不本地排队（时钟冻结，resume 一瞬会挤成一团）。
      if (!c || c.state !== "running") { forwardToParent(name, opts); return; }
      var o = { vol: 1, dur: 0, rate: 1, clip: 0 };
      opts = opts || {};
      if (opts.vol != null) o.vol = opts.vol;
      if (opts.dur != null) o.dur = opts.dur;
      if (opts.rate != null) o.rate = opts.rate;
      if (opts.clip != null) o.clip = opts.clip;
      decodeSamples();
      var t0 = c.currentTime + Math.max(0, opts.at || 0);
      // 采样优先
      if (playSample(name, t0, o)) return;
      // 还没解码完：有合成同名音色就退合成（那一发变合成音，可接受）；
      // pk: 采样没有合成兜底，挂起等解码（见 playSampleSoon），别把这一记丢掉
      if (LIB[name]) { try { LIB[name](t0, o); } catch (e) { /* 忽略 */ } return; }
      if (declared) playSampleSoon(name, t0, o, 25);
    },
    // 运行时挂采样（配音台换音色用）：name 可覆盖内置音色，返回 Promise<时长秒>
    registerSample: registerSample,
    hasSample: function (name) { return !!sampleBufs[name]; },
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },
    // 转发模式开关（配音台设置；见 forwardAll 注释）
    setForwardAll: function (f) { forwardAll = !!f; },
    // 暂停/恢复整条音频时钟（外壳 togglePause 时调用——挂起后已排程的 cue 不会走掉）
    suspend: function () {
      userSuspended = true;
      if (ctx && ctx.state === "running") ctx.suspend().catch(function () {});
    },
    resume: function () {
      userSuspended = false;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {});
    },
    names: function () { return Object.keys(LIB); },
  };
})();
