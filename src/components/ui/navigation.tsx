import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Monitor,
  Shield,
  Database,
  Activity,
  Upload,
  Terminal,
  Keyboard,
  List,
  Info,
  Settings,
  LogOut,
  Users,
  BarChart3,
  Video,
  Mic,
  Camera,
  Cpu,
  Network,
  Lock,
  Eye,
  Command,
  Zap,
} from "lucide-react";

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  selectedAgent?: string | null;
  agentCount?: number;
  onlineCount?: number;
  onLogout?: () => void;
}

const navigationItems = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    description: "Dashboard overview with metrics and charts",
    category: "main"
  },
  {
    id: "agents",
    label: "Agents",
    icon: Users,
    description: "Manage and monitor connected agents",
    category: "main"
  },
  {
    id: "streaming",
    label: "Basic Streaming",
    icon: Video,
    description: "Basic WebRTC streaming controls and monitoring",
    category: "control",
    subItems: [
      { id: "stream-video", label: "Video Stream", icon: Video },
      { id: "stream-audio", label: "Audio Stream", icon: Mic },
      { id: "stream-camera", label: "Camera Stream", icon: Camera },
      { id: "stream-settings", label: "Stream Settings", icon: Settings },
    ]
  },
  {
    id: "webrtc-advanced",
    label: "Advanced WebRTC",
    icon: Zap,
    description: "Advanced WebRTC features with adaptive bitrate, quality monitoring, and production readiness",
    category: "control",
    subItems: [
      { id: "webrtc-performance", label: "Performance", icon: Activity },
      { id: "webrtc-quality", label: "Quality Metrics", icon: BarChart3 },
      { id: "webrtc-scalability", label: "Scalability", icon: Cpu },
      { id: "webrtc-production", label: "Production Check", icon: Settings },
    ]
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Security controls and evasion techniques",
    category: "control",
    subItems: [
      { id: "security-defender", label: "Defender Control", icon: Shield },
      { id: "security-processes", label: "Process Hiding", icon: Eye },
      { id: "security-antivirus", label: "Antivirus Bypass", icon: Lock },
      { id: "security-antivm", label: "Anti-VM/Debug", icon: Cpu },
    ]
  },
  {
    id: "persistence",
    label: "Persistence",
    icon: Database,
    description: "Persistence methods and management",
    category: "control",
    subItems: [
      { id: "persist-registry", label: "Registry Keys", icon: Database },
      { id: "persist-startup", label: "Startup Folder", icon: Settings },
      { id: "persist-tasks", label: "Scheduled Tasks", icon: List },
      { id: "persist-services", label: "Windows Services", icon: Activity },
    ]
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: Activity,
    description: "Input monitoring and logging",
    category: "control",
    subItems: [
      { id: "monitor-keylogger", label: "Keylogger", icon: Keyboard },
      { id: "monitor-clipboard", label: "Clipboard", icon: FileTransfer },
      { id: "monitor-shell", label: "Reverse Shell", icon: Terminal },
      { id: "monitor-voice", label: "Voice Control", icon: Mic },
    ]
  },
  {
    id: "files",
    label: "Basic File Transfer",
    icon: FileTransfer,
    description: "Basic file upload and download management",
    category: "control"
  },
  {
    id: "files-advanced",
    label: "Advanced File Transfer",
    icon: HardDrive,
    description: "Enhanced file transfer with chunking, browser, and queue management",
    category: "control"
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
    description: "Command execution and terminal access",
    category: "tools"
  },
  {
    id: "processes",
    label: "Processes",
    icon: List,
    description: "Process listing and management",
    category: "tools"
  },
  {
    id: "system-info",
    label: "System Info",
    icon: Info,
    description: "System information and hardware details",
    category: "tools"
  },
  {
    id: "network",
    label: "Network",
    icon: Network,
    description: "Network monitoring and configuration",
    category: "tools"
  }
];

const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onViewChange,
  selectedAgent,
  agentCount = 0,
  onlineCount = 0,
  onLogout
}) => {
  const mainItems = navigationItems.filter(item => item.category === "main");
  const controlItems = navigationItems.filter(item => item.category === "control");
  const toolItems = navigationItems.filter(item => item.category === "tools");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
              N
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-foreground">Neural Control Hub</h1>
              <p className="text-xs text-muted-foreground">Agent Live Monitoring</p>
            </div>
          </div>

          {/* Agent Status */}
          {selectedAgent && (
            <Badge variant="outline" className="ml-4">
              Agent: {selectedAgent}
            </Badge>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {onlineCount}/{agentCount} Online
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {/* Main Navigation */}
            {mainItems.map((item) => (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuLink
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                    activeView === item.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => onViewChange(item.id)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}

            {/* Control Features */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-10">
                <Monitor className="mr-2 h-4 w-4" />
                Control
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[600px] gap-3 p-4 md:grid-cols-2">
                  {controlItems.map((item) => (
                    <div key={item.id} className="group">
                      <NavigationMenuLink
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        onClick={() => onViewChange(item.id)}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <div className="text-sm font-medium leading-none">{item.label}</div>
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      </NavigationMenuLink>
                      {item.subItems && (
                        <div className="mt-2 grid gap-1 pl-6">
                          {item.subItems.map((subItem) => (
                            <NavigationMenuLink
                              key={subItem.id}
                              className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              onClick={() => onViewChange(subItem.id)}
                            >
                              <subItem.icon className="h-3 w-3" />
                              {subItem.label}
                            </NavigationMenuLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Tools */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-10">
                <Command className="mr-2 h-4 w-4" />
                Tools
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
                  {toolItems.map((item) => (
                    <NavigationMenuLink
                      key={item.id}
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      onClick={() => onViewChange(item.id)}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <div className="text-sm font-medium leading-none">{item.label}</div>
                      </div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Command className="h-4 w-4" />
                <span className="sr-only">Navigation Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel>Main</DropdownMenuLabel>
              {mainItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Control</DropdownMenuLabel>
              {controlItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tools</DropdownMenuLabel>
              {toolItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          {onLogout && (
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;