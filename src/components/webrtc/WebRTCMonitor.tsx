import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Server,
  Users,
  Zap
} from 'lucide-react';
import type { ProductionReadiness, QualityData } from '@/types/agent';

interface WebRTCMonitorProps {
  productionReadiness: ProductionReadiness | null;
  qualityData: { [agentId: string]: QualityData };
  onGetProductionReadiness: () => void;
  onGetMigrationPlan: () => void;
  onGetMonitoringData: () => void;
}

const WebRTCMonitor: React.FC<WebRTCMonitorProps> = ({
  productionReadiness,
  qualityData,
  onGetProductionReadiness,
  onGetMigrationPlan,
  onGetMonitoringData
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Auto-refresh production readiness every 30 seconds
    const interval = setInterval(() => {
      onGetProductionReadiness();
      onGetMonitoringData();
    }, 30000);

    return () => clearInterval(interval);
  }, [onGetProductionReadiness, onGetMonitoringData]);

  const getOverallQualityScore = () => {
    const scores = Object.values(qualityData).map(data => data.quality_score);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const getQualityDistribution = () => {
    const scores = Object.values(qualityData).map(data => data.quality_score);
    return {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      fair: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length
    };
  };

  const overallQuality = getOverallQualityScore();
  const qualityDistribution = getQualityDistribution();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            WebRTC Production Monitor
            <Badge variant={productionReadiness?.scalability_assessment.production_ready ? 'default' : 'destructive'}>
              {productionReadiness?.scalability_assessment.production_ready ? 'Production Ready' : 'Scaling Required'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="scalability">Scalability</TabsTrigger>
              <TabsTrigger value="migration">Migration</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{productionReadiness?.current_usage.agents || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Agents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{productionReadiness?.current_usage.viewers || 0}</div>
                  <div className="text-sm text-muted-foreground">Viewers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{overallQuality}%</div>
                  <div className="text-sm text-muted-foreground">Avg Quality</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Connection Quality</span>
                  <span>{overallQuality}%</span>
                </div>
                <Progress value={overallQuality} className="h-2" />
              </div>

              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center p-2 border rounded">
                  <div className="font-medium text-green-600">{qualityDistribution.excellent}</div>
                  <div className="text-muted-foreground">Excellent</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="font-medium text-blue-600">{qualityDistribution.good}</div>
                  <div className="text-muted-foreground">Good</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="font-medium text-yellow-600">{qualityDistribution.fair}</div>
                  <div className="text-muted-foreground">Fair</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="font-medium text-red-600">{qualityDistribution.poor}</div>
                  <div className="text-muted-foreground">Poor</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={onGetProductionReadiness} variant="outline">
                  <Activity className="w-4 h-4 mr-1" />
                  Refresh Status
                </Button>
                <Button onClick={onGetMonitoringData} variant="outline">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Get Monitoring Data
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-4 space-y-4">
              {productionReadiness?.performance_metrics && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Latency Performance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average Latency:</span>
                      <div className="flex items-center gap-2">
                        <span>{Math.round(productionReadiness.performance_metrics.average_latency)} ms</span>
                        {productionReadiness.performance_metrics.latency_target_met ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        }
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(100, (100 / productionReadiness.performance_metrics.average_latency) * 10)} 
                      className="h-2" 
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Bitrate Performance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average Bitrate:</span>
                      <div className="flex items-center gap-2">
                        <span>{Math.round(productionReadiness.performance_metrics.average_bitrate)} kbps</span>
                        {productionReadiness.performance_metrics.bitrate_target_met ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        }
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(100, (productionReadiness.performance_metrics.average_bitrate / 5000) * 100)} 
                      className="h-2" 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Individual Agent Quality</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(qualityData).map(([agentId, data]) => (
                    <div key={agentId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          data.quality_score >= 90 ? 'bg-green-500' :
                          data.quality_score >= 70 ? 'bg-blue-500' :
                          data.quality_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-mono">{agentId.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{data.quality_score}%</span>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(data.bandwidth_stats.current_bitrate)} kbps
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scalability" className="mt-4 space-y-4">
              {productionReadiness && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Current Implementation
                      </h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Technology:</span>
                          <span>{productionReadiness.current_implementation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Viewers:</span>
                          <span>50 (aiortc limit)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Usage:</span>
                          <span>{productionReadiness.current_usage.viewers}/50</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Scalability Status
                      </h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Production Ready:</span>
                          <Badge variant={productionReadiness.scalability_assessment.production_ready ? 'default' : 'destructive'}>
                            {productionReadiness.scalability_assessment.production_ready ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limit Reached:</span>
                          <Badge variant={productionReadiness.scalability_assessment.aiortc_limit_reached ? 'destructive' : 'default'}>
                            {productionReadiness.scalability_assessment.aiortc_limit_reached ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recommended Action:</span>
                          <span className="text-xs">{productionReadiness.scalability_assessment.recommended_action}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Viewer Capacity Utilization</span>
                      <span>{Math.round((productionReadiness.current_usage.viewers / 50) * 100)}%</span>
                    </div>
                    <Progress value={(productionReadiness.current_usage.viewers / 50) * 100} className="h-2" />
                  </div>

                  {productionReadiness.recommendations.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Recommendations:</div>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {productionReadiness.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="migration" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Migration to mediasoup
                  </h4>
                  <Button onClick={onGetMigrationPlan} variant="outline">
                    Get Migration Plan
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Current State</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Implementation:</span>
                        <span>aiortc SFU</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Viewers:</span>
                        <span>50</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Technology:</span>
                        <span>Python + aiortc</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Target State</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Implementation:</span>
                        <span>mediasoup SFU</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Viewers:</span>
                        <span>1,000+</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Technology:</span>
                        <span>Node.js + mediasoup</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Migration Phases</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">1</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Parallel Implementation</div>
                        <div className="text-xs text-muted-foreground">Set up mediasoup alongside aiortc (2-3 weeks)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">2</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Gradual Migration</div>
                        <div className="text-xs text-muted-foreground">Migrate viewers with load balancing (1-2 weeks)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">3</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Full Migration</div>
                        <div className="text-xs text-muted-foreground">Complete migration and decommission aiortc (1 week)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Migration Requirements:</div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Node.js 18+ runtime environment</li>
                        <li>mediasoup library installation</li>
                        <li>Redis for session management</li>
                        <li>Load balancer configuration</li>
                        <li>Monitoring and alerting setup</li>
                      </ul>
                      <div className="text-sm mt-2">
                        <strong>Estimated Effort:</strong> 4-6 weeks | <strong>Risk:</strong> Medium
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebRTCMonitor;