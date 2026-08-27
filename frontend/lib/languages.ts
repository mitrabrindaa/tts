/** Keep in sync with agent/languages.py */
export const DEFAULT_LANGUAGE = 'hi-IN';

export const SESSION_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'od-IN', name: 'Odia' },
] as const;

export type SessionLanguageCode = (typeof SESSION_LANGUAGES)[number]['code'];

export function normalizeLanguage(code: unknown): SessionLanguageCode {
  const raw = String(code ?? '').trim();
  if (SESSION_LANGUAGES.some((item) => item.code === raw)) {
    return raw as SessionLanguageCode;
  }
  return DEFAULT_LANGUAGE;
}
