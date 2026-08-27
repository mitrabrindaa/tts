import { DEFAULT_LANGUAGE, normalizeLanguage, type SessionLanguageCode } from '@/lib/languages';

export type UploadedDocument = {
  filename: string;
  document_text: string;
  /** Changes on every successful upload so token cache cannot reuse an old doc. */
  version: string;
};

const STORAGE_KEY = 'codeswitch_uploaded_document';
const LANGUAGE_KEY = 'codeswitch_language';

export function saveUploadedDocument(doc: UploadedDocument) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export function loadUploadedDocument(): UploadedDocument | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadedDocument;
    if (!parsed?.filename || !parsed?.document_text) return null;
    return {
      filename: parsed.filename,
      document_text: parsed.document_text,
      version: parsed.version || `${parsed.filename}:${parsed.document_text.length}`,
    };
  } catch {
    return null;
  }
}

export function clearUploadedDocument() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function saveSessionLanguage(code: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LANGUAGE_KEY, normalizeLanguage(code));
}

export function loadSessionLanguage(): SessionLanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(sessionStorage.getItem(LANGUAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Always JSON so the agent can read `language` even on the sample-report path. */
export function buildAgentMetadata(
  doc: UploadedDocument | null,
  language: string = loadSessionLanguage()
): string {
  const code = normalizeLanguage(language);
  if (!doc) {
    return JSON.stringify({ language: code, version: `sample:${code}` });
  }
  return JSON.stringify({
    language: code,
    filename: doc.filename,
    document_text: doc.document_text,
    version: doc.version,
  });
}

export function documentFingerprint(doc: UploadedDocument | null): string {
  if (!doc) return 'none';
  return doc.version || `${doc.filename}:${doc.document_text.length}`;
}
