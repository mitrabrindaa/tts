'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  clearUploadedDocument,
  loadSessionLanguage,
  loadUploadedDocument,
  saveSessionLanguage,
  saveUploadedDocument,
  type UploadedDocument,
} from '@/lib/document-session';
import { SESSION_LANGUAGES } from '@/lib/languages';

function WelcomeImage() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      <path
        d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  onDocumentChange?: (doc: UploadedDocument | null) => void;
  language?: string;
  onLanguageChange?: (code: string) => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  onDocumentChange,
  language: languageProp,
  onLanguageChange,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = loadUploadedDocument();
  const [filename, setFilename] = useState<string | null>(initial?.filename ?? null);
  const [status, setStatus] = useState<string | null>(
    initial ? 'Using previously uploaded document — start a new call, or upload a replacement.' : null
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState(() => languageProp ?? loadSessionLanguage());

  function clearDoc() {
    clearUploadedDocument();
    onDocumentChange?.(null);
    setFilename(null);
    setStatus(null);
    setError(null);
  }

  async function onFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setStatus(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/document', { method: 'POST', body });
      const raw = await res.text();
      let data: {
        error?: string;
        filename?: string;
        document_text?: string;
        doc_id?: string;
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(
          raw.trim().slice(0, 180) ||
            'Upload failed (server returned a non-JSON error). Try a smaller digital PDF/TXT under 4 MB.'
        );
      }
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      if (!data.filename || !data.document_text) {
        throw new Error('Upload succeeded but no document text was returned.');
      }

      const doc: UploadedDocument = {
        filename: data.filename,
        document_text: data.document_text,
        version: `${data.doc_id ?? 'doc'}-${Date.now()}`,
      };
      saveUploadedDocument(doc);
      onDocumentChange?.(doc);
      setFilename(doc.filename);
      setStatus('Ready — start a new call so the agent loads this document.');
    } catch (e) {
      clearUploadedDocument();
      onDocumentChange?.(null);
      setFilename(null);
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div ref={ref}>
      <section className="bg-background flex flex-col items-center justify-center px-4 text-center">
        <WelcomeImage />

        <h1 className="text-foreground max-w-prose pt-1 text-2xl leading-8 font-semibold tracking-tight">
          Ask about your document
        </h1>
        <p className="text-muted-foreground max-w-md pt-2 text-sm leading-6">
          Upload a PDF or text report, pick your language, then speak in that language, English, or
          mix them. The agent answers only from your document.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-6 w-72 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
        >
          {uploading ? 'Uploading…' : filename ? 'Replace document' : 'Upload PDF or TXT'}
        </Button>

        {filename && (
          <p className="text-foreground mt-3 max-w-sm truncate text-sm font-medium">{filename}</p>
        )}
        {status && <p className="text-muted-foreground mt-1 max-w-sm text-xs">{status}</p>}
        {error && <p className="text-destructive mt-2 max-w-sm text-xs">{error}</p>}
        {filename && (
          <button
            type="button"
            onClick={clearDoc}
            className="text-muted-foreground mt-2 text-xs underline underline-offset-2"
          >
            Clear document (use sample report)
          </button>
        )}

        <div className="mt-4 w-72 text-left">
          <label htmlFor="session-language" className="text-muted-foreground mb-1.5 block text-xs">
            Spoken language
          </label>
          <Select
            value={language}
            onValueChange={(value) => {
              if (!value) return;
              saveSessionLanguage(value);
              setLanguage(value);
              onLanguageChange?.(value);
            }}
          >
            <SelectTrigger id="session-language" className="w-72">
              <SelectValue placeholder="Hindi" />
            </SelectTrigger>
            <SelectContent>
              {SESSION_LANGUAGES.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-4 w-72 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
        >
          {filename ? startButtonText : 'Start with sample report'}
        </Button>
      </section>

      <div className="fixed bottom-5 left-0 flex w-full items-center justify-center">
        <p className="text-muted-foreground max-w-prose pt-1 text-xs leading-5 font-normal text-pretty md:text-sm">
          PDF or TXT — not a doctor. Scanned PDFs are OCR'd. Max 4 MB.
        </p>
      </div>
    </div>
  );
};
