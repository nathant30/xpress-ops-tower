'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RidesharingSidebar from '@/components/features/RidesharingSidebar';
import { RefreshCw, Menu, X, Loader2, User, Bell, ChevronDown, LogOut, Settings, UserCircle, Shield } from 'lucide-react';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/lib/security/productionLogger';

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
  const { user, isAuthenticated, isLoading: authLoading, logout } = useEnhancedAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);
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
        logger.error('Error fetching health status', { component: 'AppLayout' });
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
      'regions': 'Regions',
      'bookings': 'Bookings',
      'drivers': 'Drivers',
      'passengers': 'Passengers',
      'safety': 'Safety',
      'fraud-protect': 'Fraud Protect',
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
      case 'regions':
        return 'Regional Management';
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
      case 'fraud-protect':
        return 'Fraud Management';
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
      case 'regions':
        return 'Manage service regions, coverage areas, and regional operations';
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
      case 'fraud-protect':
        return 'Comprehensive fraud detection, review, and configuration';
      case 'reports':
        return 'Business intelligence and operational analytics';
      case 'support':
        return 'Customer service and support ticket management';
      case 'settings':
        return 'System configuration and administrative tools';
      default:
        return 'Xpress Ops Tower - Advanced operations management platform';
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
    <div className="h-screen bg-neutral-50 flex overflow-hidden">
      {/* Desktop Sidebar Navigation */}
      <div 
        className="hidden md:block"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <RidesharingSidebar
          collapsed={!sidebarHovered}
          onCollapsedChange={() => {}} // Disabled click toggle
          activeItem={getCurrentPageId()}
          activeSection={activeSection}
          activeTab={activeTab}
          onItemSelect={(itemId) => {
            // This will be handled by the sidebar itself now
          }}
          onSectionChange={handleSectionChange}
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
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Top Header - Compact Design */}
        {!['bookings', 'live-map', 'safety'].includes(pathname.substring(1)) && (
          <header className="bg-white shadow-sm border-b border-gray-100 px-3 md:px-4 py-2">
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
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-3">
                    {pathname.substring(1) === 'fraud-protect' && <Shield className="w-6 h-6 md:w-7 md:h-7 text-red-600" />}
                    {getPageTitle()}
                  </h1>
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
                  className="xpress-btn xpress-btn-primary flex items-center space-x-1 px-3 py-2 text-xs font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* User Account Dropdown */}
                <div className="relative user-dropdown">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user ? `${user.firstName} ${user.lastName}` : 'Demo Admin'}</p>
                      <p className="text-xs text-gray-500">{user?.roles?.length > 0 ? user.roles[0].role?.displayName || 'admin' : 'admin'}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* User Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user ? `${user.firstName} ${user.lastName}` : 'Demo Admin'}</p>
                            <p className="text-xs text-gray-500">{user?.roles?.length > 0 ? user.roles[0].role?.displayName || 'admin' : 'admin'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            router.push('/profile');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <UserCircle className="w-4 h-4 mr-3" />
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            router.push('/settings');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          System Settings
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-200 py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Page Content - Compact Layout */}
        <main className="flex-1 overflow-auto p-2 md:p-4">
          {children}
        </main>

        {/* Footer - Fixed at bottom */}
        <footer className="bg-white border-t border-gray-100 py-3 md:py-4 flex-shrink-0">
          <div className="px-4 md:px-8 text-center text-xs md:text-sm text-gray-600">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live Data: {mounted ? lastRefresh.toLocaleTimeString() : '...'}</span>
              </div>
              <span className="hidden md:inline text-gray-400">•</span>
              <span className="hidden md:inline">Xpress Ops Tower</span>
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