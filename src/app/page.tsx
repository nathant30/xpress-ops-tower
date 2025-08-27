import dynamic from 'next/dynamic';

// Import the operations dashboard with no SSR to avoid hydration issues with WebSocket connections
const OperationsDashboard = dynamic(
  () => import('@/components/features/OperationsDashboard'),
  { ssr: false }
);

export default function HomePage() {
  // Get Google Maps API key from environment variables
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Default region for Metro Manila
  const regionId = 'NCR-MM-001';
  
  // Mock user role - would come from authentication context
  const userRole = 'operator' as 'admin' | 'operator' | 'supervisor' | 'viewer';
  
  // Mock user ID - would come from authentication context
  const userId = 'user-001';

  return (
    <OperationsDashboard
      googleMapsApiKey={googleMapsApiKey}
      userRole={userRole}
      regionId={regionId}
      userId={userId}
    />
  );
}