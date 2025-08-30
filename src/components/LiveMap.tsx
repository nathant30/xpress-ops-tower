'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { MapPin, Navigation, Users, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'busy';
  isAvailable: boolean;
  primary_service: string;
  rating: number;
  last_updated: string;
}

interface DriverWithTrip extends Driver {
  currentTrip: {
    id: string;
    pickup: { lat: number; lng: number };
    dropoff: { lat: number; lng: number };
    status: string;
    estimatedArrival: string;
  };
}

interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  priority: 'critical' | 'high' | 'medium';
  title: string;
  status: string;
}

interface Booking {
  id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_latitude: number;
  dropoff_longitude: number;
  status: 'pending' | 'in_progress' | 'completed';
  booking_reference: string;
}

interface SurgeZone {
  id: string;
  center: { lat: number; lng: number };
  radius: number; // in meters
  multiplier: number;
  intensity: 'low' | 'medium' | 'high';
  active: boolean;
}

interface DemandHeatPoint {
  lat: number;
  lng: number;
  weight: number; // 0-1 intensity
  requestCount: number;
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

interface LiveMapProps {
  drivers?: Driver[];
  alerts?: Alert[];
  bookings?: Booking[];
  surgeZones?: SurgeZone[];
  demandHeatmap?: DemandHeatPoint[];
  showSurgeZones?: boolean;
  showDemandHeatmap?: boolean;
  showDriverUtilization?: boolean;
  showHeatmap?: boolean;
  showDriverHubs?: boolean;
  showZones?: boolean;
  showPOI?: boolean;
  showTrips?: boolean;
  className?: string;
  activeStatusFilter?: string | null;
  onStatusFilterChange?: (filter: string | null) => void;
  // Zone system props
  metroManilaZones?: HeatmapZone[];
  selectedZone?: HeatmapZone | null;
  onZoneSelect?: (zone: HeatmapZone | null) => void;
  onZoneHover?: (zoneId: string | null) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

function LiveMap({ 
  drivers = [], 
  alerts = [], 
  bookings = [], 
  showHeatmap = false,
  showDriverHubs = false,
  showZones = false,
  showPOI = false,
  showTrips = true,
  className = '',
  activeStatusFilter = null,
  onStatusFilterChange,
  // Zone system props
  metroManilaZones = [],
  selectedZone = null,
  onZoneSelect,
  onZoneHover
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const driverHubMarkersRef = useRef<google.maps.Marker[]>([]);
  const zonePolygonsRef = useRef<google.maps.Polygon[]>([]);
  const poiMarkersRef = useRef<google.maps.Marker[]>([]);
  const tripMarkersRef = useRef<Map<string, { pickup: google.maps.Marker, dropoff: google.maps.Marker, route: google.maps.Polyline, progress: google.maps.Polyline }>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Generate realistic fleet data for Metro Manila
  const generateFleetData = useCallback(() => {
    const driverNames = [
      'Juan Santos', 'Maria Cruz', 'Pedro Reyes', 'Ana Garcia', 'Carlos Dela Cruz',
      'Sofia Rodriguez', 'Miguel Torres', 'Elena Morales', 'Jose Fernandez', 'Carmen Valdez',
      'Roberto Silva', 'Isabella Mendoza', 'Francisco Lopez', 'Gabriela Rivera', 'Diego Herrera',
      'Valentina Castro', 'Santiago Vargas', 'Camila Gutierrez', 'Mateo Jimenez', 'Lucia Ramos',
      'Alejandro Flores', 'Natalia Ortiz', 'Andres Medina', 'Daniela Romero', 'Nicolas Perez',
      'Mariana Ruiz', 'Sebastian Aguilar', 'Ximena Vega', 'Emilio Castillo', 'Antonia Guerrero',
      'Rafael Soto', 'Catalina Espinoza', 'Joaquin Sandoval', 'Esperanza Nunez', 'Esteban Cortez'
    ];

    const serviceTypes = ['motorcycle', 'car', 'suv', 'taxi'];
    const statuses = ['available', 'busy', 'pickup', 'dropoff'];
    const locations = [
      // BGC Area
      { lat: 14.5547, lng: 121.0244, area: 'BGC' },
      { lat: 14.5550, lng: 121.0250, area: 'BGC' },
      { lat: 14.5545, lng: 121.0240, area: 'BGC' },
      { lat: 14.5552, lng: 121.0246, area: 'BGC' },
      
      // Makati Area
      { lat: 14.5176, lng: 121.0509, area: 'Makati' },
      { lat: 14.5180, lng: 121.0515, area: 'Makati' },
      { lat: 14.5172, lng: 121.0505, area: 'Makati' },
      { lat: 14.5178, lng: 121.0512, area: 'Makati' },
      
      // Manila Area
      { lat: 14.5995, lng: 120.9842, area: 'Manila' },
      { lat: 14.6000, lng: 120.9845, area: 'Manila' },
      { lat: 14.5990, lng: 120.9840, area: 'Manila' },
      { lat: 14.6005, lng: 120.9850, area: 'Manila' },
      
      // Quezon City
      { lat: 14.6760, lng: 121.0437, area: 'QC' },
      { lat: 14.6765, lng: 121.0440, area: 'QC' },
      { lat: 14.6755, lng: 121.0435, area: 'QC' },
      { lat: 14.6770, lng: 121.0445, area: 'QC' },
      
      // Pasig/Ortigas
      { lat: 14.5794, lng: 121.0359, area: 'Ortigas' },
      { lat: 14.5800, lng: 121.0365, area: 'Ortigas' },
      { lat: 14.5790, lng: 121.0355, area: 'Ortigas' },
      { lat: 14.5798, lng: 121.0362, area: 'Ortigas' },
      
      // Mandaluyong
      { lat: 14.5243, lng: 120.9792, area: 'Mandaluyong' },
      { lat: 14.5250, lng: 120.9800, area: 'Mandaluyong' },
      { lat: 14.5240, lng: 120.9785, area: 'Mandaluyong' },
      
      // Taguig
      { lat: 14.4607, lng: 121.0443, area: 'Taguig' },
      { lat: 14.4615, lng: 121.0450, area: 'Taguig' },
      { lat: 14.4600, lng: 121.0440, area: 'Taguig' },
      
      // Las Piñas
      { lat: 14.4378, lng: 120.9947, area: 'Las Piñas' },
      { lat: 14.4385, lng: 120.9955, area: 'Las Piñas' },
      
      // Muntinlupa
      { lat: 14.4760, lng: 121.0437, area: 'Muntinlupa' },
      { lat: 14.4765, lng: 121.0445, area: 'Muntinlupa' },
      
      // Marikina
      { lat: 14.6504, lng: 121.1029, area: 'Marikina' },
      { lat: 14.6510, lng: 121.1035, area: 'Marikina' },
      
      // Airport Area
      { lat: 14.5086, lng: 121.0194, area: 'Airport' },
      { lat: 14.5090, lng: 121.0200, area: 'Airport' },
      { lat: 14.5080, lng: 121.0190, area: 'Airport' }
    ];

    const mockDrivers: Driver[] = [];
    const mockBookings: Booking[] = [];

    // Generate drivers
    for (let i = 0; i < 156; i++) {
      const location = locations[i % locations.length];
      const name = driverNames[i % driverNames.length];
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isAvailable = status === 'available';

      // Add some randomness to positions
      const latOffset = (Math.random() - 0.5) * 0.01;
      const lngOffset = (Math.random() - 0.5) * 0.01;

      const driver: Driver & { currentTrip?: { pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, bookingRef: string } } = {
        id: `driver-${i + 1}`,
        first_name: name.split(' ')[0],
        last_name: name.split(' ')[1],
        latitude: location.lat + latOffset,
        longitude: location.lng + lngOffset,
        status: status as 'active' | 'inactive' | 'busy',
        isAvailable,
        primary_service: serviceType,
        rating: 4.2 + Math.random() * 0.8, // 4.2 - 5.0 rating
        last_updated: new Date(Date.now() - Math.random() * 300000).toISOString() // Updated within last 5 minutes
      };

      // Generate trip data for 'On Trip' drivers
      if (status === 'busy') {
        const pickupLocation = locations[Math.floor(Math.random() * locations.length)];
        const dropoffLocation = locations[Math.floor(Math.random() * locations.length)];
        
        driver.currentTrip = {
          pickupLat: pickupLocation.lat + (Math.random() - 0.5) * 0.005,
          pickupLng: pickupLocation.lng + (Math.random() - 0.5) * 0.005,
          dropoffLat: dropoffLocation.lat + (Math.random() - 0.5) * 0.005,
          dropoffLng: dropoffLocation.lng + (Math.random() - 0.5) * 0.005,
          bookingRef: `XPR${Math.floor(Math.random() * 9000) + 1000}`
        };

        const booking: Booking = {
          id: `booking-${mockBookings.length + 1}`,
          pickup_latitude: driver.currentTrip.pickupLat,
          pickup_longitude: driver.currentTrip.pickupLng,
          dropoff_latitude: driver.currentTrip.dropoffLat,
          dropoff_longitude: driver.currentTrip.dropoffLng,
          status: 'in_progress',
          booking_reference: driver.currentTrip.bookingRef
        };

        mockBookings.push(booking);
      }

      mockDrivers.push(driver);
    }

    return { drivers: mockDrivers, bookings: mockBookings };
  }, []);

  const fleetData = generateFleetData();

  // Manila, Philippines coordinates as default center
  const defaultCenter = { lat: 14.5995, lng: 120.9842 };

  // Load Google Maps script using the singleton loader
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const { loadGoogleMapsAPI } = await import('@/utils/googleMapsLoader');
        await loadGoogleMapsAPI();
        setIsLoaded(true);
      } catch (error) {
        logger.error('Failed to load Google Maps', undefined, { component: 'LiveMap', error: error.message });
        // Fallback to mock interface
        setIsLoaded(true);
      }
    };

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    loadMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current) return;

    try {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      });

      logger.info('Google Maps initialized successfully', undefined, { component: 'LiveMap' });
    } catch (error) {
      logger.error('Failed to initialize Google Maps', { component: 'LiveMap' });
    }
  }, [isLoaded]);

  // Heatmap toggle effect
  useEffect(() => {
    if (!mapInstance.current) return;

    if (showHeatmap && window.google?.maps?.visualization) {
      if (!heatmapRef.current) {
        // Metro Manila demand heatmap data
        const demandHeatmapData = [
          // High demand areas (CBD, Makati, BGC)
          new google.maps.LatLng(14.5547, 121.0244), // BGC - High
          new google.maps.LatLng(14.5548, 121.0245), // BGC - High
          new google.maps.LatLng(14.5549, 121.0246), // BGC - High
          new google.maps.LatLng(14.5550, 121.0247), // BGC - High
          new google.maps.LatLng(14.5551, 121.0248), // BGC - High
          
          new google.maps.LatLng(14.5176, 121.0509), // Makati CBD - High
          new google.maps.LatLng(14.5177, 121.0510), // Makati CBD - High
          new google.maps.LatLng(14.5178, 121.0511), // Makati CBD - High
          new google.maps.LatLng(14.5179, 121.0512), // Makati CBD - High
          new google.maps.LatLng(14.5180, 121.0513), // Makati CBD - High
          
          new google.maps.LatLng(14.5995, 120.9842), // Manila CBD - High
          new google.maps.LatLng(14.5996, 120.9843), // Manila CBD - High
          new google.maps.LatLng(14.5997, 120.9844), // Manila CBD - High
          
          // Medium demand areas (residential)
          new google.maps.LatLng(14.6760, 121.0437), // Quezon City - Medium
          new google.maps.LatLng(14.6761, 121.0438), // Quezon City - Medium
          new google.maps.LatLng(14.6762, 121.0439), // Quezon City - Medium
          
          new google.maps.LatLng(14.5243, 121.0792), // Pasig - Medium
          new google.maps.LatLng(14.5244, 121.0793), // Pasig - Medium
          
          new google.maps.LatLng(14.6091, 120.9794), // Manila North - Medium
          new google.maps.LatLng(14.6092, 120.9795), // Manila North - Medium
          
          // Low demand areas (outer areas)
          new google.maps.LatLng(14.6504, 121.1029), // Marikina - Low
          new google.maps.LatLng(14.4378, 120.9947), // Las Piñas - Low
          new google.maps.LatLng(14.4760, 121.0437)  // Muntinlupa - Low
        ];

        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
          data: demandHeatmapData,
          map: mapInstance.current,
          radius: 50,
          opacity: 0.6,
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
        heatmapRef.current.setMap(mapInstance.current);
      }
    } else if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
  }, [showHeatmap]);

  // Driver Hubs effect
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing driver hub markers
    driverHubMarkersRef.current.forEach(marker => marker.setMap(null));
    driverHubMarkersRef.current = [];

    if (showDriverHubs) {
      const driverHubs = [
        { lat: 14.5547, lng: 121.0244, name: "BGC Hub", drivers: 12 },
        { lat: 14.5176, lng: 121.0509, name: "Makati Hub", drivers: 18 },
        { lat: 14.5995, lng: 120.9842, name: "Manila Hub", drivers: 15 },
        { lat: 14.6760, lng: 121.0437, name: "QC Hub", drivers: 9 },
        { lat: 14.5243, lng: 121.0792, name: "Pasig Hub", drivers: 7 },
        { lat: 14.6091, lng: 120.9794, name: "Manila North Hub", drivers: 11 },
        { lat: 14.6504, lng: 121.1029, name: "Marikina Hub", drivers: 6 },
        { lat: 14.4378, lng: 120.9947, name: "Las Piñas Hub", drivers: 8 },
        { lat: 14.4760, lng: 121.0437, name: "Muntinlupa Hub", drivers: 5 },
        { lat: 14.5794, lng: 121.0359, name: "Ortigas Hub", drivers: 14 },
        { lat: 14.5243, lng: 120.9792, name: "Mandaluyong Hub", drivers: 10 },
        { lat: 14.4607, lng: 121.0443, name: "Taguig Hub", drivers: 13 }
      ];

      driverHubs.forEach(hub => {
        const marker = new google.maps.Marker({
          position: { lat: hub.lat, lng: hub.lng },
          map: mapInstance.current,
          title: `${hub.name} - ${hub.drivers} drivers`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#8B5CF6',
            fillOpacity: 0.9,
            strokeColor: '#6D28D9',
            strokeWeight: 3
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h4 style="margin: 0 0 4px 0; color: #8B5CF6; font-weight: bold;">${hub.name}</h4>
              <p style="margin: 0; font-size: 14px;">Active Drivers: <strong>${hub.drivers}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Click to view hub details</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });

        driverHubMarkersRef.current.push(marker);
      });
    }
  }, [showDriverHubs]);

  // Zones effect
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing zone polygons
    zonePolygonsRef.current.forEach(polygon => polygon.setMap(null));
    zonePolygonsRef.current = [];

    if (showZones) {
      const zones = [
        {
          name: "Metro Manila CBD",
          paths: [
            { lat: 14.5800, lng: 120.9700 },
            { lat: 14.5800, lng: 121.0600 },
            { lat: 14.5000, lng: 121.0600 },
            { lat: 14.5000, lng: 120.9700 }
          ],
          color: '#FF6B6B'
        },
        {
          name: "BGC Zone",
          paths: [
            { lat: 14.5600, lng: 121.0200 },
            { lat: 14.5600, lng: 121.0350 },
            { lat: 14.5450, lng: 121.0350 },
            { lat: 14.5450, lng: 121.0200 }
          ],
          color: '#4ECDC4'
        },
        {
          name: "Quezon City North",
          paths: [
            { lat: 14.7000, lng: 121.0200 },
            { lat: 14.7000, lng: 121.0800 },
            { lat: 14.6400, lng: 121.0800 },
            { lat: 14.6400, lng: 121.0200 }
          ],
          color: '#45B7D1'
        },
        {
          name: "Makati Premium",
          paths: [
            { lat: 14.5300, lng: 121.0400 },
            { lat: 14.5300, lng: 121.0650 },
            { lat: 14.5050, lng: 121.0650 },
            { lat: 14.5050, lng: 121.0400 }
          ],
          color: '#F7DC6F'
        },
        {
          name: "Manila Bay Area",
          paths: [
            { lat: 14.6200, lng: 120.9600 },
            { lat: 14.6200, lng: 121.0000 },
            { lat: 14.5800, lng: 121.0000 },
            { lat: 14.5800, lng: 120.9600 }
          ],
          color: '#BB8FCE'
        },
        {
          name: "Pasig-Ortigas",
          paths: [
            { lat: 14.5900, lng: 121.0300 },
            { lat: 14.5900, lng: 121.0900 },
            { lat: 14.5600, lng: 121.0900 },
            { lat: 14.5600, lng: 121.0300 }
          ],
          color: '#85C1E9'
        },
        {
          name: "South Metro",
          paths: [
            { lat: 14.4800, lng: 121.0200 },
            { lat: 14.4800, lng: 121.0800 },
            { lat: 14.4200, lng: 121.0800 },
            { lat: 14.4200, lng: 121.0200 }
          ],
          color: '#F8C471'
        },
        {
          name: "Airport Zone",
          paths: [
            { lat: 14.5200, lng: 121.0000 },
            { lat: 14.5200, lng: 121.0200 },
            { lat: 14.4900, lng: 121.0200 },
            { lat: 14.4900, lng: 121.0000 }
          ],
          color: '#82E0AA'
        }
      ];

      zones.forEach(zone => {
        const polygon = new google.maps.Polygon({
          paths: zone.paths,
          strokeColor: zone.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.15,
          map: mapInstance.current
        });

        const infoWindow = new google.maps.InfoWindow();

        polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
          infoWindow.setContent(`
            <div style="padding: 8px;">
              <h4 style="margin: 0 0 4px 0; color: ${zone.color}; font-weight: bold;">${zone.name}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">Service Zone</p>
            </div>
          `);
          infoWindow.setPosition(e.latLng);
          infoWindow.open(mapInstance.current);
        });

        zonePolygonsRef.current.push(polygon);
      });
    }
  }, [showZones]);

  // POI effect
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing POI markers
    poiMarkersRef.current.forEach(marker => marker.setMap(null));
    poiMarkersRef.current = [];

    if (showPOI) {
      const pois = [
        // Airports
        { lat: 14.5086, lng: 121.0194, name: "NAIA Terminal 1", type: "Airport", icon: "✈️" },
        { lat: 14.5129, lng: 121.0198, name: "NAIA Terminal 2", type: "Airport", icon: "✈️" },
        { lat: 14.5097, lng: 121.0142, name: "NAIA Terminal 3", type: "Airport", icon: "✈️" },
        
        // Hospitals
        { lat: 14.5794, lng: 121.0359, name: "St. Luke's Medical Center", type: "Hospital", icon: "🏥" },
        { lat: 14.5243, lng: 121.0509, name: "Makati Medical Center", type: "Hospital", icon: "🏥" },
        { lat: 14.6091, lng: 120.9794, name: "Philippine General Hospital", type: "Hospital", icon: "🏥" },
        { lat: 14.6760, lng: 121.0437, name: "St. Luke's QC", type: "Hospital", icon: "🏥" },
        
        // Shopping Malls
        { lat: 14.5547, lng: 121.0244, name: "BGC High Street", type: "Mall", icon: "🛍️" },
        { lat: 14.5176, lng: 121.0509, name: "Greenbelt", type: "Mall", icon: "🛍️" },
        { lat: 14.5995, lng: 120.9842, name: "SM Manila", type: "Mall", icon: "🛍️" },
        { lat: 14.6760, lng: 121.0437, name: "SM North EDSA", type: "Mall", icon: "🛍️" },
        { lat: 14.5794, lng: 121.0359, name: "SM Megamall", type: "Mall", icon: "🛍️" },
        { lat: 14.5243, lng: 121.0792, name: "Eastwood Mall", type: "Mall", icon: "🛍️" },
        
        // Train Stations
        { lat: 14.5995, lng: 120.9842, name: "LRT-1 Central Station", type: "Transport", icon: "🚇" },
        { lat: 14.5547, lng: 121.0244, name: "BGC Bus Station", type: "Transport", icon: "🚌" },
        { lat: 14.5794, lng: 121.0359, name: "MRT-3 Ortigas", type: "Transport", icon: "🚇" },
        { lat: 14.6760, lng: 121.0437, name: "MRT-3 North Avenue", type: "Transport", icon: "🚇" },
        
        // Universities
        { lat: 14.5995, lng: 120.9842, name: "University of Manila", type: "University", icon: "🎓" },
        { lat: 14.6091, lng: 120.9794, name: "University of the Philippines", type: "University", icon: "🎓" },
        { lat: 14.6760, lng: 121.0437, name: "Ateneo de Manila", type: "University", icon: "🎓" },
        { lat: 14.5794, lng: 121.0359, name: "De La Salle University", type: "University", icon: "🎓" },
        
        // Hotels
        { lat: 14.5547, lng: 121.0244, name: "Grand Hyatt Manila", type: "Hotel", icon: "🏨" },
        { lat: 14.5176, lng: 121.0509, name: "Makati Shangri-La", type: "Hotel", icon: "🏨" },
        { lat: 14.5995, lng: 120.9842, name: "Manila Hotel", type: "Hotel", icon: "🏨" },
        { lat: 14.6091, lng: 120.9794, name: "Diamond Hotel", type: "Hotel", icon: "🏨" },
        
        // Government
        { lat: 14.5995, lng: 120.9842, name: "Malacañang Palace", type: "Government", icon: "🏛️" },
        { lat: 14.5794, lng: 121.0359, name: "Senate Building", type: "Government", icon: "🏛️" },
        { lat: 14.6091, lng: 120.9794, name: "Supreme Court", type: "Government", icon: "⚖️" }
      ];

      const iconColors = {
        Airport: '#FF6B6B',
        Hospital: '#4ECDC4',
        Mall: '#45B7D1',
        Transport: '#96CEB4',
        University: '#FECA57',
        Hotel: '#FF9FF3',
        Government: '#54A0FF'
      };

      pois.forEach((poi, index) => {
        const marker = new google.maps.Marker({
          position: { lat: poi.lat, lng: poi.lng },
          map: mapInstance.current,
          title: `${poi.name} (${poi.type})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: iconColors[poi.type as keyof typeof iconColors],
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 150px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 16px; margin-right: 8px;">${poi.icon}</span>
                <h4 style="margin: 0; font-weight: bold; color: ${iconColors[poi.type as keyof typeof iconColors]};">${poi.name}</h4>
              </div>
              <p style="margin: 0; font-size: 12px; color: #666; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; display: inline-block;">${poi.type}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });

        poiMarkersRef.current.push(marker);
      });
    }
  }, [showPOI]);

  // Show trip details for driver on trip
  const showDriverTripDetails = useCallback((driver: Driver & { currentTrip: { pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, bookingRef: string } }) => {
    if (!mapInstance.current || !driver.currentTrip) return;

    // Clear any existing trip markers
    tripMarkersRef.current.forEach(({ pickup, dropoff, route, progress }) => {
      pickup.setMap(null);
      dropoff.setMap(null);
      route.setMap(null);
      progress.setMap(null);
    });
    tripMarkersRef.current.clear();

    const { pickupLat, pickupLng, dropoffLat, dropoffLng, bookingRef } = driver.currentTrip;

    // Create pickup marker with green circle
    const pickupMarker = new google.maps.Marker({
      position: { lat: pickupLat, lng: pickupLng },
      map: mapInstance.current,
      title: `Pickup - ${bookingRef}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3
      },
      zIndex: 1000
    });

    // Create dropoff marker with green circle
    const dropoffMarker = new google.maps.Marker({
      position: { lat: dropoffLat, lng: dropoffLng },
      map: mapInstance.current,
      title: `Dropoff - ${bookingRef}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3
      },
      zIndex: 1000
    });

    // Create main route line from pickup to dropoff (matching the image style)
    const routeLine = new google.maps.Polyline({
      path: [
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      ],
      geodesic: true,
      strokeColor: '#10B981',
      strokeOpacity: 0.8,
      strokeWeight: 6,
      map: mapInstance.current,
      zIndex: 998
    });

    // Create progress line showing completed portion (pickup to current driver position)
    const progressLine = new google.maps.Polyline({
      path: [
        { lat: pickupLat, lng: pickupLng },
        { lat: driver.latitude, lng: driver.longitude }
      ],
      geodesic: true,
      strokeColor: '#059669',
      strokeOpacity: 1,
      strokeWeight: 8,
      map: mapInstance.current,
      zIndex: 999
    });

    // Info windows with updated styling
    const pickupInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; font-family: system-ui, sans-serif; min-width: 200px;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; display: flex; align-items: center;">
            <div style="width: 12px; height: 12px; background: #10B981; border-radius: 50%; margin-right: 8px;"></div>
            Pickup Location
          </div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.4;">
            <div style="margin-bottom: 4px;"><strong>Trip:</strong> ${bookingRef}</div>
            <div style="margin-bottom: 4px;"><strong>Driver:</strong> ${driver.first_name} ${driver.last_name}</div>
            <div style="margin-bottom: 4px;"><strong>Service:</strong> ${getServiceIcon(driver.primary_service)} ${driver.primary_service.charAt(0).toUpperCase() + driver.primary_service.slice(1)}</div>
            <div style="margin-top: 8px; padding: 6px; background: #d1fae5; border-radius: 6px; color: #065f46; border-left: 3px solid #10B981;">
              <strong>✓ Pickup Completed</strong>
            </div>
          </div>
        </div>
      `
    });

    const dropoffInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; font-family: system-ui, sans-serif; min-width: 200px;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; display: flex; align-items: center;">
            <div style="width: 12px; height: 12px; background: #10B981; border-radius: 50%; margin-right: 8px;"></div>
            Dropoff Destination
          </div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.4;">
            <div style="margin-bottom: 4px;"><strong>Trip:</strong> ${bookingRef}</div>
            <div style="margin-bottom: 4px;"><strong>Driver:</strong> ${driver.first_name} ${driver.last_name}</div>
            <div style="margin-bottom: 4px;"><strong>Service:</strong> ${getServiceIcon(driver.primary_service)} ${driver.primary_service.charAt(0).toUpperCase() + driver.primary_service.slice(1)}</div>
            <div style="margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 6px; color: #92400e; border-left: 3px solid #f59e0b;">
              <strong>🚗 En Route to Destination</strong>
            </div>
          </div>
        </div>
      `
    });

    pickupMarker.addListener('click', () => {
      pickupInfoWindow.open(mapInstance.current, pickupMarker);
    });

    dropoffMarker.addListener('click', () => {
      dropoffInfoWindow.open(mapInstance.current, dropoffMarker);
    });

    // Store trip markers
    tripMarkersRef.current.set(driver.id, {
      pickup: pickupMarker,
      dropoff: dropoffMarker,
      route: routeLine,
      progress: progressLine
    });

    // Zoom to fit all three points (pickup, driver current position, dropoff)
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: pickupLat, lng: pickupLng });
    bounds.extend({ lat: driver.latitude, lng: driver.longitude });
    bounds.extend({ lat: dropoffLat, lng: dropoffLng });
    
    mapInstance.current.fitBounds(bounds);
    
    // Set a minimum zoom level
    setTimeout(() => {
      if (mapInstance.current && mapInstance.current.getZoom() > 15) {
        mapInstance.current.setZoom(15);
      }
    }, 100);

    // Add trip info box similar to reference image - SECURE VERSION
    const tripInfoDiv = document.createElement('div');
    const tripInfoContainer = document.createElement('div');
    tripInfoContainer.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, sans-serif;
        z-index: 1001;
        max-width: 300px;
      ">
        <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">
          ${bookingRef} - Trip in Progress
        </div>
        <div style="font-size: 13px; color: #4b5563; line-height: 1.4;">
          <div style="margin-bottom: 4px;">
            <strong>Driver:</strong> ${getServiceIcon(driver.primary_service)} ${driver.first_name} ${driver.last_name}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Rating:</strong> ${driver.rating.toFixed(1)} ⭐
          </div>
          <div style="display: flex; align-items: center; padding: 8px; background: #f0fdf4; border-radius: 6px; border-left: 4px solid #10B981;">
            <div style="font-size: 12px; color: #065f46;">
              <strong>Status:</strong> En route to destination<br>
              <span style="color: #6b7280;">Pickup completed • ${Math.floor(Math.random() * 15 + 5)} mins remaining</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add to map container
    const mapContainer = mapInstance.current.getDiv();
    mapContainer.appendChild(tripInfoDiv);
    
    // Remove after 10 seconds or when clicking elsewhere
    setTimeout(() => {
      if (tripInfoDiv.parentNode) {
        tripInfoDiv.parentNode.removeChild(tripInfoDiv);
      }
    }, 10000);
  }, []);

  // Helper function to get service icon
  const getServiceIcon = (serviceType: string) => {
    switch(serviceType) {
      case 'motorcycle': return '🏍️';
      case 'car': return '🚗';
      case 'suv': return '🚙';
      case 'taxi': return '🚖';
      default: return '🚗';
    }
  };

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
  }, []);

  // Add driver markers
  const addDriverMarkers = useCallback(() => {
    const driversToShow = drivers.length > 0 ? drivers : fleetData.drivers;
    if (!mapInstance.current || !driversToShow.length) return;

    // Filter drivers based on active status filter
    const filteredDrivers = activeStatusFilter 
      ? driversToShow.filter(driver => {
          switch(activeStatusFilter) {
            case 'available': return driver.isAvailable;
            case 'busy': return driver.status === 'busy';
            case 'pickup': return driver.status === 'active' && !driver.isAvailable;
            case 'dropoff': return driver.status === 'active' && !driver.isAvailable;
            case 'emergency': return false; // No emergency drivers in this dataset
            default: return true;
          }
        })
      : driversToShow;

    filteredDrivers.forEach(driver => {
      const position = { lat: driver.latitude, lng: driver.longitude };
      const markerId = `driver_${driver.id}`;

      // Create custom marker icon based on driver status and service type
      const getDriverColor = (driver: Driver) => {
        if (driver.isAvailable) return '#10B981'; // Green - Available
        if (driver.status === 'busy') return '#F59E0B'; // Yellow - Busy
        if (driver.status === 'active' && !driver.isAvailable) return '#3B82F6'; // Blue - Pickup/Dropoff
        return '#EF4444'; // Red - Inactive
      };

      const getServiceIcon = (serviceType: string) => {
        switch(serviceType) {
          case 'motorcycle': return '🏍️';
          case 'car': return '🚗';
          case 'suv': return '🚙';
          case 'taxi': return '🚖';
          default: return '🚗';
        }
      };

      const getStatusText = (driver: Driver) => {
        if (driver.isAvailable) return 'Available';
        if (driver.status === 'busy') return 'On Trip';
        if (driver.status === 'active') return 'Pickup';
        return 'Offline';
      };

      const createServiceIcon = (serviceType: string, color: string) => {
        const emoji = getServiceIcon(serviceType);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        
        // Draw background circle
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw emoji
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(emoji, 16, 16);
        
        return canvas.toDataURL();
      };
      
      const marker = new google.maps.Marker({
        position,
        map: mapInstance.current,
        title: `${driver.first_name} ${driver.last_name} - ${getStatusText(driver)} (${driver.primary_service})`,
        icon: {
          url: createServiceIcon(driver.primary_service, getDriverColor(driver)),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Add info window with enhanced content
      const timeAgo = Math.floor((Date.now() - new Date(driver.last_updated).getTime()) / 60000);
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 18px; margin-right: 8px;">${getServiceIcon(driver.primary_service)}</span>
              <div>
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">
                  ${driver.first_name} ${driver.last_name}
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  Driver ID: ${driver.id}
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 8px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${getDriverColor(driver)}; margin-right: 8px;"></div>
                <span style="font-size: 13px; font-weight: 500; color: ${getDriverColor(driver)};">
                  ${getStatusText(driver)}
                </span>
              </div>
            </div>
            
            <div style="font-size: 12px; color: #4b5563; line-height: 1.4;">
              <div style="margin-bottom: 3px;">
                <strong>Service:</strong> ${driver.primary_service.charAt(0).toUpperCase() + driver.primary_service.slice(1)}
              </div>
              <div style="margin-bottom: 3px;">
                <strong>Rating:</strong> ${driver.rating.toFixed(1)} ⭐
              </div>
              <div style="margin-bottom: 3px;">
                <strong>Location:</strong> ${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}
              </div>
              <div style="color: #9ca3af;">
                Last updated: ${timeAgo}m ago
              </div>
            </div>
            
            ${!driver.isAvailable ? `
              <div style="margin-top: 8px; padding: 6px; background-color: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                <div style="font-size: 11px; color: #92400e;">
                  <strong>Current Trip:</strong> En route to destination
                </div>
              </div>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedDriver(driver);
        
        // If driver is on trip, show trip details with zoom
        if (driver.status === 'busy' && (driver as DriverWithTrip).currentTrip) {
          showDriverTripDetails(driver as DriverWithTrip);
        }
      });

      markersRef.current.set(markerId, marker);
    });
  }, [drivers, fleetData, activeStatusFilter]);

  // Add alert markers
  const addAlertMarkers = useCallback(() => {
    if (!mapInstance.current || !alerts.length) return;

    alerts.forEach(alert => {
      const position = { lat: alert.latitude, lng: alert.longitude };
      const markerId = `alert_${alert.id}`;

      const iconColor = alert.priority === 'critical' ? '#dc2626' :
                       alert.priority === 'high' ? '#ea580c' : '#d97706';

      const marker = new google.maps.Marker({
        position,
        map: mapInstance.current,
        title: alert.title,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-[200px]">
            <div class="font-semibold text-red-600 mb-2 flex items-center">
              <span class="mr-2">🚨</span>
              ${alert.title}
            </div>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Priority:</span>
                <span class="font-medium text-red-600">${alert.priority}</span>
              </div>
              <div class="flex justify-between">
                <span>Status:</span>
                <span class="font-medium">${alert.status}</span>
              </div>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.set(markerId, marker);
    });
  }, [alerts]);

  // Add booking route markers
  const addBookingMarkers = useCallback(() => {
    const bookingsToShow = bookings.length > 0 ? bookings : fleetData.bookings;
    if (!mapInstance.current || !bookingsToShow.length || !showTrips) return;

    bookingsToShow.forEach(booking => {
      if (booking.status !== 'in_progress') return;

      const pickupPosition = { lat: booking.pickup_latitude, lng: booking.pickup_longitude };
      const dropoffPosition = { lat: booking.dropoff_latitude, lng: booking.dropoff_longitude };

      // Pickup marker (Small blue circle)
      const pickupMarker = new google.maps.Marker({
        position: pickupPosition,
        map: mapInstance.current,
        title: `Pickup - ${booking.booking_reference}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#3b82f6',
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        zIndex: 500
      });

      // Dropoff marker (Small purple circle)
      const dropoffMarker = new google.maps.Marker({
        position: dropoffPosition,
        map: mapInstance.current,
        title: `Dropoff - ${booking.booking_reference}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#8b5cf6',
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        zIndex: 500
      });

      // Subtle route line
      const routePath = new google.maps.Polyline({
        path: [pickupPosition, dropoffPosition],
        geodesic: true,
        strokeColor: '#9ca3af',
        strokeOpacity: 0.4,
        strokeWeight: 1,
        map: mapInstance.current,
        zIndex: 100
      });

      // Add info windows
      const pickupInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              📍 Pickup Location
            </div>
            <div style="font-size: 12px; color: #4b5563;">
              <div><strong>Trip:</strong> ${booking.booking_reference}</div>
              <div><strong>Status:</strong> <span style="color: #3b82f6;">Awaiting Pickup</span></div>
            </div>
          </div>
        `
      });

      const dropoffInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              🎯 Dropoff Location
            </div>
            <div style="font-size: 12px; color: #4b5563;">
              <div><strong>Trip:</strong> ${booking.booking_reference}</div>
              <div><strong>Status:</strong> <span style="color: #8b5cf6;">Destination</span></div>
            </div>
          </div>
        `
      });

      pickupMarker.addListener('click', () => {
        pickupInfoWindow.open(mapInstance.current, pickupMarker);
      });

      dropoffMarker.addListener('click', () => {
        dropoffInfoWindow.open(mapInstance.current, dropoffMarker);
      });

      markersRef.current.set(`booking_pickup_${booking.id}`, pickupMarker);
      markersRef.current.set(`booking_dropoff_${booking.id}`, dropoffMarker);
      markersRef.current.set(`booking_route_${booking.id}`, routePath);
    });
  }, [bookings, fleetData, showTrips]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstance.current) return;

    clearMarkers();
    addDriverMarkers();
    addAlertMarkers();
    addBookingMarkers();

    // Fit bounds to show all markers if we have drivers
    if (drivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      drivers.forEach(driver => {
        bounds.extend({ lat: driver.latitude, lng: driver.longitude });
      });
      mapInstance.current.fitBounds(bounds);
    }
  }, [drivers, alerts, bookings, addDriverMarkers, addAlertMarkers, addBookingMarkers, clearMarkers]);

  // Show mock map interface when Google Maps isn't available or API key is missing
  const showMockMap = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

  if (!isLoaded) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (showMockMap) {
    return (
      <div className={`relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden ${className}`}>
        {/* Subtle Road Network Background */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="roadGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="0.5" fill="#64748b" opacity="0.1" />
              </pattern>
            </defs>
            
            {/* Major Roads - EDSA */}
            <path d="M58 10 L62 90" stroke="#64748b" strokeWidth="0.3" opacity="0.15" strokeDasharray="2,3"/>
            
            {/* C5 */}
            <path d="M75 15 L78 85" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            {/* Roxas Boulevard */}
            <path d="M35 25 L38 75" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            {/* Commonwealth/Quezon Ave */}
            <path d="M30 20 L85 25" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            {/* Shaw/Ortigas */}
            <path d="M40 35 L80 38" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            {/* Ayala/Makati */}
            <path d="M45 50 L75 52" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            {/* SLEX */}
            <path d="M55 55 L50 85" stroke="#64748b" strokeWidth="0.2" opacity="0.1" strokeDasharray="1,2"/>
            
            <rect width="100%" height="100%" fill="url(#roadGrid)" />
          </svg>
        </div>

        {/* Subtle Geometric Patterns */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-blue-300 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-indigo-300 rounded-full"></div>
          <div className="absolute bottom-1/4 left-1/3 w-16 h-16 border border-slate-300 rotate-45"></div>
        </div>

        {/* Metro Manila Zone Overlay */}
        {showZones && metroManilaZones && metroManilaZones.length > 0 && (
          <div className="absolute inset-0">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="zonePattern" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill="transparent"/>
                  <circle cx="2" cy="2" r="0.5" fill="currentColor" opacity="0.1"/>
                </pattern>
              </defs>
              
              {metroManilaZones.map((zone) => {
                // Convert real coordinates to SVG coordinates (simplified positioning)
                const zonePositions = {
                  'north-metro': { path: 'M20,5 L35,5 L35,20 L20,20 Z' },
                  'east-metro': { path: 'M35,20 L50,20 L50,35 L35,35 Z' },
                  'central-business': { path: 'M50,35 L70,35 L70,50 L50,50 Z' },
                  'manila-core': { path: 'M20,20 L50,20 L50,35 L20,35 Z' },
                  'south-metro': { path: 'M20,50 L50,50 L50,70 L20,70 Z' },
                  'west-metro': { path: 'M5,50 L20,50 L20,70 L5,70 Z' },
                  'airport-zone': { path: 'M50,50 L70,50 L70,70 L50,70 Z' },
                  'rizal-border': { path: 'M70,5 L85,5 L85,35 L70,35 Z' }
                };
                
                const zonePath = zonePositions[zone.id as keyof typeof zonePositions];
                if (!zonePath) return null;
                
                const zoneColor = zone.color === 'green' ? '#10b981' :
                                zone.color === 'yellow' ? '#f59e0b' :
                                zone.color === 'red' ? '#ef4444' : '#3b82f6';
                
                return (
                  <g key={zone.id}>
                    <path
                      d={zonePath.path}
                      fill={zoneColor}
                      fillOpacity={selectedZone?.id === zone.id ? 0.4 : 0.2}
                      stroke={zoneColor}
                      strokeWidth="0.5"
                      strokeOpacity={0.8}
                      className="transition-all duration-300 cursor-pointer hover:fill-opacity-30"
                      onMouseEnter={() => {
                        setHoveredZone(zone.id);
                        onZoneHover?.(zone.id);
                      }}
                      onMouseLeave={() => {
                        setHoveredZone(null);
                        onZoneHover?.(null);
                      }}
                      onClick={() => onZoneSelect?.(selectedZone?.id === zone.id ? null : zone)}
                    />
                    
                    {/* Zone Label */}
                    {(selectedZone?.id === zone.id || metroManilaZones.length <= 8) && (
                      <text
                        x={zonePath.path.includes('M20,5') ? 27.5 : 
                           zonePath.path.includes('M35,20') ? 42.5 :
                           zonePath.path.includes('M50,35') ? 60 :
                           zonePath.path.includes('M20,20') ? 35 :
                           zonePath.path.includes('M20,50') ? 35 :
                           zonePath.path.includes('M5,50') ? 12.5 :
                           zonePath.path.includes('M50,50') ? 60 : 77.5}
                        y={zonePath.path.includes('M20,5') ? 14 :
                           zonePath.path.includes('M35,20') ? 29 :
                           zonePath.path.includes('M50,35') ? 44 :
                           zonePath.path.includes('M20,20') ? 29 :
                           zonePath.path.includes('M20,50') ? 62 :
                           zonePath.path.includes('M5,50') ? 62 :
                           zonePath.path.includes('M50,50') ? 62 : 22}
                        textAnchor="middle"
                        className="text-xs font-semibold pointer-events-none"
                        fill={zone.color === 'yellow' ? '#92400e' : '#ffffff'}
                        stroke={zone.color === 'yellow' ? 'none' : '#00000040'}
                        strokeWidth="0.5"
                      >
                        {zone.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Zone Hover Tooltip */}
            {hoveredZone && metroManilaZones.find(z => z.id === hoveredZone) && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg pointer-events-none z-10">
                {(() => {
                  const hovered = metroManilaZones.find(z => z.id === hoveredZone);
                  if (!hovered) return null;
                  
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          hovered.color === 'green' ? 'bg-green-500' :
                          hovered.color === 'yellow' ? 'bg-yellow-500' :
                          hovered.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="font-semibold text-slate-900">{hovered.name}</span>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>Supply/Demand: {Math.round(hovered.supplyDemandRatio * 100)}%</div>
                        <div>Drivers: {hovered.activeDrivers} • Requests: {hovered.activeRequests}</div>
                        <div>Avg ETA: {hovered.averageETA}min • Surge: {hovered.surgeFactor}x</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Realistic Driver Markers */}
        {fleetData.drivers.slice(0, 35).map((driver, index) => {
          // More realistic, road-based positioning following Manila's street grid
          const roadPositions = [
            // EDSA Corridor (Major North-South artery)
            { left: '58%', top: '20%' }, { left: '59%', top: '35%' }, { left: '60%', top: '50%' }, { left: '61%', top: '65%' },
            
            // C5 Corridor (East side)
            { left: '75%', top: '25%' }, { left: '76%', top: '40%' }, { left: '77%', top: '55%' },
            
            // Roxas Boulevard (West coast)
            { left: '35%', top: '30%' }, { left: '36%', top: '45%' }, { left: '37%', top: '60%' },
            
            // BGC Area (clustered around business district)
            { left: '74%', top: '48%' }, { left: '75%', top: '46%' }, { left: '76%', top: '50%' }, { left: '73%', top: '49%' },
            
            // Makati CBD (high density)
            { left: '65%', top: '52%' }, { left: '67%', top: '54%' }, { left: '66%', top: '50%' }, { left: '64%', top: '53%' },
            
            // Ortigas (business district)
            { left: '70%', top: '35%' }, { left: '72%', top: '33%' }, { left: '71%', top: '37%' },
            
            // QC Circle area
            { left: '52%', top: '22%' }, { left: '54%', top: '20%' }, { left: '50%', top: '24%' },
            
            // Manila Bay area
            { left: '42%', top: '40%' }, { left: '44%', top: '42%' }, { left: '40%', top: '38%' },
            
            // Airport area (NAIA)
            { left: '48%', top: '70%' }, { left: '46%', top: '72%' }, { left: '50%', top: '68%' },
            
            // Scattered residential/suburban areas
            { left: '28%', top: '55%' }, { left: '82%', top: '30%' }, { left: '45%', top: '78%' },
            { left: '25%', top: '35%' }, { left: '85%', top: '60%' }, { left: '38%', top: '25%' }
          ];
          
          const position = roadPositions[index] || {
            // Fallback to more realistic grid-based positioning
            left: `${30 + (index % 6) * 8 + Math.random() * 3}%`,
            top: `${25 + Math.floor(index / 6) * 12 + Math.random() * 4}%`
          };
          
          // Realistic movement simulation (vehicles move along road directions)
          const time = Date.now() / 10000; // Slower movement
          const isMoving = !driver.isAvailable; // Only moving vehicles drift
          const movementOffset = isMoving ? {
            // Simulate road-following movement patterns
            x: Math.sin(time + index * 0.5) * 0.5 + Math.cos(time * 0.3 + index) * 0.2,
            y: Math.cos(time * 0.7 + index * 0.3) * 0.3 + Math.sin(time + index * 0.8) * 0.1
          } : {
            // Stationary vehicles have minimal drift (parking/waiting)
            x: Math.sin(time * 0.1 + index) * 0.1,
            y: 0
          };
          
          return (
            <div
              key={driver.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform duration-500"
              style={{
                left: `calc(${position.left} + ${movementOffset.x}px)`,
                top: `calc(${position.top} + ${movementOffset.y}px)`,
                transform: `translate(-50%, -50%) rotate(${Math.random() * 10 - 5}deg)`
              }}
            >
              {/* Realistic Vehicle Marker */}
              <div className="relative">
                {/* Vehicle Body */}
                <div className={`w-4 h-6 rounded-sm shadow-sm border transition-all duration-300 group-hover:scale-110 ${
                  driver.isAvailable 
                    ? 'bg-white border-emerald-500' 
                    : driver.status === 'busy' 
                    ? 'bg-yellow-100 border-amber-500'
                    : 'bg-blue-100 border-blue-500'
                }`}>
                  {/* Vehicle Icon inside */}
                  <div className="absolute inset-0 flex items-center justify-center text-[8px]">
                    {driver.primary_service === 'motorcycle' ? '🏍' : 
                     driver.primary_service === 'taxi' ? '🚖' :
                     driver.primary_service === 'suv' ? '🚙' : '🚗'}
                  </div>
                </div>
                
                {/* Status indicator dot */}
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm ${
                  driver.isAvailable 
                    ? 'bg-emerald-500' 
                    : driver.status === 'busy' 
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}>
                  {/* Subtle pulse for available drivers only */}
                  {driver.isAvailable && (
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40"></div>
                  )}
                </div>
              </div>

              {/* Realistic Tooltip */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20">
                <div className="bg-white px-2 py-1 rounded shadow-lg border text-xs min-w-max">
                  <div className="font-medium text-gray-800">{driver.first_name} {driver.last_name}</div>
                  <div className="text-xs text-gray-600 capitalize">
                    {driver.primary_service} • {driver.isAvailable ? 'Available' : 
                     driver.status === 'busy' ? 'On Trip' : 'Pickup'}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                  <div className="w-2 h-2 bg-white rotate-45 border-b border-r border-gray-200"></div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Emergency Alert Markers */}
        {[
          { id: 'alert-1', priority: 'critical', left: '65%', top: '40%' },
          { id: 'alert-2', priority: 'high', left: '30%', top: '60%' }
        ].map((alert, index) => (
          <div
            key={alert.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: alert.left, top: alert.top }}
          >
            {/* Alert Marker with Animated Ring */}
            <div className="relative">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
                <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
                  <div className="text-[8px]">⚠️</div>
                </div>
              </div>
            </div>

            {/* Alert Tooltip */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
              <div className="bg-red-50/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-xl border border-red-200/50 min-w-max">
                <div className="text-xs font-semibold text-red-800 flex items-center">
                  <span className="mr-1">🚨</span>
                  Emergency Alert
                </div>
                <div className="text-[10px] text-red-600 capitalize">{alert.priority} Priority</div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="w-2 h-2 bg-red-50/95 rotate-45 border-b border-r border-red-200/50"></div>
              </div>
            </div>
          </div>
        ))}

        {/* Realistic Trip Routes */}
        {fleetData.bookings.slice(0, 6).map((booking, index) => {
          // More realistic routes following actual Manila road patterns
          const realRoutes = [
            { 
              pickup: { left: '65%', top: '52%' }, // Makati
              dropoff: { left: '75%', top: '48%' }, // BGC
              waypoints: [{ left: '70%', top: '50%' }] // Via EDSA
            },
            { 
              pickup: { left: '52%', top: '22%' }, // QC Circle
              dropoff: { left: '48%', top: '70%' }, // Airport
              waypoints: [{ left: '58%', top: '45%' }, { left: '55%', top: '60%' }] // Via EDSA-MRT
            },
            { 
              pickup: { left: '42%', top: '40%' }, // Manila Bay
              dropoff: { left: '70%', top: '35%' }, // Ortigas
              waypoints: [{ left: '55%', top: '38%' }] // Via Shaw Blvd
            },
            { 
              pickup: { left: '76%', top: '50%' }, // BGC
              dropoff: { left: '35%', top: '45%' }, // Roxas Blvd
              waypoints: [{ left: '65%', top: '52%' }, { left: '50%', top: '48%' }] // Via Makati
            },
            { 
              pickup: { left: '38%', top: '25%' }, // Manila North
              dropoff: { left: '82%', top: '30%' }, // East Metro
              waypoints: [{ left: '60%', top: '27%' }] // Via Commonwealth
            },
            { 
              pickup: { left: '28%', top: '55%' }, // West suburbs
              dropoff: { left: '74%', top: '48%' }, // BGC
              waypoints: [{ left: '50%', top: '52%' }, { left: '65%', top: '50%' }] // Via city center
            }
          ];
          
          const route = realRoutes[index] || realRoutes[0];
          
          // Create curved path points
          const createCurvedPath = (start, waypoints, end) => {
            let pathPoints = [start];
            if (waypoints) pathPoints.push(...waypoints);
            pathPoints.push(end);
            return pathPoints;
          };
          
          const pathPoints = createCurvedPath(route.pickup, route.waypoints, route.dropoff);

          return (
            <div key={booking.id} className="absolute inset-0">
              {/* Realistic Route Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`realisticGradient${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4"/>
                  </linearGradient>
                </defs>
                
                {/* Main route path - curved to follow roads */}
                <path
                  d={`M ${parseFloat(route.pickup.left)} ${parseFloat(route.pickup.top)} ${
                    route.waypoints?.map(wp => `L ${parseFloat(wp.left)} ${parseFloat(wp.top)}`).join(' ') || ''
                  } L ${parseFloat(route.dropoff.left)} ${parseFloat(route.dropoff.top)}`}
                  stroke={`url(#realisticGradient${index})`}
                  strokeWidth="0.3"
                  strokeDasharray="2,1"
                  fill="none"
                  opacity="0.7"
                />
                
                {/* Direction indicators */}
                {route.waypoints && route.waypoints.map((waypoint, wpIndex) => (
                  <circle
                    key={wpIndex}
                    cx={parseFloat(waypoint.left)}
                    cy={parseFloat(waypoint.top)}
                    r="0.2"
                    fill="#3b82f6"
                    opacity="0.6"
                  />
                ))}
              </svg>

              {/* Realistic Pickup Point */}
              <div
                className="absolute w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: route.pickup.left, top: route.pickup.top }}
              >
                <div className="w-2 h-2 bg-green-500 border border-white rounded-full shadow-sm">
                  <div className="absolute inset-0 bg-green-500 rounded-full opacity-30 animate-ping"></div>
                </div>
                
                {/* Pickup tooltip */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-green-50 border border-green-200 px-2 py-1 rounded text-xs whitespace-nowrap shadow-sm">
                    <div className="text-green-800 font-medium">📍 Pickup</div>
                    <div className="text-green-600 text-xs">{booking.booking_reference}</div>
                  </div>
                </div>
              </div>

              {/* Realistic Dropoff Point */}
              <div
                className="absolute w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: route.dropoff.left, top: route.dropoff.top }}
              >
                <div className="w-2 h-2 bg-red-500 border border-white rounded-full shadow-sm"></div>
                
                {/* Dropoff tooltip */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-red-50 border border-red-200 px-2 py-1 rounded text-xs whitespace-nowrap shadow-sm">
                    <div className="text-red-800 font-medium">🎯 Dropoff</div>
                    <div className="text-red-600 text-xs">{booking.booking_reference}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Modern Demo Notice */}
        <div className="absolute bottom-6 left-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-emerald-400/40"></div>
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <span className="text-sm font-semibold text-slate-700">Live Simulation</span>
          </div>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Real-time fleet operations across Metro Manila
          </p>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span className="text-slate-600">{fleetData.drivers.filter(d => d.isAvailable).length} Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-slate-600">{fleetData.drivers.filter(d => d.status === 'busy').length} On Trip</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-slate-600">2 Alerts</span>
            </div>
          </div>
        </div>

        {/* Modern Location Label */}
        <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-xl">
          <div className="flex items-center space-x-2">
            <div className="text-lg">📍</div>
            <div>
              <div className="text-sm font-bold text-slate-800">Metro Manila</div>
              <div className="text-xs text-slate-600">Philippines Operations</div>
            </div>
          </div>
        </div>

        {/* Floating Action Elements */}
        <div className="absolute top-6 left-6 space-y-3">
          {/* Zoom Controls */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-2 shadow-xl">
            <div className="flex flex-col space-y-2">
              <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-slate-700 font-bold transition-all duration-200 hover:scale-105">
                +
              </button>
              <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-slate-700 font-bold transition-all duration-200 hover:scale-105">
                −
              </button>
            </div>
          </div>

          {/* Layer Toggle */}
          <button className="w-8 h-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center text-slate-700 shadow-xl hover:bg-white/20 transition-all duration-200 hover:scale-105">
            <div className="text-xs">🗂️</div>
          </button>
        </div>

        {/* Modern Status Indicators */}
        <div className="absolute bottom-6 right-6 space-y-2">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-xl">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-700">Real-time Updates</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-xl">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs font-medium text-slate-700">AI Enhanced</span>
            </div>
          </div>
        </div>

        {/* Subtle Animation Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full"></div>
    </div>
  );
}

// Add displayName for debugging
LiveMap.displayName = 'LiveMap';

export default memo(LiveMap);