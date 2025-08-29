'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SafetyAlert {
  id: string;
  latitude: number;
  longitude: number;
  priority: 'critical' | 'high' | 'medium';
  title: string;
  status: string;
}

interface ERTMember {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'Available' | 'On Dispatch' | 'Unavailable';
}

interface SafetyAlertMapProps {
  alerts?: SafetyAlert[];
  ertMembers?: ERTMember[];
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function SafetyAlertMap({ 
  alerts = [], 
  ertMembers = [], 
  className = '' 
}: SafetyAlertMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Manila, Philippines coordinates
  const defaultCenter = { lat: 14.5995, lng: 120.9842 };

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
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
    if (!isLoaded || !mapRef.current || mapInstance.current || !window.google?.maps) return;

    try {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
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

      console.log('✅ Safety Alert Map initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Safety Alert Map:', error);
    }
  }, [isLoaded]);

  // Add markers when map is ready and data changes
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add safety alert markers
    alerts.forEach(alert => {
      const marker = new google.maps.Marker({
        position: { lat: alert.latitude, lng: alert.longitude },
        map: mapInstance.current,
        title: alert.title,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="${getPriorityColor(alert.priority)}" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        },
        zIndex: 1000
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 150px;">
            <div style="font-weight: bold; color: ${getPriorityColor(alert.priority)}; margin-bottom: 4px;">
              ${alert.title}
            </div>
            <div style="font-size: 12px; color: #666;">
              Priority: ${alert.priority.toUpperCase()}
            </div>
            <div style="font-size: 12px; color: #666;">
              Status: ${alert.status}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Add ERT member markers
    ertMembers.forEach(member => {
      const marker = new google.maps.Marker({
        position: { lat: member.latitude, lng: member.longitude },
        map: mapInstance.current,
        title: `${member.name} - ${member.status}`,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="${getERTStatusColor(member.status)}" stroke="white" stroke-width="2"/>
              <text x="10" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold">ERT</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(20, 20),
          anchor: new google.maps.Point(10, 10)
        },
        zIndex: 900
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 120px;">
            <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
              ${member.name}
            </div>
            <div style="font-size: 12px; color: #666;">
              Status: ${member.status}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });

  }, [alerts, ertMembers, isLoaded]);

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      default: return '#6b7280';
    }
  };

  const getERTStatusColor = (status: string): string => {
    switch (status) {
      case 'Available': return '#059669';
      case 'On Dispatch': return '#2563eb';
      case 'Unavailable': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (!isLoaded) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-xs">Loading safety map...</p>
        </div>
      </div>
    );
  }

  if (!window.google?.maps) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-gray-600 text-sm mb-2">Map Unavailable</div>
          <div className="text-gray-500 text-xs">Google Maps could not be loaded</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}