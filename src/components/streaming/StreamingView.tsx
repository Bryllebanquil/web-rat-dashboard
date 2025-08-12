import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  Monitor, 
  Camera, 
  Mic, 
  Settings,
  Activity,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
  Fullscreen,
  FullscreenExit,
  Video
} from 'lucide-react';

interface StreamingViewProps {
  agents: any[];
  selectedAgent: string | null;
  onAgentSelect: (agentId: string) => void;
  onStartStreaming: (agentId: string, type: 'screen' | 'camera' | 'audio') => void;
  onStopStreaming: (agentId: string) => void;
  onSetQuality: (agentId: string, quality: string) => void;
  webrtcStats: any;
  qualityData: any;
}

const StreamingView: React.FC<StreamingViewProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  onStartStreaming,
  onStopStreaming,
  onSetQuality,
  webrtcStats,
  qualityData
}) => {
  const [fullscreenStream, setFullscreenStream] = useState<'screen' | 'camera' | null>(null);
  const [muted, setMuted] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  const onlineAgents = agents.filter(agent => agent.status === 'online');
  const currentAgent = agents.find(agent => agent.id === selectedAgent);
  const agentStats = webrtcStats[selectedAgent || ''] || {};
  const agentQuality = qualityData[selectedAgent || ''] || {};

  const StreamContainer = ({ 
    type, 
    title, 
    icon: Icon, 
    isActive, 
    onToggle, 
    videoRef,
    stats,
    quality
  }: {
    type: 'screen' | 'camera';
    title: string;
    icon: any;
    isActive: boolean;
    onToggle: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    stats: any;
    quality: any;
  }) => (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5" />
            {title}
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Live" : "Offline"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenStream(fullscreenStream === type ? null : type)}
                >
                  {fullscreenStream === type ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.srcObject = null;
                      videoRef.current.load();
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={onToggle}
              disabled={!selectedAgent}
            >
              {isActive ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isActive ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <div className="relative h-full">
          {/* Video Container */}
          <div className="relative w-full h-full min-h-[400px] bg-black rounded-lg overflow-hidden">
            {isActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="w-full h-full object-contain"
                style={{ 
                  aspectRatio: type === 'screen' ? '16/9' : '4/3',
                  backgroundColor: '#000'
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No {type} stream</p>
                  <p className="text-sm">Click Start to begin streaming</p>
                </div>
              </div>
            )}
            
            {/* Stream Overlay */}
            {isActive && (
              <div className="absolute top-4 left-4 right-4">
                <div className="flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span>LIVE</span>
                    </div>
                    {stats?.bitrate && (
                      <span>{Math.round(stats.bitrate / 1000)} kbps</span>
                    )}
                    {stats?.fps && (
                      <span>{stats.fps} FPS</span>
                    )}
                    {stats?.resolution && (
                      <span>{stats.resolution}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {type === 'camera' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-white/20"
                        onClick={() => setMuted(!muted)}
                      >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={() => {
                        if (videoRef.current) {
                          if (document.fullscreenElement) {
                            document.exitFullscreen();
                          } else {
                            videoRef.current.requestFullscreen();
                          }
                        }
                      }}
                    >
                      <Fullscreen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QualityControl = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Stream Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Quality Preset</label>
            <select 
              className="w-full mt-1 p-2 border rounded-md"
              onChange={(e) => selectedAgent && onSetQuality(selectedAgent, e.target.value)}
              value={agentQuality?.preset || 'auto'}
            >
              <option value="auto">Auto</option>
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Bitrate</label>
            <div className="mt-1 p-2 border rounded-md bg-muted">
              {agentQuality?.bitrate ? `${Math.round(agentQuality.bitrate / 1000)} kbps` : 'Auto'}
            </div>
          </div>
        </div>
        
        {agentStats && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Connection Quality</span>
              <span className="font-medium">
                {agentStats.connectionQuality || 'Unknown'}
              </span>
            </div>
            <Progress 
              value={agentStats.qualityScore || 0} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (fullscreenStream) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <h2 className="text-xl font-semibold">
              {fullscreenStream === 'screen' ? 'Screen Stream' : 'Camera Stream'} - {currentAgent?.hostname}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setFullscreenStream(null)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Minimize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <video
          ref={fullscreenStream === 'screen' ? screenVideoRef : cameraVideoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Live Streaming</h1>
          <p className="text-muted-foreground">
            Real-time screen and camera streaming from connected agents
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Agent Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Agent:</span>
            <select
              className="p-2 border rounded-md"
              value={selectedAgent || ''}
              onChange={(e) => onAgentSelect(e.target.value)}
            >
              <option value="">Select an agent</option>
              {onlineAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.hostname} ({agent.ip})
                </option>
              ))}
            </select>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${selectedAgent ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm">
              {selectedAgent ? 'Connected' : 'No Agent Selected'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {selectedAgent ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Screen Stream */}
            <div className="lg:col-span-1">
              <StreamContainer
                type="screen"
                title="Screen Stream"
                icon={Monitor}
                isActive={agentStats?.screen?.active || false}
                onToggle={() => {
                  if (agentStats?.screen?.active) {
                    onStopStreaming(selectedAgent);
                  } else {
                    onStartStreaming(selectedAgent, 'screen');
                  }
                }}
                videoRef={screenVideoRef}
                stats={agentStats?.screen}
                quality={agentQuality}
              />
            </div>

            {/* Camera Stream */}
            <div className="lg:col-span-1">
              <StreamContainer
                type="camera"
                title="Camera Stream"
                icon={Camera}
                isActive={agentStats?.camera?.active || false}
                onToggle={() => {
                  if (agentStats?.camera?.active) {
                    onStopStreaming(selectedAgent);
                  } else {
                    onStartStreaming(selectedAgent, 'camera');
                  }
                }}
                videoRef={cameraVideoRef}
                stats={agentStats?.camera}
                quality={agentQuality}
              />
            </div>

            {/* Controls Panel */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <QualityControl />
                
                {/* Stream Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Stream Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agentStats && Object.keys(agentStats).length > 0 ? (
                      <div className="space-y-2">
                        {agentStats.screen?.active && (
                          <div className="flex justify-between text-sm">
                            <span>Screen Bitrate</span>
                            <span className="font-mono">
                              {Math.round((agentStats.screen?.bitrate || 0) / 1000)} kbps
                            </span>
                          </div>
                        )}
                        {agentStats.camera?.active && (
                          <div className="flex justify-between text-sm">
                            <span>Camera Bitrate</span>
                            <span className="font-mono">
                              {Math.round((agentStats.camera?.bitrate || 0) / 1000)} kbps
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Latency</span>
                          <span className="font-mono">
                            {agentStats.latency || 'Unknown'} ms
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Packet Loss</span>
                          <span className="font-mono">
                            {agentStats.packetLoss || '0'}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No active streams
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Agent Selected</h3>
              <p className="text-muted-foreground">
                Select an agent from the dropdown above to start streaming
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingView;