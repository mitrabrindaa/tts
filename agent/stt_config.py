"""Sarvam STT configured for Hindi/Bengali/English code-mixing."""

from livekit.plugins import sarvam


def create_stt() -> sarvam.STT:
    # Middle ground: ignore tiny noise pops, but still catch normal speech.
    return sarvam.STT(
        language="hi-IN",
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
