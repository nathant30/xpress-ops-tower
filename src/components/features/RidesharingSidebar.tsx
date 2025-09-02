'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Car,
  Users,
  UserCheck,
  Radio,
  AlertTriangle,
  DollarSign,
  Shield,
  BarChart3,
  Headphones,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  MapPin,
  MoreHorizontal,
  Bell,
  Globe,
  Check,
  Brain
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  active?: boolean;
  description?: string;
  tabs?: string[];
  children?: NavigationItem[];
}

interface RidesharingSidebarProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  activeItem?: string;
  activeSection?: string;
  activeTab?: string;
  onItemSelect?: (itemId: string) => void;
  onSectionChange?: (section: string) => void;
}

export const RidesharingSidebar: React.FC<RidesharingSidebarProps> = ({
  className = '',
  collapsed = false,
  onCollapsedChange,
  activeItem = 'dashboard',
  activeSection = 'Dashboard',
  activeTab = 'Overview',
  onItemSelect,
  onSectionChange
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('NCR'); // Default to NCR
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [regions] = useState([
    { id: 'NCR', name: 'NCR', status: 'active' },
    { id: 'BTN', name: 'Bataan', status: 'active' },
    { id: 'CAV', name: 'Cavite', status: 'active' },
    { id: 'BORA', name: 'Boracay', status: 'active' },
    { id: 'PMP', name: 'Pampanga', status: 'pilot' },
    { id: 'BUL', name: 'Bulacan', status: 'pilot' },
    { id: 'LAG', name: 'Laguna', status: 'pilot' }
  ]);
  const router = useRouter();
  const pathname = usePathname();

  // Get current active item from pathname
  const getCurrentActiveItem = () => {
    const path = pathname.substring(1);
    return path || 'dashboard';
  };

  // Menu structure with nested tabs
  const mainMenuStructure = {
    Dashboard: {
      id: 'dashboard',
      icon: LayoutDashboard,
      description: '24hr data 00:00-23:59',
      tabs: ['Overview', 'Performance', 'Drivers', 'Bookings', 'SOS', 'Fraud', 'Analytics']
    },
    'Live Map': {
      id: 'live-map',
      icon: MapPin,
      description: 'Real-time tracking',
      badge: 'LIVE',
      badgeColor: 'green',
      tabs: ['Map View', 'Driver Locations', 'Trip Routes', 'Heatmap']
    },
    Regions: {
      id: 'regions',
      icon: Globe,
      description: 'Regional management',
      tabs: ['Region Directory', 'Add New Region', 'Coverage Maps', 'Analytics']
    },
    Expansion: {
      id: 'expansion',
      icon: MapPin,
      description: 'AI-powered expansion strategy',
      badge: 'AI',
      badgeColor: 'purple',
      tabs: ['Overview', 'Primary Product', 'Secondary Products', 'AI Insights', 'Investment', 'Performance']
    },
    'Nexus AI': {
      id: 'nexus',
      icon: Brain,
      description: 'AI/ML Hub with Dual Approvals',
      badge: 'v1.0',
      badgeColor: 'purple',
      tabs: ['Overview', 'Recommendations', 'Forecasts', 'Scenario Builder', 'Cross-Domain', 'Risk & Compliance', 'Ops (AI)', 'Audit & Governance', 'Knowledge']
    },
    Bookings: {
      id: 'bookings',
      icon: Car,
      description: 'Trip management',
      badge: 142,
      badgeColor: 'blue',
      tabs: ['Active Trips', 'Completed', 'Cancelled', 'Scheduled']
    },
    Drivers: {
      id: 'drivers',
      icon: Users,
      description: 'Airtable-style',
      badge: 2000,
      badgeColor: 'green',
      tabs: ['Active Drivers', 'Pending Drivers', 'Suspended Drivers', 'Banned Drivers']
    },
    Passengers: {
      id: 'passengers',
      icon: UserCheck,
      description: 'Airtable-style',
      tabs: ['Active Passengers', 'Suspended Passengers', 'Banned Passengers']
    },
    Safety: {
      id: 'safety',
      icon: Shield,
      description: 'All-time data',
      badge: 'NEW',
      badgeColor: 'purple',
      tabs: ['Overview', 'Alerts', 'Reports']
    },
    'Fraud Protect': {
      id: 'fraud-protect',
      icon: AlertTriangle,
      description: 'Advanced detection',
      badge: 47,
      badgeColor: 'red',
      tabs: ['Overview', 'Active Alerts', 'Patterns', 'Settings']
    },
    Pricing: {
      id: 'pricing',
      icon: DollarSign,
      description: 'Fares management',
      badge: 'NEW',
      badgeColor: 'blue',
      tabs: ['Pricing Profiles', 'TNVS Fares', 'Taxi Fares', 'Surge Control', 'Tolls']
    },
    Reports: {
      id: 'reports',
      icon: BarChart3,
      description: 'Business intelligence',
      tabs: ['Operations', 'Financial', 'Performance', 'Promos', 'Incentives']
    },
    Settings: {
      id: 'settings',
      icon: Settings,
      description: 'Enhanced configuration',
      tabs: ['System Health', 'User Management']
    }
  };

  const moreMenuStructure = {
  };

  const mainNavigationItems: NavigationItem[] = Object.entries(mainMenuStructure).map(([section, config]) => ({
    id: config.id,
    label: section,
    icon: config.icon,
    description: config.description,
    badge: config.badge,
    badgeColor: config.badgeColor as any,
    tabs: config.tabs,
    active: getCurrentActiveItem() === config.id
  }));

  const moreNavigationItems: NavigationItem[] = Object.entries(moreMenuStructure).map(([section, config]) => ({
    id: config.id,
    label: section,
    icon: config.icon,
    description: config.description,
    badge: config.badge,
    badgeColor: config.badgeColor as any,
    tabs: config.tabs,
    active: getCurrentActiveItem() === config.id
  }));

  const bottomItems: NavigationItem[] = [];

  const handleItemClick = (itemId: string, section: string) => {
    // Use Next.js router for navigation
    if (itemId === 'dashboard') {
      router.push('/dashboard');
    } else {
      router.push(`/${itemId}`);
    }
    
    // Call section change handler
    onSectionChange?.(section);
    
    // Also call the callback for backward compatibility
    onItemSelect?.(itemId);
  };

  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      case 'red':
        return 'bg-red-500 text-white';
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'purple':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const isHovered = hoveredItem === item.id;
    const showTooltip = collapsed && isHovered;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => handleItemClick(item.id, item.label)}
          onMouseEnter={(e) => {
            setHoveredItem(item.id);
            if (typeof window !== 'undefined' && !item.active) {
              e.currentTarget.style.backgroundColor = 'rgb(10, 64, 96)';
            }
          }}
          onMouseLeave={(e) => {
            setHoveredItem(null);
            if (typeof window !== 'undefined' && !item.active) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 group relative ${
            item.active
              ? 'text-white'
              : 'text-gray-300 hover:text-white'
          } ${collapsed ? 'justify-center' : 'justify-start'}`}
          style={item.active ? { backgroundColor: 'rgb(235, 29, 37)' } : {}}
        >
          <Icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'} flex-shrink-0`} />
          
          {!collapsed && (
            <>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-gray-400">{item.description}</div>
                )}
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(item.badgeColor)}`}>
                  {item.badge}
                </span>
              )}
            </>
          )}

          {collapsed && item.badge && (
            <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(item.badgeColor)}`}>
              {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </button>

        {/* Tooltip for collapsed state */}
        {showTooltip && (
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
            <div className="font-medium">{item.label}</div>
            {item.description && <div className="text-xs text-gray-300">{item.description}</div>}
            {item.badge && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(item.badgeColor)}`}>
                {item.badge}
              </span>
            )}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out relative z-30 ${
        collapsed ? 'w-16' : 'w-64'
      } ${className}`}
      style={{ backgroundColor: 'rgb(3, 35, 58)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/images/xpress-x-logo-final.svg" 
                alt="Xpress X Logo" 
                className="h-6 w-6"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Xpress Ops</h2>
              <p className="text-xs text-gray-400">Command Center</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/images/xpress-x-logo-final.svg" 
                alt="Xpress X Logo" 
                className="h-5 w-5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Region Selector */}
      <div className="px-4 py-2 border-b border-gray-700">
        {!collapsed ? (
          <div className="relative">
            <button
              onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">
                  {regions.find(r => r.id === selectedRegion)?.name || 'Select Region'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${regionDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {regionDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => {
                      setSelectedRegion(region.id);
                      setRegionDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-white">{region.name}</span>
                      {region.status === 'pilot' && (
                        <span className="bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-medium">
                          PILOT
                        </span>
                      )}
                    </div>
                    {selectedRegion === region.id && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors relative"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              {regionDropdownOpen && (
                <div className="absolute left-full top-0 ml-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 w-48">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => {
                        setSelectedRegion(region.id);
                        setRegionDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-white">{region.name}</span>
                        {region.status === 'pilot' && (
                          <span className="bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-medium">
                            PILOT
                          </span>
                        )}
                      </div>
                      {selectedRegion === region.id && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavigationItems.map(renderNavigationItem)}
          
          {/* More Section - Only show if there are items */}
          {moreNavigationItems.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setMoreExpanded(!moreExpanded)}
                className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 group relative text-gray-300 hover:bg-gray-700 hover:text-white ${collapsed ? 'justify-center' : 'justify-start'}`}
              >
                <MoreHorizontal className={`w-5 h-5 ${collapsed ? '' : 'mr-3'} flex-shrink-0`} />
                
                {!collapsed && (
                  <>
                    <div className="flex-1">
                      <div className="text-sm font-medium">More</div>
                      <div className="text-xs text-gray-400">Additional tools</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${moreExpanded ? 'transform rotate-180' : ''}`} />
                  </>
                )}
              </button>
              
              {moreExpanded && !collapsed && (
                <div className="ml-4 space-y-1 border-l border-gray-700 pl-4">
                  {moreNavigationItems.map(renderNavigationItem)}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-700 py-4">
        <div className="space-y-1">
          {bottomItems.map(renderNavigationItem)}
        </div>
        
        {/* System Status */}
        <div className={`px-4 py-3 ${collapsed ? 'px-2' : ''}`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Activity className="w-4 h-4" />
              <span>System Online</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RidesharingSidebar;