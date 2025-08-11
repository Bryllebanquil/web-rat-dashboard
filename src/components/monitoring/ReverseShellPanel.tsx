import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Terminal, 
  Play, 
  Pause, 
  Square,
  Send,
  Download, 
  Upload,
  Trash2,
  Copy,
  History,
  FolderOpen,
  File,
  Settings,
  Activity,
  Clock,
  User,
  HardDrive,
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ShellSession {
  id: string;
  timestamp: string;
  command: string;
  output: string;
  exit_code: number;
  execution_time: number;
  working_directory: string;
  user: string;
}

interface ShellStats {
  total_commands: number;
  session_commands: number;
  successful_commands: number;
  failed_commands: number;
  session_duration: number;
  current_directory: string;
  current_user: string;
}

interface ReverseShellPanelProps {
  agentId?: string | null;
}

const ReverseShellPanel: React.FC<ReverseShellPanelProps> = ({ agentId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shellSessions, setShellSessions] = useState<ShellSession[]>([]);
  const [stats, setStats] = useState<ShellStats>({
    total_commands: 0,
    session_commands: 0,
    successful_commands: 0,
    failed_commands: 0,
    session_duration: 0,
    current_directory: "C:\\",
    current_user: "Unknown"
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [shellType, setShellType] = useState<'cmd' | 'powershell' | 'bash'>('cmd');
  const [activeTab, setActiveTab] = useState("shell");
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'shell_output':
            if (data.agent_id === agentId) {
              const newSession: ShellSession = {
                id: `shell_${Date.now()}`,
                timestamp: new Date().toISOString(),
                command: data.command,
                output: data.output,
                exit_code: data.exit_code || 0,
                execution_time: data.execution_time || 0,
                working_directory: data.working_directory || stats.current_directory,
                user: data.user || stats.current_user
              };
              
              setShellSessions(prev => [newSession, ...prev.slice(0, 499)]); // Keep last 500 sessions
              updateStats(newSession);
              setIsExecuting(false);
            }
            break;
          case 'shell_status':
            setIsConnected(data.connected);
            if (data.stats) {
              setStats(prev => ({ ...prev, ...data.stats }));
            }
            break;
          case 'shell_directory_changed':
            setStats(prev => ({ ...prev, current_directory: data.directory }));
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage, agentId]);

  // Auto-scroll to bottom when new sessions arrive
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [shellSessions, autoScroll]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const updateStats = (newSession: ShellSession) => {
    setStats(prev => ({
      total_commands: prev.total_commands + 1,
      session_commands: prev.session_commands + 1,
      successful_commands: prev.successful_commands + (newSession.exit_code === 0 ? 1 : 0),
      failed_commands: prev.failed_commands + (newSession.exit_code !== 0 ? 1 : 0),
      session_duration: prev.session_duration,
      current_directory: newSession.working_directory,
      current_user: newSession.user
    }));
  };

  const connectShell = () => {
    if (!agentId) return;
    
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'reverse_shell',
      action: 'connect',
      params: {
        shell_type: shellType
      }
    }));
  };

  const disconnectShell = () => {
    if (!agentId) return;
    
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'reverse_shell',
      action: 'disconnect'
    }));
  };

  const executeCommand = () => {
    if (!agentId || !currentCommand.trim() || !isConnected) return;
    
    setIsExecuting(true);
    
    // Add to command history
    const newHistory = [currentCommand, ...commandHistory.filter(cmd => cmd !== currentCommand)].slice(0, 50);
    setCommandHistory(newHistory);
    setHistoryIndex(-1);
    
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'reverse_shell',
      action: 'execute',
      params: {
        command: currentCommand.trim(),
        shell_type: shellType
      }
    }));
    
    setCurrentCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand("");
      }
    }
  };

  const clearSessions = () => {
    setShellSessions([]);
    if (agentId) {
      sendMessage(JSON.stringify({
        type: 'monitoring_control',
        agent_id: agentId,
        monitor_type: 'reverse_shell',
        action: 'clear'
      }));
    }
  };

  const exportSessions = () => {
    const csvContent = [
      'Timestamp,Command,Exit Code,Execution Time,Working Directory,User,Output',
      ...shellSessions.map(session => 
        `"${session.timestamp}","${session.command}",${session.exit_code},${session.execution_time},"${session.working_directory}","${session.user}","${session.output.replace(/"/g, '""')}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shell_sessions_${agentId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
  };

  const getStatusIcon = (exitCode: number) => {
    if (exitCode === 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getPrompt = () => {
    const user = stats.current_user || "user";
    const dir = stats.current_directory || "C:\\";
    switch (shellType) {
      case 'powershell':
        return `PS ${dir}> `;
      case 'bash':
        return `${user}@agent:${dir}$ `;
      default:
        return `${dir}> `;
    }
  };

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select an agent to access reverse shell features</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Reverse Shell Panel
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shell">Shell</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="shell" className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  onClick={isConnected ? disconnectShell : connectShell}
                  variant={isConnected ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isConnected ? (
                    <>
                      <Square className="h-4 w-4" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm">Shell Type:</label>
                  <select
                    value={shellType}
                    onChange={(e) => setShellType(e.target.value as any)}
                    className="px-3 py-1 border rounded-md bg-background text-sm"
                    disabled={isConnected}
                  >
                    <option value="cmd">CMD</option>
                    <option value="powershell">PowerShell</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm">Auto Scroll</label>
                  <Switch
                    checked={autoScroll}
                    onCheckedChange={setAutoScroll}
                  />
                </div>
              </div>

              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-5 mb-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{stats.session_commands}</div>
                    <div className="text-xs text-muted-foreground">Commands</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-green-500">{stats.successful_commands}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-red-500">{stats.failed_commands}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{Math.round(stats.session_duration / 60)}m</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-sm font-bold">{stats.current_user}</div>
                    <div className="text-xs text-muted-foreground">User</div>
                  </CardContent>
                </Card>
              </div>

              {/* Terminal Output */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Terminal Output</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={clearSessions}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportSessions}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm">
                    <ScrollArea className="h-96" ref={terminalRef}>
                      {shellSessions.length === 0 ? (
                        <div className="text-center py-8 text-green-400/60">
                          <Terminal className="h-12 w-12 mx-auto mb-4" />
                          <p>No shell sessions yet</p>
                          {!isConnected && (
                            <p className="mt-2">Connect to start executing commands</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {shellSessions.slice().reverse().map((session) => (
                            <div key={session.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400">{getPrompt()}</span>
                                <span className="text-white">{session.command}</span>
                                <div className="flex items-center gap-1 ml-auto">
                                  {getStatusIcon(session.exit_code)}
                                  <span className="text-xs text-gray-400">
                                    {session.execution_time}ms
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 text-gray-400 hover:text-white"
                                    onClick={() => copyOutput(session.output)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {session.output && (
                                <div className="pl-4 text-gray-300 whitespace-pre-wrap">
                                  {session.output}
                                </div>
                              )}
                              <Separator className="bg-gray-700" />
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  
                  {/* Command Input */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-black text-green-400 rounded-lg p-2 font-mono text-sm">
                      <span className="text-blue-400 mr-2">{getPrompt()}</span>
                      <Input
                        ref={inputRef}
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isConnected || isExecuting}
                        className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0"
                        placeholder={isConnected ? "Enter command..." : "Connect to enable input"}
                      />
                    </div>
                    <Button
                      onClick={executeCommand}
                      disabled={!isConnected || !currentCommand.trim() || isExecuting}
                      className="flex items-center gap-2"
                    >
                      {isExecuting ? (
                        <>
                          <Activity className="h-4 w-4 animate-spin" />
                          Executing
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Command History ({commandHistory.length})</span>
                    <Button size="sm" variant="outline" onClick={() => setCommandHistory([])}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {commandHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No command history available</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {commandHistory.map((command, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => setCurrentCommand(command)}
                          >
                            <span className="font-mono text-sm">{command}</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shell Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Current Directory</label>
                      <div className="bg-muted/50 rounded p-2 text-sm font-mono">
                        {stats.current_directory}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Current User</label>
                      <div className="bg-muted/50 rounded p-2 text-sm font-mono">
                        {stats.current_user}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-scroll Terminal</label>
                      <Switch
                        checked={autoScroll}
                        onCheckedChange={setAutoScroll}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Default Shell Type</label>
                      <select
                        value={shellType}
                        onChange={(e) => setShellType(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        disabled={isConnected}
                      >
                        <option value="cmd">Command Prompt (CMD)</option>
                        <option value="powershell">PowerShell</option>
                        <option value="bash">Bash (if available)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {isConnected && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Reverse shell is connected. You can execute commands remotely on the target system.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ReverseShellPanel;