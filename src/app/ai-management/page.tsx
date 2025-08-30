'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Activity, TrendingUp, AlertTriangle, Play, Pause, Settings, BarChart3, Zap, Target, Users, Clock } from 'lucide-react';

// AI Management Dashboard
// Central control panel for all AI/ML systems

interface ModelStatus {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'training' | 'inactive' | 'failed';
  accuracy: number;
  requests_per_hour: number;
  last_updated: Date;
  deployment_env: 'production' | 'staging' | 'testing';
}

interface TrainingJob {
  id: string;
  model_type: string;
  status: 'queued' | 'training' | 'completed' | 'failed';
  progress: number;
  started_at: Date;
  estimated_completion?: Date;
  current_epoch?: number;
  total_epochs?: number;
}

interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused';
  traffic_split: { control: number; treatment: number };
  primary_metric: { name: string; lift: number; is_significant: boolean };
  sample_size: number;
  started_at: Date;
  confidence: number;
}

interface DriftAlert {
  id: string;
  model_id: string;
  drift_type: 'feature' | 'concept' | 'target';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: Date;
  description: string;
}

const AIManagementDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'training' | 'experiments' | 'monitoring'>('overview');
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [experiments, setExperiments] = useState<ABTest[]>([]);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);

  useEffect(() => {
    // Load initial data
    loadModels();
    loadTrainingJobs();
    loadExperiments();
    loadAlerts();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      refreshData();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const loadModels = () => {
    // Simulate loading model data
    setModels([
      {
        id: 'fraud_detection_v2',
        name: 'Fraud Detection Model',
        version: 'v2.1.3',
        status: 'active',
        accuracy: 0.942,
        requests_per_hour: 2400,
        last_updated: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deployment_env: 'production'
      },
      {
        id: 'risk_assessment_v1',
        name: 'Risk Assessment Model',
        version: 'v1.5.2',
        status: 'active',
        accuracy: 0.876,
        requests_per_hour: 1800,
        last_updated: new Date(Date.now() - 4 * 60 * 60 * 1000),
        deployment_env: 'production'
      },
      {
        id: 'behavior_analysis_v3',
        name: 'Behavioral Analysis',
        version: 'v3.0.1',
        status: 'training',
        accuracy: 0.821,
        requests_per_hour: 0,
        last_updated: new Date(Date.now() - 30 * 60 * 1000),
        deployment_env: 'staging'
      }
    ]);
  };

  const loadTrainingJobs = () => {
    setTrainingJobs([
      {
        id: 'job_001',
        model_type: 'fraud_detection',
        status: 'training',
        progress: 67,
        started_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
        estimated_completion: new Date(Date.now() + 2 * 60 * 60 * 1000),
        current_epoch: 67,
        total_epochs: 100
      },
      {
        id: 'job_002',
        model_type: 'location_anomaly',
        status: 'queued',
        progress: 0,
        started_at: new Date(),
        total_epochs: 75
      }
    ]);
  };

  const loadExperiments = () => {
    setExperiments([
      {
        id: 'exp_001',
        name: 'Philippines Traffic-Aware Fraud Detection',
        status: 'running',
        traffic_split: { control: 50, treatment: 50 },
        primary_metric: { name: 'fraud_detection_accuracy', lift: 5.2, is_significant: true },
        sample_size: 15420,
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        confidence: 0.95
      },
      {
        id: 'exp_002', 
        name: 'GCash/PayMaya Pattern Recognition',
        status: 'running',
        traffic_split: { control: 70, treatment: 30 },
        primary_metric: { name: 'false_positive_rate', lift: -12.3, is_significant: false },
        sample_size: 8940,
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        confidence: 0.78
      }
    ]);
  };

  const loadAlerts = () => {
    setAlerts([
      {
        id: 'alert_001',
        model_id: 'fraud_detection_v2',
        drift_type: 'feature',
        severity: 'high',
        detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        description: 'Significant drift in transaction amount distribution'
      },
      {
        id: 'alert_002',
        model_id: 'risk_assessment_v1',
        drift_type: 'concept',
        severity: 'medium',
        detected_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
        description: 'Regional fraud patterns changing in Metro Manila'
      }
    ]);
  };

  const refreshData = () => {
    // Update data with new values
    setModels(prev => prev.map(model => ({
      ...model,
      requests_per_hour: model.requests_per_hour + Math.floor(Math.random() * 100 - 50),
      last_updated: model.status === 'active' ? new Date() : model.last_updated
    })));

    setTrainingJobs(prev => prev.map(job => ({
      ...job,
      progress: job.status === 'training' ? Math.min(job.progress + Math.random() * 3, 100) : job.progress
    })));
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      training: 'bg-blue-100 text-blue-800',
      inactive: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      queued: 'bg-orange-100 text-orange-800'
    };
    
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-yellow-600',
      medium: 'text-orange-600', 
      high: 'text-red-600',
      critical: 'text-red-800'
    };
    return colors[severity as keyof typeof colors];
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Models</p>
              <p className="text-2xl font-bold text-gray-900">{models.filter(m => m.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Predictions/Hour</p>
              <p className="text-2xl font-bold text-gray-900">
                {models.reduce((sum, m) => sum + m.requests_per_hour, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">
                {((models.reduce((sum, m) => sum + m.accuracy, 0) / models.length) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${getSeverityColor(alert.severity)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.description}</p>
                  <p className="text-sm text-gray-500">
                    Model: {alert.model_id} • {alert.detected_at.toLocaleString()}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Experiments */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Running A/B Tests</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {experiments.filter(exp => exp.status === 'running').map(exp => (
              <div key={exp.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{exp.name}</h4>
                  <span className={getStatusBadge(exp.status)}>{exp.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Sample Size:</span> {exp.sample_size.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Lift:</span> 
                    <span className={exp.primary_metric.lift > 0 ? 'text-green-600' : 'text-red-600'}>
                      {exp.primary_metric.lift > 0 ? '+' : ''}{exp.primary_metric.lift.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Confidence:</span> {(exp.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderModels = () => (
    <div className="bg-white rounded-lg border">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Production Models</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Deploy New Model
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traffic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.map(model => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-500">{model.version}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(model.status)}>{model.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{(model.accuracy * 100).toFixed(1)}% accuracy</div>
                  <div className="text-sm text-gray-500">{model.deployment_env}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {model.requests_per_hour.toLocaleString()}/hr
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.last_updated.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Settings className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    {model.status === 'active' ? (
                      <button className="text-orange-600 hover:text-orange-900">
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : (
                      <button className="text-green-600 hover:text-green-900">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Training Jobs</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Start New Training
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {trainingJobs.map(job => (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{job.model_type.replace('_', ' ').toUpperCase()}</h4>
                    <p className="text-sm text-gray-500">Started {job.started_at.toLocaleString()}</p>
                  </div>
                  <span className={getStatusBadge(job.status)}>{job.status}</span>
                </div>
                
                {job.status === 'training' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{job.progress.toFixed(1)}% ({job.current_epoch}/{job.total_epochs} epochs)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Model Type:</span> {job.model_type}
                  </div>
                  <div>
                    <span className="font-medium">ETA:</span> {job.estimated_completion?.toLocaleString() || 'Calculating...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderExperiments = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">A/B Tests & Experiments</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Create New Experiment
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {experiments.map(exp => (
              <div key={exp.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{exp.name}</h4>
                    <p className="text-sm text-gray-500">Started {exp.started_at.toLocaleDateString()}</p>
                  </div>
                  <span className={getStatusBadge(exp.status)}>{exp.status}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Control:</span>
                    <div className="font-medium">{exp.traffic_split.control}%</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Treatment:</span>
                    <div className="font-medium">{exp.traffic_split.treatment}%</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Sample Size:</span>
                    <div className="font-medium">{exp.sample_size.toLocaleString()}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Confidence:</span>
                    <div className="font-medium">{(exp.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-500">Primary Metric Lift:</span>
                    <span className={`font-medium ml-2 ${
                      exp.primary_metric.lift > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {exp.primary_metric.lift > 0 ? '+' : ''}{exp.primary_metric.lift.toFixed(1)}%
                    </span>
                    {exp.primary_metric.is_significant && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Significant</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">View Details</button>
                    {exp.status === 'running' && (
                      <button className="text-orange-600 hover:text-orange-800 text-sm">Pause</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-6">
      {/* Philippines-Specific AI Monitoring */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">🇵🇭 Philippines AI Performance</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Regional Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Metro Manila:</span>
                  <span className="font-medium text-blue-700">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cebu:</span>
                  <span className="font-medium text-blue-700">91.8%</span>
                </div>
                <div className="flex justify-between">
                  <span>Davao:</span>
                  <span className="font-medium text-blue-700">93.1%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Payment Method Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>GCash Detection:</span>
                  <span className="font-medium text-green-700">96.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>PayMaya Detection:</span>
                  <span className="font-medium text-green-700">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Patterns:</span>
                  <span className="font-medium text-green-700">89.1%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Traffic Impact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>EDSA Patterns:</span>
                  <span className="font-medium text-purple-700">Detected</span>
                </div>
                <div className="flex justify-between">
                  <span>Rush Hour Fraud:</span>
                  <span className="font-medium text-purple-700">-15.3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Route Anomalies:</span>
                  <span className="font-medium text-purple-700">3 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drift Detection */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Model Drift Detection</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                      <h4 className="text-sm font-medium text-gray-900">{alert.model_id}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.drift_type} drift
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                    <p className="text-xs text-gray-500">Detected: {alert.detected_at.toLocaleString()}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Investigate</button>
                    <button className="text-green-600 hover:text-green-800 text-sm">Retrain</button>
                    <button className="text-gray-600 hover:text-gray-800 text-sm">Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'models', label: 'Models', icon: Brain },
    { id: 'training', label: 'Training', icon: Zap },
    { id: 'experiments', label: 'A/B Tests', icon: Target },
    { id: 'monitoring', label: 'Monitoring', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Management</h1>
              <p className="text-gray-600">Advanced AI/ML systems for Philippines rideshare operations</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6">
          <div className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'models' && renderModels()}
        {activeTab === 'training' && renderTraining()}
        {activeTab === 'experiments' && renderExperiments()}
        {activeTab === 'monitoring' && renderMonitoring()}
      </div>
    </div>
  );
};

export default AIManagementDashboard;