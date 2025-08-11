import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Info, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  Monitor, 
  Network, 
  Zap,
  MemoryStick,
  Wifi,
  Shield
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface SystemInfoPanelProps {
  agentId?: string | null;
}

interface SystemInfo {
  general: {
    hostname: string;
    os: string;
    version: string;
    architecture: string;
    domain: string;
    uptime: string;
    lastBoot: string;
  };
  hardware: {
    cpu: {
      name: string;
      cores: number;
      threads: number;
      usage: number;
      temperature?: number;
    };
    memory: {
      total: number;
      available: number;
      usage: number;
    };
    storage: Array<{
      drive: string;
      total: number;
      free: number;
      usage: number;
      type: string;
    }>;
    gpu?: {
      name: string;
      memory: number;
      driver: string;
    };
  };
  network: Array<{
    name: string;
    type: string;
    status: string;
    ip: string;
    mac: string;
    speed?: string;
  }>;
  security: {
    antivirus: Array<{
      name: string;
      status: string;
      updated: string;
    }>;
    firewall: {
      status: string;
      profile: string;
    };
    defender: {
      status: string;
      realTimeProtection: boolean;
    };
  };
}

const SystemInfoPanel: React.FC<SystemInfoPanelProps> = ({ agentId }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'system_info_response') {
          setSystemInfo(data.info);
          setLastUpdate(new Date().toLocaleTimeString());
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        setIsLoading(false);
      }
    }
  }, [lastMessage]);

  const refreshSystemInfo = () => {
    setIsLoading(true);
    sendMessage(JSON.stringify({
      type: 'get_system_info',
      agent_id: agentId
    }));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Mock data for demonstration
  useEffect(() => {
    if (!systemInfo) {
      setSystemInfo({
        general: {
          hostname: "DESKTOP-ABC123",
          os: "Windows 11 Pro",
          version: "10.0.22621",
          architecture: "x64",
          domain: "WORKGROUP",
          uptime: "3 days, 14 hours",
          lastBoot: "2024-01-12 09:30:00"
        },
        hardware: {
          cpu: {
            name: "Intel Core i7-12700K",
            cores: 12,
            threads: 20,
            usage: 25.4,
            temperature: 42
          },
          memory: {
            total: 34359738368, // 32GB
            available: 16106127360, // 15GB
            usage: 53.1
          },
          storage: [
            {
              drive: "C:",
              total: 1000204886016, // ~1TB
              free: 450204886016, // ~450GB
              usage: 55,
              type: "SSD"
            },
            {
              drive: "D:",
              total: 2000398934016, // ~2TB
              free: 1500398934016, // ~1.5TB
              usage: 25,
              type: "HDD"
            }
          ],
          gpu: {
            name: "NVIDIA GeForce RTX 4070",
            memory: 12884901888, // 12GB
            driver: "537.13"
          }
        },
        network: [
          {
            name: "Ethernet",
            type: "Wired",
            status: "Connected",
            ip: "192.168.1.100",
            mac: "00:11:22:33:44:55",
            speed: "1 Gbps"
          },
          {
            name: "Wi-Fi",
            type: "Wireless",
            status: "Disconnected",
            ip: "",
            mac: "AA:BB:CC:DD:EE:FF"
          }
        ],
        security: {
          antivirus: [
            {
              name: "Windows Defender",
              status: "Disabled",
              updated: "2024-01-15"
            }
          ],
          firewall: {
            status: "Enabled",
            profile: "Public"
          },
          defender: {
            status: "Disabled",
            realTimeProtection: false
          }
        }
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              <CardTitle>System Information</CardTitle>
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
                onClick={refreshSystemInfo}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {systemInfo ? (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="hardware">Hardware</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Hostname</label>
                      <p className="text-lg font-semibold">{systemInfo.general.hostname}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Operating System</label>
                      <p className="text-lg font-semibold">{systemInfo.general.os}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Version</label>
                      <p className="text-lg font-semibold">{systemInfo.general.version}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Architecture</label>
                      <p className="text-lg font-semibold">{systemInfo.general.architecture}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Domain</label>
                      <p className="text-lg font-semibold">{systemInfo.general.domain}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Uptime</label>
                      <p className="text-lg font-semibold">{systemInfo.general.uptime}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hardware" className="space-y-4 mt-6">
                <div className="space-y-6">
                  {/* CPU Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        <CardTitle className="text-base">Processor</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Model</label>
                          <p className="font-medium">{systemInfo.hardware.cpu.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Cores/Threads</label>
                          <p className="font-medium">{systemInfo.hardware.cpu.cores}/{systemInfo.hardware.cpu.threads}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CPU Usage</span>
                          <span>{systemInfo.hardware.cpu.usage}%</span>
                        </div>
                        <Progress value={systemInfo.hardware.cpu.usage} className="h-2" />
                      </div>
                      {systemInfo.hardware.cpu.temperature && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Temperature</span>
                            <span>{systemInfo.hardware.cpu.temperature}°C</span>
                          </div>
                          <Progress value={systemInfo.hardware.cpu.temperature} max={100} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Memory Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4" />
                        <CardTitle className="text-base">Memory</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Total</label>
                          <p className="font-medium">{formatBytes(systemInfo.hardware.memory.total)}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Available</label>
                          <p className="font-medium">{formatBytes(systemInfo.hardware.memory.available)}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>{systemInfo.hardware.memory.usage}%</span>
                        </div>
                        <Progress value={systemInfo.hardware.memory.usage} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Storage Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <CardTitle className="text-base">Storage</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {systemInfo.hardware.storage.map((drive, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{drive.drive}</span>
                              <Badge variant="secondary">{drive.type}</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatBytes(drive.free)} free of {formatBytes(drive.total)}
                            </span>
                          </div>
                          <Progress value={drive.usage} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* GPU Information */}
                  {systemInfo.hardware.gpu && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <CardTitle className="text-base">Graphics</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">GPU</label>
                            <p className="font-medium">{systemInfo.hardware.gpu.name}</p>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">VRAM</label>
                            <p className="font-medium">{formatBytes(systemInfo.hardware.gpu.memory)}</p>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Driver Version</label>
                            <p className="font-medium">{systemInfo.hardware.gpu.driver}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="network" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {systemInfo.network.map((adapter, index) => (
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
                            <label className="text-sm text-muted-foreground">Type</label>
                            <p className="font-medium">{adapter.type}</p>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">MAC Address</label>
                            <p className="font-medium font-mono">{adapter.mac}</p>
                          </div>
                          {adapter.ip && (
                            <div>
                              <label className="text-sm text-muted-foreground">IP Address</label>
                              <p className="font-medium font-mono">{adapter.ip}</p>
                            </div>
                          )}
                          {adapter.speed && (
                            <div>
                              <label className="text-sm text-muted-foreground">Speed</label>
                              <p className="font-medium">{adapter.speed}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {/* Windows Defender */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <CardTitle className="text-base">Windows Defender</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Status</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${systemInfo.security.defender.status === 'Enabled' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <p className="font-medium">{systemInfo.security.defender.status}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Real-time Protection</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${systemInfo.security.defender.realTimeProtection ? 'bg-green-500' : 'bg-red-500'}`} />
                            <p className="font-medium">{systemInfo.security.defender.realTimeProtection ? 'Enabled' : 'Disabled'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Firewall */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <CardTitle className="text-base">Windows Firewall</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Status</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${systemInfo.security.firewall.status === 'Enabled' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <p className="font-medium">{systemInfo.security.firewall.status}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Profile</label>
                          <p className="font-medium">{systemInfo.security.firewall.profile}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Antivirus */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Antivirus Software</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {systemInfo.security.antivirus.map((av, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{av.name}</p>
                            <p className="text-sm text-muted-foreground">Last updated: {av.updated}</p>
                          </div>
                          <Badge variant={av.status === 'Enabled' ? 'default' : 'destructive'}>
                            {av.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading system information...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">No system information available</p>
                  <Button onClick={refreshSystemInfo}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Load System Info
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemInfoPanel;