'use client';

import React from 'react';
import { Shield, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PermissionGate } from '@/hooks/useRBAC';

export default function RolesPage() {
  const router = useRouter();

  // Redirect to settings page with users tab active
  React.useEffect(() => {
    router.push('/settings?tab=users');
  }, [router]);

  return (
    <PermissionGate 
      permissions={['manage_users', 'assign_roles']} 
      requireAll={false}
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to manage roles. Contact your administrator for access.
            </p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Redirecting...</h2>
          <p className="text-gray-600">
            Taking you to the User Management section.
          </p>
        </div>
      </div>
    </PermissionGate>
  );
}