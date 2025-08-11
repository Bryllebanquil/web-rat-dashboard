import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Video, 
  AudioLines, 
  Monitor, 
  Camera, 
  Mic, 
  MicOff, 
  VideoOff, 
  MonitorOff,
  Settings,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  Zap,
  BarChart3,
  Network,
  Clock,
  Cpu,
  HardDrive
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface WebRTCStats {
  connection_state: string;
  ice_connection_state: string;
  ice_gathering_state: string;
  signaling_state: string;
  bitrate: number;
  fps: number;
  latency: number;
  packet_loss: number;
  quality_score: number;
  bandwidth_estimate: number;
  frame_drops: number;
  jitter: number;
}

interface QualityMetrics {
  average_quality_score: number;
  quality_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

interface ScalabilityMetrics {
  current_viewer_count: number;
  aiortc_limit: number;
  utilization_percentage: number;
  approaching_limit: boolean;
  limit_reached: boolean;
}

interface MonitoringAlert {
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  action: string;
}

interface EnhancedWebRTCPanelProps {
  agentId?: string | null;
}

const EnhancedWebRTCPanel: React.FC<EnhancedWebRTCPanelProps> = ({ agentId }) => {
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [scalabilityMetrics, setScalabilityMetrics] = useState<ScalabilityMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [adaptiveBitrate, setAdaptiveBitrate] = useState(true);
  const [frameDropping, setFrameDropping] = useState(false);
  const [qualityLevel, setQualityLevel] = useState<'low' | 'medium' | 'high' | 'auto'>('auto');
  const [productionReadiness, setProductionReadiness] = useState<any>(null);
  const [migrationPlan, setMigrationPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("streaming");

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'webrtc_enhanced_stats':
            setStats(data.stats);
            break;
          case 'webrtc_monitoring_data':
            if (data.quality_metrics) setQualityMetrics(data.quality_metrics);
            if (data.scalability_metrics) setScalabilityMetrics(data.scalability_metrics);
            if (data.alerts) setAlerts(data.alerts);
            break;
          case 'webrtc_production_readiness':
            setProductionReadiness(data.readiness_report);
            break;
          case 'webrtc_migration_plan':
            setMigrationPlan(data.migration_plan);
            break;
          case 'webrtc_adaptive_bitrate_result':
            console.log('Adaptive bitrate result:', data);
            break;
          case 'webrtc_frame_dropping_result':
            console.log('Frame dropping result:', data);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    }
  }, [lastMessage]);

  // Auto-refresh stats every 2 seconds
  useEffect(() => {
    if (agentId && isStreaming) {
      const interval = setInterval(() => {
        getEnhancedStats();
        getMonitoringData();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [agentId, isStreaming]);

  const getEnhancedStats = () => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_get_enhanced_stats',
      agent_id: agentId
    }));
  };

  const getMonitoringData = () => {
    sendMessage(JSON.stringify({
      type: 'webrtc_get_monitoring_data'
    }));
  };

  const getProductionReadiness = () => {
    sendMessage(JSON.stringify({
      type: 'webrtc_get_production_readiness'
    }));
  };

  const getMigrationPlan = () => {
    sendMessage(JSON.stringify({
      type: 'webrtc_get_migration_plan'
    }));
  };

  const toggleAdaptiveBitrate = () => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_adaptive_bitrate_control',
      agent_id: agentId,
      current_quality: qualityLevel
    }));
    setAdaptiveBitrate(!adaptiveBitrate);
  };

  const toggleFrameDropping = () => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_implement_frame_dropping',
      agent_id: agentId,
      load_threshold: 0.8
    }));
    setFrameDropping(!frameDropping);
  };

  const setQuality = (quality: 'low' | 'medium' | 'high' | 'auto') => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_set_quality',
      agent_id: agentId,
      quality: quality
    }));
    setQualityLevel(quality);
  };

  const startStreaming = () => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_start_streaming',
      agent_id: agentId,
      type: 'all'
    }));
    setIsStreaming(true);
  };

  const stopStreaming = () => {
    if (!agentId) return;
    sendMessage(JSON.stringify({
      type: 'webrtc_stop_streaming',
      agent_id: agentId
    }));
    setIsStreaming(false);
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select an agent to access WebRTC streaming controls</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Enhanced WebRTC Control Panel
            <Badge variant={isStreaming ? "default" : "secondary"}>
              {isStreaming ? "Streaming" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={isStreaming ? stopStreaming : startStreaming}
              variant={isStreaming ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isStreaming ? (
                <>
                  <VideoOff className="h-4 w-4" />
                  Stop Streaming
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Start Streaming
                </>
              )}
            </Button>
            <Button
              onClick={getEnhancedStats}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Stats
            </Button>
            <Button
              onClick={getProductionReadiness}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Gauge className="h-4 w-4" />
              Production Check
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="streaming">Streaming</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="scalability">Scalability</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>

            <TabsContent value="streaming" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stream Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Adaptive Bitrate</label>
                      <Switch
                        checked={adaptiveBitrate}
                        onCheckedChange={toggleAdaptiveBitrate}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Frame Dropping</label>
                      <Switch
                        checked={frameDropping}
                        onCheckedChange={toggleFrameDropping}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quality Level</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['low', 'medium', 'high', 'auto'] as const).map((quality) => (
                          <Button
                            key={quality}
                            variant={qualityLevel === quality ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQuality(quality)}
                            className="capitalize"
                          >
                            {quality}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connection Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Connection State</span>
                          <Badge variant={stats.connection_state === 'connected' ? 'default' : 'destructive'}>
                            {stats.connection_state}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">ICE State</span>
                          <Badge variant={stats.ice_connection_state === 'connected' ? 'default' : 'secondary'}>
                            {stats.ice_connection_state}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Signaling State</span>
                          <Badge variant="outline">{stats.signaling_state}</Badge>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No connection data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              {stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Bitrate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats.bitrate / 1000000).toFixed(1)} Mbps</div>
                      <Progress value={(stats.bitrate / 10000000) * 100} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Latency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.latency}ms</div>
                      <Progress value={(stats.latency / 1000) * 100} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        FPS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.fps}</div>
                      <Progress value={(stats.fps / 60) * 100} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        Packet Loss
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats.packet_loss * 100).toFixed(2)}%</div>
                      <Progress value={stats.packet_loss * 100} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Quality Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getQualityColor(stats.quality_score)}`}>
                        {stats.quality_score}/100
                      </div>
                      <Progress value={stats.quality_score} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Frame Drops
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.frame_drops}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Jitter: {stats.jitter}ms
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Start streaming to view performance metrics</p>
                    <Button onClick={getEnhancedStats} variant="outline" className="mt-4">
                      Get Stats
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              {qualityMetrics ? (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Overall Quality Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-sm font-medium mb-2">Average Quality Score</div>
                          <div className={`text-3xl font-bold ${getQualityColor(qualityMetrics.average_quality_score)}`}>
                            {qualityMetrics.average_quality_score.toFixed(1)}/100
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Excellent (90+)</span>
                            <span className="text-green-500">{qualityMetrics.quality_distribution.excellent}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Good (70-89)</span>
                            <span className="text-yellow-500">{qualityMetrics.quality_distribution.good}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Fair (50-69)</span>
                            <span className="text-orange-500">{qualityMetrics.quality_distribution.fair}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Poor (&lt;50)</span>
                            <span className="text-red-500">{qualityMetrics.quality_distribution.poor}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Quality metrics will appear when streaming is active</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scalability" className="space-y-4">
              {scalabilityMetrics ? (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Scalability Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{scalabilityMetrics.current_viewer_count}</div>
                          <div className="text-sm text-muted-foreground">Current Viewers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{scalabilityMetrics.aiortc_limit}</div>
                          <div className="text-sm text-muted-foreground">aiortc Limit</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{scalabilityMetrics.utilization_percentage.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Utilization</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Progress value={scalabilityMetrics.utilization_percentage} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      {scalabilityMetrics.approaching_limit && (
                        <Alert className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Approaching viewer limit. Consider migrating to mediasoup for better scalability.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Click "Refresh Stats" to load scalability metrics</p>
                    <Button onClick={getMonitoringData} variant="outline" className="mt-4">
                      Load Metrics
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="production" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Production Readiness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productionReadiness ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="text-sm font-medium mb-2">Overall Score</div>
                            <div className={`text-3xl font-bold ${getQualityColor(productionReadiness.overall_score || 0)}`}>
                              {productionReadiness.overall_score || 0}/100
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Recommendation</div>
                            <Badge variant={productionReadiness.recommendation === 'production_ready' ? 'default' : 'destructive'}>
                              {productionReadiness.recommendation || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Assessment Details</div>
                          {productionReadiness.assessment && Object.entries(productionReadiness.assessment).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="capitalize">{key.replace('_', ' ')}</span>
                              <Badge variant={value ? 'default' : 'destructive'}>
                                {value ? 'Pass' : 'Fail'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <HardDrive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Production readiness assessment not loaded</p>
                        <Button onClick={getProductionReadiness} variant="outline">
                          Run Assessment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Migration Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {migrationPlan ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="text-sm font-medium">Current Implementation</div>
                            <div className="text-lg font-semibold">{migrationPlan.current_implementation}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Target Implementation</div>
                            <div className="text-lg font-semibold">{migrationPlan.target_implementation}</div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Migration Steps</div>
                          <ScrollArea className="h-32">
                            <div className="space-y-1">
                              {migrationPlan.steps && migrationPlan.steps.map((step: string, index: number) => (
                                <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                                  {index + 1}. {step}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">Migration plan not loaded</p>
                        <Button onClick={getMigrationPlan} variant="outline">
                          Generate Plan
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index} className={`${
                  alert.level === 'CRITICAL' ? 'border-red-500' : 
                  alert.level === 'WARNING' ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.level)}
                    <div className="flex-1">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Recommended action: {alert.action.replace('_', ' ')}
                      </div>
                    </div>
                    <Badge variant={alert.level === 'CRITICAL' ? 'destructive' : 'secondary'}>
                      {alert.level}
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedWebRTCPanel;