import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { GetAuditLogResponse } from '@/lib/pricing/pricingExtensionsSchemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/profiles/[id]/audit - Get audit log for profile
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const auditLog = await new Promise<any[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.all(`
        SELECT 
          id, profile_id, user_id, action, old_value, new_value, 
          entity_type, entity_id, change_reason, ip_address, created_at
        FROM pricing_audit_log 
        WHERE profile_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [profileId, limit, offset], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        // Parse JSON fields and format response
        const formattedRows = rows.map(row => ({
          id: row.id,
          profileId: row.profile_id,
          userId: row.user_id,
          action: row.action,
          oldValue: row.old_value ? JSON.parse(row.old_value) : null,
          newValue: row.new_value ? JSON.parse(row.new_value) : null,
          entityType: row.entity_type,
          entityId: row.entity_id,
          changeReason: row.change_reason,
          ipAddress: row.ip_address,
          createdAt: row.created_at
        }));
        
        resolve(formattedRows);
      });
    });
    
    return NextResponse.json(auditLog);
    
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audit log' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/profiles/[id]/audit - Add audit log entry (internal use)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    
    // This endpoint would typically be called internally by other services
    // For security, you might want to restrict access or require special authentication
    
    const { action, oldValue, newValue, entityType, entityId, changeReason, userId, ipAddress, userAgent } = body;
    
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(`
        INSERT INTO pricing_audit_log 
        (profile_id, user_id, action, old_value, new_value, entity_type, entity_id, change_reason, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        profileId,
        userId,
        action,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        entityType,
        entityId,
        changeReason,
        ipAddress,
        userAgent
      ], (err) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
    
    return NextResponse.json({ message: 'Audit log entry created' });
    
  } catch (error) {
    console.error('Audit log creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log entry' },
      { status: 500 }
    );
  }
}