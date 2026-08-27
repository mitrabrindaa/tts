import { NextResponse } from 'next/server';
import {
  AccessToken,
  AgentDispatchClient,
  type AccessTokenOptions,
  type VideoGrant,
} from 'livekit-server-sdk';
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '@/lib/languages';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY?.trim();
const API_SECRET = process.env.LIVEKIT_API_SECRET?.trim();
const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim();
const DEFAULT_AGENT_NAME = process.env.AGENT_NAME?.trim() || 'codeswitch-report-agent';

export const revalidate = 0;

function httpHost(livekitUrl: string): string {
  return livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}

function mergeLanguageIntoMetadata(metadata: string | undefined, bodyLanguage: unknown): string {
  let parsed: Record<string, unknown> = {};
  if (metadata && metadata.trim()) {
    try {
      const value: unknown = JSON.parse(metadata);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = { version: metadata };
    }
  }
  const fromMeta = parsed.language;
  parsed.language = normalizeLanguage(bodyLanguage ?? fromMeta ?? DEFAULT_LANGUAGE);
  return JSON.stringify(parsed);
}

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY) throw new Error('LIVEKIT_API_KEY is not defined');
    if (!API_SECRET) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body = await req.json().catch(() => ({}));
    const agents = body?.room_config?.agents;
    const agentFromBody = Array.isArray(agents) ? agents[0] : undefined;
    const agentName =
      (agentFromBody?.agent_name || agentFromBody?.agentName || DEFAULT_AGENT_NAME).trim() ||
      DEFAULT_AGENT_NAME;
    const agentMetadata = mergeLanguageIntoMetadata(
      typeof agentFromBody?.metadata === 'string' ? agentFromBody.metadata : undefined,
      body?.language
    );

    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // Explicit dispatch is more reliable than token-only roomConfig for Cloud agents.
    const dispatchClient = new AgentDispatchClient(httpHost(LIVEKIT_URL), API_KEY, API_SECRET);
    await dispatchClient.createDispatch(roomName, agentName, {
      metadata: agentMetadata,
    });

    const roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName,
          metadata: agentMetadata,
        }),
      ],
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      roomConfig
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token request failed';
    console.error('token route failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig: RoomConfiguration
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  at.roomConfig = roomConfig;
  return at.toJwt();
}
