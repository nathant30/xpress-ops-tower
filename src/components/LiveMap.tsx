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

interface LiveMapProps {
  drivers?: Driver[];
  alerts?: Alert[];
  bookings?: Booking[];
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default function LiveMap({ drivers = [], alerts = [], bookings = [], className = '' }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Manila, Philippines coordinates as default center
  const defaultCenter = { lat: 14.5995, lng: 120.9842 };

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps script');
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

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
  }, []);

  // Add driver markers
  const addDriverMarkers = useCallback(() => {
    if (!mapInstance.current || !drivers.length) return;

    drivers.forEach(driver => {
      const position = { lat: driver.latitude, lng: driver.longitude };
      const markerId = `driver_${driver.id}`;

      // Create custom marker icon based on driver status
      const iconColor = driver.status === 'active' && driver.isAvailable ? '#10b981' : 
                       driver.status === 'busy' ? '#f59e0b' : '#6b7280';
      
      const marker = new google.maps.Marker({
        position,
        map: mapInstance.current,
        title: `${driver.first_name} ${driver.last_name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-[200px]">
            <div class="font-semibold text-gray-900 mb-2">
              ${driver.first_name} ${driver.last_name}
            </div>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Status:</span>
                <span class="font-medium ${driver.status === 'active' ? 'text-green-600' : 'text-gray-600'}">
                  ${driver.status}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Service:</span>
                <span class="font-medium">${driver.primary_service.replace('_', ' ')}</span>
              </div>
              <div class="flex justify-between">
                <span>Rating:</span>
                <span class="font-medium">⭐ ${driver.rating}</span>
              </div>
              <div class="flex justify-between">
                <span>Available:</span>
                <span class="font-medium ${driver.isAvailable ? 'text-green-600' : 'text-red-600'}">
                  ${driver.isAvailable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedDriver(driver);
      });

      markersRef.current.set(markerId, marker);
    });
  }, [drivers]);

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
    if (!mapInstance.current || !bookings.length) return;

    bookings.forEach(booking => {
      if (booking.status !== 'in_progress') return;

      const pickupPosition = { lat: booking.pickup_latitude, lng: booking.pickup_longitude };
      const dropoffPosition = { lat: booking.dropoff_latitude, lng: booking.dropoff_longitude };

      // Pickup marker
      const pickupMarker = new google.maps.Marker({
        position: pickupPosition,
        map: mapInstance.current,
        title: `Pickup - ${booking.booking_reference}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Dropoff marker
      const dropoffMarker = new google.maps.Marker({
        position: dropoffPosition,
        map: mapInstance.current,
        title: `Dropoff - ${booking.booking_reference}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#8b5cf6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Route line
      const routePath = new google.maps.Polyline({
        path: [pickupPosition, dropoffPosition],
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstance.current
      });

      markersRef.current.set(`booking_pickup_${booking.id}`, pickupMarker);
      markersRef.current.set(`booking_dropoff_${booking.id}`, dropoffMarker);
      markersRef.current.set(`booking_route_${booking.id}`, routePath as any);
    });
  }, [bookings]);

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

  return (
    <div className={`relative bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* Map Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live Fleet Tracking</h3>
            <p className="text-sm text-gray-600">Real-time driver locations and alerts</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available ({drivers.filter(d => d.isAvailable).length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Busy ({drivers.filter(d => d.status === 'busy').length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Alerts ({alerts.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-96"></div>

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