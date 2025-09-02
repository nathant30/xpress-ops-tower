import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { SetEarningsPolicyRequest } from '@/lib/pricing/schemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// PUT /api/pricing/profiles/[id]/earnings-policy - Set earnings policy
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = SetEarningsPolicyRequest.parse(body);
    
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(`
        INSERT OR REPLACE INTO pricing_earnings_policies 
        (profile_id, driver_comp_model, fare_recipient, revenue_split, updated_at) 
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [
        profileId,
        validatedData.driver_comp_model,
        validatedData.fare_recipient,
        JSON.stringify(validatedData.revenue_split)
      ], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    return NextResponse.json({ message: 'Earnings policy updated successfully' });
    
  } catch (error) {
    console.error('Set earnings policy error:', error);
    return NextResponse.json(
      { error: 'Failed to update earnings policy' },
      { status: 500 }
    );
  }
}