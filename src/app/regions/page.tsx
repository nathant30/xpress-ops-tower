'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, MapPin, Target, 
  Brain, Zap, AlertCircle, CheckCircle, Clock, BarChart3,
  PieChart, Activity, Layers, Settings, Eye, Search,
  ChevronRight, Star, Lightbulb, Rocket, Shield, Grid,
  FileText, Calendar, Map, MoreHorizontal, ArrowUp, ArrowDown,
  Globe, Gauge, Award, AlertTriangle, TrendingFlat, Bot,
  PlayCircle, PauseCircle, StopCircle, RefreshCw, Filter,
  ExternalLink, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  Building, Truck, ShoppingBag, Coffee, Plane, Briefcase,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Xpress Colors
const XpressColors = {
  rose: '#EB1D25',
  navy: '#03233A', 
  digitalBlue: '#0A4060'
};

// Enhanced Region Interface with AI/ML capabilities
interface EnhancedRegion {
  id: number;
  regionCode: string;
  name: string;
  tier: 1 | 2 | 3;
  lifecycleStage: 'draft' | 'pilot' | 'active' | 'paused' | 'retired';
  marketMaturity: 'emerging' | 'growth' | 'mature' | 'declining';
  
  // Demographics & Market
  population: number;
  gdpPerCapita: number;
  smartphonePenetration: number;
  internetCoverage: number;
  
  // AI Health & Intelligence
  aiHealthScore: number;
  aiHealthComponents: {
    operational: number;
    financial: number;
    compliance: number;
    market: number;
    risk: number;
    customer: number;
  };
  
  // Business Metrics
  profitCenterId: string;
  expansionBudget: number;
  
  // Current Performance
  dailyTrips: number;
  monthlyRevenue: number;
  profitMargin: number;
  marketShare: number;
  npsScore: number;
  fraudRate: number;
  
  // Expansion Manager & Team
  expansionManager: string;
  staffCount: number;
  zonesCount: number;
  
  // Services Portfolio
  primaryServices: ServiceMetric[];
  secondaryServices: ServiceMetric[];
  
  // Risk & Compliance
  complianceAlerts: number;
  riskFactors: string[];
  nextReviewDate: string;
  
  // AI Recommendations
  activeRecommendations: Recommendation[];
  
  createdAt: string;
  updatedAt: string;
}

interface ServiceMetric {
  serviceCode: string;
  serviceName: string;
  localAlias?: string;
  isEnabled: boolean;
  dailyVolume: number;
  monthlyRevenue: number;
  marketPenetration: number;
  aiGrowthPotential: number;
  competitiveAdvantage: number;
}

interface Recommendation {
  id: number;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  confidence: number;
  impactScore: number;
  effortScore: number;
  roiProjection: number;
  status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'implemented';
  createdAt: string;
  expiresAt: string;
}

const UnifiedRegionalManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(false);

  // Mock data with comprehensive AI/ML integration
  const regions: EnhancedRegion[] = [
    {
      id: 1,
      regionCode: 'NCR',
      name: 'Metro Manila',
      tier: 1,
      lifecycleStage: 'active',
      marketMaturity: 'mature',
      population: 13484462,
      gdpPerCapita: 185000,
      smartphonePenetration: 0.89,
      internetCoverage: 0.95,
      aiHealthScore: 85.5,
      aiHealthComponents: {
        operational: 92,
        financial: 88,
        compliance: 95,
        market: 78,
        risk: 85,
        customer: 82
      },
      profitCenterId: 'PH-NCR-001',
      expansionBudget: 15000000,
      dailyTrips: 45000,
      monthlyRevenue: 2250000,
      profitMargin: 0.35,
      marketShare: 0.42,
      npsScore: 72,
      fraudRate: 0.028,
      expansionManager: 'Maria Santos',
      staffCount: 25,
      zonesCount: 12,
      primaryServices: [
        {
          serviceCode: 'rides',
          serviceName: 'TNVS Rides',
          isEnabled: true,
          dailyVolume: 42000,
          monthlyRevenue: 2100000,
          marketPenetration: 0.42,
          aiGrowthPotential: 0.45,
          competitiveAdvantage: 0.78
        }
      ],
      secondaryServices: [
        {
          serviceCode: 'food_delivery',
          serviceName: 'Food Delivery',
          localAlias: 'Xpress Eats Manila',
          isEnabled: true,
          dailyVolume: 18500,
          monthlyRevenue: 890000,
          marketPenetration: 0.34,
          aiGrowthPotential: 0.68,
          competitiveAdvantage: 0.65
        },
        {
          serviceCode: 'last_mile',
          serviceName: 'Last Mile Logistics',
          isEnabled: false,
          dailyVolume: 0,
          monthlyRevenue: 0,
          marketPenetration: 0.0,
          aiGrowthPotential: 0.82,
          competitiveAdvantage: 0.91
        }
      ],
      complianceAlerts: 1,
      riskFactors: ['high_competition', 'regulatory_changes'],
      nextReviewDate: '2024-10-15',
      activeRecommendations: [
        {
          id: 1,
          type: 'service_mix',
          priority: 'high',
          title: 'Enable Last Mile Logistics',
          message: 'AI forecasts 82% growth potential for logistics services in Metro Manila. High competitive advantage (91%) suggests early mover opportunity.',
          confidence: 0.89,
          impactScore: 85,
          effortScore: 45,
          roiProjection: 3.5,
          status: 'pending',
          createdAt: '2024-09-01',
          expiresAt: '2024-10-01'
        },
        {
          id: 2,
          type: 'financial_efficiency',
          priority: 'medium',
          title: 'Optimize Driver Incentives',
          message: 'Current cost-per-trip 15% above tier 1 benchmark. Adjusting incentive structure could improve margin by 8%.',
          confidence: 0.76,
          impactScore: 65,
          effortScore: 25,
          roiProjection: 1.8,
          status: 'under_review',
          createdAt: '2024-08-28',
          expiresAt: '2024-09-28'
        }
      ],
      createdAt: '2019-03-15T00:00:00Z',
      updatedAt: '2024-09-01T12:00:00Z'
    },
    {
      id: 2,
      regionCode: 'CEB',
      name: 'Cebu Metro',
      tier: 2,
      lifecycleStage: 'active',
      marketMaturity: 'growth',
      population: 2849213,
      gdpPerCapita: 142000,
      smartphonePenetration: 0.76,
      internetCoverage: 0.88,
      aiHealthScore: 78.2,
      aiHealthComponents: {
        operational: 84,
        financial: 72,
        compliance: 88,
        market: 85,
        risk: 78,
        customer: 74
      },
      profitCenterId: 'PH-CEB-001',
      expansionBudget: 8500000,
      dailyTrips: 18500,
      monthlyRevenue: 1420000,
      profitMargin: 0.22,
      marketShare: 0.28,
      npsScore: 68,
      fraudRate: 0.035,
      expansionManager: 'Juan Alvarez',
      staffCount: 15,
      zonesCount: 8,
      primaryServices: [
        {
          serviceCode: 'rides',
          serviceName: 'TNVS Rides',
          isEnabled: true,
          dailyVolume: 17500,
          monthlyRevenue: 1200000,
          marketPenetration: 0.28,
          aiGrowthPotential: 0.82,
          competitiveAdvantage: 0.68
        }
      ],
      secondaryServices: [
        {
          serviceCode: 'food_delivery',
          serviceName: 'Food Delivery',
          localAlias: 'Xpress Eats Cebu',
          isEnabled: true,
          dailyVolume: 2800,
          monthlyRevenue: 220000,
          marketPenetration: 0.18,
          aiGrowthPotential: 0.72,
          competitiveAdvantage: 0.65
        },
        {
          serviceCode: 'tourism_mobility',
          serviceName: 'Tourism Mobility',
          localAlias: 'Cebu Island Tours',
          isEnabled: false,
          dailyVolume: 0,
          monthlyRevenue: 0,
          marketPenetration: 0.0,
          aiGrowthPotential: 0.95,
          competitiveAdvantage: 0.89
        }
      ],
      complianceAlerts: 0,
      riskFactors: ['seasonal_demand', 'tourism_dependency'],
      nextReviewDate: '2024-09-30',
      activeRecommendations: [
        {
          id: 3,
          type: 'growth_opportunity',
          priority: 'critical',
          title: 'Launch Tourism Mobility Service',
          message: 'Peak tourism season approaching. AI models show 95% growth potential with minimal competition. Launch recommended before October.',
          confidence: 0.94,
          impactScore: 92,
          effortScore: 35,
          roiProjection: 4.2,
          status: 'pending',
          createdAt: '2024-08-30',
          expiresAt: '2024-09-15'
        }
      ],
      createdAt: '2020-08-15T00:00:00Z',
      updatedAt: '2024-09-01T10:30:00Z'
    },
    {
      id: 3,
      regionCode: 'DAV',
      name: 'Davao Region',
      tier: 3,
      lifecycleStage: 'pilot',
      marketMaturity: 'emerging',
      population: 1776949,
      gdpPerCapita: 118000,
      smartphonePenetration: 0.68,
      internetCoverage: 0.82,
      aiHealthScore: 65.8,
      aiHealthComponents: {
        operational: 71,
        financial: 55,
        compliance: 82,
        market: 75,
        risk: 68,
        customer: 78
      },
      profitCenterId: 'PH-DAV-001',
      expansionBudget: 4200000,
      dailyTrips: 6500,
      monthlyRevenue: 485000,
      profitMargin: -0.08,
      marketShare: 0.12,
      npsScore: 75,
      fraudRate: 0.048,
      expansionManager: 'Anna Reyes',
      staffCount: 8,
      zonesCount: 4,
      primaryServices: [
        {
          serviceCode: 'rides',
          serviceName: 'TNVS Rides',
          isEnabled: true,
          dailyVolume: 6500,
          monthlyRevenue: 485000,
          marketPenetration: 0.12,
          aiGrowthPotential: 0.94,
          competitiveAdvantage: 0.58
        }
      ],
      secondaryServices: [
        {
          serviceCode: 'agricultural_logistics',
          serviceName: 'Agricultural Logistics',
          localAlias: 'Farm-to-Market Express',
          isEnabled: false,
          dailyVolume: 0,
          monthlyRevenue: 0,
          marketPenetration: 0.02,
          aiGrowthPotential: 0.97,
          competitiveAdvantage: 0.95
        }
      ],
      complianceAlerts: 2,
      riskFactors: ['low_penetration', 'profitability_gap', 'fraud_risk'],
      nextReviewDate: '2024-09-15',
      activeRecommendations: [
        {
          id: 4,
          type: 'tier_upgrade',
          priority: 'medium',
          title: 'Consider Tier 2 Promotion',
          message: 'Market penetration and customer satisfaction metrics approaching Tier 2 thresholds. Profitability remains the key blocker.',
          confidence: 0.67,
          impactScore: 78,
          effortScore: 65,
          roiProjection: 2.1,
          status: 'pending',
          createdAt: '2024-08-25',
          expiresAt: '2024-10-25'
        },
        {
          id: 5,
          type: 'service_mix',
          priority: 'high',
          title: 'Pilot Agricultural Logistics',
          message: 'Unique opportunity in agricultural sector with 97% growth potential and 95% competitive advantage. Perfect fit for Davao\'s economy.',
          confidence: 0.91,
          impactScore: 88,
          effortScore: 55,
          roiProjection: 5.2,
          status: 'pending',
          createdAt: '2024-08-20',
          expiresAt: '2024-09-20'
        }
      ],
      createdAt: '2023-02-01T00:00:00Z',
      updatedAt: '2024-09-01T08:15:00Z'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'regions', label: 'Portfolio', icon: Building },
    { id: 'ai_insights', label: 'AI Intelligence', icon: Brain },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
    { id: 'financials', label: 'P&L Centers', icon: DollarSign },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'governance', label: 'Governance', icon: Settings }
  ];

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTierBadge = (tier: number) => {
    const tiers = {
      1: { label: 'Tier 1 - Core Metro', color: 'bg-purple-100 text-purple-800', icon: '🏙️' },
      2: { label: 'Tier 2 - Growth Hub', color: 'bg-blue-100 text-blue-800', icon: '🌆' },
      3: { label: 'Tier 3 - Pilot Market', color: 'bg-green-100 text-green-800', icon: '🌱' }
    };
    const tierInfo = tiers[tier as keyof typeof tiers];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.color}`}>
        {tierInfo.icon} {tierInfo.label}
      </span>
    );
  };

  const getLifecycleBadge = (stage: string) => {
    const stages = {
      'draft': { color: 'bg-gray-100 text-gray-700', icon: '📝' },
      'pilot': { color: 'bg-blue-100 text-blue-700', icon: '🧪' },
      'active': { color: 'bg-green-100 text-green-700', icon: '🚀' },
      'paused': { color: 'bg-yellow-100 text-yellow-700', icon: '⏸️' },
      'retired': { color: 'bg-red-100 text-red-700', icon: '🏁' }
    };
    const stageInfo = stages[stage as keyof typeof stages];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
        {stageInfo.icon} {stage.toUpperCase()}
      </span>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'critical': 'text-red-700 bg-red-100 border-red-200',
      'high': 'text-orange-700 bg-orange-100 border-orange-200',
      'medium': 'text-blue-700 bg-blue-100 border-blue-200',
      'low': 'text-gray-700 bg-gray-100 border-gray-200'
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  // KpiCard component matching dashboard design
  const KpiCard = ({label, value, trend, up, icon: Icon}: {label: string, value: string, trend?: string, up?: boolean, icon?: any}) => {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
            {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              up ? "text-emerald-600" : trend.includes('-') ? "text-emerald-600" : "text-red-500"
            }`}>
              {up || trend.includes('-') ? 
                <ArrowUpRight className="w-3 h-3" /> : 
                <ArrowDownRight className="w-3 h-3" />
              }
              <span>{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  };

  const renderRegionalPortfolio = () => (
    <div className="space-y-6">
      {/* Regional Management Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Regional Portfolio Management</h3>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Create New Region
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh AI Health
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">Tier 1 - Core Metro</span>
              <span className="text-2xl font-bold text-purple-600">1</span>
            </div>
            <div className="text-xs text-purple-600 mt-1">Full service portfolio • Mature markets</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Tier 2 - Growth Hub</span>
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">Core + custom services • Tourist hubs</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Tier 3 - Pilot</span>
              <span className="text-2xl font-bold text-green-600">1</span>
            </div>
            <div className="text-xs text-green-600 mt-1">Experimental services • Peripheral markets</div>
          </div>
        </div>
      </div>

      {/* Detailed Regional Cards */}
      {regions.map(region => (
        <div key={region.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-lg mr-4" style={{ backgroundColor: `${XpressColors.digitalBlue}20` }}>
                  <Building className="w-8 h-8" style={{ color: XpressColors.digitalBlue }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{region.name}</h3>
                  <p className="text-gray-600">{region.regionCode} • Population: {region.population.toLocaleString()}</p>
                  <div className="flex items-center mt-2 space-x-3">
                    {getTierBadge(region.tier)}
                    {getLifecycleBadge(region.lifecycleStage)}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {region.marketMaturity} market
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${getHealthColor(region.aiHealthScore)}`}>
                  <Gauge className="w-5 h-5 mr-2" />
                  AI Health: {region.aiHealthScore}%
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Key Metrics */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{region.dailyTrips.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Daily Trips</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₱{(region.monthlyRevenue/1000000).toFixed(1)}M</div>
                    <div className="text-xs text-gray-600">Monthly Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${region.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(region.profitMargin * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">Profit Margin</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{(region.marketShare * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-600">Market Share</div>
                  </div>
                </div>
              </div>

              {/* Team & Resources */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Team & Resources</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Expansion Manager:</span>
                    <span className="font-medium text-gray-900">{region.expansionManager}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Team Size:</span>
                    <span className="font-medium text-gray-900">{region.staffCount} staff</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Operational Zones:</span>
                    <span className="font-medium text-gray-900">{region.zonesCount} zones</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Expansion Budget:</span>
                    <span className="font-medium text-green-600">₱{(region.expansionBudget/1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Next Review:</span>
                    <span className="font-medium text-gray-900">{new Date(region.nextReviewDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Portfolio */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Services Portfolio</h4>
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                  Manage Services
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Active Services</h5>
                  {[...region.primaryServices, ...region.secondaryServices]
                    .filter(service => service.isEnabled)
                    .map(service => (
                      <div key={service.serviceCode} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                        <div>
                          <div className="font-medium text-green-800">{service.localAlias || service.serviceName}</div>
                          <div className="text-sm text-green-600">{service.dailyVolume.toLocaleString()} daily • ₱{(service.monthlyRevenue/1000000).toFixed(1)}M/mo</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-700">{(service.marketPenetration * 100).toFixed(1)}%</div>
                          <div className="text-xs text-green-600">penetration</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Growth Opportunities</h5>
                  {[...region.primaryServices, ...region.secondaryServices]
                    .filter(service => !service.isEnabled && service.aiGrowthPotential > 0.6)
                    .map(service => (
                      <div key={service.serviceCode} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                        <div>
                          <div className="font-medium text-yellow-800">{service.serviceName}</div>
                          <div className="text-sm text-yellow-600">AI Growth Potential: {(service.aiGrowthPotential * 100).toFixed(0)}%</div>
                        </div>
                        <button className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300">
                          Enable
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                {region.complianceAlerts > 0 && (
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-sm">{region.complianceAlerts} compliance alerts</span>
                  </div>
                )}
                {region.riskFactors.length > 0 && (
                  <div className="flex items-center text-orange-600">
                    <Shield className="w-4 h-4 mr-1" />
                    <span className="text-sm">{region.riskFactors.length} risk factors</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Insights
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAIIntelligence = () => (
    <div className="space-y-6">
      {/* AI Engine Status */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">AI/ML Intelligence Engine</h3>
              <p className="text-gray-600">Advanced machine learning for regional optimization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Engine Active</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">47</div>
            <div className="text-sm text-gray-600">Regional Factors</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-sm text-gray-600">Market Indicators</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">94.2%</div>
            <div className="text-sm text-gray-600">Model Accuracy</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">127ms</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
        </div>
      </div>

      {/* AI Health Analysis */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Regional AI Health Scores</h4>
          <div className="space-y-4">
            {regions.map(region => (
              <div key={region.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{region.name}</div>
                  <div className="text-sm text-gray-600">Tier {region.tier} • {region.lifecycleStage}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getHealthColor(region.aiHealthScore).split(' ')[0]}`}>
                    {region.aiHealthScore.toFixed(1)}%
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {Object.entries(region.aiHealthComponents).map(([key, score]) => (
                      <div key={key} className={`w-2 h-2 rounded-full ${score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-blue-400' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Growth Forecasting</h4>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-800">30-Day Forecast</span>
                <span className="text-sm text-green-600">High Confidence</span>
              </div>
              <div className="text-2xl font-bold text-green-600">+15.8%</div>
              <div className="text-sm text-green-700">Revenue growth across all regions</div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800">60-Day Forecast</span>
                <span className="text-sm text-blue-600">Medium Confidence</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">+28.3%</div>
              <div className="text-sm text-blue-700">Trip volume increase expected</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-800">90-Day Forecast</span>
                <span className="text-sm text-purple-600">Market Analysis</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">2.8x ROI</div>
              <div className="text-sm text-purple-700">Expected return on new services</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance & Model Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Model Explainability</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-800 mb-3">Top Feature Importance</h5>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Market Saturation</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div className="w-4/5 h-2 bg-purple-500 rounded"></div>
                  </div>
                  <span className="text-sm font-medium">40%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Demographics</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div className="w-3/5 h-2 bg-blue-500 rounded"></div>
                  </div>
                  <span className="text-sm font-medium">30%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Seasonality</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div className="w-1/5 h-2 bg-green-500 rounded"></div>
                  </div>
                  <span className="text-sm font-medium">20%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Competition</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-gray-200 rounded">
                    <div className="w-1/10 h-2 bg-orange-500 rounded"></div>
                  </div>
                  <span className="text-sm font-medium">10%</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-800 mb-3">Model Performance Metrics</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Precision:</span>
                <span className="font-medium text-green-600">94.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recall:</span>
                <span className="font-medium text-blue-600">91.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">F1 Score:</span>
                <span className="font-medium text-purple-600">92.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AUC-ROC:</span>
                <span className="font-medium text-orange-600">0.956</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecommendations = () => {
    const allRecommendations = regions.flatMap(region => 
      region.activeRecommendations.map(rec => ({
        ...rec,
        regionName: region.name,
        regionCode: region.regionCode,
        regionId: region.id
      }))
    );

    return (
      <div className="space-y-6">
        {/* Recommendations Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Recommendations Dashboard</h3>
              <p className="text-gray-600">Machine learning powered insights and actionable suggestions</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Recommendations
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {allRecommendations.filter(r => r.priority === 'critical').length}
              </div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {allRecommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm text-orange-700">High Priority</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {allRecommendations.filter(r => r.priority === 'medium').length}
              </div>
              <div className="text-sm text-blue-700">Medium Priority</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">
                {allRecommendations.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-700">Pending Review</div>
            </div>
          </div>
        </div>

        {/* Active Recommendations */}
        <div className="space-y-4">
          {allRecommendations
            .sort((a, b) => {
              const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
              return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
            })
            .map(rec => (
              <div key={rec.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${
                rec.priority === 'critical' ? 'border-l-red-500' :
                rec.priority === 'high' ? 'border-l-orange-500' :
                rec.priority === 'medium' ? 'border-l-blue-500' : 'border-l-gray-500'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {rec.regionName}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {rec.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{rec.title}</h4>
                    <p className="text-gray-600 mb-4">{rec.message}</p>
                    
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">{(rec.confidence * 100).toFixed(0)}%</div>
                        <div className="text-xs text-gray-600">AI Confidence</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{rec.impactScore}</div>
                        <div className="text-xs text-gray-600">Impact Score</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{rec.effortScore}</div>
                        <div className="text-xs text-gray-600">Effort Score</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">{rec.roiProjection}x</div>
                        <div className="text-xs text-gray-600">ROI Projection</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Created: {new Date(rec.createdAt).toLocaleDateString()}</span>
                    <span>Expires: {new Date(rec.expiresAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      rec.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                      rec.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {rec.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {rec.status === 'pending' && (
                      <>
                        <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Accept
                        </button>
                        <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center">
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  const renderBenchmarks = () => (
    <div className="space-y-6">
      {/* Tier Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Benchmarking by Tier</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(tier => {
            const tierRegions = regions.filter(r => r.tier === tier);
            const avgHealthScore = tierRegions.reduce((sum, r) => sum + r.aiHealthScore, 0) / tierRegions.length || 0;
            const avgRevenue = tierRegions.reduce((sum, r) => sum + r.monthlyRevenue, 0) / tierRegions.length || 0;
            
            return (
              <div key={tier} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Tier {tier} - {tier === 1 ? 'Core Metro' : tier === 2 ? 'Growth Hub' : 'Pilot Market'}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Regions:</span>
                    <span className="font-medium">{tierRegions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Health:</span>
                    <span className="font-medium">{avgHealthScore.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Revenue:</span>
                    <span className="font-medium">₱{(avgRevenue/1000000).toFixed(1)}M</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cross-Regional Performance Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Region</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Tier</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">AI Health</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Daily Trips</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Revenue/Trip</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Profit Margin</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Market Share</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Tier Rank</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((region, index) => (
                <tr key={region.id} className="border-b border-gray-100">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="font-medium text-gray-900">{region.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">T{region.tier}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`font-medium ${getHealthColor(region.aiHealthScore).split(' ')[0]}`}>
                      {region.aiHealthScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-medium">{region.dailyTrips.toLocaleString()}</td>
                  <td className="py-4 px-4 text-center font-medium">₱{(region.monthlyRevenue / region.dailyTrips / 30).toFixed(0)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`font-medium ${region.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(region.profitMargin * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-medium">{(region.marketShare * 100).toFixed(1)}%</td>
                  <td className="py-4 px-4 text-center">
                    <span className="flex items-center justify-center">
                      {index === 0 ? <Award className="w-4 h-4 text-yellow-500" /> : `#${index + 1}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmark Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Leaders</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="font-medium text-green-800">Highest AI Health</span>
              <span className="text-green-600">Metro Manila (85.5%)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="font-medium text-blue-800">Highest Revenue</span>
              <span className="text-blue-600">Metro Manila (₱2.3M)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="font-medium text-purple-800">Best Market Share</span>
              <span className="text-purple-600">Metro Manila (42%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Improvement Opportunities</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="font-medium text-orange-800">Profitability Gap</span>
              <span className="text-orange-600">Davao Region (-8%)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="font-medium text-yellow-800">Market Penetration</span>
              <span className="text-yellow-600">Davao Region (12%)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="font-medium text-red-800">Health Score</span>
              <span className="text-red-600">Davao Region (65.8%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancials = () => (
    <div className="space-y-6">
      {/* P&L Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profit & Loss Centers</h3>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Current Month</option>
            <option>Last Month</option>
            <option>Quarter</option>
            <option>Year</option>
          </select>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">₱{(regions.reduce((sum, r) => sum + r.monthlyRevenue, 0) / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-green-700">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">₱{((regions.reduce((sum, r) => sum + r.monthlyRevenue, 0) * 0.75) / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-blue-700">Total Costs</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">₱{((regions.reduce((sum, r) => sum + r.monthlyRevenue, 0) * 0.25) / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-purple-700">Net Profit</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{regions.filter(r => r.profitMargin > 0).length}/{regions.length}</div>
            <div className="text-sm text-orange-700">Profitable</div>
          </div>
        </div>
      </div>

      {/* Regional P&L Breakdown */}
      <div className="space-y-4">
        {regions.map(region => (
          <div key={region.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{region.name}</h4>
                <p className="text-gray-600">Profit Center: {region.profitCenterId}</p>
              </div>
              <div className={`text-right ${region.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <div className="text-2xl font-bold">{(region.profitMargin * 100).toFixed(1)}%</div>
                <div className="text-sm">Profit Margin</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Revenue Streams</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gross Revenue:</span>
                    <span className="font-medium">₱{region.monthlyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Commission Revenue:</span>
                    <span className="font-medium">₱{(region.monthlyRevenue * 0.8).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Surge Revenue:</span>
                    <span className="font-medium">₱{(region.monthlyRevenue * 0.15).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subscription Revenue:</span>
                    <span className="font-medium">₱{(region.monthlyRevenue * 0.05).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-800 mb-3">Direct Costs</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Driver Incentives:</span>
                    <span className="font-medium text-red-600">₱{(region.monthlyRevenue * 0.4).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marketing Spend:</span>
                    <span className="font-medium text-red-600">₱{(region.monthlyRevenue * 0.12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Operations Cost:</span>
                    <span className="font-medium text-red-600">₱{(region.monthlyRevenue * 0.08).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Regulatory Fees:</span>
                    <span className="font-medium text-red-600">₱{(region.monthlyRevenue * 0.05).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">₱{(region.monthlyRevenue / region.dailyTrips / 30).toFixed(0)}</div>
                  <div className="text-xs text-gray-600">Revenue per Trip</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">₱{(region.monthlyRevenue * 0.65 / region.dailyTrips / 30).toFixed(0)}</div>
                  <div className="text-xs text-gray-600">Cost per Trip</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{region.dailyTrips}</div>
                  <div className="text-xs text-gray-600">Daily Volume</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${region.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₱{(region.monthlyRevenue * region.profitMargin).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Monthly Profit</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Compliance Status</h3>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">12</div>
            <div className="text-sm text-green-700">Valid Documents</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-yellow-700">Expiring Soon</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-red-700">Expired</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">2</div>
            <div className="text-sm text-blue-700">Pending Renewal</div>
          </div>
        </div>
      </div>

      {/* Regional Compliance Details */}
      <div className="space-y-4">
        {regions.map(region => (
          <div key={region.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{region.name}</h4>
                <p className="text-gray-600">Regulatory compliance status</p>
              </div>
              <div className={`flex items-center px-3 py-2 rounded-lg ${region.complianceAlerts === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <Shield className="w-4 h-4 mr-2" />
                {region.complianceAlerts === 0 ? 'Compliant' : `${region.complianceAlerts} Alerts`}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Required Documents</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">LTFRB Franchise</div>
                      <div className="text-sm text-green-600">Valid until Dec 2024</div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">Business Permit</div>
                      <div className="text-sm text-green-600">Valid until Jan 2025</div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <div className="font-medium text-yellow-800">Insurance Policy</div>
                      <div className="text-sm text-yellow-600">Expires in 15 days</div>
                    </div>
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-800 mb-3">Service Compliance</h5>
                <div className="space-y-3">
                  {[...region.primaryServices, ...region.secondaryServices]
                    .filter(service => service.isEnabled)
                    .map(service => (
                      <div key={service.serviceCode} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <div className="font-medium text-blue-800">{service.serviceName}</div>
                          <div className="text-sm text-blue-600">All permits valid</div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {region.complianceAlerts > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Compliance Alerts</span>
                </div>
                <div className="text-sm text-red-700">
                  {region.complianceAlerts === 1 ? '1 document' : `${region.complianceAlerts} documents`} require attention.
                  Failure to renew may result in service suspension.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderGovernance = () => (
    <div className="space-y-6">
      {/* Governance Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Governance & Audit Dashboard</h3>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">47</div>
            <div className="text-sm text-blue-700">Audit Entries Today</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">12</div>
            <div className="text-sm text-purple-700">Pending Approvals</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">28</div>
            <div className="text-sm text-green-700">AI Recommendations</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">5</div>
            <div className="text-sm text-orange-700">Human Overrides</div>
          </div>
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Recent Audit Trail</h4>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'AI Recommendation Accepted', user: 'Maria Santos', region: 'Metro Manila', time: '2 minutes ago', type: 'ai_action' },
              { action: 'Service Enabled', user: 'Juan Alvarez', region: 'Cebu Metro', time: '15 minutes ago', type: 'service_change' },
              { action: 'Tier Upgrade Proposed', user: 'AI Engine', region: 'Davao Region', time: '1 hour ago', type: 'ai_recommendation' },
              { action: 'Compliance Document Uploaded', user: 'Anna Reyes', region: 'Davao Region', time: '2 hours ago', type: 'compliance' },
              { action: 'Budget Allocation Updated', user: 'System Admin', region: 'All Regions', time: '3 hours ago', type: 'financial' }
            ].map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    entry.type === 'ai_action' ? 'bg-purple-500' :
                    entry.type === 'service_change' ? 'bg-blue-500' :
                    entry.type === 'ai_recommendation' ? 'bg-green-500' :
                    entry.type === 'compliance' ? 'bg-orange-500' : 'bg-gray-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{entry.action}</div>
                    <div className="text-sm text-gray-600">{entry.region} • by {entry.user}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{entry.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approval Workflows */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div>
              <div className="font-medium text-yellow-800">Tier Upgrade Request</div>
              <div className="text-sm text-yellow-600">Davao Region → Tier 2 • Requested by Anna Reyes</div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                Approve
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                Reject
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div>
              <div className="font-medium text-blue-800">Service Launch Request</div>
              <div className="text-sm text-blue-600">Tourism Mobility in Cebu Metro • AI Confidence: 94%</div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                Approve
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                Reject
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-purple-200 rounded-lg bg-purple-50">
            <div>
              <div className="font-medium text-purple-800">Budget Reallocation</div>
              <div className="text-sm text-purple-600">₱2M from Metro Manila to Davao Region expansion</div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                Approve
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGlobalOverview = () => {
    const totalRegions = regions.length;
    const activeRegions = regions.filter(r => r.lifecycleStage === 'active').length;
    const profitableRegions = regions.filter(r => r.profitMargin > 0).length;
    const totalRevenue = regions.reduce((sum, r) => sum + r.monthlyRevenue, 0);
    const avgHealthScore = regions.reduce((sum, r) => sum + r.aiHealthScore, 0) / regions.length;
    const totalRecommendations = regions.reduce((sum, r) => sum + r.activeRecommendations.length, 0);
    const criticalRecommendations = regions.reduce((sum, r) => sum + r.activeRecommendations.filter(rec => rec.priority === 'critical').length, 0);

    return (
      <div className="space-y-6">
        {/* Executive KPI Dashboard */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Global Regional Performance</h3>
            <p className="text-gray-600">AI-Powered Intelligence Dashboard</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <Brain className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">AI Engine Active</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard 
            label="Total Regions" 
            value={totalRegions.toString()}
            trend={`${activeRegions} active`}
            icon={Building}
          />
          <KpiCard 
            label="Monthly Revenue" 
            value={`₱${(totalRevenue / 1000000).toFixed(1)}M`}
            trend="+12%"
            up={true}
            icon={DollarSign}
          />
          <KpiCard 
            label="Avg Health Score" 
            value={avgHealthScore.toFixed(1)}
            trend={`${profitableRegions}/${totalRegions} profitable`}
            icon={Activity}
          />
          <KpiCard 
            label="AI Recommendations" 
            value={totalRecommendations.toString()}
            trend={`${criticalRecommendations} critical`}
            icon={Brain}
          />
          <KpiCard 
            label="Compliance Status" 
            value="98.2%"
            trend="+2.1%"
            up={true}
            icon={Shield}
          />
        </div>

        {/* AI Insights Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Bot className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-lg font-semibold text-gray-900">AI Strategic Intelligence</h4>
                <p className="text-sm text-gray-600">ML-powered insights and recommendations</p>
              </div>
            </div>
            <button 
              onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
            >
              {aiInsightsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-700">High Growth Opportunity</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">Davao Agricultural Logistics</div>
              <div className="text-xs text-green-600">97% growth potential • 95% competitive advantage</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center mb-2">
                <Rocket className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-700">Ready for Scale</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">Metro Manila Logistics</div>
              <div className="text-xs text-blue-600">82% growth potential • Early mover advantage</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                <span className="font-medium text-orange-700">Needs Attention</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">Davao Profitability Gap</div>
              <div className="text-xs text-orange-600">-8% margin • Cost optimization required</div>
            </div>
          </div>

          {aiInsightsExpanded && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">Detailed AI Analysis</h5>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Market Expansion Readiness</span>
                  <span className="font-medium text-green-600">85% confidence</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cross-region Synergy Score</span>
                  <span className="font-medium text-blue-600">72/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Risk-adjusted ROI Forecast</span>
                  <span className="font-medium text-purple-600">2.8x over 24 months</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Analysis based on 47 regional factors, 12 market indicators, and historical performance across {regions.length} regions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Regional Portfolio Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Regional Portfolio Overview</h3>
              <div className="flex items-center space-x-3">
                <select 
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="1">Tier 1 - Core Metro</option>
                  <option value="2">Tier 2 - Growth Hub</option>
                  <option value="3">Tier 3 - Pilot</option>
                </select>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Stages</option>
                  <option value="active">Active</option>
                  <option value="pilot">Pilot</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-6">
              {regions
                .filter(region => 
                  (tierFilter === 'all' || region.tier.toString() === tierFilter) &&
                  (stageFilter === 'all' || region.lifecycleStage === stageFilter)
                )
                .map(region => (
                <div key={region.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 rounded-lg mr-4" style={{ backgroundColor: `${XpressColors.digitalBlue}20` }}>
                        <MapPin className="w-6 h-6" style={{ color: XpressColors.digitalBlue }} />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900">{region.name}</h4>
                        <p className="text-gray-600">{region.regionCode} • {region.expansionManager}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          {getTierBadge(region.tier)}
                          {getLifecycleBadge(region.lifecycleStage)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(region.aiHealthScore)}`}>
                        <Gauge className="w-4 h-4 mr-1" />
                        AI Health: {region.aiHealthScore.toFixed(1)}
                      </div>
                      {region.activeRecommendations.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-purple-600 font-medium">
                            {region.activeRecommendations.length} AI recommendations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {region.dailyTrips.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Daily Trips</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        ₱{(region.monthlyRevenue / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-gray-600">Monthly Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className={`text-lg font-bold ${region.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(region.profitMargin * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Profit Margin</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {(region.marketShare * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Market Share</div>
                    </div>
                  </div>

                  {/* AI Health Components */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">AI Health Components</span>
                      <span className="text-xs text-gray-500">Powered by ML models</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {Object.entries(region.aiHealthComponents).map(([key, score]) => (
                        <div key={key} className="text-center">
                          <div className={`text-xs font-medium ${getHealthColor(score).split(' ')[0]}`}>
                            {score}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {key}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services Overview */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Services Portfolio</span>
                      <span className="text-xs text-blue-600">
                        {region.primaryServices.filter(s => s.isEnabled).length + region.secondaryServices.filter(s => s.isEnabled).length} active
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...region.primaryServices, ...region.secondaryServices]
                        .filter(service => service.isEnabled)
                        .map(service => (
                          <span key={service.serviceCode} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {service.localAlias || service.serviceName}
                          </span>
                        ))
                      }
                      {[...region.primaryServices, ...region.secondaryServices]
                        .filter(service => !service.isEnabled && service.aiGrowthPotential > 0.7)
                        .map(service => (
                          <span key={service.serviceCode} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs border border-dashed border-green-300">
                            ⚡ {service.serviceName} ({(service.aiGrowthPotential * 100).toFixed(0)}% potential)
                          </span>
                        ))
                      }
                    </div>
                  </div>

                  {/* Critical Recommendations */}
                  {region.activeRecommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
                        <span className="text-sm font-medium text-amber-800">High Priority AI Recommendations</span>
                      </div>
                      <div className="space-y-2">
                        {region.activeRecommendations
                          .filter(r => r.priority === 'critical' || r.priority === 'high')
                          .slice(0, 2)
                          .map(rec => (
                            <div key={rec.id} className="text-sm">
                              <div className="font-medium text-amber-800">{rec.title}</div>
                              <div className="text-amber-700 text-xs">
                                {rec.confidence > 0.8 ? '🔥' : '⚡'} {(rec.confidence * 100).toFixed(0)}% confidence • ROI: {rec.roiProjection}x
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div className="flex space-x-4 text-sm text-gray-600">
                      <span>Budget: ₱{(region.expansionBudget / 1000000).toFixed(1)}M</span>
                      <span>Staff: {region.staffCount}</span>
                      <span>Zones: {region.zonesCount}</span>
                      {region.complianceAlerts > 0 && (
                        <span className="text-red-600">⚠️ {region.complianceAlerts} alerts</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
                        View Details
                      </button>
                      <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition-colors">
                        AI Insights
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Regional Management</h1>
              <p className="text-gray-600">AI-Powered Regional Portfolio & Expansion Strategy</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">ML Engine v4.0</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search regions, services..."
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
        {/* Navigation Tabs - Dashboard Style */}
        <div className="flex items-center gap-1 overflow-x-auto mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">

          <div className="p-6">
            {activeTab === 'overview' && renderGlobalOverview()}
            {activeTab === 'regions' && renderRegionalPortfolio()}
            {activeTab === 'ai_insights' && renderAIIntelligence()}
            {activeTab === 'recommendations' && renderRecommendations()}
            {activeTab === 'benchmarks' && renderBenchmarks()}
            {activeTab === 'financials' && renderFinancials()}
            {activeTab === 'compliance' && renderCompliance()}
            {activeTab === 'governance' && renderGovernance()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedRegionalManagement;