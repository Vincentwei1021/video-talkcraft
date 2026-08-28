#!/usr/bin/env python3
"""口播音频 + 口播稿 → 字级时间戳（本机 CPU，无 GPU 依赖）。

    # 默认后端：FireRedASR2-CTC int8（sherpa-onnx）——尾部最稳、零误报；模型 767MB 手动下载一次，
    # 放 ~/.cache/koubo/sherpa-onnx-fire-red-asr2-ctc-zh_en-int8-2026-02-25/（或用 --model-dir 指路）
    python3 scripts/timestamps_cpu.py audio/full.wav script.json audio/timestamps.json
    # 备选（安装最轻，不用手动下模型）：faster-whisper small/int8——首跑自动下载 460MB
    python3 scripts/timestamps_cpu.py audio/full.wav script.json audio/timestamps.json --backend whisper

- 输入音频：与最终成片同一条配音（wav/mp3 均可，两个后端都内部重采样）。
- 输入文本：script.json（取 sentences: [str, ...]）或纯文本（每行一句）。
  **数字必须写汉字**（对齐按文本逐字锚定，"197747" 无法与"十九万七千"的读音对位）。
- 输出 timestamps.json，与服务器版 ForcedAligner 同 schema：
    {sr, total, sentences: [{i, text, start, end, asr, match, ok,
                             words: [{text, start, end}, ...]}]}
  words = CJK 逐字 token + 拉丁/数字整段 token（标点跳过）——scripts/make_timing.py 直接可吃。

依赖：pip install zhconv pypinyin + 按后端：pip install sherpa-onnx soundfile numpy（firered，默认）
或 pip install faster-whisper（--backend whisper）。zhconv/pypinyin 缺了也能跑但锚点大量流失
（ASR 随机吐繁体、同音字错写是常态）。

方法：ASR 出带时间的词表 → 与口播稿做字符级序列对齐（difflib），匹配键 =
繁简归一 + 数字转中文读法 + **无声调拼音**（同音字不算错，与 GPU ForcedAligner 质检同哲学）；
拉丁词（各家 ASR 都常拼错）与未匹配字符在相邻锚点间线性插值；零时长 token（对齐失败标记）丢弃，
偏离左右锚点线性预期 >0.8s 的离群锚降级为插值。每句 match = CJK 锚点覆盖率，
match < 0.90 标 ok=false —— 人工听那一句核实。

四配置实测（2026-08-28，Apple Silicon CPU / 110s 中英混合口播 20 句，
对照 GPU Qwen3-ForcedAligner 逐句对齐真值；CJK 字级 |Δstart|，n=472）：

| 配置 | 中位 | p95 | 最大 | match误报 | 推理 | 模型+环境 |
|---|---|---|---|---|---|---|
| FireRedASR2-CTC int8（推荐） | 40ms | 100ms | **200ms** | **0** | 24s | 767MB+103MB |
| faster-whisper small/int8 | 20ms | 140ms | 413ms | 2 句边缘 | 26s | 464MB+231MB |
| Qwen3-ASR-0.6B+Aligner-0.6B | 20ms | **60ms** | 293ms | 0 | 78s+载入34s | 3.5GB+1.5GB(torch) |
| Qwen3-Aligner 纯对齐(已知稿) | 20ms | **60ms** | 360ms | 0 | **9.8s**+载入17s | 1.7GB+1.5GB |

选型判词：30fps 一帧 33ms，中位差异无感，**尾部才是风险**（动效挂错字）——FireRed 最大 200ms(6帧)
最稳且零误报（汉字数字/CJK 极干净，拉丁烂但本管线只用 CJK 锚）；whisper 安装最轻但尾部 12 帧 +
2 个边缘误报；Qwen 栈分布最优、转写质量最好（数字/品牌词/标点全对）但 5GB 体积 + torch，
追求极致或已有权重时用（已知稿走纯对齐器最快）。
FireRed 模型下载（GitHub 慢时用 HF 镜像）：
  https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-fire-red-asr2-ctc-zh_en-int8-2026-02-25.tar.bz2
  https://huggingface.co/csukuangfj2/sherpa-onnx-fire-red-asr2-ctc-zh_en-int8-2026-02-25（model.int8.onnx + tokens.txt）

坑：whisper **不要传 initial_prompt**（喂口播稿进 prompt 会让前几段整段幻觉错位）；
Qwen 对齐器在拉丁逐字母拼读段（"dsh"）会产出零时长 FAIL token 并把邻字拽偏 1.5s
（本文件的零时长丢弃 + 离群剔除已兜住，293ms 封顶）。
"""
from __future__ import annotations

import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

CJK = re.compile(r"[一-鿿㐀-䶿]")
LATIN = re.compile(r"[A-Za-z0-9]")
# ASR 会把汉字数字转写成阿拉伯数字（"十四天"→"14天"）——逐位映射回汉字当对齐锚
DIGIT2CN = str.maketrans("0123456789", "零一二三四五六七八九")

# whisper 会随机整段吐繁体（"会话日志"→"會話日誌"），繁简不归一直接丢锚点
try:
    from zhconv import convert as _zhconv

    def t2s(ch: str) -> str:
        return _zhconv(ch, "zh-cn")
except ImportError:  # 没装 zhconv 也能跑，只是繁体段落锚点变少
    def t2s(ch: str) -> str:
        return ch

# whisper 同音字错写是常态（"插件"→"差见"），匹配键用**无声调拼音**——
# 服务器版质检"同音字不算错"的同一哲学（多音字两边同函数转换，误选也一致）
try:
    from functools import lru_cache

    from pypinyin import lazy_pinyin

    @lru_cache(maxsize=8192)
    def match_key(ch: str) -> str:
        return lazy_pinyin(ch)[0] if CJK.match(ch) else ch
except ImportError:  # 没装 pypinyin 退回字符精确匹配，同音字段落锚点变少
    def match_key(ch: str) -> str:
        return ch


def norm_char(ch: str) -> str:
    """半角化 + 小写 + 繁→简 + 数字归一到汉字；返回 '' 表示不参与对齐（标点/空白）。"""
    ch = unicodedata.normalize("NFKC", ch).lower()
    if len(ch) != 1:  # NFKC 可能展开（如 ㍿）；口播稿里不会有，防御性取首字符
        ch = ch[0]
    ch = t2s(ch).translate(DIGIT2CN)
    if len(ch) != 1:
        ch = ch[0]
    if CJK.match(ch) or LATIN.match(ch):
        return ch
    return ""


def flatten_script(sentences: list[str]):
    """口播稿 → 参与对齐的字符表 [(sent_i, char_i_in_text, norm_char)]。"""
    out = []
    for si, text in enumerate(sentences):
        for ci, ch in enumerate(text):
            n = norm_char(ch)
            if n:
                out.append((si, ci, n))
    return out


def num2cn(s: str) -> str:
    """阿拉伯数字串 → 中文读法（≤8 位；'14'→'十四'、'7000'→'七千'），锚点匹配用。"""
    if not s.isdigit() or len(s) > 8 or int(s) == 0:
        return s.translate(DIGIT2CN)
    D, U = "零一二三四五六七八九", ["", "十", "百", "千"]
    def sec(part: str) -> str:
        out, n = "", len(part)
        for i, ch in enumerate(part):
            d = int(ch)
            if d == 0:
                if out and not out.endswith("零") and any(c != "0" for c in part[i + 1:]):
                    out += "零"
            else:
                out += D[d] + U[n - 1 - i]
        return out
    if len(s) <= 4:
        r = sec(s)
    else:
        hi, lo = s[:-4], s[-4:]
        r = sec(hi) + "万"
        if int(lo):
            r += ("零" if lo[0] == "0" else "") + sec(lo)
    return r[1:] if r.startswith("一十") else r


def flatten_asr(words):
    """ASR 词表 → 字符表 [(norm_char, start, end)]，词内逐字符均分时间。
    ASR 把汉字数字转写成阿拉伯数字——先转回中文读法再拆字，数字钩子句才有锚点。"""
    out = []
    for w in words:
        if w["end"] - w["start"] <= 0.01:
            continue  # 零时长 token = 对齐失败标记（Qwen aligner 的 FAIL 项），当锚有毒
        text = re.sub(r"\d+", lambda m: num2cn(m.group()), w["text"])
        chars = [norm_char(c) for c in text]
        chars = [c for c in chars if c]
        if not chars:
            continue
        span = (w["end"] - w["start"]) / len(chars)
        for k, c in enumerate(chars):
            out.append((c, w["start"] + k * span, w["start"] + (k + 1) * span))
    return out


def align(sentences: list[str], asr_words: list[dict]) -> dict:
    """核心对齐：口播稿句子 + 任意 ASR 词表（[{text,start,end}]）→ timestamps payload。
    ASR 后端可换（faster-whisper / FireRed CTC / Qwen3 栈…），只要给出带时间的词表。"""
    script_chars = flatten_script(sentences)
    asr_chars = flatten_asr(asr_words)

    sm = difflib.SequenceMatcher(
        a=[match_key(c) for _, _, c in script_chars],
        b=[match_key(c) for c, _, _ in asr_chars],
        autojunk=False,
    )
    # 每个口播稿字符 → (start, end) 或 None；anchored 记录谁拿到了直接锚点
    times: list = [None] * len(script_chars)
    anchored = [False] * len(script_chars)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (asr_chars[blk.b + k][1], asr_chars[blk.b + k][2])
            anchored[blk.a + k] = True

    # 锚点离群剔除：偏离左右锚点线性预期 >0.8s 的锚降级为插值
    #（实测案例：Qwen 对齐器在 "dsh" 逐字母拼读段把相邻的"是"拽偏 1.5s——
    #  局部失锚比无锚更毒，动效会挂在错的字上）
    anchors = [i for i, t in enumerate(times) if t is not None]
    drops = []
    for k in range(1, len(anchors) - 1):
        p, i, n = anchors[k - 1], anchors[k], anchors[k + 1]
        if times[n][0] <= times[p][1]:
            continue
        frac = (i - p) / (n - p)
        expect = times[p][1] + (times[n][0] - times[p][1]) * frac
        if abs(times[i][0] - expect) > 0.8:
            drops.append(i)
    for i in drops:  # 两遍：评估用快照，剔除后再统一处理（边删边比会踩空邻居）
        times[i] = None
        anchored[i] = False

    # 未匹配字符：在最近的左右锚点之间线性插值
    anchors = [i for i, t in enumerate(times) if t is not None]
    if not anchors:
        sys.exit("对齐失败：口播稿与 ASR 无任何匹配——稿子和音频对得上吗？")
    for i, t in enumerate(times):
        if t is not None:
            continue
        left = max((a for a in anchors if a < i), default=None)
        right = min((a for a in anchors if a > i), default=None)
        if left is None:
            t0 = max(0.0, times[right][0] - 0.1 * (right - i))
            times[i] = (t0, times[right][0])
        elif right is None:
            t1 = times[left][1] + 0.1 * (i - left)
            times[i] = (times[left][1], t1)
        else:
            span = (times[right][0] - times[left][1]) / (right - left)
            times[i] = (times[left][1] + span * (i - left - 1), times[left][1] + span * (i - left))

    # 回填成句级 words（CJK 逐字、拉丁/数字连段合并，标点跳过）
    per_sent: dict[int, list] = {si: [] for si in range(len(sentences))}
    for (si, ci, nc), (t0, t1), anc in zip(script_chars, times, anchored):
        per_sent[si].append((ci, t0, t1, anc, bool(CJK.match(nc))))

    out_sents = []
    for si, text in enumerate(sentences):
        rows = per_sent[si]
        if not rows:
            out_sents.append({"i": si, "text": text, "start": 0, "end": 0, "asr": "",
                              "match": 0.0, "ok": False, "words": []})
            continue
        idx = {r[0]: (r[1], r[2]) for r in rows}
        words, run, run_t = [], "", None
        for ci, ch in enumerate(text):
            if ci in idx and LATIN.match(unicodedata.normalize("NFKC", ch)):
                run += ch
                run_t = (run_t[0], idx[ci][1]) if run_t else idx[ci]
                continue
            if run:
                words.append({"text": run, "start": round(run_t[0], 3), "end": round(run_t[1], 3)})
                run, run_t = "", None
            if ci in idx and CJK.match(ch):
                words.append({"text": ch, "start": round(idx[ci][0], 3), "end": round(idx[ci][1], 3)})
        if run:
            words.append({"text": run, "start": round(run_t[0], 3), "end": round(run_t[1], 3)})
        start, end = rows[0][1], rows[-1][2]
        # 句级 match = 锚点覆盖率：该句 CJK 字里拿到直接 ASR 锚点（非插值）的比例。
        # **只算 CJK**——拉丁词/专名 ASR 常拼错（Koishi→coise 之类）但不影响锚点，
        # 算进去全是误报；CJK 太少（<5）的句子退回全字符口径。
        cjk_rows = [r for r in rows if r[4]]
        base = cjk_rows if len(cjk_rows) >= 5 else rows
        match = sum(1 for r in base if r[3]) / len(base)
        out_sents.append({
            "i": si, "text": text, "start": round(start, 3), "end": round(end, 3),
            "asr": "", "match": round(match, 3), "ok": match >= 0.90, "words": words,
        })
        flag = "" if match >= 0.90 else "   ← match<0.90，人工听核这一句"
        print(f"[{si:2d}] {start:7.2f}–{end:7.2f}  match={match:.2f}{flag}  {text[:24]}")

    total = out_sents[-1]["end"] if out_sents else 0
    return {"sr": 16000, "total": round(total, 3), "sentences": out_sents}


def asr_whisper(audio_path: str, model_name: str) -> list[dict]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    # 不传 initial_prompt！实测把口播稿喂进 prompt 会让前几段直接幻觉错位
    #（首段转写出第二句的内容、时间全错）；裸转写反而又准又稳。
    segments, _ = model.transcribe(audio_path, language="zh", word_timestamps=True)
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"text": w.word.strip(), "start": w.start, "end": w.end})
    return words


def asr_firered(audio_path: str, model_dir: str) -> list[dict]:
    import numpy as np
    import sherpa_onnx
    import soundfile as sf

    rec = sherpa_onnx.OfflineRecognizer.from_fire_red_asr_ctc(
        model=f"{model_dir}/model.int8.onnx", tokens=f"{model_dir}/tokens.txt", num_threads=4)
    audio, sr = sf.read(audio_path, dtype="float32", always_2d=True)
    stream = rec.create_stream()
    stream.accept_waveform(sample_rate=sr, waveform=np.ascontiguousarray(audio[:, 0]))
    rec.decode_stream(stream)
    r = stream.result
    words, times = [], list(r.timestamps)
    for k, (tok, ts) in enumerate(zip(r.tokens, times)):
        tok = tok.replace("▁", " ").strip()
        if not tok:
            continue
        end = times[k + 1] if k + 1 < len(times) else ts + 0.2
        end = min(end, ts + 0.6)  # 长静音前的 token 不吃整段静音
        words.append({"text": tok, "start": float(ts), "end": float(end)})
    return words


DEFAULT_FIRERED_DIR = str(Path.home() / ".cache/koubo/sherpa-onnx-fire-red-asr2-ctc-zh_en-int8-2026-02-25")


def main() -> None:
    argv = sys.argv[1:]
    model_name, backend, model_dir = "small", "firered", ""
    for flag in ("--model", "--backend", "--model-dir"):
        if flag in argv:
            i = argv.index(flag)
            v = argv[i + 1]
            del argv[i:i + 2]
            if flag == "--model":
                model_name = v
            elif flag == "--backend":
                backend = v
            else:
                model_dir = v
    if len(argv) != 3:
        sys.exit(__doc__)
    audio_path, script_path, out_path = argv

    raw = Path(script_path).read_text(encoding="utf-8")
    if script_path.endswith(".json"):
        sentences = json.loads(raw)["sentences"]
    else:
        sentences = [ln.strip() for ln in raw.splitlines() if ln.strip()]

    if backend == "firered":
        model_dir = model_dir or DEFAULT_FIRERED_DIR
        if not Path(f"{model_dir}/model.int8.onnx").is_file():
            sys.exit(
                f"firered 模型不在 {model_dir}\n"
                "下载一次（GitHub 慢时用 HF 镜像，两个文件放进该目录即可）：\n"
                "  https://huggingface.co/csukuangfj2/sherpa-onnx-fire-red-asr2-ctc-zh_en-int8-2026-02-25\n"
                "  （model.int8.onnx + tokens.txt）；或改用 --backend whisper（免手动下载）")
        asr_words = asr_firered(audio_path, model_dir)
    else:
        asr_words = asr_whisper(audio_path, model_name)
    if not asr_words:
        sys.exit("ASR 没有产出任何词——检查音频路径/内容")

    payload = align(sentences, asr_words)
    Path(out_path).write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [s["i"] for s in payload["sentences"] if not s["ok"]]
    print(f"\n→ {out_path}  ({len(payload['sentences'])} 句, backend={backend}"
          f"{'' if backend != 'whisper' else '/' + model_name})")
    if bad:
        print(f"⚠ 待人工核句: {bad}")


if __name__ == "__main__":
    main()
