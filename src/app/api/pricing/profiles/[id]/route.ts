import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { GetProfileResponse, PatchProfileRequest } from '@/lib/pricing/schemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/profiles/[id] - Get complete profile with components, earnings, links
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    
    const profileBundle = await new Promise<any>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Get profile
      db.get('SELECT * FROM pricing_profiles WHERE id = ?', [profileId], (err, profile) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        if (!profile) {
          db.close();
          reject(new Error('Profile not found'));
          return;
        }
        
        // Get components
        db.all('SELECT key, value_numeric, unit, description, publish, sort_order FROM pricing_components WHERE profile_id = ? ORDER BY sort_order', 
          [profileId], (err, components) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // Get earnings policy
          db.get('SELECT driver_comp_model, fare_recipient, revenue_split FROM pricing_earnings_policies WHERE profile_id = ?', 
            [profileId], (err, earningsPolicy) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            // Get profile links
            db.all('SELECT link_type, linked_profile_id FROM pricing_profile_links WHERE profile_id = ?', 
              [profileId], (err, links) => {
              db.close();
              
              if (err) {
                reject(err);
                return;
              }
              
              // Process the data
              const linkedProfiles = {
                surge: links?.filter(l => l.link_type === 'surge').map(l => l.linked_profile_id) || [],
                surcharges: links?.filter(l => l.link_type === 'surcharge').map(l => l.linked_profile_id) || [],
                tolls: links?.filter(l => l.link_type === 'toll').map(l => l.linked_profile_id) || [],
                special: links?.filter(l => l.link_type === 'special').map(l => l.linked_profile_id) || [],
                pop: links?.filter(l => l.link_type === 'pop').map(l => l.linked_profile_id) || [],
              };
              
              const processedEarnings = earningsPolicy ? {
                driver_comp_model: earningsPolicy.driver_comp_model,
                fare_recipient: earningsPolicy.fare_recipient,
                revenue_split: JSON.parse(earningsPolicy.revenue_split || '{}')
              } : null;
              
              const processedComponents = (components || []).map(c => ({
                key: c.key,
                value_numeric: c.value_numeric,
                unit: c.unit,
                description: c.description,
                publish: Boolean(c.publish),
                sort_order: c.sort_order
              }));
              
              resolve({
                profile: {
                  id: profile.id,
                  region_id: profile.region_id,
                  service_key: profile.service_key,
                  vehicle_type: profile.vehicle_type,
                  name: profile.name,
                  status: profile.status,
                  transparency_mode: profile.transparency_mode || 'summary_only',
                  booking_fee: profile.booking_fee || 69,
                  effective_at: profile.effective_at,
                  notes: profile.notes
                },
                components: processedComponents,
                linkedProfiles,
                earningsPolicy: processedEarnings,
                permissions: {
                  role: 'pricing_editor', // TODO: Get from auth/RBAC
                  canSeeSecretSauce: false // TODO: Check actual permissions
                }
              });
            });
          });
        });
      });
    });
    
    return NextResponse.json(profileBundle);
    
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get profile' },
      { status: error instanceof Error && error.message === 'Profile not found' ? 404 : 500 }
    );
  }
}

// PATCH /api/pricing/profiles/[id] - Update profile metadata (transparency mode, status, notes)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = PatchProfileRequest.parse(body);
    
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      
      if (validatedData.transparency_mode) {
        updates.push('transparency_mode = ?');
        values.push(validatedData.transparency_mode);
      }
      
      if (validatedData.status) {
        updates.push('status = ?');
        values.push(validatedData.status);
      }
      
      if (validatedData.notes !== undefined) {
        updates.push('notes = ?');
        values.push(validatedData.notes);
      }
      
      if (validatedData.effective_at) {
        updates.push('effective_at = ?');
        values.push(validatedData.effective_at);
      }
      
      updates.push('updated_at = datetime("now")');
      values.push(profileId);
      
      const query = `UPDATE pricing_profiles SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    return NextResponse.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Patch profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}