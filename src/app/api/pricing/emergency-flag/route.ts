import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { SetEmergencyFlagRequest, EmergencyFlagDTO } from '@/lib/pricing/pricingExtensionsSchemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/emergency-flag - Get current emergency flag status
export async function GET() {
  try {
    const emergencyFlag = await new Promise<EmergencyFlagDTO | null>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.get('SELECT * FROM pricing_emergency_flags ORDER BY set_at DESC LIMIT 1', (err, row) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve({
          id: row.id,
          active: Boolean(row.active),
          reason: row.reason,
          setBy: row.set_by,
          setAt: row.set_at
        });
      });
    });
    
    return NextResponse.json(emergencyFlag || { active: false });
    
  } catch (error) {
    console.error('Emergency flag get error:', error);
    return NextResponse.json(
      { error: 'Failed to get emergency flag status' },
      { status: 500 }
    );
  }
}

// PATCH /api/pricing/emergency-flag - Set/clear emergency flag
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SetEmergencyFlagRequest.parse(body);
    
    // Mock user ID - in production this would come from authentication
    // Only executives/admins should be able to set emergency flags
    const userId = 'exec-admin-123';
    
    const result = await new Promise<{ success: boolean; message: string }>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.serialize(() => {
        // Clear any existing active flags
        db.run('UPDATE pricing_emergency_flags SET active = 0, cleared_by = ?, cleared_at = datetime("now") WHERE active = 1', 
          [userId], (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // If setting flag to active, create new record
          if (validatedData.active) {
            db.run(`
              INSERT INTO pricing_emergency_flags 
              (active, reason, severity_level, set_by, set_at)
              VALUES (1, ?, 'medium', ?, datetime('now'))
            `, [validatedData.reason || 'Emergency brake activated', userId], (err) => {
              db.close();
              
              if (err) {
                reject(err);
                return;
              }
              
              resolve({
                success: true,
                message: 'Emergency brake activated - all pricing activations are now blocked'
              });
            });
          } else {
            db.close();
            resolve({
              success: true,
              message: 'Emergency brake cleared - pricing activations are now allowed'
            });
          }
        });
      });
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Emergency flag set error:', error);
    return NextResponse.json(
      { error: 'Failed to update emergency flag' },
      { status: 500 }
    );
  }
}