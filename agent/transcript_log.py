"""Append conversation turns to logs/transcripts.jsonl."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from livekit.agents import AgentSession
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent

_ROOT = Path(__file__).resolve().parent.parent
_LOG_PATH = _ROOT / "logs" / "transcripts.jsonl"


def _append(record: dict) -> None:
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def attach_transcript_logger(session: AgentSession, *, session_id: str) -> None:
    """Write each user/assistant chat message to logs/transcripts.jsonl."""

    @session.on("conversation_item_added")
    def _on_item(ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if not isinstance(item, ChatMessage):
            return
        text = item.text_content
        if not text:
            return
        _append(
            {
                "ts": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id,
                "role": item.role,
                "text": text,
            }
        )
