import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {timing, CharStamp} from './timing';
import {C, FONT} from './theme';

type Phrase = {chars: CharStamp[]; start: number; end: number};

const BREAKS = new Set(['，', '。', '？', '！', '；', '：', '、']);

// Pre-split every scene's text into phrases at punctuation so the subtitle
// line stays short. Times are absolute seconds from the ASR alignment.
const buildPhrases = (): Phrase[] => {
  const phrases: Phrase[] = [];
  for (const scene of timing.scenes) {
    let current: CharStamp[] = [];
    for (const c of scene.chars) {
      current.push(c);
      if (BREAKS.has(c.ch) && current.some((x) => x.ch.trim() && !BREAKS.has(x.ch))) {
        phrases.push({
          chars: current,
          start: current[0].t,
          end: current[current.length - 1].e,
        });
        current = [];
      }
    }
    if (current.some((x) => x.ch.trim() && !BREAKS.has(x.ch))) {
      phrases.push({
        chars: current,
        start: current[0].t,
        end: current[current.length - 1].e,
      });
    }
  }
  return phrases;
};

type KeywordRun = {from: number; to: number; at: number}; // char index range [from, to) + 语音锚点秒

// 在一个 phrase 里找关键词的字符区间（每个 phrase 只取首次出现），锚点 = 首字的 ASR 时间戳。
const findRuns = (phrase: Phrase, keywords: string[]): KeywordRun[] => {
  const text = phrase.chars.map((c) => c.ch).join('');
  const runs: KeywordRun[] = [];
  for (const kw of keywords) {
    const i = text.indexOf(kw);
    if (i >= 0) runs.push({from: i, to: i + kw.length, at: phrase.chars[i].t});
  }
  return runs;
};

/**
 * 底部跟读字幕 · 素排版（2026-08-27 用户定版）。
 * 铁律：不加任何动效——整句硬现、整句硬走，无淡入淡出、无逐字上色、无 pop、无浮动。
 * 唯一例外是 keywords prop（keyword-pop-highlight）：关键词在自己的语音时间戳处
 * 弹一下并换强调色，全片最多 3 个；超过必须显式传 allowExtraKeywordPops（仅限用户明确要求）。
 * 默认参数 = design-language §5 横屏红线（bottom 100 / 字号 44、>24 字降 38 / maxWidth 66%）；
 * 竖屏传 bottom={350} maxWidth="90%"。
 */
export const Subtitles: React.FC<{
  bottom?: number;
  fontSize?: number;
  maxWidth?: number | string;
  /** 关键词弹出（keyword-pop-highlight）用的词表；每词按 phrase 文本连续匹配 */
  keywords?: string[];
  /** 关键词 >3 个时的显式放行开关，只在用户明确要求更多时打开 */
  allowExtraKeywordPops?: boolean;
  accent?: string;
}> = ({
  bottom = 100,
  fontSize = 44,
  maxWidth = '66%',
  keywords = [],
  allowExtraKeywordPops = false,
  accent = C.cyan,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const phrases = useMemo(buildPhrases, []);

  const allRuns = useMemo(() => {
    const map = new Map<Phrase, KeywordRun[]>();
    let total = 0;
    for (const p of phrases) {
      const runs = findRuns(p, keywords);
      if (runs.length) {
        map.set(p, runs);
        total += runs.length;
      }
    }
    if (total > 3 && !allowExtraKeywordPops) {
      throw new Error(
        `Subtitles: keyword-pop 命中 ${total} 处，超过全片上限 3 次。` +
          `减少 keywords，或在用户明确要求更多时传 allowExtraKeywordPops。`
      );
    }
    return map;
  }, [phrases, keywords, allowExtraKeywordPops]);

  const phrase = phrases.find((p) => t >= p.start && t < p.end + 0.3);
  if (!phrase) return null;

  const runs = allRuns.get(phrase) ?? [];
  const runOf = (i: number) => runs.find((r) => i >= r.from && i < r.to);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          marginBottom: bottom,
          padding: '14px 42px',
          borderRadius: 14,
          background: 'rgba(7, 11, 20, 0.72)',
          border: `1px solid ${C.line}`,
          fontFamily: FONT.cn,
          fontSize: phrase.chars.length > 24 ? Math.round(fontSize * 0.86) : fontSize,
          fontWeight: 600,
          letterSpacing: 2,
          maxWidth,
          textAlign: 'center',
          color: C.text,
        }}
      >
        {phrase.chars.map((c, i) => {
          const run = runOf(i);
          let scale = 1;
          let popped = false;
          if (run && t >= run.at) {
            popped = true;
            const since = t - run.at;
            // keyword-pop-highlight 落到字幕上的适配：整句先素排可读，
            // 关键词到自己的语音时间戳才弹（1→1.65 punch 0.18s → 回落 1.15 带过冲 0.22s），
            // 之后保持 1.15 + 强调色常驻。
            scale =
              since < 0.18
                ? interpolate(since, [0, 0.18], [1, 1.65], {easing: Easing.out(Easing.quad)})
                : since < 0.4
                  ? interpolate(since, [0.18, 0.3, 0.4], [1.65, 1.08, 1.15], {
                      easing: Easing.inOut(Easing.quad),
                      extrapolateRight: 'clamp',
                    })
                  : 1.15;
          }
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                color: popped ? accent : undefined,
                fontWeight: popped ? 700 : undefined,
                transform: scale !== 1 ? `scale(${scale})` : undefined,
              }}
            >
              {/* inline-block span 里普通空格塌为零宽（英文短语会连成一串），换 NBSP */}
              {c.ch === ' ' ? ' ' : c.ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
