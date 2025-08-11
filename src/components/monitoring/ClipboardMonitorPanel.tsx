import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clipboard, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Copy, 
  Search,
  Filter,
  Eye,
  EyeOff,
  Clock,
  User,
  Globe,
  FileText,
  Image,
  Link,
  Activity
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ClipboardEntry {
  id: string;
  timestamp: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'url';
  source_app: string;
  window_title: string;
  content_length: number;
  is_sensitive?: boolean;
}

interface ClipboardStats {
  total_captures: number;
  session_captures: number;
  sensitive_captures: number;
  unique_apps: number;
  last_capture: string;
}

interface ClipboardMonitorPanelProps {
  agentId?: string | null;
}

const ClipboardMonitorPanel: React.FC<ClipboardMonitorPanelProps> = ({ agentId }) => {
  const [isActive, setIsActive] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>([]);
  const [stats, setStats] = useState<ClipboardStats>({
    total_captures: 0,
    session_captures: 0,
    sensitive_captures: 0,
    unique_apps: 0,
    last_capture: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showSensitive, setShowSensitive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'clipboard_update':
            if (data.agent_id === agentId) {
              const newEntry: ClipboardEntry = {
                id: `clip_${Date.now()}`,
                timestamp: new Date().toISOString(),
                content: data.content,
                type: data.content_type || 'text',
                source_app: data.source_app || 'Unknown',
                window_title: data.window_title || 'Unknown Window',
                content_length: data.content.length,
                is_sensitive: detectSensitiveContent(data.content)
              };
              
              setClipboardHistory(prev => [newEntry, ...prev.slice(0, 499)]); // Keep last 500 entries
              updateStats(newEntry);
            }
            break;
          case 'clipboard_status':
            setIsActive(data.active);
            break;
          case 'clipboard_history':
            setClipboardHistory(data.history || []);
            setStats(data.stats || stats);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage, agentId]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [clipboardHistory, autoScroll]);

  const detectSensitiveContent = (content: string): boolean => {
    const sensitivePatterns = [
      /password/i,
      /credit.*card/i,
      /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/,  // Credit card numbers
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // Email addresses
      /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?/,  // URLs
      /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
      /api[_-]?key/i,
      /token/i,
      /secret/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(content));
  };

  const updateStats = (newEntry: ClipboardEntry) => {
    setStats(prev => ({
      total_captures: prev.total_captures + 1,
      session_captures: prev.session_captures + 1,
      sensitive_captures: prev.sensitive_captures + (newEntry.is_sensitive ? 1 : 0),
      unique_apps: prev.unique_apps, // Would need to calculate properly
      last_capture: newEntry.timestamp
    }));
  };

  const toggleClipboardMonitoring = () => {
    if (!agentId) return;
    
    const action = isActive ? 'stop' : 'start';
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'clipboard',
      action: action
    }));
  };

  const clearHistory = () => {
    if (!agentId) return;
    
    setClipboardHistory([]);
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: 'clipboard',
      action: 'clear'
    }));
  };

  const exportHistory = () => {
    const filteredHistory = getFilteredHistory();
    const csvContent = [
      'Timestamp,Type,Source App,Window Title,Content Length,Content',
      ...filteredHistory.map(entry => 
        `"${entry.timestamp}","${entry.type}","${entry.source_app}","${entry.window_title}",${entry.content_length},"${entry.content.replace(/"/g, '""')}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipboard_history_${agentId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // Could show a toast notification here
    });
  };

  const getFilteredHistory = () => {
    return clipboardHistory.filter(entry => {
      const matchesSearch = searchTerm === "" || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.source_app.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.window_title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === "all" || entry.type === selectedType;
      const matchesSensitive = showSensitive || !entry.is_sensitive;
      
      return matchesSearch && matchesType && matchesSensitive;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'url': return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-blue-100 text-blue-800';
      case 'file': return 'bg-green-100 text-green-800';
      case 'url': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHistory = getFilteredHistory();

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clipboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select an agent to monitor clipboard activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Clipboard Monitor
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={toggleClipboardMonitoring}
              variant={isActive ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isActive ? (
                <>
                  <Pause className="h-4 w-4" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Monitoring
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

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.total_captures}</div>
                <div className="text-xs text-muted-foreground">Total Captures</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.session_captures}</div>
                <div className="text-xs text-muted-foreground">This Session</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.sensitive_captures}</div>
                <div className="text-xs text-muted-foreground">Sensitive</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.unique_apps}</div>
                <div className="text-xs text-muted-foreground">Unique Apps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-sm font-bold">
                  {stats.last_capture ? new Date(stats.last_capture).toLocaleTimeString() : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Last Capture</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search clipboard content, apps, or windows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="file">File</option>
              <option value="url">URL</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm">Show Sensitive</label>
              <Switch
                checked={showSensitive}
                onCheckedChange={setShowSensitive}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Auto Scroll</label>
              <Switch
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
            </div>
          </div>

          {/* Clipboard History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Clipboard History ({filteredHistory.length})</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{filteredHistory.length} entries</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96" ref={scrollAreaRef}>
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clipboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No clipboard activity detected</p>
                    {!isActive && (
                      <p className="text-sm mt-2">Start monitoring to capture clipboard changes</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 border rounded-lg ${
                          entry.is_sensitive ? 'border-red-200 bg-red-50/50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(entry.type)}
                            <Badge className={getTypeColor(entry.type)}>
                              {entry.type.toUpperCase()}
                            </Badge>
                            {entry.is_sensitive && (
                              <Badge variant="destructive" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Sensitive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(entry.content)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.source_app}
                            </div>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {entry.window_title}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {entry.content_length} chars
                            </div>
                          </div>
                          
                          <div className="bg-muted/50 rounded p-3">
                            <div className="text-sm font-mono break-all">
                              {entry.is_sensitive && !showSensitive
                                ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                                : entry.content.length > 200
                                ? `${entry.content.substring(0, 200)}...`
                                : entry.content
                              }
                            </div>
                          </div>
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

      {/* Real-time Status */}
      {isActive && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Clipboard monitoring is active. All clipboard changes will be captured in real-time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ClipboardMonitorPanel;