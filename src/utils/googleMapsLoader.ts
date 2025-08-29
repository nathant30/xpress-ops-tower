// Google Maps API Loader Singleton
// Ensures Google Maps API is loaded only once across the entire application

let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export const loadGoogleMapsAPI = async (): Promise<void> => {
  // Return immediately if already loaded
  if (isLoaded && window.google) {
    return Promise.resolve();
  }

  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingScript && window.google) {
    isLoaded = true;
    return Promise.resolve();
  }

  // Start loading
  isLoading = true;
  
  loadPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'demo-key') {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    // Create unique callback name
    const callbackName = `initGoogleMaps${Date.now()}`;
    
    // Set up global callback
    (window as any)[callbackName] = () => {
      isLoaded = true;
      isLoading = false;
      // Clean up callback
      delete (window as any)[callbackName];
      resolve();
    };

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,visualization&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      isLoading = false;
      // Clean up callback
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add to document head if not already present
    if (!existingScript) {
      document.head.appendChild(script);
    }
  });

  return loadPromise;
};