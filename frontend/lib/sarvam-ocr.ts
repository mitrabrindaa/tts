/**
 * Sarvam Document AI (Vision 1.5) OCR fallback for scanned / image PDFs.
 * Digitise accepts raw PDF bytes — no page rasterization.
 *
 * Job flow: POST /doc-ai/v1/job/digitise → poll /status → /results (JSON)
 * or /download-url (often a ZIP of markdown). Failures return null so the
 * upload route can keep its existing error instead of 500ing.
 */

const SARVAM_BASE = 'https://api.sarvam.ai';
const POLL_MS = 2_000;
// Leave headroom under the document route's 60s maxDuration.
const MAX_WAIT_MS = 50_000;
const TERMINAL_OK = new Set(['completed', 'partially_completed']);
const TERMINAL_FAIL = new Set(['failed', 'rejected']);

function headers(apiKey: string): HeadersInit {
  return { 'api-subscription-key': apiKey };
}

async function startDigitise(apiKey: string, pdf: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename);
  form.append('output_format', 'md');

  const res = await fetch(`${SARVAM_BASE}/doc-ai/v1/job/digitise`, {
    method: 'POST',
    headers: headers(apiKey),
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { job_id?: string; error?: unknown };
  if (!res.ok || !body.job_id) {
    throw new Error(`digitise ${res.status}`);
  }
  return body.job_id;
}

async function waitForJob(apiKey: string, jobId: string): Promise<boolean> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${SARVAM_BASE}/doc-ai/v1/job/${encodeURIComponent(jobId)}/status`, {
      headers: headers(apiKey),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string };
    const status = (body.status || '').toLowerCase();
    if (TERMINAL_OK.has(status)) return true;
    if (TERMINAL_FAIL.has(status) || !res.ok) return false;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  for (const key of ['content', 'text', 'markdown', 'md', 'html']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) out.push(obj[key].trim());
  }
  for (const key of ['documents', 'pages', 'blocks', 'result', 'results']) {
    if (key in obj) collectStrings(obj[key], out);
  }
}

function textFromJson(data: unknown): string {
  const parts: string[] = [];
  collectStrings(data, parts);
  return parts.join('\n');
}

async function unzipText(bytes: Uint8Array): Promise<string> {
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(bytes);
  const parts: string[] = [];
  for (const [name, data] of Object.entries(files)) {
    const lower = name.toLowerCase();
    if (lower.endsWith('/') || data.length === 0) continue;
    if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.html') || lower.endsWith('.json')) {
      const raw = strFromU8(data);
      if (lower.endsWith('.json')) {
        try {
          parts.push(textFromJson(JSON.parse(raw)));
          continue;
        } catch {
          /* use raw */
        }
      }
      parts.push(raw);
    }
  }
  return parts.join('\n');
}

async function fetchJobText(apiKey: string, jobId: string): Promise<string> {
  const resultsRes = await fetch(
    `${SARVAM_BASE}/doc-ai/v1/job/${encodeURIComponent(jobId)}/results`,
    { headers: headers(apiKey) }
  );
  if (resultsRes.ok) {
    const data: unknown = await resultsRes.json().catch(() => null);
    const fromJson = data ? textFromJson(data) : '';
    if (fromJson.trim()) return fromJson;
  }

  const dlRes = await fetch(
    `${SARVAM_BASE}/doc-ai/v1/job/${encodeURIComponent(jobId)}/download-url`,
    { headers: headers(apiKey) }
  );
  if (!dlRes.ok) return '';
  const dl = (await dlRes.json().catch(() => ({}))) as { url?: string; method?: string };
  if (!dl.url) return '';

  const fileRes = await fetch(dl.url, { method: (dl.method || 'GET').toUpperCase() });
  if (!fileRes.ok) return '';
  const buf = new Uint8Array(await fileRes.arrayBuffer());
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    return unzipText(buf);
  }
  const asText = new TextDecoder().decode(buf);
  try {
    const parsed: unknown = JSON.parse(asText);
    const fromJson = textFromJson(parsed);
    if (fromJson.trim()) return fromJson;
  } catch {
    /* not JSON */
  }
  return asText;
}

export async function ocrPdfWithSarvam(
  pdf: Buffer,
  filename = 'document.pdf'
): Promise<string | null> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    console.warn('SARVAM_API_KEY missing; skipping scanned-PDF OCR');
    return null;
  }
  try {
    const jobId = await startDigitise(apiKey, pdf, filename);
    const ok = await waitForJob(apiKey, jobId);
    if (!ok) return null;
    const text = (await fetchJobText(apiKey, jobId)).trim();
    return text || null;
  } catch (err) {
    console.warn('Sarvam OCR failed', err);
    return null;
  }
}
