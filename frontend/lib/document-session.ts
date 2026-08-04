export type UploadedDocument = {
  filename: string;
  document_text: string;
  /** Changes on every successful upload so token cache cannot reuse an old doc. */
  version: string;
};

const STORAGE_KEY = 'codeswitch_uploaded_document';

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

export function buildAgentMetadata(doc: UploadedDocument | null): string | undefined {
  if (!doc) return undefined;
  return JSON.stringify({
    filename: doc.filename,
    document_text: doc.document_text,
    version: doc.version,
  });
}

export function documentFingerprint(doc: UploadedDocument | null): string {
  if (!doc) return 'none';
  return doc.version || `${doc.filename}:${doc.document_text.length}`;
}
