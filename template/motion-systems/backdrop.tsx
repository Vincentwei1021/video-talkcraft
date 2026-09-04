import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * 幕底（L5/L6 空间基底）12 款 —— design-language §1.1 背景菜单的代码正主（2026-09-05 用户选定）。
 *
 * 用法：场景整幕 `<Backdrop kind="pastel-mesh-flow" />`；深底默认 `mesh-flow-dark`。
 * - 全部由 frame / fps 驱动、零 Math.random，逐帧可复现；`speed` 默认 1.5（用户实看定版）。
 * - GLSL 款（mesh-flow-dark / aurora-veil / pastel-mesh-flow / iridescent-sheen / ink-wash）走裸 WebGL：
 *   remotion.config.ts 需要 `Config.setChromiumOpenGlRenderer('angle')`（与 three 桥同一条，cinematography §6）。
 * - 深色渐变进 H.264 会出色带：默认叠一层静态噪点（`grain`，深 .06 / 浅 .09，overlay）。
 * - 幕底自带的流动不是运动系统的一部分（运动系统只剩相机极缓推拉）；网格 / 点阵两款是细密纹理，
 *   只放屏幕空间静态层，不进 CameraRig 缩放层。
 * - 设计坐标 960×540，按合成尺寸等比放大到覆盖（竖屏会裁两侧，对幕底无害）。
 */

export type BackdropKind =
  | 'mesh-flow-dark'
  | 'aurora-veil'
  | 'beams-grid'
  | 'spotlight-stage'
  | 'dot-field-wave'
  | 'orbs-dark'
  | 'pastel-mesh-flow'
  | 'paper-grain'
  | 'grid-spot-light'
  | 'iridescent-sheen'
  | 'glass-blobs'
  | 'ink-wash';

export const DARK_KINDS: BackdropKind[] = ['mesh-flow-dark', 'aurora-veil', 'beams-grid', 'spotlight-stage', 'dot-field-wave', 'orbs-dark'];
export const LIGHT_KINDS: BackdropKind[] = ['pastel-mesh-flow', 'paper-grain', 'grid-spot-light', 'iridescent-sheen', 'glass-blobs', 'ink-wash'];
export const DEFAULT_DARK: BackdropKind = 'mesh-flow-dark';
export const DEFAULT_LIGHT: BackdropKind = 'pastel-mesh-flow';
export const isDarkKind = (k: BackdropKind) => DARK_KINDS.includes(k);

export type BackdropProps = {
  kind?: BackdropKind;
  /** 运动倍率；1 = 各款说明里的基准周期，默认 1.5（2026-09-05 用户定版） */
  speed?: number;
  /** 静态噪点抗色带，默认开 */
  grain?: boolean;
  style?: React.CSSProperties;
};

/* ------------------------------------------------------------------ 工具 */
const DW = 960;
const DH = 540;
/** 确定性伪随机（index → [0,1)），替代 Math.random */
const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** 静态噪点贴图（SVG feTurbulence，一张 160px tile；逐帧新噪声在 H.264 里最贵、也最容易压成脏块） */
const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

const Grain: React.FC<{opacity: number; blend?: React.CSSProperties['mixBlendMode']}> = ({opacity, blend = 'overlay'}) => (
  <AbsoluteFill style={{backgroundImage: GRAIN_URL, backgroundSize: '160px 160px', opacity, mixBlendMode: blend, pointerEvents: 'none'}} />
);

/** 960×540 设计坐标盒：等比放大到覆盖合成画幅并居中 */
const DesignBox: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  const s = Math.max(width / DW, height / DH);
  const left = (width - DW * s) / 2;
  const top = (height - DH * s) / 2;
  return (
    <div style={{position: 'absolute', left, top, width: DW, height: DH, transform: `scale(${s})`, transformOrigin: '0 0', overflow: 'hidden'}}>
      {children}
    </div>
  );
};

const fill = (extra: React.CSSProperties = {}): React.CSSProperties => ({position: 'absolute', inset: 0, ...extra});

/* ------------------------------------------------------------------ GLSL 引擎 */
const NOISE_GLSL = `
  vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(dot(hash2(i), f), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x), mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }
`;

const FRAG: Record<string, string> = {
  'mesh-flow-dark': `
  void main(){
    vec2 uv = gl_FragCoord.xy / u_res; vec2 p = uv * vec2(1.78, 1.0);
    float t = u_time * 0.04;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.3 * t), fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.2 * t));
    float f = 0.5 + 0.5 * fbm(p + 1.8 * r);
    vec3 c1 = vec3(0.04, 0.07, 0.16), c2 = vec3(0.12, 0.16, 0.42), c3 = vec3(0.05, 0.30, 0.36), c4 = vec3(0.26, 0.12, 0.42);
    vec3 col = mix(c1, c2, smoothstep(0.3, 0.75, f));
    col = mix(col, c3, smoothstep(0.15, 0.6, length(q)) * 0.9);
    col = mix(col, c4, smoothstep(0.55, 0.9, 0.5 + 0.5 * r.x) * 0.9);
    col *= 0.85 + 0.15 * (1.0 - length(uv - 0.5));
    gl_FragColor = vec4(col, 1.0);
  }`,
  'aurora-veil': `
  void main(){
    vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.05;
    vec3 col = vec3(0.02, 0.028, 0.05);
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float y0 = 0.78 - fi * 0.10;
      float w = fbm(vec2(uv.x * 2.2 + fi * 3.1 + t * 0.6, fi * 7.0 + t * 0.3)) * 0.18;
      float band = exp(-pow((uv.y - y0 - w) * 7.0, 2.0));
      float shimmer = 0.6 + 0.4 * fbm(vec2(uv.x * 6.0 - t * 1.5 + fi, uv.y * 3.0));
      vec3 tint = mix(vec3(0.10, 0.75, 0.62), vec3(0.28, 0.32, 0.95), fi * 0.5 + uv.x * 0.3);
      col += tint * band * shimmer * 0.42;
    }
    col *= smoothstep(-0.1, 0.55, uv.y) * 0.3 + 0.7;
    gl_FragColor = vec4(col, 1.0);
  }`,
  'pastel-mesh-flow': `
  void main(){
    vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.035;
    vec3 col = vec3(0.984, 0.984, 0.992);
    vec2 c1 = vec2(0.22 + 0.10 * sin(t), 0.72 + 0.08 * cos(t * 0.8));
    vec2 c2 = vec2(0.80 + 0.08 * cos(t * 1.1), 0.75 + 0.09 * sin(t * 0.9));
    vec2 c3 = vec2(0.78 + 0.09 * sin(t * 0.7 + 2.0), 0.22 + 0.10 * cos(t));
    vec2 c4 = vec2(0.20 + 0.10 * cos(t * 0.6 + 1.0), 0.20 + 0.08 * sin(t * 1.2));
    vec2 asp = vec2(1.78, 1.0);
    float w = 0.05 * fbm(uv * 3.0 + t);
    float b = exp(-pow(length((uv - c1) * asp) / 0.55, 2.0)) + w;
    float p = exp(-pow(length((uv - c2) * asp) / 0.55, 2.0)) + w;
    float v = exp(-pow(length((uv - c3) * asp) / 0.55, 2.0)) + w;
    float g = exp(-pow(length((uv - c4) * asp) / 0.55, 2.0)) + w;
    col = mix(col, vec3(0.47, 0.71, 1.0), clamp(b, 0.0, 1.0) * 0.42);
    col = mix(col, vec3(1.0, 0.67, 0.78), clamp(p, 0.0, 1.0) * 0.38);
    col = mix(col, vec3(0.71, 0.59, 1.0), clamp(v, 0.0, 1.0) * 0.30);
    col = mix(col, vec3(0.59, 0.92, 0.84), clamp(g, 0.0, 1.0) * 0.32);
    gl_FragColor = vec4(col, 1.0);
  }`,
  'iridescent-sheen': `
  vec3 pal(float x){ return vec3(0.5) + 0.5 * cos(6.2831 * (vec3(1.0, 1.0, 1.0) * x + vec3(0.0, 0.33, 0.67))); }
  void main(){
    vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.04;
    float f = fbm(uv * vec2(2.6, 1.6) + vec2(t, -t * 0.6));
    float g = fbm(uv * vec2(1.3, 0.9) - vec2(t * 0.4, t * 0.2) + 3.0);
    vec3 tint = pal(f * 1.4 + g * 0.6);
    vec3 base = vec3(0.99, 0.99, 1.0);
    float sat = 0.30, amp = 0.16 * (0.6 + 0.4 * g);
    vec3 col = base - amp + amp * mix(vec3(dot(tint, vec3(0.333))), tint, sat) * 1.1;
    gl_FragColor = vec4(clamp(col, 0.86, 1.0), 1.0);
  }`,
  'ink-wash': `
  void main(){
    vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.025;
    vec2 p = uv * vec2(2.2, 1.3) + vec2(-t * 1.2, 0.0);
    vec2 q = vec2(fbm(p), fbm(p + vec2(4.7, 1.9)));
    float f = 0.5 + 0.5 * fbm(p + 1.4 * q);
    float ink = smoothstep(0.45, 0.85, f) * 0.20;
    ink *= smoothstep(0.0, 0.45, uv.y) * (1.0 - 0.3 * smoothstep(0.75, 1.0, uv.y));
    vec3 paper = vec3(0.965, 0.953, 0.918), inkc = vec3(0.16, 0.17, 0.20);
    gl_FragColor = vec4(mix(paper, inkc, ink), 1.0);
  }`,
};

type GlState = {gl: WebGLRenderingContext; uT: WebGLUniformLocation | null};

/** 全屏三角形 + u_time / u_res；每帧 useLayoutEffect 内同步 draw（Remotion 截帧前完成） */
const GlBackdrop: React.FC<{frag: string; t: number}> = ({frag, t}) => {
  const {width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<GlState | null>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!state.current) {
      const gl = canvas.getContext('webgl', {antialias: false, preserveDrawingBuffer: true});
      if (!gl) return;
      const vs = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
      const fs = 'precision highp float; uniform float u_time; uniform vec2 u_res; ' + NOISE_GLSL + frag;
      const sh = (type: number, src: string) => {
        const o = gl.createShader(type)!;
        gl.shaderSource(o, src);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('Backdrop shader: ' + gl.getShaderInfoLog(o));
        return o;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, width, height);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), width, height);
      state.current = {gl, uT: gl.getUniformLocation(prog, 'u_time')};
    }
    const {gl, uT} = state.current;
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, [t, frag, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />;
};

/* ------------------------------------------------------------------ Canvas 2D 款 */
/** 画布按设计坐标绘制（ctx 已 scale 到合成尺寸并居中） */
const Canvas2D: React.FC<{t: number; draw: (ctx: CanvasRenderingContext2D, t: number) => void}> = ({t, draw}) => {
  const {width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const s = Math.max(width / DW, height / DH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(s, 0, 0, s, (width - DW * s) / 2, (height - DH * s) / 2);
    draw(ctx, t);
  }, [t, draw, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />;
};

const DUST = Array.from({length: 60}, (_, i) => ({x: rnd(i, 1) * DW, y: rnd(i, 2) * DH, r: 1.2 + rnd(i, 3), v: 4 + rnd(i, 4) * 4, ph: rnd(i, 5) * 6.28}));
const drawDust = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const p of DUST) {
    const y = ((((p.y - t * p.v) % 560) + 560) % 560) - 10;
    const x = p.x + Math.sin(t * 0.3 + p.ph) * 14;
    ctx.globalAlpha = 0.12 + 0.13 * (0.5 + 0.5 * Math.sin(t * 0.8 + p.ph));
    ctx.fillStyle = '#cfe3ff';
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};
const drawDots = (ctx: CanvasRenderingContext2D, t: number) => {
  ctx.fillStyle = '#0b0c11';
  ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const phase = ((t % 14) / 14) * 1700 - 300; // 斜向波前，14s 一过
  for (let y = 18; y < DH; y += 36) {
    for (let x = 24; x < DW; x += 36) {
      const d = Math.abs(x + y * 0.6 - phase);
      const k = Math.max(0, 1 - d / 280);
      const kk = k * k;
      const edge = Math.min(1, Math.max(0, 1.25 - Math.hypot((x - 480) / 560, (y - 270) / 360)));
      ctx.globalAlpha = (0.2 + 0.6 * kk) * edge;
      ctx.fillStyle = '#cfe0ff';
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + 0.5 * kk, 0, 6.283);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

/* ------------------------------------------------------------------ CSS 款（设计坐标盒内） */
const ORBS_DARK = [
  {c: 'rgba(60,110,255,.55)', s: 520, T: 30, cx: 300, cy: 200, rx: 180, ry: 110},
  {c: 'rgba(150,80,255,.45)', s: 460, T: 45, cx: 640, cy: 330, rx: 200, ry: 120},
  {c: 'rgba(40,200,190,.35)', s: 420, T: 38, cx: 520, cy: 120, rx: 150, ry: 90},
];
const GLASS_BLOBS = [
  {c: '#7aa7ff', s: 420, T: 28, cx: 260, cy: 300, rx: 160, ry: 110},
  {c: '#ffa3c4', s: 380, T: 40, cx: 680, cy: 200, rx: 170, ry: 100},
  {c: '#8fe3cf', s: 340, T: 34, cx: 560, cy: 420, rx: 140, ry: 80},
];
const Blobs: React.FC<{t: number; spec: typeof ORBS_DARK; blur: number; opacity: number}> = ({t, spec, blur, opacity}) => (
  <>
    {spec.map((b, i) => {
      const a = (t / b.T) * 6.283 * (i % 2 ? -1 : 1) + i * 2;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: b.s,
            height: b.s,
            borderRadius: '50%',
            background: b.c,
            filter: `blur(${blur}px)`,
            opacity,
            transform: `translate(${b.cx + Math.cos(a) * b.rx - b.s / 2}px, ${b.cy + Math.sin(a) * b.ry - b.s / 2}px)`,
          }}
        />
      );
    })}
  </>
);
const GRID_BG = (line: string) =>
  `linear-gradient(${line} 1px, transparent 1px) 0 0 / 100px 100px, linear-gradient(90deg, ${line} 1px, transparent 1px) 0 0 / 100px 100px`;

/* ------------------------------------------------------------------ 主组件 */
export const Backdrop: React.FC<BackdropProps> = ({kind = DEFAULT_LIGHT, speed = 1.5, grain = true, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame / fps) * speed;
  const dark = isDarkKind(kind);
  const drawDustCb = useMemo(() => drawDust, []);
  const drawDotsCb = useMemo(() => drawDots, []);

  let body: React.ReactNode = null;
  let grainOpacity = dark ? 0.06 : 0.09;
  let grainBlend: React.CSSProperties['mixBlendMode'] = 'overlay';

  switch (kind) {
    case 'mesh-flow-dark':
    case 'aurora-veil':
    case 'pastel-mesh-flow':
    case 'iridescent-sheen':
      body = <GlBackdrop frag={FRAG[kind]} t={t} />;
      break;
    case 'ink-wash':
      body = <GlBackdrop frag={FRAG[kind]} t={t} />;
      grainOpacity = 0.1;
      grainBlend = 'multiply';
      break;
    case 'beams-grid':
      body = (
        <DesignBox>
          <div style={fill({background: '#08090d'})} />
          <div
            style={fill({
              background: GRID_BG('rgba(255,255,255,.06)'),
              WebkitMaskImage: 'radial-gradient(120% 90% at 50% 60%, #000 25%, transparent 80%)',
              maskImage: 'radial-gradient(120% 90% at 50% 60%, #000 25%, transparent 80%)',
              transform: 'perspective(700px) rotateX(48deg) translateY(120px) scale(1.6)',
              transformOrigin: '50% 100%',
            })}
          />
          <div style={fill({background: 'radial-gradient(60% 45% at 50% 0%, rgba(120,170,255,.18), transparent 70%)'})} />
        </DesignBox>
      );
      break;
    case 'spotlight-stage': {
      const a1 = (t / 40) * 6.283;
      const a2 = (t / 55) * 6.283;
      body = (
        <>
          <DesignBox>
            <div style={fill({background: 'radial-gradient(140% 130% at 50% 50%, #14151b 0%, #0c0d11 60%, #07080b 100%)'})} />
            <div style={fill({background: `radial-gradient(65% 70% at ${50 + Math.sin(a1) * 9}% ${42 + Math.cos(a1) * 6}%, rgba(41,151,255,.14), transparent 65%)`})} />
            <div style={fill({background: `radial-gradient(55% 60% at ${44 + Math.cos(a2) * 12}% ${60 + Math.sin(a2) * 8}%, rgba(255,200,150,.05), transparent 65%)`})} />
          </DesignBox>
          <Canvas2D t={t} draw={drawDustCb} />
        </>
      );
      break;
    }
    case 'dot-field-wave':
      body = <Canvas2D t={t} draw={drawDotsCb} />;
      break;
    case 'orbs-dark':
      body = (
        <DesignBox>
          <div style={fill({background: '#0b0d14'})} />
          <Blobs t={t} spec={ORBS_DARK} blur={70} opacity={1} />
        </DesignBox>
      );
      break;
    case 'paper-grain': {
      const k = (Math.sin((t / 60) * 6.283) + 1) / 2;
      body = (
        <DesignBox>
          <div style={fill({background: 'linear-gradient(180deg, #f8f6f1, #f3f0e8)'})} />
          <div style={fill({background: `radial-gradient(70% 80% at ${20 + k * 60}% ${25 + Math.sin((t / 60) * 6.283 * 2) * 6}%, rgba(255,255,255,.7), transparent 70%)`})} />
        </DesignBox>
      );
      grainOpacity = 0.12;
      grainBlend = 'multiply';
      break;
    }
    case 'grid-spot-light': {
      const a = (t / 45) * 6.283;
      const x = 50 + Math.cos(a) * 26;
      const y = 45 + Math.sin(a) * 18;
      const mask = `radial-gradient(60% 70% at ${x}% ${y}%, #000 20%, transparent 75%)`;
      body = (
        <DesignBox>
          <div style={fill({background: '#f5f6f8'})} />
          <div style={fill({background: GRID_BG('rgba(29,29,31,.055)'), WebkitMaskImage: mask, maskImage: mask})} />
          <div style={fill({background: `radial-gradient(55% 60% at ${x}% ${y}%, rgba(120,180,255,.22), transparent 70%)`})} />
        </DesignBox>
      );
      break;
    }
    case 'glass-blobs':
      body = (
        <DesignBox>
          <div style={fill({background: '#fafafc'})} />
          <Blobs t={t} spec={GLASS_BLOBS} blur={40} opacity={0.8} />
          <div style={fill({background: 'rgba(255,255,255,.55)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)'})} />
        </DesignBox>
      );
      break;
    default:
      body = null;
  }

  return (
    <AbsoluteFill style={{background: dark ? '#0b0b0f' : '#fbfbfd', overflow: 'hidden', ...style}}>
      {body}
      {grain && <Grain opacity={grainOpacity} blend={grainBlend} />}
    </AbsoluteFill>
  );
};

export default Backdrop;
