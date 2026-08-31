"""词落点 lint——画面节拍必须与字级时间戳一致，禁止手敲秒数。

用法：
  python3 scripts/beat_lint.py remotion/beats.json audio/timestamps.json \
      [--tol 0.10] [--shots shots.json] [--tail 0.5]

beats.json 由实现时随手落（SHOTBOOK 节拍表与它保持一致）：
  [{"t": 绝对秒, "anchor": "锚字（该句文本的连续子串）", "sentence": 句号, "what": "动效说明"}]

判定一（词落点）：每条 beat 的 t 与锚字首字的词级 start 之差 |Δ| ≤ tol。
默认 tol=0.10s；FireRed 后端字级对齐最大误差 ~0.2s，有依据时可 --tol 0.20。
锚字在句里出现多次时取距 t 最近的一次；没写 sentence 就全片搜。
手敲近似秒数曾把"啪、啪、啪"的画面做早 2 秒——静帧 QA 永远看不见这类错位（2026-08-30 实战教训）。

判定二（镜尾保护带，--shots 时启用，2026-09-01 定版）：锚点距所在镜头出点必须 ≥ tail（默认 0.5s），
否则动效落点会被转场吞掉——"第四条评论只活 0.2s""停靠环只可辨 0.3s"是同一类翻车的两案。
shots.json 格式：[{"id": "s08", "start": 64.7, "end": 68.68}, ...]（与分镜表同源导出）。
"""
import json
import sys


def char_times(sentence: dict) -> list[tuple[str, float]]:
    """展开 words（CJK 逐字 + 拉丁整段 token）成 (char, start) 序列。"""
    out = []
    for w in sentence["words"]:
        for ch in w["text"]:
            out.append((ch, w["start"]))
    return out


def anchor_starts(sentence: dict, anchor: str) -> list[float]:
    chars = char_times(sentence)
    text = "".join(c for c, _ in chars)
    starts, pos = [], text.find(anchor)
    while pos != -1:
        starts.append(chars[pos][1])
        pos = text.find(anchor, pos + 1)
    return starts


def main() -> int:
    beats_path, ts_path = sys.argv[1], sys.argv[2]
    tol = float(sys.argv[sys.argv.index("--tol") + 1]) if "--tol" in sys.argv else 0.10
    tail = float(sys.argv[sys.argv.index("--tail") + 1]) if "--tail" in sys.argv else 0.5
    shots = json.load(open(sys.argv[sys.argv.index("--shots") + 1])) if "--shots" in sys.argv else None
    beats = json.load(open(beats_path))
    sentences = json.load(open(ts_path))["sentences"]

    bad = 0
    for b in beats:
        if shots:
            sh = next((s for s in shots if s["start"] <= b["t"] < s["end"]), None)
            if sh and sh["end"] - b["t"] < tail:
                print(f"FAIL t={b['t']:>8.3f} 「{b['anchor']}」距镜尾({sh.get('id','?')} end {sh['end']})"
                      f"仅 {sh['end'] - b['t']:.2f}s < {tail}s——会被转场吞，提前或挪镜  {b.get('what', '')}")
                bad += 1
                continue
        pool = [sentences[b["sentence"]]] if "sentence" in b else sentences
        cands = [t for s in pool for t in anchor_starts(s, b["anchor"])]
        if not cands:
            print(f"MISS t={b['t']:>8.3f} 「{b['anchor']}」不在" +
                  (f"第 {b['sentence']} 句里" if "sentence" in b else "任何句子里") +
                  f"  {b.get('what', '')}")
            bad += 1
            continue
        best = min(cands, key=lambda t: abs(t - b["t"]))
        dt = b["t"] - best
        ok = abs(dt) <= tol
        bad += 0 if ok else 1
        print(f"{'OK  ' if ok else 'FAIL'} t={b['t']:>8.3f} 「{b['anchor']}」"
              f"词起 {best:.3f}  Δ{dt:+.3f}s  {b.get('what', '')}")
    print(f"\n{'PASS' if bad == 0 else 'FAIL'}: {len(beats) - bad}/{len(beats)} beats 对齐"
          f"（tol {tol}s）")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
