'use client';

import React, { useState, useEffect, memo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterPlot,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Eye,
  Brain,
  Target,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

interface FraudTrend {
  date: string;
  detected: number;
  prevented: number;
  falsePositives: number;
  accuracy: number;
  financialSaved: number;
}

interface RiskDistribution {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  trend: number;
}

interface ModelPerformance {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  lastUpdated: string;
}

interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeframe: '24h' | '7d' | '30d';
  recommendation: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface RegionalAnalytics {
  region: 'manila' | 'cebu' | 'davao';
  fraudRate: number;
  totalTransactions: number;
  preventedLoss: number;
  topFraudTypes: Array<{
    type: string;
    count: number;
    trend: number;
  }>;
}

export const AdvancedAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<'fraud' | 'financial' | 'performance'>('fraud');
  const [fraudTrends, setFraudTrends] = useState<FraudTrend[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [regionalAnalytics, setRegionalAnalytics] = useState<RegionalAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    
    // Simulate API calls - in production these would fetch real data
    await Promise.all([
      generateFraudTrends(),
      generateRiskDistribution(),
      generateModelPerformance(),
      generatePredictiveInsights(),
      generateRegionalAnalytics()
    ]);
    
    setIsLoading(false);
  };

  const generateFraudTrends = () => {
    const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data: FraudTrend[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const detected = Math.floor(Math.random() * 100) + 20;
      const prevented = Math.floor(detected * 0.85);
      const falsePositives = Math.floor(detected * 0.08);
      
      data.push({
        date: timeRange === '24h' ? `${date.getHours()}:00` : date.toISOString().split('T')[0],
        detected,
        prevented,
        falsePositives,
        accuracy: 0.92 + Math.random() * 0.06,
        financialSaved: prevented * 150 + Math.random() * 50000
      });
    }
    
    setFraudTrends(data);
  };

  const generateRiskDistribution = () => {
    const distribution: RiskDistribution[] = [
      { riskLevel: 'low', count: 15420, percentage: 75.2, trend: -2.3 },
      { riskLevel: 'medium', count: 3890, percentage: 19.1, trend: 1.8 },
      { riskLevel: 'high', count: 978, percentage: 4.8, trend: 0.5 },
      { riskLevel: 'critical', count: 187, percentage: 0.9, trend: -0.1 }
    ];
    
    setRiskDistribution(distribution);
  };

  const generateModelPerformance = () => {
    const models: ModelPerformance[] = [
      {
        model: 'Ensemble Model v2.1',
        accuracy: 0.94,
        precision: 0.89,
        recall: 0.92,
        f1Score: 0.905,
        auc: 0.96,
        lastUpdated: '2 hours ago'
      },
      {
        model: 'GPS Spoofing Detector v1.3',
        accuracy: 0.97,
        precision: 0.95,
        recall: 0.89,
        f1Score: 0.92,
        auc: 0.98,
        lastUpdated: '1 day ago'
      },
      {
        model: 'Multi-Account Detector v1.1',
        accuracy: 0.91,
        precision: 0.88,
        recall: 0.85,
        f1Score: 0.865,
        auc: 0.94,
        lastUpdated: '3 days ago'
      }
    ];
    
    setModelPerformance(models);
  };

  const generatePredictiveInsights = () => {
    const insights: PredictiveInsight[] = [
      {
        id: '1',
        title: 'Fraud Spike Expected During Weekend',
        description: 'ML models predict 35% increase in GPS spoofing attempts during weekend hours',
        confidence: 0.87,
        impact: 'high',
        timeframe: '7d',
        recommendation: 'Increase monitoring on weekend evenings and consider temporarily reducing bonus incentives in high-risk areas',
        trend: 'increasing'
      },
      {
        id: '2',
        title: 'New Multi-Account Pattern Emerging',
        description: 'Anomaly detection identified coordinated account creation pattern in Cebu region',
        confidence: 0.82,
        impact: 'medium',
        timeframe: '24h',
        recommendation: 'Deploy enhanced device fingerprinting in Cebu and review recent account registrations',
        trend: 'increasing'
      },
      {
        id: '3',
        title: 'Payment Fraud Risk Decreasing',
        description: 'Improved payment validation has reduced payment-related fraud by 40%',
        confidence: 0.91,
        impact: 'medium',
        timeframe: '30d',
        recommendation: 'Consider extending current payment validation techniques to other regions',
        trend: 'decreasing'
      },
      {
        id: '4',
        title: 'Incentive Fraud Pattern Shift',
        description: 'Fraudsters adapting to new detection - expect more sophisticated route manipulation',
        confidence: 0.79,
        impact: 'high',
        timeframe: '7d',
        recommendation: 'Update route deviation algorithms and increase manual review threshold',
        trend: 'increasing'
      }
    ];
    
    setPredictiveInsights(insights);
  };

  const generateRegionalAnalytics = () => {
    const analytics: RegionalAnalytics[] = [
      {
        region: 'manila',
        fraudRate: 2.8,
        totalTransactions: 45678,
        preventedLoss: 1250000,
        topFraudTypes: [
          { type: 'GPS Spoofing', count: 187, trend: 12 },
          { type: 'Incentive Fraud', count: 156, trend: -8 },
          { type: 'Multi-Account', count: 89, trend: 23 }
        ]
      },
      {
        region: 'cebu',
        fraudRate: 3.2,
        totalTransactions: 23456,
        preventedLoss: 680000,
        topFraudTypes: [
          { type: 'Multi-Account', count: 134, trend: 45 },
          { type: 'GPS Spoofing', count: 98, trend: 5 },
          { type: 'Payment Fraud', count: 67, trend: -15 }
        ]
      },
      {
        region: 'davao',
        fraudRate: 2.1,
        totalTransactions: 18234,
        preventedLoss: 420000,
        topFraudTypes: [
          { type: 'Incentive Fraud', count: 78, trend: -12 },
          { type: 'GPS Spoofing', count: 45, trend: 8 },
          { type: 'Fake Rides', count: 34, trend: 18 }
        ]
      }
    ];
    
    setRegionalAnalytics(analytics);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'increasing' ? (
      <TrendingUp className="w-4 h-4 text-red-500" />
    ) : trend === 'decreasing' ? (
      <TrendingDown className="w-4 h-4 text-green-500" />
    ) : (
      <Activity className="w-4 h-4 text-gray-500" />
    );
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const RISK_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Brain className="w-7 h-7 text-blue-600" />
              <span>Advanced Analytics</span>
            </h1>
            <p className="text-gray-600 mt-1">AI-powered fraud detection insights and predictive analytics</p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            <button
              onClick={loadAnalyticsData}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fraud Detected</p>
                <p className="text-2xl font-bold text-gray-900">1,247</p>
              </div>
            </div>
            <div className="text-right">
              <TrendingUp className="w-4 h-4 text-green-500 inline" />
              <span className="text-sm text-green-600 ml-1">+12%</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">vs previous period</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Loss Prevented</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(2350000)}</p>
              </div>
            </div>
            <div className="text-right">
              <TrendingUp className="w-4 h-4 text-green-500 inline" />
              <span className="text-sm text-green-600 ml-1">+8%</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">estimated financial impact</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Model Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">94.2%</p>
              </div>
            </div>
            <div className="text-right">
              <TrendingUp className="w-4 h-4 text-green-500 inline" />
              <span className="text-sm text-green-600 ml-1">+0.3%</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">ensemble model performance</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">127ms</p>
              </div>
            </div>
            <div className="text-right">
              <TrendingDown className="w-4 h-4 text-green-500 inline" />
              <span className="text-sm text-green-600 ml-1">-15ms</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">avg ML prediction time</div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Fraud Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Fraud Detection Trends</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Detected</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Prevented</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>False Positives</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fraudTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="detected" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="prevented" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="falsePositives" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Risk Level Distribution</h3>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2">
              {riskDistribution.map((item, index) => (
                <div key={item.riskLevel} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RISK_COLORS[index] }}
                    />
                    <span className="text-sm capitalize">{item.riskLevel}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.percentage}%</div>
                    <div className={`text-xs ${item.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.trend > 0 ? '+' : ''}{item.trend}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">ML Model Performance</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {modelPerformance.map((model, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">{model.model}</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accuracy</span>
                  <span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precision</span>
                  <span className="font-medium">{(model.precision * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recall</span>
                  <span className="font-medium">{(model.recall * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">F1 Score</span>
                  <span className="font-medium">{(model.f1Score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">AUC</span>
                  <span className="font-medium">{(model.auc * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3">
                Updated {model.lastUpdated}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">AI Predictive Insights</h3>
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictiveInsights.map((insight) => (
            <div key={insight.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
                  {getTrendIcon(insight.trend)}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                    {insight.impact}
                  </span>
                  <span className="text-xs text-gray-500">{insight.timeframe}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Confidence</span>
                  <span>{Math.round(insight.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Recommendation:</strong> {insight.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Analytics */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Regional Fraud Analytics</h3>
          <div className="text-sm text-gray-500">Philippines Regions</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regionalAnalytics.map((region) => (
            <div key={region.region} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 capitalize">{region.region}</h4>
                <span className={`text-sm font-medium ${region.fraudRate > 3 ? 'text-red-600' : region.fraudRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {region.fraudRate}% fraud rate
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transactions</span>
                  <span className="font-medium">{region.totalTransactions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Loss Prevented</span>
                  <span className="font-medium text-green-600">{formatCurrency(region.preventedLoss)}</span>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Top Fraud Types</h5>
                <div className="space-y-1">
                  {region.topFraudTypes.map((fraud, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{fraud.type}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{fraud.count}</span>
                        <span className={`${fraud.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {fraud.trend > 0 ? '+' : ''}{fraud.trend}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Add displayName for debugging
AdvancedAnalyticsDashboard.displayName = 'AdvancedAnalyticsDashboard';

export default memo(AdvancedAnalyticsDashboard);