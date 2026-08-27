# Code-Switching Voice Agent (LiveKit + Sarvam)

A real-time voice agent that handles **Hindi / Bengali ↔ English code-switching** — the way many Indians actually speak, mixing languages mid-sentence — instead of forcing a single-language mode.

**Upload a PDF or text document** (lab report, prescription summary, any digital doc), then ask about it by voice. The agent answers only from that document, mirroring your language mix. Without an upload it falls back to a sample blood report.

## Stack

| Role | Provider |
|------|----------|
| Transport | [LiveKit Cloud](https://cloud.livekit.io) |
| Agent framework | [`livekit-agents`](https://docs.livekit.io/agents/) (Python) |
| STT | [Sarvam](https://sarvam.ai) `saaras:v3` · `mode=codemix` |
| LLM | [Groq](https://console.groq.com) `openai/gpt-oss-20b` (free-tier friendly) |
| TTS | Sarvam Bulbul `bulbul:v3` (speaker `priya`, `hi-IN`) |
| Frontend | [agent-starter-react](https://github.com/livekit-examples/agent-starter-react) (lightly themed) |

## Prerequisites

1. **LiveKit Cloud** — create a free project at [cloud.livekit.io](https://cloud.livekit.io). Copy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
2. **Sarvam AI** — API key from [sarvam.ai](https://sarvam.ai) → set `SARVAM_API_KEY`.
3. **Groq** — free-tier key from [console.groq.com/keys](https://console.groq.com/keys) → set `GROQ_API_KEY`.
4. **Python** ≥ 3.10, **Node.js** ≥ 20 (22+ works; the starter prefers 24.x), and **pnpm** (`npm install -g pnpm` if needed).

## Setup

```bash
# 1. Clone and configure secrets
cp .env.example .env
# Edit .env with your real keys

# 2. Agent dependencies
cd agent
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cd ..

# 3. Frontend
cd frontend
cp .env.example .env.local   # if present; else create .env.local
# Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET (same project)
pnpm install
cd ..
```

## Run

**Terminal 1 — agent** (from `agent/` with venv active):

```bash
cd agent
python main.py console    # mic in the terminal (fastest smoke test)
# or
python main.py dev        # connect to LiveKit Cloud for the web UI
```

**Terminal 2 — frontend**:

```bash
cd frontend
pnpm dev
```

Open **http://localhost:3000**:
1. **Upload PDF or TXT** (digital text PDFs work; photo/scan OCR not yet)
2. Click **Ask about your document**
3. Speak in Hindi / Bengali / English mix

Use **`python main.py dev`** (not only `console`) so the web upload + voice session share the same agent. After each upload, start a **new** call so the agent reloads `uploads/latest.json`.

Agent name registered with LiveKit: `codeswitch-report-agent`.

## Demo script (60–90s)

1. Upload a short lab PDF (or use the sample report).
2. **User:** "Mera jo blood report hai usme sugar level normal hai kya?"
3. Agent answers from the document in Hinglish.
4. Switch mix mid-conversation (Bengali/Hindi) — agent should mirror it.

Session transcripts append to `logs/transcripts.jsonl` (gitignored). Uploaded files land in `uploads/` (gitignored).

## Project layout

```
├── agent/
│   ├── main.py              # LiveKit AgentServer entrypoint
│   ├── prompts.py           # Code-switch prompt builder
│   ├── document_context.py  # Load latest uploaded PDF/TXT
│   ├── transcript_log.py    # Append turns to logs/transcripts.jsonl
│   ├── stt_config.py        # Sarvam STT (codemix)
│   ├── tts_config.py        # Sarvam Bulbul TTS
│   └── requirements.txt
├── frontend/                # Themed LiveKit React starter + upload UI
├── uploads/                 # Latest uploaded document (gitignored)
├── logs/                    # transcripts.jsonl (gitignored)
├── .env.example
└── README.md
```

## TTS fallback note

Primary TTS is **Sarvam Bulbul** via `livekit-plugins-sarvam`. If Sarvam TTS is unavailable for your key/region, swap `create_tts()` in `agent/tts_config.py` for ElevenLabs multilingual (`livekit-plugins-elevenlabs`) — keep **Sarvam for STT**; that remains the code-switching differentiator.

## Out of scope

- Scanned photo / camera OCR (digital PDF & TXT only for now)
- Live ClearDiagnosis API
- Telephony / SIP
- ElevenLabs unless Sarvam TTS blocks the demo
