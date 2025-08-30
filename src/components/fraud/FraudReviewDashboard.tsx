'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle,
  Shield, 
  MapPin,
  Users,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';
import { FraudAlert, FraudAlertType } from '@/types/fraudDetection';

interface FraudDashboardProps {
  className?: string;
}

interface FraudStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  estimatedLoss: number;
  preventedLoss: number;
}

const FraudReviewDashboard: React.FC<FraudDashboardProps> = ({ className = '' }) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
    criticalAlerts: 0,
    estimatedLoss: 0,
    preventedLoss: 0
  });
  
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [filterType, setFilterType] = useState<FraudAlertType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const generateMockAlerts = (): FraudAlert[] => {
      const mockAlerts: FraudAlert[] = [
        {
          id: 'RIF_001',
          timestamp: new Date('2025-08-29T10:30:00'),
          alertType: 'rider_incentive_fraud',
          severity: 'high',
          status: 'active',
          subjectType: 'rider',
          subjectId: 'rider_12345',
          title: 'Excessive Promo Code Usage',
          description: 'Rider has used 25 promo codes in the last 7 days with suspicious ride patterns',
          fraudScore: 87,
          confidence: 92,
          evidence: [
            {
              type: 'behavior',
              description: 'Extremely high promo code usage frequency',
              data: { promoCount: 25, period: '7_days' },
              weight: 30,
              timestamp: new Date()
            }
          ],
          patterns: [],
          riskFactors: [],
          currency: 'PHP',
          estimatedLoss: 2500
        },
        {
          id: 'GPS_002',
          timestamp: new Date('2025-08-29T09:15:00'),
          alertType: 'gps_spoofing',
          severity: 'critical',
          status: 'investigating',
          subjectType: 'ride',
          subjectId: 'ride_67890',
          title: 'GPS Location Manipulation Detected',
          description: 'Driver appears to be using fake GPS location during ride',
          fraudScore: 95,
          confidence: 88,
          evidence: [
            {
              type: 'location',
              description: 'Impossible travel speeds detected',
              data: { maxSpeed: 250, normalSpeed: 45 },
              weight: 35,
              timestamp: new Date()
            }
          ],
          patterns: [],
          riskFactors: [],
          currency: 'PHP',
          estimatedLoss: 150
        },
        {
          id: 'MA_003',
          timestamp: new Date('2025-08-29T08:45:00'),
          alertType: 'multi_accounting',
          severity: 'medium',
          status: 'resolved',
          subjectType: 'rider',
          subjectId: 'rider_54321',
          title: 'Multiple Account Detection',
          description: 'Potential multiple accounts sharing same device and payment method',
          fraudScore: 73,
          confidence: 79,
          evidence: [],
          patterns: [],
          riskFactors: [],
          currency: 'PHP',
          estimatedLoss: 800
        }
      ];
      return mockAlerts;
    };

    const mockAlerts = generateMockAlerts();
    setAlerts(mockAlerts);
    setFilteredAlerts(mockAlerts);
    
    // Calculate stats
    const mockStats: FraudStats = {
      totalAlerts: mockAlerts.length,
      activeAlerts: mockAlerts.filter(a => a.status === 'active').length,
      resolvedAlerts: mockAlerts.filter(a => a.status === 'resolved').length,
      criticalAlerts: mockAlerts.filter(a => a.severity === 'critical').length,
      estimatedLoss: mockAlerts.reduce((sum, alert) => sum + (alert.estimatedLoss || 0), 0),
      preventedLoss: 15750 // Mock prevented loss
    };
    setStats(mockStats);
    setIsLoading(false);
  }, []);

  // Filter alerts based on current filters
  useEffect(() => {
    let filtered = alerts;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.alertType === filterType);
    }
    
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.subjectId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAlerts(filtered);
  }, [alerts, filterType, filterSeverity, searchTerm]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600';
      case 'investigating': return 'text-orange-600';
      case 'resolved': return 'text-green-600';
      case 'false_positive': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertTypeLabel = (type: FraudAlertType) => {
    const labels: Record<FraudAlertType, string> = {
      'rider_incentive_fraud': 'Rider Incentive Fraud',
      'gps_spoofing': 'GPS Spoofing',
      'multi_accounting': 'Multi-Accounting',
      'fake_rides': 'Fake Rides',
      'payment_fraud': 'Payment Fraud',
      'driver_collusion': 'Driver Collusion',
      'promo_abuse': 'Promo Abuse',
      'rating_manipulation': 'Rating Manipulation',
      'identity_theft': 'Identity Theft',
      'device_fraud': 'Device Fraud'
    };
    return labels[type] || type;
  };

  const handleAlertAction = (alertId: string, action: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: action === 'resolve' ? 'resolved' : 'investigating' }
        : alert
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-5 w-5" />
          <span>Loading fraud detection data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Fraud Detection Center
          </h2>
          <p className="text-gray-600">
            Advanced fraud detection and review system for Xpress Philippines
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              All-time fraud alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              High priority cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolvedAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Cases closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Loss</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₱{stats.estimatedLoss.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Potential losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prevented Loss</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₱{stats.preventedLoss.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Fraud prevented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Alerts
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by title, description, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FraudAlertType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="rider_incentive_fraud">Rider Incentive Fraud</option>
                <option value="gps_spoofing">GPS Spoofing</option>
                <option value="multi_accounting">Multi-Accounting</option>
                <option value="payment_fraud">Payment Fraud</option>
                <option value="fake_rides">Fake Rides</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alert Review</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="rules">Detection Rules</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Alerts List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Fraud Alerts ({filteredAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedAlert?.id === alert.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></span>
                              <Badge variant="outline">{getAlertTypeLabel(alert.alertType)}</Badge>
                              <span className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                                {alert.status.toUpperCase()}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {alert.timestamp.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {alert.subjectId}
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Score: {alert.fraudScore}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {alert.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAlertAction(alert.id, 'investigate');
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAlertAction(alert.id, 'resolve');
                                  }}
                                >
                                  Resolve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {filteredAlerts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No alerts match the current filters
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Details */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Alert Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAlert ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">{selectedAlert.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{selectedAlert.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">Severity</label>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-3 h-3 rounded-full ${getSeverityColor(selectedAlert.severity)}`}></span>
                              <span className="capitalize">{selectedAlert.severity}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">Score</label>
                            <span className="text-lg font-semibold">{selectedAlert.fraudScore}%</span>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">Confidence</label>
                            <span className="text-lg font-semibold">{selectedAlert.confidence}%</span>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">Est. Loss</label>
                            <span className="text-lg font-semibold text-red-600">
                              ₱{selectedAlert.estimatedLoss?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Evidence ({selectedAlert.evidence.length})</h5>
                        <div className="space-y-2">
                          {selectedAlert.evidence.map((evidence, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium capitalize">{evidence.type}</span>
                                <Badge variant="outline" className="text-xs">
                                  Weight: {evidence.weight}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{evidence.description}</p>
                            </div>
                          ))}
                          
                          {selectedAlert.evidence.length === 0 && (
                            <p className="text-sm text-gray-500 italic">No evidence recorded</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Resolved
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <XCircle className="h-4 w-4 mr-1" />
                            False Positive
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select an alert to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
                <p>Advanced fraud analytics and reporting features will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Detection Rules Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Rules Engine Coming Soon</h3>
                <p>Configure and manage fraud detection rules and thresholds.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investigations">
          <Card>
            <CardHeader>
              <CardTitle>Active Investigations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Eye className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Investigation Workflow Coming Soon</h3>
                <p>Track and manage fraud investigations and case management.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Add displayName for debugging
FraudReviewDashboard.displayName = 'FraudReviewDashboard';

export default memo(FraudReviewDashboard);