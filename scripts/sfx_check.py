"""关卡 1.5：音效在场检查。

用法：
  1) 渲一条纯音效轨（人声静默）：
     npx remotion render src/entry.ts <Comp> out/sfx-solo.wav --props='{"sfxSolo":true}' --codec=wav
     （工程里主音轨要支持 sfxSolo inputProp：`{!getInputProps().sfxSolo && <Audio src=.../>}`）
  2) python3 scripts/sfx_check.py out/sfx-solo.wav cues.json
     cues.json = [{"t": 1.015, "note": "..."}, ...]（可由 sfx.ts 正则导出）

判定：每条 cue 在 [t−0.05, t+0.45] 窗口内的峰值 RMS 必须显著高于全轨底噪
（>= 底噪 + 12dB），否则报 MISSING——名字打错/音量为零/被裁掉的 cue 都会在这里现形。
"""
import json
import sys
import wave

import numpy as np


def main() -> int:
    wav_path, cues_path = sys.argv[1], sys.argv[2]
    with wave.open(wav_path, "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        ch = w.getnchannels()
        width = w.getsampwidth()
        raw = w.readframes(n)
    dtype = {1: np.int8, 2: np.int16, 4: np.int32}[width]
    x = np.frombuffer(raw, dtype=dtype).astype(np.float64)
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    x /= float(np.iinfo(dtype).max)

    win = int(0.05 * sr)
    hop = win // 2
    frames = np.array([
        np.sqrt(np.mean(x[i:i + win] ** 2) + 1e-12)
        for i in range(0, len(x) - win, hop)
    ])
    floor_db = 20 * np.log10(np.percentile(frames[frames > 0], 20))

    cues = json.load(open(cues_path))
    bad = 0
    for c in cues:
        a = max(0, int((c["t"] - 0.05) * sr))
        b = min(len(x), int((c["t"] + 0.45) * sr))
        seg = x[a:b]
        peak_rms = max(
            np.sqrt(np.mean(seg[i:i + win] ** 2) + 1e-12)
            for i in range(0, max(1, len(seg) - win), hop)
        )
        db = 20 * np.log10(peak_rms)
        ok = db >= floor_db + 12
        if not ok:
            bad += 1
        print(f"{'OK  ' if ok else 'MISS'} t={c['t']:>8.3f}  {db:6.1f}dB (floor {floor_db:.1f})  {c.get('note', '')}")
    print(f"\n{'PASS' if bad == 0 else 'FAIL'}: {len(cues) - bad}/{len(cues)} cues present")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
