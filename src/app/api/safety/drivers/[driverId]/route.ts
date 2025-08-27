// Driver Safety Profile API Routes
// GET /api/safety/drivers/[driverId] - Get driver safety profile
// PATCH /api/safety/drivers/[driverId] - Update driver safety profile

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { driverSafetyMonitoring, DriverSafetyProfile } from '@/lib/driverSafetyMonitoring';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import Joi from 'joi';

// Validation schemas
const UpdateSafetyProfileSchema = Joi.object({
  action: Joi.string().valid(
    'recalculate_score',
    'update_compliance',
    'add_training',
    'update_risk_level',
    'add_recommendation',
    'mark_recommendation_complete'
  ).required(),
  complianceStatus: Joi.string().valid('compliant', 'non_compliant', 'pending_review', 'overdue')
    .when('action', { is: 'update_compliance', then: Joi.required() }),
  training: Joi.object({
    type: Joi.string().required(),
    completedAt: Joi.date().required(),
    certificationNumber: Joi.string().optional()
  }).when('action', { is: 'add_training', then: Joi.required() }),
  riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical')
    .when('action', { is: 'update_risk_level', then: Joi.required() }),
  riskFactors: Joi.array().items(Joi.string())
    .when('action', { is: 'update_risk_level', then: Joi.required() }),
  recommendation: Joi.object({
    type: Joi.string().valid(
      'safety_training', 'vehicle_inspection', 'route_restriction',
      'time_restriction', 'supervision_increase', 'counseling_session',
      'equipment_upgrade', 'medical_evaluation'
    ).required(),
    priority: Joi.string().valid('high', 'medium', 'low').required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    dueDate: Joi.date().optional()
  }).when('action', { is: 'add_recommendation', then: Joi.required() }),
  recommendationId: Joi.string()
    .when('action', { is: 'mark_recommendation_complete', then: Joi.required() }),
  reason: Joi.string().optional(),
  notes: Joi.string().optional()
});

// GET /api/safety/drivers/[driverId] - Get driver safety profile
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { driverId: string } }) => {
      const { driverId } = params;
      const url = new URL(req.url);
      const forceRecalculate = url.searchParams.get('recalculate') === 'true';
      const includeHistory = url.searchParams.get('include_history') === 'true';
      
      // Validate UUID format
      if (!driverId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_DRIVER_ID', {
          field: 'driverId',
          value: driverId
        });
      }
      
      // Verify driver exists and check regional access
      const driverResult = await db.query(
        'SELECT id, region_id, first_name, last_name, status FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driverResult.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          field: 'driverId',
          value: driverId
        });
      }
      
      const driver = driverResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== driver.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            driverRegion: driver.region_id
          }
        });
      }
      
      try {
        // Get safety profile
        const safetyProfile = await driverSafetyMonitoring.getDriverSafetyProfile(driverId, forceRecalculate);
        
        let responseData: any = {
          ...safetyProfile,
          driverInfo: {
            id: driver.id,
            name: `${driver.first_name} ${driver.last_name}`,
            status: driver.status,
            regionId: driver.region_id
          }
        };
        
        // Include historical data if requested
        if (includeHistory) {
          const historyResult = await db.query(`
            SELECT 
              profile_date,
              overall_safety_score,
              risk_level,
              total_sos_incidents,
              recent_incidents
            FROM driver_safety_profiles
            WHERE driver_id = $1
            ORDER BY profile_date DESC
            LIMIT 30
          `, [driverId]);
          
          responseData.scoreHistory = historyResult.rows;
          
          // Get recent safety alerts
          const alertsResult = await db.query(`
            SELECT 
              id,
              alert_code,
              alert_type,
              severity,
              title,
              status,
              triggered_at,
              resolved_at
            FROM safety_alerts
            WHERE driver_id = $1
            ORDER BY triggered_at DESC
            LIMIT 10
          `, [driverId]);
          
          responseData.recentAlerts = alertsResult.rows;
        }
        
        // Calculate additional insights
        const insights = {
          scoreTrajectory: this.calculateScoreTrajectory(safetyProfile),
          riskTrend: this.calculateRiskTrend(safetyProfile),
          complianceHealth: this.calculateComplianceHealth(safetyProfile),
          recommendationPriority: this.prioritizeRecommendations(safetyProfile.recommendedActions),
          nextActions: this.getNextActions(safetyProfile)
        };
        
        responseData.insights = insights;
        
        return formatSuccessResponse(
          responseData,
          'Driver safety profile retrieved successfully',
          {
            profileAge: Date.now() - safetyProfile.profileDate.getTime(),
            riskLevel: safetyProfile.riskLevel,
            safetyScore: safetyProfile.overallSafetyScore,
            complianceStatus: safetyProfile.complianceStatus,
            forceRecalculated: forceRecalculate
          }
        );
        
      } catch (error) {
        console.error(`Failed to get safety profile for driver ${driverId}:`, error);
        throw ErrorFactory.create('SAFETY_PROFILE_RETRIEVAL_FAILED', {
          field: 'driverId',
          value: driverId,
          debugInfo: { error: error.message }
        });
      }
    },
    ['safety:driver:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// PATCH /api/safety/drivers/[driverId] - Update driver safety profile
export const PATCH = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { driverId: string } }) => {
      const { driverId } = params;
      const body = await req.json();
      const updateData = Joi.attempt(body, UpdateSafetyProfileSchema);
      
      // Validate UUID format
      if (!driverId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_DRIVER_ID', {
          field: 'driverId',
          value: driverId
        });
      }
      
      // Verify driver exists and check regional access
      const driverResult = await db.query(
        'SELECT id, region_id FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driverResult.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          field: 'driverId',
          value: driverId
        });
      }
      
      const driver = driverResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== driver.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            driverRegion: driver.region_id
          }
        });
      }
      
      try {
        let updateResult: any = {};
        
        switch (updateData.action) {
          case 'recalculate_score':
            // Force recalculation of safety profile
            const newProfile = await driverSafetyMonitoring.getDriverSafetyProfile(driverId, true);
            updateResult = {
              action: 'recalculated',
              newSafetyScore: newProfile.overallSafetyScore,
              riskLevel: newProfile.riskLevel,
              scoreChange: newProfile.scoreChange
            };
            
            // Log recalculation
            await redis.publish('metrics:safety_profile_recalculated', {
              driverId,
              userId: user.userId,
              newScore: newProfile.overallSafetyScore,
              riskLevel: newProfile.riskLevel,
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'update_compliance':
            // Update compliance status
            await db.query(`
              UPDATE driver_safety_profiles SET
                compliance_status = $1,
                updated_at = NOW()
              WHERE driver_id = $2 AND profile_date = (
                SELECT MAX(profile_date) FROM driver_safety_profiles WHERE driver_id = $2
              )
            `, [updateData.complianceStatus, driverId]);
            
            updateResult = {
              action: 'compliance_updated',
              newStatus: updateData.complianceStatus
            };
            break;
            
          case 'add_training':
            // Add completed training
            const existingCertifications = await db.query(
              'SELECT certifications FROM drivers WHERE id = $1',
              [driverId]
            );
            
            const certifications = JSON.parse(existingCertifications.rows[0].certifications || '[]');
            certifications.push({
              type: updateData.training.type,
              completedAt: updateData.training.completedAt,
              certificationNumber: updateData.training.certificationNumber,
              addedBy: user.userId
            });
            
            await db.query(
              'UPDATE drivers SET certifications = $1, updated_at = NOW() WHERE id = $2',
              [JSON.stringify(certifications), driverId]
            );
            
            // Update last training date in safety profile
            await db.query(`
              UPDATE driver_safety_profiles SET
                last_safety_training = $1,
                safety_training_completed = $2,
                updated_at = NOW()
              WHERE driver_id = $3 AND profile_date = (
                SELECT MAX(profile_date) FROM driver_safety_profiles WHERE driver_id = $3
              )
            `, [
              updateData.training.completedAt,
              JSON.stringify(certifications.map((c: any) => c.type)),
              driverId
            ]);
            
            updateResult = {
              action: 'training_added',
              trainingType: updateData.training.type,
              completedAt: updateData.training.completedAt
            };
            break;
            
          case 'update_risk_level':
            // Manually update risk level (admin override)
            await db.query(`
              UPDATE driver_safety_profiles SET
                risk_level = $1,
                risk_factors = $2,
                updated_at = NOW()
              WHERE driver_id = $3 AND profile_date = (
                SELECT MAX(profile_date) FROM driver_safety_profiles WHERE driver_id = $3
              )
            `, [updateData.riskLevel, JSON.stringify(updateData.riskFactors), driverId]);
            
            // Log manual override
            await db.query(`
              INSERT INTO safety_profile_overrides (
                driver_id, field_name, old_value, new_value, reason, overridden_by, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
              driverId,
              'risk_level',
              'system_calculated',
              updateData.riskLevel,
              updateData.reason || 'Manual override',
              user.userId
            ]);
            
            updateResult = {
              action: 'risk_level_updated',
              newRiskLevel: updateData.riskLevel,
              riskFactors: updateData.riskFactors
            };
            break;
            
          case 'add_recommendation':
            // Add custom safety recommendation
            const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
            await db.query(`
              INSERT INTO safety_recommendations (
                id, driver_id, type, priority, title, description, due_date,
                status, created_by, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [
              recommendationId,
              driverId,
              updateData.recommendation.type,
              updateData.recommendation.priority,
              updateData.recommendation.title,
              updateData.recommendation.description,
              updateData.recommendation.dueDate,
              'pending',
              user.userId
            ]);
            
            updateResult = {
              action: 'recommendation_added',
              recommendationId,
              type: updateData.recommendation.type,
              priority: updateData.recommendation.priority
            };
            break;
            
          case 'mark_recommendation_complete':
            // Mark recommendation as completed
            await db.query(`
              UPDATE safety_recommendations SET
                status = 'completed',
                completed_at = NOW(),
                completed_by = $1,
                completion_notes = $2
              WHERE id = $3 AND driver_id = $4
            `, [user.userId, updateData.notes, updateData.recommendationId, driverId]);
            
            updateResult = {
              action: 'recommendation_completed',
              recommendationId: updateData.recommendationId
            };
            break;
            
          default:
            throw ErrorFactory.create('INVALID_ACTION', {
              field: 'action',
              value: updateData.action
            });
        }
        
        // If we modified the profile significantly, trigger recalculation
        if (['update_compliance', 'add_training', 'update_risk_level'].includes(updateData.action)) {
          setTimeout(async () => {
            try {
              await driverSafetyMonitoring.getDriverSafetyProfile(driverId, true);
            } catch (error) {
              console.warn(`Failed to recalculate safety profile after update for driver ${driverId}:`, error);
            }
          }, 5000); // Recalculate after 5 seconds
        }
        
        // Invalidate caches
        await Promise.all([
          redis.invalidateCacheByTag('safety'),
          redis.invalidateCacheByTag(`driver:${driverId}`),
          redis.invalidateCacheByTag(`region:${driver.region_id}`)
        ]);
        
        return formatSuccessResponse(
          updateResult,
          `Driver safety profile ${updateData.action} completed successfully`,
          {
            action: updateData.action,
            driverId,
            updatedBy: user.userId,
            willRecalculate: ['update_compliance', 'add_training', 'update_risk_level'].includes(updateData.action)
          }
        );
        
      } catch (error) {
        console.error(`Failed to update safety profile for driver ${driverId}:`, error);
        throw ErrorFactory.create('SAFETY_PROFILE_UPDATE_FAILED', {
          field: 'driverId',
          value: driverId,
          debugInfo: { action: updateData.action, error: error.message }
        });
      }
    },
    ['safety:driver:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// Helper functions for insights calculation
function calculateScoreTrajectory(profile: DriverSafetyProfile): string {
  if (profile.scoreChange > 5) return 'improving';
  if (profile.scoreChange < -5) return 'declining';
  return 'stable';
}

function calculateRiskTrend(profile: DriverSafetyProfile): string {
  const recentIncidentRate = profile.recentIncidents / 30; // per day
  const recentFalseAlarmRate = profile.recentFalseAlarms / Math.max(1, profile.recentIncidents);
  
  if (recentIncidentRate > 0.2 || recentFalseAlarmRate > 0.4) return 'increasing';
  if (recentIncidentRate < 0.1 && recentFalseAlarmRate < 0.2) return 'decreasing';
  return 'stable';
}

function calculateComplianceHealth(profile: DriverSafetyProfile): string {
  const trainingCount = profile.safetyTrainingCompleted.length;
  const isCompliant = profile.complianceStatus === 'compliant';
  
  if (isCompliant && trainingCount >= 3) return 'excellent';
  if (isCompliant) return 'good';
  if (profile.complianceStatus === 'pending_review') return 'needs_attention';
  return 'poor';
}

function prioritizeRecommendations(recommendations: any[]): string {
  const highPriority = recommendations.filter(r => r.priority === 'high' && r.status === 'pending').length;
  
  if (highPriority > 2) return 'urgent';
  if (highPriority > 0) return 'high';
  return 'normal';
}

function getNextActions(profile: DriverSafetyProfile): string[] {
  const actions = [];
  
  if (profile.riskLevel === 'critical' || profile.riskLevel === 'high') {
    actions.push('Immediate safety review required');
  }
  
  if (profile.complianceStatus !== 'compliant') {
    actions.push('Complete outstanding compliance requirements');
  }
  
  if (profile.recentIncidents > 3) {
    actions.push('Investigate recent incident pattern');
  }
  
  const pendingRecommendations = profile.recommendedActions.filter(r => r.status === 'pending').length;
  if (pendingRecommendations > 0) {
    actions.push(`Complete ${pendingRecommendations} pending safety recommendations`);
  }
  
  if (actions.length === 0) {
    actions.push('Monitor safety performance');
  }
  
  return actions;
}