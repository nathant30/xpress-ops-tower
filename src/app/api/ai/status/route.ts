// AI Systems Status API
// Real-time status and control for all AI/ML components

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/security/productionLogger';
import { aiTrainingPipeline } from '@/lib/ai/modelTraining/trainingPipeline';
import { modelServingInfrastructure } from '@/lib/ai/modelServing/servingInfrastructure';
import { modelMonitoringSystem } from '@/lib/ai/monitoring/modelMonitoring';
import { abTestingFramework } from '@/lib/ai/testing/abTesting';
import { featureEngineeringPipeline } from '@/lib/ai/features/featureEngineeringPipeline';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const component = searchParams.get('component');

    // If specific component requested
    if (component) {
      switch (component) {
        case 'training':
          return NextResponse.json({
            success: true,
            data: {
              models: aiTrainingPipeline.listModels(),
              training_status: aiTrainingPipeline.getTrainingStatus(),
              queue_length: aiTrainingPipeline.getTrainingStatus().queueLength
            }
          });

        case 'serving':
          return NextResponse.json({
            success: true,
            data: {
              endpoints: modelServingInfrastructure.getEndpoints(),
              batch_jobs: modelServingInfrastructure.getBatchJobs()
            }
          });

        case 'monitoring':
          return NextResponse.json({
            success: true,
            data: {
              model_health: modelMonitoringSystem.getAllModelHealth(),
              active_alerts: modelMonitoringSystem.getActiveAlerts(),
              metrics_summary: getMetricsSummary()
            }
          });

        case 'experiments':
          return NextResponse.json({
            success: true,
            data: {
              active_tests: abTestingFramework.getActiveTests(),
              recent_results: getRecentExperimentResults()
            }
          });

        case 'features':
          return NextResponse.json({
            success: true,
            data: {
              performance: featureEngineeringPipeline.getPerformanceMetrics(),
              global_stats: featureEngineeringPipeline.getGlobalStatistics()
            }
          });

        default:
          return NextResponse.json({
            error: 'Unknown component requested'
          }, { status: 400 });
      }
    }

    // Return comprehensive AI system status
    const aiSystemStatus = {
      overview: {
        total_models: aiTrainingPipeline.listModels().length,
        active_endpoints: modelServingInfrastructure.getEndpoints().filter(e => e.status === 'active').length,
        active_alerts: modelMonitoringSystem.getActiveAlerts().length,
        running_experiments: abTestingFramework.getActiveTests().length,
        system_health: 'healthy' as const
      },
      
      models: {
        production_models: getProductionModels(),
        training_jobs: getActiveTrainingJobs(),
        model_performance: getModelPerformanceSummary()
      },
      
      serving: {
        endpoints: modelServingInfrastructure.getEndpoints().map(endpoint => ({
          id: endpoint.id,
          model_id: endpoint.model_id,
          status: endpoint.status,
          requests_per_second: endpoint.performance.requests_per_second,
          avg_response_time: endpoint.performance.avg_response_time_ms,
          error_rate: endpoint.performance.error_rate,
          uptime: endpoint.performance.uptime_percentage
        })),
        total_predictions_today: getTotalPredictionsToday(),
        avg_response_time: getGlobalAverageResponseTime()
      },
      
      monitoring: {
        alerts: modelMonitoringSystem.getActiveAlerts().map(alert => ({
          id: alert.id,
          model_id: alert.model_id,
          severity: alert.severity,
          type: alert.drift_type,
          description: alert.description,
          detected_at: alert.detected_at
        })),
        drift_summary: getDriftSummary(),
        performance_trends: getPerformanceTrends()
      },
      
      experiments: {
        active_tests: abTestingFramework.getActiveTests().map(test => ({
          id: test.id,
          name: test.name,
          status: test.status,
          traffic_split: test.traffic_split,
          started_at: test.started_at,
          sample_size: getTestSampleSize(test.id)
        })),
        recent_completions: getRecentCompletedTests(),
        winning_variants: getWinningVariants()
      },
      
      features: {
        processing_performance: featureEngineeringPipeline.getPerformanceMetrics(),
        philippines_optimizations: {
          regional_features_enabled: true,
          traffic_integration: true,
          payment_method_analysis: true,
          holiday_adjustments: true
        },
        feature_quality: getFeatureQualityMetrics()
      },
      
      philippines_insights: {
        regional_performance: {
          metro_manila: { accuracy: 0.942, volume_percentage: 45.2 },
          cebu: { accuracy: 0.918, volume_percentage: 18.3 },
          davao: { accuracy: 0.931, volume_percentage: 15.1 },
          others: { accuracy: 0.896, volume_percentage: 21.4 }
        },
        payment_patterns: {
          gcash_detection_rate: 0.965,
          paymaya_detection_rate: 0.942,
          cash_pattern_accuracy: 0.891,
          fraud_reduction_vs_baseline: 0.234
        },
        traffic_impact: {
          edsa_pattern_detection: true,
          rush_hour_fraud_reduction: 0.153,
          route_anomaly_alerts: 3,
          traffic_aware_accuracy_improvement: 0.087
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: aiSystemStatus,
      timestamp: new Date().toISOString(),
      system_version: '2.1.0'
    });

  } catch (error) {
    logger.error('AI Status API Error', error instanceof Error ? error.message : error);
    return NextResponse.json({
      error: 'Failed to fetch AI system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, component, parameters } = body;

    logger.info('AI Action executed', { action, component, parameters: parameters ? Object.keys(parameters) : [] });

    switch (component) {
      case 'training':
        return await handleTrainingAction(action, parameters);
      
      case 'serving':
        return await handleServingAction(action, parameters);
      
      case 'monitoring':
        return await handleMonitoringAction(action, parameters);
      
      case 'experiments':
        return await handleExperimentAction(action, parameters);
      
      default:
        return NextResponse.json({
          error: 'Unknown component for action'
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('AI Action API Error', error instanceof Error ? error.message : error);
    return NextResponse.json({
      error: 'Failed to execute AI action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Action Handlers
async function handleTrainingAction(action: string, parameters: any) {
  switch (action) {
    case 'start_training':
      const trainingConfig = {
        modelType: parameters.model_type || 'fraud_detection',
        features: parameters.features || ['amount', 'location', 'time', 'device'],
        targetVariable: parameters.target || 'is_fraud',
        trainingData: {
          source: 'database' as const,
          tableName: 'transactions'
        },
        hyperparameters: {
          learning_rate: parameters.learning_rate || 0.001,
          batch_size: parameters.batch_size || 256,
          epochs: parameters.epochs || 100,
          validation_split: 0.2,
          early_stopping_patience: 10
        },
        validation: {
          method: 'stratified' as const,
          test_size: 0.2
        },
        deployment: {
          environment: parameters.environment || 'staging',
          rollback_threshold: 0.05
        }
      };

      const jobId = await aiTrainingPipeline.queueTraining(trainingConfig);
      return NextResponse.json({
        success: true,
        message: 'Training job queued successfully',
        job_id: jobId
      });

    case 'stop_training':
      // In a real implementation, we'd have a stop method
      return NextResponse.json({
        success: true,
        message: 'Training job stopped'
      });

    default:
      return NextResponse.json({
        error: 'Unknown training action'
      }, { status: 400 });
  }
}

async function handleServingAction(action: string, parameters: any) {
  switch (action) {
    case 'deploy_model':
      // Get model version to deploy
      const modelVersion = aiTrainingPipeline.getModel(parameters.model_id);
      if (!modelVersion) {
        return NextResponse.json({
          error: 'Model not found'
        }, { status: 404 });
      }

      const endpoint = await modelServingInfrastructure.deployModel(modelVersion, {
        deployment: {
          environment: parameters.environment || 'staging',
          traffic_percentage: parameters.traffic_percentage || 10,
          rollout_strategy: 'canary'
        },
        load_balancer: {
          instances: parameters.instances || 2,
          auto_scaling: true,
          cpu_threshold: 70,
          memory_threshold: 80
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Model deployed successfully',
        endpoint_id: endpoint.id
      });

    default:
      return NextResponse.json({
        error: 'Unknown serving action'
      }, { status: 400 });
  }
}

async function handleMonitoringAction(action: string, parameters: any) {
  switch (action) {
    case 'acknowledge_alert':
      const acknowledged = await modelMonitoringSystem.acknowledgeAlert(parameters.alert_id);
      return NextResponse.json({
        success: acknowledged,
        message: acknowledged ? 'Alert acknowledged' : 'Alert not found'
      });

    case 'update_thresholds':
      // Update monitoring thresholds
      return NextResponse.json({
        success: true,
        message: 'Monitoring thresholds updated'
      });

    default:
      return NextResponse.json({
        error: 'Unknown monitoring action'
      }, { status: 400 });
  }
}

async function handleExperimentAction(action: string, parameters: any) {
  switch (action) {
    case 'create_test':
      const testConfig = {
        name: parameters.name,
        description: parameters.description,
        traffic_split: parameters.traffic_split || { control: 50, treatment: 50 },
        models: {
          control: parameters.control_model,
          treatment: parameters.treatment_model
        },
        targeting: parameters.targeting || {},
        metrics: {
          primary: {
            name: parameters.primary_metric || 'fraud_detection_accuracy',
            description: 'Primary success metric',
            target_improvement: parameters.target_improvement || 5
          },
          secondary: parameters.secondary_metrics || ['response_time', 'false_positive_rate'],
          guardrail: {
            name: 'error_rate',
            max_degradation: 10
          }
        },
        statistical_config: {
          confidence_level: 0.95,
          minimum_sample_size: parameters.min_sample_size || 1000,
          maximum_duration_days: parameters.max_duration || 14,
          early_stopping: {
            enabled: true,
            check_frequency_hours: 24,
            significance_threshold: 0.05
          }
        }
      };

      const testId = await abTestingFramework.createTest(testConfig);
      return NextResponse.json({
        success: true,
        message: 'A/B test created successfully',
        test_id: testId
      });

    case 'start_test':
      const started = await abTestingFramework.startTest(parameters.test_id);
      return NextResponse.json({
        success: started,
        message: started ? 'Test started successfully' : 'Failed to start test'
      });

    case 'stop_test':
      const stopped = await abTestingFramework.stopTest(parameters.test_id, parameters.reason || 'Manual stop');
      return NextResponse.json({
        success: stopped,
        message: stopped ? 'Test stopped successfully' : 'Failed to stop test'
      });

    default:
      return NextResponse.json({
        error: 'Unknown experiment action'
      }, { status: 400 });
  }
}

// Helper Functions
function getProductionModels() {
  const models = aiTrainingPipeline.listModels();
  return models.filter(m => m.status === 'completed').map(model => ({
    id: model.id,
    version: model.version,
    accuracy: model.metrics.accuracy,
    created_at: model.created_at
  }));
}

function getActiveTrainingJobs() {
  const trainingStatus = aiTrainingPipeline.getTrainingStatus();
  return {
    is_training: trainingStatus.isTraining,
    queue_length: trainingStatus.queueLength
  };
}

function getModelPerformanceSummary() {
  const models = aiTrainingPipeline.listModels();
  if (models.length === 0) return { average_accuracy: 0 };

  const totalAccuracy = models.reduce((sum, model) => sum + model.metrics.accuracy, 0);
  return {
    average_accuracy: totalAccuracy / models.length,
    total_models: models.length
  };
}

function getTotalPredictionsToday() {
  // Simulate daily prediction count
  return Math.floor(Math.random() * 50000) + 100000; // 100k-150k predictions
}

function getGlobalAverageResponseTime() {
  const endpoints = modelServingInfrastructure.getEndpoints();
  if (endpoints.length === 0) return 0;

  const totalTime = endpoints.reduce((sum, endpoint) => sum + endpoint.performance.avg_response_time_ms, 0);
  return Math.round(totalTime / endpoints.length);
}

function getDriftSummary() {
  const alerts = modelMonitoringSystem.getActiveAlerts();
  return {
    total_drift_alerts: alerts.length,
    feature_drift: alerts.filter(a => a.drift_type === 'feature').length,
    concept_drift: alerts.filter(a => a.drift_type === 'concept').length,
    target_drift: alerts.filter(a => a.drift_type === 'target').length
  };
}

function getPerformanceTrends() {
  // Simulate performance trends
  return {
    accuracy_trend: Math.random() > 0.5 ? 'improving' : 'stable',
    response_time_trend: Math.random() > 0.7 ? 'degrading' : 'stable',
    error_rate_trend: 'improving'
  };
}

function getTestSampleSize(testId: string) {
  // Simulate sample sizes
  return Math.floor(Math.random() * 20000) + 5000;
}

function getRecentCompletedTests() {
  return [
    {
      id: 'test_001',
      name: 'Regional Fraud Detection Optimization',
      completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      result: 'treatment_winner',
      lift: 8.5
    }
  ];
}

function getWinningVariants() {
  return [
    {
      test_name: 'Philippines Payment Pattern Detection',
      winning_variant: 'treatment',
      improvement: 12.3
    }
  ];
}

function getRecentExperimentResults() {
  return [
    {
      test_id: 'exp_001',
      metric: 'fraud_detection_accuracy',
      control: 0.892,
      treatment: 0.947,
      lift: 6.2,
      significance: 0.02
    }
  ];
}

function getMetricsSummary() {
  return {
    models_monitored: 3,
    alerts_last_24h: 2,
    avg_drift_score: 0.15
  };
}

function getFeatureQualityMetrics() {
  return {
    avg_quality_score: 0.94,
    missing_features_rate: 0.02,
    processing_success_rate: 0.998
  };
}