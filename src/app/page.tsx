'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the OperationsDashboard to avoid SSR issues
const OperationsDashboard = dynamic(() => import('@/components/features/OperationsDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-neutral-600">Loading Xpress Ops Tower...</p>
      </div>
    </div>
  )
});

export default function HomePage() {
  // Default Google Maps API key placeholder - in production this should be loaded from environment
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  
  return (
    <OperationsDashboard
      googleMapsApiKey={googleMapsApiKey}
      userRole="admin"
      regionId="NCR-MM-001" // Metro Manila
      userId="user-ops-001"
    />
  );
}