"""Expand aligned tokens to one timestamp per original script character.

CJK characters retain their token span; Latin words are interpolated within
their word span. Punctuation (including either apostrophe style) has zero
duration. CLI: python3 make_timing.py <timestamps.json> <timing.json>
"""
import json
import sys
import unicodedata
from pathlib import Path


def normalized_text(text):
    """Spoken characters, independent of punctuation, case and width."""
    return ''.join(c for c in unicodedata.normalize('NFKC', text).casefold() if c.isalnum())


def expand_chars(text, words, start, *, strict=False):
    tokens = [w for w in words if normalized_text(w['text'])]
    if strict and normalized_text(text) != ''.join(normalized_text(w['text']) for w in tokens):
        raise ValueError('Alignment text does not match the script after punctuation/case normalization. '
                         'Use spoken-form numbers or align the audio locally with timestamps_cpu.py.')
    spans = []
    for word in tokens:
        n = len(normalized_text(word['text']))
        width = word['end'] - word['start']
        spans.extend((word['start'] + width * i / n, word['start'] + width * (i + 1) / n)
                     for i in range(n))
    chars, pos, previous = [], 0, start
    for char in text:
        count = len(normalized_text(char))
        if count and pos + count <= len(spans):
            t, end = spans[pos][0], spans[pos + count - 1][1]
            pos += count
            previous = end
        else:
            t = end = previous
        chars.append({'ch': char, 't': round(t, 3), 'e': round(end, 3)})
    return chars


def make_timing_data(data):
    return {'totalSec': data['total'], 'scenes': [
        {'id': f"s{s['i'] + 1}", 'text': s['text'], 'startSec': s['start'],
         'durationSec': round(s['end'] - s['start'], 3),
         'chars': expand_chars(s['text'], s['words'], s['start'])}
        for s in data['sentences']]}


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src, dst = map(Path, sys.argv[1:])
    result = make_timing_data(json.loads(src.read_text(encoding='utf-8')))
    dst.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"wrote {dst}: {len(result['scenes'])} scenes, "
          f"{sum(len(s['chars']) for s in result['scenes'])} chars")


if __name__ == '__main__':
    main()
