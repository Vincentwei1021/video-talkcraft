#!/usr/bin/env python3
"""Fish Audio TTS with Streaming Timestamps for video-talkcraft.

Generates synchronized voiceover audio (WAV/MP3) and word-level timestamps.json
from script.json using Fish Audio's text-to-speech API (default model: s2.1-pro-free).

Usage:
    python scripts/tts_fishaudio.py script.json audio/full.wav audio/timestamps.json
    python scripts/tts_fishaudio.py script.json audio/full.wav audio/timestamps.json --timing-out audio/timing.json

Configuration:
    Provide credentials via .env file or environment variables:
        FISH_AUDIO_API_KEY=your_token_here
        FISH_AUDIO_REFERENCE_ID=optional_voice_model_id
        FISH_AUDIO_MODEL=s2.1-pro-free
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

API_URL = "https://api.fish.audio/v1/tts/stream/with-timestamp"
DEFAULT_MODEL = "s2.1-pro-free"
DEFAULT_FORMAT = "mp3"
DEFAULT_LATENCY = "balanced"


def load_env():
    """Load variables from .env if present."""
    env_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for p in env_paths:
        if p.is_file():
            try:
                import dotenv
                dotenv.load_dotenv(p)
                return
            except ImportError:
                # Fallback simple parser
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
                return


def load_script(path: Path) -> List[str]:
    """Read sentences from a script.json or text file."""
    if not path.exists():
        raise FileNotFoundError(f"Script file not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "sentences" in data:
            return [s.strip() for s in data["sentences"] if s.strip()]
        elif isinstance(data, list):
            return [s.strip() for s in data if isinstance(s, str) and s.strip()]
        else:
            raise ValueError("Invalid script.json: expected {'sentences': [...]} or array of strings")
    else:
        # Plain text
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]


def call_fish_audio_stream(
    text: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    reference_id: Optional[str] = None,
    format_type: str = DEFAULT_FORMAT,
    latency: str = DEFAULT_LATENCY,
    max_retries: int = 3,
) -> Tuple[bytes, List[Dict[str, Any]]]:
    """Call Fish Audio timestamped streaming endpoint and return (audio_bytes, segments)."""
    import requests

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": model,
    }

    payload: Dict[str, Any] = {
        "text": text,
        "format": format_type,
        "latency": latency,
        "normalize": True,
    }
    if reference_id:
        payload["reference_id"] = reference_id

    for attempt in range(max_retries):
        try:
            response = requests.post(
                API_URL,
                headers=headers,
                json=payload,
                stream=True,
                timeout=60,
            )
            if response.status_code == 429:
                wait_time = (attempt + 1) * 3
                print(f"[FishAudio] Rate limited (429), retrying in {wait_time}s... (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
                continue
            elif response.status_code == 503:
                wait_time = (attempt + 1) * 2
                print(f"[FishAudio] Service busy (503), retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            response.raise_for_status()

            audio_chunks = []
            alignment_by_chunk: Dict[int, Dict[str, Any]] = {}

            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8", errors="ignore")
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    event = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                if event.get("audio_base64"):
                    audio_chunks.append(base64.b64decode(event["audio_base64"]))

                if event.get("alignment") is not None:
                    # Replace previous alignment snapshot for chunk_seq
                    alignment_by_chunk[event["chunk_seq"]] = {
                        "content": event.get("content", ""),
                        "offset": event.get("chunk_audio_offset_sec", 0.0),
                        "alignment": event["alignment"],
                    }

            raw_audio = b"".join(audio_chunks)

            # Build global timeline segments
            segments: List[Dict[str, Any]] = []
            for chunk_seq, item in sorted(alignment_by_chunk.items()):
                offset = item["offset"]
                al = item["alignment"]
                for seg in al.get("segments", []):
                    segments.append({
                        "text": seg["text"],
                        "start": round(seg["start"] + offset, 3),
                        "end": round(seg["end"] + offset, 3),
                        "chunk_seq": chunk_seq,
                    })

            return raw_audio, segments

        except requests.RequestException as e:
            if attempt == max_retries - 1:
                raise RuntimeError(f"Fish Audio API request failed: {e}") from e
            print(f"[FishAudio] Network error ({e}), retrying...")
            time.sleep(2)

    raise RuntimeError("Failed to obtain Fish Audio stream after retries.")


def create_silence(duration_sec: float, sample_rate: int = 24000) -> bytes:
    """Generate raw 16-bit mono PCM silence."""
    import numpy as np
    num_samples = int(duration_sec * sample_rate)
    silence = np.zeros(num_samples, dtype=np.int16)
    return silence.tobytes()


def convert_audio_to_destination(input_audio_bytes: bytes, in_format: str, out_path: Path, sample_rate: int = 24000):
    """Save audio bytes and convert using ffmpeg if needed."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = out_path.with_suffix(f".tmp.{in_format}")
    with open(temp_file, "wb") as f:
        f.write(input_audio_bytes)

    try:
        # Use ffmpeg to convert to clean output format
        cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_file),
            "-ar", str(sample_rate),
            "-ac", "1",
            str(out_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except (subprocess.SubprocessError, FileNotFoundError):
        # Fallback: rename directly
        if out_path.suffix.lower() == temp_file.suffix.lower():
            if out_path.exists():
                out_path.unlink()
            temp_file.rename(out_path)
        else:
            print(f"[Warning] ffmpeg not available or failed; writing {temp_file} directly to {out_path}")
            if out_path.exists():
                out_path.unlink()
            temp_file.rename(out_path)
    finally:
        if temp_file.exists():
            temp_file.unlink()


def get_audio_duration(file_path: Path) -> float:
    """Get duration of audio file in seconds via ffprobe or soundfile."""
    try:
        import soundfile as sf
        with sf.SoundFile(str(file_path)) as f:
            return float(len(f)) / f.samplerate
    except Exception:
        pass

    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
        return float(res.stdout.strip())
    except Exception:
        return 0.0


def make_timing_data(timestamps_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Convert timestamps dict into timing dict (same logic as scripts/make_timing.py)."""
    kept = re.compile(r"[一-鿿A-Za-z0-9']")

    def clean(t):
        return "".join(ch for ch in t if kept.match(ch)).lower()

    scenes = []
    for s in timestamps_dict["sentences"]:
        tokens = [w for w in s["words"] if clean(w["text"])]
        chars = []
        ti = 0
        ci_in_tok = 0
        prev_end = s["start"]
        for ch in s["text"]:
            if kept.match(ch):
                if ti >= len(tokens):
                    chars.append({"ch": ch, "t": prev_end, "e": prev_end})
                    continue
                tok = tokens[ti]
                n = len(clean(tok["text"]))
                span = tok["end"] - tok["start"]
                t0 = tok["start"] + span * (ci_in_tok / max(n, 1))
                t1 = tok["start"] + span * ((ci_in_tok + 1) / max(n, 1))
                chars.append({"ch": ch, "t": round(t0, 3), "e": round(t1, 3)})
                prev_end = t1
                ci_in_tok += 1
                if ci_in_tok >= n:
                    ti += 1
                    ci_in_tok = 0
            else:
                chars.append({"ch": ch, "t": round(prev_end, 3), "e": round(prev_end, 3)})
        scenes.append({
            "id": f"s{s['i'] + 1}",
            "text": s["text"],
            "startSec": s["start"],
            "durationSec": round(s["end"] - s["start"], 3),
            "chars": chars,
        })
    return {"totalSec": timestamps_dict["total"], "scenes": scenes}


def main():
    load_env()

    parser = argparse.ArgumentParser(description="Synthesize voiceover and timestamps using Fish Audio.")
    parser.add_argument("script", type=Path, help="Path to script.json or text file")
    parser.add_argument("audio_out", type=Path, help="Output audio path (e.g. audio/full.wav)")
    parser.add_argument("timestamps_out", type=Path, help="Output timestamps JSON path (e.g. audio/timestamps.json)")
    parser.add_argument("--timing-out", type=Path, default=None, help="Optional output timing JSON path for Remotion")
    parser.add_argument("--api-key", default=os.getenv("FISH_AUDIO_API_KEY") or os.getenv("FISH_API_KEY"),
                        help="Fish Audio API token (or set FISH_AUDIO_API_KEY in .env)")
    parser.add_argument("--reference-id", default=os.getenv("FISH_AUDIO_REFERENCE_ID"),
                        help="Optional voice model reference ID (or set FISH_AUDIO_REFERENCE_ID in .env)")
    parser.add_argument("--model", default=os.getenv("FISH_AUDIO_MODEL", DEFAULT_MODEL),
                        help=f"Model name (default: {DEFAULT_MODEL})")
    parser.add_argument("--latency", default=os.getenv("FISH_AUDIO_LATENCY", DEFAULT_LATENCY),
                        help=f"Streaming latency (default: {DEFAULT_LATENCY})")
    parser.add_argument("--format", default=os.getenv("FISH_AUDIO_FORMAT", DEFAULT_FORMAT),
                        choices=["mp3", "wav", "opus"], help=f"API audio format (default: {DEFAULT_FORMAT})")
    parser.add_argument("--pause-sec", type=float, default=0.25,
                        help="Silence duration between sentences in seconds (default: 0.25)")
    parser.add_argument("--mode", choices=["sentence", "stream"], default="sentence",
                        help="Synthesis mode: 'sentence' (recommended, per-sentence with pauses) or 'stream' (single-call)")
    parser.add_argument("--sample-rate", type=int, default=24000, help="Output sample rate (default: 24000)")

    args = parser.parse_args()

    if not args.api_key:
        print("[Error] No Fish Audio API key found!", file=sys.stderr)
        print("Please provide it via:", file=sys.stderr)
        print("  1. Adding FISH_AUDIO_API_KEY=your_token to .env (see .env.example)", file=sys.stderr)
        print("  2. Exporting FISH_AUDIO_API_KEY environment variable", file=sys.stderr)
        print("  3. Passing --api-key argument", file=sys.stderr)
        sys.exit(1)

    sentences = load_script(args.script)
    print(f"[FishAudio] Loaded {len(sentences)} sentences from {args.script}")
    print(f"[FishAudio] Model: {args.model}, Reference ID: {args.reference_id or 'default'}")

    sentences_data: List[Dict[str, Any]] = []
    audio_segments_raw: List[bytes] = []
    current_time = 0.0

    if args.mode == "sentence":
        for i, sentence_text in enumerate(sentences):
            print(f"[{i+1}/{len(sentences)}] Synthesizing: {sentence_text[:40]}...")
            raw_audio, segments = call_fish_audio_stream(
                text=sentence_text,
                api_key=args.api_key,
                model=args.model,
                reference_id=args.reference_id,
                format_type=args.format,
                latency=args.latency,
            )

            # Temporary file to get accurate audio duration of this sentence
            temp_sentence = args.audio_out.parent / f"_temp_s_{i}.{args.format}"
            temp_sentence.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_sentence, "wb") as f:
                f.write(raw_audio)
            dur = get_audio_duration(temp_sentence)
            if temp_sentence.exists():
                temp_sentence.unlink()

            if dur <= 0 and segments:
                dur = segments[-1]["end"]
            dur = max(dur, 0.1)

            # Offset segments to global timeline
            words = []
            for seg in segments:
                words.append({
                    "text": seg["text"],
                    "start": round(seg["start"] + current_time, 3),
                    "end": round(seg["end"] + current_time, 3),
                })

            sentence_start = current_time
            sentence_end = round(current_time + dur, 3)

            sentences_data.append({
                "i": i,
                "text": sentence_text,
                "start": sentence_start,
                "end": sentence_end,
                "asr": "",
                "match": 1.0,
                "ok": True,
                "words": words,
            })

            audio_segments_raw.append(raw_audio)
            current_time = sentence_end

            # Add inter-sentence pause if configured and not last sentence
            if args.pause_sec > 0 and i < len(sentences) - 1:
                current_time = round(current_time + args.pause_sec, 3)

    else:
        # Full stream mode
        full_text = " ".join(sentences)
        print(f"[FishAudio] Synthesizing entire script in single stream ({len(full_text)} characters)...")
        raw_audio, segments = call_fish_audio_stream(
            text=full_text,
            api_key=args.api_key,
            model=args.model,
            reference_id=args.reference_id,
            format_type=args.format,
            latency=args.latency,
        )
        audio_segments_raw.append(raw_audio)

        # Map global segments back to individual sentences
        seg_idx = 0
        for i, sentence_text in enumerate(sentences):
            sentence_words = []
            clean_sentence = re.sub(r"[^\w]", "", sentence_text).lower()
            collected_chars = ""

            while seg_idx < len(segments):
                seg = segments[seg_idx]
                sentence_words.append({
                    "text": seg["text"],
                    "start": seg["start"],
                    "end": seg["end"],
                })
                collected_chars += re.sub(r"[^\w]", "", seg["text"]).lower()
                seg_idx += 1
                if len(collected_chars) >= len(clean_sentence) and clean_sentence in collected_chars:
                    break

            start_t = sentence_words[0]["start"] if sentence_words else current_time
            end_t = sentence_words[-1]["end"] if sentence_words else start_t + 1.0
            current_time = end_t

            sentences_data.append({
                "i": i,
                "text": sentence_text,
                "start": start_t,
                "end": end_t,
                "asr": "",
                "match": 1.0,
                "ok": True,
                "words": sentence_words,
            })

    # Combine audio
    combined_audio = b"".join(audio_segments_raw)
    convert_audio_to_destination(
        input_audio_bytes=combined_audio,
        in_format=args.format,
        out_path=args.audio_out,
        sample_rate=args.sample_rate,
    )
    final_duration = get_audio_duration(args.audio_out)
    if final_duration <= 0:
        final_duration = current_time

    # Output timestamps.json
    timestamps_dict = {
        "sr": args.sample_rate,
        "total": round(final_duration, 3),
        "sentences": sentences_data,
    }
    args.timestamps_out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.timestamps_out, "w", encoding="utf-8") as f:
        json.dump(timestamps_dict, f, ensure_ascii=False, indent=1)

    print(f"[FishAudio] Successfully wrote audio: {args.audio_out} ({final_duration:.2f}s)")
    print(f"[FishAudio] Successfully wrote timestamps: {args.timestamps_out} ({len(sentences_data)} sentences)")

    if args.timing_out:
        timing_data = make_timing_data(timestamps_dict)
        args.timing_out.parent.mkdir(parents=True, exist_ok=True)
        with open(args.timing_out, "w", encoding="utf-8") as f:
            json.dump(timing_data, f, ensure_ascii=False, indent=1)
        print(f"[FishAudio] Successfully wrote Remotion timing: {args.timing_out}")


if __name__ == "__main__":
    main()
