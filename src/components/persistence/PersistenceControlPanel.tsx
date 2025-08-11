import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  FolderOpen, 
  Clock, 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2
} from 'lucide-react';

interface PersistenceControlPanelProps {
  agentId: string;
  persistence: {
    registry: { active: boolean; count: number; entries: string[] };
    startup: { active: boolean; count: number; entries: string[] };
    scheduledTasks: { active: boolean; count: number; entries: string[] };
    services: { active: boolean; count: number; entries: string[] };
  };
  onPersistenceAction: (method: string, action: string, params?: any) => void;
}

const PersistenceControlPanel: React.FC<PersistenceControlPanelProps> = ({
  agentId,
  persistence,
  onPersistenceAction
}) => {
  const [activeTab, setActiveTab] = useState('registry');

  const PersistenceMethod = ({ 
    method, 
    icon: Icon, 
    label, 
    data 
  }: {
    method: string;
    icon: any;
    label: string;
    data: { active: boolean; count: number; entries: string[] };
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
          <Badge variant={data.active ? "default" : "secondary"}>
            {data.count} Active
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPersistenceAction(method, 'add')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onPersistenceAction(method, 'remove_all')}
            disabled={data.count === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove All
          </Button>
        </div>
      </div>

      {data.entries.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Active Entries:</span>
          {data.entries.map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm font-mono">{entry}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPersistenceAction(method, 'remove', { entry })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.count === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No persistence methods active
        </div>
      )}
    </div>
  );

  const uacBypassMethods = [
    { name: 'EventVwr.exe Hijacking', status: 'available', risk: 'medium' },
    { name: 'fodhelper.exe Bypass', status: 'active', risk: 'low' },
    { name: 'sdclt.exe Bypass', status: 'available', risk: 'medium' },
    { name: 'SilentCleanup Task', status: 'failed', risk: 'high' },
    { name: 'ComputerDefaults.exe', status: 'available', risk: 'low' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Persistence & Privilege Escalation - Agent {agentId}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="registry">Registry</TabsTrigger>
            <TabsTrigger value="startup">Startup</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="uac">UAC Bypass</TabsTrigger>
          </TabsList>

          <TabsContent value="registry" className="mt-4">
            <PersistenceMethod
              method="registry"
              icon={Database}
              label="Registry Persistence"
              data={persistence.registry}
            />
          </TabsContent>

          <TabsContent value="startup" className="mt-4">
            <PersistenceMethod
              method="startup"
              icon={FolderOpen}
              label="Startup Folder"
              data={persistence.startup}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <PersistenceMethod
              method="scheduledTasks"
              icon={Clock}
              label="Scheduled Tasks"
              data={persistence.scheduledTasks}
            />
          </TabsContent>

          <TabsContent value="uac" className="mt-4 space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                UAC bypass methods may be detected by advanced security solutions.
              </AlertDescription>
            </Alert>

            {uacBypassMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                    <Badge variant={
                      method.status === 'active' ? 'default' :
                      method.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {method.status}
                    </Badge>
                    <Badge variant="outline" className={
                      method.risk === 'high' ? 'border-red-500 text-red-500' :
                      method.risk === 'medium' ? 'border-yellow-500 text-yellow-500' :
                      'border-green-500 text-green-500'
                    }>
                      {method.risk.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant={method.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => onPersistenceAction('uac', method.status === 'active' ? 'disable' : 'enable', { method: method.name })}
                  disabled={method.status === 'failed'}
                >
                  {method.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>Registry: {persistence.registry.count} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            <span>Startup: {persistence.startup.count} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Tasks: {persistence.scheduledTasks.count} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Services: {persistence.services.count} entries</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersistenceControlPanel;