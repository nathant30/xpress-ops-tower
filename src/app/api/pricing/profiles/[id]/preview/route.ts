import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { PreviewRequest, PreviewResponse, FareLine } from '@/lib/pricing/schemas';
import { SurgeLookupRequest } from '@/lib/pricing/surgeSchemas';
import { latLngToCell } from 'h3-js';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// POST /api/pricing/profiles/[id]/preview - Compute fare breakdown
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = PreviewRequest.parse(body);
    
    const fareBreakdown = await new Promise<PreviewResponse>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Get profile and components
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
        db.all('SELECT * FROM pricing_components WHERE profile_id = ? ORDER BY sort_order', 
          [profileId], (err, components) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // Get earnings policy
          db.get('SELECT * FROM pricing_earnings_policies WHERE profile_id = ?', 
            [profileId], async (err, earningsPolicy) => {
            db.close();
            
            if (err) {
              reject(err);
              return;
            }
            
            // Compute fare breakdown
            const breakdown = await computeFareBreakdown(
              profile, 
              components || [], 
              earningsPolicy,
              validatedData
            );
            
            resolve(breakdown);
          });
        });
      });
    });
    
    return NextResponse.json(fareBreakdown);
    
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute preview' },
      { status: error instanceof Error && error.message === 'Profile not found' ? 404 : 500 }
    );
  }
}

async function computeFareBreakdown(
  profile: any, 
  components: any[], 
  earningsPolicy: any,
  previewData: PreviewRequest
): Promise<PreviewResponse> {
  // Simple distance/time calculation (mock implementation)
  const distance = calculateDistance(previewData.origin, previewData.destination); // km
  const estimatedTime = Math.max(distance * 3, 10); // minutes, rough estimate
  
  const breakdown: FareLine[] = [];
  let total = 0;
  
  // Process each component
  components.forEach(component => {
    let amount = 0;
    let meta = '';
    
    switch (component.key) {
      case 'base_fare':
      case 'flagdown':
      case 'flat_fare':
        amount = component.value_numeric || 0;
        break;
        
      case 'included_km':
        // This is informational, doesn't add to fare
        amount = 0;
        meta = `${component.value_numeric} km included`;
        break;
        
      case 'per_km':
        const billableDistance = Math.max(0, distance - (getIncludedKm(components) || 0));
        amount = (component.value_numeric || 0) * billableDistance;
        meta = `${billableDistance.toFixed(1)} km @ ₱${component.value_numeric}/km`;
        break;
        
      case 'per_min':
        amount = (component.value_numeric || 0) * estimatedTime;
        meta = `${estimatedTime.toFixed(0)} min @ ₱${component.value_numeric}/min`;
        break;
        
      case 'booking_fee':
      case 'airport_surcharge':
        amount = component.value_numeric || 0;
        break;
    }
    
    // Apply publish filter for rider view
    const shouldShow = previewData.perspective === 'driver' || 
                      (previewData.riderView === 'detailed_breakdown' && component.publish) ||
                      (previewData.riderView === 'summary_only' && ['base_fare', 'booking_fee', 'flat_fare'].includes(component.key));
    
    if (shouldShow && (amount > 0 || component.key === 'included_km')) {
      breakdown.push({
        label: formatComponentLabel(component.key),
        amount: amount,
        meta: meta || undefined,
        publish: Boolean(component.publish),
        ruleId: component.id // Add component ID for traceability
      });
      
      total += amount;
    }
  });
  
  // Add surge pricing via lookup API
  try {
    const originH3 = latLngToCell(previewData.origin.lat, previewData.origin.lon, 8);
    const surgeResult = await lookupSurgeMultiplier(
      profile.service_key,
      originH3,
      previewData.timestamp
    );
    
    if (surgeResult && surgeResult.multiplier > 1.0) {
      const surgeAmount = total * (surgeResult.multiplier - 1);
      const additiveFee = surgeResult.additiveFee || 0;
      
      breakdown.push({
        label: 'Surge',
        amount: surgeAmount + additiveFee,
        meta: surgeResult.additiveFee > 0 
          ? `${surgeResult.multiplier}x + ₱${surgeResult.additiveFee}`
          : `${surgeResult.multiplier}x ${surgeResult.source}`,
        publish: true,
        ruleId: surgeResult.ruleId
      });
      total += surgeAmount + additiveFee;
    }
  } catch (error) {
    console.error('Surge lookup error in preview:', error);
    // Continue without surge if lookup fails
  }
  
  // Calculate earnings split
  let driverEarnings = 0;
  let companyTake = 0;
  const notes: string[] = [];
  
  if (earningsPolicy) {
    const revenueSplit = JSON.parse(earningsPolicy.revenue_split || '{}');
    const driverPct = revenueSplit.driver_pct || 0;
    const xpressPct = revenueSplit.xpress_pct || 0;
    
    const bookingFeeAmount = components.find(c => c.key === 'booking_fee')?.value_numeric || 0;
    const fareExcludingBookingFee = total - bookingFeeAmount;
    
    driverEarnings = fareExcludingBookingFee * driverPct;
    companyTake = fareExcludingBookingFee * xpressPct + bookingFeeAmount;
    
    if (revenueSplit.booking_fee_to === 'xpress') {
      notes.push('Booking fee goes to Xpress');
    }
    
    if (revenueSplit.tolls_to === 'driver_reimbursed') {
      notes.push('Tolls reimbursed to driver');
    }
  }
  
  return {
    breakdown,
    total,
    driverEarnings,
    companyTake,
    notes
  };
}

function calculateDistance(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }): number {
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in kilometers
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLon = (destination.lon - origin.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getIncludedKm(components: any[]): number {
  const includedKmComponent = components.find(c => c.key === 'included_km');
  return includedKmComponent?.value_numeric || 0;
}

function formatComponentLabel(key: string): string {
  const labels: Record<string, string> = {
    'base_fare': 'Base Fare',
    'included_km': 'Included Distance',
    'per_km': 'Distance',
    'per_min': 'Time',
    'booking_fee': 'Booking Fee',
    'flagdown': 'Flagdown',
    'flat_fare': 'Flat Fare',
    'airport_surcharge': 'Airport Surcharge'
  };
  return labels[key] || key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function lookupSurgeMultiplier(
  serviceKey: string,
  originH3: string,
  timestamp: string
) {
  try {
    const surgeLookupRequest: SurgeLookupRequest = {
      serviceKey: serviceKey as any,
      originH3,
      timestamp
    };

    // Make internal API call to surge lookup
    const response = await fetch(`http://localhost:${process.env.PORT || 4002}/api/surge/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(surgeLookupRequest)
    });

    if (!response.ok) {
      throw new Error(`Surge lookup failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling surge lookup API:', error);
    return null;
  }
}