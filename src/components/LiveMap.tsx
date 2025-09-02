'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LiveMapProps {
  className?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

// Proper Maps JavaScript API implementation
function LiveMap({ className = '', ...props }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const apiKey = 'AIzaSyCvA59SPvyOeSKPI4y6r-AL97gn1Fq-v-c';
  
  console.log('🗺️ Maps JavaScript API - Initializing');
  
  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('🗺️ Maps JavaScript API - Already loaded, initializing map');
      initializeMap();
      return;
    }

    // Create unique callback name to avoid conflicts
    const callbackName = `initGoogleMap_${Date.now()}`;
    
    // Set up global callback
    (window as any)[callbackName] = () => {
      console.log('🗺️ Maps JavaScript API - Script loaded successfully');
      setIsLoaded(true);
      initializeMap();
      // Clean up callback
      delete (window as any)[callbackName];
    };
    
    // Create script element - use exact same URL format as working HTML
    const script = document.createElement('script');
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&v=weekly`;
    
    // Debug logging to check for the extra "8"
    console.log('🗺️ DEBUG - API Key:', apiKey);
    console.log('🗺️ DEBUG - Callback Name:', callbackName);
    console.log('🗺️ DEBUG - Script URL:', scriptUrl);
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    
    // Add exact same attributes as working HTML
    script.setAttribute('type', 'text/javascript');
    
    script.onerror = (error) => {
      console.error('🗺️ Maps JavaScript API - Script failed to load:', error);
      console.error('🗺️ Script src was:', script.src);
      console.error('🗺️ Error details:', error);
      setHasError(true);
      setErrorMessage(`Script load failed: ${script.src}`);
      delete (window as any)[callbackName];
    };
    
    console.log('🗺️ Maps JavaScript API - Adding script with src:', script.src);
    
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any)[callbackName];
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) {
      console.log('🗺️ Maps JavaScript API - Not ready to initialize');
      return;
    }
    
    try {
      console.log('🗺️ Maps JavaScript API - Creating map instance');
      
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 11,
        center: { lat: 14.5995, lng: 120.9842 }, // Manila
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        backgroundColor: '#e5e5e5',
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }]
          }
        ]
      });
      
      // Add marker
      const marker = new window.google.maps.Marker({
        position: { lat: 14.5995, lng: 120.9842 },
        map: map,
        title: 'Manila - Maps JavaScript API Working!',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ff0000',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      
      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: '<div style="padding: 10px;"><h3>🗺️ Maps JavaScript API</h3><p>Successfully loaded and working!</p></div>'
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      // Open info window immediately to show it's working
      setTimeout(() => {
        infoWindow.open(map, marker);
      }, 1000);
      
      mapInstanceRef.current = map;
      setIsReady(true);
      
      console.log('🗺️ Maps JavaScript API - Map initialized successfully!');
      
    } catch (error) {
      console.error('🗺️ Maps JavaScript API - Initialization error:', error);
      setHasError(true);
      setErrorMessage(`Map initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (hasError) {
    return (
      <div className={`border-2 border-red-500 bg-red-50 ${className}`} style={{ minHeight: '400px' }}>
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <div className="text-red-600 text-xl font-bold mb-4">❌ Maps API Error</div>
            <div className="text-red-700 mb-4">{errorMessage}</div>
            <div className="text-sm text-gray-600">
              Check browser console for detailed error information
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded || !isReady) {
    return (
      <div className={`border-2 border-blue-500 ${className}`} style={{ minHeight: '400px', position: 'relative' }}>
        <div className="text-center p-2 bg-blue-50 text-blue-700 text-sm border-b border-blue-200">
          🗺️ Maps JavaScript API - {!isLoaded ? 'Loading Script...' : 'Initializing Map...'}
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-blue-600 font-medium">
              {!isLoaded ? 'Loading Google Maps API...' : 'Creating Map...'}
            </div>
          </div>
        </div>
        {/* Map container (hidden during loading) */}
        <div ref={mapRef} style={{ width: '100%', height: 'calc(100% - 40px)', minHeight: '360px', visibility: 'hidden' }} />
      </div>
    );
  }

  return (
    <div className={`border-2 border-green-500 ${className}`} style={{ minHeight: '400px' }}>
      <div className="text-center p-2 bg-green-50 text-green-700 text-sm border-b border-green-200">
        🗺️ Maps JavaScript API - ✅ Ready & Interactive!
      </div>
      <div 
        ref={mapRef}
        style={{ 
          width: '100%', 
          height: 'calc(100% - 40px)',
          minHeight: '360px'
        }}
      />
    </div>
  );
}

export default LiveMap;