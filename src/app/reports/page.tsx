'use client';

import React, { useState } from 'react';
import { BarChart3, DollarSign, Activity, Settings } from 'lucide-react';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('operations');

  const tabs = [
    { id: 'operations', name: 'Operations', icon: Activity },
    { id: 'financial', name: 'Financial', icon: DollarSign },
    { id: 'performance', name: 'Performance', icon: BarChart3 },
    { id: 'custom', name: 'Custom', icon: Settings }
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
      {activeTab === 'operations' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Operations Reports</h3>
            <p className="text-gray-600">Detailed operational analytics and performance metrics</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">95.2%</div>
                <p className="text-gray-600">Trip Completion Rate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">2.1m</div>
                <p className="text-gray-600">Avg Response Time</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">4.7⭐</div>
                <p className="text-gray-600">Service Rating</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
            <p className="text-gray-600">Revenue analysis and financial performance tracking</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Financial analytics dashboard</p>
              <p className="text-sm text-gray-400 mt-1">Revenue tracking and financial insights</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
            <p className="text-gray-600">Driver and system performance metrics</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Performance metrics dashboard</p>
              <p className="text-sm text-gray-400 mt-1">Comprehensive performance analytics</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Custom Reports</h3>
            <p className="text-gray-600">Build and customize your own reports</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Custom report builder</p>
              <p className="text-sm text-gray-400 mt-1">Create tailored analytics and reports</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;