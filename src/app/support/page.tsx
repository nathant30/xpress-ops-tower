'use client';

import React, { useState } from 'react';
import { MessageSquare, Star, BookOpen, AlertTriangle } from 'lucide-react';

const SupportPage = () => {
  const [activeTab, setActiveTab] = useState('open-tickets');

  const tabs = [
    { id: 'open-tickets', name: 'Open Tickets', icon: MessageSquare },
    { id: 'customer-feedback', name: 'Customer Feedback', icon: Star },
    { id: 'knowledge-base', name: 'Knowledge Base', icon: BookOpen },
    { id: 'escalations', name: 'Escalations', icon: AlertTriangle }
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
      {activeTab === 'open-tickets' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Customer Support Tickets</h3>
            <p className="text-gray-600">Manage active customer support requests and inquiries</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-900">Urgent</h4>
                <p className="text-2xl font-bold text-red-600">7</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900">High Priority</h4>
                <p className="text-2xl font-bold text-yellow-600">23</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900">Normal</h4>
                <p className="text-2xl font-bold text-blue-600">54</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900">Resolved Today</h4>
                <p className="text-2xl font-bold text-green-600">128</p>
              </div>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Support ticket management</p>
              <p className="text-sm text-gray-400 mt-1">Customer service request handling</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customer-feedback' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Customer Feedback & Reviews</h3>
            <p className="text-gray-600">Monitor customer satisfaction and feedback trends</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">4.8⭐</div>
                <p className="text-gray-600">Overall Rating</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1,247</div>
                <p className="text-gray-600">Reviews This Month</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">94.2%</div>
                <p className="text-gray-600">Positive Feedback</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'knowledge-base' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Support Knowledge Base</h3>
            <p className="text-gray-600">FAQ, troubleshooting guides, and support documentation</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Knowledge base system</p>
              <p className="text-sm text-gray-400 mt-1">Support documentation and FAQ management</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Escalated Issues</h3>
            <p className="text-gray-600">High-priority issues requiring management attention</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Issue escalation management</p>
              <p className="text-sm text-gray-400 mt-1">Critical issue tracking and resolution</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPage;