'use client';

import React, { useState } from 'react';
import { DollarSign, Calendar, TrendingUp, Users } from 'lucide-react';

const EarningsPage = () => {
  const [activeTab, setActiveTab] = useState('today');

  const tabs = [
    { id: 'today', name: 'Today', icon: DollarSign },
    { id: 'weekly', name: 'Weekly', icon: Calendar },
    { id: 'monthly', name: 'Monthly', icon: TrendingUp },
    { id: 'driver-payouts', name: 'Driver Payouts', icon: Users }
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
      {activeTab === 'today' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">₱127,450</p>
              <p className="text-xs text-gray-600">Today's earnings</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Platform Commission</h3>
              <p className="text-2xl font-bold text-blue-600">₱31,862</p>
              <p className="text-xs text-gray-600">25% commission</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Driver Earnings</h3>
              <p className="text-2xl font-bold text-purple-600">₱95,588</p>
              <p className="text-xs text-gray-600">75% to drivers</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Surge Premium</h3>
              <p className="text-2xl font-bold text-orange-600">₱28,750</p>
              <p className="text-xs text-gray-600">Peak hour earnings</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Earnings Overview</h3>
            <p className="text-gray-600">7-day earnings breakdown and trends</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Weekly earnings analytics</p>
              <p className="text-sm text-gray-400 mt-1">Revenue trends and performance metrics</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue Analytics</h3>
            <p className="text-gray-600">Monthly performance and growth analysis</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Monthly financial dashboard</p>
              <p className="text-sm text-gray-400 mt-1">Revenue growth and forecasting</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'driver-payouts' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Driver Payment Management</h3>
            <p className="text-gray-600">Process and manage driver earnings and payouts</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Driver payout system</p>
              <p className="text-sm text-gray-400 mt-1">Earnings distribution and payment processing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsPage;