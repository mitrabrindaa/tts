"""Append conversation turns to logs/transcripts.jsonl."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from livekit.agents import AgentSession
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent

from source_grounding import find_source_snippet

_ROOT = Path(__file__).resolve().parent.parent
_LOG_PATH = _ROOT / "logs" / "transcripts.jsonl"
SOURCE_TOPIC = "source_grounding"


def _append(record: dict) -> None:
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


async def _publish_source(room: Any, reply_text: str, snippet: str) -> None:
    payload = json.dumps(
        {"reply_text": reply_text, "source_snippet": snippet},
        ensure_ascii=False,
    ).encode("utf-8")
    try:
        await room.local_participant.publish_data(
            payload, reliable=True, topic=SOURCE_TOPIC
        )
    except Exception:
        pass


def attach_transcript_logger(
    session: AgentSession,
    *,
    session_id: str,
    room: Any = None,
    document_text: str = "",
) -> None:
    """Write each user/assistant chat message to logs/transcripts.jsonl."""

    @session.on("conversation_item_added")
    def _on_item(ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if not isinstance(item, ChatMessage):
            return
        text = item.text_content
        if not text:
            return
        role = str(getattr(item.role, "value", item.role))
        snippet = None
        if role in {"assistant", "agent"} and document_text:
            snippet = find_source_snippet(document_text, text)
        _append(
            {
                "ts": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id,
                "role": role,
                "text": text,
                "source_snippet": snippet,
            }
        )
        if snippet and room is not None:
            try:
                asyncio.get_running_loop().create_task(
                    _publish_source(room, text, snippet)
                )
            except RuntimeError:
                pass
