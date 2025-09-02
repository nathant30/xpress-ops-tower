'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  AlertTriangle, 
  X, 
  Minimize2, 
  Maximize2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  PhoneCall, 
  Truck, 
  AlertOctagon,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Gauge,
  RefreshCw,
  Clock,
  Radio,
  Users,
  FileText,
  Download,
  Zap,
  Activity,
  Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import LiveMap from '../../components/LiveMap';

// AI Integration
import { modelServingInfrastructure } from '@/lib/ai/modelServing/servingInfrastructure';
import { modelMonitoringSystem } from '@/lib/ai/monitoring/modelMonitoring';

// Types
type UserRole = 'dispatcher' | 'ops_manager';
type ViewMode = 'compact' | 'detailed';
type KPIStatus = 'optimal' | 'caution' | 'critical';
type SafetyStage = 'banner' | 'modal' | 'drawer' | 'history';
type DrawerView = 'ai_predictions' | 'incident_detail' | 'closed';

interface EmergencyIncident {
  id: string;
  type: 'sos' | 'accident' | 'breakdown' | 'safety' | 'medical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  driverId: string;
  driverName: string;
  driverPhone: string;
  location: { lat: number; lng: number; address: string };
  timestamp: Date;
  status: 'active' | 'responding' | 'resolved' | 'escalated';
  description: string;
  notes: Array<{ timestamp: Date; message: string; author: string }>;
  responseTeam?: string;
  eta?: number;
}

interface KPITile {
  id: string;
  title: string;
  value: number | string;
  status: KPIStatus;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
  drillDownData?: any;
}

interface HeatmapZone {
  id: string;
  name: string;
  level: 'city' | 'district' | 'street';
  coordinates: Array<{lat: number, lng: number}>;
  supplyDemandRatio: number;
  activeDrivers: number;
  activeRequests: number;
  averageETA: number;
  surgeFactor: number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}

const OpsTowardDashboard = () => {
  const { selectedServiceType } = useServiceType();
  const router = useRouter();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('dispatcher');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [currentZoomLevel, setCurrentZoomLevel] = useState<'city' | 'district' | 'street'>('city');
  
  // Real-time updates
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Safety Console State
  const [safetyStage, setSafetyStage] = useState<SafetyStage>('banner');
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const [modalLocked, setModalLocked] = useState(false);
  const [safetyDrawerOpen, setSafetyDrawerOpen] = useState(false);
  
  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [kpiDrillDown, setKpiDrillDown] = useState<string | null>(null);
  const [rightDrawerView, setRightDrawerView] = useState<DrawerView>('closed');
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'ops' | 'drivers' | 'ai'>('ops');
  const [showZoneOverlay, setShowZoneOverlay] = useState(true);
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  
  // KPI Dashboard State
  const [kpiTiles, setKpiTiles] = useState<KPITile[]>([
    {
      id: 'supply-demand',
      title: 'Supply/Demand Balance',
      value: 87,
      status: 'optimal',
      trend: 'up',
      unit: '%',
      description: 'Balanced supply and demand across all zones',
      drillDownData: {
        zones: [
          { name: 'Metro Manila', ratio: 0.92, status: 'optimal' },
          { name: 'Cebu', ratio: 0.85, status: 'optimal' },
          { name: 'Davao', ratio: 0.79, status: 'caution' }
        ]
      }
    },
    {
      id: 'average-eta',
      title: 'Average ETA',
      value: 4.2,
      status: 'optimal',
      trend: 'stable',
      unit: 'min',
      description: 'AI-predicted arrival times across all bookings',
      drillDownData: {
        breakdown: [
          { timeOfDay: 'Peak Hours', eta: 6.1, status: 'caution' },
          { timeOfDay: 'Off-Peak', eta: 3.2, status: 'optimal' },
          { timeOfDay: 'Late Night', eta: 2.8, status: 'optimal' }
        ]
      }
    },
    {
      id: 'cancellation-rate',
      title: 'Cancellation Rate',
      value: 8.3,
      status: 'caution',
      trend: 'down',
      unit: '%',
      description: 'Cancellations trending down from AI interventions',
      drillDownData: {
        reasons: [
          { reason: 'Long Wait Time', percentage: 45, trend: 'down' },
          { reason: 'Driver No-Show', percentage: 30, trend: 'stable' },
          { reason: 'Route Issues', percentage: 25, trend: 'down' }
        ]
      }
    },
    {
      id: 'active-sos',
      title: 'Active SOS',
      value: 2,
      status: 'critical',
      trend: 'stable',
      unit: 'alerts',
      description: 'Critical emergency incidents requiring immediate response',
      drillDownData: {
        incidents: [
          { type: 'Medical Emergency', location: 'BGC', time: '2 min ago', priority: 'critical' },
          { type: 'Vehicle Breakdown', location: 'Makati', time: '5 min ago', priority: 'high' }
        ]
      }
    },
    {
      id: 'completed-trips',
      title: 'Completed Trips',
      value: 2847,
      status: 'optimal',
      trend: 'up',
      unit: '',
      description: 'Total trips completed today across all services',
      drillDownData: {
        breakdown: [
          { service: 'Motorcycle', trips: 1243, percentage: 44, trend: 'up' },
          { service: 'Car', trips: 986, percentage: 35, trend: 'up' },
          { service: 'SUV', trips: 412, percentage: 14, trend: 'stable' },
          { service: 'Taxi', trips: 206, percentage: 7, trend: 'up' }
        ]
      }
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      value: 94.2,
      status: 'optimal',
      trend: 'up',
      unit: '%',
      description: 'Percentage of trips successfully completed without cancellation',
      drillDownData: {
        timeBreakdown: [
          { period: 'Morning Rush', rate: 96.1, status: 'optimal' },
          { period: 'Midday', rate: 94.8, status: 'optimal' },
          { period: 'Evening Rush', rate: 91.7, status: 'caution' },
          { period: 'Night', rate: 95.3, status: 'optimal' }
        ]
      }
    }
  ]);

  // Dynamic Emergency Banner State
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const [emergencyAnimation, setEmergencyAnimation] = useState<'enter' | 'exit' | 'none'>('none');

  // Emergency Incidents - Prototype data for banner rotation
  const [emergencyIncidents, setEmergencyIncidents] = useState<EmergencyIncident[]>([
    {
      id: 'sos-001',
      type: 'medical',
      priority: 'critical',
      driverId: 'DRV-001',
      driverName: 'Juan Santos',
      driverPhone: '+63917-123-4567',
      location: { 
        lat: 14.5547, 
        lng: 121.0244, 
        address: '26th St, BGC, Taguig' 
      },
      timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      status: 'active',
      description: 'Medical emergency - passenger collapsed',
      notes: [
        { timestamp: new Date(Date.now() - 120000), message: 'Emergency reported via panic button', author: 'System' },
        { timestamp: new Date(Date.now() - 90000), message: 'Emergency services contacted', author: 'Dispatcher' },
        { timestamp: new Date(Date.now() - 60000), message: 'Ambulance dispatched - ETA 3 minutes', author: 'Emergency Team' }
      ],
      responseTeam: 'Emergency-Alpha-1',
      eta: 3
    },
    {
      id: 'sos-002',
      type: 'accident',
      priority: 'high',
      driverId: 'DRV-007',
      driverName: 'Maria Rodriguez',
      driverPhone: '+63917-987-6543',
      location: { 
        lat: 14.5176, 
        lng: 121.0509, 
        address: 'Ayala Ave, Makati CBD' 
      },
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      status: 'active',
      description: 'Vehicle collision - minor injuries reported',
      notes: [
        { timestamp: new Date(Date.now() - 300000), message: 'Accident reported by driver', author: 'System' },
        { timestamp: new Date(Date.now() - 240000), message: 'Police notified', author: 'Dispatcher' },
      ],
      responseTeam: 'Traffic-Unit-2',
      eta: 8
    },
    {
      id: 'sos-003',
      type: 'safety',
      priority: 'critical',
      driverId: 'DRV-015',
      driverName: 'Carlos Mendoza',
      driverPhone: '+63917-555-0123',
      location: { 
        lat: 14.5995, 
        lng: 120.9842, 
        address: 'Rizal Park, Manila' 
      },
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
      status: 'active',
      description: 'Safety threat - passenger acting aggressively',
      notes: [
        { timestamp: new Date(Date.now() - 180000), message: 'Safety alert triggered', author: 'System' },
        { timestamp: new Date(Date.now() - 150000), message: 'Security team dispatched', author: 'Dispatcher' },
      ],
      responseTeam: 'Security-Team-1',
      eta: 5
    }
  ]);

  // Prototype Emergency Banner Loop
  useEffect(() => {
    const emergencyBannerLoop = () => {
      // Show banner with animation
      setEmergencyAnimation('enter');
      setShowEmergencyBanner(true);
      
      setTimeout(() => {
        setEmergencyAnimation('none');
      }, 1000); // Animation duration
      
      // Hide banner after 8 seconds
      setTimeout(() => {
        setEmergencyAnimation('exit');
        
        setTimeout(() => {
          setShowEmergencyBanner(false);
          setEmergencyAnimation('none');
          
          // Rotate to next incident for variety
          setEmergencyIncidents(prev => {
            const current = prev[0];
            const rest = prev.slice(1);
            return [...rest, current];
          });
        }, 1000); // Exit animation duration
      }, 8000); // Show for 8 seconds
    };

    // Start the loop immediately
    emergencyBannerLoop();
    
    // Continue every 30 seconds
    const interval = setInterval(emergencyBannerLoop, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // AI Anomaly Data
  const [aiAnomalies, setAiAnomalies] = useState({
    idleDriversOver20Min: 12,
    highCancellationClusters: 3,
    offlineAfterLogin: 5,
    predictedHotspots: ['BGC Taguig', 'Makati CBD', 'Ortigas Center'],
    complianceAlerts: 2
  });

  // Exception filters state
  const [exceptionFilters, setExceptionFilters] = useState({
    sosActive: false,
    idleDrivers: false,
    highCancellations: false,
    offlineAfterLogin: false
  });

  // Mock driver and trip data for filtering
  const [mockDriverData] = useState({
    sosDrivers: [
      { id: 'DRV-001', lat: 14.5547, lng: 121.0244, status: 'sos', name: 'Juan Santos' },
    ],
    idleDrivers: Array.from({ length: 12 }, (_, i) => ({
      id: `DRV-IDLE-${i + 1}`,
      lat: 14.5 + (Math.random() - 0.5) * 0.2,
      lng: 121.0 + (Math.random() - 0.5) * 0.2,
      status: 'idle',
      idleTime: 20 + Math.random() * 40,
      name: `Idle Driver ${i + 1}`
    })),
    highCancellationAreas: [
      { id: 'AREA-1', lat: 14.5995, lng: 120.9842, radius: 2000, cancellationRate: 0.35 }, // Quezon City
      { id: 'AREA-2', lat: 14.5176, lng: 121.0509, radius: 1500, cancellationRate: 0.28 }, // Pasig
      { id: 'AREA-3', lat: 14.6760, lng: 121.0437, radius: 1000, cancellationRate: 0.31 }  // Marikina
    ],
    offlineDrivers: Array.from({ length: 5 }, (_, i) => ({
      id: `DRV-OFFLINE-${i + 1}`,
      lat: 14.5 + (Math.random() - 0.5) * 0.3,
      lng: 121.0 + (Math.random() - 0.5) * 0.3,
      status: 'offline',
      lastSeen: new Date(Date.now() - Math.random() * 3600000),
      name: `Offline Driver ${i + 1}`
    })),
    onlineDrivers: Array.from({ length: 45 }, (_, i) => ({
      id: `DRV-ONLINE-${i + 1}`,
      lat: 14.5 + (Math.random() - 0.5) * 0.4,
      lng: 121.0 + (Math.random() - 0.5) * 0.4,
      status: Math.random() > 0.7 ? 'busy' : 'available',
      name: `Driver ${i + 1}`,
      rating: 4.2 + Math.random() * 0.8,
      completedTrips: Math.floor(Math.random() * 500) + 100,
      lastActivity: new Date(Date.now() - Math.random() * 600000), // Within last 10 minutes
      vehicle: {
        type: Math.random() > 0.6 ? 'motorcycle' : 'car',
        plate: `ABC${Math.floor(Math.random() * 9000) + 1000}`,
        model: Math.random() > 0.5 ? 'Toyota Vios' : 'Honda Beat'
      }
    }))
  });

  // Metro Manila Zone System (8 Strategic Zones)
  const [metroManilaZones] = useState<HeatmapZone[]>([
    {
      id: 'north-metro',
      name: 'North Metro',
      level: 'district' as const,
      coordinates: [
        { lat: 14.6760, lng: 121.0437 }, // Marikina
        { lat: 14.6349, lng: 121.0569 }, // QC North
        { lat: 14.6760, lng: 121.0437 }, // Caloocan
        { lat: 14.7000, lng: 120.9842 }, // Valenzuela
        { lat: 14.6349, lng: 121.0569 }  // Close polygon
      ],
      supplyDemandRatio: 0.85,
      activeDrivers: 142,
      activeRequests: 89,
      averageETA: 4.2,
      surgeFactor: 1.1,
      color: 'yellow' as const
    },
    {
      id: 'east-metro', 
      name: 'East Metro',
      level: 'district' as const,
      coordinates: [
        { lat: 14.6760, lng: 121.0437 }, // Marikina
        { lat: 14.5176, lng: 121.0509 }, // Pasig
        { lat: 14.6021, lng: 121.0355 }, // San Juan
        { lat: 14.6349, lng: 121.0569 }  // QC East
      ],
      supplyDemandRatio: 0.92,
      activeDrivers: 98,
      activeRequests: 67,
      averageETA: 3.8,
      surgeFactor: 1.0,
      color: 'green' as const
    },
    {
      id: 'central-business',
      name: 'Central Business',
      level: 'district' as const,
      coordinates: [
        { lat: 14.5547, lng: 121.0244 }, // BGC
        { lat: 14.5260, lng: 121.0205 }, // Makati
        { lat: 14.5794, lng: 121.0359 }, // Mandaluyong
        { lat: 14.5547, lng: 121.0244 }  // Close polygon
      ],
      supplyDemandRatio: 0.78,
      activeDrivers: 203,
      activeRequests: 156,
      averageETA: 5.1,
      surgeFactor: 1.4,
      color: 'red' as const
    },
    {
      id: 'manila-core',
      name: 'Manila Core', 
      level: 'district' as const,
      coordinates: [
        { lat: 14.5995, lng: 120.9842 }, // Manila
        { lat: 14.5932, lng: 120.9829 }, // Binondo
        { lat: 14.5833, lng: 121.0000 }, // Ermita
        { lat: 14.5886, lng: 121.0194 }  // Malate
      ],
      supplyDemandRatio: 0.88,
      activeDrivers: 127,
      activeRequests: 94,
      averageETA: 4.5,
      surgeFactor: 1.2,
      color: 'yellow' as const
    },
    {
      id: 'south-metro',
      name: 'South Metro',
      level: 'district' as const,
      coordinates: [
        { lat: 14.5389, lng: 121.0168 }, // Pasay
        { lat: 14.4791, lng: 121.0145 }, // Parañaque  
        { lat: 14.4378, lng: 120.9761 }, // Las Piñas
        { lat: 14.5000, lng: 120.9500 }  // South boundary
      ],
      supplyDemandRatio: 0.89,
      activeDrivers: 156,
      activeRequests: 112,
      averageETA: 4.0,
      surgeFactor: 1.1,
      color: 'green' as const
    },
    {
      id: 'west-metro',
      name: 'West Metro',
      level: 'district' as const,
      coordinates: [
        { lat: 14.4208, lng: 121.0414 }, // Muntinlupa
        { lat: 14.4378, lng: 120.9761 }, // Alabang area
        { lat: 14.4000, lng: 121.0000 }, // South boundary
        { lat: 14.4208, lng: 121.0414 }  // Close polygon
      ],
      supplyDemandRatio: 0.91,
      activeDrivers: 87,
      activeRequests: 63,
      averageETA: 3.6,
      surgeFactor: 1.0,
      color: 'green' as const
    },
    {
      id: 'airport-zone',
      name: 'Airport Zone',
      level: 'district' as const,
      coordinates: [
        { lat: 14.5086, lng: 121.0198 }, // NAIA vicinity
        { lat: 14.5389, lng: 121.0168 }, // Pasay connection
        { lat: 14.4791, lng: 121.0145 }, // Parañaque
        { lat: 14.4500, lng: 121.0100 }  // Bay area
      ],
      supplyDemandRatio: 0.74,
      activeDrivers: 134,
      activeRequests: 108,
      averageETA: 5.8,
      surgeFactor: 1.6,
      color: 'red' as const
    },
    {
      id: 'rizal-border',
      name: 'Rizal Border',
      level: 'district' as const,
      coordinates: [
        { lat: 14.6000, lng: 121.0800 }, // C5 corridor
        { lat: 14.5800, lng: 121.1000 }, // Antipolo access
        { lat: 14.5176, lng: 121.0509 }, // Pasig border
        { lat: 14.6349, lng: 121.0569 }  // QC border
      ],
      supplyDemandRatio: 0.93,
      activeDrivers: 76,
      activeRequests: 54,
      averageETA: 3.4,
      surgeFactor: 0.9,
      color: 'green' as const
    }
  ]);

  // Generate filtered data based on active filters
  const getFilteredData = () => {
    const activeFilters = Object.keys(exceptionFilters).filter(
      key => exceptionFilters[key as keyof typeof exceptionFilters]
    );

    if (activeFilters.length === 0) {
      return {
        drivers: [],
        areas: [],
        incidents: [],
        showAll: true
      };
    }

    let filteredDrivers: any[] = [];
    let filteredAreas: any[] = [];
    let filteredIncidents: any[] = [];

    if (exceptionFilters.sosActive) {
      filteredDrivers.push(...mockDriverData.sosDrivers);
      filteredIncidents.push(...emergencyIncidents.filter(i => i.status === 'active'));
    }

    if (exceptionFilters.idleDrivers) {
      filteredDrivers.push(...mockDriverData.idleDrivers);
    }

    if (exceptionFilters.highCancellations) {
      filteredAreas.push(...mockDriverData.highCancellationAreas);
    }

    if (exceptionFilters.offlineAfterLogin) {
      filteredDrivers.push(...mockDriverData.offlineDrivers);
    }

    return {
      drivers: filteredDrivers,
      areas: filteredAreas,
      incidents: filteredIncidents,
      showAll: false
    };
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide sidebar on mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile]);

  // Real-time updates with AI integration
  useEffect(() => {
    setIsLoading(false);
    
    if (autoRefresh) {
      const interval = setInterval(async () => {
        setLastUpdate(new Date());
        
        try {
          // AI-powered KPI updates
          const aiPrediction = await modelServingInfrastructure.predict({
            id: `prediction_${Date.now()}`,
            features: {
              time_of_day: new Date().getHours(),
              day_of_week: new Date().getDay(),
              active_drivers: 156,
              weather_condition: 'clear',
              location: 'metro_manila'
            },
            model_id: 'demand_forecasting_v2'
          });

          // Update KPIs based on AI predictions
          setKpiTiles(prev => prev.map(tile => {
            if (tile.id === 'supply-demand') {
              return {
                ...tile,
                value: Math.round(aiPrediction.confidence * 100),
                status: aiPrediction.confidence > 0.8 ? 'optimal' : 
                       aiPrediction.confidence > 0.6 ? 'caution' : 'critical'
              };
            }
            return tile;
          }));

          // Update anomaly data with more dynamic changes
          const anomalies = await modelMonitoringSystem.getActiveAlerts();
          setAiAnomalies(prev => ({
            ...prev,
            highCancellationClusters: anomalies.length,
            idleDriversOver20Min: Math.floor(Math.random() * 15) + 5,
            offlineAfterLogin: Math.floor(Math.random() * 8) + 3,
            predictedHotspots: [
              'BGC Taguig', 
              'Makati CBD', 
              'Ortigas Center',
              ...(Math.random() > 0.7 ? ['Ayala Triangle', 'UP Diliman'] : [])
            ].slice(0, 3)
          }));

        } catch (error) {
          // AI update failed - continue with current data
        }
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Safety workflow handlers
  const handleEmergencyAction = useCallback((action: string, incidentId: string) => {
    const incident = emergencyIncidents.find(i => i.id === incidentId);
    if (!incident) return;

    const newNote = {
      timestamp: new Date(),
      message: `Action taken: ${action}`,
      author: 'Dispatcher'
    };

    setEmergencyIncidents(prev => prev.map(i => 
      i.id === incidentId 
        ? { ...i, notes: [...i.notes, newNote], status: action === 'acknowledge' ? 'responding' : i.status }
        : i
    ));

    if (action === 'acknowledge') {
      setSafetyStage('drawer');
      setSafetyDrawerOpen(true);
      setModalLocked(false);
      // Keep selectedIncident for safety drawer, but close the right drawer
      setRightDrawerView('closed');
    }
  }, [emergencyIncidents]);

  // KPI drill-down handler
  const handleKPIClick = useCallback((kpiId: string) => {
    setKpiDrillDown(kpiId === kpiDrillDown ? null : kpiId);
  }, [kpiDrillDown]);

  // Driver click handler (removed - back to original state)

  // Utility functions
  const getTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getKPIColor = (status: KPIStatus) => {
    switch (status) {
      case 'optimal': return 'border-green-200 bg-green-50/50 text-slate-800';
      case 'caution': return 'border-amber-200 bg-amber-50/50 text-slate-800';
      case 'critical': return 'border-red-200 bg-red-50/50 text-slate-800';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'stable': return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops Tower v3.0</h2>
          <p className="text-slate-600 font-medium mb-2">Initializing AI-powered dashboard...</p>
          <p className="text-slate-500 text-sm">Loading real-time data and predictive models</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
      {/* Dynamic Emergency Banner - Prototype loop */}
      {showEmergencyBanner && (
        <div className={`
          fixed top-0 left-0 right-0 z-50 
          bg-gradient-to-r from-[#EB1D25] to-red-600 text-white overflow-hidden
          transform transition-transform duration-1000 ease-out shadow-2xl
          ${emergencyAnimation === 'enter' ? 'translate-y-0' : 
            emergencyAnimation === 'exit' ? '-translate-y-full' : 'translate-y-0'}
        `}>
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent"></div>
          <div className="relative px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg tracking-wide">
                        {emergencyIncidents[0]?.priority === 'critical' ? 'CRITICAL EMERGENCY' : 
                         emergencyIncidents[0]?.priority === 'high' ? 'HIGH PRIORITY INCIDENT' : 
                         'SAFETY ALERT'}
                      </span>
                      <div className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-bold border border-white/30 animate-pulse">
                        ACTIVE
                      </div>
                    </div>
                    <div className="text-red-100 text-sm font-medium mt-0.5">
                      {emergencyIncidents[0]?.description} • {emergencyIncidents[0]?.location.address}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setSelectedIncident(emergencyIncidents[0]);
                    setModalLocked(true);
                    handleEmergencyAction('acknowledge', emergencyIncidents[0].id);
                  }}
                  className="bg-white text-[#EB1D25] hover:bg-red-50 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  RESPOND
                </button>
                <button 
                  onClick={() => {
                    setEmergencyAnimation('exit');
                    setTimeout(() => {
                      setShowEmergencyBanner(false);
                      setEmergencyAnimation('none');
                    }, 1000);
                  }}
                  className="text-red-100 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top KPI Bar */}
      <div className={`
        bg-white border-b border-slate-200 px-4 py-3 transition-all duration-300
        ${showEmergencyBanner ? 'mt-20' : 'mt-0'}
      `}>
        <div className="grid grid-cols-6 gap-3">
          {kpiTiles.map((tile) => (
            <div key={tile.id} className="relative">
              <div 
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-sm ${getKPIColor(tile.status)} ${
                  kpiDrillDown === tile.id ? 'ring-1 ring-[#0A4060] shadow-sm' : ''
                }`}
                onClick={() => handleKPIClick(tile.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-medium text-slate-600 uppercase tracking-wide">{tile.title}</h3>
                  {getTrendIcon(tile.trend)}
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-bold">{tile.value}{tile.unit}</span>
                </div>
              </div>

              {/* KPI Drill-down Dropdown */}
              {kpiDrillDown === tile.id && tile.drillDownData && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-4">
                  <div className="text-sm font-medium text-slate-900 mb-3">{tile.description}</div>
                  
                  {tile.id === 'supply-demand' && tile.drillDownData.zones && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Zone Breakdown</div>
                      {tile.drillDownData.zones.map((zone: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-sm text-slate-800">{zone.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{Math.round(zone.ratio * 100)}%</span>
                            <div className={`w-2 h-2 rounded-full ${
                              zone.status === 'optimal' ? 'bg-green-500' :
                              zone.status === 'caution' ? 'bg-amber-500' : 'bg-[#EB1D25]'
                            }`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tile.id === 'average-eta' && tile.drillDownData.breakdown && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Time Breakdown</div>
                      {tile.drillDownData.breakdown.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-sm text-slate-800">{item.timeOfDay}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{item.eta} min</span>
                            <div className={`w-2 h-2 rounded-full ${
                              item.status === 'optimal' ? 'bg-green-500' :
                              item.status === 'caution' ? 'bg-amber-500' : 'bg-[#EB1D25]'
                            }`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tile.id === 'cancellation-rate' && tile.drillDownData.reasons && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cancellation Reasons</div>
                      {tile.drillDownData.reasons.map((reason: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-sm text-slate-800">{reason.reason}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{reason.percentage}%</span>
                            {reason.trend === 'down' ? 
                              <TrendingDown className="w-3 h-3 text-green-600" /> :
                              reason.trend === 'up' ?
                              <TrendingUp className="w-3 h-3 text-red-600" /> :
                              <Minus className="w-3 h-3 text-gray-600" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tile.id === 'active-sos' && tile.drillDownData.incidents && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Active Incidents</div>
                      {tile.drillDownData.incidents.map((incident: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded border border-red-200">
                          <div>
                            <div className="text-sm font-medium text-red-900">{incident.type}</div>
                            <div className="text-xs text-red-700">{incident.location} • {incident.time}</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            incident.priority === 'critical' ? 'bg-[#EB1D25] text-white' :
                            incident.priority === 'high' ? 'bg-orange-600 text-white' :
                            'bg-amber-600 text-white'
                          }`}>
                            {incident.priority.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tile.id === 'completed-trips' && tile.drillDownData.breakdown && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Service Breakdown</div>
                      {tile.drillDownData.breakdown.map((service: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">{service.service}</div>
                            <div className="text-xs text-slate-600">{service.percentage}% of total trips</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{service.trips.toLocaleString()}</span>
                            {service.trend === 'up' ? 
                              <TrendingUp className="w-3 h-3 text-green-600" /> :
                              service.trend === 'down' ?
                              <TrendingDown className="w-3 h-3 text-red-600" /> :
                              <Minus className="w-3 h-3 text-gray-600" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tile.id === 'completion-rate' && tile.drillDownData.timeBreakdown && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Time Period Breakdown</div>
                      {tile.drillDownData.timeBreakdown.map((period: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <span className="text-sm text-slate-800">{period.period}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{period.rate}%</span>
                            <div className={`w-2 h-2 rounded-full ${
                              period.status === 'optimal' ? 'bg-green-500' :
                              period.status === 'caution' ? 'bg-amber-500' : 'bg-[#EB1D25]'
                            }`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Tabbed Interface */}
        <div className={`${isMobile ? 'hidden' : sidebarCollapsed ? 'w-16' : 'w-80'} 
          bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
          
          {!sidebarCollapsed ? (
            <>
              {/* Sidebar Header with Tabs */}
              <div className="p-3 bg-[#03233A] border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-white">Operations</h2>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="text-slate-300 hover:text-white p-1 hover:bg-[#0A4060] rounded-lg transition-all"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex space-x-0.5 bg-black/20 p-0.5 rounded-lg">
                  <button
                    onClick={() => setActiveSidebarTab('ops')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeSidebarTab === 'ops' 
                        ? 'bg-[#0A4060] text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Ops</span>
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('drivers')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeSidebarTab === 'drivers' 
                        ? 'bg-[#0A4060] text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Drivers</span>
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('ai')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeSidebarTab === 'ai' 
                        ? 'bg-[#0A4060] text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>AI</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {activeSidebarTab === 'ops' && (
                  <div className="p-3">
                    {/* Driver Status Overview */}
                    <div className="mb-3">
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        <Users className="w-2.5 h-2.5 text-slate-600" />
                        <h4 className="text-xs font-semibold text-slate-900">Driver Status</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-green-50 border border-green-200 rounded-md p-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-green-800">Available</span>
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="text-sm font-bold text-green-900">147</div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-blue-800">On Trip</span>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          </div>
                          <div className="text-sm font-bold text-blue-900">89</div>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-amber-800">Pickup</span>
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          </div>
                          <div className="text-sm font-bold text-amber-900">31</div>
                        </div>
                        
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-purple-800">Dropoff</span>
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          </div>
                          <div className="text-sm font-bold text-purple-900">27</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => setExceptionFilters(prev => ({ ...prev, sosActive: !prev.sosActive }))}
                        className={`w-full flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                          exceptionFilters.sosActive ? 'border-[#EB1D25] bg-red-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-[#EB1D25]" />
                          <span className="text-xs font-medium text-slate-900">SOS Active</span>
                        </div>
                        <span className="bg-[#EB1D25] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                          {emergencyIncidents.filter(i => i.status === 'active').length}
                        </span>
                      </button>

                      <button
                        onClick={() => setExceptionFilters(prev => ({ ...prev, idleDrivers: !prev.idleDrivers }))}
                        className={`w-full flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                          exceptionFilters.idleDrivers ? 'border-[#0A4060] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-2.5 h-2.5 text-[#0A4060]" />
                          <span className="text-xs font-medium text-slate-900">Idle &gt;20min</span>
                        </div>
                        <span className="bg-[#0A4060] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                          {aiAnomalies.idleDriversOver20Min}
                        </span>
                      </button>

                      <button
                        onClick={() => setExceptionFilters(prev => ({ ...prev, highCancellations: !prev.highCancellations }))}
                        className={`w-full flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                          exceptionFilters.highCancellations ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <X className="w-2.5 h-2.5 text-amber-600" />
                          <span className="text-xs font-medium text-slate-900">High Cancellations</span>
                        </div>
                        <span className="bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                          {aiAnomalies.highCancellationClusters}
                        </span>
                      </button>

                      <button
                        onClick={() => setExceptionFilters(prev => ({ ...prev, offlineAfterLogin: !prev.offlineAfterLogin }))}
                        className={`w-full flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                          exceptionFilters.offlineAfterLogin ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Radio className="w-2.5 h-2.5 text-slate-600" />
                          <span className="text-xs font-medium text-slate-900">Offline After Login</span>
                        </div>
                        <span className="bg-slate-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                          {aiAnomalies.offlineAfterLogin}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {activeSidebarTab === 'ai' && (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-3 h-3 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-900">AI Insights</h3>
                      </div>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    </div>

                    {/* Model Performance */}
                    <Card>
                      <CardContent className="p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700">Model Performance</span>
                          <span className="text-xs text-green-600 font-semibold">98.2% Accuracy</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Real-time Predictions */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-slate-700">Real-time Predictions</h4>
                      <div className="space-y-1.5">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <div className="flex items-center space-x-1.5">
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">Demand Surge</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-0.5">BGC area in 15 minutes</p>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                          <div className="flex items-center space-x-1.5">
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                            <span className="text-xs font-medium text-orange-800">Supply Gap</span>
                          </div>
                          <p className="text-xs text-orange-600 mt-0.5">Makati CBD - Deploy 3 more drivers</p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex items-center space-x-1.5">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-800">Optimized Routes</span>
                          </div>
                          <p className="text-xs text-green-600 mt-0.5">12% reduction in ETAs today</p>
                        </div>
                      </div>
                    </div>

                    {/* ML Model Status */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-slate-700">Model Status</h4>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Fraud Detection</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Demand Forecasting</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Route Optimization</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Actions */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-slate-700">Quick Actions</h4>
                      <div className="space-y-1">
                        <button className="w-full text-left p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all">
                          <div className="flex items-center space-x-1.5">
                            <RefreshCw className="w-3 h-3 text-slate-600" />
                            <span className="text-xs text-slate-700">Retrain Models</span>
                          </div>
                        </button>
                        <button className="w-full text-left p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all">
                          <div className="flex items-center space-x-1.5">
                            <Download className="w-3 h-3 text-slate-600" />
                            <span className="text-xs text-slate-700">Export Insights</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSidebarTab === 'drivers' && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-3 h-3 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-900">Online Drivers</h3>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                        {mockDriverData.onlineDrivers.filter(d => d.status === 'available').length} Available
                      </span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1.5" />
                      <input
                        type="text"
                        placeholder="Search drivers..."
                        value={driverSearchQuery}
                        onChange={(e) => setDriverSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0A4060] focus:border-[#0A4060] bg-white placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      {mockDriverData.onlineDrivers
                        .filter(driver => 
                          driverSearchQuery === '' || 
                          driver.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                          driver.vehicle.plate.toLowerCase().includes(driverSearchQuery.toLowerCase())
                        )
                        .slice(0, 12).map((driver) => (
                        <div 
                          key={driver.id} 
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2 hover:bg-slate-100 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${driver.status === 'available' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-slate-900 truncate block">{driver.name}</span>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <span className="text-xs text-slate-600">{driver.vehicle.plate}</span>
                                  <span className="text-xs text-slate-500">★{driver.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-xs text-slate-600">{driver.completedTrips}</div>
                              <div className="text-xs text-slate-500">
                                {Math.floor((Date.now() - driver.lastActivity.getTime()) / 60000)}m
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-center">
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        View All {mockDriverData.onlineDrivers.length} Drivers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full flex justify-center text-slate-400 hover:text-slate-600 p-3 hover:bg-slate-100 rounded-lg transition-all"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">
                    Live • {getTimeAgo(lastUpdate)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-600">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Metro Manila • {currentZoomLevel} level
                  </div>
                  
                  {/* Zoom level indicators */}
                  <div className="flex items-center space-x-2">
                    {['city', 'district', 'street'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setCurrentZoomLevel(level as any)}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                          currentZoomLevel === level
                            ? 'bg-[#0A4060] text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-sm'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4060] shadow-sm"
                >
                  <option value={5}>5s refresh</option>
                  <option value={30}>30s refresh</option>
                  <option value={60}>1m refresh</option>
                  <option value={0}>Manual</option>
                </select>
                
                <button
                  onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                >
                  {viewMode === 'detailed' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {viewMode === 'detailed' ? 'Detailed' : 'Compact'}
                  </span>
                </button>
                
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all font-medium ${
                    autoRefresh 
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg' 
                      : 'bg-[#0A4060] text-white hover:bg-[#03233A] shadow-lg'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Live</span>
                </button>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <LiveMap 
                className="absolute inset-0 w-full h-full" 
                showHeatmap={true}
                showDriverHubs={true}
                showZones={showZoneOverlay}
                showPOI={true}
                showTrips={true}
                activeStatusFilter={null}
                onStatusFilterChange={() => {}}
                // AI-Enhanced props
                aiDemandPrediction={kpiTiles.find(t => t.id === 'supply-demand')?.value as number / 100}
                aiAnomalyAreas={['BGC', 'Makati CBD']}
                aiPredictedHotspots={aiAnomalies.predictedHotspots}
                aiKPIs={kpiTiles}
                // Exception Filter Props
                filterData={getFilteredData()}
                activeExceptionFilters={exceptionFilters}
                emergencyIncidents={emergencyIncidents}
                // Zone System Props
                metroManilaZones={metroManilaZones}
                selectedZone={selectedZone}
                onZoneSelect={setSelectedZone}
                onZoneHover={setHoveredZone}
              />


              {/* Active Filter Indicator */}
              {Object.values(exceptionFilters).some(filter => filter) && (
                <div className="absolute top-6 left-6 bg-[#0A4060] text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Filters Active ({Object.values(exceptionFilters).filter(f => f).length})
                  </span>
                  <button
                    onClick={() => setExceptionFilters({
                      sosActive: false,
                      idleDrivers: false,
                      highCancellations: false,
                      offlineAfterLogin: false
                    })}
                    className="text-blue-200 hover:text-white ml-2"
                    title="Clear all filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Dynamic Heatmap Legend */}
              <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200 max-w-sm transition-all duration-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>
                    {Object.values(exceptionFilters).some(filter => filter) ? 'Filtered View' : 'Heatmap Legend'} - {currentZoomLevel.charAt(0).toUpperCase() + currentZoomLevel.slice(1)}
                  </span>
                  {hoveredZone && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                </h4>
                
                {/* Show active filter summary */}
                {Object.values(exceptionFilters).some(filter => filter) && (
                  <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="text-xs font-semibold text-blue-900 mb-2">Active Filters:</div>
                    <div className="space-y-1">
                      {exceptionFilters.sosActive && (
                        <div className="text-xs text-red-700">• SOS Active: {mockDriverData.sosDrivers.length} drivers</div>
                      )}
                      {exceptionFilters.idleDrivers && (
                        <div className="text-xs text-orange-700">• Idle &gt;20min: {mockDriverData.idleDrivers.length} drivers</div>
                      )}
                      {exceptionFilters.highCancellations && (
                        <div className="text-xs text-yellow-700">• High Cancellation Areas: {mockDriverData.highCancellationAreas.length} zones</div>
                      )}
                      {exceptionFilters.offlineAfterLogin && (
                        <div className="text-xs text-gray-700">• Offline After Login: {mockDriverData.offlineDrivers.length} drivers</div>
                      )}
                    </div>
                  </div>
                )}
                
                {hoveredZone ? (
                  // Dynamic zone details on hover
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-900">{hoveredZone}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-600">ETA</div>
                        <div className="font-bold text-green-700">4.2 min</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Supply Gap</div>
                        <div className="font-bold text-orange-700">22 drivers</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Active Trips</div>
                        <div className="font-bold text-blue-700">47</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Demand</div>
                        <div className="font-bold text-red-700">High +15%</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 border-t border-blue-200 pt-2">
                      Hover over zones for live details
                    </div>
                  </div>
                ) : (
                  // Static legend when not hovering
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-green-50 p-1 rounded transition-colors"
                         onMouseEnter={() => setHoveredZone('BGC Financial District')}>
                      <div className="w-4 h-4 bg-green-400 rounded flex-shrink-0"></div>
                      <span className="text-xs text-slate-700">Optimal (ETA &lt;5min)</span>
                    </div>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-yellow-50 p-1 rounded transition-colors"
                         onMouseEnter={() => setHoveredZone('Makati CBD')}>
                      <div className="w-4 h-4 bg-yellow-400 rounded flex-shrink-0"></div>
                      <span className="text-xs text-slate-700">Moderate (5-8min)</span>
                    </div>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-red-50 p-1 rounded transition-colors"
                         onMouseEnter={() => setHoveredZone('Ortigas Center')}>
                      <div className="w-4 h-4 bg-red-400 rounded flex-shrink-0"></div>
                      <span className="text-xs text-slate-700">High Demand (&gt;8min)</span>
                    </div>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
                         onMouseEnter={() => setHoveredZone('Quezon City')}>
                      <div className="w-4 h-4 bg-blue-400 rounded flex-shrink-0"></div>
                      <span className="text-xs text-slate-700">Low Activity</span>
                    </div>
                    <div 
                      className="text-xs text-slate-500 border-t border-slate-200 pt-2 cursor-pointer hover:text-slate-700"
                      onMouseLeave={() => setHoveredZone(null)}
                    >
                      Click zones for drill-down details
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        {/* Driver Details Panel */}
        <div className="w-0 bg-white border-l border-slate-200 flex-col transition-all duration-300 overflow-hidden flex-shrink-0" style={{ display: 'none' }}>
          {false && (
            <>
              {/* Panel Header */}
              <div className="p-4 border-b border-slate-200 bg-[#03233A]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">Driver Details</h2>
                  <button
                    onClick={() => {
                      setDriverPanelOpen(false);
                      setSelectedDriver(null);
                    }}
                    className="text-slate-300 hover:text-white p-1 hover:bg-[#0A4060] rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedDriver.status === 'available' ? 'bg-green-500' : 
                    selectedDriver.status === 'on_trip' ? 'bg-blue-500' : 
                    selectedDriver.status === 'pickup' ? 'bg-amber-500' : 
                    'bg-purple-500'
                  }`}></div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedDriver.name}</h3>
                    <p className="text-sm text-slate-300">{selectedDriver.vehicle.plate} • ★{selectedDriver.rating.toFixed(1)}</p>
                  </div>
                </div>
              </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Current Status */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Current Status</h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Status</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                      selectedDriver.status === 'available' ? 'bg-green-100 text-green-800' :
                      selectedDriver.status === 'on_trip' ? 'bg-blue-100 text-blue-800' :
                      selectedDriver.status === 'pickup' ? 'bg-amber-100 text-amber-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedDriver.status === 'available' ? 'Available' :
                       selectedDriver.status === 'on_trip' ? 'On Trip' :
                       selectedDriver.status === 'pickup' ? 'Pickup' : 'Dropoff'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Last Activity</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - selectedDriver.lastActivity.getTime()) / 60000)}m ago
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Vehicle Type</span>
                    <span className="text-sm font-medium">{selectedDriver.vehicle.type}</span>
                  </div>
                </div>
              </div>

              {/* Current Location */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Current Location</h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedDriver.location?.address || 'Location not available'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedDriver.location ? 
                          `${selectedDriver.location.lat.toFixed(6)}, ${selectedDriver.location.lng.toFixed(6)}` : 
                          'Coordinates not available'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Stats (Since 00:00) */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Today's Performance</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-green-800">Completed Trips</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-lg font-bold text-green-900">{selectedDriver.completedTrips}</div>
                    <div className="text-xs text-green-600">+{Math.floor(selectedDriver.completedTrips * 0.15)} from yesterday</div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-800">Online Hours</span>
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-blue-900">
                      {Math.floor(Math.random() * 8) + 4}h {Math.floor(Math.random() * 60)}m
                    </div>
                    <div className="text-xs text-blue-600">Since 06:30 AM</div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-amber-800">Earnings</span>
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-lg font-bold text-amber-900">
                      ₱{(selectedDriver.completedTrips * (Math.random() * 200 + 150)).toFixed(0)}
                    </div>
                    <div className="text-xs text-amber-600">₱{Math.floor(Math.random() * 50 + 150)}/trip avg</div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-800">Rating</span>
                      <Activity className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">★{selectedDriver.rating.toFixed(2)}</div>
                    <div className="text-xs text-slate-600">
                      {Math.floor(Math.random() * 50) + 100} reviews today
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full bg-[#0A4060] text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#083B5A] transition-colors flex items-center justify-center space-x-2">
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Driver</span>
                  </button>
                  <button className="w-full bg-slate-100 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Track Location</span>
                  </button>
                  <button className="w-full bg-slate-100 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>View Full Profile</span>
                  </button>
                </div>
              </div>
            </div>
            </>
          )}
          </div>

        </div>

        {/* Emergency Modal Lock */}
      {modalLocked && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-200 bg-gradient-to-r from-red-50 to-[#EB1D25]/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-red-900 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-3" />
                  EMERGENCY RESPONSE
                </h2>
                <div className={`px-3 py-1 rounded-full text-sm font-bold shadow-lg ${
                  selectedIncident.priority === 'critical' ? 'bg-[#EB1D25] text-white' :
                  selectedIncident.priority === 'high' ? 'bg-orange-600 text-white' :
                  'bg-amber-600 text-white'
                }`}>
                  {selectedIncident.priority.toUpperCase()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="text-sm font-semibold text-red-900">Driver</label>
                  <p className="text-lg font-bold text-red-800">{selectedIncident.driverName}</p>
                  <p className="text-sm text-red-700">{selectedIncident.driverPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-red-900">Location</label>
                  <p className="text-sm text-red-800">{selectedIncident.location.address}</p>
                  <p className="text-xs text-red-600">
                    {selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-semibold text-red-900">Description</label>
                <p className="text-red-800">{selectedIncident.description}</p>
              </div>

              {selectedIncident.responseTeam && (
                <div className="mb-4">
                  <label className="text-sm font-semibold text-red-900">Response Team</label>
                  <p className="text-red-800">{selectedIncident.responseTeam}</p>
                  {selectedIncident.eta && (
                    <p className="text-sm text-red-700">ETA: {selectedIncident.eta} minutes</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline</h3>
              <div className="space-y-3 mb-6">
                {selectedIncident.notes.map((note, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{note.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {getTimeAgo(note.timestamp)} • {note.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleEmergencyAction('acknowledge', selectedIncident.id)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>✅ Acknowledge</span>
                </button>
                <button
                  onClick={() => handleEmergencyAction('call', selectedIncident.id)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#0A4060] text-white rounded-xl hover:bg-[#03233A] transition-colors font-semibold shadow-lg hover:shadow-xl"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>📞 Call</span>
                </button>
                <button
                  onClick={() => handleEmergencyAction('dispatch', selectedIncident.id)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
                >
                  <Truck className="w-5 h-5" />
                  <span>🚑 Dispatch ERT</span>
                </button>
                <button
                  onClick={() => handleEmergencyAction('escalate', selectedIncident.id)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#EB1D25] text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
                >
                  <AlertOctagon className="w-5 h-5" />
                  <span>🚓 Escalate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Drawer */}
      {safetyDrawerOpen && selectedIncident && (
        <div className="fixed bottom-0 right-0 w-96 h-80 bg-white border-t-2 border-l-2 border-slate-200 shadow-2xl z-40 rounded-tl-2xl">
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-[#03233A] to-[#0A4060] rounded-tl-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Incident Tracker</h3>
              <button 
                onClick={() => setSafetyDrawerOpen(false)}
                className="text-slate-300 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4 h-64 overflow-y-auto">
            <div className="mb-3">
              <h4 className="font-semibold text-slate-900">{selectedIncident.driverName}</h4>
              <p className="text-sm text-slate-600">{selectedIncident.description}</p>
            </div>
            <div className="space-y-2">
              {selectedIncident.notes.slice(-3).map((note, index) => (
                <div key={index} className="text-sm p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-slate-800">{note.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {getTimeAgo(note.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OpsTowardDashboard;