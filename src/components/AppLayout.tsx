'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RidesharingSidebar from '@/components/features/RidesharingSidebar';
import { RefreshCw, Menu, X, Loader2 } from 'lucide-react';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import { useAuth } from '@/hooks/useAuth';

interface HealthStatus {
  status: string;
  services: {
    api: string;
    database: string;
    websockets: string;
    location_tracking: string;
    emergency_system: string;
  };
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedServiceType, setSelectedServiceType, serviceTypes } = useServiceType();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [activeTab, setActiveTab] = useState('Overview');

  // Contextual service filtering logic
  const serviceTypeApplicablePages = {
    Dashboard: ['overview', 'live map', 'performance', 'demand', 'drivers', 'bookings', 'sos', 'fraud', 'analytics'],
    Drivers: ['active drivers', 'suspended drivers', 'banned drivers']
  };

  const shouldShowServiceFilter = () => {
    const path = pathname.substring(1) || 'dashboard';
    if (path === 'dashboard') {
      // For dashboard, show service filter on all tabs since all are service-applicable
      return true;
    }
    if (path === 'drivers') {
      // For drivers page, always show service filter since it's applicable to all driver management tabs
      return true;
    }
    return false;
  };

  // TEMPORARILY DISABLED - Authentication check - redirect to login if not authenticated
  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     const currentPath = pathname;
  //     const isPublicPath = currentPath === '/login';
  //     
  //     if (!isPublicPath) {
  //       router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  //     }
  //   }
  // }, [authLoading, isAuthenticated, pathname, router]);

  // Health status monitoring
  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        setHealthStatus(healthData.data);
      } catch (error) {
        console.error('Error fetching health status:', error);
      }
    };

    fetchHealthStatus();
    
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update active section based on current path
  useEffect(() => {
    const path = pathname.substring(1) || 'dashboard';
    const sectionMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'live-map': 'Live Map',
      'bookings': 'Bookings',
      'drivers': 'Drivers',
      'passengers': 'Passengers',
      'safety': 'Safety', 
      'reports': 'Reports',
      'settings': 'Settings'
    };
    const section = sectionMap[path] || 'Dashboard';
    if (section !== activeSection) {
      setActiveSection(section);
    }
  }, [pathname, activeSection]);

  // TEMPORARILY DISABLED - Show loading screen while checking authentication
  // if (authLoading) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
  //         <p className="text-neutral-600">Authenticating...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Don't render the main layout for login page and driver profile page
  if (pathname === '/login' || pathname === '/driver-profile') {
    return <>{children}</>;
  }

  // TEMPORARILY DISABLED - Don't render anything if not authenticated (will redirect)
  // if (!isAuthenticated) {
  //   return null;
  // }

  const refreshData = () => {
    setLastRefresh(new Date());
    window.location.reload();
  };

  const getPageTitle = () => {
    const path = pathname.substring(1);
    switch (path) {
      case '':
      case 'dashboard':
        return 'Dashboard';
      case 'live-map':
        return 'Live Map';
      case 'bookings':
        return 'Bookings';
      case 'drivers':
        return 'Driver Management';
      case 'passengers':
        return 'Passenger Analytics';
      case 'dispatch':
        return 'Dispatch Control';
      case 'alerts':
        return 'Alert Management';
      case 'earnings':
        return 'Earnings & Revenue';
      case 'safety':
        return 'Safety & Security';
      case 'reports':
        return 'Reports & Analytics';
      case 'support':
        return 'Customer Support';
      case 'settings':
        return 'System Settings';
      default:
        return 'Operations Dashboard';
    }
  };

  const getPageDescription = () => {
    const path = pathname.substring(1);
    switch (path) {
      case '':
      case 'dashboard':
        return 'Real-time overview of operations and key performance indicators';
      case 'live-map':
        return 'Real-time vehicle tracking and demand heatmap visualization';
      case 'bookings':
        return 'Trip management and booking analytics';
      case 'drivers':
        return 'Driver fleet management and performance analytics';
      case 'passengers':
        return 'Passenger experience monitoring and support management';
      case 'dispatch':
        return 'Manual dispatch control and route optimization';
      case 'alerts':
        return 'Emergency response and safety incident management';
      case 'earnings':
        return 'Revenue tracking and financial performance analysis';
      case 'safety':
        return 'Safety protocols and incident reporting system';
      case 'reports':
        return 'Business intelligence and operational analytics';
      case 'support':
        return 'Customer service and support ticket management';
      case 'settings':
        return 'System configuration and administrative tools';
      default:
        return 'Professional ridesharing operations management';
    }
  };

  const getCurrentPageId = () => {
    const path = pathname.substring(1);
    return path || 'dashboard';
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Set default tab for each section
    const defaultTabs: { [key: string]: string } = {
      'Dashboard': 'Overview',
      'Drivers': 'Active Drivers',
      'Passengers': 'Active Passengers', 
      'Safety': 'Overview',
      'Reports': 'Operations',
      'Settings': 'System Health'
    };
    setActiveTab(defaultTabs[section] || 'Overview');
  };


  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:block">
        <RidesharingSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          activeItem={getCurrentPageId()}
          activeSection={activeSection}
          activeTab={activeTab}
          onItemSelect={(itemId) => {
            // This will be handled by the sidebar itself now
          }}
          onSectionChange={handleSectionChange}
          userInfo={{
            name: user ? `${user.firstName} ${user.lastName}` : 'Demo User',
            role: user?.role || 'Admin'
          }}
          notifications={3}
          onLogout={logout}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0">
            <RidesharingSidebar
              collapsed={false}
              onCollapsedChange={() => {}}
              activeItem={getCurrentPageId()}
              activeSection={activeSection}
              activeTab={activeTab}
              onItemSelect={(itemId) => {
                setMobileMenuOpen(false);
              }}
              onSectionChange={handleSectionChange}
              userInfo={{
                name: user ? `${user.firstName} ${user.lastName}` : 'Demo User',
                role: user?.role || 'Admin'
              }}
              notifications={3}
              onLogout={logout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Hide for pages with custom headers */}
        {!['bookings', 'live-map'].includes(pathname.substring(1)) && (
          <header className="bg-white shadow-sm border-b border-gray-100 px-4 md:px-6 py-2 md:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Mobile menu button */}
                <button
                  className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-600"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                  <p className="text-gray-600 text-xs md:text-sm">{getPageDescription()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Service Type Filter - Only show on applicable pages */}
                {shouldShowServiceFilter() && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600 font-medium">Service:</span>
                    <select 
                      value={selectedServiceType}
                      onChange={(e) => setSelectedServiceType(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {serviceTypes.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.icon} {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                  <span className="text-xs font-medium text-gray-700">
                    {healthStatus?.status === 'healthy' ? 'All Systems OK' : 'System Issues'}
                  </span>
                </div>
                
                <button
                  onClick={refreshData}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Main Page Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 py-3 md:py-4">
          <div className="px-4 md:px-8 text-center text-xs md:text-sm text-gray-600">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live Data: {lastRefresh.toLocaleTimeString()}</span>
              </div>
              <span className="hidden md:inline text-gray-400">•</span>
              <span className="hidden md:inline">Professional Ridesharing Operations Dashboard</span>
              <span className="hidden md:inline text-gray-400">•</span>
              <span className="md:hidden">Xpress Operations</span>
              <span className="hidden md:inline">Real-time Fleet Management System</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}