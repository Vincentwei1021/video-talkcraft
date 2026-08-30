"""关卡 1.5：音效两查——在场（solo 轨）+ 可听（最终混音）。

solo 模式（在场性，防文件名打错/音量为零/被裁掉）：
  1) 渲一条纯音效轨（人声静默）：
     npx remotion render src/entry.ts <Comp> out/sfx-solo.wav --props='{"sfxSolo":true}' --codec=wav
     （工程里主音轨要支持 sfxSolo inputProp：`{!getInputProps().sfxSolo && <Audio src=.../>}`）
  2) python3 scripts/sfx_check.py out/sfx-solo.wav cues.json
  判定：每条 cue 在 [t−0.05, t+0.45] 窗口内峰值 RMS ≥ −45 dBFS（**绝对阈**。
  旧版"≥ 底噪+12dB"是相对判法，solo 轨底噪是 −120dB 的数字静音，任何非零音量都能过——
  57/57"在场"但全片听不见一记，2026-08-30 翻车实录）。另报电平分布：
  中位 cue 峰值应落 [−30, −10] dBFS，出区间告警（WARN 不挡关，但要说得出理由）。

mix 模式（可听度，交付前对最终混音跑；这是"耳听"的机器替身——agent 听不了成品）：
  python3 scripts/sfx_check.py --mix delivery.mp4 audio/full.wav cues.json
  原理：FFT 找人声在混音里的延迟 → 逐 0.2s 窗最小二乘减去人声 → 残差≈音效轨；
  每条 cue 按残差峰值与同窗人声电平分级：
    UNMASKED  人声局部安静（<−40dB）且残差 ≥ −38 dBFS —— 观众一定听得到
    AUDIBLE   残差峰值 ≥ 人声局部 RMS − 6dB —— 压在语音上仍可闻
    MASKED    其余 —— 被人声掩蔽，等于没放
  门槛（按良品 deepseek-harness-v4 实测标定，2026-08-30）：
    FAIL 若 MASKED 比例 > 50%；
    FAIL 若 UNMASKED 数 < max(3, 片长/30s) —— 良品在句间隙出声 7/19 处，坏片 0/39。
  实操含义：转场/镜头边界的 cue 要落在句间 ~0.3s 气口里，别全埋进语音。

两个模式的输入都走 ffmpeg 解码（mp4/wav/mp3 皆可直接传）。
"""
import json
import subprocess
import sys

import numpy as np

SR = 16000


def decode(path: str) -> np.ndarray:
    """任意音频/视频文件 → 16k 单声道 float64（借道 ffmpeg，管线里必有）。"""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(SR),
         "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0


def db(x) -> float:
    return float(20 * np.log10(max(float(x), 1e-7)))


def peak_rms(x: np.ndarray, t0: float, t1: float, win_s: float = 0.05) -> float:
    a, b = max(0, int(t0 * SR)), min(len(x), int(t1 * SR))
    seg = x[a:b]
    win = int(win_s * SR)
    if len(seg) <= win:
        return float(np.sqrt(np.mean(seg**2) + 1e-14)) if len(seg) else 1e-7
    hop = win // 2
    return max(
        float(np.sqrt(np.mean(seg[i:i + win] ** 2) + 1e-14))
        for i in range(0, len(seg) - win, hop)
    )


def solo_mode(wav_path: str, cues_path: str) -> int:
    x = decode(wav_path)
    cues = json.load(open(cues_path))
    bad, peaks = 0, []
    for c in cues:
        p = db(peak_rms(x, c["t"] - 0.05, c["t"] + 0.45))
        peaks.append(p)
        ok = p >= -45.0
        bad += 0 if ok else 1
        print(f"{'OK  ' if ok else 'MISS'} t={c['t']:>8.3f}  {p:6.1f} dBFS  {c.get('note', '')}")
    med = float(np.median(peaks)) if peaks else -120.0
    if not -30.0 <= med <= -10.0:
        print(f"WARN 中位 cue 峰值 {med:.1f} dBFS 出了 [−30, −10] 参考区间（良品口径）")
    print(f"\n{'PASS' if bad == 0 else 'FAIL'}: {len(cues) - bad}/{len(cues)} cues present"
          f"（中位峰值 {med:.1f} dBFS）")
    return 0 if bad == 0 else 1


def mix_mode(mix_path: str, voice_path: str, cues_path: str) -> int:
    mix, voi = decode(mix_path), decode(voice_path)
    # 人声在混音里的延迟（±2s 搜索，前 60s 足够）
    N = min(len(mix), len(voi), 60 * SR)
    A, B = np.fft.rfft(mix[:N], 2 * N), np.fft.rfft(voi[:N], 2 * N)
    xc = np.fft.irfft(A * np.conj(B))
    xc = np.concatenate([xc[-N:], xc[:N]])
    lags = np.arange(-N, N)
    m = np.abs(lags) <= 2 * SR
    lag = int(lags[m][np.argmax(xc[m])])
    voi = np.concatenate([np.zeros(max(0, lag)), voi])[max(0, -lag):]
    n = min(len(mix), len(voi))
    mix, voi = mix[:n], voi[:n]
    print(f"voice lag in mix: {lag / SR * 1000:+.1f} ms")

    # 逐窗最小二乘减人声（窗级增益自适应 ducking/归一化）
    w = int(0.2 * SR)
    res = np.empty(n)
    for i in range(0, n, w):
        mm, vv = mix[i:i + w], voi[i:i + w]
        d = float(vv @ vv)
        a = min(max(float(mm @ vv) / d, 0.0), 3.0) if d > 1e-8 else 0.0
        res[i:i + w] = mm - a * vv

    cues = json.load(open(cues_path))
    counts = {"UNMASKED": 0, "AUDIBLE": 0, "MASKED": 0}
    for c in cues:
        t0, t1 = c["t"] - 0.05, c["t"] + 0.45
        r = db(peak_rms(res, t0, t1))
        a, b = max(0, int(t0 * SR)), min(n, int(t1 * SR))
        v = db(np.sqrt(np.mean(voi[a:b] ** 2) + 1e-14))
        if v < -40.0 and r >= -38.0:
            klass = "UNMASKED"
        elif r >= v - 6.0:
            klass = "AUDIBLE"
        else:
            klass = "MASKED"
        counts[klass] += 1
        print(f"{klass:8s} t={c['t']:>8.3f}  sfx {r:6.1f} dB / voice {v:6.1f} dB  {c.get('note', '')}")

    total = max(1, len(cues))
    dur = n / SR
    need_unmasked = max(3, int(dur / 30))
    masked_ratio = counts["MASKED"] / total
    fails = []
    if masked_ratio > 0.5:
        fails.append(f"MASKED 比例 {masked_ratio:.0%} > 50%")
    if counts["UNMASKED"] < need_unmasked:
        fails.append(f"UNMASKED 仅 {counts['UNMASKED']} 条 < 门槛 {need_unmasked}（片长 {dur:.0f}s）")
    print(f"\nUNMASKED {counts['UNMASKED']} / AUDIBLE {counts['AUDIBLE']} / MASKED {counts['MASKED']}"
          f"（共 {len(cues)} 条）")
    print("PASS" if not fails else "FAIL: " + "；".join(fails))
    return 0 if not fails else 1


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--mix":
        return mix_mode(args[1], args[2], args[3])
    return solo_mode(args[0], args[1])


if __name__ == "__main__":
    sys.exit(main())
