'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, Users, Car, Clock, DollarSign, MapPin, Shield, BarChart3, 
  AlertTriangle, CheckCircle, ArrowUp, ArrowDown, RefreshCcw, Settings,
  Bell, Search, Filter, Download, Eye, MoreHorizontal, Activity,
  Navigation, Route, Target, Zap
} from 'lucide-react';

const ImprovedOperationsDashboard = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');
  const [selectedService, setSelectedService] = useState('all');

  const MetricCard = ({ title, value, change, changeType, icon: Icon, color = "blue", subtitle }: any) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${
          color === 'green' ? 'bg-green-50' :
          color === 'blue' ? 'bg-blue-50' :
          color === 'purple' ? 'bg-purple-50' :
          color === 'yellow' ? 'bg-yellow-50' :
          'bg-gray-50'
        }`}>
          <Icon className={`w-4 h-4 ${
            color === 'green' ? 'text-green-600' :
            color === 'blue' ? 'text-blue-600' :
            color === 'purple' ? 'text-purple-600' :
            color === 'yellow' ? 'text-yellow-600' :
            'text-gray-600'
          }`} />
        </div>
        {change && (
          <div className={`flex items-center text-xs font-medium ${
            changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {changeType === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : 
             changeType === 'down' ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
            {change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  const ServiceBreakdownCard = ({ service, drivers, rides, utilization, trend }: any) => (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {service === 'Motorcycle' && <Car className="w-4 h-4 text-blue-600" />}
          {service === 'Car' && <Car className="w-4 h-4 text-green-600" />}
          {service === 'SUV' && <Car className="w-4 h-4 text-purple-600" />}
          {service === 'Taxi' && <Car className="w-4 h-4 text-yellow-600" />}
          <span className="font-medium text-gray-900">{service}</span>
        </div>
        <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span className="ml-1">{Math.abs(trend)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Drivers</p>
          <p className="font-semibold text-gray-900">{drivers}</p>
        </div>
        <div>
          <p className="text-gray-500">Rides</p>
          <p className="font-semibold text-gray-900">{rides}</p>
        </div>
        <div>
          <p className="text-gray-500">Utilization</p>
          <p className="font-semibold text-gray-900">{utilization}%</p>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Utilization Rate</span>
          <span>{utilization}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              service === 'Motorcycle' ? 'bg-blue-600' :
              service === 'Car' ? 'bg-green-600' :
              service === 'SUV' ? 'bg-purple-600' : 'bg-yellow-600'
            }`}
            style={{ width: `${utilization}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  const RecentActivityItem = ({ type, message, time, status }: any) => (
    <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
      <div className={`w-2 h-2 rounded-full ${
        status === 'success' ? 'bg-green-500' :
        status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
      }`}></div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{message}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-full bg-gray-900 text-white">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <div>
              <h1 className="font-bold text-white">Xpress Ops</h1>
              <p className="text-sm text-gray-400">Rideshare Command</p>
            </div>
          </div>
        </div>

        <nav className="mt-8">
          <div className="px-4 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>Operations Manager</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Admin</div>
          </div>

          <div className="space-y-1">
            <a href="/dashboard" className="flex items-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-r-lg mr-4">
              <BarChart3 className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
            <a href="/live-map" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <MapPin className="w-5 h-5" />
              <span>Live Map</span>
            </a>
            <a href="/drivers" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <Users className="w-5 h-5" />
              <span>Drivers</span>
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">2000</span>
            </a>
            <a href="/passengers" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <Users className="w-5 h-5" />
              <span>Passengers</span>
            </a>
            <a href="/safety" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <Shield className="w-5 h-5" />
              <span>Safety</span>
              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">NEW</span>
            </a>
            <a href="/reports" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <TrendingUp className="w-5 h-5" />
              <span>Analytics</span>
            </a>
            <a href="/settings" className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-r-lg mr-4">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </a>
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">System Online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Real-time overview of operations and key performance indicators</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Service:</span>
                <select 
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option value="all">All Services</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="suv">SUV</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Period:</span>
                <select 
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <RefreshCcw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Simplified */}
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex space-x-8">
            <button className="py-4 text-blue-600 border-b-2 border-blue-600 font-medium">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>
            <button className="py-4 text-gray-600 hover:text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Performance</span>
              </div>
            </button>
            <button className="py-4 text-gray-600 hover:text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Drivers</span>
              </div>
            </button>
            <button className="py-4 text-gray-600 hover:text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4" />
                <span>Bookings</span>
              </div>
            </button>
            <button className="py-4 text-gray-600 hover:text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>SOS</span>
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">2</span>
              </div>
            </button>
            <button className="py-4 text-gray-600 hover:text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Fraud</span>
                <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">7</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Row - Reduced Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Active Drivers"
              value="89/142"
              change="15.3%"
              changeType="up"
              icon={Users}
              color="green"
              subtitle="from yesterday"
            />
            <MetricCard
              title="Active Rides"
              value="67"
              change="8.7%"
              changeType="up"
              icon={Car}
              color="blue"
              subtitle="this hour"
            />
            <MetricCard
              title="Completed Trips"
              value="1,247"
              change="12.4%"
              changeType="up"
              icon={CheckCircle}
              color="purple"
              subtitle="today"
            />
            <MetricCard
              title="Avg Wait Time"
              value="3.2m"
              change="0.8%"
              changeType="down"
              icon={Clock}
              color="yellow"
              subtitle="improvement"
            />
            <MetricCard
              title="Revenue Today"
              value="₱127,450"
              change="12.8%"
              changeType="up"
              icon={DollarSign}
              color="green"
              subtitle="from yesterday"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fraud Detection Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Fraud Detection</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500">AI Active</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Risk Level */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Overall Risk Level</span>
                    <span className="text-xs text-green-600">LOW</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <p className="text-xs text-green-700 mt-1">Risk Score: 25/100</p>
                </div>

                {/* Active Cases */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Cases</span>
                    <span className="text-sm font-semibold text-orange-600">7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolved Today</span>
                    <span className="text-sm font-semibold text-green-600">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ML Confidence</span>
                    <span className="text-sm font-semibold text-blue-600">94%</span>
                  </div>
                </div>

                {/* Recent Fraud Alerts */}
                <div className="border-t border-gray-200 pt-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Alerts</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Payment anomaly - Driver #1205</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600">Route deviation - Trip T891</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600">Multiple accounts - IP flagged</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                      Run System Scan
                    </button>
                    <button className="text-xs border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                      View All Cases
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Performance - Moved to middle */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Service Performance</h3>
                  <span className="text-sm text-gray-500">Real-time Metro Manila data</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ServiceBreakdownCard
                    service="Motorcycle"
                    drivers="35/58"
                    rides="28"
                    utilization={60.3}
                    trend={18.2}
                  />
                  <ServiceBreakdownCard
                    service="Car"
                    drivers="28/45"
                    rides="21"
                    utilization={62.2}
                    trend={12.1}
                  />
                  <ServiceBreakdownCard
                    service="SUV"
                    drivers="15/23"
                    rides="12"
                    utilization={65.2}
                    trend={14.8}
                  />
                  <ServiceBreakdownCard
                    service="Taxi"
                    drivers="11/16"
                    rides="6"
                    utilization={68.8}
                    trend={-5.1}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Feed */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-2">
                <RecentActivityItem
                  type="fraud"
                  message="Fraud case F089 resolved - Driver suspended"
                  time="1 minute ago"
                  status="warning"
                />
                <RecentActivityItem
                  type="driver"
                  message="Driver Juan Carlos went online"
                  time="2 minutes ago"
                  status="success"
                />
                <RecentActivityItem
                  type="ride"
                  message="Trip T001 completed successfully"
                  time="3 minutes ago"
                  status="success"
                />
                <RecentActivityItem
                  type="fraud"
                  message="AI flagged suspicious pattern in Trip T045"
                  time="5 minutes ago"
                  status="warning"
                />
                <RecentActivityItem
                  type="alert"
                  message="High demand in Makati CBD area"
                  time="7 minutes ago"
                  status="warning"
                />
                <RecentActivityItem
                  type="sos"
                  message="SOS alert resolved - Driver safe"
                  time="8 minutes ago"
                  status="success"
                />
                <RecentActivityItem
                  type="system"
                  message="System maintenance completed"
                  time="12 minutes ago"
                  status="success"
                />
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center space-x-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Surge Pricing</span>
                </button>
                <button className="flex items-center space-x-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">Send Alert</span>
                </button>
                <button className="flex items-center space-x-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Driver Incentives</span>
                </button>
                <button className="flex items-center space-x-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export Data</span>
                </button>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">145ms</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Load</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-600">68%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">2,847</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">0.02%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedOperationsDashboard;