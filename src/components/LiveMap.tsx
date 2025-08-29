'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Users, AlertTriangle } from 'lucide-react';

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
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default function LiveMap({ 
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
  onStatusFilterChange 
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

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // For demo purposes, show a mock map if no API key is provided
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      // Show fallback map interface
      setTimeout(() => setIsLoaded(true), 1000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization,geometry,drawing`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      // Fallback to mock interface
      setIsLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
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

      console.log('✅ Google Maps initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Maps:', error);
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

        polygon.addListener('click', (e: any) => {
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

    // Add trip info box similar to reference image
    const tripInfoDiv = document.createElement('div');
    tripInfoDiv.innerHTML = `
      <div style="
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
        if (driver.status === 'busy' && (driver as any).currentTrip) {
          showDriverTripDetails(driver as any);
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
      markersRef.current.set(`booking_route_${booking.id}`, routePath as any);
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
      <div className={`relative bg-gradient-to-br from-blue-100 to-green-100 ${className}`}>
        {/* Mock Map Interface */}
        <div className="absolute inset-0 bg-gray-200 bg-opacity-50">
          <svg className="w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#888" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Driver Markers */}
        {drivers.map((driver, index) => (
          <div
            key={driver.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${20 + index * 25}%`,
              top: `${30 + (index % 3) * 20}%`,
            }}
          >
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
              driver.isAvailable ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
            </div>
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs whitespace-nowrap">
              {driver.first_name} {driver.last_name}
            </div>
          </div>
        ))}

        {/* Alert Markers */}
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              right: `${20 + index * 15}%`,
              bottom: `${30 + index * 15}%`,
            }}
          >
            <div className="w-4 h-4 bg-red-500 transform rotate-45 border-2 border-white shadow-lg"></div>
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-50 px-2 py-1 rounded shadow text-xs whitespace-nowrap border border-red-200">
              🚨 {alert.priority}
            </div>
          </div>
        ))}

        {/* Booking Routes */}
        {bookings.map((booking, index) => (
          <div key={booking.id}>
            <div
              className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${40 + index * 20}%`,
                top: `${40}%`,
              }}
            ></div>
            <div
              className="absolute w-3 h-3 bg-purple-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${60 + index * 15}%`,
                top: `${60}%`,
              }}
            ></div>
            <svg className="absolute inset-0 pointer-events-none">
              <line
                x1={`${40 + index * 20}%`}
                y1="40%"
                x2={`${60 + index * 15}%`}
                y2="60%"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        ))}

        {/* Demo Notice */}
        <div className="absolute bottom-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-yellow-800">Mock Map View</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Showing simulated data. Configure Google Maps API for live view.
          </p>
        </div>

        {/* Manila Label */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow">
          <div className="text-sm font-semibold">📍 Metro Manila, Philippines</div>
          <div className="text-xs text-gray-600">Fleet Operations Coverage Area</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* Map Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Fleet Tracking</h3>
              <p className="text-sm text-gray-600">Real-time driver locations and alerts</p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <button 
                onClick={() => onStatusFilterChange?.(activeStatusFilter === 'available' ? null : 'available')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors ${
                  activeStatusFilter === 'available' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Available (89)</span>
              </button>
              <button 
                onClick={() => onStatusFilterChange?.(activeStatusFilter === 'busy' ? null : 'busy')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors ${
                  activeStatusFilter === 'busy' ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>On Trip (67)</span>
              </button>
              <button 
                onClick={() => onStatusFilterChange?.(activeStatusFilter === 'pickup' ? null : 'pickup')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors ${
                  activeStatusFilter === 'pickup' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Pickup (24)</span>
              </button>
              <button 
                onClick={() => onStatusFilterChange?.(activeStatusFilter === 'dropoff' ? null : 'dropoff')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors ${
                  activeStatusFilter === 'dropoff' ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Dropoff (18)</span>
              </button>
              <button 
                onClick={() => onStatusFilterChange?.(activeStatusFilter === 'emergency' ? null : 'emergency')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors ${
                  activeStatusFilter === 'emergency' ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-red-500"></div>
                <span>Emergency Alert (2)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full flex-1"></div>

      {/* Map Legend */}
      <div className="bg-gray-50 p-3 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Available Driver</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Busy Driver</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Pickup</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Dropoff</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>Emergency Alert</span>
            </div>
          </div>
          <div className="text-xs">
            Click markers for details • Updates every 30s
          </div>
        </div>
      </div>
    </div>
  );
}