import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { ActivateProfileRequest, ActivateProfileResponse } from '@/lib/pricing/pricingExtensionsSchemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// POST /api/pricing/profiles/[id]/activate - Create activation request
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = ActivateProfileRequest.parse(body);
    
    // Mock user ID - in production this would come from authentication
    const userId = 'user-123-456';
    
    const result = await new Promise<ActivateProfileResponse>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.serialize(() => {
        // Check for emergency brake
        db.get('SELECT active FROM pricing_emergency_flags WHERE active = 1 LIMIT 1', (err, emergencyFlag) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          if (emergencyFlag) {
            db.close();
            resolve({
              requestId: 0,
              status: 'pending',
              needsApprovals: 2,
              emergencyBlocked: true
            });
            return;
          }
          
          // Get current profile state
          db.get('SELECT * FROM pricing_profiles WHERE id = ?', [profileId], (err, currentProfile) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            if (!currentProfile) {
              db.close();
              reject(new Error('Profile not found'));
              return;
            }
            
            // Get current components
            db.all('SELECT * FROM pricing_components WHERE profile_id = ?', [profileId], (err, currentComponents) => {
              if (err) {
                db.close();
                reject(err);
                return;
              }
              
              // Get current earnings policy
              db.get('SELECT * FROM pricing_earnings_policies WHERE profile_id = ?', [profileId], (err, currentEarnings) => {
                if (err) {
                  db.close();
                  reject(err);
                  return;
                }
                
                // Create diff payload (old → new values)
                const diff = {
                  profile: {
                    old: { status: currentProfile.status },
                    new: { status: 'active', effective_at: validatedData.effectiveAt }
                  },
                  components: currentComponents?.map(c => ({
                    key: c.key,
                    old: { value_numeric: c.value_numeric, publish: Boolean(c.publish) },
                    new: { value_numeric: c.value_numeric, publish: Boolean(c.publish) } // No changes to components in activation
                  })) || [],
                  earnings: currentEarnings ? {
                    old: { 
                      driver_comp_model: currentEarnings.driver_comp_model,
                      revenue_split: JSON.parse(currentEarnings.revenue_split || '{}')
                    },
                    new: { 
                      driver_comp_model: currentEarnings.driver_comp_model,
                      revenue_split: JSON.parse(currentEarnings.revenue_split || '{}')
                    }
                  } : null
                };
                
                // Create activation request
                db.run(`
                  INSERT INTO pricing_activation_requests 
                  (profile_id, requested_by, diff, status, effective_at, supersede_profile_id, comment, emergency_blocked)
                  VALUES (?, ?, ?, 'pending', ?, ?, ?, 0)
                `, [
                  profileId,
                  userId,
                  JSON.stringify(diff),
                  validatedData.effectiveAt,
                  validatedData.supersedeProfileId || null,
                  validatedData.comment || null
                ], function(err) {
                  db.close();
                  
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  resolve({
                    requestId: this.lastID,
                    status: 'pending',
                    needsApprovals: 2,
                    emergencyBlocked: false
                  });
                });
              });
            });
          });
        });
      });
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Activation request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create activation request' },
      { status: error instanceof Error && error.message === 'Profile not found' ? 404 : 500 }
    );
  }
}