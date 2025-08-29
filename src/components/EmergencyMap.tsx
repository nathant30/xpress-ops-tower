'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Car, Building2, MapPin, Signal, Zap } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

interface EmergencyMapProps {
  incident: {
    currentLocation?: {
      lat: number;
      lng: number;
    };
  };
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function EmergencyMap({ incident }: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila
        const incidentLocation = incident.currentLocation || defaultLocation;

        const mapOptions = {
          center: incidentLocation,
          zoom: 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ],
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative'
        };

        const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);

        // Add emergency vehicle marker
        const emergencyMarker = new window.google.maps.Marker({
          position: incidentLocation,
          map: googleMap,
          title: 'Emergency Vehicle',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        // Add hospital markers (example locations near Manila)
        const hospitals = [
          { name: "St. Luke's Medical Center", lat: 14.6042, lng: 120.9822 },
          { name: "Makati Medical Center", lat: 14.5547, lng: 121.0244 },
          { name: "Philippine General Hospital", lat: 14.5776, lng: 120.9845 }
        ];

        hospitals.forEach(hospital => {
          new window.google.maps.Marker({
            position: { lat: hospital.lat, lng: hospital.lng },
            map: googleMap,
            title: hospital.name,
            icon: {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });
        });

        // Add route from current location to nearest hospital
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#ef4444',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });

        directionsRenderer.setMap(googleMap);

        const nearestHospital = hospitals[0]; // St. Luke's for demo
        directionsService.route({
          origin: incidentLocation,
          destination: { lat: nearestHospital.lat, lng: nearestHospital.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        }, (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
          }
        });

        setMap(googleMap);
        setIsLoaded(true);
        setError(null);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize Google Maps');
      }
    };

    initGoogleMaps();

    // Cleanup is handled by the singleton loader
  }, [incident]);

  if (error) {
    return (
      <div className="relative h-64 mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-slate-800 via-gray-800 to-blue-900">
        {/* Fallback visual map when Google Maps fails */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <Car className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              EMERGENCY VEHICLE
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>
          </div>
        </div>

        <div className="absolute top-6 right-8 z-20">
          <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded text-xs">
            <Building2 className="w-3 h-3" />
            <span>ST. LUKE'S - 2.1km</span>
          </div>
        </div>

        <div className="absolute top-3 left-3 bg-red-900 bg-opacity-90 text-white rounded p-2 text-xs z-10">
          <div className="flex items-center mb-1">
            <Zap size={12} className="mr-1 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">FALLBACK MODE</span>
          </div>
          <div className="text-xs opacity-75">Google Maps unavailable</div>
        </div>

        <div className="absolute bottom-3 left-3 bg-blue-900 bg-opacity-90 text-blue-100 rounded p-2 text-xs z-10">
          <div>LAT: {incident.currentLocation?.lat.toFixed(6)}</div>
          <div>LNG: {incident.currentLocation?.lng.toFixed(6)}</div>
          <div className="flex items-center mt-1">
            <Signal size={12} className="mr-1 text-green-400" />
            <span className="text-green-400">GPS: HIGH ACCURACY</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 bg-red-600 bg-opacity-90 text-white rounded p-2 text-xs z-10">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            <span className="font-semibold">LIVE TRACKING</span>
          </div>
          <div className="mt-1">Unit: EMS-07</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 mb-3 rounded-lg overflow-hidden">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '256px' }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading Google Maps...</p>
          </div>
        </div>
      )}

      {/* Emergency Overlay Info */}
      <div className="absolute top-3 left-3 bg-black bg-opacity-80 text-white rounded p-2 text-xs z-10">
        <div className="flex items-center mb-1">
          <Zap size={12} className="mr-1 text-red-400" />
          <span className="text-red-400 font-semibold">EMERGENCY MODE</span>
        </div>
        <div>Speed: 45 km/h</div>
        <div>ETA Hospital: 4min</div>
        <div>Distance: 2.1km</div>
      </div>
      
      {/* Live GPS Coordinates */}
      <div className="absolute bottom-3 left-3 bg-blue-900 bg-opacity-90 text-blue-100 rounded p-2 text-xs z-10">
        <div>LAT: {incident.currentLocation?.lat.toFixed(6)}</div>
        <div>LNG: {incident.currentLocation?.lng.toFixed(6)}</div>
        <div className="flex items-center mt-1">
          <Signal size={12} className="mr-1 text-green-400" />
          <span className="text-green-400">GPS: HIGH ACCURACY</span>
        </div>
      </div>

      {/* Emergency Response Status */}
      <div className="absolute top-3 right-3 bg-red-600 bg-opacity-90 text-white rounded p-2 text-xs z-10">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
          <span className="font-semibold">LIVE TRACKING</span>
        </div>
        <div className="mt-1">Unit: EMS-07</div>
      </div>
    </div>
  );
}