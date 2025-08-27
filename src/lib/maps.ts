// Google Maps Utility Library for Real-time Driver Tracking
// High-performance map management for 10,000+ concurrent drivers

import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import SuperCluster from 'supercluster';

import { 
  MapConfig, 
  DriverMarker, 
  HeatmapData, 
  Geofence, 
  EmergencyMarker,
  MapError,
  MapViewState,
  MarkerPoolConfig,
  ViewportOptimization 
} from '@/types/maps';

// =====================================================
// GOOGLE MAPS LOADER AND INITIALIZATION
// =====================================================

class GoogleMapsManager {
  private static instance: GoogleMapsManager;
  private loader: Loader;
  private map: google.maps.Map | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: MapConfig) {
    this.loader = new Loader({
      apiKey: config.apiKey,
      version: "weekly",
      libraries: ["geometry", "visualization", "places", "drawing"]
    });
  }

  static getInstance(config?: MapConfig): GoogleMapsManager {
    if (!GoogleMapsManager.instance && config) {
      GoogleMapsManager.instance = new GoogleMapsManager(config);
    }
    return GoogleMapsManager.instance;
  }

  async initialize(element: HTMLElement, config: MapConfig): Promise<google.maps.Map> {
    if (this.initPromise) {
      await this.initPromise;
      return this.map!;
    }

    this.initPromise = this.loader.load().then(() => {
      if (!this.map) {
        this.map = new google.maps.Map(element, {
          center: config.center,
          zoom: config.zoom,
          mapTypeId: config.mapTypeId,
          styles: this.getMapStyles(),
          restriction: config.region ? { latLngBounds: this.getRegionBounds(config.region) } : undefined,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          scaleControl: true,
          rotateControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false
        });
        this.isInitialized = true;
      }
    });

    await this.initPromise;
    return this.map!;
  }

  getMap(): google.maps.Map | null {
    return this.map;
  }

  isMapInitialized(): boolean {
    return this.isInitialized;
  }

  private getMapStyles(): google.maps.MapTypeStyle[] {
    // Custom map styling optimized for fleet operations
    return [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "road",
        elementType: "labels.text",
        stylers: [{ 
          color: "#666666",
          weight: 0.8 
        }]
      }
    ];
  }

  private getRegionBounds(region: string): google.maps.LatLngBounds {
    // Define bounds for different regions (Philippines focus)
    const regionBounds: Record<string, google.maps.LatLngBoundsLiteral> = {
      'metro_manila': {
        north: 14.7644,
        south: 14.4074,
        east: 121.1744,
        west: 120.9094
      },
      'cebu': {
        north: 10.4570,
        south: 10.1870,
        east: 123.9470,
        west: 123.8270
      },
      'davao': {
        north: 7.2070,
        south: 7.0070,
        east: 125.6570,
        west: 125.4570
      }
    };

    const bounds = regionBounds[region] || regionBounds['metro_manila'];
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(bounds.south, bounds.west),
      new google.maps.LatLng(bounds.north, bounds.east)
    );
  }
}

// =====================================================
// DRIVER MARKER MANAGEMENT WITH OBJECT POOLING
// =====================================================

class DriverMarkerManager {
  private markers: Map<string, google.maps.Marker> = new Map();
  private markerPool: google.maps.Marker[] = [];
  private clusterer: MarkerClusterer | null = null;
  private map: google.maps.Map;
  private poolConfig: MarkerPoolConfig;

  constructor(map: google.maps.Map, poolConfig?: MarkerPoolConfig) {
    this.map = map;
    this.poolConfig = {
      initialSize: 100,
      maxSize: 1000,
      reuseThreshold: 50,
      ...poolConfig
    };
    
    this.initializeMarkerPool();
    this.initializeClusterer();
  }

  private initializeMarkerPool(): void {
    // Pre-create markers for performance
    for (let i = 0; i < this.poolConfig.initialSize; i++) {
      this.markerPool.push(new google.maps.Marker({
        map: null,
        visible: false
      }));
    }
  }

  private initializeClusterer(): void {
    this.clusterer = new MarkerClusterer({
      map: this.map,
      markers: [],
      algorithm: new SuperCluster({
        radius: 60,
        maxZoom: 15,
        minPoints: 3
      }),
      renderer: {
        render: ({ count, position }) => {
          const color = count > 100 ? "#ff0000" : count > 50 ? "#ff8800" : "#00aa00";
          
          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml,${encodeURIComponent(`
                <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
                  <text x="20" y="25" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${count}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            },
            zIndex: 1000
          });
        }
      }
    });
  }

  private getMarkerFromPool(): google.maps.Marker {
    if (this.markerPool.length > 0) {
      return this.markerPool.pop()!;
    }
    
    if (this.markers.size < this.poolConfig.maxSize) {
      return new google.maps.Marker();
    }
    
    // Find least recently used marker to reuse
    const oldestMarkerId = Array.from(this.markers.keys())[0];
    const oldestMarker = this.markers.get(oldestMarkerId)!;
    this.markers.delete(oldestMarkerId);
    return oldestMarker;
  }

  private returnMarkerToPool(marker: google.maps.Marker): void {
    marker.setMap(null);
    marker.setVisible(false);
    
    if (this.markerPool.length < this.poolConfig.maxSize) {
      this.markerPool.push(marker);
    }
  }

  updateDriverMarkers(drivers: DriverMarker[]): void {
    const activeDriverIds = new Set(drivers.map(d => d.driverId));
    
    // Remove markers for drivers no longer visible
    for (const [driverId, marker] of this.markers) {
      if (!activeDriverIds.has(driverId)) {
        this.clusterer?.removeMarker(marker);
        this.returnMarkerToPool(marker);
        this.markers.delete(driverId);
      }
    }

    // Update or create markers for active drivers
    drivers.forEach(driver => {
      this.updateDriverMarker(driver);
    });
  }

  private updateDriverMarker(driver: DriverMarker): void {
    let marker = this.markers.get(driver.driverId);
    
    if (!marker) {
      marker = this.getMarkerFromPool();
      this.markers.set(driver.driverId, marker);
      this.clusterer?.addMarker(marker);
    }

    // Update marker properties
    marker.setPosition(driver.position);
    marker.setIcon(this.getDriverIcon(driver));
    marker.setMap(this.map);
    marker.setVisible(true);
    marker.setTitle(`${driver.driverId} - ${driver.status} - ${driver.rating.toFixed(1)}★`);
    
    // Add click listener for driver details
    marker.addListener('click', () => {
      this.showDriverInfo(driver);
    });
  }

  private getDriverIcon(driver: DriverMarker): google.maps.Icon {
    const statusColors = {
      active: '#00aa00',
      busy: '#ff8800',
      offline: '#888888',
      break: '#0088ff',
      maintenance: '#purple',
      suspended: '#ff0000',
      emergency: '#ff0000'
    };

    const serviceIcons = {
      ride_4w: '🚗',
      ride_2w: '🏍️',
      delivery: '📦'
    };

    const color = statusColors[driver.status];
    const icon = serviceIcons[driver.services[0] as keyof typeof serviceIcons] || '🚗';
    
    // Create SVG icon with rotation for bearing
    const rotation = driver.bearing || 0;
    
    return {
      url: `data:image/svg+xml,${encodeURIComponent(`
        <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(${rotation} 16 16)">
            <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" font-size="16">${icon}</text>
            ${driver.bearing ? `<polygon points="16,4 20,12 12,12" fill="white"/>` : ''}
          </g>
          ${driver.status === 'emergency' ? `<circle cx="16" cy="16" r="16" fill="none" stroke="#ff0000" stroke-width="3" opacity="0.5">
            <animate attributeName="r" values="16;20;16" dur="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite"/>
          </circle>` : ''}
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16)
    };
  }

  private showDriverInfo(driver: DriverMarker): void {
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-3 min-w-[200px]">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-lg">Driver ${driver.driverId}</h3>
            <span class="px-2 py-1 text-xs rounded-full ${this.getStatusBadgeClasses(driver.status)}">${driver.status}</span>
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Rating:</span>
              <span>${driver.rating.toFixed(1)}★</span>
            </div>
            <div class="flex justify-between">
              <span>Services:</span>
              <span>${driver.services.join(', ')}</span>
            </div>
            ${driver.speed ? `<div class="flex justify-between">
              <span>Speed:</span>
              <span>${driver.speed.toFixed(1)} km/h</span>
            </div>` : ''}
            <div class="text-xs text-gray-500 mt-2">
              Last update: ${driver.lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      `
    });
    
    const marker = this.markers.get(driver.driverId);
    if (marker) {
      infoWindow.open(this.map, marker);
    }
  }

  private getStatusBadgeClasses(status: string): string {
    const classes = {
      active: 'bg-green-100 text-green-800',
      busy: 'bg-orange-100 text-orange-800',
      offline: 'bg-gray-100 text-gray-800',
      break: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-purple-100 text-purple-800',
      suspended: 'bg-red-100 text-red-800',
      emergency: 'bg-red-100 text-red-800 animate-pulse'
    };
    
    return classes[status as keyof typeof classes] || classes.offline;
  }

  getVisibleDrivers(): DriverMarker[] {
    const visibleDrivers: DriverMarker[] = [];
    const bounds = this.map.getBounds();
    
    if (bounds) {
      for (const [driverId, marker] of this.markers) {
        const position = marker.getPosition();
        if (position && bounds.contains(position)) {
          // Get driver data from marker (stored in marker metadata)
          // This would need to be maintained alongside marker updates
          // For now, return basic data structure
        }
      }
    }
    
    return visibleDrivers;
  }

  cleanup(): void {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers.clear();
    this.clusterer?.clearMarkers();
    this.markerPool.length = 0;
  }
}

// =====================================================
// HEATMAP VISUALIZATION MANAGER
// =====================================================

class HeatmapManager {
  private heatmap: google.maps.visualization.HeatmapLayer | null = null;
  private map: google.maps.Map;
  private isVisible = false;

  constructor(map: google.maps.Map) {
    this.map = map;
  }

  updateHeatmapData(data: HeatmapData[]): void {
    if (!this.heatmap) {
      this.heatmap = new google.maps.visualization.HeatmapLayer({
        data: data.map(d => ({ location: d.location, weight: d.weight })),
        dissipating: false,
        radius: 50,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });
    } else {
      this.heatmap.setData(data.map(d => ({ location: d.location, weight: d.weight })));
    }

    if (this.isVisible) {
      this.heatmap.setMap(this.map);
    }
  }

  toggleHeatmap(visible?: boolean): void {
    this.isVisible = visible ?? !this.isVisible;
    
    if (this.heatmap) {
      this.heatmap.setMap(this.isVisible ? this.map : null);
    }
  }

  setHeatmapOptions(options: Partial<google.maps.visualization.HeatmapLayerOptions>): void {
    if (this.heatmap) {
      this.heatmap.setOptions(options);
    }
  }

  cleanup(): void {
    if (this.heatmap) {
      this.heatmap.setMap(null);
      this.heatmap = null;
    }
  }
}

// =====================================================
// GEOFENCE MANAGEMENT
// =====================================================

class GeofenceManager {
  private geofences: Map<string, google.maps.Polygon> = new Map();
  private map: google.maps.Map;

  constructor(map: google.maps.Map) {
    this.map = map;
  }

  addGeofence(geofence: Geofence): void {
    const polygon = new google.maps.Polygon({
      paths: geofence.boundary,
      strokeColor: this.getGeofenceColor(geofence.type),
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: this.getGeofenceColor(geofence.type),
      fillOpacity: 0.2,
      clickable: true,
      map: geofence.isActive ? this.map : null
    });

    // Add click listener for geofence info
    polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
      this.showGeofenceInfo(geofence, event.latLng!);
    });

    this.geofences.set(geofence.id, polygon);
  }

  removeGeofence(geofenceId: string): void {
    const polygon = this.geofences.get(geofenceId);
    if (polygon) {
      polygon.setMap(null);
      this.geofences.delete(geofenceId);
    }
  }

  updateGeofence(geofence: Geofence): void {
    this.removeGeofence(geofence.id);
    this.addGeofence(geofence);
  }

  toggleGeofenceVisibility(visible: boolean): void {
    this.geofences.forEach(polygon => {
      polygon.setMap(visible ? this.map : null);
    });
  }

  private getGeofenceColor(type: string): string {
    const colors = {
      'service_area': '#00aa00',
      'restricted_zone': '#ff0000',
      'pickup_zone': '#0088ff',
      'surge_area': '#ff8800',
      'emergency_zone': '#ff0080'
    };
    
    return colors[type as keyof typeof colors] || '#888888';
  }

  private showGeofenceInfo(geofence: Geofence, position: google.maps.LatLng): void {
    const infoWindow = new google.maps.InfoWindow({
      position,
      content: `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-lg mb-2">${geofence.name}</h3>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Type:</span>
              <span class="capitalize">${geofence.type.replace('_', ' ')}</span>
            </div>
            <div class="flex justify-between">
              <span>Status:</span>
              <span class="${geofence.isActive ? 'text-green-600' : 'text-red-600'}">${geofence.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            ${geofence.restrictions?.maxDrivers ? `<div class="flex justify-between">
              <span>Max Drivers:</span>
              <span>${geofence.restrictions.maxDrivers}</span>
            </div>` : ''}
          </div>
        </div>
      `
    });
    
    infoWindow.open(this.map);
  }

  cleanup(): void {
    this.geofences.forEach(polygon => {
      polygon.setMap(null);
    });
    this.geofences.clear();
  }
}

// =====================================================
// MAIN REAL-TIME MAP CONTROLLER
// =====================================================

export class RealTimeMapController {
  private googleMaps: GoogleMapsManager;
  private driverMarkers: DriverMarkerManager;
  private heatmapManager: HeatmapManager;
  private geofenceManager: GeofenceManager;
  private map: google.maps.Map | null = null;
  private viewState: MapViewState;

  constructor(private config: MapConfig) {
    this.googleMaps = GoogleMapsManager.getInstance(config);
    
    this.viewState = {
      center: config.center,
      zoom: config.zoom,
      bounds: { northEast: { lat: 0, lng: 0 }, southWest: { lat: 0, lng: 0 } },
      mapType: config.mapTypeId,
      controls: {
        showTraffic: false,
        showHeatmap: false,
        showGeofences: false,
        showClusters: true,
        filterByStatus: [],
        filterByService: [],
        autoRefresh: true,
        refreshInterval: 30
      },
      filters: {
        status: [],
        services: [],
        regions: [],
        lastUpdateMinutes: 5,
        showEmergency: true,
        showOffline: false
      },
      selectedDrivers: [],
      highlightedRegions: []
    };
  }

  async initialize(element: HTMLElement): Promise<void> {
    this.map = await this.googleMaps.initialize(element, this.config);
    
    this.driverMarkers = new DriverMarkerManager(this.map);
    this.heatmapManager = new HeatmapManager(this.map);
    this.geofenceManager = new GeofenceManager(this.map);
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.map) return;

    this.map.addListener('bounds_changed', () => {
      const bounds = this.map!.getBounds();
      if (bounds) {
        this.viewState.bounds = {
          northEast: {
            lat: bounds.getNorthEast().lat(),
            lng: bounds.getNorthEast().lng()
          },
          southWest: {
            lat: bounds.getSouthWest().lat(),
            lng: bounds.getSouthWest().lng()
          }
        };
      }
    });

    this.map.addListener('zoom_changed', () => {
      this.viewState.zoom = this.map!.getZoom() || this.config.zoom;
    });

    this.map.addListener('center_changed', () => {
      const center = this.map!.getCenter();
      if (center) {
        this.viewState.center = {
          lat: center.lat(),
          lng: center.lng()
        };
      }
    });
  }

  // Public API methods for updating map data
  updateDrivers(drivers: DriverMarker[]): void {
    this.driverMarkers.updateDriverMarkers(drivers);
  }

  updateHeatmap(data: HeatmapData[]): void {
    this.heatmapManager.updateHeatmapData(data);
  }

  updateGeofences(geofences: Geofence[]): void {
    geofences.forEach(geofence => {
      this.geofenceManager.addGeofence(geofence);
    });
  }

  toggleTraffic(visible?: boolean): void {
    if (!this.map) return;
    
    const trafficLayer = new google.maps.TrafficLayer();
    this.viewState.controls.showTraffic = visible ?? !this.viewState.controls.showTraffic;
    
    trafficLayer.setMap(this.viewState.controls.showTraffic ? this.map : null);
  }

  toggleHeatmap(visible?: boolean): void {
    this.heatmapManager.toggleHeatmap(visible);
    this.viewState.controls.showHeatmap = visible ?? !this.viewState.controls.showHeatmap;
  }

  toggleGeofences(visible?: boolean): void {
    this.geofenceManager.toggleGeofenceVisibility(visible ?? !this.viewState.controls.showGeofences);
    this.viewState.controls.showGeofences = visible ?? !this.viewState.controls.showGeofences;
  }

  setCenter(center: google.maps.LatLngLiteral): void {
    if (this.map) {
      this.map.setCenter(center);
    }
  }

  setZoom(zoom: number): void {
    if (this.map) {
      this.map.setZoom(zoom);
    }
  }

  fitBounds(bounds: google.maps.LatLngBoundsLiteral): void {
    if (this.map) {
      this.map.fitBounds(bounds);
    }
  }

  getViewState(): MapViewState {
    return { ...this.viewState };
  }

  cleanup(): void {
    this.driverMarkers?.cleanup();
    this.heatmapManager?.cleanup();
    this.geofenceManager?.cleanup();
  }
}

// Export utility functions
export const createMapConfig = (apiKey: string, region = 'metro_manila'): MapConfig => ({
  apiKey,
  center: { lat: 14.5995, lng: 120.9842 }, // Manila default
  zoom: 11,
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  region
});

export const calculateDistance = (
  point1: google.maps.LatLngLiteral,
  point2: google.maps.LatLngLiteral
): number => {
  return google.maps.geometry.spherical.computeDistanceBetween(
    new google.maps.LatLng(point1.lat, point1.lng),
    new google.maps.LatLng(point2.lat, point2.lng)
  );
};

export const isPointInBounds = (
  point: google.maps.LatLngLiteral,
  bounds: google.maps.LatLngBoundsLiteral
): boolean => {
  return point.lat >= bounds.south &&
         point.lat <= bounds.north &&
         point.lng >= bounds.west &&
         point.lng <= bounds.east;
};