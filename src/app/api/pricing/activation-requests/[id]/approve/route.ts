import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { ApproveActivationRequest } from '@/lib/pricing/pricingExtensionsSchemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// POST /api/pricing/activation-requests/[id]/approve - Approve/reject activation request
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestId = parseInt(params.id);
    const body = await request.json();
    const validatedData = ApproveActivationRequest.parse(body);
    
    // Mock user ID - in production this would come from authentication
    // Allow override for testing dual approvals
    const approverId = validatedData.approverId || 'approver-789-012';
    
    const result = await new Promise<{ success: boolean; message: string; activationCompleted?: boolean }>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.serialize(() => {
        // Get activation request
        db.get('SELECT * FROM pricing_activation_requests WHERE id = ?', [requestId], (err, activationRequest) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          if (!activationRequest) {
            db.close();
            reject(new Error('Activation request not found'));
            return;
          }
          
          if (activationRequest.status !== 'pending') {
            db.close();
            resolve({ success: false, message: 'Request is no longer pending' });
            return;
          }
          
          // Check if user already approved/rejected this request
          db.get('SELECT * FROM pricing_activation_approvals WHERE request_id = ? AND approver_id = ?', 
            [requestId, approverId], (err, existingApproval) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            if (existingApproval) {
              db.close();
              resolve({ success: false, message: 'You have already provided a decision for this request' });
              return;
            }
            
            // Check if approver is the same as requestor (prevent self-approval)
            if (activationRequest.requested_by === approverId) {
              db.close();
              resolve({ success: false, message: 'Cannot approve your own activation request' });
              return;
            }
            
            db.run('BEGIN TRANSACTION');
            
            // Insert approval
            db.run(`
              INSERT INTO pricing_activation_approvals 
              (request_id, approver_id, decision, comment)
              VALUES (?, ?, ?, ?)
            `, [requestId, approverId, validatedData.decision, validatedData.comment || null], (err) => {
              if (err) {
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              
              // If rejected, update request status
              if (validatedData.decision === 'rejected') {
                db.run('UPDATE pricing_activation_requests SET status = ? WHERE id = ?', 
                  ['rejected', requestId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    db.close();
                    reject(err);
                    return;
                  }
                  
                  db.run('COMMIT');
                  db.close();
                  resolve({ success: true, message: 'Request rejected successfully' });
                });
                return;
              }
              
              // Check if we have enough approvals for activation
              db.all('SELECT * FROM pricing_activation_approvals WHERE request_id = ? AND decision = ?', 
                [requestId, 'approved'], (err, approvals) => {
                if (err) {
                  db.run('ROLLBACK');
                  db.close();
                  reject(err);
                  return;
                }
                
                if (approvals.length >= 2) {
                  // Activate the profile
                  activateProfile(db, activationRequest, (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      db.close();
                      reject(err);
                      return;
                    }
                    
                    // Update request status
                    db.run('UPDATE pricing_activation_requests SET status = ? WHERE id = ?', 
                      ['approved', requestId], (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        db.close();
                        reject(err);
                        return;
                      }
                      
                      db.run('COMMIT');
                      db.close();
                      resolve({ 
                        success: true, 
                        message: 'Profile activated successfully',
                        activationCompleted: true
                      });
                    });
                  });
                } else {
                  db.run('COMMIT');
                  db.close();
                  resolve({ 
                    success: true, 
                    message: `Approval recorded. ${2 - approvals.length} more approval(s) needed.`
                  });
                }
              });
            });
          });
        });
      });
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: error instanceof Error && error.message === 'Activation request not found' ? 404 : 500 }
    );
  }
}

function activateProfile(db: sqlite3.Database, activationRequest: any, callback: (err?: Error) => void) {
  // Update profile status to active
  db.run(`
    UPDATE pricing_profiles 
    SET status = 'active', effective_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [activationRequest.effective_at, activationRequest.profile_id], (err) => {
    if (err) {
      callback(err);
      return;
    }
    
    // If superseding another profile, retire it
    if (activationRequest.supersede_profile_id) {
      db.run(`
        UPDATE pricing_profiles 
        SET status = 'retired', updated_at = datetime('now')
        WHERE id = ?
      `, [activationRequest.supersede_profile_id], (err) => {
        if (err) {
          callback(err);
          return;
        }
        
        callback();
      });
    } else {
      callback();
    }
  });
}