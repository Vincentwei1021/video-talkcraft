#!/usr/bin/env python3
"""Optional Fish Audio voiceover + aligned timestamps (default: s2.1-pro-free).

python3 scripts/tts_fishaudio.py script.json audio/full.wav audio/timestamps.json \
    --timing-out remotion/src/timing.json

Requires requests and ffmpeg; python-dotenv is optional. Set FISH_AUDIO_API_KEY
and optionally FISH_AUDIO_REFERENCE_ID in .env or the process environment.
Both modes receive SSE; files are written after the entire synthesis completes.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from make_timing import expand_chars, make_timing_data, normalized_text

API_URL = 'https://api.fish.audio/v1/tts/stream/with-timestamp'
DEFAULT_MODEL = 's2.1-pro-free'
DEFAULT_FORMAT = 'mp3'
DEFAULT_LATENCY = 'balanced'


def load_env():
    for path in [Path.cwd() / '.env', Path(__file__).resolve().parent.parent / '.env']:
        if not path.is_file():
            continue
        try:
            from dotenv import load_dotenv
            load_dotenv(path)
        except ImportError:
            for line in path.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip().strip("'\""))
        return


def load_script(path: Path) -> list[str]:
    raw = path.read_text(encoding='utf-8')
    data = json.loads(raw) if path.suffix.lower() == '.json' else raw.splitlines()
    if isinstance(data, dict):
        data = data.get('sentences')
    if not isinstance(data, list) or not all(isinstance(s, str) for s in data):
        raise ValueError("Expected {'sentences': [...]} or a list of strings")
    sentences = [s.strip() for s in data if s.strip()]
    if not sentences or any(not normalized_text(s) for s in sentences):
        raise ValueError('Script must contain nonempty sentences with spoken characters')
    return sentences


def sse_payloads(response):
    # SSE is UTF-8 even when Content-Type has no charset. Split bytes first:
    # Unicode splitlines would treat U+0085/U+2028 inside JSON as line breaks.
    response.encoding = 'utf-8'
    parts = []
    for raw in response.iter_lines(decode_unicode=False):
        line = raw.decode('utf-8') if isinstance(raw, bytes) else raw
        if line == '':
            if parts:
                yield '\n'.join(parts)
                parts = []
        elif line.startswith('data:'):
            parts.append(line[5:].removeprefix(' '))
    if parts:
        yield '\n'.join(parts)


def validate_segments(segments, duration=None):
    if not isinstance(segments, list) or not segments:
        raise ValueError('Fish Audio returned no usable alignment; try local timestamps_cpu.py')
    previous = -1.0
    for seg in segments:
        start, end = seg['start'], seg['end']
        if not isinstance(seg['text'], str) or not all(isinstance(t, (float, int)) and math.isfinite(t)
                                                      for t in (start, end)):
            raise ValueError('Invalid alignment text or non-finite time')
        if start < 0 or end < start or start < previous:
            raise ValueError('Alignment times are negative, reversed or out of order')
        if duration is not None and end > duration + 0.05:
            raise ValueError('Alignment extends beyond the decoded audio')
        previous = start
    if not any(normalized_text(s['text']) for s in segments):
        raise ValueError('Fish Audio returned no usable alignment; try local timestamps_cpu.py')


def call_fish_audio_stream(text, api_key, model=DEFAULT_MODEL, reference_id=None,
                           format_type=DEFAULT_FORMAT, latency=DEFAULT_LATENCY, max_retries=3):
    import requests
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json', 'model': model}
    payload = {'text': text, 'format': format_type, 'latency': latency, 'normalize': True}
    if reference_id:
        payload['reference_id'] = reference_id
    for attempt in range(max_retries):
        response = None
        try:
            response = requests.post(API_URL, headers=headers, json=payload, stream=True, timeout=60)
            if response.status_code in (429, 503):
                if attempt + 1 == max_retries:
                    raise RuntimeError(f'Fish Audio HTTP {response.status_code}: retries exhausted')
                response.close()
                delay = 2 ** (attempt + 1)
                print(f'[FishAudio] HTTP {response.status_code}; retrying in {delay}s')
                time.sleep(delay)
                continue
            response.raise_for_status()
            audio, snapshots, audio_chunks = [], {}, set()
            for data in sse_payloads(response):
                if data == '[DONE]':
                    break
                event = json.loads(data)
                if not isinstance(event, dict) or 'error' in event:
                    raise ValueError('Fish Audio stream returned an error event')
                seq = event['chunk_seq']
                if not isinstance(seq, int) or isinstance(seq, bool) or seq < 0:
                    raise ValueError('Invalid stream chunk sequence')
                if event.get('audio_base64'):
                    audio.append(base64.b64decode(event['audio_base64'], validate=True))
                    audio_chunks.add(seq)
                if event.get('alignment') is not None:
                    # The latest snapshot replaces earlier snapshots for this chunk.
                    snapshots[seq] = event
            raw_audio = b''.join(audio)
            if not raw_audio:
                raise ValueError('Fish Audio returned empty audio')
            if not audio_chunks.issubset(snapshots):
                raise ValueError('Fish Audio alignment is unavailable for an audio chunk')
            segments = []
            for seq, event in sorted(snapshots.items()):
                offset = float(event['chunk_audio_offset_sec'])
                if not math.isfinite(offset) or offset < 0:
                    raise ValueError('Invalid chunk audio offset')
                chunk_segments = event['alignment']['segments']
                if seq in audio_chunks and not chunk_segments:
                    raise ValueError('Fish Audio alignment is empty for an audio chunk')
                for seg in chunk_segments:
                    segments.append({'text': seg['text'], 'start': float(seg['start']) + offset,
                                     'end': float(seg['end']) + offset, 'chunk_seq': seq})
            validate_segments(segments)
            return raw_audio, segments
        except requests.RequestException as error:
            status = response.status_code if response is not None else None
            if attempt + 1 == max_retries or (status is not None and 400 <= status < 500):
                raise RuntimeError(f'Fish Audio API request failed: {error}') from error
            time.sleep(2 ** (attempt + 1))
        except (ValueError, KeyError, TypeError, UnicodeError) as error:
            raise RuntimeError(f'Invalid Fish Audio stream: {error}') from error
        finally:
            if response is not None:
                response.close()
    raise RuntimeError('Failed to obtain Fish Audio stream after retries')


def run_ffmpeg(arguments, *, input_data=None):
    try:
        return subprocess.run(['ffmpeg', '-v', 'error', '-y', *arguments], input=input_data,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    except FileNotFoundError as error:
        raise RuntimeError('ffmpeg is required to decode and assemble Fish Audio output') from error
    except subprocess.CalledProcessError as error:
        detail = error.stderr.decode('utf-8', errors='replace')[-1000:]
        raise RuntimeError(f'ffmpeg failed: {detail}') from error


def decode_audio(raw, fmt, sample_rate):
    if not raw:
        raise ValueError('Cannot decode empty audio')
    # Seekable input preserves encoder delay/padding information in MP3 files.
    with tempfile.TemporaryDirectory(prefix='fish-decode-') as tmp:
        path = Path(tmp) / f'input.{fmt}'
        path.write_bytes(raw)
        pcm = run_ffmpeg(['-i', str(path), '-ar', str(sample_rate), '-ac', '1', '-f', 's16le', '-'])
    if not pcm or len(pcm) % 2:
        raise ValueError('Decoded audio contains no complete PCM samples')
    return pcm


def align_sentences(sentences, segments, duration):
    validate_segments(segments, duration)
    bounded = [{**s, 'start': min(s['start'], duration), 'end': min(s['end'], duration)} for s in segments]
    chars = expand_chars(''.join(sentences), bounded, 0.0, strict=True)
    token_ends, units = set(), 0
    for segment in bounded:
        units += len(normalized_text(segment['text']))
        token_ends.add(units)
    result, pos, consumed = [], 0, 0
    for i, text in enumerate(sentences):
        rows = chars[pos:pos + len(text)]
        pos += len(text)
        words, contiguous = [], False
        for char in rows:
            key = normalized_text(char['ch'])
            if not key:
                contiguous = False
                continue
            # Use original script characters so both timing conversion paths agree.
            # CJK stays character-level; contiguous Latin/digit spans form words.
            if contiguous and consumed not in token_ends and key.isascii() \
                    and normalized_text(words[-1]['text']).isascii() \
                    and words[-1]['end'] == char['t']:
                words[-1]['text'] += char['ch']
                words[-1]['end'] = char['e']
            else:
                words.append({'text': char['ch'], 'start': char['t'], 'end': char['e']})
            contiguous = True
            consumed += len(key)
        if not words:
            raise ValueError(f'No aligned words for sentence {i + 1}')
        result.append({'i': i, 'text': text, 'start': words[0]['start'], 'end': words[-1]['end'],
                       'asr': '', 'match': 1.0, 'ok': True, 'words': words})
    return result


def synthesize(args, sentences):
    parts, records, frames = [], [], 0
    pause_frames = round(args.pause_sec * args.sample_rate)
    groups = [[s] for s in sentences] if args.mode == 'sentence' else [sentences]
    for index, group in enumerate(groups):
        print(f'[FishAudio] Synthesizing {index + 1}/{len(groups)}')
        raw, segments = call_fish_audio_stream(text=' '.join(group), api_key=args.api_key, model=args.model,
                           reference_id=args.reference_id, format_type=args.format, latency=args.latency)
        pcm = decode_audio(raw, args.format, args.sample_rate)
        count = len(pcm) // 2
        rows = align_sentences(group, segments, count / args.sample_rate)
        offset = frames / args.sample_rate
        if args.mode == 'sentence':
            row = rows[0]
            row.update(i=index, start=round(offset, 3), end=round((frames + count) / args.sample_rate, 3))
            row['words'] = [{**w, 'start': round(w['start'] + offset, 3),
                            'end': round(w['end'] + offset, 3)} for w in row['words']]
        records.extend(rows)
        parts.append(pcm)
        frames += count
        if index < len(groups) - 1 and pause_frames:
            parts.append(bytes(pause_frames * 2))
            frames += pause_frames
    return b''.join(parts), {'sr': args.sample_rate, 'total': round(frames / args.sample_rate, 3),
                            'sentences': records}


def write_outputs(args, pcm, timestamps):
    args.audio_out.parent.mkdir(parents=True, exist_ok=True)
    # Stage every output before replacing any destination. Failed decoding or
    # encoding must not leave an empty file labelled WAV alongside success JSON.
    with tempfile.TemporaryDirectory(prefix='.fish-output-', dir=args.audio_out.parent) as tmp:
        audio_path = Path(tmp) / ('audio' + args.audio_out.suffix)
        run_ffmpeg(['-f', 's16le', '-ar', str(args.sample_rate), '-ac', '1', '-i', 'pipe:0',
                    str(audio_path)], input_data=pcm)
        decoded = decode_audio(audio_path.read_bytes(), args.audio_out.suffix[1:], args.sample_rate)
        duration = len(decoded) / (2 * args.sample_rate)
        if abs(duration - len(pcm) / (2 * args.sample_rate)) > 0.05:
            raise ValueError('Encoded audio duration differs from the assembled PCM')
        timestamps['total'] = round(duration, 3)
        timing = make_timing_data(timestamps)
        outputs = [(args.timestamps_out, timestamps)]
        if args.timing_out:
            outputs.append((args.timing_out, timing))
        staged = []
        try:
            for destination, data in outputs:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=destination.parent,
                                                  prefix='.fish-json-', delete=False) as file:
                    staged.append((Path(file.name), destination))
                    json.dump(data, file, ensure_ascii=False, indent=1)
            os.replace(audio_path, args.audio_out)
            for path, destination in staged:
                os.replace(path, destination)
        finally:
            for path, _ in staged:
                path.unlink(missing_ok=True)
    print(f'[FishAudio] Successfully wrote audio: {args.audio_out} ({duration:.3f}s)')
    print(f'[FishAudio] Successfully wrote timestamps: {args.timestamps_out}')
    if args.timing_out:
        print(f'[FishAudio] Successfully wrote Remotion timing: {args.timing_out}')


def main():
    load_env()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('script', type=Path)
    parser.add_argument('audio_out', type=Path)
    parser.add_argument('timestamps_out', type=Path)
    parser.add_argument('--timing-out', type=Path)
    parser.add_argument('--api-key', default=os.getenv('FISH_AUDIO_API_KEY') or os.getenv('FISH_API_KEY'))
    parser.add_argument('--reference-id', default=os.getenv('FISH_AUDIO_REFERENCE_ID'))
    parser.add_argument('--model', default=os.getenv('FISH_AUDIO_MODEL', DEFAULT_MODEL),
                        choices=['s1', 's2-pro', 's2.1-pro', 's2.1-pro-free', 'drama-3-preview'])
    parser.add_argument('--latency', default=os.getenv('FISH_AUDIO_LATENCY', DEFAULT_LATENCY),
                        choices=['normal', 'balanced', 'low'])
    parser.add_argument('--format', default=os.getenv('FISH_AUDIO_FORMAT', DEFAULT_FORMAT),
                        choices=['mp3', 'wav', 'opus'])
    parser.add_argument('--pause-sec', type=float, default=.25, help='Actual silence inserted between requests')
    parser.add_argument('--mode', choices=['sentence', 'stream'], default='sentence')
    parser.add_argument('--sample-rate', type=int, default=24000)
    args = parser.parse_args()
    if not args.api_key:
        parser.error('Set FISH_AUDIO_API_KEY in .env or pass --api-key')
    if not math.isfinite(args.pause_sec) or args.pause_sec < 0 or args.sample_rate <= 0:
        parser.error('Pause must be finite and nonnegative; sample rate must be positive')
    if args.audio_out.suffix.lower() not in ['.wav', '.mp3', '.opus']:
        parser.error('Audio output must end in .wav, .mp3 or .opus')
    paths = [args.script, args.audio_out, args.timestamps_out] + ([args.timing_out] if args.timing_out else [])
    if len({p.resolve() for p in paths}) != len(paths):
        parser.error('Input and output paths must be distinct')
    if not shutil.which('ffmpeg'):
        parser.error('Install ffmpeg before making synthesis requests')
    try:
        sentences = load_script(args.script)
        pcm, timestamps = synthesize(args, sentences)
        write_outputs(args, pcm, timestamps)
    except (RuntimeError, ValueError, OSError) as error:
        print(f'[FishAudio] Error: {error}', file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
