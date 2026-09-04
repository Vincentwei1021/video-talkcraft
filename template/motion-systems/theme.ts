export const C = {
  bg: '#070B14',
  bgPanel: 'rgba(13, 20, 36, 0.88)',
  cyan: '#5EE1FF',
  gold: '#FFC94D',
  red: '#FF5A6E',
  green: '#63E6A4',
  text: '#EAF0FA',
  dim: '#8FA0BC',
  line: 'rgba(94, 225, 255, 0.16)',
};

export const FONT = {
  cn: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  mono: 'Menlo, "SF Mono", "Cascadia Code", monospace',
};

export const gridBg: React.CSSProperties = {
  backgroundColor: C.bg,
  backgroundImage:
    `linear-gradient(${C.line} 1px, transparent 1px),` +
    `linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
  backgroundSize: '72px 72px',
};

/** 幕底 token（design-language §1.1，2026-09-05 用户选定 12 款）：场景整幕 `<Backdrop kind={bg.light} />`；
 *  按幕替换时在 SHOTBOOK §0 声明。全部 kind 见 backdrop.tsx 的 BackdropKind。 */
export const bg = {light: 'pastel-mesh-flow', dark: 'mesh-flow-dark'} as const;
