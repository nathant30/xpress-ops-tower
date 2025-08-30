# 🇵🇭 XPRESS OPS TOWER - AUTOMATED COMPLIANCE PIPELINE

**Complete Documentation for Philippine Regulatory Compliance Data Pipeline**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Sources & Capture](#data-sources--capture)
4. [Compliance Areas](#compliance-areas)
5. [Implementation Guide](#implementation-guide)
6. [API Reference](#api-reference)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Reporting System](#reporting-system)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Xpress Ops Tower Automated Compliance Pipeline is a comprehensive system designed to ensure full regulatory compliance with Philippine laws and regulations for ride-sharing operations.

### **Covered Regulations:**
- **🔐 NPC Data Privacy Act (RA 10173)** - Personal data protection
- **🚗 LTFRB/DOTr Transport Operations** - Trip compliance and safety
- **👥 DOLE Labor Standards** - Driver workforce compliance

### **Key Features:**
- ✅ **Real-time data capture** from all system touchpoints
- ✅ **Automated compliance monitoring** with intelligent alerting
- ✅ **Comprehensive audit trails** for regulatory inspections
- ✅ **Instant report generation** in regulatory formats
- ✅ **Proactive risk detection** with threshold-based alerts

---

## 🏗️ Architecture

### **System Components:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │    Web Admin    │    │  External APIs  │
│                 │    │                 │    │                 │
│ • Rider App     │    │ • Dashboard     │    │ • Payment       │
│ • Driver App    │    │ • Admin Panel   │    │ • CCTV System   │
│ • Fleet Mgmt    │    │ • Reports       │    │ • HR System     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE MIDDLEWARE                        │
│                                                                 │
│ • API Middleware      • Database Middleware                     │
│ • Mobile Middleware   • Webhook Middleware                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   COMPLIANCE DATA PIPELINE                      │
│                                                                 │
│ • Event Ingestion     • Real-time Processing                    │
│ • Data Validation     • Automated Monitoring                    │
│ • Alert Generation    • Batch Processing                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLIANCE DATABASE                         │
│                                                                 │
│ • Trip Compliance     • Consent Logs                           │
│ • Access Logs         • Attendance Records                     │
│ • Benefits Tracking   • Alert History                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPORTING & ALERTING                         │
│                                                                 │
│ • NPC Reports         • LTFRB Reports                          │
│ • DOLE Reports        • Real-time Alerts                       │
│ • Dashboard Metrics   • Notification System                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Sources & Capture

### **1. Automatic Data Capture Points:**

#### **Mobile Applications:**
```typescript
// Driver App Events
- Trip Start/End
- GPS Location Updates
- Check-in/Check-out
- CCTV Status Updates
- Driver Conduct Reports

// Rider App Events  
- Consent Interactions
- Trip Booking/Completion
- Rating Submissions
- Payment Confirmations
```

#### **Web Administration:**
```typescript
// Admin Panel Events
- PII Data Access
- Report Generation
- Configuration Changes
- User Management
- System Monitoring
```

#### **External Integrations:**
```typescript
// Payment Gateway Webhooks
- Payment Completions
- Fare Calculations
- Transaction Logs

// CCTV System Webhooks
- Device Status Changes
- Recording Events
- Health Monitoring

// HR System Integration
- Benefits Remittance
- Payroll Processing
- Contract Updates
```

### **2. Database Trigger Monitoring:**

```sql
-- Automatic PII Access Logging
CREATE OR REPLACE FUNCTION log_pii_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pii_access_logs (
        accessor_id, accessed_table, access_type, 
        timestamp, session_id
    ) VALUES (
        current_setting('app.user_id')::INTEGER,
        TG_TABLE_NAME,
        TG_OP,
        NOW(),
        current_setting('app.session_id')
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to PII tables
CREATE TRIGGER pii_access_trigger 
AFTER INSERT OR UPDATE OR DELETE ON riders
FOR EACH STATEMENT EXECUTE FUNCTION log_pii_access();
```

---

## 🔐 Compliance Areas

### **1. NPC Data Privacy (RA 10173)**

#### **Data Processing Registry:**
- **Automated Scanning:** Database tables containing PII
- **Record Counting:** Real-time tallies of personal data records
- **Purpose Mapping:** Automatic classification of data processing purposes
- **Retention Tracking:** Automated data lifecycle management

#### **Consent Management:**
```typescript
// Automatic consent capture
const consentEvent = {
  userId: 12345,
  consentType: 'data_processing',
  consentGiven: true,
  timestamp: new Date(),
  method: 'mobile_checkbox',
  ipAddress: '192.168.1.1',
  location: { lat: 14.5995, lng: 120.9842 }
};

// Pipeline automatically processes and stores
await pipeline.ingestEvent(consentEvent);
```

#### **Access Control Monitoring:**
- **Query Interception:** All database queries to PII tables logged
- **Mass Export Detection:** Automatic flagging of bulk data operations
- **Session Tracking:** Complete audit trail of admin access
- **Anomaly Detection:** Suspicious access pattern identification

### **2. LTFRB Transport Operations**

#### **Trip Compliance Tracking:**
```typescript
// Real-time trip monitoring
const tripStart = {
  tripId: 'TRIP_2024_001234',
  driverId: 5678,
  vehicleId: 1234,
  pickupLocation: { lat: 14.5995, lng: 120.9842 },
  estimatedFare: 150.00,
  cctvActive: true
};

// Automatic fare compliance validation
const fareCompliance = await validateFare({
  charged: 160.00,
  mandated: 150.00,
  tolerance: 0.10 // 10% variance allowed
});
```

#### **CCTV Health Monitoring:**
- **Device Status:** Real-time monitoring of all CCTV units
- **Health Scoring:** Automated health assessment (0-100 scale)
- **Alert Generation:** Immediate alerts for inactive/tampered units
- **Maintenance Scheduling:** Predictive maintenance notifications

#### **Driver Conduct Tracking:**
- **Decline Rate Monitoring:** Real-time calculation of decline percentages
- **Route Compliance:** GPS boundary validation against franchise areas
- **Strike Point System:** Automated conduct violation scoring
- **Performance Metrics:** Driver rating and behavior analysis

### **3. DOLE Labor Standards**

#### **Attendance Automation:**
```typescript
// GPS-based attendance tracking
const checkIn = {
  driverId: 5678,
  timestamp: new Date(),
  location: { lat: 14.5995, lng: 120.9842 },
  method: 'gps_verified'
};

// Automatic hours calculation
const workingHours = await calculateHours({
  checkIn: '08:00:00',
  checkOut: '18:30:00',
  lunchBreak: 60, // minutes
  overtimeThreshold: 8 // hours
});
```

#### **Benefits Remittance Automation:**
- **Contribution Calculation:** Automatic PhilHealth/SSS/Pag-IBIG computation
- **Remittance Tracking:** Real-time status of benefit payments
- **Deadline Monitoring:** Alert system for upcoming due dates
- **Compliance Scoring:** Overall labor compliance percentage

---

## 🛠️ Implementation Guide

### **Step 1: Database Setup**

```bash
# Create compliance database schema
psql -d xpress_ops -f database/compliance-schema.sql

# Set up database triggers
psql -d xpress_ops -f database/compliance-triggers.sql

# Create indexes for performance
psql -d xpress_ops -f database/compliance-indexes.sql
```

### **Step 2: Pipeline Initialization**

```typescript
// In your main application startup
import { initializeCompliancePipeline } from '@/lib/compliance/pipeline';
import { initializeComplianceMiddleware } from '@/lib/compliance/middleware';

// Initialize the pipeline
const pipeline = initializeCompliancePipeline();

// Initialize middleware components
initializeComplianceMiddleware();

// Start monitoring
await pipeline.startComplianceMonitoring();
```

### **Step 3: Middleware Integration**

#### **Database Queries:**
```typescript
import { getDatabaseMiddleware } from '@/lib/compliance/middleware';

// Wrap your database queries
const dbMiddleware = getDatabaseMiddleware();

async function executeQuery(query: string, params: any[], userId: number) {
  // Log compliance data access
  await dbMiddleware.interceptQuery(
    query, params, userId, sessionId, userAgent, ipAddress
  );
  
  // Execute actual query
  const result = await db.query(query, params);
  
  // Monitor for high-risk patterns
  await dbMiddleware.monitorHighRiskQuery(
    query, result.rowCount, userId, sessionId
  );
  
  return result;
}
```

#### **API Endpoints:**
```typescript
import { complianceApiMiddleware } from '@/lib/compliance/middleware';

// Apply middleware to your API routes
export async function POST(request: NextRequest) {
  const response = NextResponse.json(await handleRequest(request));
  
  // Apply compliance middleware
  return await complianceApiMiddleware(request, response, userId);
}
```

#### **Mobile App Integration:**
```typescript
import { createMobileMiddleware } from '@/lib/compliance/middleware';

const mobileMiddleware = createMobileMiddleware();

// In your mobile app event handlers
async function handleTripStart(tripData: any) {
  // Process trip normally
  const trip = await createTrip(tripData);
  
  // Automatic compliance logging
  await mobileMiddleware.processMobileEvent('trip_lifecycle', {
    phase: 'start',
    tripId: trip.id,
    driverId: trip.driverId,
    riderId: trip.riderId,
    pickup: trip.pickupLocation,
    estimatedFare: trip.estimatedFare,
    cctvActive: trip.cctvStatus
  }, {
    sessionId: session.id,
    appVersion: '2.1.0',
    location: currentLocation
  });
}
```

---

## 📡 API Reference

### **Event Ingestion Endpoints:**

#### **POST /api/compliance**
```typescript
// Generic compliance event ingestion
{
  "id": "event_1234567890",
  "type": "consent_given",
  "source": "mobile_app",
  "timestamp": "2024-08-30T10:30:00Z",
  "userId": 12345,
  "sessionId": "sess_abc123",
  "data": {
    "userId": 12345,
    "consentType": "data_processing",
    "consentGiven": true,
    "consentVersion": "1.0",
    "method": "checkbox"
  },
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "XpressDriver/2.1.0",
    "appVersion": "2.1.0",
    "location": { "lat": 14.5995, "lng": 120.9842 }
  }
}
```

#### **POST /api/compliance/npc/consent**
```typescript
// NPC consent logging
{
  "userId": 12345,
  "type": "marketing",
  "granted": true,
  "version": "1.0",
  "method": "checkbox",
  "sessionId": "sess_abc123",
  "appVersion": "2.1.0",
  "location": { "lat": 14.5995, "lng": 120.9842 }
}
```

#### **POST /api/compliance/ltfrb/trip-start**
```typescript
// LTFRB trip start logging
{
  "tripId": "TRIP_2024_001234",
  "driverId": 5678,
  "riderId": 9012,
  "vehicleId": 1234,
  "pickupLocation": { "lat": 14.5995, "lng": 120.9842 },
  "estimatedFare": 150.00,
  "cctvActive": true,
  "sessionId": "sess_def456",
  "appVersion": "2.1.0"
}
```

#### **POST /api/compliance/dole/attendance**
```typescript
// DOLE attendance logging
{
  "driverId": 5678,
  "type": "check_in",
  "location": { "lat": 14.5995, "lng": 120.9842 },
  "method": "gps",
  "sessionId": "sess_ghi789",
  "appVersion": "2.1.0"
}
```

### **Dashboard & Reporting Endpoints:**

#### **GET /api/compliance**
```typescript
// Get compliance dashboard
// Query params: ?area=npc|ltfrb|dole|all&period=30
{
  "success": true,
  "data": {
    "npc": {
      "registeredDataSystems": 12,
      "totalPersonalRecords": 2847522,
      "consentCaptureRate": 99.2,
      "authorizedAccessors": 47,
      "criticalBreaches": 0,
      "pendingSubjectRequests": 3,
      "lastUpdated": "2024-08-30T10:30:00Z"
    },
    "ltfrb": {
      "totalTrips": 847522,
      "fareComplianceRate": 98.7,
      "routeComplianceRate": 99.1,
      "cctvActiveRate": 98.2,
      "avgDriverRating": 4.7,
      "declineRate": 4.2,
      "conductViolations": 23
    },
    "dole": {
      "totalDrivers": 12087,
      "attendanceRate": 96.8,
      "avgDailyHours": 9.2,
      "overtimeViolations": 234,
      "benefitsComplianceRate": 99.8,
      "laborInspectionScore": 96.7
    },
    "totalAlerts": 47,
    "criticalAlerts": 2,
    "lastRefreshed": "2024-08-30T10:30:00Z"
  }
}
```

#### **GET /api/compliance/alerts**
```typescript
// Query params: ?severity=critical&area=npc_privacy&page=1&limit=50
{
  "success": true,
  "data": [
    {
      "id": 123,
      "alertType": "overdue_subject_requests",
      "severity": "critical",
      "title": "Overdue Data Subject Requests",
      "description": "3 requests are overdue (>15 days)",
      "complianceArea": "npc_privacy",
      "actualValue": 3,
      "triggeredAt": "2024-08-30T10:30:00Z",
      "acknowledged": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 47,
    "totalPages": 1
  }
}
```

---

## 🚨 Monitoring & Alerts

### **Alert Types & Thresholds:**

#### **NPC Privacy Alerts:**
- **Low Consent Rate:** < 95% consent capture
- **Expired Consents:** Any expired user consents
- **Mass Data Export:** > 1,000 records exported at once
- **Overdue Subject Requests:** > 15 days without response
- **Suspicious Access:** Unusual data access patterns

#### **LTFRB Transport Alerts:**
- **Low Fare Compliance:** < 95% fare accuracy
- **CCTV Inactive:** < 98% CCTV active rate
- **High Decline Rate:** > 10% trip decline rate
- **Boundary Violations:** > 5 violations per day
- **Driver Conduct:** Major violations or strike accumulation

#### **DOLE Labor Alerts:**
- **Low Attendance:** < 90% attendance rate
- **Overtime Violations:** > 11 hours daily work
- **Benefits Non-compliance:** < 98% remittance rate
- **Missing Documentation:** Incomplete labor records

### **Alert Response System:**

```typescript
// Automatic alert generation
await pipeline.generateAlert({
  alertType: 'overtime_violation',
  severity: 'error',
  title: 'Daily Hours Limit Exceeded',
  description: 'Driver 5678 worked 12.5 hours (limit: 11)',
  complianceArea: 'dole_labor',
  entityId: '5678',
  thresholdValue: 11,
  actualValue: 12.5,
  triggeredAt: new Date()
});

// Multi-channel notifications
- Email to compliance team
- SMS for critical alerts
- Slack integration
- Dashboard notifications
- Mobile push notifications
```

---

## 📊 Reporting System

### **Automated Report Generation:**

#### **NPC Data Privacy Report:**
```
Generated: 2024-08-30 10:30:00
Status: Current

DATA PROCESSING REGISTRY
========================
✅ Rider Profiles Database: 45,231 records
✅ Driver Verification System: 12,087 records  
✅ Trip History Logs: 2,847,522 records

CONSENT MANAGEMENT
==================
✅ Consent Capture Rate: 99.2% (riders)
✅ Marketing Opt-ins: 67.8% active consent
⚠️  Consent Renewal: Due in 18 days

ACCESS CONTROL AUDIT
====================
✅ PII Access Logs: 2,847 authorized access events
⚠️  Access Exceptions: 3 flagged (investigated)

BREACH MONITORING
=================
✅ No data breaches detected (30 days)
✅ Real-time Alerts: Configured

NPC COMPLIANCE STATUS: 96.8% (GREEN)
```

#### **LTFRB Transport Report:**
```
Generated: 2024-08-30 10:30:00
Status: Current

TRIP OPERATIONS AUDIT
=====================
✅ Total Trips Monitored: 847,522 (last 30 days)
✅ Fare Compliance Rate: 98.7%
✅ Authorized Route Adherence: 99.1%

CCTV MONITORING STATUS
=====================
✅ Active CCTV Units: 11,847 (98.2%)
⚠️  Offline Units: 218 (maintenance scheduled)

DRIVER CONDUCT TRACKING
======================
✅ Code of Conduct Violations: 23 cases
✅ Decline Rate Monitoring: 4.2% (within limits)
✅ Customer Ratings: 4.7/5.0 average

LTFRB COMPLIANCE STATUS: 98.1% (GREEN)
```

#### **DOLE Labor Report:**
```
Generated: 2024-08-30 10:30:00
Status: Current

ATTENDANCE MONITORING
====================
✅ Driver Roll-call System: 99.4% compliance
✅ Average Attendance: 96.8%

WORKING HOURS ANALYSIS
=====================
✅ Average Daily Hours: 9.2 hrs (within 11hr limit)
✅ Weekly Schedule: 5.8 days avg (within 6-day limit)
⚠️  Overtime Exceptions: 234 cases (documented)

BENEFITS REMITTANCE STATUS
=========================
✅ PhilHealth Contributions: 100% current
✅ SSS Remittances: 100% up to date
✅ Pag-IBIG Fund: 100% compliant

DOLE COMPLIANCE SCORE: 96.7% (GREEN)
```

---

## 🚀 Deployment Guide

### **Environment Setup:**

```bash
# 1. Clone repository
git clone https://github.com/xpress/ops-tower
cd ops-tower

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local with your configuration:
DATABASE_URL=postgresql://user:pass@localhost:5432/xpress_ops
COMPLIANCE_PIPELINE_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook
NPC_REPORTING_EMAIL=compliance@xpress.ops
```

### **Database Migration:**

```bash
# Apply compliance schema
npm run db:migrate:compliance

# Create indexes
npm run db:index:compliance

# Seed initial data
npm run db:seed:compliance
```

### **Service Configuration:**

```typescript
// config/compliance.ts
export const complianceConfig = {
  pipeline: {
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    maxRetries: 3
  },
  alerts: {
    thresholds: {
      consent_rate: 95,
      fare_compliance_rate: 95,
      attendance_rate: 90,
      cctv_active_rate: 98
    },
    notifications: {
      email: true,
      sms: true,
      slack: true
    }
  },
  monitoring: {
    checkInterval: 300000, // 5 minutes
    retentionDays: 365
  }
};
```

### **Production Deployment:**

```yaml
# docker-compose.compliance.yml
version: '3.8'
services:
  compliance-pipeline:
    image: xpress/ops-tower:latest
    environment:
      - NODE_ENV=production
      - COMPLIANCE_PIPELINE_ENABLED=true
    volumes:
      - ./compliance-logs:/app/logs
    depends_on:
      - postgres
      - redis

  compliance-alerts:
    image: xpress/ops-tower-alerts:latest
    environment:
      - ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL}
      - SMTP_SERVER=${SMTP_SERVER}
    depends_on:
      - compliance-pipeline
```

---

## 🔧 Troubleshooting

### **Common Issues:**

#### **1. Pipeline Not Processing Events**
```bash
# Check pipeline status
curl http://localhost:3000/api/compliance/health

# Check event queue size
curl http://localhost:3000/api/compliance/status

# Restart pipeline
npm run compliance:restart
```

#### **2. Database Connection Issues**
```bash
# Test database connectivity
npm run db:test:compliance

# Check table existence
psql -d xpress_ops -c "SELECT COUNT(*) FROM compliance_audit_trail;"

# Verify indexes
psql -d xpress_ops -c "SELECT indexname FROM pg_indexes WHERE tablename = 'trip_compliance_log';"
```

#### **3. Alert System Not Working**
```bash
# Test alert generation
curl -X POST http://localhost:3000/api/compliance/test-alert

# Check alert configuration
npm run compliance:config:check

# Verify webhook endpoints
curl -X POST $ALERT_WEBHOOK_URL -d '{"text": "Test alert"}'
```

### **Monitoring Commands:**

```bash
# Pipeline health check
npm run compliance:health

# Event processing stats
npm run compliance:stats

# Generate test events
npm run compliance:test:events

# Export compliance metrics
npm run compliance:export:metrics

# Clear old audit logs
npm run compliance:cleanup:logs
```

### **Log Analysis:**

```bash
# View pipeline logs
tail -f logs/compliance-pipeline.log

# Search for errors
grep ERROR logs/compliance-*.log

# Monitor alert generation
grep "alert_generated" logs/compliance-pipeline.log | tail -20

# Check API response times
grep "api_response_time" logs/compliance-api.log
```

---

## 📞 Support & Maintenance

### **Support Contacts:**
- **Technical Issues:** tech@xpress.ops
- **Compliance Questions:** compliance@xress.ops
- **Emergency Alerts:** +63-xxx-xxx-xxxx

### **Maintenance Schedule:**
- **Database Cleanup:** Weekly (Sundays 2:00 AM)
- **Alert Threshold Review:** Monthly
- **Compliance Audit:** Quarterly
- **System Updates:** As needed

### **Documentation Updates:**
This documentation is maintained in the `/docs` directory. For updates:
1. Update the relevant markdown file
2. Test changes in staging environment
3. Submit pull request for review
4. Deploy to production documentation

---

**Last Updated:** August 30, 2024  
**Version:** 1.0.0  
**Next Review:** November 30, 2024