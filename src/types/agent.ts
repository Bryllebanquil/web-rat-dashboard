export interface Agent {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: 'online' | 'offline' | 'connecting';
  lastSeen: string;
  sid?: string;
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

export interface WebRTCStats {
  connection_state: string;
  ice_connection_state: string;
  ice_gathering_state: string;
  signaling_state: string;
  local_description?: string;
  remote_description?: string;
}

export interface BandwidthStats {
  available_bandwidth: number;
  current_bitrate: number;
  packets_lost: number;
  rtt: number;
  jitter: number;
}

export interface QualityData {
  quality_score: number;
  bandwidth_stats: BandwidthStats;
  quality_issues: string[];
  timestamp: string;
}

export interface ProductionReadiness {
  current_implementation: string;
  target_implementation: string;
  migration_phase: string;
  current_usage: {
    agents: number;
    viewers: number;
    total_connections: number;
  };
  scalability_assessment: {
    aiortc_limit_reached: boolean;
    production_ready: boolean;
    recommended_action: string;
  };
  performance_metrics: {
    average_latency: number;
    average_bitrate: number;
    latency_target_met: boolean;
    bitrate_target_met: boolean;
  };
  recommendations: string[];
}

export interface FileTransfer {
  id: string;
  filename: string;
  size: number;
  progress: number;
  direction: 'upload' | 'download';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  speed: number;
  agent_id: string;
}

export interface CommandResult {
  agent_id: string;
  output: string;
  timestamp: string;
}

export interface ConfigStatus {
  admin_password_set: boolean;
  admin_password_length: number;
  secret_key_set: boolean;
  host: string;
  port: number;
  session_timeout: number;
  max_login_attempts: number;
  login_timeout: number;
  current_login_attempts: number;
  blocked_ips: string[];
  password_hash_algorithm: string;
  hash_iterations: number;
  salt_length: number;
}