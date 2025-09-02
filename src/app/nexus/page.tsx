'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, Activity, Lightbulb, TrendingUp, Shield, Eye, Settings,
  AlertTriangle, CheckCircle, Clock, RefreshCw, Filter, Search,
  BarChart3, Target, Zap, Users, DollarSign, MapPin, ArrowUpRight,
  ArrowDownRight, ThumbsUp, ThumbsDown, Play, Pause, BookOpen,
  Globe, PieChart, Calendar, ExternalLink, Info, HelpCircle,
  ChevronDown, ChevronUp, Database, LineChart, FileText, Gauge
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AIRecommendationDTO, 
  AIHealthScoreDTO,
  NexusTabId,
  NexusDomain,
  RecStatus,
  RiskLevel,
  type NexusFilters
} from '@/types/nexusIntelligence.schemas';

// Mock data - in production this would come from APIs
const mockHealthScores: AIHealthScoreDTO[] = [
  { id: 1, domain: 'pricing', regionId: 1, profileId: null, score: 87.4, components: { accuracy: 0.89, drift: 0.12, latency: 0.95 }, computedAt: new Date().toISOString() },
  { id: 2, domain: 'surge', regionId: 1, profileId: null, score: 92.1, components: { prediction: 0.94, response: 0.88, coverage: 0.96 }, computedAt: new Date().toISOString() },
  { id: 3, domain: 'regional', regionId: 2, profileId: null, score: 78.9, components: { growth: 0.82, risk: 0.75, compliance: 0.89 }, computedAt: new Date().toISOString() },
  { id: 4, domain: 'risk', regionId: null, profileId: null, score: 94.7, components: { fraud: 0.96, safety: 0.93, compliance: 0.95 }, computedAt: new Date().toISOString() }
];

const mockRecommendations: AIRecommendationDTO[] = [
  {
    id: 1, domain: 'pricing', regionId: 1, profileId: 1, serviceKey: 'tnvs',
    title: 'Increase base rate by ₱2/km in Metro Manila TNVS',
    message: 'Model predicts 8% revenue increase with minimal demand impact during weekday mornings.',
    details: { currentRate: 12, proposedRate: 14, timeWindow: 'weekday_morning', confidence: 0.87 },
    confidence: 0.87, riskLevel: 'medium', complianceFlag: false,
    status: 'generated', createdByModel: 'pricing-optimizer-v2.1',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    proposedBy: null, proposedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null
  },
  {
    id: 2, domain: 'surge', regionId: 2, profileId: null, serviceKey: 'tnvs',
    title: 'Adjust surge threshold for Cebu evening peak',
    message: 'Reduce surge activation threshold from 1.8x to 1.5x to improve driver supply during 6-8 PM.',
    details: { currentThreshold: 1.8, proposedThreshold: 1.5, peakWindow: '18:00-20:00' },
    confidence: 0.93, riskLevel: 'low', complianceFlag: false,
    status: 'proposed', createdByModel: 'surge-optimizer-v1.7',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    proposedBy: 'user-uuid-1', proposedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    approvedBy: null, approvedAt: null, rejectionReason: null
  },
  {
    id: 3, domain: 'regional', regionId: 3, profileId: null, serviceKey: null,
    title: 'Expand to Davao Tier 2 services',
    message: 'High growth potential detected. Recommend activating Parcel and Food delivery in Davao region.',
    details: { services: ['parcel', 'food'], marketReadiness: 0.89, competitiveAdvantage: 0.76 },
    confidence: 0.91, riskLevel: 'high', complianceFlag: true,
    status: 'generated', createdByModel: 'regional-ai-v4.0',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    proposedBy: null, proposedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null
  }
];

const NexusIntelligence = () => {
  const [activeTab, setActiveTab] = useState<NexusTabId>('overview');
  const [filters, setFilters] = useState<NexusFilters>({});
  const [recommendations, setRecommendations] = useState(mockRecommendations);
  const [healthScores, setHealthScores] = useState(mockHealthScores);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab configuration
  const tabs = [
    { id: 'overview' as NexusTabId, label: 'Overview', icon: Activity },
    { id: 'recommendations' as NexusTabId, label: 'Recommendations', icon: Lightbulb },
    { id: 'forecasts' as NexusTabId, label: 'Forecasts', icon: TrendingUp },
    { id: 'scenario_builder' as NexusTabId, label: 'Scenario Builder', icon: Target },
    { id: 'cross_domain' as NexusTabId, label: 'Cross-Domain', icon: Globe },
    { id: 'risk_compliance' as NexusTabId, label: 'Risk & Compliance', icon: Shield },
    { id: 'ops_ai' as NexusTabId, label: 'Ops (AI)', icon: Database },
    { id: 'audit_governance' as NexusTabId, label: 'Audit & Governance', icon: FileText },
    { id: 'knowledge' as NexusTabId, label: 'Knowledge', icon: BookOpen }
  ];

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

  // Health score color coding
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-700 bg-green-100 border-green-200';
    if (score >= 80) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (score >= 70) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  // Risk level styling
  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      case 'medium': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'low': return 'text-green-700 bg-green-100 border-green-200';
    }
  };

  // Status styling
  const getStatusColor = (status: RecStatus) => {
    switch (status) {
      case 'generated': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'proposed': return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'approved': return 'text-green-700 bg-green-100 border-green-200';
      case 'rejected': return 'text-red-700 bg-red-100 border-red-200';
      case 'superseded': return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  // Domain icon mapping
  const getDomainIcon = (domain: NexusDomain) => {
    switch (domain) {
      case 'pricing': return DollarSign;
      case 'surge': return Zap;
      case 'regional': return MapPin;
      case 'risk': return Shield;
    }
  };

  // Mock refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  // Mock recommendation actions
  const handlePropose = (id: number) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === id ? { 
        ...rec, 
        status: 'proposed' as RecStatus,
        proposedBy: 'current-user-id',
        proposedAt: new Date().toISOString()
      } : rec
    ));
  };

  const handleApprove = (id: number) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === id ? { 
        ...rec, 
        status: 'approved' as RecStatus,
        approvedBy: 'current-user-id',
        approvedAt: new Date().toISOString()
      } : rec
    ));
  };

  const handleReject = (id: number, reason: string) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === id ? { 
        ...rec, 
        status: 'rejected' as RecStatus,
        approvedBy: 'current-user-id',
        approvedAt: new Date().toISOString(),
        rejectionReason: reason
      } : rec
    ));
  };

  // Recommendations tab content
  const renderRecommendations = () => {
    const filteredRecs = recommendations.filter(rec => {
      if (filters.domain && rec.domain !== filters.domain) return false;
      if (filters.status && rec.status !== filters.status) return false;
      if (filters.riskLevel && rec.riskLevel !== filters.riskLevel) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Filters and Summary */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Recommendations Feed</h3>
            <p className="text-gray-600">Cross-domain recommendations with dual approval workflow</p>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onChange={(e) => setFilters({...filters, domain: e.target.value as any})}
            >
              <option value="">All Domains</option>
              <option value="pricing">Pricing</option>
              <option value="surge">Surge</option>
              <option value="regional">Regional</option>
              <option value="risk">Risk</option>
            </select>
            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onChange={(e) => setFilters({...filters, status: e.target.value as any})}
            >
              <option value="">All Status</option>
              <option value="generated">Generated</option>
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Total Recommendations" 
            value={recommendations.length.toString()}
            trend="+12 today"
            icon={Lightbulb}
          />
          <KpiCard 
            label="Pending Approval" 
            value={recommendations.filter(r => r.status === 'proposed').length.toString()}
            trend="3 urgent"
            icon={Clock}
          />
          <KpiCard 
            label="Approved This Week" 
            value={recommendations.filter(r => r.status === 'approved').length.toString()}
            trend="+8%"
            up={true}
            icon={CheckCircle}
          />
          <KpiCard 
            label="High Confidence" 
            value={recommendations.filter(r => r.confidence > 0.8).length.toString()}
            trend="94% avg"
            icon={Target}
          />
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          {filteredRecs.map(rec => {
            const DomainIcon = getDomainIcon(rec.domain);
            return (
              <Card key={rec.id} className={`border-l-4 ${
                rec.riskLevel === 'high' ? 'border-l-red-500' :
                rec.riskLevel === 'medium' ? 'border-l-orange-500' : 'border-l-green-500'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <DomainIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(rec.riskLevel)}`}>
                          {rec.riskLevel.toUpperCase()} RISK
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(rec.status)}`}>
                          {rec.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {rec.domain.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{rec.title}</h4>
                      <p className="text-gray-600 mb-4">{rec.message}</p>
                      
                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{(rec.confidence * 100).toFixed(0)}%</div>
                          <div className="text-xs text-gray-600">AI Confidence</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">2.3x</div>
                          <div className="text-xs text-gray-600">ROI Projection</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">+8%</div>
                          <div className="text-xs text-gray-600">Revenue Impact</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className={`text-lg font-bold ${rec.complianceFlag ? 'text-orange-600' : 'text-green-600'}`}>
                            {rec.complianceFlag ? 'Review' : 'Safe'}
                          </div>
                          <div className="text-xs text-gray-600">Compliance</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Model: {rec.createdByModel} • {new Date(rec.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      {rec.status === 'generated' && (
                        <button 
                          onClick={() => handlePropose(rec.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Propose
                        </button>
                      )}
                      {rec.status === 'proposed' && (
                        <>
                          <button 
                            onClick={() => handleApprove(rec.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReject(rec.id, 'Rejected by senior management')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center"
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}
                      <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                        Simulate
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Forecasts tab content
  const renderForecasts = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Forecasts & Predictions</h3>
            <p className="text-gray-600">30/60/90-day forecasts with confidence bands</p>
          </div>
          <div className="flex items-center space-x-3">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Regions</option>
              <option>Metro Manila</option>
              <option>Cebu</option>
              <option>Davao</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>90 Days</option>
              <option>60 Days</option>
              <option>30 Days</option>
            </select>
          </div>
        </div>

        {/* Forecast KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Revenue Forecast" 
            value="₱18.2M"
            trend="+12% vs last 90d"
            up={true}
            icon={DollarSign}
          />
          <KpiCard 
            label="Trips Forecast" 
            value="245K"
            trend="+8% vs last 90d"
            up={true}
            icon={Activity}
          />
          <KpiCard 
            label="Model Accuracy" 
            value="94.7%"
            trend="MAPE: 5.3%"
            icon={Target}
          />
          <KpiCard 
            label="Confidence Band" 
            value="±8.2%"
            trend="High confidence"
            icon={BarChart3}
          />
        </div>

        {/* Forecast Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast (90 Days)</h4>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <LineChart className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">Interactive Chart</div>
                  <div className="text-xs">Revenue trend with confidence bands</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>Confidence: 92%</span>
                <button className="text-blue-600 hover:text-blue-800">Show Explainability</button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Trips Forecast (90 Days)</h4>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">Interactive Chart</div>
                  <div className="text-xs">Daily trips with seasonal adjustments</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>Confidence: 89%</span>
                <button className="text-blue-600 hover:text-blue-800">Feature Importance</button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Importance */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Model Explainability - Key Factors</h4>
            <div className="space-y-4">
              {[
                { factor: 'Historical Demand', importance: 0.32, trend: 'up' },
                { factor: 'Weather Patterns', importance: 0.24, trend: 'neutral' },
                { factor: 'Economic Indicators', importance: 0.18, trend: 'up' },
                { factor: 'Seasonal Events', importance: 0.15, trend: 'down' },
                { factor: 'Competition Activity', importance: 0.11, trend: 'neutral' }
              ].map(item => (
                <div key={item.factor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{item.factor}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.importance * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{(item.importance * 100).toFixed(0)}%</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.trend === 'up' ? 'bg-green-100 text-green-700' :
                      item.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.trend === 'up' ? '↗' : item.trend === 'down' ? '↘' : '→'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Overview tab content
  const renderOverview = () => {
    const totalRecs = recommendations.length;
    const pendingApprovals = recommendations.filter(r => r.status === 'proposed').length;
    const avgHealth = healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length;
    
    return (
      <div className="space-y-6">
        {/* Global KPIs */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Nexus Intelligence Overview</h3>
            <p className="text-gray-600">AI/ML hub with cross-domain insights and dual approvals</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <Brain className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">All Systems Online</span>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard 
            label="AI Health" 
            value={avgHealth.toFixed(1)}
            trend="+2.3%"
            up={true}
            icon={Activity}
          />
          <KpiCard 
            label="Active Recommendations" 
            value={totalRecs.toString()}
            trend={`${pendingApprovals} pending`}
            icon={Lightbulb}
          />
          <KpiCard 
            label="Model Accuracy" 
            value="94.2%"
            trend="+1.2%"
            up={true}
            icon={Target}
          />
          <KpiCard 
            label="Compliance Rate" 
            value="98.7%"
            trend="+0.5%"
            up={true}
            icon={Shield}
          />
          <KpiCard 
            label="ROI Impact" 
            value="₱2.8M"
            trend="+12%"
            up={true}
            icon={DollarSign}
          />
        </div>

        {/* Health Scores by Domain */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-gray-900">AI Health Scores by Domain</h2>
              <div className="text-xs text-gray-500">Live data • Updated now</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-3 font-medium">Domain</th>
                    <th className="text-center py-3 font-medium">Region</th>
                    <th className="text-center py-3 font-medium">Health Score</th>
                    <th className="text-center py-3 font-medium">Components</th>
                    <th className="text-center py-3 font-medium">Last Updated</th>
                    <th className="text-center py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {healthScores.map(health => {
                    const DomainIcon = getDomainIcon(health.domain);
                    return (
                      <tr key={health.id} className="border-b border-gray-50 hover:bg-gray-25">
                        <td className="py-4">
                          <div className="flex items-center">
                            <div className="p-2 rounded-lg mr-3 bg-blue-50">
                              <DomainIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 capitalize">{health.domain}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-4">
                          <span className="text-sm text-gray-600">
                            {health.regionId ? `Region ${health.regionId}` : 'Global'}
                          </span>
                        </td>
                        <td className="text-center py-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getHealthColor(health.score)}`}>
                            <Gauge className="w-3 h-3 mr-1" />
                            {health.score.toFixed(1)}%
                          </div>
                        </td>
                        <td className="text-center py-4">
                          <div className="flex justify-center space-x-2">
                            {health.components && Object.entries(health.components).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="inline-flex px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                {key}: {(typeof value === 'number' ? (value * 100).toFixed(0) : value)}%
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center py-4">
                          <span className="text-xs text-gray-500">
                            {new Date(health.computedAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="text-center py-4">
                          <div className="flex justify-center space-x-1">
                            <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors">
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Scenario Builder tab content
  const renderScenarioBuilder = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Executive Scenario Builder</h3>
            <p className="text-gray-600">Drag-and-drop scenario modeling with compliance checks</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center">
            <Play className="w-4 h-4 mr-2" />
            Run New Scenario
          </button>
        </div>

        {/* Scenario Builder Interface */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Scenario Configuration</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Metro Manila</option>
                    <option>Cebu</option>
                    <option>Davao</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Profile</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>TNVS Standard</option>
                    <option>Taxi Premium</option>
                    <option>Special Events</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Window</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Changes</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Base Rate:</span>
                      <input type="number" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="₱12" />
                      <span className="text-sm text-gray-600">+₱2</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Per KM:</span>
                      <input type="number" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="₱8" />
                      <span className="text-sm text-gray-600">+₱1</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surge Configuration</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Conservative (1.2x-1.8x)</option>
                    <option>Standard (1.5x-2.5x)</option>
                    <option>Aggressive (2.0x-3.0x)</option>
                  </select>
                </div>

                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center justify-center">
                  <Target className="w-4 h-4 mr-2" />
                  Simulate Scenario
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Scenario Results</h4>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">+12.3%</div>
                  <div className="text-sm text-gray-600">Revenue Impact</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">+2.1K</div>
                  <div className="text-sm text-gray-600">Daily Trips</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">2.8x</div>
                  <div className="text-sm text-gray-600">ROI Projection</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">-3.2%</div>
                  <div className="text-sm text-gray-600">Driver Supply</div>
                </div>
              </div>

              {/* Visualization */}
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">Scenario Impact Visualization</div>
                  <div className="text-xs">Interactive charts showing projected changes</div>
                </div>
              </div>

              {/* Compliance Check */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Compliance Status: PASSED</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ LTFRB fare caps respected</li>
                  <li>✓ LGU regulations compliant</li>
                  <li>✓ No regulatory re-filing required</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Scenarios */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Scenario Runs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-3 font-medium">Scenario</th>
                    <th className="text-center py-3 font-medium">Region</th>
                    <th className="text-center py-3 font-medium">Revenue Impact</th>
                    <th className="text-center py-3 font-medium">ROI</th>
                    <th className="text-center py-3 font-medium">Compliance</th>
                    <th className="text-center py-3 font-medium">Created</th>
                    <th className="text-center py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Metro Manila Rate Increase', region: 'MM', impact: '+12.3%', roi: '2.8x', compliance: 'pass', date: '2 hours ago' },
                    { name: 'Cebu Surge Optimization', region: 'CB', impact: '+8.7%', roi: '2.1x', compliance: 'pass', date: '1 day ago' },
                    { name: 'Davao Premium Launch', region: 'DV', impact: '+15.2%', roi: '3.2x', compliance: 'review', date: '2 days ago' }
                  ].map((scenario, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-25">
                      <td className="py-4">
                        <div className="font-medium text-gray-900">{scenario.name}</div>
                      </td>
                      <td className="text-center py-4">{scenario.region}</td>
                      <td className="text-center py-4 font-medium text-green-600">{scenario.impact}</td>
                      <td className="text-center py-4 font-medium text-blue-600">{scenario.roi}</td>
                      <td className="text-center py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          scenario.compliance === 'pass' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {scenario.compliance}
                        </span>
                      </td>
                      <td className="text-center py-4 text-sm text-gray-500">{scenario.date}</td>
                      <td className="text-center py-4">
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Cross-Domain Insights tab content
  const renderCrossDomain = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cross-Domain Intelligence</h3>
            <p className="text-gray-600">Playbook-style bundles combining multiple recommendation domains</p>
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            Generate Bundle
          </button>
        </div>

        {/* Bundle KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Active Bundles" 
            value="8"
            trend="3 this week"
            icon={Globe}
          />
          <KpiCard 
            label="Avg ROI Impact" 
            value="3.2x"
            trend="+0.4x vs single"
            up={true}
            icon={Target}
          />
          <KpiCard 
            label="Success Rate" 
            value="87%"
            trend="Bundle adoption"
            icon={CheckCircle}
          />
          <KpiCard 
            label="Combined Confidence" 
            value="91%"
            trend="High synergy"
            icon={Brain}
          />
        </div>

        {/* Active Bundles */}
        <div className="space-y-4">
          {[
            {
              id: 1,
              title: 'Metro Manila Revenue Optimization Bundle',
              summary: 'Combines pricing adjustment (+₱2/km), surge optimization (1.5x threshold), and driver incentives',
              domains: ['pricing', 'surge', 'regional'],
              confidence: 0.91,
              riskLevel: 'medium' as RiskLevel,
              estimatedImpact: { revenue: '+18%', trips: '+1.2K', roi: '3.4x' },
              recommendations: 3
            },
            {
              id: 2,
              title: 'Cebu Market Expansion Bundle',
              summary: 'Regional service expansion with competitive pricing and compliance framework',
              domains: ['regional', 'pricing', 'risk'],
              confidence: 0.87,
              riskLevel: 'high' as RiskLevel,
              estimatedImpact: { revenue: '+25%', trips: '+2.8K', roi: '4.1x' },
              recommendations: 4
            },
            {
              id: 3,
              title: 'Cross-Platform Risk Mitigation Bundle',
              summary: 'Unified fraud detection, safety protocols, and compliance monitoring',
              domains: ['risk', 'regional'],
              confidence: 0.94,
              riskLevel: 'low' as RiskLevel,
              estimatedImpact: { fraudReduction: '-23%', safetyScore: '+12%', compliance: '98%' },
              recommendations: 2
            }
          ].map(bundle => (
            <Card key={bundle.id} className={`border-l-4 ${
              bundle.riskLevel === 'high' ? 'border-l-red-500' :
              bundle.riskLevel === 'medium' ? 'border-l-orange-500' : 'border-l-green-500'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {bundle.domains.map(domain => {
                        const Icon = getDomainIcon(domain as NexusDomain);
                        return (
                          <div key={domain} className="p-1 rounded bg-blue-50">
                            <Icon className="w-3 h-3 text-blue-600" />
                          </div>
                        );
                      })}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(bundle.riskLevel)}`}>
                        {bundle.riskLevel.toUpperCase()} RISK
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {bundle.recommendations} Recommendations
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{bundle.title}</h4>
                    <p className="text-gray-600 mb-4">{bundle.summary}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      {Object.entries(bundle.estimatedImpact).map(([key, value]) => (
                        <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{value}</div>
                          <div className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Brain className="w-4 h-4 mr-1" />
                          {(bundle.confidence * 100).toFixed(0)}% confidence
                        </span>
                        <span>{bundle.domains.length} domains</span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                          View Details
                        </button>
                        <button className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                          Execute Bundle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bundle Creation Interface */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Create Custom Bundle</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Recommendations</label>
                <div className="border border-gray-200 rounded-lg p-4 h-48 overflow-y-auto">
                  {recommendations.filter(r => r.status === 'generated').map(rec => (
                    <div key={rec.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <div className="text-sm">
                          <div className="font-medium">{rec.title}</div>
                          <div className="text-xs text-gray-500">{rec.domain}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Preview</label>
                <div className="border border-gray-200 rounded-lg p-4 h-48">
                  <div className="text-center text-gray-400 flex items-center justify-center h-full">
                    <div>
                      <Globe className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-sm">Select recommendations to create bundle</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Create Bundle
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Risk & Compliance tab content
  const renderRiskCompliance = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Risk & Compliance Dashboard</h3>
            <p className="text-gray-600">Fraud detection, safety monitoring, and regulatory compliance</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">All Systems Secure</span>
            </div>
          </div>
        </div>

        {/* Risk KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <KpiCard 
            label="Fraud Detection" 
            value="99.2%"
            trend="94 blocked today"
            icon={Shield}
          />
          <KpiCard 
            label="Safety Score" 
            value="96.8%"
            trend="+0.3% this week"
            up={true}
            icon={CheckCircle}
          />
          <KpiCard 
            label="Compliance Rate" 
            value="98.7%"
            trend="3 pending reviews"
            icon={FileText}
          />
          <KpiCard 
            label="Risk Alerts" 
            value="12"
            trend="2 high priority"
            icon={AlertTriangle}
          />
          <KpiCard 
            label="Model Drift" 
            value="2.1%"
            trend="Within threshold"
            icon={Activity}
          />
        </div>

        {/* Risk Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Fraud Detection</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Detection Rate</span>
                  <span className="font-medium text-green-600">99.2%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">False Positives</span>
                  <span className="font-medium text-blue-600">0.8%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Blocked Today</span>
                  <span className="font-medium text-red-600">94 attempts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Response</span>
                  <span className="font-medium text-purple-600">127ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Safety Monitoring</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Incidents</span>
                  <span className="font-medium text-red-600">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SOS Responses</span>
                  <span className="font-medium text-green-600">{"< 30s avg"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Driver Score Avg</span>
                  <span className="font-medium text-blue-600">4.87/5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Violations</span>
                  <span className="font-medium text-orange-600">8 this week</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Compliance</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">LTFRB Documents</span>
                  <span className="font-medium text-green-600">Valid</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">LGU Permits</span>
                  <span className="font-medium text-green-600">Current</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expiring Soon</span>
                  <span className="font-medium text-orange-600">3 documents</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Audit Status</span>
                  <span className="font-medium text-blue-600">Compliant</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Risk Alerts */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Active Risk Alerts</h4>
            <div className="space-y-3">
              {[
                { type: 'Fraud Pattern', severity: 'high', message: 'Unusual payment pattern detected in Metro Manila region', time: '5 minutes ago', domain: 'risk' },
                { type: 'Compliance Warning', severity: 'medium', message: 'LTFRB franchise renewal due in 30 days - Cebu region', time: '2 hours ago', domain: 'regional' },
                { type: 'Safety Alert', severity: 'high', message: 'Multiple SOS activations in Makati area', time: '1 hour ago', domain: 'risk' },
                { type: 'Model Drift', severity: 'low', message: 'Pricing model accuracy decreased by 2.3%', time: '6 hours ago', domain: 'pricing' }
              ].map((alert, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-l-red-500' :
                  alert.severity === 'medium' ? 'bg-orange-50 border-l-orange-500' : 'bg-yellow-50 border-l-yellow-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.severity === 'high' ? 'text-red-600' :
                      alert.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-900">{alert.type}</div>
                      <div className="text-sm text-gray-600">{alert.message}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{alert.time}</div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Ops (AI) tab content
  const renderOpsAI = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Operations & Model Monitoring</h3>
            <p className="text-gray-600">Model performance, drift detection, and infrastructure health</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retrain Models
            </button>
          </div>
        </div>

        {/* Ops KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <KpiCard 
            label="Models Online" 
            value="12/12"
            trend="All healthy"
            icon={Database}
          />
          <KpiCard 
            label="Avg Accuracy" 
            value="94.2%"
            trend="+0.8% this week"
            up={true}
            icon={Target}
          />
          <KpiCard 
            label="Inference Latency" 
            value="127ms"
            trend="Within SLA"
            icon={Zap}
          />
          <KpiCard 
            label="Data Freshness" 
            value="< 5min"
            trend="All sources live"
            icon={Activity}
          />
          <KpiCard 
            label="Drift Alerts" 
            value="2"
            trend="Low priority"
            icon={AlertTriangle}
          />
        </div>

        {/* Model Performance Table */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Model Performance Dashboard</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-3 font-medium">Model</th>
                    <th className="text-center py-3 font-medium">Version</th>
                    <th className="text-center py-3 font-medium">Domain</th>
                    <th className="text-center py-3 font-medium">Accuracy</th>
                    <th className="text-center py-3 font-medium">MAPE</th>
                    <th className="text-center py-3 font-medium">Drift</th>
                    <th className="text-center py-3 font-medium">Last Updated</th>
                    <th className="text-center py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'pricing-optimizer', version: 'v2.1', domain: 'pricing', accuracy: 94.2, mape: 5.8, drift: 0.02, updated: '2 hours ago', status: 'healthy' },
                    { name: 'surge-predictor', version: 'v1.7', domain: 'surge', accuracy: 91.8, mape: 8.1, drift: 0.05, updated: '4 hours ago', status: 'healthy' },
                    { name: 'regional-ai', version: 'v4.0', domain: 'regional', accuracy: 87.9, mape: 12.1, drift: 0.03, updated: '6 hours ago', status: 'healthy' },
                    { name: 'fraud-detector', version: 'v3.2', domain: 'risk', accuracy: 99.2, mape: 0.8, drift: 0.08, updated: '1 hour ago', status: 'warning' },
                    { name: 'demand-forecaster', version: 'v2.8', domain: 'pricing', accuracy: 92.1, mape: 7.9, drift: 0.01, updated: '3 hours ago', status: 'healthy' }
                  ].map((model, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-25">
                      <td className="py-4">
                        <div className="font-medium text-gray-900">{model.name}</div>
                      </td>
                      <td className="text-center py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{model.version}</span>
                      </td>
                      <td className="text-center py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">{model.domain}</span>
                      </td>
                      <td className="text-center py-4 font-medium text-green-600">{model.accuracy}%</td>
                      <td className="text-center py-4 font-medium">{model.mape}%</td>
                      <td className="text-center py-4">
                        <span className={`font-medium ${model.drift > 0.05 ? 'text-orange-600' : 'text-green-600'}`}>
                          {(model.drift * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-4 text-sm text-gray-500">{model.updated}</td>
                      <td className="text-center py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          model.status === 'healthy' ? 'bg-green-100 text-green-700' : 
                          model.status === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {model.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Health</h4>
              <div className="space-y-4">
                {[
                  { service: 'Model Serving API', status: 'healthy', uptime: '99.98%', responseTime: '127ms' },
                  { service: 'Data Pipeline', status: 'healthy', uptime: '99.95%', responseTime: '2.3s' },
                  { service: 'Feature Store', status: 'healthy', uptime: '99.99%', responseTime: '45ms' },
                  { service: 'Model Registry', status: 'warning', uptime: '98.12%', responseTime: '890ms' }
                ].map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{service.service}</div>
                      <div className="text-sm text-gray-600">Uptime: {service.uptime}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        service.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {service.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{service.responseTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">External Data Sources</h4>
              <div className="space-y-4">
                {[
                  { source: 'PAGASA Weather API', status: 'online', lastUpdate: '2 min ago', dataPoints: '24/24' },
                  { source: 'MMDA Traffic Feed', status: 'online', lastUpdate: '1 min ago', dataPoints: '156/156' },
                  { source: 'NAIA Flight Data', status: 'online', lastUpdate: '5 min ago', dataPoints: '89/89' },
                  { source: 'Economic Indicators', status: 'delayed', lastUpdate: '2 hours ago', dataPoints: '12/15' }
                ].map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{source.source}</div>
                      <div className="text-sm text-gray-600">Last: {source.lastUpdate}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        source.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {source.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{source.dataPoints}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Audit & Governance tab content
  const renderAuditGovernance = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Audit & Governance Dashboard</h3>
            <p className="text-gray-600">Complete audit trail with dual approval tracking</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Export Audit Log
          </button>
        </div>

        {/* Audit KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <KpiCard 
            label="Audit Entries" 
            value="2,847"
            trend="47 today"
            icon={FileText}
          />
          <KpiCard 
            label="Pending Approvals" 
            value="12"
            trend="3 urgent"
            icon={Clock}
          />
          <KpiCard 
            label="Approved Actions" 
            value="156"
            trend="This week"
            icon={CheckCircle}
          />
          <KpiCard 
            label="Override Rate" 
            value="2.3%"
            trend="Within policy"
            icon={AlertTriangle}
          />
          <KpiCard 
            label="Compliance Score" 
            value="98.7%"
            trend="+0.5%"
            up={true}
            icon={Shield}
          />
        </div>

        {/* Recent Audit Activity */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Audit Trail</h4>
            <div className="space-y-4">
              {[
                { 
                  action: 'Recommendation Approved', 
                  user: 'Maria Santos (Senior Management)', 
                  target: 'Metro Manila pricing adjustment',
                  timestamp: '2 minutes ago', 
                  type: 'approval',
                  details: 'Approved ₱2/km rate increase with compliance review'
                },
                { 
                  action: 'Scenario Generated', 
                  user: 'AI System', 
                  target: 'Cebu surge optimization',
                  timestamp: '15 minutes ago', 
                  type: 'system',
                  details: 'Automated scenario run with 91% confidence'
                },
                { 
                  action: 'Bundle Created', 
                  user: 'Juan Alvarez (Regional Manager)', 
                  target: 'Cross-domain optimization bundle',
                  timestamp: '1 hour ago', 
                  type: 'creation',
                  details: 'Combined 3 recommendations into revenue optimization bundle'
                },
                { 
                  action: 'Override Applied', 
                  user: 'Anna Reyes (Senior Management)', 
                  target: 'Fraud detection threshold',
                  timestamp: '2 hours ago', 
                  type: 'override',
                  details: 'Manual override due to false positive spike - justified with audit note'
                },
                { 
                  action: 'Recommendation Rejected', 
                  user: 'Carlos Rodriguez (Senior Management)', 
                  target: 'Davao service expansion',
                  timestamp: '3 hours ago', 
                  type: 'rejection',
                  details: 'Rejected due to regulatory compliance concerns - requires LTFRB approval'
                }
              ].map((entry, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    entry.type === 'approval' ? 'bg-green-100' :
                    entry.type === 'rejection' ? 'bg-red-100' :
                    entry.type === 'override' ? 'bg-orange-100' :
                    entry.type === 'creation' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {entry.type === 'approval' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {entry.type === 'rejection' && <ThumbsDown className="w-4 h-4 text-red-600" />}
                    {entry.type === 'override' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                    {entry.type === 'creation' && <Globe className="w-4 h-4 text-blue-600" />}
                    {entry.type === 'system' && <Brain className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-gray-900">{entry.action}</h5>
                      <span className="text-xs text-gray-500">{entry.timestamp}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>User:</strong> {entry.user}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Target:</strong> {entry.target}
                    </div>
                    <div className="text-xs text-gray-500 italic">
                      {entry.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h4>
              <div className="space-y-3">
                {[
                  { id: 1, title: 'Cebu rate adjustment', proposer: 'Regional Manager', priority: 'high', age: '2 hours' },
                  { id: 2, title: 'Davao service expansion', proposer: 'Regional Manager', priority: 'medium', age: '1 day' },
                  { id: 3, title: 'Manila surge optimization', proposer: 'Regional Manager', priority: 'low', age: '3 days' }
                ].map(approval => (
                  <div key={approval.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{approval.title}</div>
                      <div className="text-sm text-gray-600">By {approval.proposer} • {approval.age} ago</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        approval.priority === 'high' ? 'bg-red-100 text-red-700' :
                        approval.priority === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {approval.priority}
                      </span>
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Governance Metrics</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Approval Time</span>
                  <span className="font-medium text-blue-600">2.3 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dual Approval Rate</span>
                  <span className="font-medium text-green-600">100%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Override Justification Rate</span>
                  <span className="font-medium text-purple-600">98.7%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Audit Trail Completeness</span>
                  <span className="font-medium text-green-600">100%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Policy Compliance Score</span>
                  <span className="font-medium text-blue-600">98.7%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Knowledge tab content
  const renderKnowledge = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Knowledge Base</h3>
            <p className="text-gray-600">Explain Like I'm 5 - AI/ML concepts and glossary</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search knowledge base..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Knowledge Categories */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors">
            <div className="flex items-center mb-2">
              <Brain className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">ML Basics</span>
            </div>
            <div className="text-sm text-blue-700">12 terms</div>
          </button>
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition-colors">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-900">Statistics</span>
            </div>
            <div className="text-sm text-green-700">8 terms</div>
          </button>
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 transition-colors">
            <div className="flex items-center mb-2">
              <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
              <span className="font-medium text-purple-900">Business</span>
            </div>
            <div className="text-sm text-purple-700">15 terms</div>
          </button>
          <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 transition-colors">
            <div className="flex items-center mb-2">
              <Shield className="w-5 h-5 text-orange-600 mr-2" />
              <span className="font-medium text-orange-900">Compliance</span>
            </div>
            <div className="text-sm text-orange-700">6 terms</div>
          </button>
        </div>

        {/* Knowledge Entries */}
        <div className="space-y-4">
          {[
            {
              term: 'Confidence Score',
              category: 'ML Basics',
              simple: 'How sure the AI is about its prediction, like being 90% sure it will rain.',
              long: 'A numerical measure (0-1 or 0-100%) indicating how certain a machine learning model is about its prediction. Higher confidence suggests more reliable predictions.',
              examples: ['Weather prediction: 90% chance of rain', 'Pricing recommendation: 87% confidence in ₱2/km increase']
            },
            {
              term: 'Model Drift',
              category: 'ML Basics', 
              simple: 'When AI gets worse over time because the world changes, like a weather app becoming less accurate.',
              long: 'The degradation of model performance over time due to changes in the underlying data patterns or relationships that the model was trained on.',
              examples: ['COVID-19 changing travel patterns', 'New competitors affecting demand predictions']
            },
            {
              term: 'MAPE',
              category: 'Statistics',
              simple: 'Mean Absolute Percentage Error - how far off our predictions are on average.',
              long: 'A statistical measure that calculates the average percentage difference between predicted and actual values. Lower MAPE indicates better accuracy.',
              examples: ['MAPE of 5% means predictions are typically within 5% of actual values']
            },
            {
              term: 'ROI',
              category: 'Business',
              simple: 'Return on Investment - how much money you make compared to what you spend.',
              long: 'A performance measure used to evaluate the efficiency of an investment, calculated as (Gain - Cost) / Cost × 100%.',
              examples: ['Invest ₱100K in driver incentives, gain ₱280K revenue = 180% ROI']
            },
            {
              term: 'Regulatory Compliance',
              category: 'Compliance',
              simple: 'Following the rules set by government agencies like LTFRB.',
              long: 'Adherence to laws, regulations, guidelines and specifications relevant to business operations, particularly transportation regulations in the Philippines.',
              examples: ['LTFRB franchise requirements', 'LGU permit compliance', 'Fare cap regulations']
            }
          ].map((entry, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{entry.term}</h4>
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {entry.category}
                    </span>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Simple Explanation:</h5>
                    <p className="text-gray-600">{entry.simple}</p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Detailed Definition:</h5>
                    <p className="text-gray-600">{entry.long}</p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Examples:</h5>
                    <ul className="text-gray-600 text-sm space-y-1">
                      {entry.examples.map((example, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Help */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Contact Data/AI Team</h5>
                <p className="text-sm text-gray-600 mb-3">Get help with AI/ML concepts, model interpretations, or technical questions.</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Contact Team
                </button>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Request New Terms</h5>
                <p className="text-sm text-gray-600 mb-3">Suggest new terms or concepts to add to the knowledge base.</p>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  Suggest Term
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <h1 className="text-2xl font-bold text-gray-900">Nexus Intelligence</h1>
              <p className="text-gray-600">v1.0 — Central AI/ML Hub with Dual Approvals</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <Brain className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">AI Engine Active</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recommendations, models..."
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

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'recommendations' && renderRecommendations()}
            {activeTab === 'forecasts' && renderForecasts()}
            {activeTab === 'scenario_builder' && renderScenarioBuilder()}
            {activeTab === 'cross_domain' && renderCrossDomain()}
            {activeTab === 'risk_compliance' && renderRiskCompliance()}
            {activeTab === 'ops_ai' && renderOpsAI()}
            {activeTab === 'audit_governance' && renderAuditGovernance()}
            {activeTab === 'knowledge' && renderKnowledge()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NexusIntelligence;