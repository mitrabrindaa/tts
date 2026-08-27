"""LiveKit code-switching voice agent for document / report Q&A."""

import sys
from pathlib import Path

# Windows consoles default to cp1252 and crash when logging Hindi/Bengali.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, TurnHandlingOptions
from livekit.plugins import groq, silero

from document_context import load_document_context
from prompts import build_greeting_instructions, build_system_instructions
from stt_config import create_stt
from transcript_log import attach_transcript_logger
from tts_config import create_tts

_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(_root / ".env.local")
load_dotenv(Path(__file__).resolve().parent / ".env.local")


class DocumentAssistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


server = AgentServer()


@server.rtc_session(agent_name="codeswitch-report-agent")
async def codeswitch_report_agent(ctx: agents.JobContext) -> None:
    filename, document_text, is_uploaded, language = load_document_context(ctx.job.metadata)
    instructions = build_system_instructions(
        document_text, filename=filename, is_uploaded=is_uploaded, language=language
    )
    greeting = build_greeting_instructions(
        filename, is_uploaded=is_uploaded, language=language
    )

    session = AgentSession(
        stt=create_stt(language),
        llm=groq.LLM(
            model="llama-3.1-8b-instant",
            # 80 was cutting mid-sentence / mid-paragraph during TTS.
            max_completion_tokens=256,
        ),
        tts=create_tts(language),
        vad=silero.VAD.load(
            min_speech_duration=0.2,
            min_silence_duration=0.65,
            activation_threshold=0.55,
            prefix_padding_duration=0.4,
        ),
        turn_handling=TurnHandlingOptions(
            endpointing={"min_delay": 0.5, "max_delay": 2.5},
        ),
    )

    attach_transcript_logger(session, session_id=ctx.room.name or "console")

    await session.start(
        room=ctx.room,
        agent=DocumentAssistant(instructions),
    )

    await session.generate_reply(instructions=greeting)


if __name__ == "__main__":
    agents.cli.run_app(server)
