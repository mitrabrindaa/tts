"""Sarvam STT configured for Indic/English code-mixing."""

from livekit.plugins import sarvam

from languages import DEFAULT_LANGUAGE, normalize_language


def create_stt(language: str = DEFAULT_LANGUAGE) -> sarvam.STT:
    # Middle ground: ignore tiny noise pops, but still catch normal speech.
    return sarvam.STT(
        language=normalize_language(language),
        model="saaras:v3",
        mode="codemix",
        sample_rate=16000,
        high_vad_sensitivity=False,
        flush_signal=True,
        min_speech_frames=8,
        first_turn_min_speech_frames=10,
        negative_frames_count=8,
        negative_frames_window=12,
        interrupt_min_speech_frames=8,
    )
