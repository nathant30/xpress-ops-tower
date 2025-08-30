// ML Training Data API - For feeding historical fraud data into the system
import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metricsCollector';
import { logger } from '@/lib/security/productionLogger';

export interface TrainingDataBatch {
  batchId: string;
  dataType: 'rider_incentive' | 'gps_spoofing' | 'multi_account' | 'payment_fraud' | 'mixed';
  records: TrainingRecord[];
  metadata: {
    totalRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
    source: string;
    version: string;
  };
}

export interface TrainingRecord {
  id: string;
  userId: string;
  userType: 'rider' | 'driver';
  timestamp: string;
  
  // Label (ground truth)
  isFraud: boolean;
  fraudType?: string;
  confirmedBy: string;
  confidenceScore: number; // 0-100
  
  // Features
  features: {
    // User features
    accountAge: number;
    totalRides: number;
    averageRating: number;
    completionRate: number;
    
    // Behavioral features
    ridesPerDay: number;
    averageRideDistance: number;
    averageRideDuration: number;
    cancelationRate: number;
    
    // Financial features
    promoCodesUsed: number;
    averageSpending: number;
    paymentMethods: number;
    chargebacks: number;
    
    // Device features
    deviceChanges: number;
    ipAddressChanges: number;
    locationVariance: number;
    
    // Philippines-specific features
    crossRegionRides: number;
    remoteAreaPercentage: number;
    networkCarrier: string;
    
    // Custom features (flexible)
    customFeatures?: Record<string, any>;
  };
  
  // Context
  context: {
    rideData?: any;
    deviceInfo?: any;
    locationHistory?: any;
    networkData?: any;
  };
}

// POST - Upload training data
export async function POST(request: NextRequest) {
  try {
    const trainingBatch: TrainingDataBatch = await request.json();
    
    // Validate batch structure
    if (!trainingBatch.batchId || !trainingBatch.records || !Array.isArray(trainingBatch.records)) {
      return NextResponse.json(
        { error: 'Invalid training batch structure' },
        { status: 400 }
      );
    }

    // Validate records
    const validationErrors = validateTrainingRecords(trainingBatch.records);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Training records validation failed',
          validationErrors: validationErrors.slice(0, 10) // Show first 10 errors
        },
        { status: 400 }
      );
    }

    // Process training data
    const processingResult = await processTrainingData(trainingBatch);
    
    // Track metrics
    metricsCollector.incrementCounter('ml_training_batches_total', {
      data_type: trainingBatch.dataType,
      status: 'success'
    });
    
    metricsCollector.setGauge('ml_training_records_total', processingResult.totalRecordsProcessed);

    return NextResponse.json({
      success: true,
      batchId: trainingBatch.batchId,
      processed: processingResult.totalRecordsProcessed,
      fraudCases: processingResult.fraudCases,
      legitimateCases: processingResult.legitimateCases,
      skippedRecords: processingResult.skippedRecords,
      modelRetraining: processingResult.triggerRetraining,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Training data upload failed:', error);
    
    metricsCollector.incrementCounter('ml_training_batches_total', {
      status: 'error'
    });
    
    return NextResponse.json(
      { error: 'Failed to process training data' },
      { status: 500 }
    );
  }
}

// GET - Get training data statistics and model info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const dataType = searchParams.get('type');

    switch (action) {
      case 'stats':
        const stats = await getTrainingDataStats(dataType);
        return NextResponse.json(stats);
        
      case 'model-info':
        const modelInfo = await getModelInformation(dataType);
        return NextResponse.json(modelInfo);
        
      case 'feature-importance':
        const features = await getFeatureImportance(dataType);
        return NextResponse.json(features);
        
      case 'data-quality':
        const quality = await getDataQualityMetrics(dataType);
        return NextResponse.json(quality);
        
      default:
        return NextResponse.json({
          availableActions: ['stats', 'model-info', 'feature-importance', 'data-quality'],
          example: '/api/fraud/training-data?action=stats&type=rider_incentive'
        });
    }

  } catch (error) {
    logger.error('Training data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training data information' },
      { status: 500 }
    );
  }
}

// PUT - Update model configuration
export async function PUT(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Validate model configuration
    if (!config.modelType || !config.parameters) {
      return NextResponse.json(
        { error: 'Invalid model configuration' },
        { status: 400 }
      );
    }

    // Update model configuration
    const result = await updateModelConfiguration(config);
    
    return NextResponse.json({
      success: true,
      configurationUpdated: result.updated,
      retrainingScheduled: result.retrainingScheduled,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Model configuration update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update model configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove training data batch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID required' },
        { status: 400 }
      );
    }

    const result = await removeTrainingBatch(batchId);
    
    return NextResponse.json({
      success: true,
      removed: result.removed,
      recordsDeleted: result.recordsDeleted,
      modelRetraining: result.triggerRetraining
    });

  } catch (error) {
    logger.error('Training data deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to remove training data' },
      { status: 500 }
    );
  }
}

// Helper functions (implementations would connect to your ML infrastructure)
async function validateTrainingRecords(records: TrainingRecord[]): Promise<string[]> {
  const errors: string[] = [];
  
  records.forEach((record, index) => {
    if (!record.id) errors.push(`Record ${index}: Missing ID`);
    if (!record.userId) errors.push(`Record ${index}: Missing userId`);
    if (typeof record.isFraud !== 'boolean') errors.push(`Record ${index}: Invalid isFraud value`);
    if (!record.features) errors.push(`Record ${index}: Missing features`);
    if (record.confidenceScore < 0 || record.confidenceScore > 100) {
      errors.push(`Record ${index}: Invalid confidence score`);
    }
  });
  
  return errors;
}

async function processTrainingData(batch: TrainingDataBatch) {
  // In production, this would:
  // 1. Store training data in ML database
  // 2. Validate data quality
  // 3. Update feature statistics
  // 4. Trigger model retraining if thresholds are met
  // 5. Update model performance metrics
  
  const fraudCases = batch.records.filter(r => r.isFraud).length;
  const legitimateCases = batch.records.filter(r => !r.isFraud).length;
  
  return {
    totalRecordsProcessed: batch.records.length,
    fraudCases,
    legitimateCases,
    skippedRecords: 0,
    triggerRetraining: batch.records.length >= 1000 // Example threshold
  };
}

async function getTrainingDataStats(dataType: string | null) {
  // Mock implementation - replace with real ML database queries
  return {
    totalRecords: 50000,
    fraudCases: 2500,
    legitimateCases: 47500,
    dataQuality: 0.95,
    lastUpdated: new Date().toISOString(),
    modelAccuracy: 0.92,
    falsePositiveRate: 0.03,
    dataTypes: {
      'rider_incentive': 15000,
      'gps_spoofing': 10000,
      'multi_account': 12000,
      'payment_fraud': 8000,
      'mixed': 5000
    },
    timeRange: {
      oldest: '2024-01-01T00:00:00Z',
      newest: new Date().toISOString()
    }
  };
}

async function getModelInformation(dataType: string | null) {
  return {
    modelType: 'XGBoost',
    version: '2.1.0',
    trainedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    trainingDuration: 1200, // seconds
    accuracy: 0.924,
    precision: 0.891,
    recall: 0.856,
    f1Score: 0.873,
    auc: 0.945,
    features: 45,
    parameters: {
      max_depth: 6,
      learning_rate: 0.1,
      n_estimators: 1000,
      subsample: 0.8
    },
    status: 'active'
  };
}

async function getFeatureImportance(dataType: string | null) {
  return {
    features: [
      { name: 'promoCodesUsed', importance: 0.23, category: 'financial' },
      { name: 'crossRegionRides', importance: 0.19, category: 'geographic' },
      { name: 'ridesPerDay', importance: 0.15, category: 'behavioral' },
      { name: 'deviceChanges', importance: 0.12, category: 'device' },
      { name: 'cancelationRate', importance: 0.11, category: 'behavioral' },
      { name: 'averageRideDistance', importance: 0.08, category: 'behavioral' },
      { name: 'accountAge', importance: 0.07, category: 'user' },
      { name: 'ipAddressChanges', importance: 0.05, category: 'network' }
    ],
    categories: {
      'behavioral': 0.34,
      'financial': 0.23,
      'geographic': 0.19,
      'device': 0.12,
      'network': 0.05,
      'user': 0.07
    }
  };
}

async function getDataQualityMetrics(dataType: string | null) {
  return {
    completeness: 0.95,
    consistency: 0.92,
    accuracy: 0.94,
    timeliness: 0.98,
    uniqueness: 0.99,
    issues: [
      { type: 'missing_values', count: 234, percentage: 0.47 },
      { type: 'outliers', count: 123, percentage: 0.25 },
      { type: 'inconsistent_format', count: 67, percentage: 0.13 }
    ],
    lastQualityCheck: new Date().toISOString()
  };
}

async function updateModelConfiguration(config: any) {
  // Mock implementation
  return {
    updated: true,
    retrainingScheduled: true
  };
}

async function removeTrainingBatch(batchId: string) {
  // Mock implementation
  return {
    removed: true,
    recordsDeleted: 1000,
    triggerRetraining: true
  };
}