'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Target,
  Calendar,
  Users,
  Car,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
  Calculator,
  BookOpen,
  Layers,
  Globe,
  Building
} from 'lucide-react';

interface RegionROIData {
  region_id: string;
  name: string;
  status: 'active' | 'pilot' | 'planning' | 'retired';
  launchDate: string;
  investmentData: {
    initialInvestment: number;
    operationalCosts: number;
    marketingSpend: number;
    infrastructureSetup: number;
    staffingCosts: number;
    totalInvested: number;
  };
  revenueData: {
    monthlyRevenue: number;
    yearToDateRevenue: number;
    projectedAnnualRevenue: number;
    revenueGrowthRate: number;
    avgRevenuePerTrip: number;
  };
  operationalMetrics: {
    totalTrips: number;
    activeDrivers: number;
    activeRiders: number;
    marketPenetration: number;
    driverUtilization: number;
    customerSatisfaction: number;
  };
  roiMetrics: {
    currentROI: number;
    paybackPeriodMonths: number;
    breakEvenDate: string;
    projectedROI12M: number;
    projectedROI24M: number;
    profitabilityScore: number;
  };
  marketData: {
    totalAddressableMarket: number;
    competitorPresence: number;
    marketShare: number;
    growthPotential: 'high' | 'medium' | 'low';
    regulatoryScore: number;
  };
  expansionReadiness: {
    score: number;
    factors: {
      financial: number;
      operational: number;
      market: number;
      regulatory: number;
      infrastructure: number;
    };
    recommendations: string[];
  };
}

interface ExpansionPlaybook {
  id: string;
  name: string;
  type: 'metro_expansion' | 'tourism_hub' | 'industrial_hub' | 'pilot_market';
  description: string;
  timeline: string;
  investmentRange: [number, number];
  expectedROI: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
  phases: {
    phase: string;
    duration: string;
    milestones: string[];
    investment: number;
  }[];
  successMetrics: {
    metric: string;
    target: number;
    timeline: string;
  }[];
}

export const RegionROIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'playbooks' | 'scenarios'>('overview');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'3M' | '6M' | '12M' | '24M'>('12M');
  const [sortBy, setSortBy] = useState<'roi' | 'revenue' | 'growth'>('roi');

  const regionData: RegionROIData[] = [
    {
      region_id: 'NCR',
      name: 'National Capital Region',
      status: 'active',
      launchDate: '2022-03-15',
      investmentData: {
        initialInvestment: 25000000,
        operationalCosts: 8500000,
        marketingSpend: 3200000,
        infrastructureSetup: 4800000,
        staffingCosts: 6200000,
        totalInvested: 47700000
      },
      revenueData: {
        monthlyRevenue: 12800000,
        yearToDateRevenue: 142500000,
        projectedAnnualRevenue: 156000000,
        revenueGrowthRate: 18.5,
        avgRevenuePerTrip: 245
      },
      operationalMetrics: {
        totalTrips: 580000,
        activeDrivers: 12500,
        activeRiders: 285000,
        marketPenetration: 12.8,
        driverUtilization: 0.74,
        customerSatisfaction: 4.3
      },
      roiMetrics: {
        currentROI: 2.27,
        paybackPeriodMonths: 14,
        breakEvenDate: '2023-05-15',
        projectedROI12M: 3.15,
        projectedROI24M: 4.82,
        profitabilityScore: 92
      },
      marketData: {
        totalAddressableMarket: 45000000000,
        competitorPresence: 4,
        marketShare: 8.5,
        growthPotential: 'medium',
        regulatoryScore: 78
      },
      expansionReadiness: {
        score: 88,
        factors: {
          financial: 95,
          operational: 89,
          market: 82,
          regulatory: 78,
          infrastructure: 96
        },
        recommendations: [
          'Expand to adjacent cities',
          'Launch premium service tiers',
          'Increase driver incentives'
        ]
      }
    },
    {
      region_id: 'CEBU',
      name: 'Cebu Metro',
      status: 'active',
      launchDate: '2023-01-10',
      investmentData: {
        initialInvestment: 8500000,
        operationalCosts: 3200000,
        marketingSpend: 1800000,
        infrastructureSetup: 2100000,
        staffingCosts: 1900000,
        totalInvested: 17500000
      },
      revenueData: {
        monthlyRevenue: 3200000,
        yearToDateRevenue: 28800000,
        projectedAnnualRevenue: 42000000,
        revenueGrowthRate: 34.2,
        avgRevenuePerTrip: 198
      },
      operationalMetrics: {
        totalTrips: 145000,
        activeDrivers: 2800,
        activeRiders: 68000,
        marketPenetration: 5.2,
        driverUtilization: 0.68,
        customerSatisfaction: 4.1
      },
      roiMetrics: {
        currentROI: 1.64,
        paybackPeriodMonths: 18,
        breakEvenDate: '2024-07-10',
        projectedROI12M: 2.85,
        projectedROI24M: 4.12,
        profitabilityScore: 81
      },
      marketData: {
        totalAddressableMarket: 8500000000,
        competitorPresence: 2,
        marketShare: 15.2,
        growthPotential: 'high',
        regulatoryScore: 85
      },
      expansionReadiness: {
        score: 76,
        factors: {
          financial: 82,
          operational: 78,
          market: 88,
          regulatory: 85,
          infrastructure: 67
        },
        recommendations: [
          'Strengthen infrastructure',
          'Expand driver base',
          'Launch tourist-focused services'
        ]
      }
    },
    {
      region_id: 'DAVAO',
      name: 'Davao Region',
      status: 'pilot',
      launchDate: '2024-06-01',
      investmentData: {
        initialInvestment: 3200000,
        operationalCosts: 1100000,
        marketingSpend: 650000,
        infrastructureSetup: 800000,
        staffingCosts: 450000,
        totalInvested: 6200000
      },
      revenueData: {
        monthlyRevenue: 580000,
        yearToDateRevenue: 3480000,
        projectedAnnualRevenue: 8500000,
        revenueGrowthRate: 28.7,
        avgRevenuePerTrip: 165
      },
      operationalMetrics: {
        totalTrips: 21000,
        activeDrivers: 485,
        activeRiders: 12500,
        marketPenetration: 1.8,
        driverUtilization: 0.52,
        customerSatisfaction: 4.2
      },
      roiMetrics: {
        currentROI: 0.56,
        paybackPeriodMonths: 28,
        breakEvenDate: '2026-10-01',
        projectedROI12M: 1.37,
        projectedROI24M: 2.84,
        profitabilityScore: 65
      },
      marketData: {
        totalAddressableMarket: 2800000000,
        competitorPresence: 1,
        marketShare: 8.9,
        growthPotential: 'high',
        regulatoryScore: 92
      },
      expansionReadiness: {
        score: 58,
        factors: {
          financial: 45,
          operational: 62,
          market: 75,
          regulatory: 92,
          infrastructure: 56
        },
        recommendations: [
          'Focus on operational efficiency',
          'Strengthen financial performance',
          'Build infrastructure capacity'
        ]
      }
    }
  ];

  const expansionPlaybooks: ExpansionPlaybook[] = [
    {
      id: 'metro-expansion',
      name: 'Metro Market Expansion',
      type: 'metro_expansion',
      description: 'Systematic expansion into major metropolitan areas with established transportation infrastructure',
      timeline: '12-18 months',
      investmentRange: [15000000, 35000000],
      expectedROI: 3.2,
      riskLevel: 'medium',
      prerequisites: [
        'Regulatory approval secured',
        'Local partner identified',
        'Minimum 500 drivers pre-registered',
        'Infrastructure assessment completed'
      ],
      phases: [
        {
          phase: 'Market Entry',
          duration: '3 months',
          milestones: [
            'Launch with 200 drivers',
            'Achieve 1000 weekly trips',
            'Establish customer support'
          ],
          investment: 8500000
        },
        {
          phase: 'Scale Up',
          duration: '6 months',
          milestones: [
            'Reach 1000 active drivers',
            'Achieve 15000 weekly trips',
            'Launch additional services'
          ],
          investment: 12500000
        },
        {
          phase: 'Market Leadership',
          duration: '9 months',
          milestones: [
            'Reach 2500+ drivers',
            'Achieve 35000+ weekly trips',
            'Establish market leadership position'
          ],
          investment: 14000000
        }
      ],
      successMetrics: [
        { metric: 'Monthly Active Drivers', target: 2500, timeline: '18 months' },
        { metric: 'Market Share', target: 25, timeline: '24 months' },
        { metric: 'Customer Satisfaction', target: 4.2, timeline: '12 months' },
        { metric: 'Break-even', target: 1, timeline: '20 months' }
      ]
    },
    {
      id: 'tourism-hub',
      name: 'Tourism Hub Strategy',
      type: 'tourism_hub',
      description: 'Focused expansion into tourist destinations with seasonal demand patterns',
      timeline: '8-12 months',
      investmentRange: [5000000, 12000000],
      expectedROI: 2.8,
      riskLevel: 'medium',
      prerequisites: [
        'Tourism board partnership',
        'Airport/hotel integrations',
        'Multilingual support capability',
        'Tourism-specific insurance coverage'
      ],
      phases: [
        {
          phase: 'Tourism Integration',
          duration: '2 months',
          milestones: [
            'Airport pickup integration',
            'Hotel partnership agreements',
            'Tourism package launches'
          ],
          investment: 2500000
        },
        {
          phase: 'Service Optimization',
          duration: '4 months',
          milestones: [
            'Peak season capacity planning',
            'Multilingual driver training',
            'Tourist-friendly app features'
          ],
          investment: 4200000
        },
        {
          phase: 'Market Expansion',
          duration: '6 months',
          milestones: [
            'Island-hopping services',
            'Tour package integration',
            'International tourist acquisition'
          ],
          investment: 5300000
        }
      ],
      successMetrics: [
        { metric: 'Tourist Trip Percentage', target: 60, timeline: '12 months' },
        { metric: 'Peak Season Capacity', target: 90, timeline: '8 months' },
        { metric: 'Multi-language Support', target: 3, timeline: '6 months' },
        { metric: 'Hotel Partnerships', target: 50, timeline: '10 months' }
      ]
    },
    {
      id: 'pilot-market',
      name: 'Pilot Market Validation',
      type: 'pilot_market',
      description: 'Low-risk market entry to validate demand and operational feasibility',
      timeline: '6-9 months',
      investmentRange: [2000000, 6000000],
      expectedROI: 1.8,
      riskLevel: 'low',
      prerequisites: [
        'Market research completed',
        'Pilot budget approved',
        'Core team identified',
        'Basic regulatory clearance'
      ],
      phases: [
        {
          phase: 'Pilot Launch',
          duration: '2 months',
          milestones: [
            'Launch with 50 drivers',
            'Achieve 500 weekly trips',
            'Basic service coverage'
          ],
          investment: 1200000
        },
        {
          phase: 'Data Collection',
          duration: '3 months',
          milestones: [
            'Market validation data',
            'Operational efficiency metrics',
            'Customer feedback analysis'
          ],
          investment: 1800000
        },
        {
          phase: 'Scale Decision',
          duration: '4 months',
          milestones: [
            'Go/No-go decision',
            'Expansion plan development',
            'Investment proposal'
          ],
          investment: 2000000
        }
      ],
      successMetrics: [
        { metric: 'Market Validation Score', target: 75, timeline: '6 months' },
        { metric: 'Driver Satisfaction', target: 4.0, timeline: '4 months' },
        { metric: 'Operational Efficiency', target: 80, timeline: '5 months' },
        { metric: 'Customer Acquisition Cost', target: 150, timeline: '3 months' }
      ]
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pilot': return 'text-blue-600 bg-blue-100';
      case 'planning': return 'text-purple-600 bg-purple-100';
      case 'retired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const sortedRegions = [...regionData].sort((a, b) => {
    switch (sortBy) {
      case 'roi': return b.roiMetrics.currentROI - a.roiMetrics.currentROI;
      case 'revenue': return b.revenueData.monthlyRevenue - a.revenueData.monthlyRevenue;
      case 'growth': return b.revenueData.revenueGrowthRate - a.revenueData.revenueGrowthRate;
      default: return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Region ROI & Expansion</h1>
          <p className="text-gray-600 mt-1">Strategic analysis and expansion playbooks for regional growth</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="12M">12 Months</option>
            <option value="24M">24 Months</option>
          </select>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'ROI Overview', icon: BarChart3 },
            { id: 'analysis', label: 'Deep Analysis', icon: Calculator },
            { id: 'playbooks', label: 'Expansion Playbooks', icon: BookOpen },
            { id: 'scenarios', label: 'Scenarios', icon: Target }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Investment</h3>
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(regionData.reduce((sum, r) => sum + r.investmentData.totalInvested, 0))}
                </div>
                <div className="text-sm text-green-600">Across {regionData.length} regions</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(regionData.reduce((sum, r) => sum + r.revenueData.monthlyRevenue, 0))}
                </div>
                <div className="text-sm text-green-600">+24% from last month</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Average ROI</h3>
                  <Target className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {(regionData.reduce((sum, r) => sum + r.roiMetrics.currentROI, 0) / regionData.length).toFixed(2)}x
                </div>
                <div className="text-sm text-green-600">Above 2.0x target</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Profitable Regions</h3>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {regionData.filter(r => r.roiMetrics.currentROI > 1).length}/{regionData.length}
                </div>
                <div className="text-sm text-green-600">Strong performance</div>
              </div>
            </div>

            {/* Regional Performance Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Regional Performance</h3>
                  <div className="flex items-center space-x-3">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                    >
                      <option value="roi">Sort by ROI</option>
                      <option value="revenue">Sort by Revenue</option>
                      <option value="growth">Sort by Growth</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current ROI</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Readiness</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedRegions.map((region) => (
                      <tr key={region.region_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Globe className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="font-medium text-gray-900">{region.name}</div>
                              <div className="text-sm text-gray-500">Since {new Date(region.launchDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(region.status)}`}>
                            {region.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(region.investmentData.totalInvested)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(region.revenueData.monthlyRevenue)}</div>
                          <div className="text-xs text-gray-500">YTD: {formatCurrency(region.revenueData.yearToDateRevenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${region.roiMetrics.currentROI > 1 ? 'text-green-600' : 'text-red-600'}`}>
                              {region.roiMetrics.currentROI.toFixed(2)}x
                            </span>
                            {region.roiMetrics.currentROI > 1 ? 
                              <TrendingUp className="w-4 h-4 text-green-500" /> : 
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">+{formatPercentage(region.revenueData.revenueGrowthRate)}</span>
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${region.expansionReadiness.score > 80 ? 'bg-green-500' : region.expansionReadiness.score > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${region.expansionReadiness.score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{region.expansionReadiness.score}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 flex items-center space-x-1">
                            <span>Analyze</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playbooks' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Expansion Playbooks</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Strategic templates and methodologies for systematic regional expansion
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {expansionPlaybooks.map((playbook) => (
                <div key={playbook.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{playbook.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{playbook.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(playbook.riskLevel)}`}>
                      {playbook.riskLevel} risk
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Timeline:</span>
                      <span className="font-medium text-gray-900">{playbook.timeline}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Investment:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(playbook.investmentRange[0])} - {formatCurrency(playbook.investmentRange[1])}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Expected ROI:</span>
                      <span className="font-medium text-green-600">{playbook.expectedROI}x</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Prerequisites ({playbook.prerequisites.length})</h4>
                    <div className="space-y-1">
                      {playbook.prerequisites.slice(0, 3).map((prereq, index) => (
                        <div key={index} className="flex items-center text-xs text-gray-600">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {prereq}
                        </div>
                      ))}
                      {playbook.prerequisites.length > 3 && (
                        <div className="text-xs text-gray-500">+{playbook.prerequisites.length - 3} more</div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Phases ({playbook.phases.length})</h4>
                    <div className="space-y-2">
                      {playbook.phases.map((phase, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{phase.phase}</div>
                            <div className="text-gray-500">{phase.duration}</div>
                          </div>
                          <div className="text-xs font-medium text-gray-900">
                            {formatCurrency(phase.investment)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center text-blue-600 text-sm font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    View Playbook Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionROIDashboard;