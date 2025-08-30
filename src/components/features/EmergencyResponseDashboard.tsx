'use client';

// Emergency Response Dashboard - Crisis Management Interface
// Real-time command center for emergency operations with <60 second response requirement

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/xpress/card';
import { Badge } from '@/components/xpress/badge';
import { Button } from '@/components/xpress/button';
import { AlertCircle, Phone, MapPin, Clock, Users, Activity, CheckCircle, XCircle, AlertTriangle, Radio, Ambulance, Shield, Flame, Car } from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface SOSAlert {
  id: string;
  sosCode: string;
  emergencyType: string;
  severity: number;
  status: 'triggered' | 'processing' | 'dispatched' | 'acknowledged' | 'responding' | 'resolved';
  triggeredAt: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  reporter: {
    id: string;
    type: 'driver' | 'passenger' | 'customer';
    name?: string;
    phone?: string;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicleInfo?: any;
  };
  processingTime?: number;
  responseTime?: number;
  elapsedTime: number;
  withinTarget: boolean;
  emergencyServicesNotified: string[];
  statusColor: string;
}

interface EmergencyResponse {
  id: string;
  responseCode: string;
  sosAlertId: string;
  status: 'initiated' | 'dispatching' | 'dispatched' | 'acknowledged' | 'responding' | 'on_scene' | 'resolved' | 'escalated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  emergencyType: string;
  triggeredAt: string;
  primaryResponder?: {
    service: string;
    unitId: string;
    responderName?: string;
    contactNumber?: string;
    eta?: string;
  };
  serviceDispatches: Array<{
    service: string;
    status: string;
    dispatchedAt: string;
    acknowledgedAt?: string;
    arrivedAt?: string;
    responderName?: string;
    contactNumber?: string;
  }>;
  performanceMetrics: {
    dispatchTime?: number;
    responseTime?: number;
    arrivalTime?: number;
    elapsedTime: number;
    slaViolation: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  statusColor: string;
}

interface SafetyAlert {
  id: string;
  alertCode: string;
  driverId: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: string;
}

interface DashboardMetrics {
  activeSOS: number;
  activeResponses: number;
  safetyAlerts: number;
  averageResponseTime: number;
  under5SecondProcessing: number;
  slaViolations: number;
  performanceRate: string;
}

const EmergencyResponseDashboard: React.FC = () => {
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
  const [emergencyResponses, setEmergencyResponses] = useState<EmergencyResponse[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeSOS: 0,
    activeResponses: 0,
    safetyAlerts: 0,
    averageResponseTime: 0,
    under5SecondProcessing: 0,
    slaViolations: 0,
    performanceRate: '100%'
  });
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<EmergencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // WebSocket connection for real-time updates
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize dashboard
    loadInitialData();
    setupWebSocketConnection();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load active SOS alerts
      const sosResponse = await fetch('/api/emergency/sos?status=active');
      const sosData = await sosResponse.json();
      setSOSAlerts(sosData.data || []);

      // Load active emergency responses
      const responseResponse = await fetch('/api/emergency/responses?status=active');
      const responseData = await responseResponse.json();
      setEmergencyResponses(responseData.data || []);

      // Load safety alerts
      const safetyResponse = await fetch('/api/safety/alerts?status=active');
      const safetyData = await safetyResponse.json();
      setSafetyAlerts(safetyData.data || []);

      // Calculate metrics
      updateMetrics(sosData.data || [], responseData.data || [], safetyData.data || []);
      
    } catch (error) {
      logger.error('Failed to load emergency dashboard data', { component: 'EmergencyResponseDashboard' });
    } finally {
      setIsLoading(false);
      setLastUpdate(new Date());
    }
  };

  const setupWebSocketConnection = () => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/emergency`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      logger.info('Emergency WebSocket connected', undefined, { component: 'EmergencyResponseDashboard' });
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleRealtimeUpdate(data);
    };

    wsRef.current.onclose = () => {
      logger.warn('Emergency WebSocket disconnected. Attempting to reconnect...', undefined, { component: 'EmergencyResponseDashboard' });
      setTimeout(setupWebSocketConnection, 5000);
    };

    wsRef.current.onerror = (error) => {
      logger.error('Emergency WebSocket error', { component: 'EmergencyResponseDashboard' });
    };
  };

  const handleRealtimeUpdate = (data: any) => {
    switch (data.type) {
      case 'CRITICAL_SOS':
      case 'critical_sos':
        handleNewCriticalSOS(data);
        break;
      case 'sos_update':
        handleSOSUpdate(data);
        break;
      case 'emergency_response_update':
        handleEmergencyResponseUpdate(data);
        break;
      case 'critical_safety_alert':
        handleCriticalSafetyAlert(data);
        break;
      case 'panic_button_emergency':
        handlePanicButtonEmergency(data);
        break;
    }
    setLastUpdate(new Date());
  };

  const handleNewCriticalSOS = (data: any) => {
    // Play emergency sound
    if (soundEnabled && data.playEmergencySound) {
      playEmergencySound();
    }

    // Flash screen alert
    if (data.flashScreen) {
      flashScreen();
    }

    // Add or update SOS alert
    setSOSAlerts(prev => {
      const exists = prev.find(sos => sos.id === data.sosId);
      if (exists) {
        return prev.map(sos => sos.id === data.sosId ? { ...sos, ...data } : sos);
      }
      return [transformSOSData(data), ...prev];
    });

    // Auto-select if it's the first critical alert
    setSOSAlerts(prev => {
      if (prev.length === 1) {
        setSelectedAlert(prev[0]);
      }
      return prev;
    });
  };

  const handleSOSUpdate = (data: any) => {
    setSOSAlerts(prev => 
      prev.map(sos => 
        sos.id === data.sosId ? { ...sos, status: data.status, ...data } : sos
      )
    );
  };

  const handleEmergencyResponseUpdate = (data: any) => {
    setEmergencyResponses(prev => 
      prev.map(response => 
        response.id === data.responseId ? { ...response, status: data.status, ...data } : response
      )
    );
  };

  const handleCriticalSafetyAlert = (data: any) => {
    if (soundEnabled && data.playAlert) {
      playAlertSound();
    }

    setSafetyAlerts(prev => [transformSafetyAlertData(data), ...prev]);
  };

  const handlePanicButtonEmergency = (data: any) => {
    if (soundEnabled) {
      playEmergencySound();
    }
    
    if (data.flashScreen) {
      flashScreen();
    }

    // This creates an immediate SOS alert from panic button
    const sosAlert: SOSAlert = {
      id: `panic_${Date.now()}`,
      sosCode: `PANIC-${Date.now().toString().slice(-6)}`,
      emergencyType: data.emergencyType || 'general_emergency',
      severity: 10,
      status: 'triggered',
      triggeredAt: data.timestamp,
      location: data.location,
      reporter: {
        id: data.driverId,
        type: 'driver',
        name: data.driverName,
        phone: data.driverPhone
      },
      driver: {
        id: data.driverId,
        name: data.driverName,
        phone: data.driverPhone,
        vehicleInfo: data.vehicleInfo
      },
      elapsedTime: 0,
      withinTarget: true,
      emergencyServicesNotified: [],
      statusColor: '#DC2626'
    };

    setSOSAlerts(prev => [sosAlert, ...prev]);
    setSelectedAlert(sosAlert);
  };

  const playEmergencySound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => logger.error('Failed to play emergency sound', { component: 'EmergencyResponseDashboard' }));
    }
  };

  const playAlertSound = () => {
    // Play a less intense sound for safety alerts
    const audio = new Audio('/sounds/alert-beep.mp3');
    audio.volume = 0.5;
    audio.play().catch((error) => logger.error('Failed to play alert sound', { component: 'EmergencyResponseDashboard' }));
  };

  const flashScreen = () => {
    document.body.style.backgroundColor = '#DC2626';
    document.body.style.transition = 'background-color 0.2s';
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 200);
    setTimeout(() => {
      document.body.style.backgroundColor = '#DC2626';
    }, 400);
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 600);
  };

  const transformSOSData = (data: any): SOSAlert => ({
    id: data.sosId,
    sosCode: data.sosCode,
    emergencyType: data.emergencyType,
    severity: data.severity || 10,
    status: data.status || 'triggered',
    triggeredAt: data.triggeredAt || data.timestamp,
    location: data.location,
    reporter: data.reporter || {
      id: data.reporterId || data.driverId,
      type: data.reporterType || 'driver',
      name: data.reporterName || data.driverName,
      phone: data.reporterPhone || data.driverPhone
    },
    driver: data.driver,
    processingTime: data.processingTime,
    responseTime: data.responseTime,
    elapsedTime: data.elapsedTime || 0,
    withinTarget: data.withinTarget !== false,
    emergencyServicesNotified: data.emergencyServicesNotified || [],
    statusColor: data.statusColor || '#DC2626'
  });

  const transformSafetyAlertData = (data: any): SafetyAlert => ({
    id: data.alertId,
    alertCode: data.alertCode,
    driverId: data.driverId,
    alertType: data.alertType,
    severity: data.severity || 'warning',
    title: data.title,
    status: 'active',
    triggeredAt: data.triggeredAt || data.timestamp
  });

  const updateMetrics = (sosData: SOSAlert[], responseData: EmergencyResponse[], safetyData: SafetyAlert[]) => {
    const activeSOS = sosData.filter(sos => ['triggered', 'processing', 'dispatched', 'acknowledged', 'responding'].includes(sos.status)).length;
    const activeResponses = responseData.filter(resp => ['initiated', 'dispatching', 'dispatched', 'acknowledged', 'responding', 'on_scene'].includes(resp.status)).length;
    const safetyAlerts = safetyData.filter(alert => alert.status === 'active').length;
    
    const avgResponseTime = sosData
      .filter(sos => sos.responseTime)
      .reduce((sum, sos) => sum + (sos.responseTime || 0), 0) / Math.max(1, sosData.filter(sos => sos.responseTime).length);
    
    const under5Second = sosData.filter(sos => sos.processingTime && sos.processingTime < 5000).length;
    const slaViolations = responseData.filter(resp => resp.performanceMetrics?.slaViolation).length;
    const performanceRate = sosData.length > 0 ? 
      ((under5Second / sosData.length) * 100).toFixed(1) + '%' : 
      '100%';

    setMetrics({
      activeSOS,
      activeResponses,
      safetyAlerts,
      averageResponseTime: Math.round(avgResponseTime / 1000) || 0, // Convert to seconds
      under5SecondProcessing: under5Second,
      slaViolations,
      performanceRate
    });
  };

  const acknowledgeSOS = async (sosId: string) => {
    try {
      await fetch(`/api/emergency/sos/${sosId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          acknowledgedBy: 'current_user', // Would be actual user ID
          message: 'Acknowledged via emergency dashboard'
        })
      });
    } catch (error) {
      logger.error('Failed to acknowledge SOS', { component: 'EmergencyResponseDashboard' });
    }
  };

  const acknowledgeResponse = async (responseId: string) => {
    try {
      await fetch(`/api/emergency/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          source: 'emergency_dashboard'
        })
      });
    } catch (error) {
      logger.error('Failed to acknowledge response', { component: 'EmergencyResponseDashboard' });
    }
  };

  const getStatusIcon = (status: string, type: 'sos' | 'response' | 'safety' = 'sos') => {
    switch (status) {
      case 'triggered': case 'initiated': case 'active':
        return <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />;
      case 'processing': case 'dispatching':
        return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'dispatched': case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'responding': case 'on_scene':
        return <Radio className="h-4 w-4 text-purple-500 animate-pulse" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'medical':
        return <Ambulance className="h-4 w-4 text-red-500" />;
      case 'police':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'fire':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'traffic':
        return <Car className="h-4 w-4 text-yellow-500" />;
      default:
        return <Radio className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatElapsedTime = (elapsedTime: number) => {
    const seconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600">Loading emergency dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Emergency Sound */}
      <audio
        ref={audioRef}
        src="/sounds/emergency-alert.mp3"
        preload="auto"
      />

      {/* Header with Critical Status */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-600">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Emergency Response Command Center
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()} | Sound: 
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`ml-1 px-2 py-1 text-xs rounded ${soundEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Performance Target</div>
          <div className="text-lg font-bold text-red-600">&lt; 5 seconds</div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className={`${metrics.activeSOS > 0 ? 'border-red-500 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{metrics.activeSOS}</div>
            <div className="text-sm text-gray-600">Active SOS</div>
          </CardContent>
        </Card>

        <Card className={`${metrics.activeResponses > 0 ? 'border-blue-500 bg-blue-50' : ''}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{metrics.activeResponses}</div>
            <div className="text-sm text-gray-600">Active Responses</div>
          </CardContent>
        </Card>

        <Card className={`${metrics.safetyAlerts > 0 ? 'border-yellow-500 bg-yellow-50' : ''}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{metrics.safetyAlerts}</div>
            <div className="text-sm text-gray-600">Safety Alerts</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{metrics.averageResponseTime}s</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{metrics.under5SecondProcessing}</div>
            <div className="text-sm text-gray-600">Under 5s</div>
          </CardContent>
        </Card>

        <Card className={`${metrics.slaViolations > 0 ? 'border-red-500 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{metrics.slaViolations}</div>
            <div className="text-sm text-gray-600">SLA Violations</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{metrics.performanceRate}</div>
            <div className="text-sm text-gray-600">Performance</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active SOS Alerts */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Active SOS Alerts ({sosAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {sosAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active SOS alerts</p>
            ) : (
              sosAlerts.map(sos => (
                <div
                  key={sos.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAlert?.id === sos.id ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
                  } ${!sos.withinTarget ? 'border-l-4 border-l-red-600' : ''}`}
                  onClick={() => setSelectedAlert(sos)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(sos.status)}
                      <Badge 
                        variant={sos.severity >= 8 ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {sos.sosCode}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatElapsedTime(sos.elapsedTime)}
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {sos.emergencyType.replace('_', ' ').toUpperCase()}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {sos.driver?.name || sos.reporter.name || 'Unknown Reporter'}
                    {sos.reporter.phone && (
                      <span className="ml-2 text-blue-600">{sos.reporter.phone}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {sos.location.address || `${sos.location.latitude.toFixed(4)}, ${sos.location.longitude.toFixed(4)}`}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {sos.emergencyServicesNotified.map(service => (
                        <div key={service} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {getServiceIcon(service)}
                          {service}
                        </div>
                      ))}
                    </div>
                    
                    {sos.status === 'triggered' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeSOS(sos.id);
                        }}
                        className="text-xs h-6 bg-red-600 hover:bg-red-700"
                      >
                        ACK
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Emergency Responses */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-600 flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Emergency Responses ({emergencyResponses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {emergencyResponses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active emergency responses</p>
            ) : (
              emergencyResponses.map(response => (
                <div
                  key={response.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedResponse?.id === response.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  } ${response.performanceMetrics.slaViolation ? 'border-l-4 border-l-red-600' : ''}`}
                  onClick={() => setSelectedResponse(response)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(response.status, 'response')}
                      <Badge 
                        variant={response.priority === 'critical' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {response.responseCode}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatElapsedTime(response.performanceMetrics.elapsedTime)}
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {response.emergencyType.replace('_', ' ').toUpperCase()}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    Priority: {response.priority.toUpperCase()}
                  </div>
                  
                  {response.primaryResponder && (
                    <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                      {getServiceIcon(response.primaryResponder.service)}
                      {response.primaryResponder.service}: {response.primaryResponder.unitId}
                      {response.primaryResponder.eta && (
                        <span className="text-green-600 ml-1">ETA: {new Date(response.primaryResponder.eta).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {response.location.address || `${response.location.latitude.toFixed(4)}, ${response.location.longitude.toFixed(4)}`}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Services: {response.serviceDispatches.length}
                      {response.performanceMetrics.slaViolation && (
                        <span className="text-red-600 ml-2 font-bold">SLA VIOLATION</span>
                      )}
                    </div>
                    
                    {response.status === 'dispatched' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeResponse(response.id);
                        }}
                        className="text-xs h-6 bg-blue-600 hover:bg-blue-700"
                      >
                        ACK
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Safety Alerts */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Safety Alerts ({safetyAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {safetyAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active safety alerts</p>
            ) : (
              safetyAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(alert.status, 'safety')}
                      <Badge 
                        variant={alert.severity === 'critical' || alert.severity === 'emergency' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {alert.alertCode}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {alert.title}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    Type: {alert.alertType.replace('_', ' ')}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Driver ID: {alert.driverId}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Alert Details */}
      {selectedAlert && (
        <Card className="border-red-500">
          <CardHeader className="pb-3 bg-red-50">
            <CardTitle className="text-red-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                SOS Alert Details - {selectedAlert.sosCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Emergency Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Type:</span> {selectedAlert.emergencyType}</div>
                  <div><span className="font-medium">Severity:</span> {selectedAlert.severity}/10</div>
                  <div><span className="font-medium">Status:</span> 
                    <Badge className="ml-2" variant={selectedAlert.status === 'resolved' ? 'default' : 'destructive'}>
                      {selectedAlert.status}
                    </Badge>
                  </div>
                  <div><span className="font-medium">Triggered:</span> {new Date(selectedAlert.triggeredAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Reporter Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedAlert.reporter.name || 'Unknown'}</div>
                  <div><span className="font-medium">Type:</span> {selectedAlert.reporter.type}</div>
                  {selectedAlert.reporter.phone && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Phone:</span> 
                      <a href={`tel:${selectedAlert.reporter.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedAlert.reporter.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Processing Time:</span> 
                    <span className={`ml-2 ${selectedAlert.withinTarget ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedAlert.processingTime ? `${selectedAlert.processingTime}ms` : 'Processing...'}
                    </span>
                  </div>
                  <div><span className="font-medium">Response Time:</span> {selectedAlert.responseTime ? `${selectedAlert.responseTime}ms` : 'Pending'}</div>
                  <div><span className="font-medium">Elapsed Time:</span> {formatElapsedTime(selectedAlert.elapsedTime)}</div>
                  <div><span className="font-medium">Within Target:</span> 
                    <Badge className="ml-2" variant={selectedAlert.withinTarget ? 'default' : 'destructive'}>
                      {selectedAlert.withinTarget ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {selectedAlert.emergencyServicesNotified.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Emergency Services Notified</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.emergencyServicesNotified.map(service => (
                    <div key={service} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {getServiceIcon(service)}
                      {service.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => acknowledgeSOS(selectedAlert.id)}
                disabled={selectedAlert.status !== 'triggered'}
                className="bg-red-600 hover:bg-red-700"
              >
                Acknowledge SOS
              </Button>
              <Button variant="outline">
                View Full Timeline
              </Button>
              <Button variant="outline">
                Contact Reporter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmergencyResponseDashboard;