"""Sarvam Bulbul TTS for Indic/English (code-mixed) speech."""

from livekit.plugins import sarvam

from languages import DEFAULT_LANGUAGE, SPEAKER_BY_LANGUAGE, normalize_language


def create_tts(language: str = DEFAULT_LANGUAGE) -> sarvam.TTS:
    code = normalize_language(language)
    return sarvam.TTS(
        target_language_code=code,
        model="bulbul:v3",
        speaker=SPEAKER_BY_LANGUAGE.get(code, "priya"),
        speech_sample_rate=22050,
        pace=1.0,
    )
