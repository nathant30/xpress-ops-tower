import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingPreviewRequest,
  PricingPreviewResponse,
  FareLine
} from '@/lib/pricing/pricingV4Schemas';
import { SurgeLookupRequest } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { latLngToCell } from 'h3-js';

// POST /api/v1/pricing/profiles/[id]/preview - Integrated pricing + surge preview
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    const previewRequest = PricingPreviewRequest.parse(body);
    
    const db = getDatabase();
    
    // Get pricing profile
    const profile = await db.get(`
      SELECT * FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate base fare breakdown
    const fareBreakdown = await calculateFareBreakdown(
      profile,
      previewRequest
    );

    // Get surge multiplier from existing surge system
    const surgeData = await getSurgeMultiplier(
      profile.service_key,
      previewRequest.origin,
      previewRequest.timestamp
    );

    // Apply surge to base fare
    let totalFare = fareBreakdown.baseFare;
    
    if (surgeData && surgeData.multiplier > 1.0) {
      const surgeAmount = fareBreakdown.baseFare * (surgeData.multiplier - 1.0);
      const surgeAdditive = surgeData.additiveFee || 0;
      
      fareBreakdown.fareLines.push({
        label: 'Surge Pricing',
        amount: surgeAmount + surgeAdditive,
        meta: surgeData.additiveFee > 0 
          ? `${surgeData.multiplier}x + ₱${surgeData.additiveFee}`
          : `${surgeData.multiplier}x ${surgeData.source}`,
        publish: true,
        ruleId: surgeData.ruleId
      });
      
      totalFare += surgeAmount + surgeAdditive;
    }

    // Calculate earnings split
    const earningsSplit = calculateEarningsSplit(
      profile,
      totalFare,
      fareBreakdown.bookingFee
    );

    // Calculate ROI delta if this is a proposal preview
    const roiDelta = await calculateROIDelta(profile, previewRequest);

    const response: PricingPreviewResponse = {
      breakdown: fareBreakdown.fareLines,
      total: totalFare,
      driverEarnings: earningsSplit.driver,
      companyTake: earningsSplit.company,
      notes: generatePreviewNotes(profile, surgeData, earningsSplit),
      roiDeltaPct: roiDelta
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating pricing preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate pricing preview' },
      { status: 500 }
    );
  }
}

// Calculate base fare breakdown without surge
async function calculateFareBreakdown(
  profile: any,
  previewRequest: PricingPreviewRequest
) {
  const fareLines: FareLine[] = [];
  const distance = calculateDistance(previewRequest.origin, previewRequest.destination);
  const estimatedTime = Math.max(distance * 3, 10); // Rough time estimate

  let baseFare = 0;
  let bookingFee = 0;

  // Base fare component
  if (profile.base_fare) {
    fareLines.push({
      label: 'Base Fare',
      amount: profile.base_fare,
      meta: 'Initial charge',
      publish: true
    });
    baseFare += profile.base_fare;
  }

  // Distance component
  if (profile.per_km) {
    const includedKm = profile.base_included_km || 0;
    const billableDistance = Math.max(0, distance - includedKm);
    const distanceAmount = profile.per_km * billableDistance;
    
    if (includedKm > 0) {
      fareLines.push({
        label: 'Included Distance',
        amount: 0,
        meta: `${includedKm} km included`,
        publish: true
      });
    }
    
    if (billableDistance > 0) {
      fareLines.push({
        label: 'Distance',
        amount: distanceAmount,
        meta: `${billableDistance.toFixed(1)} km @ ₱${profile.per_km}/km`,
        publish: true
      });
      baseFare += distanceAmount;
    }
  }

  // Time component
  if (profile.per_minute) {
    const timeAmount = profile.per_minute * estimatedTime;
    fareLines.push({
      label: 'Time',
      amount: timeAmount,
      meta: `${estimatedTime.toFixed(0)} min @ ₱${profile.per_minute}/min`,
      publish: true
    });
    baseFare += timeAmount;
  }

  // Booking fee
  if (profile.booking_fee) {
    fareLines.push({
      label: 'Booking Fee',
      amount: profile.booking_fee,
      meta: 'Platform fee',
      publish: previewRequest.riderView === 'detailed_breakdown'
    });
    bookingFee = profile.booking_fee;
    baseFare += profile.booking_fee;
  }

  // Airport surcharge
  if (profile.airport_surcharge && isAirportTrip(previewRequest.origin, previewRequest.destination)) {
    fareLines.push({
      label: 'Airport Surcharge',
      amount: profile.airport_surcharge,
      meta: 'Airport pickup/dropoff fee',
      publish: true
    });
    baseFare += profile.airport_surcharge;
  }

  // POI surcharge
  if (profile.poi_surcharge && isPOITrip(previewRequest.origin, previewRequest.destination)) {
    fareLines.push({
      label: 'Special Location Fee',
      amount: profile.poi_surcharge,
      meta: 'Point of interest surcharge',
      publish: true
    });
    baseFare += profile.poi_surcharge;
  }

  return {
    fareLines,
    baseFare,
    bookingFee
  };
}

// Get surge multiplier from existing surge system
async function getSurgeMultiplier(
  serviceKey: string,
  origin: { lat: number; lon: number },
  timestamp: string
) {
  try {
    // Convert to H3 for surge lookup
    const originH3 = latLngToCell(origin.lat, origin.lon, 8);
    
    const surgeLookupRequest: SurgeLookupRequest = {
      serviceKey: serviceKey as any,
      originH3,
      timestamp
    };

    // Call internal surge lookup API
    const response = await fetch(`http://localhost:${process.env.PORT || 4002}/api/surge/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(surgeLookupRequest)
    });

    if (!response.ok) {
      console.warn(`Surge lookup failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Error calling surge lookup:', error);
    return null;
  }
}

// Calculate earnings split based on profile configuration
function calculateEarningsSplit(
  profile: any,
  totalFare: number,
  bookingFee: number
) {
  let driverEarnings = 0;
  let companyTake = 0;

  switch (profile.earnings_routing) {
    case 'driver':
      // Driver gets percentage of fare minus booking fee
      const fareMinusBooking = totalFare - bookingFee;
      driverEarnings = fareMinusBooking * (profile.driver_commission_pct || 0.8);
      companyTake = fareMinusBooking * (1 - (profile.driver_commission_pct || 0.8)) + bookingFee;
      break;
      
    case 'fleet':
      // Fleet operator gets majority, driver gets salary
      driverEarnings = totalFare * (profile.driver_commission_pct || 0.3);
      companyTake = totalFare * (1 - (profile.driver_commission_pct || 0.3));
      break;
      
    case 'xpress':
      // Xpress takes all, driver is salaried
      driverEarnings = 0; // Salaried elsewhere
      companyTake = totalFare;
      break;
      
    default:
      // Default to driver model
      driverEarnings = totalFare * 0.8;
      companyTake = totalFare * 0.2;
  }

  return {
    driver: Math.round(driverEarnings * 100) / 100,
    company: Math.round(companyTake * 100) / 100
  };
}

// Calculate ROI impact delta (mock implementation)
async function calculateROIDelta(
  profile: any,
  previewRequest: PricingPreviewRequest
): Promise<number | undefined> {
  // This would integrate with forecasting models
  // For now, return undefined to indicate no comparison data
  return undefined;
}

// Generate preview notes
function generatePreviewNotes(
  profile: any,
  surgeData: any,
  earningsSplit: any
): string[] {
  const notes: string[] = [];

  // Service type note
  notes.push(`${profile.service_key.toUpperCase()} service pricing`);

  // Surge note
  if (surgeData && surgeData.multiplier > 1.0) {
    notes.push(`Surge pricing active (${surgeData.source} source)`);
  }

  // Earnings note
  switch (profile.earnings_routing) {
    case 'driver':
      notes.push(`Driver commission: ${((profile.driver_commission_pct || 0.8) * 100).toFixed(1)}%`);
      break;
    case 'fleet':
      notes.push('Fleet operator earnings model');
      break;
    case 'xpress':
      notes.push('Xpress direct service (salaried drivers)');
      break;
  }

  // Compliance note
  if (profile.regulator_status === 'approved') {
    notes.push(`${profile.regulator_ref ? 'LTFRB approved' : 'Regulator approved'}`);
  } else {
    notes.push('Pending regulator approval');
  }

  return notes;
}

// Helper functions
function calculateDistance(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLon = (destination.lon - origin.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function isAirportTrip(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }): boolean {
  // Mock airport detection - would integrate with POI database
  // NAIA coordinates: ~14.5086° N, 121.0194° E
  const airportLat = 14.5086;
  const airportLon = 121.0194;
  const threshold = 0.02; // ~2km radius
  
  const originNearAirport = Math.abs(origin.lat - airportLat) < threshold && Math.abs(origin.lon - airportLon) < threshold;
  const destNearAirport = Math.abs(destination.lat - airportLat) < threshold && Math.abs(destination.lon - airportLon) < threshold;
  
  return originNearAirport || destNearAirport;
}

function isPOITrip(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }): boolean {
  // Mock POI detection - would integrate with POI database
  // Could check for malls, business districts, etc.
  return false;
}