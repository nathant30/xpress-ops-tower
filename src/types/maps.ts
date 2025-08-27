// Google Maps Integration Types for Real-time Driver Tracking
// Supporting 10,000+ concurrent drivers with optimal performance

export interface MapConfig {
  apiKey: string;
  center: google.maps.LatLngLiteral;
  zoom: number;
  mapTypeId: google.maps.MapTypeId;
  region?: string; // For optimizing for region-specific features
}

export interface MapBounds {
  northEast: google.maps.LatLngLiteral;
  southWest: google.maps.LatLngLiteral;
}

// =====================================================
// DRIVER MARKERS AND CLUSTERING
// =====================================================

export interface DriverMarker {
  driverId: string;
  position: google.maps.LatLngLiteral;
  status: 'active' | 'busy' | 'offline' | 'break' | 'maintenance' | 'suspended' | 'emergency';
  isAvailable: boolean;
  services: string[];
  rating: number;
  bearing?: number; // For directional arrow
  speed?: number;
  lastUpdate: Date;
  address?: string;
}

export interface MarkerClusterOptions {
  gridSize: number;
  maxZoom: number;
  minimumClusterSize: number;
  averageCenter: boolean;
  styles: ClusterStyle[];
}

export interface ClusterStyle {
  url: string;
  width: number;
  height: number;
  textColor: string;
  textSize: number;
  anchorText: [number, number];
  anchorIcon: [number, number];
}

// =====================================================
// HEAT MAPS FOR DEMAND DENSITY
// =====================================================

export interface HeatmapData {
  location: google.maps.LatLng;
  weight: number;
}

export interface HeatmapOptions {
  dissipating: boolean;
  gradient: string[];
  maxIntensity: number;
  radius: number;
  opacity: number;
}

export interface DemandHeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number; // 0-100 scale
  demandType: 'booking_requests' | 'driver_concentration' | 'waiting_time' | 'surge_pricing';
  regionId: string;
  timestamp: Date;
}

// =====================================================
// GEOFENCE MANAGEMENT
// =====================================================

export interface Geofence {
  id: string;
  name: string;
  type: 'service_area' | 'restricted_zone' | 'pickup_zone' | 'surge_area' | 'emergency_zone';
  regionId: string;
  boundary: google.maps.LatLngLiteral[];
  isActive: boolean;
  restrictions?: GeofenceRestrictions;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeofenceRestrictions {
  allowedServices?: string[];
  operatingHours?: {
    start: string;
    end: string;
  };
  maxDrivers?: number;
  speedLimit?: number;
  specialRequirements?: string[];
}

export interface GeofenceEvent {
  eventId: string;
  geofenceId: string;
  driverId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: google.maps.LatLngLiteral;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// =====================================================
// TRAFFIC AND ROUTING
// =====================================================

export interface TrafficLayer {
  isVisible: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export interface RouteRequest {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  waypoints?: google.maps.DirectionsWaypoint[];
  travelMode: google.maps.TravelMode;
  optimizeWaypoints?: boolean;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
}

export interface RouteResponse {
  routes: google.maps.DirectionsRoute[];
  geocoded_waypoints: google.maps.DirectionsGeocodedWaypoint[];
  status: google.maps.DirectionsStatus;
}

export interface ETACalculation {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  estimatedDuration: number; // seconds
  estimatedDurationInTraffic: number; // seconds with current traffic
  distance: number; // meters
  route: google.maps.DirectionsRoute;
  calculatedAt: Date;
}

// =====================================================
// REAL-TIME MAP EVENTS
// =====================================================

export interface MapEvent {
  type: 'bounds_changed' | 'zoom_changed' | 'center_changed' | 'click' | 'rightclick' | 'dragend';
  bounds?: google.maps.LatLngBounds;
  zoom?: number;
  center?: google.maps.LatLng;
  position?: google.maps.LatLng;
  timestamp: Date;
}

export interface DriverLocationEvent {
  eventType: 'location_update' | 'status_change' | 'emergency_alert';
  driverId: string;
  driverName: string;
  location: google.maps.LatLngLiteral;
  previousLocation?: google.maps.LatLngLiteral;
  status: string;
  previousStatus?: string;
  regionId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// =====================================================
// MAP CONTROL INTERFACES
// =====================================================

export interface MapControls {
  showTraffic: boolean;
  showHeatmap: boolean;
  showGeofences: boolean;
  showClusters: boolean;
  filterByStatus: string[];
  filterByService: string[];
  filterByRegion?: string;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export interface MapFilters {
  status: string[];
  services: string[];
  regions: string[];
  lastUpdateMinutes: number;
  showEmergency: boolean;
  showOffline: boolean;
}

export interface MapViewState {
  center: google.maps.LatLngLiteral;
  zoom: number;
  bounds: MapBounds;
  mapType: google.maps.MapTypeId;
  controls: MapControls;
  filters: MapFilters;
  selectedDrivers: string[];
  highlightedRegions: string[];
}

// =====================================================
// PERFORMANCE OPTIMIZATION
// =====================================================

export interface MarkerPoolConfig {
  initialSize: number;
  maxSize: number;
  reuseThreshold: number; // Reuse markers that haven't moved this many pixels
}

export interface DataBatchingConfig {
  batchSize: number;
  batchInterval: number; // milliseconds
  maxBatchDelay: number; // milliseconds
}

export interface ViewportOptimization {
  enableClustering: boolean;
  clusterThreshold: number; // Number of markers before clustering kicks in
  enableViewportFiltering: boolean;
  viewportPadding: number; // Padding around viewport for pre-loading markers
  enableLevelOfDetail: boolean; // Show fewer details at higher zoom levels
}

// =====================================================
// EMERGENCY AND INCIDENTS
// =====================================================

export interface EmergencyMarker {
  incidentId: string;
  driverId?: string;
  location: google.maps.LatLngLiteral;
  priority: 'critical' | 'high' | 'medium' | 'low';
  incidentType: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  responseTimeSeconds?: number;
  pulsing?: boolean; // For visual attention
}

export interface IncidentHeatmapData {
  location: google.maps.LatLng;
  severity: number; // 0-100, based on incident priority and frequency
  incidentCount: number;
  averageResponseTime: number;
}

// =====================================================
// ANALYTICS AND INSIGHTS
// =====================================================

export interface MapAnalytics {
  visibleDrivers: number;
  activeDrivers: number;
  emergencyIncidents: number;
  averageResponseTime: number;
  demandHotspots: DemandHotspot[];
  trafficIncidents: TrafficIncident[];
  geofenceViolations: number;
}

export interface DemandHotspot {
  center: google.maps.LatLngLiteral;
  radius: number; // meters
  demandIntensity: number; // 0-100 scale
  waitingBookings: number;
  averageWaitTime: number; // minutes
  suggestedDrivers: number;
}

export interface TrafficIncident {
  location: google.maps.LatLngLiteral;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  estimatedDelay: number; // minutes
  affectedRoutes: string[];
  reportedAt: Date;
}

// =====================================================
// WEBSOCKET INTEGRATION
// =====================================================

export interface MapWebSocketEvents {
  'driver_location_update': DriverLocationEvent;
  'driver_status_change': DriverLocationEvent;
  'emergency_alert': EmergencyMarker;
  'geofence_event': GeofenceEvent;
  'demand_update': DemandHeatmapPoint[];
  'traffic_update': TrafficIncident[];
  'analytics_update': MapAnalytics;
}

export interface MapWebSocketConfig {
  url: string;
  autoReconnect: boolean;
  reconnectInterval: number; // milliseconds
  maxReconnectAttempts: number;
  subscriptions: (keyof MapWebSocketEvents)[];
}

// =====================================================
// ERROR HANDLING
// =====================================================

export interface MapError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

export interface MapErrorHandler {
  onGeolocationError: (error: GeolocationPositionError) => void;
  onMapLoadError: (error: MapError) => void;
  onWebSocketError: (error: MapError) => void;
  onAPIError: (error: MapError) => void;
}