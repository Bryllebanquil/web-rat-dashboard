import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  Monitor, 
  Camera, 
  Mic, 
  Settings,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

interface StreamingControlPanelProps {
  agentId: string;
  streams: {
    screen: { active: boolean; bitrate: number; fps: number; resolution: string };
    camera: { active: boolean; bitrate: number; fps: number; resolution: string };
    audio: { active: boolean; bitrate: number; sampleRate: number };
  };
  onStreamToggle: (type: 'screen' | 'camera' | 'audio', action: 'start' | 'stop') => void;
}

const StreamingControlPanel: React.FC<StreamingControlPanelProps> = ({
  agentId,
  streams,
  onStreamToggle
}) => {
  const [activeTab, setActiveTab] = useState('screen');

  const StreamControl = ({ 
    type, 
    icon: Icon, 
    label, 
    stream 
  }: { 
    type: 'screen' | 'camera' | 'audio';
    icon: any;
    label: string;
    stream: any;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
          <Badge variant={stream.active ? "default" : "secondary"}>
            {stream.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <Button
          variant={stream.active ? "destructive" : "default"}
          size="sm"
          onClick={() => onStreamToggle(type, stream.active ? 'stop' : 'start')}
        >
          {stream.active ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {stream.active ? 'Stop' : 'Start'}
        </Button>
      </div>

      {stream.active && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Bitrate:</span>
            <div className="font-mono">{stream.bitrate} kbps</div>
          </div>
          {type !== 'audio' ? (
            <>
              <div>
                <span className="text-muted-foreground">FPS:</span>
                <div className="font-mono">{stream.fps}</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Resolution:</span>
                <div className="font-mono">{stream.resolution}</div>
              </div>
            </>
          ) : (
            <div>
              <span className="text-muted-foreground">Sample Rate:</span>
              <div className="font-mono">{stream.sampleRate} Hz</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Streaming Control - Agent {agentId}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="screen" className="flex items-center gap-1">
              <Monitor className="w-4 h-4" />
              Screen
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screen" className="mt-4">
            <StreamControl
              type="screen"
              icon={Monitor}
              label="Screen Streaming"
              stream={streams.screen}
            />
          </TabsContent>

          <TabsContent value="camera" className="mt-4">
            <StreamControl
              type="camera"
              icon={Camera}
              label="Camera Streaming"
              stream={streams.camera}
            />
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <StreamControl
              type="audio"
              icon={Mic}
              label="Audio Streaming"
              stream={streams.audio}
            />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">WebRTC Connection</span>
            <div className="flex items-center gap-1">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Bandwidth</span>
            <span className="font-mono">
              {(streams.screen.bitrate + streams.camera.bitrate + streams.audio.bitrate)} kbps
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamingControlPanel;