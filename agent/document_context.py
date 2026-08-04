"""Load the latest uploaded document for the agent system prompt."""

from __future__ import annotations

import json
from pathlib import Path

from prompts import FAKE_REPORT

_ROOT = Path(__file__).resolve().parent.parent
UPLOADS_DIR = _ROOT / "uploads"
LATEST_META = UPLOADS_DIR / "latest.json"
# Keep small for Groq free-tier TPM (each turn sends full prompt again).
MAX_CHARS = 2_500


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


def _from_job_metadata(job_metadata: str | None) -> tuple[str, str, bool] | None:
    """Prefer document text passed from the frontend via agent dispatch metadata."""
    if not job_metadata or not job_metadata.strip():
        return None
    try:
        meta = json.loads(job_metadata)
    except json.JSONDecodeError:
        return None
    text = str(meta.get("document_text") or meta.get("text") or "").strip()
    if not text:
        return None
    filename = str(meta.get("filename") or "uploaded document")
    return filename, _truncate(text), True


def load_document_context(job_metadata: str | None = None) -> tuple[str, str, bool]:
    """Return (filename_label, document_text, is_uploaded)."""
    from_meta = _from_job_metadata(job_metadata)
    if from_meta is not None:
        return from_meta

    if LATEST_META.exists():
        try:
            meta = json.loads(LATEST_META.read_text(encoding="utf-8"))
            # Cloud/local upload API may already store extracted text in latest.json
            inline = str(meta.get("document_text") or "").strip()
            if inline:
                return str(meta.get("filename") or "uploaded document"), _truncate(inline), True
            stored = UPLOADS_DIR / meta["stored_name"]
            if stored.exists():
                text = _truncate(_extract_text(stored))
                if text.strip():
                    return str(meta.get("filename") or stored.name), text, True
        except Exception:
            pass
    return "sample blood report (demo)", FAKE_REPORT, False
