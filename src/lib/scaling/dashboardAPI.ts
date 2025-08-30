'use client';

import { monitoringSystem, SystemMetrics, Alert, AlertRule, NotificationChannel } from './monitoringSystem';
import { fraudDetectionLoadBalancer } from './loadBalancer';
import { databaseOptimizer } from './databaseOptimizer';
import { redisCacheManager } from './redisCacheManager';

export interface DashboardMetrics {
  timestamp: number;
  overview: {
    systemStatus: 'healthy' | 'warning' | 'critical';
    activeAlerts: number;
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
  };
  loadBalancer: {
    activeNodes: number;
    requestsPerSecond: number;
    errorRate: number;
    circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
    nodeHealth: Array<{
      nodeId: string;
      region: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      requestCount: number;
      errorRate: number;
    }>;
  };
  database: {
    connectionPool: {
      active: number;
      idle: number;
      waiting: number;
      utilization: number;
    };
    performance: {
      queryLatency: number;
      slowQueries: number;
      cacheHitRate: number;
      totalQueries: number;
    };
    topQueries: Array<{
      query: string;
      count: number;
      avgTime: number;
      maxTime: number;
    }>;
  };
  redis: {
    cluster: {
      nodes: number;
      connectedClients: number;
      usedMemory: number;
      hitRate: number;
    };
    performance: {
      commandsPerSecond: number;
      evictedKeys: number;
      networkIO: {
        input: number;
        output: number;
      };
    };
    topKeys: Array<{
      key: string;
      type: string;
      ttl: number;
      memory: number;
      accessCount: number;
    }>;
  };
  fraud: {
    detection: {
      alertsGenerated: number;
      processedChecks: number;
      avgProcessingTime: number;
      falsePositiveRate: number;
    };
    risks: {
      highRiskUsers: number;
      blockedTransactions: number;
      suspiciousPatterns: number;
    };
    regional: {
      manila: { alerts: number; blocked: number };
      cebu: { alerts: number; blocked: number };
      davao: { alerts: number; blocked: number };
    };
  };
  system: {
    resources: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      networkLatency: number;
    };
    uptime: number;
    processes: Array<{
      name: string;
      cpu: number;
      memory: number;
      status: 'running' | 'stopped' | 'error';
    }>;
  };
}

export interface PerformanceTrend {
  metric: string;
  timeframe: '1h' | '6h' | '24h' | '7d';
  data: Array<{
    timestamp: number;
    value: number;
  }>;
  change: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

class DashboardAPI {
  private static instance: DashboardAPI;

  private constructor() {}

  static getInstance(): DashboardAPI {
    if (!DashboardAPI.instance) {
      DashboardAPI.instance = new DashboardAPI();
    }
    return DashboardAPI.instance;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const systemMetrics = monitoringSystem.getLatestMetrics();
    const systemHealth = monitoringSystem.getSystemHealth();
    
    if (!systemMetrics) {
      throw new Error('No metrics available');
    }

    // Get detailed metrics from individual services
    const loadBalancerStats = await fraudDetectionLoadBalancer.getStats();
    const dbStats = await databaseOptimizer.getPerformanceStats();
    const redisStats = await redisCacheManager.getClusterStats();

    const dashboard: DashboardMetrics = {
      timestamp: systemMetrics.timestamp,
      overview: {
        systemStatus: systemHealth.status,
        activeAlerts: systemHealth.activeAlerts,
        totalRequests: systemMetrics.loadBalancer.totalRequests,
        successRate: systemMetrics.loadBalancer.successRate,
        avgResponseTime: systemMetrics.loadBalancer.avgResponseTime
      },
      loadBalancer: {
        activeNodes: systemMetrics.loadBalancer.activeNodes,
        requestsPerSecond: systemMetrics.loadBalancer.requestsPerSecond,
        errorRate: systemMetrics.loadBalancer.errorRate,
        circuitBreakerStatus: systemMetrics.loadBalancer.circuitBreakerStatus,
        nodeHealth: this.generateNodeHealthData()
      },
      database: {
        connectionPool: {
          active: systemMetrics.database.activeConnections,
          idle: Math.floor(systemMetrics.database.activeConnections * 0.3),
          waiting: Math.floor(Math.random() * 5),
          utilization: systemMetrics.database.connectionPoolUtilization
        },
        performance: {
          queryLatency: systemMetrics.database.queryLatency,
          slowQueries: systemMetrics.database.slowQueries,
          cacheHitRate: systemMetrics.database.cacheHitRate,
          totalQueries: systemMetrics.database.totalQueries
        },
        topQueries: this.generateTopQueriesData()
      },
      redis: {
        cluster: {
          nodes: 3, // Manila, Cebu, Davao
          connectedClients: systemMetrics.redis.connectedClients,
          usedMemory: systemMetrics.redis.usedMemory,
          hitRate: systemMetrics.redis.hitRate
        },
        performance: {
          commandsPerSecond: systemMetrics.redis.commandsPerSecond,
          evictedKeys: systemMetrics.redis.evictedKeys,
          networkIO: systemMetrics.redis.networkIO
        },
        topKeys: this.generateTopKeysData()
      },
      fraud: {
        detection: {
          alertsGenerated: systemMetrics.fraud.alertsGenerated,
          processedChecks: systemMetrics.fraud.processedChecks,
          avgProcessingTime: systemMetrics.fraud.avgProcessingTime,
          falsePositiveRate: systemMetrics.fraud.falsePositiveRate
        },
        risks: {
          highRiskUsers: systemMetrics.fraud.highRiskUsers,
          blockedTransactions: systemMetrics.fraud.blockedTransactions,
          suspiciousPatterns: Math.floor(Math.random() * 25) + 10
        },
        regional: {
          manila: { 
            alerts: Math.floor(systemMetrics.fraud.alertsGenerated * 0.5),
            blocked: Math.floor(systemMetrics.fraud.blockedTransactions * 0.4)
          },
          cebu: { 
            alerts: Math.floor(systemMetrics.fraud.alertsGenerated * 0.3),
            blocked: Math.floor(systemMetrics.fraud.blockedTransactions * 0.35)
          },
          davao: { 
            alerts: Math.floor(systemMetrics.fraud.alertsGenerated * 0.2),
            blocked: Math.floor(systemMetrics.fraud.blockedTransactions * 0.25)
          }
        }
      },
      system: {
        resources: {
          cpuUsage: systemMetrics.system.cpuUsage,
          memoryUsage: systemMetrics.system.memoryUsage,
          diskUsage: systemMetrics.system.diskUsage,
          networkLatency: systemMetrics.system.networkLatency
        },
        uptime: systemMetrics.system.uptime,
        processes: this.generateProcessData()
      }
    };

    return dashboard;
  }

  private generateNodeHealthData() {
    const nodes = [
      { nodeId: 'manila-fraud-1', region: 'Manila', baseResponseTime: 120 },
      { nodeId: 'manila-fraud-2', region: 'Manila', baseResponseTime: 135 },
      { nodeId: 'cebu-fraud-1', region: 'Cebu', baseResponseTime: 145 },
      { nodeId: 'davao-fraud-1', region: 'Davao', baseResponseTime: 160 }
    ];

    return nodes.map(node => ({
      nodeId: node.nodeId,
      region: node.region,
      status: (Math.random() > 0.1 ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
      responseTime: node.baseResponseTime + Math.random() * 50,
      requestCount: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 0.05
    }));
  }

  private generateTopQueriesData() {
    const queries = [
      'SELECT * FROM fraud_alerts WHERE created_at > ?',
      'UPDATE user_fraud_scores SET risk_score = ? WHERE user_id = ?',
      'SELECT COUNT(*) FROM fraud_detection_rules WHERE enabled = true',
      'INSERT INTO fraud_check_cache (user_id, result, expires_at) VALUES (?, ?, ?)',
      'SELECT * FROM fraud_training_data WHERE label = ? ORDER BY created_at DESC'
    ];

    return queries.map(query => ({
      query,
      count: Math.floor(Math.random() * 1000) + 100,
      avgTime: Math.random() * 200 + 50,
      maxTime: Math.random() * 500 + 200
    }));
  }

  private generateTopKeysData() {
    const keys = [
      'user_risk_profile:*',
      'device_fingerprint:*',
      'ip_reputation:*',
      'rate_limit:*',
      'fraud_ml_features:*'
    ];

    return keys.map(key => ({
      key,
      type: ['hash', 'string', 'set', 'zset'][Math.floor(Math.random() * 4)],
      ttl: Math.floor(Math.random() * 3600) + 300,
      memory: Math.floor(Math.random() * 1000) + 100,
      accessCount: Math.floor(Math.random() * 10000) + 1000
    }));
  }

  private generateProcessData() {
    const processes = [
      'fraud-detection-service',
      'load-balancer',
      'database-optimizer',
      'redis-cache-manager',
      'monitoring-system'
    ];

    return processes.map(name => ({
      name,
      cpu: Math.random() * 50 + 10,
      memory: Math.random() * 30 + 15,
      status: (Math.random() > 0.05 ? 'running' : 'error') as 'running' | 'stopped' | 'error'
    }));
  }

  async getPerformanceTrends(metrics: string[], timeframe: '1h' | '6h' | '24h' | '7d'): Promise<PerformanceTrend[]> {
    const history = monitoringSystem.getMetricsHistory(this.getTimeframeDuration(timeframe));
    
    return metrics.map(metric => {
      const data = history.map(m => ({
        timestamp: m.timestamp,
        value: this.getMetricFromPath(m, metric) || 0
      }));

      const change = this.calculateChange(data);

      return {
        metric,
        timeframe,
        data,
        change
      };
    });
  }

  private getTimeframeDuration(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private getMetricFromPath(metrics: SystemMetrics, path: string): number | null {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  private calculateChange(data: Array<{ timestamp: number; value: number }>) {
    if (data.length < 2) {
      return { value: 0, percentage: 0, trend: 'stable' as const };
    }

    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = last - first;
    const percentage = first !== 0 ? (change / first) * 100 : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(percentage) < 5) {
      trend = 'stable';
    } else if (percentage > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return { value: change, percentage, trend };
  }

  // Alert management
  async getActiveAlerts(): Promise<Alert[]> {
    return monitoringSystem.getActiveAlerts();
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    return monitoringSystem.resolveAlert(alertId);
  }

  async getAlertHistory(limit: number = 100): Promise<Alert[]> {
    return monitoringSystem.getAllAlerts().slice(-limit);
  }

  // Configuration management
  async getAlertRules(): Promise<AlertRule[]> {
    return monitoringSystem.getAlertRules();
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<boolean> {
    return monitoringSystem.updateAlertRule(id, updates);
  }

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    return monitoringSystem.getNotificationChannels();
  }

  async updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): Promise<boolean> {
    return monitoringSystem.updateNotificationChannel(id, updates);
  }

  // System control
  async startMonitoring(): Promise<void> {
    monitoringSystem.start();
  }

  async stopMonitoring(): Promise<void> {
    monitoringSystem.stop();
  }

  async getSystemHealth() {
    return monitoringSystem.getSystemHealth();
  }

  // Export data
  async exportMetrics(timeframe: '1h' | '6h' | '24h' | '7d', format: 'json' | 'csv'): Promise<string> {
    const history = monitoringSystem.getMetricsHistory(this.getTimeframeDuration(timeframe));
    
    if (format === 'csv') {
      return this.convertToCSV(history);
    }
    
    return JSON.stringify(history, null, 2);
  }

  private convertToCSV(data: SystemMetrics[]): string {
    if (data.length === 0) return '';

    const headers = [
      'timestamp',
      'lb_requests_per_second',
      'lb_error_rate',
      'db_query_latency',
      'db_cache_hit_rate',
      'redis_hit_rate',
      'redis_used_memory',
      'fraud_alerts_generated',
      'fraud_false_positive_rate',
      'system_cpu_usage',
      'system_memory_usage'
    ];

    const rows = data.map(metrics => [
      new Date(metrics.timestamp).toISOString(),
      metrics.loadBalancer.requestsPerSecond,
      metrics.loadBalancer.errorRate,
      metrics.database.queryLatency,
      metrics.database.cacheHitRate,
      metrics.redis.hitRate,
      metrics.redis.usedMemory,
      metrics.fraud.alertsGenerated,
      metrics.fraud.falsePositiveRate,
      metrics.system.cpuUsage,
      metrics.system.memoryUsage
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const dashboardAPI = DashboardAPI.getInstance();
export default DashboardAPI;