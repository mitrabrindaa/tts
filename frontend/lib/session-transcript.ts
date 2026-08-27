/** Ephemeral last-session transcript. Lives in sessionStorage only — no accounts. */

export type TranscriptTurn = {
  role: 'user' | 'assistant';
  text: string;
  ts: string;
  source_snippet: string | null;
};

export type TranscriptSnapshot = {
  roomName: string;
  endedAt: string;
  turns: TranscriptTurn[];
};

const STORAGE_KEY = 'codeswitch_last_transcript';

type SessionMessage = {
  timestamp: number;
  message: string;
  from?: { isLocal?: boolean } | null;
};

export function snapshotFromSession(opts: {
  roomName?: string;
  messages: SessionMessage[];
  sourceSnippets?: Record<string, string>;
}): TranscriptSnapshot | null {
  const sources = opts.sourceSnippets ?? {};
  const turns: TranscriptTurn[] = [];
  for (const msg of opts.messages) {
    const text = (msg.message || '').trim();
    if (!text) continue;
    const role: TranscriptTurn['role'] = msg.from?.isLocal ? 'user' : 'assistant';
    turns.push({
      role,
      text,
      ts: new Date(msg.timestamp).toISOString(),
      source_snippet: role === 'assistant' ? sources[text] ?? null : null,
    });
  }
  if (turns.length === 0) return null;
  return {
    roomName: opts.roomName || 'session',
    endedAt: new Date().toISOString(),
    turns,
  };
}

export function saveTranscriptSnapshot(snapshot: TranscriptSnapshot) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadTranscriptSnapshot(): TranscriptSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranscriptSnapshot;
    if (!Array.isArray(parsed?.turns) || parsed.turns.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTranscriptSnapshot() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function transcriptToTxt(snapshot: TranscriptSnapshot): string {
  const lines = [
    `Session ${snapshot.roomName}`,
    `Ended ${snapshot.endedAt}`,
    '',
  ];
  for (const turn of snapshot.turns) {
    lines.push(`[${turn.role}] ${turn.text}`);
    if (turn.source_snippet) {
      lines.push(`  source: ${turn.source_snippet}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

export function downloadTextFile(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
