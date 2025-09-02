import { NextRequest, NextResponse } from 'next/server';

// GET /api/v1/pricing - Pricing Centre API root endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: "Xpress Pricing Centre v4.0",
    version: "4.0.0",
    description: "World-Standard AI-Powered Pricing Management System + Surge Integration",
    features: [
      "AI/ML Forecasting & Recommendations",
      "Dual-Approval Proposal Workflow", 
      "LTFRB/TWG Compliance Validation",
      "H3 Surge Pricing Integration",
      "Regulator Export Packages",
      "Real-time Preview System"
    ],
    endpoints: {
      dashboard: "/api/v1/pricing/dashboard",
      profiles: "/api/v1/pricing/profiles",
      surge: "/api/surge/*",
      health: "/api/health"
    },
    status: "operational",
    timestamp: new Date().toISOString()
  });
}