"""Sarvam Bulbul TTS for Hindi/English (Hinglish) speech."""

from livekit.plugins import sarvam


def create_tts() -> sarvam.TTS:
    return sarvam.TTS(
        target_language_code="hi-IN",
        model="bulbul:v3",
        speaker="priya",
        speech_sample_rate=22050,
        pace=1.0,
    )
