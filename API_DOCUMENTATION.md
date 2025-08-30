# AI Fraud Detection API Documentation

## Authentication

All API endpoints require authentication via API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.ops-tower.ph/v1/fraud-detection
```

## Core Fraud Detection APIs

### 1. Multi-Modal Analysis

**Endpoint**: `POST /api/v1/fraud/analyze`

Performs comprehensive multi-modal fraud analysis using all 12 AI systems.

```typescript
// Request
interface AnalysisRequest {
  userId: string;
  sessionId: string;
  visualData?: {
    faceImage?: string; // base64 encoded
    documentImage?: string;
    vehicleImage?: string;
  };
  audioData?: {
    voiceRecording?: ArrayBuffer;
    phoneNumber?: string;
  };
  behavioralData?: {
    keystrokePattern?: number[];
    touchPattern?: number[];
    deviceUsage?: any;
  };
  locationData?: {
    currentLocation: { lat: number; lon: number };
    route?: Array<{ lat: number; lon: number; timestamp: string }>;
  };
  transactionData?: {
    amount: number;
    paymentMethod: string;
    timestamp: string;
  };
}

// Response
interface AnalysisResponse {
  analysisId: string;
  overallRiskScore: number; // 0-1
  authenticity: 'genuine' | 'suspicious' | 'fraudulent';
  confidence: number;
  primaryConcerns: string[];
  modalityScores: {
    visual: number;
    audio: number;
    behavioral: number;
    network: number;
    textual: number;
  };
  recommendations: string[];
  emergencyFlags: string[];
  processingTime: number;
  timestamp: string;
}
```

**Example Usage**:
```bash
curl -X POST https://api.ops-tower.ph/v1/fraud/analyze \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_12345",
    "sessionId": "session_abc123",
    "visualData": {
      "faceImage": "data:image/jpeg;base64,/9j/4AAQ..."
    },
    "locationData": {
      "currentLocation": {"lat": 14.5995, "lon": 120.9842}
    },
    "transactionData": {
      "amount": 250.00,
      "paymentMethod": "credit_card",
      "timestamp": "2025-08-30T10:30:00Z"
    }
  }'
```

### 2. Real-Time Risk Assessment

**Endpoint**: `POST /api/v1/fraud/risk-score`

Quick risk scoring for real-time transaction processing.

```typescript
interface RiskRequest {
  userId: string;
  transactionData: {
    amount: number;
    location: { lat: number; lon: number };
    paymentMethod: string;
    deviceId: string;
  };
  urgency: 'low' | 'medium' | 'high';
}

interface RiskResponse {
  riskScore: number; // 0-1
  decision: 'allow' | 'block' | 'verify' | 'monitor';
  confidence: number;
  processingTime: number; // milliseconds
  reasons: string[];
  nextSteps: string[];
}
```

### 3. Fraud Investigation Support

**Endpoint**: `POST /api/v1/fraud/investigate`

LLM-powered fraud investigation assistance.

```typescript
interface InvestigationRequest {
  caseId: string;
  investigatorId: string;
  query: string; // Natural language query
  context?: {
    userId: string;
    timeRange: string;
    relatedCases: string[];
  };
}

interface InvestigationResponse {
  investigationId: string;
  analysis: string; // LLM-generated analysis
  findings: string[];
  recommendations: string[];
  riskAssessment: number;
  relatedPatterns: string[];
  suggestedActions: string[];
}
```

## Specialized AI Service APIs

### Computer Vision APIs

#### Face Verification
```typescript
POST /api/v1/vision/verify-face
{
  "userId": "user_123",
  "faceImage": "base64_encoded_image",
  "referenceImage"?: "base64_encoded_reference"
}

Response:
{
  "isMatch": boolean,
  "confidence": number,
  "livenessDetected": boolean,
  "qualityScore": number,
  "spoofingRisk": number
}
```

#### Document Verification
```typescript
POST /api/v1/vision/verify-document
{
  "documentImage": "base64_encoded_image",
  "documentType": "drivers_license" | "passport" | "national_id",
  "expectedRegion": "philippines"
}

Response:
{
  "isValid": boolean,
  "documentType": string,
  "extractedData": {
    "name": string,
    "id": string,
    "expiryDate": string,
    "region": string
  },
  "fraudRisk": number,
  "tamperingDetected": boolean
}
```

### Audio AI APIs

#### Voice Verification
```typescript
POST /api/v1/audio/verify-voice
{
  "userId": "user_123",
  "audioData": ArrayBuffer, // Binary audio data
  "duration": number
}

Response:
{
  "isAuthentic": boolean,
  "confidence": number,
  "spoofingRisk": number,
  "emotionalState": string,
  "stressLevel": number,
  "languageDetected": string,
  "anomalies": string[]
}
```

### Behavioral Biometrics APIs

#### Keystroke Analysis
```typescript
POST /api/v1/biometrics/analyze-keystrokes
{
  "userId": "user_123",
  "keystrokeData": {
    "keyDownTimes": number[],
    "keyUpTimes": number[],
    "keys": string[]
  }
}

Response:
{
  "isAuthentic": boolean,
  "confidence": number,
  "biometricScore": number,
  "anomalies": string[],
  "riskFactors": string[]
}
```

### Geospatial Intelligence APIs

#### Location Risk Assessment
```typescript
POST /api/v1/geospatial/assess-location
{
  "location": {"lat": number, "lon": number},
  "timestamp": string,
  "userId": string
}

Response:
{
  "riskScore": number,
  "riskFactors": string[],
  "geofenceViolations": string[],
  "regionalContext": {
    "region": string,
    "fraudHotspot": boolean,
    "timeBasedRisk": number
  }
}
```

#### Route Analysis
```typescript
POST /api/v1/geospatial/analyze-route
{
  "userId": "user_123",
  "route": [
    {"lat": number, "lon": number, "timestamp": string}
  ]
}

Response:
{
  "routeId": string,
  "fraudRisk": number,
  "anomalies": {
    "speedViolations": any[],
    "routeDeviations": any[],
    "suspiciousStops": any[]
  },
  "metrics": {
    "totalDistance": number,
    "averageSpeed": number,
    "estimatedDuration": number,
    "actualDuration": number
  }
}
```

## Real-Time Streaming APIs

### WebSocket Fraud Alerts

**Endpoint**: `wss://api.ops-tower.ph/v1/fraud/alerts`

```typescript
// Connection
const ws = new WebSocket('wss://api.ops-tower.ph/v1/fraud/alerts?apiKey=YOUR_API_KEY');

// Incoming Alert Message
interface FraudAlert {
  alertId: string;
  userId: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeringSystems: string[];
  timestamp: string;
  actionRequired: boolean;
  details: {
    location?: { lat: number; lon: number };
    transactionAmount?: number;
    suspiciousPatterns: string[];
  };
}

// Example Alert
{
  "alertId": "alert_67890",
  "userId": "user_12345",
  "riskScore": 0.87,
  "severity": "high",
  "triggeringSystems": ["computer_vision", "behavioral_ai", "geospatial"],
  "timestamp": "2025-08-30T10:45:30Z",
  "actionRequired": true,
  "details": {
    "location": {"lat": 14.5995, "lon": 120.9842},
    "transactionAmount": 1500.00,
    "suspiciousPatterns": ["face_verification_failed", "unusual_location", "high_value_transaction"]
  }
}
```

### Real-Time Fusion Events

**Endpoint**: `wss://api.ops-tower.ph/v1/fusion/events`

```typescript
interface FusionEvent {
  eventId: string;
  userId: string;
  eventType: 'authentication' | 'transaction' | 'communication' | 'anomaly';
  fusedScore: number;
  triggerModalities: string[];
  crossModalCorrelations: {
    visualAudioConsistency: number;
    behavioralAudioAlignment: number;
    networkBehavioralMatch: number;
  };
  timestamp: string;
}
```

## Batch Processing APIs

### Bulk Analysis

**Endpoint**: `POST /api/v1/fraud/bulk-analyze`

```typescript
interface BulkAnalysisRequest {
  batchId: string;
  transactions: Array<{
    transactionId: string;
    userId: string;
    data: any;
  }>;
  analysisOptions: {
    includeLLMAnalysis: boolean;
    includeNetworkAnalysis: boolean;
    priorityLevel: 'standard' | 'expedited';
  };
}

interface BulkAnalysisResponse {
  batchId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results: Array<{
    transactionId: string;
    riskScore: number;
    decision: string;
    confidence: number;
  }>;
  summary: {
    totalProcessed: number;
    flaggedCount: number;
    averageRiskScore: number;
    processingTime: number;
  };
}
```

### Historical Analysis

**Endpoint**: `GET /api/v1/fraud/history/{userId}`

```typescript
interface HistoryResponse {
  userId: string;
  timeRange: string;
  fraudHistory: Array<{
    detectionId: string;
    timestamp: string;
    riskScore: number;
    aiSystemsUsed: string[];
    outcome: string;
    falsePositive: boolean;
  }>;
  patterns: {
    riskTrend: number[];
    commonTriggers: string[];
    timeDistribution: number[];
    locationHotspots: Array<{lat: number, lon: number, count: number}>;
  };
  recommendations: string[];
}
```

## Advanced AI Integration APIs

### Reinforcement Learning

**Endpoint**: `POST /api/v1/rl/feedback`

```typescript
interface RLFeedbackRequest {
  stateId: string;
  actionTaken: string;
  outcome: 'success' | 'failure';
  reward: number;
  additionalContext: any;
}

interface RLFeedbackResponse {
  feedbackAccepted: boolean;
  modelUpdated: boolean;
  newPerformanceMetrics: {
    averageReward: number;
    successRate: number;
    explorationRate: number;
  };
}
```

### Federated Learning

**Endpoint**: `POST /api/v1/federated/contribute`

```typescript
interface FederatedContributionRequest {
  nodeId: string;
  modelUpdate: {
    weights: number[][];
    sampleCount: number;
    localAccuracy: number;
  };
  privacyLevel: 'standard' | 'high' | 'maximum';
}

interface FederatedContributionResponse {
  contributionAccepted: boolean;
  globalModelVersion: string;
  nextTrainingRound: string;
  reputationScore: number;
}
```

### Quantum Computing

**Endpoint**: `POST /api/v1/quantum/pattern-match`

```typescript
interface QuantumPatternRequest {
  pattern: number[];
  dataset: number[][];
  optimizationLevel: 'standard' | 'enhanced' | 'maximum';
}

interface QuantumPatternResponse {
  matches: Array<{
    index: number;
    similarity: number;
    quantumAdvantage: number;
  }>;
  processingTime: number;
  quantumSpeedup: number;
  classicalComparison: any;
}
```

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: any;
    timestamp: string;
    requestId: string;
  };
  suggestions: string[];
}
```

### Common Error Codes

- `INVALID_API_KEY`: Authentication failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INSUFFICIENT_DATA`: Not enough data for analysis
- `AI_SERVICE_UNAVAILABLE`: AI engine temporarily down
- `PRIVACY_VIOLATION`: Request violates privacy policies
- `GEOFENCE_RESTRICTED`: Location access denied

## Rate Limiting

### Standard Limits
- **Free Tier**: 100 requests/hour
- **Professional**: 1,000 requests/hour  
- **Enterprise**: 10,000 requests/hour
- **Custom**: Unlimited with SLA

### Philippines-Specific Considerations
- **BSP Compliance**: Enhanced rate limiting for financial data
- **Data Privacy Act**: Request logging for audit purposes
- **Peak Hours**: Automatic scaling during rush hours (7-9 AM, 5-7 PM PHT)

## Webhook Integration

### Fraud Alert Webhooks

**Setup**: Configure webhook URL in dashboard

```typescript
// Webhook Payload
interface WebhookPayload {
  event: 'fraud_detected' | 'high_risk_user' | 'system_alert';
  data: {
    userId: string;
    riskScore: number;
    details: any;
    timestamp: string;
  };
  signature: string; // HMAC verification
}
```

**Verification**:
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @ops-tower/fraud-detection-sdk
```

```typescript
import { FraudDetectionClient } from '@ops-tower/fraud-detection-sdk';

const client = new FraudDetectionClient({
  apiKey: 'your_api_key',
  region: 'philippines',
  environment: 'production'
});

// Analyze transaction
const result = await client.analyzeTransaction({
  userId: 'user_123',
  amount: 500,
  location: { lat: 14.5995, lon: 120.9842 }
});

console.log('Risk Score:', result.riskScore);
console.log('Decision:', result.decision);
```

### Python SDK

```bash
pip install ops-tower-fraud-detection
```

```python
from ops_tower import FraudDetectionClient

client = FraudDetectionClient(
    api_key='your_api_key',
    region='philippines'
)

# Multi-modal analysis
result = client.analyze_multimodal({
    'user_id': 'user_123',
    'visual_data': {'face_image': face_image_base64},
    'location_data': {'current_location': {'lat': 14.5995, 'lon': 120.9842}}
})

print(f"Risk Score: {result['risk_score']}")
print(f"Authenticity: {result['authenticity']}")
```

### PHP SDK

```bash
composer require ops-tower/fraud-detection-php
```

```php
<?php
use OpsTower\FraudDetection\Client;

$client = new Client([
    'api_key' => 'your_api_key',
    'region' => 'philippines'
]);

$result = $client->analyzeTransaction([
    'user_id' => 'user_123',
    'amount' => 500.00,
    'location' => ['lat' => 14.5995, 'lon' => 120.9842],
    'payment_method' => 'credit_card'
]);

echo "Risk Score: " . $result['risk_score'] . "\n";
echo "Decision: " . $result['decision'] . "\n";
?>
```

## Integration Examples

### React/Next.js Integration

```tsx
import { useState } from 'react';
import { FraudDetectionClient } from '@ops-tower/fraud-detection-sdk';

const client = new FraudDetectionClient({
  apiKey: process.env.NEXT_PUBLIC_FRAUD_API_KEY,
  region: 'philippines'
});

export function TransactionVerification({ userId, transactionData }) {
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeTransaction = async () => {
    setLoading(true);
    try {
      const result = await client.analyzeTransaction({
        userId,
        ...transactionData
      });
      setRiskAnalysis(result);
    } catch (error) {
      console.error('Fraud analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={analyzeTransaction} disabled={loading}>
        {loading ? 'Analyzing...' : 'Verify Transaction'}
      </button>
      
      {riskAnalysis && (
        <div className={`risk-${riskAnalysis.decision}`}>
          <p>Risk Score: {riskAnalysis.riskScore}</p>
          <p>Decision: {riskAnalysis.decision}</p>
          <p>Confidence: {riskAnalysis.confidence}</p>
        </div>
      )}
    </div>
  );
}
```

### Express.js Middleware

```javascript
const express = require('express');
const { FraudDetectionClient } = require('@ops-tower/fraud-detection-sdk');

const fraudClient = new FraudDetectionClient({
  apiKey: process.env.FRAUD_API_KEY,
  region: 'philippines'
});

const fraudDetectionMiddleware = async (req, res, next) => {
  try {
    const analysis = await fraudClient.analyzeRequest({
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestData: req.body
    });

    if (analysis.riskScore > 0.8) {
      return res.status(403).json({
        error: 'Transaction blocked due to fraud risk',
        riskScore: analysis.riskScore,
        reasons: analysis.reasons
      });
    }

    req.fraudAnalysis = analysis;
    next();
  } catch (error) {
    console.error('Fraud detection error:', error);
    next(); // Continue on error
  }
};

app.use('/api/transactions', fraudDetectionMiddleware);
```

### Mobile Integration (React Native)

```typescript
import { FraudDetectionMobile } from '@ops-tower/fraud-detection-mobile';

const fraudDetection = new FraudDetectionMobile({
  apiKey: 'your_api_key',
  enableBiometrics: true,
  enableLocationTracking: true,
  enableSensorFusion: true
});

// Auto-collect behavioral data
fraudDetection.startBehavioralMonitoring(userId);

// Analyze transaction with device context
const result = await fraudDetection.analyzeTransactionWithContext({
  userId: 'user_123',
  amount: 750,
  paymentMethod: 'gcash',
  includeDeviceFingerprint: true,
  includeBehavioralData: true,
  includeLocationData: true
});
```

## Testing & Development

### Sandbox Environment

**Base URL**: `https://sandbox-api.ops-tower.ph/v1/`

- Test API keys begin with `test_`
- Synthetic data responses for consistent testing
- All AI systems return mock results
- No actual fraud decisions made

### Test Data Generation

```typescript
// Generate test scenarios
POST /api/v1/test/generate-scenarios
{
  "scenarioType": "fraud_cases" | "legitimate_users" | "edge_cases",
  "count": number,
  "complexity": "simple" | "moderate" | "complex",
  "region": "manila" | "cebu" | "davao"
}
```

## Monitoring & Analytics

### System Health Check

```typescript
GET /api/v1/health

Response:
{
  "status": "healthy" | "degraded" | "down",
  "aiSystems": {
    "llm": "operational",
    "vision": "operational", 
    "audio": "degraded",
    "fusion": "operational"
  },
  "responseTime": number,
  "timestamp": string
}
```

### Performance Metrics

```typescript
GET /api/v1/metrics?timeRange=24h

Response:
{
  "period": "24h",
  "metrics": {
    "totalRequests": number,
    "averageResponseTime": number,
    "fraudDetectionRate": number,
    "falsePositiveRate": number,
    "systemUptime": number
  },
  "aiSystemPerformance": {
    "llm": {"accuracy": 0.92, "avgResponseTime": 150},
    "vision": {"accuracy": 0.94, "avgResponseTime": 200},
    "audio": {"accuracy": 0.89, "avgResponseTime": 300}
  }
}
```

## Support & Resources

### Documentation Links
- **API Reference**: https://docs.ops-tower.ph/api
- **Integration Guides**: https://docs.ops-tower.ph/integrate  
- **Philippines Compliance**: https://docs.ops-tower.ph/compliance-ph
- **AI Model Details**: https://docs.ops-tower.ph/ai-models

### Support Channels
- **Technical Support**: support@ops-tower.ph
- **Philippines Regional**: support-ph@ops-tower.ph
- **Emergency Contact**: +63-2-8888-FRAUD
- **Status Page**: https://status.ops-tower.ph

### Sample Applications
- **GitHub Repository**: https://github.com/ops-tower/fraud-detection-examples
- **Philippines Demo**: https://demo-ph.ops-tower.ph
- **Postman Collection**: Available in documentation portal

---

**API Version**: v1.0  
**Last Updated**: 2025-08-30  
**Region**: Philippines  
**Compliance**: BSP, Data Privacy Act, PCI DSS