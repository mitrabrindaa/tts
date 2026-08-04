export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: '',
  pageTitle: 'Ask about your document',
  pageDescription:
    'Upload a report or document, then ask about it in Hindi, Bengali, English, or any mix.',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#0d7377',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#14a3a8',
  startButtonText: 'Ask about your document',

  audioVisualizerType: 'bar',
  audioVisualizerColor: '#0d7377',
  audioVisualizerColorDark: '#14a3a8',

  // Must match agent_name in agent/main.py for explicit dispatch
  agentName: process.env.AGENT_NAME ?? 'codeswitch-report-agent',

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
