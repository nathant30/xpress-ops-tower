'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Activity, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  Users, 
  Car, 
  Settings,
  Bell,
  Menu,
  X,
  Home,
  BarChart3
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  badgeColor?: 'green' | 'yellow' | 'red' | 'blue';
  requiresAuth?: boolean;
  roles?: ('admin' | 'operator' | 'viewer')[];
}

interface MobileNavigationProps {
  userRole?: 'admin' | 'operator' | 'viewer';
  activeAlerts?: number;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  userRole = 'operator',
  activeAlerts = 0,
  className = ''
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Navigation items configuration
  const mainNavItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
      path: '/dashboard'
    },
    {
      id: 'live-map',
      label: 'Live Map',
      icon: MapPin,
      path: '/live-map',
      badge: 15, // Live drivers count
      badgeColor: 'green'
    },
    {
      id: 'fraud-protect',
      label: 'Security',
      icon: Shield,
      path: '/fraud-protect',
      badge: activeAlerts,
      badgeColor: activeAlerts > 10 ? 'red' : activeAlerts > 5 ? 'yellow' : 'green'
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      path: '/alerts',
      badge: activeAlerts,
      badgeColor: 'red'
    }
  ];

  const sidebarNavItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/dashboard'
    },
    {
      id: 'drivers',
      label: 'Drivers',
      icon: Users,
      path: '/drivers',
      roles: ['admin', 'operator']
    },
    {
      id: 'passengers',
      label: 'Passengers',
      icon: Car,
      path: '/passengers',
      roles: ['admin', 'operator']
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      path: '/reports',
      roles: ['admin', 'operator']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings'
    }
  ];

  const canAccessItem = (item: NavigationItem): boolean => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setShowSidebar(false);
  };

  const handleDoubleTap = (path: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY && pathname === path) {
      // Double tap on current page - refresh or scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleNavigation(path);
    }
    
    setLastTap(now);
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'green': return 'bg-green-500 text-white';
      case 'yellow': return 'bg-yellow-500 text-black';
      case 'red': return 'bg-red-500 text-white';
      case 'blue': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const isActiveRoute = (path: string): boolean => {
    if (path === '/dashboard' && pathname === '/') return true;
    return pathname === path;
  };

  // Handle touch interactions
  const handleTouchStart = (e: React.TouchEvent, callback: () => void) => {
    const touch = e.touches[0];
    const startTime = Date.now();
    const startX = touch.clientX;
    const startY = touch.clientY;

    const handleTouchEnd = (endEvent: TouchEvent) => {
      const endTouch = endEvent.changedTouches[0];
      const endTime = Date.now();
      const deltaX = Math.abs(endTouch.clientX - startX);
      const deltaY = Math.abs(endTouch.clientY - startY);
      const deltaTime = endTime - startTime;

      // Check for tap (short duration, minimal movement)
      if (deltaTime < 200 && deltaX < 10 && deltaY < 10) {
        callback();
      }

      // Remove event listener
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
  };

  // Handle swipe gestures for navigation
  useEffect(() => {
    let startX: number;
    let startY: number;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startX || !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Check for horizontal swipe (ignore if too much vertical movement)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0 && startX < 50) {
          // Swipe right from left edge - open sidebar
          setShowSidebar(true);
        } else if (deltaX < 0 && showSidebar) {
          // Swipe left - close sidebar
          setShowSidebar(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showSidebar]);

  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 md:hidden ${className}`}>
        <div className="grid grid-cols-4 py-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);
            
            return (
              <button
                key={item.id}
                onTouchStart={(e) => handleTouchStart(e, () => handleDoubleTap(item.path))}
                className={`flex flex-col items-center py-2 px-1 transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 active:text-blue-500'
                }`}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
                  {item.badge && item.badge > 0 && (
                    <span className={`absolute -top-2 -right-2 ${getBadgeColor(item.badgeColor)} text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Header with Menu Button */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-30 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onTouchStart={(e) => handleTouchStart(e, () => setShowSidebar(true))}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-2">
            <img 
              src="/images/xpress-x-logo-final.svg" 
              alt="Xpress Logo" 
              className="h-7 w-7"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Xpress Ops</h1>
            </div>
          </div>

          <button
            onTouchStart={(e) => handleTouchStart(e, () => handleNavigation('/notifications'))}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {activeAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {activeAlerts > 9 ? '9+' : activeAlerts}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onTouchStart={(e) => handleTouchStart(e, () => setShowSidebar(false))}
          />
          
          {/* Sidebar Panel */}
          <div className={`fixed left-0 top-0 bottom-0 w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-out ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img 
                  src="/images/xpress-x-logo-final.svg" 
                  alt="Xpress Logo" 
                  className="h-8 w-8"
                />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Xpress Ops</h2>
                  <p className="text-sm text-gray-500 capitalize">{userRole} Access</p>
                </div>
              </div>
              <button
                onTouchStart={(e) => handleTouchStart(e, () => setShowSidebar(false))}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-2">
                {sidebarNavItems
                  .filter(canAccessItem)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.path);
                    
                    return (
                      <button
                        key={item.id}
                        onTouchStart={(e) => handleTouchStart(e, () => handleNavigation(item.path))}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-blue-700' : 'text-gray-500'
                        }`} />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className={`ml-auto ${getBadgeColor(item.badgeColor)} text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center`}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Version 2.1.0 • Philippines
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed elements */}
      <div className="h-14 md:hidden" /> {/* Top spacer */}
      <div className="h-16 md:hidden" /> {/* Bottom spacer */}
    </>
  );
};

export default MobileNavigation;