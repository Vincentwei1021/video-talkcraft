#!/usr/bin/env python3
"""Tests for Fish Audio TTS & Streaming Timestamps integration."""

import base64
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from tts_fishaudio import (
    call_fish_audio_stream,
    load_script,
    make_timing_data,
)


class TestFishAudioIntegration(unittest.TestCase):

    def test_load_script_json_dict(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump({"sentences": ["First sentence.", "Second sentence."]}, f)
            temp_path = Path(f.name)
        try:
            sentences = load_script(temp_path)
            self.assertEqual(sentences, ["First sentence.", "Second sentence."])
        finally:
            temp_path.unlink()

    def test_load_script_json_list(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump(["Line one.", "Line two."], f)
            temp_path = Path(f.name)
        try:
            sentences = load_script(temp_path)
            self.assertEqual(sentences, ["Line one.", "Line two."])
        finally:
            temp_path.unlink()

    def test_load_script_txt(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("Alpha line.\n\nBeta line.\n")
            temp_path = Path(f.name)
        try:
            sentences = load_script(temp_path)
            self.assertEqual(sentences, ["Alpha line.", "Beta line."])
        finally:
            temp_path.unlink()

    @patch("requests.post")
    def test_sse_snapshot_replacement(self, mock_post):
        """Verify that when a newer alignment snapshot arrives for chunk_seq, it replaces earlier snapshots."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        audio_chunk1 = base64.b64encode(b"audio_part_1").decode("ascii")
        audio_chunk2 = base64.b64encode(b"audio_part_2").decode("ascii")

        # Event 1: chunk_seq 0 with 1 word
        event1 = {
            "audio_base64": audio_chunk1,
            "content": "Hello",
            "chunk_seq": 0,
            "chunk_audio_offset_sec": 0.0,
            "alignment": {
                "audio_duration": 0.5,
                "segments": [{"text": "Hello", "start": 0.0, "end": 0.5}],
            },
        }

        # Event 2: newer snapshot for chunk_seq 0 superseding Event 1 with 2 words
        event2 = {
            "audio_base64": audio_chunk2,
            "content": "Hello world",
            "chunk_seq": 0,
            "chunk_audio_offset_sec": 0.0,
            "alignment": {
                "audio_duration": 1.0,
                "segments": [
                    {"text": "Hello", "start": 0.0, "end": 0.5},
                    {"text": "world", "start": 0.5, "end": 1.0},
                ],
            },
        }

        mock_response.iter_lines.return_value = [
            f"data: {json.dumps(event1)}".encode("utf-8"),
            b"",
            f"data: {json.dumps(event2)}".encode("utf-8"),
            b"data: [DONE]",
        ]
        mock_post.return_value = mock_response

        raw_audio, segments = call_fish_audio_stream(
            text="Hello world",
            api_key="test_token",
        )

        self.assertEqual(raw_audio, b"audio_part_1audio_part_2")
        # Should contain the replaced 2 segments, not 3 appended segments
        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0]["text"], "Hello")
        self.assertEqual(segments[1]["text"], "world")
        self.assertEqual(segments[1]["end"], 1.0)

    def test_make_timing_compatibility(self):
        """Verify that timestamps output cleanly generates Remotion timing.json."""
        sample_timestamps = {
            "sr": 24000,
            "total": 3.5,
            "sentences": [
                {
                    "i": 0,
                    "text": "Hello world.",
                    "start": 0.0,
                    "end": 1.5,
                    "asr": "",
                    "match": 1.0,
                    "ok": True,
                    "words": [
                        {"text": "Hello", "start": 0.0, "end": 0.6},
                        {"text": "world", "start": 0.65, "end": 1.4},
                    ],
                },
                {
                    "i": 1,
                    "text": "OpenMontage rock.",
                    "start": 1.8,
                    "end": 3.5,
                    "asr": "",
                    "match": 1.0,
                    "ok": True,
                    "words": [
                        {"text": "OpenMontage", "start": 1.8, "end": 2.8},
                        {"text": "rock", "start": 2.85, "end": 3.4},
                    ],
                },
            ],
        }

        timing = make_timing_data(sample_timestamps)
        self.assertIn("scenes", timing)
        self.assertEqual(len(timing["scenes"]), 2)
        self.assertEqual(timing["scenes"][0]["id"], "s1")
        self.assertEqual(timing["scenes"][1]["id"], "s2")

        # Verify chars 1:1 match with sentence text length
        self.assertEqual(len(timing["scenes"][0]["chars"]), len("Hello world."))
        self.assertEqual(len(timing["scenes"][1]["chars"]), len("OpenMontage rock."))

    def test_cli_compatibility_with_make_timing_script(self):
        """Verify that timestamps JSON generated can be processed directly by scripts/make_timing.py."""
        sample_timestamps = {
            "sr": 24000,
            "total": 3.5,
            "sentences": [
                {
                    "i": 0,
                    "text": "OpenMontage represents a radical shift.",
                    "start": 0.0,
                    "end": 2.5,
                    "asr": "",
                    "match": 1.0,
                    "ok": True,
                    "words": [
                        {"text": "OpenMontage", "start": 0.0, "end": 0.8},
                        {"text": "represents", "start": 0.8, "end": 1.4},
                        {"text": "a", "start": 1.4, "end": 1.6},
                        {"text": "radical", "start": 1.6, "end": 2.1},
                        {"text": "shift", "start": 2.1, "end": 2.5},
                    ],
                }
            ],
        }

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f_ts:
            json.dump(sample_timestamps, f_ts)
            ts_path = Path(f_ts.name)

        timing_path = ts_path.with_suffix(".timing.json")
        make_timing_script = Path(__file__).resolve().parent / "make_timing.py"

        try:
            cmd = [sys.executable, str(make_timing_script), str(ts_path), str(timing_path)]
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            self.assertIn("wrote", res.stdout)
            self.assertTrue(timing_path.exists())

            with open(timing_path, "r", encoding="utf-8") as f_out:
                data = json.load(f_out)
            self.assertIn("scenes", data)
            self.assertEqual(len(data["scenes"]), 1)
            self.assertEqual(len(data["scenes"][0]["chars"]), len("OpenMontage represents a radical shift."))
        finally:
            if ts_path.exists():
                ts_path.unlink()
            if timing_path.exists():
                timing_path.unlink()


if __name__ == "__main__":
    unittest.main()
