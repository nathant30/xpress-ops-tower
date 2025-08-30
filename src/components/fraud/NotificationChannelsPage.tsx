'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail,
  MessageSquare, 
  Bell,
  Phone,
  Webhook,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Users,
  Clock,
  Shield,
  Plus,
  Trash2,
  Edit,
  RefreshCw
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'teams' | 'discord';
  enabled: boolean;
  config: Record<string, any>;
  testStatus?: 'success' | 'failed' | 'pending';
  lastTested?: Date;
  alertTypes: string[];
  severityLevels: string[];
  recipients: string[];
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: {
    alertTypes: string[];
    severityLevels: string[];
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  channels: string[];
  escalation: {
    enabled: boolean;
    delayMinutes: number;
    escalationChannels: string[];
  };
  schedule: {
    enabled: boolean;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
      days: string[];
    };
  };
}

const NotificationChannelsPage: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [activeTab, setActiveTab] = useState('channels');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  useEffect(() => {
    loadNotificationConfig();
  }, []);

  const loadNotificationConfig = async () => {
    // Mock data - replace with API calls
    const mockChannels: NotificationChannel[] = [
      {
        id: 'email_security_team',
        name: 'Security Team Email',
        type: 'email',
        enabled: true,
        config: {
          smtpServer: 'smtp.xpress.com',
          port: 587,
          username: 'alerts@xpress.com',
          fromEmail: 'security-alerts@xpress.com',
          toEmails: ['security@xpress.com', 'fraud-team@xpress.com']
        },
        testStatus: 'success',
        lastTested: new Date('2025-08-29T10:00:00'),
        alertTypes: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting'],
        severityLevels: ['high', 'critical'],
        recipients: ['security@xpress.com', 'fraud-team@xpress.com']
      },
      {
        id: 'slack_ops_channel',
        name: 'Operations Slack',
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          channel: '#fraud-alerts',
          username: 'Xpress Fraud Bot',
          iconEmoji: ':shield:'
        },
        testStatus: 'success',
        lastTested: new Date('2025-08-29T09:30:00'),
        alertTypes: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting', 'payment_fraud'],
        severityLevels: ['medium', 'high', 'critical'],
        recipients: ['#fraud-alerts']
      },
      {
        id: 'sms_emergency',
        name: 'Emergency SMS',
        type: 'sms',
        enabled: true,
        config: {
          provider: 'twilio',
          accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          authToken: '********************************',
          fromNumber: '+63917XXXXXXX',
          toNumbers: ['+63917XXXXXXX', '+63918XXXXXXX']
        },
        testStatus: 'pending',
        lastTested: undefined,
        alertTypes: ['gps_spoofing'],
        severityLevels: ['critical'],
        recipients: ['+63917XXXXXXX', '+63918XXXXXXX']
      },
      {
        id: 'webhook_external',
        name: 'External System Webhook',
        type: 'webhook',
        enabled: false,
        config: {
          url: 'https://external-system.xpress.com/api/fraud-alerts',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer token_here',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        },
        testStatus: 'failed',
        lastTested: new Date('2025-08-29T08:00:00'),
        alertTypes: ['multi_accounting', 'payment_fraud'],
        severityLevels: ['high', 'critical'],
        recipients: ['external-system']
      }
    ];

    const mockRules: NotificationRule[] = [
      {
        id: 'critical_fraud_immediate',
        name: 'Critical Fraud - Immediate Alert',
        description: 'Immediately notify all channels for critical fraud alerts',
        enabled: true,
        triggers: {
          alertTypes: ['gps_spoofing', 'payment_fraud'],
          severityLevels: ['critical'],
          conditions: [
            { field: 'fraud_score', operator: 'greater_than', value: 90 }
          ]
        },
        channels: ['email_security_team', 'slack_ops_channel', 'sms_emergency'],
        escalation: {
          enabled: true,
          delayMinutes: 15,
          escalationChannels: ['sms_emergency']
        },
        schedule: {
          enabled: false,
          timezone: 'Asia/Manila',
          workingHours: {
            start: '09:00',
            end: '18:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        }
      },
      {
        id: 'business_hours_alerts',
        name: 'Business Hours Alerts',
        description: 'Regular fraud alerts during business hours',
        enabled: true,
        triggers: {
          alertTypes: ['rider_incentive_fraud', 'multi_accounting'],
          severityLevels: ['medium', 'high'],
          conditions: []
        },
        channels: ['email_security_team', 'slack_ops_channel'],
        escalation: {
          enabled: false,
          delayMinutes: 0,
          escalationChannels: []
        },
        schedule: {
          enabled: true,
          timezone: 'Asia/Manila',
          workingHours: {
            start: '08:00',
            end: '20:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          }
        }
      }
    ];

    setChannels(mockChannels);
    setRules(mockRules);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'slack': return <MessageSquare className="h-5 w-5" />;
      case 'sms': return <Phone className="h-5 w-5" />;
      case 'webhook': return <Webhook className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getTestStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const getTestStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const testChannel = async (channelId: string) => {
    setTestingChannel(channelId);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setChannels(prev => prev.map(channel =>
        channel.id === channelId
          ? { ...channel, testStatus: 'success', lastTested: new Date() }
          : channel
      ));
    } catch (error) {
      setChannels(prev => prev.map(channel =>
        channel.id === channelId
          ? { ...channel, testStatus: 'failed', lastTested: new Date() }
          : channel
      ));
    } finally {
      setTestingChannel(null);
    }
  };

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel =>
      channel.id === channelId
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ));
    setUnsavedChanges(true);
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
    setUnsavedChanges(true);
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      logger.info('Saving notification configuration', undefined, { component: 'NotificationChannelsPage' });
      setUnsavedChanges(false);
    } catch (error) {
      logger.error('Failed to save notification configuration', { component: 'NotificationChannelsPage' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Notification Channels
          </h2>
          <p className="text-gray-600">
            Configure alerts and notifications for fraud detection events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unsavedChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button 
            size="sm" 
            onClick={saveConfiguration}
            disabled={!unsavedChanges || saving}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="rules">Notification Rules</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="logs">Notification Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notification Channels</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Channel
            </Button>
          </div>

          <div className="grid gap-6">
            {channels.map(channel => (
              <Card key={channel.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${'bg-blue-100'}`}>
                        {getChannelIcon(channel.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{channel.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {channel.type}
                          </Badge>
                          <Badge variant={channel.enabled ? "default" : "secondary"}>
                            {channel.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {channel.testStatus && (
                            <div className={`flex items-center gap-1 text-sm ${getTestStatusColor(channel.testStatus)}`}>
                              {getTestStatusIcon(channel.testStatus)}
                              <span className="capitalize">{channel.testStatus}</span>
                              {channel.lastTested && (
                                <span className="text-gray-500 ml-1">
                                  ({channel.lastTested.toLocaleString()})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testChannel(channel.id)}
                        disabled={testingChannel === channel.id}
                      >
                        {testingChannel === channel.id ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={channel.enabled}
                          onChange={() => toggleChannel(channel.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alert Types
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {channel.alertTypes.slice(0, 2).map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type.replace('_', ' ')}
                          </Badge>
                        ))}
                        {channel.alertTypes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{channel.alertTypes.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity Levels
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {channel.severityLevels.map(level => (
                          <Badge 
                            key={level} 
                            variant="outline" 
                            className={`text-xs ${
                              level === 'critical' ? 'border-red-200 text-red-700' :
                              level === 'high' ? 'border-orange-200 text-orange-700' :
                              level === 'medium' ? 'border-yellow-200 text-yellow-700' :
                              'border-blue-200 text-blue-700'
                            }`}
                          >
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipients
                      </label>
                      <div className="text-sm text-gray-600">
                        {channel.recipients.slice(0, 2).join(', ')}
                        {channel.recipients.length > 2 && (
                          <span> +{channel.recipients.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Channel-specific configuration preview */}
                  <div className="mt-4 pt-4 border-t bg-gray-50 rounded p-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Configuration</h5>
                    <div className="text-xs text-gray-600 space-y-1">
                      {channel.type === 'email' && (
                        <>
                          <div>SMTP Server: {channel.config.smtpServer}:{channel.config.port}</div>
                          <div>From: {channel.config.fromEmail}</div>
                        </>
                      )}
                      {channel.type === 'slack' && (
                        <>
                          <div>Channel: {channel.config.channel}</div>
                          <div>Bot Name: {channel.config.username}</div>
                        </>
                      )}
                      {channel.type === 'sms' && (
                        <>
                          <div>Provider: {channel.config.provider}</div>
                          <div>From Number: {channel.config.fromNumber}</div>
                        </>
                      )}
                      {channel.type === 'webhook' && (
                        <>
                          <div>URL: {channel.config.url}</div>
                          <div>Method: {channel.config.method}</div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notification Rules</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-4">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        {rule.escalation.enabled && (
                          <Badge variant="outline" className="text-orange-700 border-orange-200">
                            Escalation
                          </Badge>
                        )}
                        {rule.schedule.enabled && (
                          <Badge variant="outline" className="text-blue-700 border-blue-200">
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Triggers</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500">Alert Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.triggers.alertTypes.map(type => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Severity:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.triggers.severityLevels.map(level => (
                              <Badge key={level} variant="outline" className="text-xs">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Channels</h5>
                      <div className="space-y-1">
                        {rule.channels.map(channelId => {
                          const channel = channels.find(c => c.id === channelId);
                          return channel ? (
                            <div key={channelId} className="flex items-center gap-2">
                              {getChannelIcon(channel.type)}
                              <span className="text-sm text-gray-700">{channel.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {rule.escalation.enabled && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Escalation ({rule.escalation.delayMinutes} minutes)
                      </h5>
                      <div className="flex items-center gap-2">
                        {rule.escalation.escalationChannels.map(channelId => {
                          const channel = channels.find(c => c.id === channelId);
                          return channel ? (
                            <Badge key={channelId} variant="outline" className="text-xs">
                              {channel.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {rule.schedule.enabled && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Schedule</h5>
                      <div className="text-sm text-gray-600">
                        <div>Hours: {rule.schedule.workingHours.start} - {rule.schedule.workingHours.end}</div>
                        <div>Days: {rule.schedule.workingHours.days.join(', ')}</div>
                        <div>Timezone: {rule.schedule.timezone}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Message Templates Coming Soon</h3>
                <p>Customize notification message templates for different alert types.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Notification Logs Coming Soon</h3>
                <p>View history of sent notifications, delivery status, and troubleshooting.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationChannelsPage;