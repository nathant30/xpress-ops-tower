'use client';

import React, { useMemo } from 'react';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import LiveMap from '@/components/LiveMap';

// Extracted Components
import KPIDashboard from '@/components/dashboard/KPIDashboard';
import ExceptionFilters from '@/components/dashboard/ExceptionFilters';
import EmergencyBanner from '@/components/dashboard/EmergencyBanner';
import AIPredictionsPanel from '@/components/dashboard/AIPredictionsPanel';
import SafetyConsole from '@/components/dashboard/SafetyConsole';
import SidebarHeader from '@/components/dashboard/SidebarHeader';
import TopNavigation from '@/components/dashboard/TopNavigation';
import HeatmapLegend from '@/components/dashboard/HeatmapLegend';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Custom Hooks
import { useDashboardState } from '@/hooks/useDashboardState';
import { useEmergencyIncidents } from '@/hooks/useEmergencyIncidents';
import { useKPIDashboard } from '@/hooks/useKPIDashboard';

// AI Integration
import { modelServingInfrastructure } from '@/lib/ai/modelServing/servingInfrastructure';
import { modelMonitoringSystem } from '@/lib/ai/monitoring/modelMonitoring';

const OpsTowardDashboard = () => {
  const { selectedServiceType } = useServiceType();
  
  // Custom hooks for state management
  const dashboardState = useDashboardState();
  const emergencyData = useEmergencyIncidents(dashboardState.userRole);
  const kpiData = useKPIDashboard();

  // Memoized map props to prevent unnecessary re-renders
  const mapProps = useMemo(() => ({
    className: "absolute inset-0 w-full h-full",
    showHeatmap: true,
    showDriverHubs: true,
    showZones: dashboardState.userRole === 'ops_manager',
    showPOI: true,
    showTrips: true,
    activeStatusFilter: null,
    onStatusFilterChange: () => {},
    // AI-Enhanced props
    aiDemandPrediction: (kpiData.kpiTiles.find(t => t.id === 'supply-demand')?.value as number) / 100,
    aiAnomalyAreas: ['BGC', 'Makati CBD'],
    aiPredictedHotspots: kpiData.aiAnomalies.predictedHotspots,
    aiKPIs: kpiData.kpiTiles,
    heatmapZones: dashboardState.heatmapZones,
    currentZoomLevel: dashboardState.currentZoomLevel,
    onZoneHover: () => {},
    selectedServiceType: selectedServiceType
  }), [
    dashboardState.userRole,
    dashboardState.heatmapZones,
    dashboardState.currentZoomLevel,
    kpiData.kpiTiles,
    kpiData.aiAnomalies.predictedHotspots,
    selectedServiceType
  ]);

  const emergencyBannerProps = useMemo(() => ({
    emergencyIncidents: emergencyData.emergencyIncidents,
    onRespond: emergencyData.handleIncidentSelect,
    onClose: () => {}
  }), [emergencyData.emergencyIncidents, emergencyData.handleIncidentSelect]);

  if (dashboardState.isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Ops Tower...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 flex overflow-hidden">
      {/* Emergency Banner */}
      <EmergencyBanner {...emergencyBannerProps} />

      {/* AI Predictions Panel */}
      <AIPredictionsPanel 
        aiAnomalies={kpiData.aiAnomalies}
        lastUpdate={dashboardState.lastUpdate}
        refreshInterval={dashboardState.refreshInterval}
        autoRefresh={dashboardState.autoRefresh}
      />

      {/* Main Sidebar */}
      <div className={`${
        dashboardState.isMobile ? 'hidden' : dashboardState.sidebarCollapsed ? 'w-16' : 'w-96'
      } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
        emergencyData.criticalIncidents.length > 0 ? 'mt-16' : ''
      }`}>
        
        {/* Sidebar Header */}
        <SidebarHeader
          userRole={dashboardState.userRole}
          sidebarCollapsed={dashboardState.sidebarCollapsed}
          autoRefresh={dashboardState.autoRefresh}
          lastUpdate={dashboardState.lastUpdate}
          onUserRoleChange={dashboardState.handleUserRoleChange}
          onSidebarToggle={dashboardState.handleSidebarToggle}
        />

        {!dashboardState.sidebarCollapsed && (
          <>
            {/* KPI Dashboard */}
            <KPIDashboard
              tiles={kpiData.kpiTiles}
              drillDown={kpiData.kpiDrillDown}
              onKPIClick={kpiData.handleKPIClick}
            />

            {/* Exception Filters */}
            <ExceptionFilters
              userRole={dashboardState.userRole}
              filters={dashboardState.exceptionFilters}
              aiAnomalies={kpiData.aiAnomalies}
              emergencyIncidents={emergencyData.emergencyIncidents}
              onFilterChange={dashboardState.handleFilterChange}
            />

            {/* Safety Console - Only for Ops Manager */}
            {dashboardState.userRole === 'ops_manager' && (
              <SafetyConsole
                emergencyIncidents={emergencyData.emergencyIncidents}
                selectedIncident={emergencyData.selectedIncident}
                safetyStage={emergencyData.safetyStage}
                modalLocked={emergencyData.modalLocked}
                safetyDrawerOpen={emergencyData.safetyDrawerOpen}
                onIncidentSelect={emergencyData.handleIncidentSelect}
                onModalLock={emergencyData.handleModalLock}
                onModalUnlock={emergencyData.handleModalUnlock}
                onDrawerToggle={emergencyData.handleDrawerToggle}
                onIncidentResolve={emergencyData.handleIncidentResolve}
                onAddNote={emergencyData.handleAddNote}
              />
            )}
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navigation */}
        <TopNavigation
          viewMode={dashboardState.viewMode}
          currentZoomLevel={dashboardState.currentZoomLevel}
          autoRefresh={dashboardState.autoRefresh}
          refreshInterval={dashboardState.refreshInterval}
          showHeatmap={dashboardState.showHeatmap}
          showDrivers={dashboardState.showDrivers}
          onViewModeChange={dashboardState.handleViewModeChange}
          onZoomChange={dashboardState.handleZoomChange}
          onAutoRefreshToggle={dashboardState.handleAutoRefreshToggle}
          onRefreshIntervalChange={dashboardState.handleRefreshIntervalChange}
          onHeatmapToggle={dashboardState.handleHeatmapToggle}
          onDriverToggle={dashboardState.handleDriverToggle}
          onManualRefresh={dashboardState.handleManualRefresh}
        />

        {/* Main Map Container */}
        <div className="flex-1 relative overflow-hidden">
          <LiveMap {...mapProps} />
          
          {/* Heatmap Legend */}
          <HeatmapLegend
            heatmapZones={dashboardState.heatmapZones}
            currentZoomLevel={dashboardState.currentZoomLevel}
            showLegend={dashboardState.showHeatmap}
            onZoneClick={(zoneId) => {
              // Handle zone click for drill-down - could trigger analytics or navigation
            }}
          />
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default OpsTowardDashboard;