import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['.pdf', '.txt', '.md', '.csv']);
// Vercel serverless request body limit is ~4.5 MB on Hobby.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 2_500;

function uploadsDir() {
  // On Vercel the filesystem is ephemeral/read-only except /tmp.
  if (process.env.VERCEL) {
    return path.join('/tmp', 'uploads');
  }
  // Local: frontend/ -> repo root uploads/
  return path.resolve(process.cwd(), '..', 'uploads');
}

function truncate(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= MAX_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_CHARS - 20)} …[truncated]`;
}

async function extractText(ext: string, buffer: Buffer): Promise<string> {
  if (ext === '.pdf') {
    const { extractText: extractPdfText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join('\n') : String(text ?? '');
    return truncate(joined);
  }

  return truncate(buffer.toString('utf-8'));
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 4 MB). Try a smaller digital PDF or TXT.' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'document';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return NextResponse.json(
        { error: 'Unsupported type. Use PDF, TXT, MD, or CSV.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const documentText = await extractText(ext, buffer);
    if (!documentText) {
      return NextResponse.json(
        {
          error:
            'Could not extract text. Use a digital (text) PDF or TXT — scanned photos are not supported yet.',
        },
        { status: 400 }
      );
    }

    const docId = randomUUID().slice(0, 8);
    const storedName = `${docId}${ext}`;
    const meta = {
      doc_id: docId,
      filename: originalName,
      stored_name: storedName,
      uploaded_at: new Date().toISOString(),
      size_bytes: buffer.length,
      document_text: documentText,
    };

    // Best-effort local persist for `python main.py dev` on the same machine.
    try {
      const dir = uploadsDir();
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, storedName), buffer);
      await writeFile(path.join(dir, 'latest.json'), JSON.stringify(meta, null, 2), 'utf-8');
    } catch (persistError) {
      console.warn('disk persist skipped', persistError);
    }

    return NextResponse.json({
      ok: true,
      doc_id: docId,
      filename: originalName,
      document_text: documentText,
      message: 'Uploaded. Start a new voice session so the agent receives this document.',
    });
  } catch (error) {
    console.error('upload failed', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message || 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { readFile } = await import('fs/promises');
    const metaPath = path.join(uploadsDir(), 'latest.json');
    const raw = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(raw) as { filename?: string; document_text?: string };
    return NextResponse.json({
      filename: meta.filename ?? null,
      document_text: meta.document_text ?? null,
    });
  } catch {
    return NextResponse.json({ filename: null, document_text: null });
  }
}
