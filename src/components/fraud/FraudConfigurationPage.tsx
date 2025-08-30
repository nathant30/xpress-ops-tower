'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Shield, 
  AlertTriangle,
  Users,
  Zap,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sliders,
  Target,
  Activity
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface ThresholdConfig {
  id: string;
  name: string;
  description: string;
  category: 'detection' | 'escalation' | 'blocking' | 'review';
  currentValue: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  unit: 'percentage' | 'score' | 'count' | 'seconds';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface FraudRuleConfig {
  id: string;
  name: string;
  description: string;
  fraudType: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    weight: number;
  }>;
  action: 'flag' | 'review' | 'block' | 'escalate';
  lastModified: Date;
}

const FraudConfigurationPage: React.FC = () => {
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [rules, setRules] = useState<FraudRuleConfig[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('thresholds');

  // Load initial configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    // Mock data - replace with API calls
    const mockThresholds: ThresholdConfig[] = [
      {
        id: 'rider_incentive_threshold',
        name: 'Rider Incentive Fraud Score',
        description: 'Minimum score to flag incentive fraud',
        category: 'detection',
        currentValue: 65,
        defaultValue: 70,
        minValue: 30,
        maxValue: 95,
        unit: 'score',
        riskLevel: 'medium',
        enabled: true
      },
      {
        id: 'gps_spoofing_threshold',
        name: 'GPS Spoofing Confidence',
        description: 'Minimum confidence to flag GPS manipulation',
        category: 'detection',
        currentValue: 70,
        defaultValue: 75,
        minValue: 50,
        maxValue: 95,
        unit: 'percentage',
        riskLevel: 'high',
        enabled: true
      },
      {
        id: 'multi_account_threshold',
        name: 'Multi-Account Risk Score',
        description: 'Minimum similarity score for multi-account detection',
        category: 'detection',
        currentValue: 70,
        defaultValue: 75,
        minValue: 40,
        maxValue: 90,
        unit: 'score',
        riskLevel: 'medium',
        enabled: true
      },
      {
        id: 'auto_escalation_threshold',
        name: 'Auto Escalation Threshold',
        description: 'Score above which alerts are automatically escalated',
        category: 'escalation',
        currentValue: 85,
        defaultValue: 90,
        minValue: 70,
        maxValue: 98,
        unit: 'score',
        riskLevel: 'critical',
        enabled: true
      },
      {
        id: 'real_time_blocking_threshold',
        name: 'Real-time Blocking Threshold',
        description: 'Score above which actions are blocked immediately',
        category: 'blocking',
        currentValue: 90,
        defaultValue: 95,
        minValue: 80,
        maxValue: 99,
        unit: 'score',
        riskLevel: 'critical',
        enabled: false
      },
      {
        id: 'manual_review_threshold',
        name: 'Manual Review Threshold',
        description: 'Score above which cases require manual review',
        category: 'review',
        currentValue: 60,
        defaultValue: 65,
        minValue: 30,
        maxValue: 85,
        unit: 'score',
        riskLevel: 'low',
        enabled: true
      }
    ];

    const mockRules: FraudRuleConfig[] = [
      {
        id: 'excessive_promo_usage',
        name: 'Excessive Promo Code Usage',
        description: 'Detects riders using too many promo codes',
        fraudType: 'rider_incentive_fraud',
        enabled: true,
        severity: 'high',
        conditions: [
          { field: 'promo_codes_used_7d', operator: 'greater_than', value: 15, weight: 30 },
          { field: 'short_rides_percentage', operator: 'greater_than', value: 0.6, weight: 25 }
        ],
        action: 'review',
        lastModified: new Date('2025-08-29T10:00:00')
      },
      {
        id: 'impossible_speed_detection',
        name: 'Impossible Travel Speed',
        description: 'Detects GPS points with impossible travel speeds',
        fraudType: 'gps_spoofing',
        enabled: true,
        severity: 'critical',
        conditions: [
          { field: 'max_speed_kmh', operator: 'greater_than', value: 200, weight: 35 },
          { field: 'teleportation_detected', operator: 'equals', value: true, weight: 40 }
        ],
        action: 'escalate',
        lastModified: new Date('2025-08-29T09:30:00')
      },
      {
        id: 'shared_device_detection',
        name: 'Shared Device Detection',
        description: 'Detects multiple accounts using the same device',
        fraudType: 'multi_accounting',
        enabled: true,
        severity: 'medium',
        conditions: [
          { field: 'device_similarity_score', operator: 'greater_than', value: 0.8, weight: 25 },
          { field: 'shared_ip_addresses', operator: 'greater_than', value: 3, weight: 20 }
        ],
        action: 'flag',
        lastModified: new Date('2025-08-29T08:45:00')
      }
    ];

    setThresholds(mockThresholds);
    setRules(mockRules);
  };

  const updateThreshold = (id: string, newValue: number) => {
    setThresholds(prev => prev.map(threshold =>
      threshold.id === id ? { ...threshold, currentValue: newValue } : threshold
    ));
    setUnsavedChanges(true);
  };

  const toggleThreshold = (id: string) => {
    setThresholds(prev => prev.map(threshold =>
      threshold.id === id ? { ...threshold, enabled: !threshold.enabled } : threshold
    ));
    setUnsavedChanges(true);
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
    setUnsavedChanges(true);
  };

  const resetToDefaults = () => {
    setThresholds(prev => prev.map(threshold => ({
      ...threshold,
      currentValue: threshold.defaultValue
    })));
    setUnsavedChanges(true);
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      logger.info('Saving fraud configuration', undefined, { component: 'FraudConfigurationPage' });
      setUnsavedChanges(false);
    } catch (error) {
      logger.error('Failed to save fraud configuration', { component: 'FraudConfigurationPage' });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'detection': return <Target className="h-4 w-4" />;
      case 'escalation': return <AlertTriangle className="h-4 w-4" />;
      case 'blocking': return <Shield className="h-4 w-4" />;
      case 'review': return <Users className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Fraud Detection Configuration
          </h2>
          <p className="text-gray-600">
            Configure thresholds, rules, and detection parameters
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unsavedChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset to Defaults
          </Button>
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
          <TabsTrigger value="thresholds">Detection Thresholds</TabsTrigger>
          <TabsTrigger value="rules">Fraud Rules</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
          <TabsTrigger value="testing">Test Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds" className="space-y-4">
          <div className="grid gap-6">
            {/* Threshold Categories */}
            {['detection', 'escalation', 'blocking', 'review'].map(category => {
              const categoryThresholds = thresholds.filter(t => t.category === category);
              if (categoryThresholds.length === 0) return null;

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 capitalize">
                      {getCategoryIcon(category)}
                      {category} Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {categoryThresholds.map(threshold => (
                        <div key={threshold.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{threshold.name}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={getRiskColor(threshold.riskLevel)}
                                >
                                  {threshold.riskLevel}
                                </Badge>
                                <Badge variant={threshold.enabled ? "default" : "secondary"}>
                                  {threshold.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{threshold.description}</p>
                            </div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={threshold.enabled}
                                onChange={() => toggleThreshold(threshold.id)}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-600">Enable</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Value
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min={threshold.minValue}
                                  max={threshold.maxValue}
                                  value={threshold.currentValue}
                                  onChange={(e) => updateThreshold(threshold.id, parseInt(e.target.value))}
                                  className="flex-1"
                                  disabled={!threshold.enabled}
                                />
                                <input
                                  type="number"
                                  min={threshold.minValue}
                                  max={threshold.maxValue}
                                  value={threshold.currentValue}
                                  onChange={(e) => updateThreshold(threshold.id, parseInt(e.target.value))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                  disabled={!threshold.enabled}
                                />
                                <span className="text-sm text-gray-500 min-w-0">
                                  {threshold.unit === 'percentage' ? '%' : 
                                   threshold.unit === 'score' ? 'pts' :
                                   threshold.unit === 'seconds' ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default
                              </label>
                              <div className="text-lg font-semibold text-gray-600">
                                {threshold.defaultValue}
                                <span className="text-sm text-gray-400 ml-1">
                                  {threshold.unit === 'percentage' ? '%' : 
                                   threshold.unit === 'score' ? 'pts' :
                                   threshold.unit === 'seconds' ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Range
                              </label>
                              <div className="text-sm text-gray-600">
                                {threshold.minValue} - {threshold.maxValue}
                                <span className="ml-1">
                                  {threshold.unit === 'percentage' ? '%' : 
                                   threshold.unit === 'score' ? 'pts' :
                                   threshold.unit === 'seconds' ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Detection Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map(rule => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <p className="text-xs text-gray-500">
                          Type: {rule.fraudType} • Action: {rule.action} • 
                          Modified: {rule.lastModified.toLocaleDateString()}
                        </p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable</span>
                      </label>
                    </div>

                    <div className="bg-gray-50 rounded p-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Conditions:</h5>
                      <div className="space-y-1">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            <code className="bg-white px-2 py-1 rounded text-xs">
                              {condition.field} {condition.operator} {condition.value}
                            </code>
                            <span className="ml-2 text-xs text-gray-500">
                              Weight: {condition.weight}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Fraud Detection Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">System Settings</h4>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium">Real-time Blocking</p>
                        <p className="text-sm text-gray-600">Enable automatic action blocking</p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={false}
                          className="rounded border-gray-300 text-blue-600 shadow-sm"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium">Batch Processing</p>
                        <p className="text-sm text-gray-600">Process alerts in batches</p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="rounded border-gray-300 text-blue-600 shadow-sm"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Auto-escalation</p>
                        <p className="text-sm text-gray-600">Automatically escalate critical alerts</p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="rounded border-gray-300 text-blue-600 shadow-sm"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Processing Limits</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Queue Size
                      </label>
                      <input
                        type="number"
                        defaultValue={1000}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batch Processing Interval (seconds)
                      </label>
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alert Retention (days)
                      </label>
                      <input
                        type="number"
                        defaultValue={30}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Test Configuration Coming Soon</h3>
                <p>Test your fraud detection rules with sample data and scenarios.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FraudConfigurationPage;