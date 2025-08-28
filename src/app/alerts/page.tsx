'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock, Archive } from 'lucide-react';

interface DashboardData {
  alerts: any[];
}

const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('active-incidents');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'active-incidents', name: 'Active Incidents', icon: AlertTriangle },
    { id: 'safety-protocols', name: 'Safety Protocols', icon: Shield },
    { id: 'sos-response', name: 'SOS Response', icon: Clock },
    { id: 'history', name: 'History', icon: Archive }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const alertsRes = await fetch('/api/alerts');
        const alerts = await alertsRes.json();

        setDashboardData({
          alerts: alerts.data || []
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Alert System...</p>
        </div>
      </div>
    );
  }

  const getTabCount = (tabId: string) => {
    if (!dashboardData) return 0;
    
    switch (tabId) {
      case 'active-incidents':
        return dashboardData.alerts?.filter(a => a.status !== 'resolved').length || 0;
      case 'sos-response':
        return dashboardData.alerts?.filter(a => a.priority === 'critical').length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>Alerts system placeholder</p>
        <p className="text-sm text-gray-400 mt-1">Full implementation coming soon</p>
      </div>
    </div>
  );
};

export default AlertsPage;