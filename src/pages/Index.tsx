import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    document.title = "Ghost Stream Control – Security Dashboard";
    setMeta("description", "Realtime security, streaming and controller status dashboard with interactive charts.");
  }, []);

  // Overview donut datasets
  const agentReport = useMemo(() => (
    [
      { name: "Problems", value: 8 },
      { name: "Errors", value: 3 },
      { name: "Bugs", value: 12 },
    ]
  ), []);

  const connectionStatus = useMemo(() => (
    [
      { name: "Connected", value: 42 },
      { name: "Offline", value: 7 },
    ]
  ), []);

  const persistenceMethods = useMemo(() => (
    [
      { name: "Registry Keys", value: 11 },
      { name: "Startup Entries", value: 5 },
      { name: "Scheduled Tasks", value: 9 },
    ]
  ), []);

  const uacBypass = useMemo(() => (
    [
      { name: "EventVwr.exe Hijacking", value: 4 },
      { name: "sdclt.exe Bypass", value: 3 },
      { name: "SilentCleanup", value: 6 },
    ]
  ), []);

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
            <ActiveAgentsCard />
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
      </section>
    </main>
  );
};

export default Index;
