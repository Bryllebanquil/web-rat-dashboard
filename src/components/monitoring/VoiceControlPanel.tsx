import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff,
  Play, 
  Pause, 
  Square,
  Volume2,
  VolumeX,
  Settings,
  Download, 
  Trash2,
  Send,
  Clock,
  Command,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Headphones
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface VoiceCommand {
  id: string;
  timestamp: string;
  command: string;
  transcription: string;
  confidence: number;
  status: 'executed' | 'failed' | 'pending';
  response?: string;
  execution_time?: number;
}

interface VoiceStats {
  total_commands: number;
  session_commands: number;
  successful_commands: number;
  failed_commands: number;
  average_confidence: number;
  last_command: string;
}

interface VoiceControlPanelProps {
  agentId?: string | null;
}

const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({ agentId }) => {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommand[]>([]);
  const [stats, setStats] = useState<VoiceStats>({
    total_commands: 0,
    session_commands: 0,
    successful_commands: 0,
    failed_commands: 0,
    average_confidence: 0,
    last_command: ''
  });
  const [currentTranscription, setCurrentTranscription] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [language, setLanguage] = useState("en-US");
  const [customCommand, setCustomCommand] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'voice_command_update':
            if (data.agent_id === agentId) {
              const newCommand: VoiceCommand = {
                id: `voice_${Date.now()}`,
                timestamp: new Date().toISOString(),
                command: data.command,
                transcription: data.transcription,
                confidence: data.confidence || 0,
                status: data.status || 'pending',
                response: data.response,
                execution_time: data.execution_time
              };
              
              setVoiceCommands(prev => [newCommand, ...prev.slice(0, 99)]); // Keep last 100 commands
              updateStats(newCommand);
            }
            break;
          case 'voice_status':
            setIsListening(data.listening);
            setIsRecording(data.recording);
            break;
          case 'voice_transcription':
            setCurrentTranscription(data.text);
            break;
          case 'voice_audio_level':
            setAudioLevel(data.level);
            break;
          case 'voice_history':
            setVoiceCommands(data.history || []);
            setStats(data.stats || stats);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage, agentId]);

  const updateStats = (newCommand: VoiceCommand) => {
    setStats(prev => {
      const newStats = {
        total_commands: prev.total_commands + 1,
        session_commands: prev.session_commands + 1,
        successful_commands: prev.successful_commands + (newCommand.status === 'executed' ? 1 : 0),
        failed_commands: prev.failed_commands + (newCommand.status === 'failed' ? 1 : 0),
        average_confidence: prev.average_confidence, // Would need proper calculation
        last_command: newCommand.timestamp
      };
      
      // Recalculate average confidence
      const allCommands = [...voiceCommands, newCommand];
      newStats.average_confidence = allCommands.reduce((sum, cmd) => sum + cmd.confidence, 0) / allCommands.length;
      
      return newStats;
    });
  };

  const toggleVoiceListening = () => {
    if (!agentId) return;
    
    const action = isListening ? 'stop' : 'start';
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'voice_control',
      action: action,
      params: {
        sensitivity: sensitivity,
        language: language
      }
    }));
  };

  const sendCustomCommand = () => {
    if (!agentId || !customCommand.trim()) return;
    
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'voice_control',
      action: 'execute_command',
      params: {
        command: customCommand.trim()
      }
    }));
    
    setCustomCommand("");
  };

  const clearHistory = () => {
    if (!agentId) return;
    
    setVoiceCommands([]);
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'voice_control',
      action: 'clear'
    }));
  };

  const exportHistory = () => {
    const csvContent = [
      'Timestamp,Command,Transcription,Confidence,Status,Response,Execution Time',
      ...voiceCommands.map(cmd => 
        `"${cmd.timestamp}","${cmd.command}","${cmd.transcription}",${cmd.confidence},"${cmd.status}","${cmd.response || ''}",${cmd.execution_time || 0}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_commands_${agentId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select an agent to access voice control features</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Control Panel
            <Badge variant={isListening ? "default" : "secondary"}>
              {isListening ? "Listening" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={toggleVoiceListening}
              variant={isListening ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start Listening
                </>
              )}
            </Button>
            <Button
              onClick={clearHistory}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </Button>
            <Button
              onClick={exportHistory}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Voice Settings */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sensitivity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm w-12">{sensitivity.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="it-IT">Italian</option>
                    <option value="pt-PT">Portuguese</option>
                    <option value="ru-RU">Russian</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                    <option value="ja-JP">Japanese</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audio Level</label>
                  <div className="flex items-center gap-2">
                    {audioLevel > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <Progress value={audioLevel * 100} className="flex-1" />
                    <span className="text-sm w-12">{Math.round(audioLevel * 100)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-6 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.total_commands}</div>
                <div className="text-xs text-muted-foreground">Total Commands</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.session_commands}</div>
                <div className="text-xs text-muted-foreground">This Session</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.successful_commands}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.failed_commands}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(stats.average_confidence)}`}>
                  {Math.round(stats.average_confidence * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-sm font-bold">
                  {stats.last_command ? new Date(stats.last_command).toLocaleTimeString() : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Last Command</div>
              </CardContent>
            </Card>
          </div>

          {/* Current Transcription */}
          {isListening && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="h-4 w-4" />
                  <span className="text-sm font-medium">Live Transcription</span>
                  {isRecording && <Badge variant="destructive" className="animate-pulse">Recording</Badge>}
                </div>
                <div className="bg-muted/50 rounded p-3 min-h-[60px] flex items-center">
                  <div className="text-sm font-mono">
                    {currentTranscription || "Listening for voice commands..."}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Command Input */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Manual Command</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter command to execute..."
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendCustomCommand()}
                  className="flex-1"
                />
                <Button
                  onClick={sendCustomCommand}
                  disabled={!customCommand.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Execute
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Command History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Voice Command History ({voiceCommands.length})</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{voiceCommands.length} commands</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96" ref={scrollAreaRef}>
                {voiceCommands.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Command className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No voice commands recorded</p>
                    {!isListening && (
                      <p className="text-sm mt-2">Start listening to capture voice commands</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceCommands.map((command) => (
                      <div
                        key={command.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(command.status)}
                            <Badge variant={command.status === 'executed' ? 'default' : 
                                           command.status === 'failed' ? 'destructive' : 'secondary'}>
                              {command.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={getConfidenceColor(command.confidence)}>
                              {Math.round(command.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(command.timestamp).toLocaleTimeString()}
                            </span>
                            {command.execution_time && (
                              <Badge variant="outline" className="text-xs">
                                {command.execution_time}ms
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium mb-1">Transcription:</div>
                            <div className="bg-muted/50 rounded p-2 text-sm font-mono">
                              "{command.transcription}"
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium mb-1">Command Executed:</div>
                            <div className="bg-muted/50 rounded p-2 text-sm font-mono">
                              {command.command}
                            </div>
                          </div>
                          
                          {command.response && (
                            <div>
                              <div className="text-sm font-medium mb-1">Response:</div>
                              <div className="bg-muted/50 rounded p-2 text-sm font-mono">
                                {command.response.length > 200 
                                  ? `${command.response.substring(0, 200)}...`
                                  : command.response
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {isListening && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Voice control is active. Speak commands clearly for automatic execution.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VoiceControlPanel;