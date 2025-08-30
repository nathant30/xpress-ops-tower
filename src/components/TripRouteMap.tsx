'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Car, Navigation, Clock } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { logger } from '@/lib/security/productionLogger';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface TripRouteMapProps {
  pickupLocation: Location;
  dropoffLocation: Location;
  currentLocation: Location & { speed?: number };
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function TripRouteMap({ 
  pickupLocation, 
  dropoffLocation, 
  currentLocation, 
  className = "" 
}: TripRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);

  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        await loadGoogleMapsAPI();
        initializeMap();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load Google Maps');
      }
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      try {
        const mapOptions = {
          zoom: 12,
          center: currentLocation,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels.text",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "poi.business",
              stylers: [{ visibility: "off" }]
            }
          ],
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'cooperative'
        };

        const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Create markers array
        const newMarkers: any[] = [];

        // Pickup Location Marker (Green)
        const pickupMarker = new window.google.maps.Marker({
          position: pickupLocation,
          map: googleMap,
          title: `Pickup: ${pickupLocation.address}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        const pickupInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; color: #1f2937;">
              <div style="font-weight: bold; color: #22c55e; margin-bottom: 4px;">
                📍 PICKUP LOCATION
              </div>
              <div style="font-size: 14px;">${pickupLocation.address}</div>
            </div>
          `
        });

        pickupMarker.addListener('click', () => {
          pickupInfoWindow.open(googleMap, pickupMarker);
        });

        newMarkers.push(pickupMarker);

        // Current Location Marker (Blue, Animated)
        const currentMarker = new window.google.maps.Marker({
          position: currentLocation,
          map: googleMap,
          title: `Current Location: ${currentLocation.address}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            animation: window.google.maps.Animation.BOUNCE
          }
        });

        const currentInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; color: #1f2937;">
              <div style="font-weight: bold; color: #3b82f6; margin-bottom: 4px;">
                🚗 CURRENT LOCATION
              </div>
              <div style="font-size: 14px; margin-bottom: 4px;">${currentLocation.address}</div>
              <div style="font-size: 12px; color: #6b7280;">
                Speed: ${currentLocation.speed || 0} km/h
              </div>
            </div>
          `
        });

        currentMarker.addListener('click', () => {
          currentInfoWindow.open(googleMap, currentMarker);
        });

        newMarkers.push(currentMarker);

        // Dropoff Location Marker (Red)
        const dropoffMarker = new window.google.maps.Marker({
          position: dropoffLocation,
          map: googleMap,
          title: `Dropoff: ${dropoffLocation.address}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        const dropoffInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; color: #1f2937;">
              <div style="font-weight: bold; color: #ef4444; margin-bottom: 4px;">
                🎯 DESTINATION
              </div>
              <div style="font-size: 14px;">${dropoffLocation.address}</div>
            </div>
          `
        });

        dropoffMarker.addListener('click', () => {
          dropoffInfoWindow.open(googleMap, dropoffMarker);
        });

        newMarkers.push(dropoffMarker);

        // Create directions service for route
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // We'll use our custom markers
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });

        directionsRendererInstance.setMap(googleMap);

        // Calculate and display the route
        directionsService.route({
          origin: pickupLocation,
          destination: dropoffLocation,
          waypoints: [
            {
              location: currentLocation,
              stopover: false
            }
          ],
          travelMode: window.google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        }, (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRendererInstance.setDirections(result);
          } else {
            logger.warn('Directions request failed', { status }, { component: 'TripRouteMap' });
            // Draw a simple polyline if directions fail
            const routePath = new window.google.maps.Polyline({
              path: [pickupLocation, currentLocation, dropoffLocation],
              geodesic: true,
              strokeColor: '#3b82f6',
              strokeOpacity: 0.6,
              strokeWeight: 3
            });
            routePath.setMap(googleMap);
          }
        });

        // Fit map to show all markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(pickupLocation);
        bounds.extend(currentLocation);
        bounds.extend(dropoffLocation);
        googleMap.fitBounds(bounds);
        
        // Ensure minimum zoom level
        const listener = window.google.maps.event.addListener(googleMap, "idle", function() {
          if (googleMap.getZoom() > 16) googleMap.setZoom(16);
          window.google.maps.event.removeListener(listener);
        });

        setMap(googleMap);
        setMarkers(newMarkers);
        setDirectionsRenderer(directionsRendererInstance);
        setIsLoaded(true);
        setError(null);
      } catch (err) {
        logger.error('Error initializing map', { component: 'TripRouteMap' });
        setError('Failed to initialize Google Maps');
      }
    };

    initGoogleMaps();

    // Cleanup
    return () => {
      markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      if (directionsRenderer && directionsRenderer.setMap) {
        directionsRenderer.setMap(null);
      }
    };
  }, [pickupLocation, dropoffLocation, currentLocation]);

  if (error) {
    return (
      <div className={`relative bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400 p-8">
          <MapPin className="w-12 h-12 mx-auto mb-3" />
          <div className="text-sm font-medium mb-1">Map Unavailable</div>
          <div className="text-xs">Google Maps failed to load</div>
          <div className="mt-4 space-y-2 text-left bg-slate-600 rounded p-3">
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs">Pickup: {pickupLocation.address}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Current: {currentLocation.address}</span>
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs">Destination: {dropoffLocation.address}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-700 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm">Loading route map...</p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute top-3 right-3 bg-black bg-opacity-80 text-white rounded p-2 text-xs z-10">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <Navigation className="w-3 h-3" />
          TRIP ROUTE
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Destination</span>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div className="absolute top-3 left-3 bg-blue-900 bg-opacity-90 text-white rounded p-2 text-xs z-10">
        <div className="flex items-center mb-1">
          <Car className="w-3 h-3 mr-1" />
          <span className="font-semibold">LIVE TRACKING</span>
        </div>
        <div>Speed: {currentLocation.speed || 0} km/h</div>
        <div className="flex items-center mt-1">
          <Clock className="w-3 h-3 mr-1" />
          <span>Real-time GPS</span>
        </div>
      </div>
    </div>
  );
}