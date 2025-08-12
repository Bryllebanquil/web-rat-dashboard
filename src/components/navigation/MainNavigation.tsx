import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Shield, 
  Activity, 
  FileText, 
  Settings, 
  Users, 
  Eye,
  Camera,
  Video,
  Mic,
  Wifi,
  Database,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface MainNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  agents: any[];
  isConnected: boolean;
  configStatus: any;
}

const MainNavigation: React.FC<MainNavigationProps> = ({
  activeSection,
  onSectionChange,
  agents,
  isConnected,
  configStatus
}) => {
  const navigationSections = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Monitor,
      description: 'Overview and system status',
      badge: agents.length
    },
    {
      id: 'streaming',
      label: 'Streaming',
      icon: Video,
      description: 'Screen and camera streaming',
      badge: agents.filter(a => a.status === 'online').length
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'UAC bypass and evasion',
      badge: configStatus?.admin_password_set ? '✓' : '!'
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Activity,
      description: 'Real-time system monitoring',
      badge: isConnected ? '✓' : '✗'
    },
    {
      id: 'persistence',
      label: 'Persistence',
      icon: Database,
      description: 'Persistence mechanisms',
      badge: agents.filter(a => a.persistence.registry || a.persistence.startup).length
    },
    {
      id: 'filetransfer',
      label: 'File Transfer',
      icon: FileText,
      description: 'File upload and download',
      badge: '0'
    },
    {
      id: 'agents',
      label: 'Agent Control',
      icon: Users,
      description: 'Individual agent management',
      badge: agents.length
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configuration and preferences',
      badge: ''
    }
  ];

  const getStatusColor = (section: any) => {
    if (section.id === 'streaming' && section.badge > 0) return 'bg-green-500';
    if (section.id === 'security' && section.badge === '✓') return 'bg-green-500';
    if (section.id === 'monitoring' && section.badge === '✓') return 'bg-green-500';
    if (section.id === 'monitoring' && section.badge === '✗') return 'bg-red-500';
    if (section.id === 'security' && section.badge === '!') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <nav className="w-64 bg-background border-r border-border h-screen overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">Ghost Stream</h1>
        </div>

        <div className="space-y-2">
          {navigationSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <div key={section.id}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                  onClick={() => onSectionChange(section.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.label}</span>
                        {section.badge && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(section)} text-white`}
                          >
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Connection Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">System Status</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Controller</span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>Agents</span>
              <div className="flex items-center gap-1">
                <span className="text-blue-600 font-medium">
                  {agents.filter(a => a.status === 'online').length}/{agents.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>Security</span>
              <div className="flex items-center gap-1">
                {configStatus?.admin_password_set ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
                <span className={configStatus?.admin_password_set ? 'text-green-600' : 'text-yellow-600'}>
                  {configStatus?.admin_password_set ? 'Configured' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNavigation;