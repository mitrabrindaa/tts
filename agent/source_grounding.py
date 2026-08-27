"""Lightweight overlap match from an assistant reply back to document text.

Runs after TTS is already speaking — this must stay cheap (no embeddings).
"""

from __future__ import annotations

import re

_SPLIT = re.compile(r"(?<=[.!?।؟\n])\s+|\s*\|\s+")
_TOKEN = re.compile(r"\w+", re.UNICODE)
_MIN_OVERLAP = 2
_MAX_CHARS = 240


def find_source_snippet(document_text: str, reply_text: str) -> str | None:
    """Return the document chunk that best overlaps the reply, or None."""
    doc = (document_text or "").strip()
    reply = (reply_text or "").strip()
    if not doc or not reply:
        return None

    reply_tokens = {tok.lower() for tok in _TOKEN.findall(reply) if len(tok) >= 3}
    if len(reply_tokens) < _MIN_OVERLAP:
        return None

    chunks = [part.strip() for part in _SPLIT.split(doc) if part.strip()]
    if not chunks:
        chunks = [doc]

    best: str | None = None
    best_score = 0.0
    for chunk in chunks:
        chunk_tokens = {tok.lower() for tok in _TOKEN.findall(chunk) if len(tok) >= 3}
        if not chunk_tokens:
            continue
        overlap = len(reply_tokens & chunk_tokens)
        if overlap < _MIN_OVERLAP:
            continue
        # Density plus raw overlap so short lab-result lines still win.
        score = overlap / len(chunk_tokens) + overlap * 0.15
        if score > best_score:
            best_score = score
            best = chunk

    if best is None:
        return None
    if len(best) <= _MAX_CHARS:
        return best
    return best[: _MAX_CHARS - 1] + "…"
