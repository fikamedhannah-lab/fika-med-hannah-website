"""Pre-generate ElevenLabs MP3s for the listening questions in the adaptive level test.

Run once (and again whenever listening transcripts change in question-bank.js):
    python3 scripts/generate_level_test_audio.py

Reads ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID from .env in this repo's root
(never exposed client-side) and writes static mp3 files under
assets/audio/level-test/, matching the audioFile paths in question-bank.js.
"""
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID")

QUESTION_BANK_PATH = ROOT / "assets" / "js" / "level-test" / "question-bank.js"
OUT_DIR = ROOT / "assets" / "audio" / "level-test"

# Pulls each { transcript: '...', audioFile: '/assets/audio/level-test/<id>.mp3' }
# pair straight out of question-bank.js, so this script never drifts out of
# sync with the actual question content.
ENTRY_RE = re.compile(
    r"transcript:\s*'((?:[^'\\]|\\.)*)',\s*\n\s*audioFile:\s*'/assets/audio/level-test/([\w-]+)\.mp3'"
)


def load_listening_entries() -> dict[str, str]:
    text = QUESTION_BANK_PATH.read_text(encoding="utf-8")
    entries = {file_id: transcript for transcript, file_id in ENTRY_RE.findall(text)}
    if not entries:
        raise RuntimeError(f"No listening transcripts found in {QUESTION_BANK_PATH}")
    return entries


def main() -> None:
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY not set in .env")
    if not ELEVENLABS_VOICE_ID:
        raise RuntimeError("ELEVENLABS_VOICE_ID not set in .env")

    entries = load_listening_entries()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    for file_id, transcript in entries.items():
        out_path = OUT_DIR / f"{file_id}.mp3"
        print(f"Generating {out_path} ...")
        stream = client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            model_id="eleven_multilingual_v2",
            text=transcript,
            output_format="mp3_44100_128",
        )
        with open(out_path, "wb") as f:
            for chunk in stream:
                if chunk:
                    f.write(chunk)

    print(f"Done. {len(entries)} clips written to {OUT_DIR}")


if __name__ == "__main__":
    main()
