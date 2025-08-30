import { useState, useEffect, useCallback } from 'react';
import type { UserRole, ViewMode, ExceptionFilters, HeatmapZone } from '@/types/dashboard';

export const useDashboardState = () => {
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('dispatcher');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [currentZoomLevel, setCurrentZoomLevel] = useState<'city' | 'district' | 'street'>('city');
  
  // Real-time updates
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Layer visibility
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showDrivers, setShowDrivers] = useState(true);

  // Exception Filters
  const [exceptionFilters, setExceptionFilters] = useState<ExceptionFilters>({
    sosActive: false,
    idleDrivers: false,
    highCancellations: false,
    offlineAfterLogin: false,
    laborAttendance: false,
    ltfrbCompliance: false,
    cancellationClusters: false
  });

  // Mock heatmap zones data
  const [heatmapZones] = useState<HeatmapZone[]>([
    {
      id: 'bgc-taguig',
      name: 'BGC Taguig',
      level: 'district',
      coordinates: [
        { lat: 14.5507, lng: 121.0494 },
        { lat: 14.5587, lng: 121.0544 },
        { lat: 14.5507, lng: 121.0594 }
      ],
      supplyDemandRatio: 0.75,
      activeDrivers: 45,
      activeRequests: 60,
      averageETA: 5.2,
      surgeFactor: 1.4,
      color: 'red'
    },
    {
      id: 'makati-cbd',
      name: 'Makati CBD',
      level: 'district',
      coordinates: [
        { lat: 14.5547, lng: 121.0244 },
        { lat: 14.5627, lng: 121.0294 },
        { lat: 14.5547, lng: 121.0344 }
      ],
      supplyDemandRatio: 0.92,
      activeDrivers: 78,
      activeRequests: 85,
      averageETA: 3.8,
      surgeFactor: 1.0,
      color: 'green'
    },
    {
      id: 'ortigas-center',
      name: 'Ortigas Center',
      level: 'district',
      coordinates: [
        { lat: 14.5864, lng: 121.0567 },
        { lat: 14.5944, lng: 121.0617 },
        { lat: 14.5864, lng: 121.0667 }
      ],
      supplyDemandRatio: 0.68,
      activeDrivers: 32,
      activeRequests: 47,
      averageETA: 6.1,
      surgeFactor: 1.2,
      color: 'yellow'
    }
  ]);

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

  // Real-time updates
  useEffect(() => {
    setIsLoading(false);
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Utility functions
  const getTimeAgo = useCallback((date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, []);

  const handleManualRefresh = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh(!autoRefresh);
  }, [autoRefresh]);

  const handleRefreshIntervalChange = useCallback((interval: number) => {
    setRefreshInterval(interval);
    if (interval === 0) {
      setAutoRefresh(false);
    } else if (!autoRefresh) {
      setAutoRefresh(true);
    }
  }, [autoRefresh]);

  const handleUserRoleChange = useCallback((role: UserRole) => {
    setUserRole(role);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleZoomChange = useCallback((level: 'city' | 'district' | 'street') => {
    setCurrentZoomLevel(level);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleHeatmapToggle = useCallback(() => {
    setShowHeatmap(!showHeatmap);
  }, [showHeatmap]);

  const handleDriverToggle = useCallback(() => {
    setShowDrivers(!showDrivers);
  }, [showDrivers]);

  const handleFilterChange = useCallback((filters: ExceptionFilters) => {
    setExceptionFilters(filters);
  }, []);

  return {
    // State
    isLoading,
    userRole,
    viewMode,
    currentZoomLevel,
    autoRefresh,
    refreshInterval,
    lastUpdate,
    sidebarCollapsed,
    isMobile,
    showHeatmap,
    showDrivers,
    exceptionFilters,
    heatmapZones,
    
    // Handlers
    getTimeAgo,
    handleManualRefresh,
    handleAutoRefreshToggle,
    handleRefreshIntervalChange,
    handleUserRoleChange,
    handleViewModeChange,
    handleZoomChange,
    handleSidebarToggle,
    handleHeatmapToggle,
    handleDriverToggle,
    handleFilterChange
  };
};