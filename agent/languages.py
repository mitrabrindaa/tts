"""Sarvam saaras:v3 / bulbul:v3 language profiles.

Keep this list in sync with frontend/lib/languages.ts.
Speakers are multilingual on bulbul v3; priya is kept for every language so
the existing Hindi voice does not change.
"""

from __future__ import annotations

from dataclasses import dataclass

DEFAULT_LANGUAGE = "hi-IN"


@dataclass(frozen=True)
class LanguageProfile:
    code: str
    name: str
    script: str
    example: str
    speaker: str = "priya"


LANGUAGE_PROFILES: dict[str, LanguageProfile] = {
    "hi-IN": LanguageProfile("hi-IN", "Hindi", "Devanagari", "मिश्रित वाक्य"),
    "bn-IN": LanguageProfile("bn-IN", "Bengali", "Bengali", "মিশ্র বাক্য"),
    "ta-IN": LanguageProfile("ta-IN", "Tamil", "Tamil", "கலப்பு வாக்கியம்"),
    "te-IN": LanguageProfile("te-IN", "Telugu", "Telugu", "మిశ్రమ వాక్యం"),
    "mr-IN": LanguageProfile("mr-IN", "Marathi", "Devanagari", "मिश्र वाक्य"),
    "gu-IN": LanguageProfile("gu-IN", "Gujarati", "Gujarati", "મિશ્ર વાક્ય"),
    "kn-IN": LanguageProfile("kn-IN", "Kannada", "Kannada", "ಮಿಶ್ರ ವಾಕ್ಯ"),
    "ml-IN": LanguageProfile("ml-IN", "Malayalam", "Malayalam", "മിശ്ര വാക്യം"),
    "pa-IN": LanguageProfile("pa-IN", "Punjabi", "Gurmukhi", "ਮਿਸ਼ਰਤ ਵਾਕ"),
    "od-IN": LanguageProfile("od-IN", "Odia", "Odia", "ମିଶ୍ର ବାକ୍ୟ"),
}

# One-line swap point if a language should use a different bulbul v3 speaker.
SPEAKER_BY_LANGUAGE: dict[str, str] = {
    code: profile.speaker for code, profile in LANGUAGE_PROFILES.items()
}


def normalize_language(code: str | None) -> str:
    raw = (code or "").strip()
    if raw in LANGUAGE_PROFILES:
        return raw
    return DEFAULT_LANGUAGE


def get_profile(code: str | None) -> LanguageProfile:
    return LANGUAGE_PROFILES[normalize_language(code)]
