"""Offline regression tests; ffmpeg is required for the audio integration tests.

fish_alignment.json contains only final alignment metadata captured from real
Fish Audio s2.1-pro-free responses. Audio in these tests is generated locally.
Run: python3 -m unittest discover -s scripts -p 'test_fish*.py' -v
"""
import base64
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import requests

import tts_fishaudio as tts
from make_timing import expand_chars, make_timing_data, normalized_text


def segment(text='配音', start=0., end=1.):
    return {'text': text, 'start': start, 'end': end}


def event(text='配音', audio=b'chunk', seq=0, offset=0.):
    return {'chunk_seq': seq, 'chunk_audio_offset_sec': offset,
            'audio_base64': base64.b64encode(audio).decode(),
            'alignment': {'segments': [segment(text)]}}


def response(events=None, raw=None, status=200):
    if raw is None:
        raw = ''.join('data: ' + json.dumps(e, ensure_ascii=False) + '\n\n' for e in events).encode()
    r = requests.Response()
    r.status_code = status
    r.headers['Content-Type'] = 'text/event-stream'
    # Match the charset Requests infers from the real response header.
    r.encoding = 'ISO-8859-1'
    r.raw = io.BytesIO(raw)
    return r


class StreamRegressions(unittest.TestCase):
    def call(self, r):
        with patch('requests.post', return_value=r):
            return tts.call_fish_audio_stream('配音', 'test-token')

    def test_utf8_bytes_snapshot_replacement_and_chunk_offsets(self):
        first = event('配')
        latest = event('配音')
        latest['content'] = '配音\u2028'  # Unicode splitlines must not split inside JSON.
        raw, words = self.call(response([first, latest, event('完成', seq=1, offset=1.25)]))
        self.assertEqual(raw, b'chunk' * 3)
        self.assertEqual([w['text'] for w in words], ['配音', '完成'])
        self.assertEqual(words[1]['start'], 1.25)
        self.assertEqual(words[1]['end'], 2.25)

    def test_sse_comments_multiline_and_done(self):
        payload = json.dumps(event(), ensure_ascii=False, indent=1)
        raw = (': heartbeat\r\n' + '\r\n'.join('data: ' + s for s in payload.splitlines()) +
               '\r\n\r\ndata: [DONE]\r\n\r\n').encode()
        self.assertEqual(self.call(response(raw=raw))[1][0]['text'], '配音')

    def test_invalid_json_and_utf8_fail_instead_of_dropping_audio(self):
        for raw in [b'data: {bad}\n\n', b'data: {"unfinished":\n\n', b'data: \xff\n\n']:
            with self.subTest(raw=raw), self.assertRaisesRegex(RuntimeError, 'Invalid Fish Audio stream'):
                self.call(response(raw=raw))

    def test_bad_base64_empty_audio_and_missing_alignment_fail(self):
        cases = []
        for changes in [{'audio_base64': '%bad'}, {'audio_base64': ''}, {'alignment': None},
                        {'alignment': {'segments': []}}, {'alignment': {'segments': [segment('...')]}},
                        {'error': 'synthesis failed'}]:
            cases.append([{**event(), **changes}])
        cases.append([event(), {**event(seq=1), 'alignment': None}])
        for events in cases:
            with self.subTest(events=events), self.assertRaises(RuntimeError):
                self.call(response(events))

    def test_alignment_time_validation(self):
        for words in [[segment(start=-1)], [segment(start=2, end=1)],
                      [segment(end=float('nan'))], [segment(end=2)],
                      [segment(start=.4), segment(start=.2)]]:
            with self.subTest(words=words), self.assertRaises(ValueError):
                tts.align_sentences(['配音'], words, 1.)

    def test_http_retry_closes_responses_and_does_not_duplicate_audio(self):
        failed, success = response([], status=503), response([event()])
        with patch('requests.post', side_effect=[failed, success]) as post, patch('time.sleep'), \
                patch.object(success, 'close', wraps=success.close) as close:
            self.assertEqual(tts.call_fish_audio_stream('配音', 'test')[0], b'chunk')
        self.assertEqual(post.call_count, 2)
        self.assertTrue(failed.raw.closed)
        close.assert_called_once()

    def test_http_auth_error_is_not_retried(self):
        with patch('requests.post', return_value=response([], status=401)) as post, \
                self.assertRaises(RuntimeError):
            tts.call_fish_audio_stream('配音', 'test')
        self.assertEqual(post.call_count, 1)


class AlignmentRegressions(unittest.TestCase):
    def test_real_chinese_and_english_alignment_metadata(self):
        fixture = json.loads((Path(__file__).parent / 'test_fixtures/fish_alignment.json').read_text())
        for name, case in fixture.items():
            with self.subTest(name=name):
                words = case['event']['alignment']['segments']
                duration = case['event']['alignment']['audio_duration']
                rows = tts.align_sentences(case['sentences'], words, duration)
                data = make_timing_data({'total': duration, 'sentences': rows})
                self.assertEqual(len(rows), 3)
                for row, scene in zip(rows, data['scenes']):
                    self.assertEqual(''.join(c['ch'] for c in scene['chars']), row['text'])
                    self.assertEqual(normalized_text(row['text']), ''.join(normalized_text(w['text']) for w in row['words']))
                if name.startswith('zh'):
                    self.assertEqual(sum(len(r['words']) for r in rows), 50)
                else:
                    scene = data['scenes'][1]
                    for word, expected in [('believe', 2.08), ('already', 2.56)]:
                        self.assertEqual(scene['chars'][scene['text'].index(word)]['t'], expected)

    def test_straight_and_curly_apostrophes_have_identical_spoken_spans(self):
        tokens = [segment("can't", 0, .4), segment('believe', .4, 1.1)]
        for script in ["can't believe", 'can’t believe', 'ＣＡＮ’Ｔ believe']:
            with self.subTest(script=script):
                chars = expand_chars(script, tokens, 0, strict=True)
                self.assertEqual(chars[3]['t'], chars[3]['e'])
                self.assertEqual(chars[script.index('believe')]['t'], .4)

    def test_adjacent_words_and_api_token_boundaries_are_preserved(self):
        tokens = [segment('a', 0, .1), segment('bb', .1, .5), segment('c', .5, .9)]
        rows = tts.align_sentences(['a bb c'], tokens, 1.)
        self.assertEqual([w['text'] for w in rows[0]['words']], ['a', 'bb', 'c'])
        # A script with no spaces must still preserve the API's different token widths.
        rows = tts.align_sentences(['abbc'], tokens, 1.)
        chars = make_timing_data({'total': 1., 'sentences': rows})['scenes'][0]['chars']
        self.assertEqual([c['t'] for c in chars], [0., .1, .3, .5])

    def test_spoken_number_mismatch_and_partial_alignment_fail(self):
        for words in [[segment('I have two cats Hello')], [segment('I have')]]:
            with self.subTest(words=words), self.assertRaisesRegex(ValueError, 'does not match'):
                tts.align_sentences(['I have 2 cats.', 'Hello.'], words, 1.)

    def test_cpu_schema_and_cli_match_shared_conversion(self):
        data = {'total': 1., 'sentences': [{'i': 0, 'text': '你好，CPU。', 'start': 0, 'end': 1.,
                'words': [segment('你', 0, .2), segment('好', .2, .4), segment('CPU', .4, 1.)]}]}
        expected = make_timing_data(data)
        self.assertEqual([c['t'] for c in expected['scenes'][0]['chars']], [0., .2, .4, .4, .6, .8, 1.])
        with tempfile.TemporaryDirectory() as tmp:
            src, dst = Path(tmp) / 'ts.json', Path(tmp) / 'timing.json'
            src.write_text(json.dumps(data))
            subprocess.run([sys.executable, str(Path(__file__).parent / 'make_timing.py'), str(src), str(dst)],
                           check=True, capture_output=True)
            self.assertEqual(json.loads(dst.read_text()), expected)

    def test_invalid_script_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'script.json'
            for data in [[], {}, [123], ['!!!'], {'sentences': 'hello'}]:
                path.write_text(json.dumps(data))
                with self.subTest(data=data), self.assertRaises(ValueError):
                    tts.load_script(path)


@unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg is required for audio integration tests')
class AudioRegressions(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.args = SimpleNamespace(mode='sentence', pause_sec=.25, sample_rate=24000, api_key='test',
            model=tts.DEFAULT_MODEL, reference_id=None, format='wav', latency='balanced',
            audio_out=self.root / 'full.wav', timestamps_out=self.root / 'ts.json', timing_out=self.root / 'timing.json')

    def tone(self, fmt):
        path = self.root / ('tone.' + fmt)
        tts.run_ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=1', str(path)])
        return path.read_bytes()

    def test_sentence_wav_and_mp3_decode_then_join_with_real_silence(self):
        for fmt in ['wav', 'mp3']:
            with self.subTest(fmt=fmt):
                self.args.format = fmt
                raw = self.tone(fmt)
                with patch.object(tts, 'call_fish_audio_stream', side_effect=[(raw, [segment('One')]), (raw, [segment('Two')])]):
                    pcm, timestamps = tts.synthesize(self.args, ['One.', 'Two.'])
                self.assertEqual(len(pcm) / 48000, 2.25)
                self.assertEqual(pcm[48000:60000], bytes(12000))
                self.assertTrue(any(pcm[60000:]))
                self.assertEqual(timestamps['sentences'][1]['start'], 1.25)
                self.assertEqual(timestamps['sentences'][1]['words'][0]['start'], 1.25)
                self.assertEqual(timestamps['total'], 2.25)
                tts.write_outputs(self.args, pcm, timestamps)
                self.assertEqual(tts.decode_audio(self.args.audio_out.read_bytes(), 'wav', 24000), pcm)

    def test_stream_retains_api_sentence_gap_without_adding_pause(self):
        self.args.mode = 'stream'
        self.args.pause_sec = 99
        with patch.object(tts, 'call_fish_audio_stream', return_value=(self.tone('wav'),
                [segment('One', 0, .3), segment('Two', .6, .9)])) as call:
            pcm, timestamps = tts.synthesize(self.args, ['One.', 'Two.'])
        self.assertEqual(call.call_count, 1)
        self.assertEqual(len(pcm), 48000)
        self.assertEqual(timestamps['sentences'][1]['start'], .6)

    def test_requested_output_formats_are_decodable_and_keep_duration(self):
        pcm = tts.decode_audio(self.tone('wav'), 'wav', 24000)
        for fmt in ['wav', 'mp3', 'opus']:
            with self.subTest(fmt=fmt):
                self.args.audio_out = self.root / ('full.' + fmt)
                data = {'sr': 24000, 'total': 1., 'sentences': tts.align_sentences(['One'], [segment('One')], 1.)}
                tts.write_outputs(self.args, pcm, data)
                self.assertAlmostEqual(len(tts.decode_audio(self.args.audio_out.read_bytes(), fmt, 24000)) / 48000, 1., places=3)

    def test_encoding_failure_preserves_existing_outputs(self):
        for path in [self.args.audio_out, self.args.timestamps_out, self.args.timing_out]:
            path.write_bytes(b'existing output')
        with patch.object(tts, 'run_ffmpeg', side_effect=RuntimeError('encoder failed')), self.assertRaises(RuntimeError):
            tts.write_outputs(self.args, b'\x00\x00' * 24000, {'total': 1., 'sentences': []})
        for path in [self.args.audio_out, self.args.timestamps_out, self.args.timing_out]:
            self.assertEqual(path.read_bytes(), b'existing output')

    def test_bad_audio_does_not_fall_back_to_mislabeled_output(self):
        with self.assertRaises(RuntimeError):
            tts.decode_audio(b'bad audio', 'wav', 24000)
        self.assertFalse(self.args.audio_out.exists())


class CliRegressions(unittest.TestCase):
    def test_preflight_failures_do_not_call_api(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = root / 'script.json'
            base = ['tts_fishaudio.py', str(script), str(root / 'out.wav'), str(root / 'ts.json')]
            cases = [({}, [], ['Hello'], True),
                     ({'FISH_AUDIO_API_KEY': 'test'}, [], ['Hello'], False),
                     ({'FISH_AUDIO_API_KEY': 'test'}, ['--pause-sec', '-1'], ['Hello'], True),
                     ({'FISH_AUDIO_API_KEY': 'test'}, [], [123], True)]
            for env, flags, data, ffmpeg in cases:
                script.write_text(json.dumps(data))
                with self.subTest(env=bool(env), flags=flags, data=data, ffmpeg=ffmpeg), \
                        patch.dict(os.environ, env, clear=True), patch.object(tts, 'load_env'), \
                        patch.object(sys, 'argv', base + flags), patch('shutil.which', return_value='ffmpeg' if ffmpeg else None), \
                        patch.object(tts, 'call_fish_audio_stream') as call, \
                        contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                    tts.main()
                call.assert_not_called()
                self.assertFalse((root / 'out.wav').exists())


if __name__ == '__main__':
    unittest.main()
