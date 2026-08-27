'use client';

import { useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import {
  buildAgentMetadata,
  documentFingerprint,
  loadSessionLanguage,
  loadUploadedDocument,
  saveSessionLanguage,
  type UploadedDocument,
} from '@/lib/document-session';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(() =>
    loadUploadedDocument()
  );
  const [language, setLanguage] = useState(() => loadSessionLanguage());
  const docKey = documentFingerprint(uploadedDocument);

  const tokenSource = useMemo(() => {
    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return getSandboxTokenSource(appConfig);
    }

    // New TokenSource instance whenever the document changes so LiveKit cannot
    // reuse a cached token that still points at the previous PDF.
    return TokenSource.custom(async (options) => {
      const doc = loadUploadedDocument();
      const agentName = options.agentName ?? appConfig.agentName;
      const sessionLanguage = loadSessionLanguage();
      const agentMetadata = buildAgentMetadata(doc, sessionLanguage);

      const roomConfig = {
        agents: [
          {
            agent_name: agentName,
            metadata: agentMetadata,
          },
        ],
      };

      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_config: roomConfig, language: sessionLanguage }),
      });
      const raw = await res.text();
      let data: {
        error?: string;
        serverUrl?: string;
        roomName?: string;
        participantName?: string;
        participantToken?: string;
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(raw.slice(0, 180) || 'Token request failed');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Token request failed');
      }
      if (!data.serverUrl || !data.participantToken) {
        throw new Error('Token response missing connection details');
      }
      return {
        serverUrl: data.serverUrl.trim(),
        roomName: data.roomName ?? '',
        participantName: data.participantName ?? 'user',
        participantToken: data.participantToken,
      };
    });
  }, [appConfig, docKey, language]);

  const session = useSession(tokenSource, {
    ...(appConfig.agentName ? { agentName: appConfig.agentName } : {}),
    // Include fingerprint so option equality also busts any internal token cache.
    agentMetadata: buildAgentMetadata(uploadedDocument, language),
    agentConnectTimeoutMilliseconds: 45_000,
  });

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController
          appConfig={appConfig}
          onDocumentChange={setUploadedDocument}
          language={language}
          onLanguageChange={(code) => {
            saveSessionLanguage(code);
            setLanguage(code);
          }}
        />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
