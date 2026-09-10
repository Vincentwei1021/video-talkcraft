#!/usr/bin/env python3
"""配音预剪：剪掉口水词（嗯 / 呃 / 额 / 那个…）、重说结巴与过长停顿，输出干净配音 + 可复用的剪辑单（EDL）。

跑在 ② 字级时间戳**之前**——剪完的音频才是后面所有环节的"配音输入"；时间戳做完再剪会让 timing / beats 全体错位。
TTS 配音没有口水词，但常有过长气口，同样可以只压停顿。

    # 1) 先只看报告（不写文件）：口播稿在手时用它当真值，剪得最保守
    python3 scripts/voice_trim.py audio/raw.wav script.json --dry-run
    # 2) 认可后落盘：干净配音 + cuts.json（EDL）；人物视频若与配音同一条录音，用同一 EDL 一起剪（音画同长）
    python3 scripts/voice_trim.py audio/raw.wav script.json --out audio/full.wav \
        [--video dh/host_raw.mp4 --video-out dh/host.mp4]
    # 3) 之后照常：timestamps_cpu.py audio/full.wav script.json audio/timestamps.json

词表来源（三选一，缺省跑 ASR）：
    缺省          复用 timestamps_cpu.py 的后端（FireRedASR2-CTC 默认 / --backend whisper），逐 token 带时间
    --srt x.srt   剪映 / whisper 等导出的字幕；**必须是逐字（字级）SRT**——句级 SRT 只能定位到句、口水词切点不可靠（脚本会警告）
    --words x.json  词级 JSON：timestamps.json 同 schema（{sentences:[{words}]}）/ 扁平 [{text,start,end}] / whisper 的 {segments:[{words:[{word,start,end}]}]}

判定规则（口播稿是真值，宁漏勿错）：
    有稿：ASR 词表与稿子做字符级 difflib 对齐（键 = 繁简归一 + 无声调拼音，同 timestamps_cpu），只有**稿子里没有的插入段**（insert）
          才是候选；候选段文本全由口水词表拼成 → filler；等于紧邻的稿子文本 → repeat（结巴 / 重说）；
          其余插入段（改了措辞的重说、ASR 幻觉）只报告不剪，`--cut-unmatched` 才剪。replace 段（ASR 听错稿子里的字）永不剪——
          剪它等于剪掉稿子里那个字的真实发音（"安全"听成"啊全"，"啊"不是口水词）。
    无稿：只剪整 token 恰好是保守词表（嗯 / 呃 / 额 / 唔 / um / uh…）的，以及紧邻完全重复的短 token（结巴）。
    停顿：帧 RMS（10ms，5 帧中值平滑）低于"语音电平 90 分位 − 35dB"（同 timestamps_cpu 切段阈值，配音响度不同不用调）的连续段
          ≥ --min-pause（0.7s）压到 --keep-pause（0.35s）：保留段内**最安静的一窗真实房间音**，不是补数字零；
          口水词剪掉后与前后静音合并成的空洞按同一规则压；首尾留白各 --head / --tail。
    切点：口水词的 ASR 边界（CTC 尖峰）会咬到邻字，先在 ±0.3s 内找能量谷再切；最后全部吸附到 --fps 帧网格
          （同一 EDL 剪视频时音画逐帧同长；0 = 不吸附）；拼接处 3ms 淡变防爆音，不做交叠（交叠会改时长）。

输出：
    --out   干净配音 wav（采样率同源）；--edl 缺省写到 --out 同目录 cuts.json：
            {source, sr, fps, src_total, out_total, removed, cuts:[{start,end,kind,text,conf}], keep:[{src_start,src_end,dst_start}]}
            keep 表可把源时间轴上的任意时刻映射到新时间轴（dst = dst_start + (t − src_start)）。
    --video / --video-out   用同一 EDL 剪人物视频：帧号 select（切点已在帧网格上）、丢原音轨（干净配音是主）、
            .webm → VP9 yuva420p 保透明，其他 → libx264 crf18；剪完 ffprobe 数帧断言 == 期望帧数。

依赖：pip install numpy soundfile（读 mp3 失败时自动走 ffmpeg 解码）+ 按词表来源：sherpa-onnx / faster-whisper / 无。
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import timestamps_cpu as tc  # noqa: E402  复用 ASR 后端 + 归一化 + 匹配键

# 有稿时的词表可以宽（候选已经限定在"稿子里没有"的插入段里，说了稿外的"然后 / 这个"就是口水）；
# 无稿时只敢用窄表（"然后 / 对 / 这个"在正常语句里太常见）。
FILLERS_SCRIPT = ["嗯", "呃", "额", "唔", "呣", "啊", "哦", "呀", "哎", "唉", "诶", "呐", "嘛", "那个", "这个", "就是", "然后", "对", "对吧", "um", "uh", "er", "erm", "hmm", "em"]
FILLERS_SAFE = ["嗯", "呃", "额", "唔", "呣", "um", "uh", "er", "erm", "hmm", "em"]

HOP_MS = 10.0


# ---------------------------------------------------------------- 音频 / 能量
def load_audio(path: str):
    """→ (mono float32, sr)。soundfile 读不了的格式（部分 mp3/m4a）退到 ffmpeg 解码。"""
    try:
        import soundfile as sf
        x, sr = sf.read(path, dtype="float32", always_2d=True)
        return np.ascontiguousarray(x.mean(axis=1) if x.shape[1] > 1 else x[:, 0]), int(sr)
    except Exception:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-f", "wav", tmp.name], check=True)
            import soundfile as sf
            x, sr = sf.read(tmp.name, dtype="float32", always_2d=True)
        os.unlink(tmp.name)
        return np.ascontiguousarray(x[:, 0]), int(sr)


def frame_db(x: np.ndarray, sr: int, hop_ms: float = HOP_MS) -> np.ndarray:
    hop = max(1, int(sr * hop_ms / 1000))
    nfr = max(1, len(x) // hop)
    rms = np.sqrt(np.mean(x[: nfr * hop].reshape(nfr, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    if nfr >= 5:  # 5 帧中值：滤掉单帧咔哒，不糊掉真实起音
        pad = np.pad(db, 2, mode="edge")
        db = np.median(np.lib.stride_tricks.sliding_window_view(pad, 5), axis=1)
    return db


def silence_threshold(db: np.ndarray, rel_db: float) -> float:
    return max(float(np.percentile(db, 90)) - rel_db, -60.0)


def silent_runs(db: np.ndarray, thr: float, hop_s: float, min_len: float) -> list[tuple[float, float]]:
    sil = db < thr
    runs, i, n = [], 0, len(sil)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * hop_s >= min_len:
                runs.append((i * hop_s, j * hop_s))
            i = j
        else:
            i += 1
    return runs


def quietest_window(db: np.ndarray, hop_s: float, a: float, b: float, length: float) -> tuple[float, float]:
    """[a,b] 内能量最低的一窗 length 秒（不够长就整段）。"""
    ia, ib = int(round(a / hop_s)), int(round(b / hop_s))
    w = max(1, int(round(length / hop_s)))
    if ib - ia <= w:
        return a, b
    seg = db[ia:ib]
    cs = np.concatenate([[0.0], np.cumsum(seg)])
    sums = cs[w:] - cs[:-w]
    k = int(np.argmin(sums))
    return (ia + k) * hop_s, (ia + k + w) * hop_s


def energy_valley(db: np.ndarray, hop_s: float, lo: float, hi: float, fallback: float) -> tuple[float, float]:
    """[lo,hi] 内能量谷的时刻及其 dB；窗空返回 fallback。"""
    ia, ib = int(round(lo / hop_s)), int(round(hi / hop_s))
    ia, ib = max(0, ia), min(len(db), ib)
    if ib - ia < 1:
        return fallback, float("inf")
    k = int(np.argmin(db[ia:ib]))
    return (ia + k) * hop_s, float(db[ia + k])


# ---------------------------------------------------------------- 词表来源
def parse_srt(path: str) -> list[dict]:
    txt = Path(path).read_text(encoding="utf-8-sig")
    ts = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)")
    words: list[dict] = []
    for block in re.split(r"\n\s*\n", txt.strip()):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        m = None
        for k, ln in enumerate(lines[:2]):
            m = ts.search(ln)
            if m:
                text = " ".join(lines[k + 1:])
                break
        if not m:
            continue
        g = [int(v) for v in m.groups()]
        start = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / (1000 if len(m.group(4)) == 3 else 10 ** len(m.group(4)))
        end = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / (1000 if len(m.group(8)) == 3 else 10 ** len(m.group(8)))
        text = re.sub(r"<[^>]+>|\{[^}]+\}", "", text).strip()
        if text:
            words.append({"text": text, "start": start, "end": end})
    return words


def load_words_json(path: str) -> list[dict]:
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(d, dict) and "sentences" in d:  # timestamps.json 同 schema
        return [dict(w) for s in d["sentences"] for w in s.get("words", [])]
    if isinstance(d, dict) and "segments" in d:  # whisper json
        out = []
        for seg in d["segments"]:
            for w in seg.get("words", []):
                out.append({"text": (w.get("word") or w.get("text") or "").strip(), "start": w["start"], "end": w["end"]})
        return out
    if isinstance(d, list):
        return [{"text": w.get("text") or w.get("word"), "start": w["start"], "end": w["end"]} for w in d]
    sys.exit(f"--words 不认识的结构：{path}")


def load_script(path: str) -> list[str]:
    raw = Path(path).read_text(encoding="utf-8")
    if path.endswith(".json"):
        d = json.loads(raw)
        sents = d["sentences"] if isinstance(d, dict) else d
        return [s if isinstance(s, str) else s["text"] for s in sents]
    # txt / md：每行一句，跳过标题与空行
    return [ln.strip() for ln in raw.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]


# ---------------------------------------------------------------- 判定
def flatten_asr_indexed(words: list[dict]) -> list[dict]:
    """ASR 词表 → 字符表 [{norm, raw, start, end, tok}]，词内逐字符均分时间（同 timestamps_cpu.flatten_asr，多带原字与 token 号）。"""
    out = []
    for ti, w in enumerate(words):
        if w["end"] - w["start"] <= 0.01:
            continue
        text = re.sub(r"\d+", lambda m: tc.num2cn(m.group()), str(w["text"]))
        chars = [(c, tc.norm_char(c)) for c in text]
        chars = [(c, n) for c, n in chars if n]
        if not chars:
            continue
        span = (w["end"] - w["start"]) / len(chars)
        for k, (c, n) in enumerate(chars):
            out.append({"norm": n, "raw": c, "start": w["start"] + k * span, "end": w["start"] + (k + 1) * span, "tok": ti})
    return out


def keys_of(text: str) -> tuple:
    """字符串 → 逐字匹配键元组（繁简归一 + 无声调拼音；拉丁逐字母）。用元组而不是拼接串，"恩"(en) 不会被拆成 "e"+"n" 误配。"""
    return tuple(tc.match_key(n) for n in (tc.norm_char(c) for c in text) if n)


def lexicon_keys(lexicon: list[str]) -> list[tuple]:
    return sorted({keys_of(e) for e in lexicon if keys_of(e)}, key=len, reverse=True)


def lexicon_cover(seq: tuple, lex: list[tuple]) -> bool:
    """序列能否被词表条目（贪心最长）完整拼出——"嗯嗯" / "呃那个" 算，"啊全" 不算。"""
    i, n = 0, len(seq)
    while i < n:
        for e in lex:
            if seq[i:i + len(e)] == e:
                i += len(e)
                break
        else:
            return False
    return True


def peel_fillers(seq: tuple, lex: list[tuple]) -> tuple:
    """从两端剥掉词表条目，返回剩余核心（"嗯我们" → "我们"）。"""
    changed = True
    while changed and seq:
        changed = False
        for e in lex:
            if seq[:len(e)] == e:
                seq, changed = seq[len(e):], True
            if seq and seq[-len(e):] == e:
                seq, changed = seq[:-len(e)], True
    return seq


def detect_with_script(sentences: list[str], words: list[dict], lexicon: list[str], cut_unmatched: bool):
    script = tc.flatten_script(sentences)        # [(si, ci, norm)]
    asr = flatten_asr_indexed(words)
    s_norm = [c for _, _, c in script]
    a_norm = [c["norm"] for c in asr]
    lex = lexicon_keys(lexicon)
    sm = difflib.SequenceMatcher(a=[tc.match_key(c) for c in s_norm], b=[tc.match_key(c) for c in a_norm], autojunk=False)
    cands, notes = [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal" or j2 <= j1:
            continue
        run = asr[j1:j2]
        raw = "".join(c["raw"] for c in run)
        norm = "".join(c["norm"] for c in run)
        if tag == "replace":  # ASR 听错稿子里的字：不是多说的，不剪
            notes.append({"kind": "mismatch", "start": run[0]["start"], "end": run[-1]["end"],
                          "text": raw, "script": "".join(sentences_slice(script, sentences, i1, i2))})
            continue
        # insert：稿子里没有的多说段
        seq = tuple(tc.match_key(c["norm"]) for c in run)
        conf_hint = None
        if lexicon_cover(seq, lex):
            kind = "filler"
        else:
            core = peel_fillers(seq, lex)
            k = len(core)
            nxt = tuple(tc.match_key(c) for c in s_norm[i1:i1 + k])
            prv = tuple(tc.match_key(c) for c in s_norm[max(0, i1 - k):i1])
            if k and (core == nxt or core == prv):
                kind = "repeat"
            elif len(seq) <= 2 and any(lexicon_cover((ch,), lex) for ch in seq):
                kind, conf_hint = "filler", "low"   # "问嗯"：ASR 给口水词粘了个噪声字——两字以内、含口水字，按口水剪但标低置信
            else:
                kind = "extra"
        cands.append({"kind": kind, "start": run[0]["start"], "end": run[-1]["end"], "text": raw, "conf_hint": conf_hint,
                      "cut": kind in ("filler", "repeat") or cut_unmatched,
                      "prev_bound": asr[j1 - 1]["start"] + 0.05 if j1 > 0 else 0.0,
                      "next_bound": asr[j2]["end"] - 0.05 if j2 < len(asr) else float("inf")})
    return cands, notes


def sentences_slice(script, sentences, i1, i2):
    return [sentences[si][ci] for si, ci, _ in script[i1:i2]]


def detect_without_script(words: list[dict], lexicon: list[str]):
    cands = []
    lex = lexicon_keys(lexicon)
    toks = [w for w in words if w["end"] - w["start"] > 0.01 and str(w["text"]).strip()]
    for i, w in enumerate(toks):
        text = str(w["text"]).strip()
        seq = keys_of(text)
        if not seq:
            continue
        kind = None
        if lexicon_cover(seq, lex):
            kind = "filler"
        elif i + 1 < len(toks) and len(seq) <= 3 and tc.CJK.search(text) and seq == keys_of(str(toks[i + 1]["text"])):
            kind = "repeat"
        if kind:
            cands.append({"kind": kind, "start": w["start"], "end": w["end"], "text": text, "cut": True, "conf_hint": None,
                          "prev_bound": toks[i - 1]["start"] + 0.05 if i > 0 else 0.0,
                          "next_bound": toks[i + 1]["end"] - 0.05 if i + 1 < len(toks) else float("inf")})
    return cands, []


# ---------------------------------------------------------------- 切点
def refine_cut(c: dict, db: np.ndarray, hop_s: float, thr: float, search: float = 0.30, inner: float = 0.12):
    """口水词的 ASR 边界（CTC 尖峰）在 ±search 内找能量谷；谷真在静音里才用它，否则退回尖峰位置——
    左端保留尖峰（多留一点口水词的起音，不咬前字），右端退 40ms（CTC 尖峰略晚于下一字起音，退一点不咬下一字）。
    两端都落在静音里 → conf high。"""
    lo = max(c["prev_bound"], c["start"] - search)
    s, sdb = energy_valley(db, hop_s, lo, min(c["start"] + inner, c["end"]), c["start"])
    hi = min(c["next_bound"], c["end"] + search)
    e, edb = energy_valley(db, hop_s, max(c["end"] - inner, s), hi, c["end"])
    c["raw_start"], c["raw_end"] = c["start"], c["end"]
    c["start"] = s if sdb < thr else c["start"]
    c["end"] = e if edb < thr else max(c["start"] + 0.04, c["end"] - 0.04)
    c["conf"] = "high" if (sdb < thr and edb < thr and not c.get("conf_hint")) else "low"
    return c


def merge_intervals(iv: list[tuple[float, float]]) -> list[tuple[float, float]]:
    out: list[list[float]] = []
    for a, b in sorted(iv):
        if out and a <= out[-1][1] + 1e-9:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out]


def plan_cuts(total: float, fillers: list[dict], db: np.ndarray, hop_s: float, thr: float, *,
              min_pause: float, keep_pause: float, head: float, tail: float, do_pauses: bool) -> list[dict]:
    cuts: list[dict] = []
    F = [(c["start"], c["end"]) for c in fillers if c["cut"] and c["end"] - c["start"] >= 0.04]
    if not do_pauses:
        for c in fillers:
            if c["cut"] and c["end"] - c["start"] >= 0.04:
                cuts.append(dict(start=c["start"], end=c["end"], kind=c["kind"], text=c["text"], conf=c.get("conf", "")))
        return cuts
    S = silent_runs(db, thr, hop_s, min_len=0.10)
    zones = merge_intervals(S + F)
    for za, zb in zones:
        inF = [(max(za, a), min(zb, b)) for a, b in F if b > za and a < zb]
        fill_len = sum(b - a for a, b in inF)
        z_len = zb - za
        label = "/".join(c["text"] for c in fillers if c["cut"] and c["end"] > za and c["start"] < zb)
        # 首尾留白
        if za <= 1e-6 and not inF:
            if z_len > head:
                cuts.append(dict(start=0.0, end=zb - head, kind="pause", text="片头留白", conf="high"))
            continue
        if zb >= total - 2 * hop_s and not inF:  # 帧化后末帧对不齐 total，留 2 帧余量
            if z_len > tail:
                cuts.append(dict(start=za + tail, end=total, kind="pause", text="片尾留白", conf="high"))
            continue
        if not inF and z_len < min_pause:
            continue
        # 可保留的真实房间音：zone 减去口水词后的静音子段，取最长一段里最安静的一窗
        sil_parts = subtract(za, zb, inF)
        keep_len = keep_pause if (z_len - fill_len) >= keep_pause else max(0.0, z_len - fill_len)
        if sil_parts and keep_len > 0:
            pa, pb = max(sil_parts, key=lambda p: p[1] - p[0])
            ka, kb = quietest_window(db, hop_s, pa, pb, min(keep_len, pb - pa))
        else:
            ka, kb = za, za  # 全是口水词、没有静音可留
        inK = {c["kind"] for c in fillers if c["cut"] and c["end"] > za and c["start"] < zb}
        base = "repeat" if inK == {"repeat"} else ("extra" if inK == {"extra"} else "filler")
        kind = "pause" if not inF else (base if (z_len - fill_len) < min_pause else f"{base}+pause")
        text = label if inF else f"{z_len:.2f}s→{kb - ka:.2f}s"
        if inF:
            text = f"{label}（{z_len:.2f}s→{kb - ka:.2f}s）"
        for a, b in ((za, ka), (kb, zb)):
            if b - a >= 0.02:
                cuts.append(dict(start=a, end=b, kind=kind, text=text,
                                 conf=min((c.get("conf", "high") for c in fillers if c["cut"] and c["end"] > za and c["start"] < zb), default="high")))
    return cuts


def subtract(a: float, b: float, holes: list[tuple[float, float]]) -> list[tuple[float, float]]:
    parts, cur = [], a
    for ha, hb in sorted(holes):
        if ha > cur:
            parts.append((cur, ha))
        cur = max(cur, hb)
    if b > cur:
        parts.append((cur, b))
    return [(x, y) for x, y in parts if y - x > 1e-6]


def quantize(cuts: list[dict], fps: float, total: float) -> list[dict]:
    out = []
    for c in sorted(cuts, key=lambda c: c["start"]):
        if fps > 0:
            fs, fe = int(round(c["start"] * fps)), int(round(c["end"] * fps))
            if fe <= fs:
                continue
            s, e = fs / fps, fe / fps
        else:
            s, e = c["start"], c["end"]
        s, e = max(0.0, s), min(total, e)
        if e <= s:
            continue
        if out and s <= out[-1]["end"] + 1e-9:  # 吸附后相邻 / 交叠 → 合并
            out[-1]["end"] = max(out[-1]["end"], e)
            if c["text"] not in out[-1]["text"]:
                out[-1]["text"] = f'{out[-1]["text"]} + {c["text"]}'
            if c["kind"] != out[-1]["kind"]:
                out[-1]["kind"] = "mixed"
            continue
        out.append({**c, "start": s, "end": e})
    return out


# ---------------------------------------------------------------- 应用
def apply_audio(x: np.ndarray, sr: int, cuts: list[dict], fade_ms: float = 3.0):
    keep, cur, total = [], 0.0, len(x) / sr
    for c in cuts:
        if c["start"] > cur:
            keep.append((cur, c["start"]))
        cur = max(cur, c["end"])
    if total > cur:
        keep.append((cur, total))
    fade = max(1, int(sr * fade_ms / 1000))
    ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)
    segs, table, dst = [], [], 0.0
    for k, (a, b) in enumerate(keep):
        seg = x[int(round(a * sr)): int(round(b * sr))].copy()
        if len(seg) > 2 * fade:
            if k > 0:
                seg[:fade] *= ramp
            if k < len(keep) - 1:
                seg[-fade:] *= ramp[::-1]
        segs.append(seg)
        table.append({"src_start": round(a, 4), "src_end": round(b, 4), "dst_start": round(dst, 4)})
        dst += len(seg) / sr
    y = np.concatenate(segs) if segs else np.zeros(0, dtype=np.float32)
    return y, table


def probe_video(path: str) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
                          "-show_entries", "stream=r_frame_rate,avg_frame_rate,nb_read_frames,pix_fmt,width,height",
                          "-show_entries", "format=duration", "-of", "json", path], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    st = d["streams"][0]
    num, den = st["r_frame_rate"].split("/")
    return {"fps": float(num) / float(den), "frames": int(st.get("nb_read_frames") or 0), "pix_fmt": st.get("pix_fmt", ""),
            "duration": float(d["format"]["duration"]), "avg": st.get("avg_frame_rate", "")}


def apply_video(src: str, dst: str, cuts: list[dict], fps: float, audio_total: float) -> None:
    info = probe_video(src)
    if abs(info["fps"] - fps) > 0.01:
        sys.exit(f"视频 {src} 帧率 {info['fps']:.3f} ≠ --fps {fps}：切点网格对不上，先按 preflight 的口径统一 fps（禁 -r 直转）")
    if abs(info["duration"] - audio_total) > 1.5 / fps:
        print(f"⚠ 视频 {info['duration']:.3f}s 与配音 {audio_total:.3f}s 不同长（差 {info['duration'] - audio_total:+.3f}s）："
              f"同一 EDL 只对同一条录音成立，剪完请跑 preflight.py --media-only 核时长", file=sys.stderr)
    ranges = [(int(round(c["start"] * fps)), int(round(c["end"] * fps))) for c in cuts]  # [a, b) 帧号
    removed = sum(b - a for a, b in ranges)
    expect = info["frames"] - removed
    expr = "+".join(f"between(n\\,{a}\\,{b - 1})" for a, b in ranges if b > a) or "0"
    ext = Path(dst).suffix.lower()
    if ext == ".webm":
        codec = ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-row-mt", "1"]
    elif ext == ".mov" and "a" in info["pix_fmt"].replace("yuv", ""):
        codec = ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le"]
    else:
        codec = ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write(f"select='not({expr})',setpts=N/FRAME_RATE/TB")
        script = f.name
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_script:v", script, "-an", "-r", str(fps), *codec, dst], check=True)
    finally:
        os.unlink(script)
    got = probe_video(dst)["frames"]
    if got != expect:
        sys.exit(f"FAIL 视频帧数断言：{dst} 实数 {got} 帧 ≠ 期望 {expect}（源 {info['frames']} − 剪 {removed}）")
    print(f"视频：{src} {info['frames']}f → {dst} {got}f（剪 {removed}f，帧数断言通过）")


# ---------------------------------------------------------------- 主流程
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("script", nargs="?", help="口播稿 script.json / txt / md（有它才能精确判定口水词；无稿只剪保守词表）")
    ap.add_argument("--out", help="干净配音输出 wav")
    ap.add_argument("--edl", help="剪辑单 JSON（缺省 <out 目录>/cuts.json）")
    ap.add_argument("--dry-run", action="store_true", help="只打印报告；给了 --edl 也写 EDL")
    src = ap.add_argument_group("词表来源（缺省跑 ASR）")
    src.add_argument("--srt")
    src.add_argument("--words")
    src.add_argument("--backend", default="firered", choices=["firered", "whisper"])
    src.add_argument("--model-dir", default="")
    src.add_argument("--model", default="small")
    src.add_argument("--chunk-sec", type=float, default=75.0)
    rule = ap.add_argument_group("判定")
    rule.add_argument("--fillers", help="逗号分隔，覆盖内置口水词表")
    rule.add_argument("--cut-unmatched", action="store_true", help="有稿时连稿子里没有、也不是口水/重说的插入段一起剪（改了措辞的重说）")
    rule.add_argument("--no-repeats", action="store_true", help="不剪结巴 / 重说")
    rule.add_argument("--no-pauses", action="store_true", help="不动停顿，只剪口水词")
    rule.add_argument("--min-pause", type=float, default=0.70, help="≥ 此长的静音才压（s）")
    rule.add_argument("--keep-pause", type=float, default=0.35, help="压到多长（s）")
    rule.add_argument("--head", type=float, default=0.25, help="片头留白（s）")
    rule.add_argument("--tail", type=float, default=0.50, help="片尾留白（s）")
    rule.add_argument("--sil-db", type=float, default=35.0, help="静音阈值 = 语音电平 90 分位以下多少 dB")
    rule.add_argument("--fps", type=float, default=30.0, help="切点吸附帧网格；0 不吸附")
    vid = ap.add_argument_group("同录人物视频")
    vid.add_argument("--video")
    vid.add_argument("--video-out")
    a = ap.parse_args()

    if not a.dry_run and not a.out:
        ap.error("要落盘给 --out，只看报告给 --dry-run")
    if a.video and not a.video_out:
        ap.error("--video 需配 --video-out")
    if a.video and a.fps <= 0:
        ap.error("剪视频必须吸附帧网格：--fps 给视频帧率")

    x, sr = load_audio(a.audio)
    total = len(x) / sr
    hop_s = HOP_MS / 1000
    db = frame_db(x, sr)
    thr = silence_threshold(db, a.sil_db)

    # 词表
    if a.srt:
        words = parse_srt(a.srt)
        cjk_lens = [len([c for c in w["text"] if tc.CJK.match(c)]) for w in words]
        if cjk_lens and float(np.median(cjk_lens)) > 4:
            print(f"⚠ {a.srt} 看着是句级字幕（中位 {np.median(cjk_lens):.0f} 字/条），口水词切点只能均分估算、不可靠——"
                  f"建议不给 --srt 让脚本自己跑 ASR，或导出逐字 SRT", file=sys.stderr)
        source = f"srt:{a.srt}"
    elif a.words:
        words = load_words_json(a.words)
        source = f"words:{a.words}"
    else:
        if a.backend == "firered":
            mdir = a.model_dir or tc.DEFAULT_FIRERED_DIR
            if not Path(f"{mdir}/model.int8.onnx").is_file():
                sys.exit(f"firered 模型不在 {mdir}（下载地址见 timestamps_cpu.py 头注释），或 --backend whisper")
            words = tc.asr_firered(a.audio, mdir, a.chunk_sec)
        else:
            words = tc.asr_whisper(a.audio, a.model)
        source = f"asr:{a.backend}"
    if not words:
        sys.exit("词表为空——音频里没有语音？")

    sentences = load_script(a.script) if a.script else None
    if a.fillers is not None:
        lexicon = [s.strip() for s in a.fillers.split(",") if s.strip()]
    else:
        lexicon = FILLERS_SCRIPT if sentences else FILLERS_SAFE
    if sentences:
        cands, notes = detect_with_script(sentences, words, lexicon, a.cut_unmatched)
    else:
        cands, notes = detect_without_script(words, lexicon)
    if a.no_repeats:
        for c in cands:
            if c["kind"] == "repeat":
                c["cut"] = False
    for c in cands:
        if c["cut"]:
            refine_cut(c, db, hop_s, thr)

    cuts = plan_cuts(total, cands, db, hop_s, thr, min_pause=a.min_pause, keep_pause=a.keep_pause,
                     head=a.head, tail=a.tail, do_pauses=not a.no_pauses)
    cuts = quantize(cuts, a.fps, total)
    removed = sum(c["end"] - c["start"] for c in cuts)

    # —— 报告 ——
    mode = "有稿（稿子为真值）" if sentences else f"无稿（保守词表 {'/'.join(lexicon[:5])}…）"
    print(f"配音预剪 · {a.audio} {total:.2f}s · 词表 {source} {len(words)} token · {mode} · 静音阈 {thr:.1f}dBFS · 网格 {a.fps:g}fps")
    kinds = {}
    for c in cuts:
        kinds[c["kind"]] = kinds.get(c["kind"], 0) + 1
        flag = "  ← 切点未落在静音里，听一下" if c.get("conf") == "low" else ""
        print(f"  [{c['kind']:<12}] {c['start']:8.3f}–{c['end']:8.3f}  −{c['end'] - c['start']:.2f}s  {c['text']}{flag}")
    skipped = [c for c in cands if not c["cut"]]
    for c in skipped:
        print(f"  [skip:{c['kind']:<7}] {c['start']:8.3f}–{c['end']:8.3f}   稿子里没有但未剪：「{c['text']}」"
              + ("（--cut-unmatched 才剪）" if c["kind"] == "extra" else "（--no-repeats）"))
    for n in notes[:20]:
        print(f"  [asr≠稿  ] {n['start']:8.3f}–{n['end']:8.3f}   听成「{n['text']}」稿是「{n['script']}」（不剪）")
    if len(notes) > 20:
        print(f"  … 另 {len(notes) - 20} 处 ASR 与稿不一致（不剪）")
    summary = " · ".join(f"{k} {v}" for k, v in kinds.items()) or "无"
    print(f"→ 剪 {len(cuts)} 段（{summary}）共 −{removed:.2f}s：{total:.2f}s → {total - removed:.2f}s")

    edl_path = a.edl or (str(Path(a.out).with_name("cuts.json")) if a.out else None)
    y, table = apply_audio(x, sr, cuts)
    edl = {"source": a.audio, "words": source, "script": a.script, "sr": sr, "fps": a.fps,
           "src_total": round(total, 4), "out_total": round(len(y) / sr, 4), "removed": round(removed, 4),
           "params": {"min_pause": a.min_pause, "keep_pause": a.keep_pause, "head": a.head, "tail": a.tail, "sil_db": a.sil_db,
                      "fillers": lexicon, "cut_unmatched": a.cut_unmatched, "repeats": not a.no_repeats, "pauses": not a.no_pauses},
           "cuts": [{**c, "start": round(c["start"], 4), "end": round(c["end"], 4)} for c in cuts],
           "skipped": [{"kind": c["kind"], "start": round(c["start"], 3), "end": round(c["end"], 3), "text": c["text"]} for c in skipped],
           "keep": table}
    if a.dry_run:
        if a.edl:
            Path(a.edl).write_text(json.dumps(edl, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"dry-run：EDL 已写 {a.edl}，音频未动")
        else:
            print("dry-run：未写任何文件（认可后去掉 --dry-run 加 --out）")
        return
    import soundfile as sf
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, y, sr, subtype="PCM_16")
    Path(edl_path).write_text(json.dumps(edl, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {a.out}（{len(y) / sr:.2f}s, {sr}Hz）· EDL {edl_path}")
    if a.video:
        apply_video(a.video, a.video_out, cuts, a.fps, total)


if __name__ == "__main__":
    main()
