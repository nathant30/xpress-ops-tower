'use client';

import React, { useState } from 'react';
import { FileText, Clock, Shield, BookOpen } from 'lucide-react';

const SafetyPage = () => {
  const [activeTab, setActiveTab] = useState('incident-reports');

  const tabs = [
    { id: 'incident-reports', name: 'Incident Reports', icon: FileText },
    { id: 'emergency-response', name: 'Emergency Response', icon: Clock },
    { id: 'driver-safety', name: 'Driver Safety', icon: Shield },
    { id: 'protocols', name: 'Protocols', icon: BookOpen }
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
      {activeTab === 'incident-reports' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Safety Incident Reports</h3>
            <p className="text-gray-600">Track and manage safety incidents and violations</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-900">Critical Incidents</h4>
                <p className="text-2xl font-bold text-red-600">2</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-orange-900">Under Investigation</h4>
                <p className="text-2xl font-bold text-orange-600">5</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900">Minor Incidents</h4>
                <p className="text-2xl font-bold text-yellow-600">12</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900">Resolved</h4>
                <p className="text-2xl font-bold text-green-600">148</p>
              </div>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Incident reporting system</p>
              <p className="text-sm text-gray-400 mt-1">Track and manage safety incidents</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emergency-response' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Emergency Response System</h3>
            <p className="text-gray-600">24/7 emergency response coordination and management</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Emergency response dashboard</p>
              <p className="text-sm text-gray-400 mt-1">Rapid response coordination system</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'driver-safety' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-medium text-gray-900">Safety Score</h3>
              <p className="text-2xl font-bold text-green-600">94.8</p>
              <p className="text-xs text-gray-600">Fleet average</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-medium text-gray-900">Training Complete</h3>
              <p className="text-2xl font-bold text-blue-600">87%</p>
              <p className="text-xs text-gray-600">Driver completion</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-medium text-gray-900">Violations</h3>
              <p className="text-2xl font-bold text-red-600">8</p>
              <p className="text-xs text-gray-600">This month</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Driver Safety Monitoring</h3>
              <p className="text-gray-600">Real-time safety monitoring and driver behavior analysis</p>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Driver safety analytics</p>
                <p className="text-sm text-gray-400 mt-1">Behavioral monitoring and safety scoring</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'protocols' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Safety Protocols & Guidelines</h3>
            <p className="text-gray-600">Standard operating procedures and safety protocols</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Safety protocol library</p>
              <p className="text-sm text-gray-400 mt-1">Guidelines and standard operating procedures</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyPage;