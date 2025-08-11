import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Network, 
  RefreshCw, 
  Wifi, 
  Globe, 
  Activity,
  ArrowUp,
  ArrowDown,
  Signal,
  Router
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface NetworkPanelProps {
  agentId?: string | null;
}

interface NetworkConnection {
  protocol: string;
  localAddress: string;
  localPort: string;
  remoteAddress: string;
  remotePort: string;
  state: string;
  process: string;
  pid: number;
}

interface NetworkAdapter {
  name: string;
  description: string;
  type: string;
  status: string;
  ip: string;
  subnet: string;
  gateway: string;
  dns: string[];
  mac: string;
  speed: string;
  bytesReceived: number;
  bytesSent: number;
}

interface NetworkStats {
  totalBandwidth: number;
  uploadSpeed: number;
  downloadSpeed: number;
  packetsReceived: number;
  packetsSent: number;
  errors: number;
  drops: number;
}

const NetworkPanel: React.FC<NetworkPanelProps> = ({ agentId }) => {
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'network_info_response') {
          setConnections(data.connections || []);
          setAdapters(data.adapters || []);
          setStats(data.stats || null);
          setLastUpdate(new Date().toLocaleTimeString());
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        setIsLoading(false);
      }
    }
  }, [lastMessage]);

  const refreshNetworkInfo = () => {
    setIsLoading(true);
    sendMessage(JSON.stringify({
      type: 'get_network_info',
      agent_id: agentId
    }));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getConnectionStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'established': return 'bg-green-500';
      case 'listening': return 'bg-blue-500';
      case 'time_wait': return 'bg-yellow-500';
      case 'close_wait': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Mock data for demonstration
  useEffect(() => {
    if (connections.length === 0) {
      setConnections([
        { protocol: "TCP", localAddress: "192.168.1.100", localPort: "443", remoteAddress: "142.250.191.78", remotePort: "443", state: "ESTABLISHED", process: "chrome.exe", pid: 5678 },
        { protocol: "TCP", localAddress: "0.0.0.0", localPort: "8080", remoteAddress: "0.0.0.0", remotePort: "0", state: "LISTENING", process: "agent.exe", pid: 7890 },
        { protocol: "UDP", localAddress: "192.168.1.100", localPort: "53", remoteAddress: "8.8.8.8", remotePort: "53", state: "ESTABLISHED", process: "svchost.exe", pid: 1234 },
        { protocol: "TCP", localAddress: "192.168.1.100", localPort: "80", remoteAddress: "93.184.216.34", remotePort: "80", state: "TIME_WAIT", process: "chrome.exe", pid: 5678 },
      ]);

      setAdapters([
        {
          name: "Ethernet",
          description: "Intel(R) Ethernet Connection",
          type: "Ethernet",
          status: "Connected",
          ip: "192.168.1.100",
          subnet: "255.255.255.0",
          gateway: "192.168.1.1",
          dns: ["8.8.8.8", "8.8.4.4"],
          mac: "00:11:22:33:44:55",
          speed: "1 Gbps",
          bytesReceived: 1234567890,
          bytesSent: 987654321
        },
        {
          name: "Wi-Fi",
          description: "Intel(R) Wi-Fi 6 AX200",
          type: "Wireless",
          status: "Disconnected",
          ip: "",
          subnet: "",
          gateway: "",
          dns: [],
          mac: "AA:BB:CC:DD:EE:FF",
          speed: "867 Mbps",
          bytesReceived: 0,
          bytesSent: 0
        }
      ]);

      setStats({
        totalBandwidth: 1000000000, // 1 Gbps
        uploadSpeed: 15728640, // 15 MB/s
        downloadSpeed: 52428800, // 50 MB/s
        packetsReceived: 1234567,
        packetsSent: 987654,
        errors: 12,
        drops: 3
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              <CardTitle>Network Monitoring</CardTitle>
              {agentId && (
                <Badge variant="outline">Agent: {agentId}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastUpdate}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNetworkInfo}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="adapters">Adapters</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              {/* Network Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <ArrowDown className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{stats ? formatBytes(stats.downloadSpeed) : '0 B'}/s</div>
                    <div className="text-sm text-muted-foreground">Download</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <ArrowUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{stats ? formatBytes(stats.uploadSpeed) : '0 B'}/s</div>
                    <div className="text-sm text-muted-foreground">Upload</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">{connections.length}</div>
                    <div className="text-sm text-muted-foreground">Connections</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Signal className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">{adapters.filter(a => a.status === 'Connected').length}</div>
                    <div className="text-sm text-muted-foreground">Active Adapters</div>
                  </CardContent>
                </Card>
              </div>

              {/* Bandwidth Usage */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bandwidth Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Download Speed</span>
                        <span>{formatBytes(stats.downloadSpeed)}/s</span>
                      </div>
                      <Progress value={(stats.downloadSpeed / stats.totalBandwidth) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Upload Speed</span>
                        <span>{formatBytes(stats.uploadSpeed)}/s</span>
                      </div>
                      <Progress value={(stats.uploadSpeed / stats.totalBandwidth) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="adapters" className="space-y-4 mt-6">
              <div className="space-y-4">
                {adapters.map((adapter, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {adapter.type === 'Wireless' ? <Wifi className="h-4 w-4" /> : <Network className="h-4 w-4" />}
                          <CardTitle className="text-base">{adapter.name}</CardTitle>
                        </div>
                        <Badge variant={adapter.status === 'Connected' ? 'default' : 'secondary'}>
                          {adapter.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Description</label>
                          <p className="font-medium">{adapter.description}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">MAC Address</label>
                          <p className="font-medium font-mono">{adapter.mac}</p>
                        </div>
                        {adapter.ip && (
                          <>
                            <div>
                              <label className="text-sm text-muted-foreground">IP Address</label>
                              <p className="font-medium font-mono">{adapter.ip}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">Subnet Mask</label>
                              <p className="font-medium font-mono">{adapter.subnet}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">Default Gateway</label>
                              <p className="font-medium font-mono">{adapter.gateway}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">DNS Servers</label>
                              <p className="font-medium font-mono">{adapter.dns.join(', ')}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="text-sm text-muted-foreground">Speed</label>
                          <p className="font-medium">{adapter.speed}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Data Transfer</label>
                          <p className="font-medium">
                            ↓ {formatBytes(adapter.bytesReceived)} / ↑ {formatBytes(adapter.bytesSent)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="connections" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Network Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Local Address</TableHead>
                        <TableHead>Remote Address</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>PID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((conn, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{conn.protocol}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {conn.localAddress}:{conn.localPort}
                          </TableCell>
                          <TableCell className="font-mono">
                            {conn.remoteAddress}:{conn.remotePort}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getConnectionStateColor(conn.state)}`} />
                              {conn.state}
                            </div>
                          </TableCell>
                          <TableCell>{conn.process}</TableCell>
                          <TableCell className="font-mono">{conn.pid}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {connections.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active connections found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4 mt-6">
              {stats && (
                <div className="grid gap-4">
                  {/* Traffic Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Traffic Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {stats.packetsReceived.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Packets Received</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {stats.packetsSent.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Packets Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-500">
                            {stats.errors}
                          </div>
                          <div className="text-sm text-muted-foreground">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-500">
                            {stats.drops}
                          </div>
                          <div className="text-sm text-muted-foreground">Dropped Packets</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current Speeds */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Current Network Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 border rounded-lg">
                          <ArrowDown className="h-8 w-8 text-green-500" />
                          <div>
                            <div className="text-lg font-bold">{formatBytes(stats.downloadSpeed)}/s</div>
                            <div className="text-sm text-muted-foreground">Download Speed</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 border rounded-lg">
                          <ArrowUp className="h-8 w-8 text-blue-500" />
                          <div>
                            <div className="text-lg font-bold">{formatBytes(stats.uploadSpeed)}/s</div>
                            <div className="text-sm text-muted-foreground">Upload Speed</div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Bandwidth Utilization</span>
                          <span>{((stats.downloadSpeed + stats.uploadSpeed) / stats.totalBandwidth * 100).toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={((stats.downloadSpeed + stats.uploadSpeed) / stats.totalBandwidth) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t mt-6">
            <Button variant="outline" size="sm" onClick={refreshNetworkInfo}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Network Info
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                sendMessage(JSON.stringify({
                  type: 'issue_command',
                  command: 'netstat -an',
                  agent_id: agentId
                }));
              }}
            >
              <Network className="mr-2 h-4 w-4" />
              Get Netstat
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                sendMessage(JSON.stringify({
                  type: 'issue_command',
                  command: 'ipconfig /all',
                  agent_id: agentId
                }));
              }}
            >
              <Router className="mr-2 h-4 w-4" />
              IP Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkPanel;