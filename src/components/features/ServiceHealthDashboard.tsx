// Service Health Monitoring Dashboard
// Real-time monitoring for all external service integrations
// Comprehensive health metrics, alerts, and performance tracking

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Globe,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Zap,
  RefreshCw,
  Settings,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

import { XpressCard } from '@/components/xpress/card';
import { XpressBadge } from '@/components/xpress/badge';
import { XpressButton } from '@/components/xpress/button';
import { logger } from '@/lib/security/productionLogger';

interface ServiceHealth {
  id: string;
  name: string;
  type: 'google' | 'twilio' | 'sendgrid' | 'sms' | 'emergency' | 'third_party';
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
  lastIncident?: {
    date: string;
    type: string;
    duration: number;
  };
  metrics: {
    requestsPerMinute: number;
    successRate: number;
    averageResponseTime: number;
    quotaUsage?: {
      used: number;
      limit: number;
      percentage: number;
    };
    cost?: {
      today: number;
      month: number;
      currency: string;
    };
  };
  endpoints: {
    name: string;
    url: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
  }[];
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const ServiceHealthDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAlerts, setShowAlerts] = useState(false);

  // Fetch service health data
  const fetchServiceHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Mock data - replace with actual API calls
      const mockServices: ServiceHealth[] = [
        {
          id: 'google-services',
          name: 'Google Services',
          type: 'google',
          status: 'healthy',
          uptime: 99.95,
          responseTime: 245,
          errorRate: 0.02,
          lastChecked: new Date().toISOString(),
          metrics: {
            requestsPerMinute: 125,
            successRate: 99.98,
            averageResponseTime: 245,
            quotaUsage: {
              used: 15420,
              limit: 100000,
              percentage: 15.4
            },
            cost: {
              today: 12.45,
              month: 342.18,
              currency: 'USD'
            }
          },
          endpoints: [
            { name: 'Maps API', url: 'https://maps.googleapis.com', status: 'healthy', responseTime: 180 },
            { name: 'Places API', url: 'https://places.googleapis.com', status: 'healthy', responseTime: 320 },
            { name: 'Directions API', url: 'https://directions.googleapis.com', status: 'healthy', responseTime: 235 }
          ]
        },
        {
          id: 'twilio-services',
          name: 'Twilio Communications',
          type: 'twilio',
          status: 'healthy',
          uptime: 99.85,
          responseTime: 420,
          errorRate: 0.05,
          lastChecked: new Date().toISOString(),
          metrics: {
            requestsPerMinute: 45,
            successRate: 99.95,
            averageResponseTime: 420,
            quotaUsage: {
              used: 2340,
              limit: 50000,
              percentage: 4.7
            },
            cost: {
              today: 28.50,
              month: 756.32,
              currency: 'USD'
            }
          },
          endpoints: [
            { name: 'Voice API', url: 'https://api.twilio.com/voice', status: 'healthy', responseTime: 380 },
            { name: 'SMS API', url: 'https://api.twilio.com/sms', status: 'healthy', responseTime: 460 }
          ]
        },
        {
          id: 'sendgrid-email',
          name: 'SendGrid Email',
          type: 'sendgrid',
          status: 'degraded',
          uptime: 98.2,
          responseTime: 1200,
          errorRate: 1.8,
          lastChecked: new Date().toISOString(),
          lastIncident: {
            date: '2 hours ago',
            type: 'High Latency',
            duration: 45
          },
          metrics: {
            requestsPerMinute: 85,
            successRate: 98.2,
            averageResponseTime: 1200,
            quotaUsage: {
              used: 45600,
              limit: 100000,
              percentage: 45.6
            },
            cost: {
              today: 8.20,
              month: 234.67,
              currency: 'USD'
            }
          },
          endpoints: [
            { name: 'Send API', url: 'https://api.sendgrid.com/v3/mail', status: 'degraded', responseTime: 1200 },
            { name: 'Template API', url: 'https://api.sendgrid.com/v3/templates', status: 'healthy', responseTime: 850 }
          ]
        },
        {
          id: 'sms-services',
          name: 'SMS Services (Globe/Smart)',
          type: 'sms',
          status: 'healthy',
          uptime: 99.1,
          responseTime: 850,
          errorRate: 0.9,
          lastChecked: new Date().toISOString(),
          metrics: {
            requestsPerMinute: 65,
            successRate: 99.1,
            averageResponseTime: 850,
            cost: {
              today: 145.50,
              month: 4234.80,
              currency: 'PHP'
            }
          },
          endpoints: [
            { name: 'Globe API', url: 'https://devapi.globelabs.com.ph', status: 'healthy', responseTime: 780 },
            { name: 'Smart API', url: 'https://api.smart.com.ph', status: 'healthy', responseTime: 920 }
          ]
        },
        {
          id: 'emergency-services',
          name: 'Emergency Services',
          type: 'emergency',
          status: 'healthy',
          uptime: 100.0,
          responseTime: 150,
          errorRate: 0.0,
          lastChecked: new Date().toISOString(),
          metrics: {
            requestsPerMinute: 2,
            successRate: 100,
            averageResponseTime: 150
          },
          endpoints: [
            { name: 'PNP Integration', url: 'emergency://pnp', status: 'healthy', responseTime: 120 },
            { name: 'BFP Integration', url: 'emergency://bfp', status: 'healthy', responseTime: 180 }
          ]
        }
      ];

      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'warning',
          service: 'SendGrid Email',
          message: 'Response time increased by 40% in the last hour',
          timestamp: '5 minutes ago',
          isRead: false
        },
        {
          id: '2',
          type: 'info',
          service: 'Google Services',
          message: 'Quota usage at 15.4% - within normal range',
          timestamp: '15 minutes ago',
          isRead: false
        },
        {
          id: '3',
          type: 'error',
          service: 'SMS Services',
          message: 'Failed to send 3 SMS messages to Globe network',
          timestamp: '1 hour ago',
          isRead: true
        }
      ];

      setServices(mockServices);
      setAlerts(mockAlerts);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Failed to fetch service health', { component: 'ServiceHealthDashboard' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchServiceHealth();
    const interval = setInterval(fetchServiceHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchServiceHealth]);

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceIcon = (type: ServiceHealth['type']) => {
    switch (type) {
      case 'google':
        return <Globe className="w-5 h-5" />;
      case 'twilio':
        return <Phone className="w-5 h-5" />;
      case 'sendgrid':
        return <Mail className="w-5 h-5" />;
      case 'sms':
        return <MessageCircle className="w-5 h-5" />;
      case 'emergency':
        return <Shield className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const filteredServices = services.filter(service => 
    filterStatus === 'all' || service.status === filterStatus
  );

  const overallHealthScore = services.length > 0 
    ? Math.round(services.reduce((acc, service) => acc + service.uptime, 0) / services.length * 10) / 10
    : 0;

  const totalAlerts = alerts.filter(alert => !alert.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Health Monitor</h2>
          <p className="text-gray-600">
            Real-time monitoring of external service integrations
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <XpressButton
            variant="outline"
            size="sm"
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
            {totalAlerts > 0 && (
              <XpressBadge className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white">
                {totalAlerts}
              </XpressBadge>
            )}
          </XpressButton>
          
          <XpressButton
            variant="outline"
            size="sm"
            onClick={fetchServiceHealth}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </XpressButton>
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <XpressCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Health</p>
              <p className="text-3xl font-bold text-green-600">{overallHealthScore}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </XpressCard>

        <XpressCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-3xl font-bold text-blue-600">{services.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </XpressCard>

        <XpressCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-3xl font-bold text-red-600">{totalAlerts}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </XpressCard>

        <XpressCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(services.reduce((acc, s) => acc + s.responseTime, 0) / services.length)}ms
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </XpressCard>
      </div>

      {/* Alerts Panel */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <XpressCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'error'
                        ? 'bg-red-50 border-l-red-400'
                        : alert.type === 'warning'
                        ? 'bg-yellow-50 border-l-yellow-400'
                        : 'bg-blue-50 border-l-blue-400'
                    } ${alert.isRead ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{alert.service}</span>
                          <XpressBadge
                            variant={alert.type === 'error' ? 'destructive' : 
                                   alert.type === 'warning' ? 'warning' : 'default'}
                            className="text-xs"
                          >
                            {alert.type.toUpperCase()}
                          </XpressBadge>
                        </div>
                        <p className="text-gray-600 text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 ml-4">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>No alerts to display</p>
                  </div>
                )}
              </div>
            </XpressCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Filter by status:</span>
        <div className="flex gap-2">
          {['all', 'healthy', 'degraded', 'down', 'maintenance'].map((status) => (
            <XpressButton
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </XpressButton>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredServices.map((service) => (
          <motion.div
            key={service.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <XpressCard className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                       onClick={() => setSelectedService(service)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {getServiceIcon(service.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{service.type} Integration</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <XpressBadge className={`${getStatusColor(service.status)} capitalize`}>
                    {service.status}
                  </XpressBadge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-lg font-semibold text-gray-900">{service.uptime}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-lg font-semibold text-gray-900">{service.responseTime}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{service.metrics.successRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requests/min</p>
                  <p className="text-lg font-semibold text-gray-900">{service.metrics.requestsPerMinute}</p>
                </div>
              </div>

              {service.metrics.quotaUsage && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Quota Usage</span>
                    <span className="text-sm font-medium">{service.metrics.quotaUsage.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        service.metrics.quotaUsage.percentage > 80
                          ? 'bg-red-500'
                          : service.metrics.quotaUsage.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${service.metrics.quotaUsage.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {service.metrics.quotaUsage.used.toLocaleString()} / {service.metrics.quotaUsage.limit.toLocaleString()}
                  </p>
                </div>
              )}

              {service.metrics.cost && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Today: {service.metrics.cost.currency} {service.metrics.cost.today}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    Month: {service.metrics.cost.currency} {service.metrics.cost.month}
                  </span>
                </div>
              )}

              {service.lastIncident && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Last Incident</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {service.lastIncident.type} - {service.lastIncident.duration} minutes - {service.lastIncident.date}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last checked: {new Date(service.lastChecked).toLocaleString()}
                </p>
              </div>
            </XpressCard>
          </motion.div>
        ))}
      </div>

      {filteredServices.length === 0 && !isLoading && (
        <XpressCard className="p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Found</h3>
          <p className="text-gray-600 mb-6">No services match the current filter criteria.</p>
          <XpressButton onClick={() => setFilterStatus('all')}>
            Show All Services
          </XpressButton>
        </XpressCard>
      )}

      {/* Service Details Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getServiceIcon(selectedService.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedService.name}</h3>
                      <p className="text-gray-600 capitalize">{selectedService.type} Integration Details</p>
                    </div>
                  </div>
                  <XpressButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedService(null)}
                  >
                    ×
                  </XpressButton>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Current Status</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedService.status)}
                      <span className="font-semibold capitalize">{selectedService.status}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Uptime (30 days)</p>
                    <p className="text-xl font-semibold">{selectedService.uptime}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                    <p className="text-xl font-semibold">{selectedService.responseTime}ms</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Error Rate</p>
                    <p className="text-xl font-semibold">{selectedService.errorRate}%</p>
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-gray-900 mb-4">Endpoints Status</h4>
                <div className="space-y-3 mb-6">
                  {selectedService.endpoints.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(endpoint.status)}
                        <div>
                          <p className="font-medium text-gray-900">{endpoint.name}</p>
                          <p className="text-sm text-gray-600">{endpoint.url}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Response Time</p>
                        <p className="font-medium">{endpoint.responseTime}ms</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3">
                  <XpressButton variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Logs
                  </XpressButton>
                  <XpressButton variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </XpressButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Add displayName for debugging
ServiceHealthDashboard.displayName = 'ServiceHealthDashboard';

export default memo(ServiceHealthDashboard);