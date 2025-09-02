'use client';

import React, { memo, useState } from 'react';
import { 
  AlertTriangle, 
  Eye, 
  ChevronRight, 
  BarChart3,
  Shield,
  Activity,
  TrendingUp
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface RiskPillar {
  score: number;
  status: 'low' | 'medium' | 'high' | 'critical';
  alerts: number;
  icon: string;
  tooltip: string;
}

interface Investigation {
  id: string;
  type: string;
  status: 'investigating' | 'pending' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  investigator: string;
  dueDate: string;
  description: string;
  evidence: string[];
  nextAction: string;
}

interface FraudData {
  overallRiskScore: number;
  lastUpdated: string;
  investigationStatus: string;
  investigationId: string;
  mlConfidence: number;
  riskPillars: {
    payment: RiskPillar;
    identity: RiskPillar;
    location: RiskPillar;
    behavioral: RiskPillar;
    device: RiskPillar;
    network: RiskPillar;
  };
  investigations: Investigation[];
}

interface DriverFraudTabProps {
  driverId: string;
  fraudData?: FraudData;
  onViewInvestigation?: (investigationId: string) => void;
  onRunFraudScan?: () => void;
}

const DriverFraudTab = memo<DriverFraudTabProps>(({
  driverId,
  fraudData,
  onViewInvestigation,
  onRunFraudScan
}) => {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  // Default fraud data if none provided
  const defaultFraudData: FraudData = {
    overallRiskScore: 87.3,
    lastUpdated: '2 hours ago',
    investigationStatus: 'Active Investigation',
    investigationId: 'INV-2024-001',
    mlConfidence: 0.94,
    riskPillars: {
      payment: { 
        score: 92.8, 
        status: 'critical', 
        alerts: 12, 
        icon: '💳', 
        tooltip: 'Payment fraud detection including stolen cards, chargebacks, and unusual payment patterns' 
      },
      identity: { 
        score: 76.2, 
        status: 'high', 
        alerts: 3, 
        icon: '👤', 
        tooltip: 'Identity verification status including document fraud and biometric validation' 
      },
      location: { 
        score: 82.4, 
        status: 'critical', 
        alerts: 8, 
        icon: '📍', 
        tooltip: 'Location-based fraud detection including GPS manipulation and route anomalies' 
      },
      behavioral: { 
        score: 87.5, 
        status: 'critical', 
        alerts: 15, 
        icon: '🧠', 
        tooltip: 'Behavioral pattern analysis including time patterns and usage anomalies' 
      },
      device: { 
        score: 88.1, 
        status: 'critical', 
        alerts: 6, 
        icon: '📱', 
        tooltip: 'Device fingerprinting and multi-device fraud detection' 
      },
      network: { 
        score: 79.6, 
        status: 'high', 
        alerts: 4, 
        icon: '🌐', 
        tooltip: 'Network analysis including collusion detection and social network fraud' 
      }
    },
    investigations: [
      {
        id: 'INV-2024-001',
        type: 'Payment Fraud',
        status: 'investigating',
        priority: 'critical',
        progress: 75,
        investigator: 'Sarah Chen',
        dueDate: '2024-08-30',
        description: 'Multiple payment cards used in rapid succession, possible stolen card fraud',
        evidence: ['5 different cards in 24 hours', 'Cards from different banks', 'Unusual spending pattern'],
        nextAction: 'Contact payment processor for card validation'
      },
      {
        id: 'INV-2024-002',
        type: 'Location Manipulation',
        status: 'pending',
        priority: 'high',
        progress: 25,
        investigator: 'Mike Rodriguez',
        dueDate: '2024-09-01',
        description: 'GPS coordinates show impossible movement patterns',
        evidence: ['GPS jumping', 'Location spoofing detected', 'Route inconsistencies'],
        nextAction: 'Technical analysis of GPS logs'
      }
    ]
  };

  const data = fraudData || defaultFraudData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      case 'investigating': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleViewInvestigation = (investigationId: string) => {
    logger.info('Investigation details requested', { investigationId, driverId });
    if (onViewInvestigation) {
      onViewInvestigation(investigationId);
    }
  };

  const handleRunFraudScan = () => {
    logger.info('Manual fraud scan initiated', { driverId });
    if (onRunFraudScan) {
      onRunFraudScan();
    }
  };

  const handlePillarClick = (pillarName: string) => {
    logger.info('Fraud pillar details requested', { pillarName, driverId });
    setSelectedPillar(selectedPillar === pillarName ? null : pillarName);
  };

  return (
    <div className="space-y-6">
      {/* Fraud Score Overview */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Fraud Risk Assessment</h3>
            <p className="text-sm text-gray-600">Last updated {data.lastUpdated}</p>
          </div>
          <button
            onClick={handleRunFraudScan}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Run Scan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{data.overallRiskScore}</div>
            <div className="text-sm text-gray-600">Risk Score</div>
            <div className="text-xs text-red-600 font-medium mt-1">High Risk</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{(data.mlConfidence * 100).toFixed(0)}%</div>
            <div className="text-sm text-gray-600">ML Confidence</div>
            <div className="text-xs text-green-600 font-medium mt-1">High Accuracy</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {Object.values(data.riskPillars).reduce((sum, pillar) => sum + pillar.alerts, 0)}
            </div>
            <div className="text-sm text-gray-600">Active Alerts</div>
            <div className="text-xs text-orange-600 font-medium mt-1">Requires Review</div>
          </div>
        </div>
      </div>

      {/* Risk Pillars */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Risk Analysis Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.riskPillars).map(([pillarName, pillar]) => (
            <div
              key={pillarName}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePillarClick(pillarName)}
              title={pillar.tooltip}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{pillar.icon}</span>
                  <span className="font-medium text-gray-900 capitalize">{pillarName}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pillar.status)}`}>
                  {pillar.status.toUpperCase()}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Score</span>
                  <span className="text-lg font-bold text-gray-900">{pillar.score}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      pillar.score >= 85 ? 'bg-red-500' :
                      pillar.score >= 70 ? 'bg-orange-500' :
                      pillar.score >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${pillar.score}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {pillar.alerts} alert{pillar.alerts !== 1 ? 's' : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Investigations */}
      <div className="bg-white border rounded-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Active Investigations</h3>
              <p className="text-sm text-gray-600">{data.investigationStatus}: {data.investigationId}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600 font-medium">
                {data.investigations.length} Active
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {data.investigations.map((investigation) => (
            <div key={investigation.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investigation.status)}`}>
                    {investigation.status.toUpperCase()}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(investigation.priority)}`}>
                    {investigation.priority.toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={() => handleViewInvestigation(investigation.id)}
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </button>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-1">{investigation.type}</h4>
                <p className="text-sm text-gray-600">{investigation.description}</p>
              </div>

              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium text-gray-900">{investigation.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${investigation.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Investigator:</span>
                  <span className="ml-2 font-medium text-gray-900">{investigation.investigator}</span>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2 font-medium text-gray-900">{investigation.dueDate}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="text-sm">
                  <span className="text-gray-600">Next Action:</span>
                  <span className="ml-2 text-gray-900">{investigation.nextAction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DriverFraudTab.displayName = 'DriverFraudTab';

export default DriverFraudTab;