'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Route, BarChart3, History } from 'lucide-react';

const DispatchPage = () => {
  const [activeTab, setActiveTab] = useState('manual-assignment');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'manual-assignment', name: 'Manual Assignment', icon: Radio },
    { id: 'route-planning', name: 'Route Planning', icon: Route },
    { id: 'load-balancing', name: 'Load Balancing', icon: BarChart3 },
    { id: 'history', name: 'History', icon: History }
  ];

  return (
    <div className="space-y-8">
      {/* Sub-navigation tabs */}
      <div className="border-b border-gray-100">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'manual-assignment' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Manual Ride Assignment</h3>
            <p className="text-gray-600">Manually assign drivers to specific ride requests</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Radio className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Manual dispatch control system</p>
              <p className="text-sm text-gray-400 mt-1">Override automatic assignment for priority rides</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'route-planning' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Route Optimization</h3>
            <p className="text-gray-600">Optimize driver routes and reduce travel time</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Route className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Advanced route planning system</p>
              <p className="text-sm text-gray-400 mt-1">AI-powered route optimization and traffic analysis</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'load-balancing' && (
        <div className="space-y-6">
          {/* Load Distribution Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">High Demand Areas</h3>
              <p className="text-2xl font-bold text-red-600">5</p>
              <p className="text-xs text-gray-600">Need more drivers</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Balanced Areas</h3>
              <p className="text-2xl font-bold text-green-600">12</p>
              <p className="text-xs text-gray-600">Optimal coverage</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Low Demand Areas</h3>
              <p className="text-2xl font-bold text-blue-600">8</p>
              <p className="text-xs text-gray-600">Excess drivers</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Distribution Score</h3>
              <p className="text-2xl font-bold text-purple-600">78%</p>
              <p className="text-xs text-gray-600">Overall efficiency</p>
            </div>
          </div>

          {/* Load Balancing Interface */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Driver Distribution Control</h3>
              <p className="text-gray-600">Monitor and adjust driver allocation across service areas</p>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Real-time load balancing dashboard</p>
                <p className="text-sm text-gray-400 mt-1">Smart driver reallocation and demand prediction</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Dispatch History</h3>
            <p className="text-gray-600">Historical dispatch decisions and performance analytics</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <History className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Dispatch operation history</p>
              <p className="text-sm text-gray-400 mt-1">Analysis of past assignments and outcomes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchPage;