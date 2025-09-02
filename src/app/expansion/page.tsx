'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, MapPin, Target, 
  Brain, Zap, AlertCircle, CheckCircle, Clock, BarChart3,
  PieChart, Activity, Layers, Settings, Eye, Search,
  ChevronRight, Star, Lightbulb, Rocket, Shield, Globe
} from 'lucide-react';

// Xpress Colors
const XpressColors = {
  rose: '#EB1D25',
  navy: '#03233A', 
  digitalBlue: '#0A4060'
};

interface Region {
  region_id: string;
  name: string;
  region_state: 'active' | 'pilot' | 'draft' | 'paused';
  status: 'mature_market' | 'growth_market' | 'emerging_market' | 'market_research' | 'strategic_review';
  city_province: string;
  launch_date: string;
  expansion_manager: string;
  market_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'niche';
  population: number;
  gdp_per_capita: number;
  smartphone_penetration: number;
  internet_coverage: number;
  ai_insights: {
    market_saturation: number;
    growth_potential: number;
    competition_density: number;
    regulatory_risk: number;
    fraud_risk_score: number;
    expansion_readiness: number;
  };
  primary_product: {
    name: string;
    status: string;
    market_share: number;
    daily_trips: number;
    revenue: number;
    profitability: number;
    user_acquisition_cost: number;
    lifetime_value: number;
    nps_score: number;
    operational_efficiency: number;
    fraud_rate: number;
    ml_optimization_level: 'none' | 'basic' | 'intermediate' | 'advanced';
    next_milestone: string;
  };
  secondary_products: {
    name: string;
    status: string;
    market_penetration: number;
    revenue: number;
    growth_rate: number;
    investment_required: number;
    roi_projection: number;
    time_to_profitability: number;
    ai_demand_forecast: string;
    competitive_advantage: number;
  }[];
  expansion_metrics: {
    staff_count: number;
    zones_count: number;
    active_experiments: number;
    expansion_budget: number;
    next_quarter_targets: {
      primary_growth: number;
      secondary_launch: number;
      market_share_gain: number;
    };
  };
}

const ExpansionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Regional Expansion - Primary & Secondary Product Strategy with AI Integration
  const regions: Region[] = [
    {
      region_id: 'NCR',
      name: 'Metro Manila',
      region_state: 'active',
      status: 'mature_market',
      city_province: 'National Capital Region',
      launch_date: '2019-03-15',
      expansion_manager: 'Maria Santos',
      market_tier: 'tier_1',
      population: 13484462,
      gdp_per_capita: 185000,
      smartphone_penetration: 0.89,
      internet_coverage: 0.95,
      ai_insights: {
        market_saturation: 0.78,
        growth_potential: 0.45,
        competition_density: 0.85,
        regulatory_risk: 0.25,
        fraud_risk_score: 0.32,
        expansion_readiness: 0.95
      },
      primary_product: {
        name: 'TNVS Rides',
        status: 'optimized',
        market_share: 0.42,
        daily_trips: 45000,
        revenue: 2250000,
        profitability: 0.35,
        user_acquisition_cost: 120,
        lifetime_value: 2400,
        nps_score: 72,
        operational_efficiency: 0.92,
        fraud_rate: 0.028,
        ml_optimization_level: 'advanced',
        next_milestone: 'Market Leadership'
      },
      secondary_products: [
        {
          name: 'Food Delivery',
          status: 'scaling',
          market_penetration: 0.34,
          revenue: 890000,
          growth_rate: 0.45,
          investment_required: 2500000,
          roi_projection: 2.8,
          time_to_profitability: 18,
          ai_demand_forecast: 'high',
          competitive_advantage: 0.65
        },
        {
          name: 'Last Mile Logistics',
          status: 'pilot',
          market_penetration: 0.12,
          revenue: 340000,
          growth_rate: 0.78,
          investment_required: 4200000,
          roi_projection: 3.5,
          time_to_profitability: 24,
          ai_demand_forecast: 'very_high',
          competitive_advantage: 0.82
        },
        {
          name: 'Electric Mobility',
          status: 'testing',
          market_penetration: 0.05,
          revenue: 150000,
          growth_rate: 1.25,
          investment_required: 8900000,
          roi_projection: 4.2,
          time_to_profitability: 36,
          ai_demand_forecast: 'emerging',
          competitive_advantage: 0.91
        }
      ],
      expansion_metrics: {
        staff_count: 25,
        zones_count: 12,
        active_experiments: 8,
        expansion_budget: 15000000,
        next_quarter_targets: {
          primary_growth: 0.15,
          secondary_launch: 2,
          market_share_gain: 0.08
        }
      }
    },
    {
      region_id: 'CEB',
      name: 'Cebu Metro',
      region_state: 'active',
      status: 'growth_market',
      city_province: 'Cebu Province',
      launch_date: '2020-08-15',
      expansion_manager: 'Juan Alvarez',
      market_tier: 'tier_2',
      population: 2849213,
      gdp_per_capita: 142000,
      smartphone_penetration: 0.76,
      internet_coverage: 0.88,
      ai_insights: {
        market_saturation: 0.45,
        growth_potential: 0.82,
        competition_density: 0.58,
        regulatory_risk: 0.35,
        fraud_risk_score: 0.41,
        expansion_readiness: 0.85
      },
      primary_product: {
        name: 'TNVS Rides',
        status: 'growing',
        market_share: 0.28,
        daily_trips: 18500,
        revenue: 1420000,
        profitability: 0.22,
        user_acquisition_cost: 95,
        lifetime_value: 1800,
        nps_score: 68,
        operational_efficiency: 0.84,
        fraud_rate: 0.035,
        ml_optimization_level: 'intermediate',
        next_milestone: 'Market Expansion'
      },
      secondary_products: [
        {
          name: 'Food Delivery',
          status: 'launching',
          market_penetration: 0.18,
          revenue: 285000,
          growth_rate: 0.92,
          investment_required: 1800000,
          roi_projection: 2.2,
          time_to_profitability: 15,
          ai_demand_forecast: 'high',
          competitive_advantage: 0.72
        },
        {
          name: 'Tourism Mobility',
          status: 'planning',
          market_penetration: 0.08,
          revenue: 120000,
          growth_rate: 1.45,
          investment_required: 3200000,
          roi_projection: 3.8,
          time_to_profitability: 22,
          ai_demand_forecast: 'very_high',
          competitive_advantage: 0.89
        }
      ],
      expansion_metrics: {
        staff_count: 15,
        zones_count: 8,
        active_experiments: 5,
        expansion_budget: 8500000,
        next_quarter_targets: {
          primary_growth: 0.25,
          secondary_launch: 1,
          market_share_gain: 0.12
        }
      }
    },
    {
      region_id: 'DAV',
      name: 'Davao Region',
      region_state: 'pilot',
      status: 'emerging_market',
      city_province: 'Davao del Sur',
      launch_date: '2023-02-01',
      expansion_manager: 'Anna Reyes',
      market_tier: 'tier_3',
      population: 1776949,
      gdp_per_capita: 118000,
      smartphone_penetration: 0.68,
      internet_coverage: 0.82,
      ai_insights: {
        market_saturation: 0.15,
        growth_potential: 0.94,
        competition_density: 0.35,
        regulatory_risk: 0.45,
        fraud_risk_score: 0.52,
        expansion_readiness: 0.72
      },
      primary_product: {
        name: 'TNVS Rides',
        status: 'validating',
        market_share: 0.12,
        daily_trips: 6500,
        revenue: 485000,
        profitability: -0.08,
        user_acquisition_cost: 145,
        lifetime_value: 1200,
        nps_score: 75,
        operational_efficiency: 0.71,
        fraud_rate: 0.048,
        ml_optimization_level: 'basic',
        next_milestone: 'Product-Market Fit'
      },
      secondary_products: [
        {
          name: 'Agricultural Logistics',
          status: 'research',
          market_penetration: 0.02,
          revenue: 45000,
          growth_rate: 2.1,
          investment_required: 2800000,
          roi_projection: 5.2,
          time_to_profitability: 30,
          ai_demand_forecast: 'emerging_high',
          competitive_advantage: 0.95
        }
      ],
      expansion_metrics: {
        staff_count: 8,
        zones_count: 4,
        active_experiments: 3,
        expansion_budget: 4200000,
        next_quarter_targets: {
          primary_growth: 0.45,
          secondary_launch: 0,
          market_share_gain: 0.08
        }
      }
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Expansion Overview', icon: Globe },
    { id: 'primary', label: 'Primary Product', icon: Target },
    { id: 'secondary', label: 'Secondary Products', icon: Layers },
    { id: 'ai_insights', label: 'AI Market Intelligence', icon: Brain },
    { id: 'investment', label: 'Investment Strategy', icon: DollarSign },
    { id: 'performance', label: 'Performance Metrics', icon: BarChart3 }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      'mature_market': 'bg-green-100 text-green-800',
      'growth_market': 'bg-blue-100 text-blue-800',
      'emerging_market': 'bg-yellow-100 text-yellow-800',
      'market_research': 'bg-purple-100 text-purple-800',
      'strategic_review': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getMLOptimizationBadge = (level: string) => {
    const badges = {
      'none': { color: 'bg-gray-100 text-gray-600', icon: '⚫' },
      'basic': { color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
      'intermediate': { color: 'bg-blue-100 text-blue-700', icon: '🔵' },
      'advanced': { color: 'bg-green-100 text-green-700', icon: '🟢' }
    };
    const badge = badges[level as keyof typeof badges] || badges.none;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon} {level.toUpperCase()} ML
      </span>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Regional Expansion Strategy</h3>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">AI-Powered Intelligence</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: XpressColors.rose }}>
              {regions.filter(r => r.region_state === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Markets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ₱{(regions.reduce((sum, r) => sum + r.primary_product.revenue, 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {regions.filter(r => r.primary_product.profitability > 0).length}
            </div>
            <div className="text-sm text-gray-600">Profitable Markets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {regions.reduce((sum, r) => sum + r.secondary_products.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Secondary Products</div>
          </div>
        </div>

        {/* AI-Driven Market Recommendations */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-gray-900">AI Market Recommendations</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded p-3 border">
              <div className="font-medium text-green-700 mb-1">🚀 High Potential: Davao Region</div>
              <div className="text-gray-600">94% growth potential with minimal competition. Consider agricultural logistics expansion.</div>
            </div>
            <div className="bg-white rounded p-3 border">
              <div className="font-medium text-blue-700 mb-1">⚡ Optimize: Metro Manila</div>
              <div className="text-gray-600">Advanced ML ready. Focus on electric mobility and last-mile logistics scaling.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Portfolio */}
      <div className="grid gap-6">
        {regions.map(region => (
          <div key={region.region_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg mr-4" style={{ backgroundColor: `${XpressColors.digitalBlue}20` }}>
                  <MapPin className="w-6 h-6" style={{ color: XpressColors.digitalBlue }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{region.name}</h3>
                  <p className="text-gray-600">{region.city_province}</p>
                  <p className="text-sm text-gray-500">Managed by {region.expansion_manager}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(region.status)}`}>
                  {region.status.replace('_', ' ').toUpperCase()}
                </span>
                <div className="mt-2">
                  {getMLOptimizationBadge(region.primary_product.ml_optimization_level)}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Primary Product */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Primary Product</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Share:</span>
                    <span className="font-medium">{(region.primary_product.market_share * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Trips:</span>
                    <span className="font-medium">{region.primary_product.daily_trips.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profitability:</span>
                    <span className={`font-medium ${region.primary_product.profitability > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(region.primary_product.profitability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-500">Next Milestone:</div>
                    <div className="font-medium text-blue-600">{region.primary_product.next_milestone}</div>
                  </div>
                </div>
              </div>

              {/* Secondary Products */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Layers className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Secondary Products</h4>
                </div>
                <div className="space-y-2">
                  {region.secondary_products.length > 0 ? (
                    region.secondary_products.slice(0, 2).map((product, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{product.name}</span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {product.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>ROI: {product.roi_projection}x</span>
                          <span>{product.growth_rate > 1 ? '+' : ''}{(product.growth_rate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No secondary products planned
                    </div>
                  )}
                </div>
              </div>

              {/* AI Insights */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Brain className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">AI Market Intelligence</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Growth Potential:</span>
                    <span className="font-medium text-green-600">
                      {(region.ai_insights.growth_potential * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Saturation:</span>
                    <span className="font-medium text-blue-600">
                      {(region.ai_insights.market_saturation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fraud Risk:</span>
                    <span className={`font-medium ${region.ai_insights.fraud_risk_score > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                      {(region.ai_insights.fraud_risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-500">Expansion Readiness:</div>
                    <div className="font-medium text-purple-600">
                      {(region.ai_insights.expansion_readiness * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex space-x-4 text-sm text-gray-600">
                <span>Budget: ₱{(region.expansion_metrics.expansion_budget / 1000000).toFixed(1)}M</span>
                <span>Experiments: {region.expansion_metrics.active_experiments}</span>
                <span>Zones: {region.expansion_metrics.zones_count}</span>
              </div>
              <button 
                onClick={() => setSelectedRegion(region.region_id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Regional Expansion Strategy</h1>
              <p className="text-gray-600">AI-Powered Primary & Secondary Product Expansion</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">ML Intelligence Active</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search regions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ height: '48px', alignItems: 'center' }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {/* Additional tabs will be implemented based on user feedback */}
            {activeTab !== 'overview' && (
              <div className="text-center py-12 text-gray-500">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {tabs.find(t => t.id === activeTab)?.label} Coming Soon
                </h3>
                <p>Advanced {activeTab.replace('_', ' ')} analytics and insights will be available here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpansionDashboard;