"""Load the latest uploaded document for the agent system prompt."""

from __future__ import annotations

import json
from pathlib import Path

from languages import DEFAULT_LANGUAGE, normalize_language
from prompts import FAKE_REPORT

_ROOT = Path(__file__).resolve().parent.parent
UPLOADS_DIR = _ROOT / "uploads"
LATEST_META = UPLOADS_DIR / "latest.json"
# Keep small for Groq free-tier TPM (each turn sends full prompt again).
MAX_CHARS = 2_500

# filename, document_text, is_uploaded, language
DocumentContext = tuple[str, str, bool, str]


def _extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".csv"}:
        return path.read_text(encoding="utf-8", errors="replace")
    if suffix == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        parts: list[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    raise ValueError(f"Unsupported file type: {suffix}")


def _truncate(text: str) -> str:
    text = " ".join(text.split())
    if len(text) <= MAX_CHARS:
        return text
    return text[: MAX_CHARS - 20] + " …[truncated]"


def _parse_metadata_json(raw: str | None) -> dict | None:
    if not raw or not raw.strip():
        return None
    try:
        meta = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return meta if isinstance(meta, dict) else None


def _from_job_metadata(job_metadata: str | None) -> DocumentContext | None:
    """Prefer document text passed from the frontend via agent dispatch metadata."""
    meta = _parse_metadata_json(job_metadata)
    if meta is None:
        return None
    language = normalize_language(str(meta.get("language") or "") or None)
    text = str(meta.get("document_text") or meta.get("text") or "").strip()
    if not text:
        return None
    filename = str(meta.get("filename") or "uploaded document")
    return filename, _truncate(text), True, language


def load_document_context(job_metadata: str | None = None) -> DocumentContext:
    """Return (filename_label, document_text, is_uploaded, language)."""
    meta = _parse_metadata_json(job_metadata)
    language = (
        normalize_language(str(meta.get("language") or "") or None)
        if meta
        else DEFAULT_LANGUAGE
    )

    from_meta = _from_job_metadata(job_metadata)
    if from_meta is not None:
        return from_meta

    if LATEST_META.exists():
        try:
            latest = json.loads(LATEST_META.read_text(encoding="utf-8"))
            if not (meta and meta.get("language")):
                language = normalize_language(str(latest.get("language") or language) or None)
            # Cloud/local upload API may already store extracted text in latest.json
            inline = str(latest.get("document_text") or "").strip()
            if inline:
                return (
                    str(latest.get("filename") or "uploaded document"),
                    _truncate(inline),
                    True,
                    language,
                )
            stored = UPLOADS_DIR / latest["stored_name"]
            if stored.exists():
                text = _truncate(_extract_text(stored))
                if text.strip():
                    return str(latest.get("filename") or stored.name), text, True, language
        except Exception:
            pass
    return "sample blood report (demo)", FAKE_REPORT, False, language
