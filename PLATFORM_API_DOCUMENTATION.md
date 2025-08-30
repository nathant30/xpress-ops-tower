# Ops Tower - Complete Platform API Documentation

## API Overview

Base URL: `https://api.ops-tower.ph/v1/`  
Authentication: Bearer token via `Authorization: Bearer {token}`  
Rate Limiting: Tiered based on subscription level  
Response Format: JSON with consistent error handling  

## Authentication & Authorization

### Authentication Endpoints

#### User Registration
```http
POST /auth/register
Content-Type: application/json

{
  "userType": "passenger" | "driver" | "fleet_manager",
  "phoneNumber": "+639123456789",
  "email": "user@example.com",
  "firstName": "Juan",
  "lastName": "Cruz",
  "password": "securePassword123",
  "referralCode": "REF123" // optional
}
```

```json
// Response
{
  "success": true,
  "data": {
    "userId": "user_12345",
    "verificationRequired": true,
    "otpSent": true,
    "nextStep": "verify_phone"
  },
  "message": "Registration successful. Please verify your phone number."
}
```

#### Phone Verification
```http
POST /auth/verify-phone
Content-Type: application/json

{
  "userId": "user_12345",
  "otpCode": "123456",
  "phoneNumber": "+639123456789"
}
```

#### User Login
```http
POST /auth/login
Content-Type: application/json

{
  "identifier": "+639123456789", // phone or email
  "password": "securePassword123",
  "deviceInfo": {
    "deviceId": "device_abc123",
    "platform": "ios" | "android" | "web",
    "version": "1.0.0"
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "userId": "user_12345",
      "userType": "passenger",
      "isVerified": true,
      "profile": {}
    },
    "fraudAnalysis": {
      "riskScore": 0.1,
      "trustLevel": "high",
      "requiresAdditionalAuth": false
    }
  }
}
```

## User Management APIs

### User Profile Management

#### Get User Profile
```http
GET /users/{userId}
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "userId": "user_12345",
    "userType": "passenger",
    "profile": {
      "firstName": "Juan",
      "lastName": "Cruz",
      "phoneNumber": "+639123456789",
      "email": "juan@example.com",
      "avatar": "https://...",
      "address": {
        "street": "123 Rizal Street",
        "barangay": "Barangay Poblacion",
        "municipality": "Makati",
        "province": "Metro Manila",
        "region": "NCR",
        "postalCode": "1200"
      },
      "preferences": {
        "language": "en",
        "currency": "PHP",
        "notifications": {}
      }
    },
    "verification": {
      "phoneVerified": true,
      "emailVerified": true,
      "governmentIdVerified": true,
      "kycStatus": "approved"
    },
    "stats": {
      "totalTrips": 45,
      "rating": 4.8,
      "memberSince": "2024-01-15",
      "lifetimeSpent": 15750.00
    }
  }
}
```

#### Update User Profile
```http
PUT /users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Juan Carlos",
  "preferences": {
    "language": "tl",
    "notifications": {
      "tripUpdates": true,
      "promotions": false,
      "safety": true
    }
  }
}
```

### Document Verification APIs

#### Upload Government ID
```http
POST /users/{userId}/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "documentType": "drivers_license" | "passport" | "national_id" | "sss_id",
  "frontImage": File,
  "backImage": File, // optional for passport
  "metadata": {
    "documentNumber": "N01-23-456789",
    "expiryDate": "2029-12-31"
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "documentId": "doc_67890",
    "verificationStatus": "pending",
    "aiAnalysis": {
      "documentValid": true,
      "faceMatch": 0.95,
      "tamperingDetected": false,
      "extractedData": {
        "name": "JUAN DELA CRUZ",
        "documentNumber": "N01-23-456789",
        "expiryDate": "2029-12-31",
        "address": "123 RIZAL ST, MAKATI CITY"
      }
    },
    "estimatedReviewTime": "5-10 minutes"
  }
}
```

## Trip Management APIs

### Trip Booking & Management

#### Request Trip
```http
POST /trips/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "passengerId": "user_12345",
  "pickupLocation": {
    "address": "SM Mall of Asia, Pasay City",
    "coordinates": {
      "latitude": 14.5352,
      "longitude": 120.9722
    },
    "landmark": "Main Entrance"
  },
  "dropoffLocation": {
    "address": "Bonifacio Global City, Taguig",
    "coordinates": {
      "latitude": 14.5513,
      "longitude": 121.0514
    },
    "landmark": "High Street"
  },
  "vehicleType": "sedan" | "suv" | "motorcycle" | "premium",
  "passengers": 2,
  "specialRequests": ["pet_friendly", "wheelchair_accessible"],
  "scheduledTime": "2025-08-30T14:30:00Z", // optional for future trips
  "paymentMethodId": "pm_12345"
}
```

```json
// Response
{
  "success": true,
  "data": {
    "tripId": "trip_abc123",
    "status": "searching",
    "fareEstimate": {
      "baseFare": 40.00,
      "distanceFare": 85.50,
      "timeFare": 15.00,
      "surgePricing": 1.2,
      "estimatedTotal": 168.60,
      "currency": "PHP"
    },
    "routeInfo": {
      "estimatedDistance": 12.5,
      "estimatedDuration": 25,
      "trafficCondition": "moderate"
    },
    "fraudAnalysis": {
      "riskScore": 0.15,
      "analysisTime": 85,
      "clearForBooking": true
    }
  }
}
```

#### Get Available Drivers
```http
GET /trips/{tripId}/available-drivers
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "availableDrivers": [
      {
        "driverId": "driver_789",
        "name": "Pedro Santos",
        "rating": 4.9,
        "totalTrips": 1250,
        "eta": 3, // minutes
        "distance": 0.8, // km
        "vehicle": {
          "make": "Toyota",
          "model": "Vios",
          "color": "White",
          "plateNumber": "ABC-1234"
        },
        "verificationBadges": ["background_verified", "vehicle_inspected"],
        "currentLocation": {
          "latitude": 14.5340,
          "longitude": 120.9710
        }
      }
    ],
    "searchRadius": 5.0,
    "estimatedMatchTime": 120 // seconds
  }
}
```

#### Accept Driver Match
```http
POST /trips/{tripId}/accept-driver
Authorization: Bearer {token}
Content-Type: application/json

{
  "driverId": "driver_789",
  "confirmationCode": "ABC123" // optional security code
}
```

#### Track Trip in Real-time
```http
GET /trips/{tripId}/tracking
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "tripId": "trip_abc123",
    "status": "en_route", // en_route | arrived | in_progress | completed
    "driver": {
      "currentLocation": {
        "latitude": 14.5365,
        "longitude": 120.9745
      },
      "heading": 45,
      "speed": 25, // km/h
      "eta": 2 // minutes to pickup
    },
    "route": {
      "currentProgress": 0.75, // 75% complete
      "deviationFromPlanned": 0.1, // km
      "trafficDelays": 3 // minutes
    },
    "safetyStatus": {
      "routeNormal": true,
      "speedAppropriate": true,
      "locationSharing": true,
      "emergencyContactsNotified": false
    }
  }
}
```

### Trip History & Analytics

#### Get Trip History
```http
GET /users/{userId}/trips?page=1&limit=20&status=completed
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "trips": [
      {
        "tripId": "trip_abc123",
        "date": "2025-08-29T14:30:00Z",
        "driver": {
          "name": "Pedro Santos",
          "rating": 4.9,
          "vehicle": "White Toyota Vios (ABC-1234)"
        },
        "route": {
          "pickup": "SM Mall of Asia",
          "dropoff": "BGC High Street",
          "distance": 12.5,
          "duration": 28
        },
        "fare": {
          "total": 175.50,
          "breakdown": {
            "base": 40.00,
            "distance": 85.50,
            "time": 15.00,
            "surge": 35.00
          }
        },
        "rating": 5,
        "receipt": "https://receipts.ops-tower.ph/trip_abc123"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalTrips": 45
    },
    "analytics": {
      "totalSpent": 15750.00,
      "averageFare": 350.00,
      "averageRating": 4.8,
      "favoriteRoutes": [
        "Home to Office",
        "Mall to Home"
      ]
    }
  }
}
```

## Driver Management APIs

### Driver Operations

#### Driver Go Online/Offline
```http
POST /drivers/{driverId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "online" | "offline",
  "location": {
    "latitude": 14.5995,
    "longitude": 120.9842
  },
  "vehicleId": "vehicle_123",
  "preferredAreas": ["makati", "bgc", "ortigas"],
  "workingHours": {
    "start": "06:00",
    "end": "22:00"
  }
}
```

#### Get Trip Requests (Driver)
```http
GET /drivers/{driverId}/trip-requests
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "pendingRequests": [
      {
        "tripId": "trip_def456",
        "passenger": {
          "firstName": "Maria",
          "rating": 4.7,
          "totalTrips": 23
        },
        "pickup": {
          "address": "Greenbelt Mall, Makati",
          "distance": 1.2, // km from driver
          "eta": 4 // minutes
        },
        "dropoff": {
          "address": "NAIA Terminal 3",
          "estimatedDuration": 35
        },
        "fare": {
          "estimated": 285.00,
          "driverEarning": 228.00 // after platform fee
        },
        "specialRequests": [],
        "riskAnalysis": {
          "passengerRisk": 0.1,
          "routeRisk": 0.2,
          "overallSafe": true
        },
        "expiresIn": 25 // seconds to respond
      }
    ]
  }
}
```

#### Accept Trip Request (Driver)
```http
POST /drivers/{driverId}/accept-trip
Authorization: Bearer {token}
Content-Type: application/json

{
  "tripId": "trip_def456",
  "confirmationCode": "DEF789",
  "estimatedArrival": 4 // minutes
}
```

### Driver Earnings & Analytics

#### Get Driver Earnings
```http
GET /drivers/{driverId}/earnings?period=week&date=2025-08-25
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "period": "week",
    "dateRange": {
      "start": "2025-08-25",
      "end": "2025-08-31"
    },
    "summary": {
      "totalEarnings": 8750.00,
      "tripsCompleted": 45,
      "hoursOnline": 32.5,
      "averagePerTrip": 194.44,
      "averagePerHour": 269.23
    },
    "breakdown": {
      "fareEarnings": 7200.00,
      "tips": 650.00,
      "bonuses": 900.00,
      "platformFee": -1250.00,
      "netEarnings": 7500.00
    },
    "dailyBreakdown": [
      {
        "date": "2025-08-25",
        "trips": 8,
        "earnings": 1450.00,
        "hours": 6.5
      }
    ],
    "payoutSchedule": {
      "nextPayout": "2025-09-02",
      "pendingAmount": 7500.00,
      "payoutMethod": "gcash"
    }
  }
}
```

## Fleet Management APIs

### Fleet Operations

#### Get Fleet Overview
```http
GET /fleets/{fleetId}/overview
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "fleetId": "fleet_xyz789",
    "operatorName": "Metro Transport Inc.",
    "ltfrbFranchise": "LTFRB-NCR-2024-001",
    "statistics": {
      "totalVehicles": 25,
      "activeVehicles": 18,
      "totalDrivers": 30,
      "onlineDrivers": 22,
      "ongoingTrips": 8,
      "todayRevenue": 15750.00,
      "monthlyRevenue": 425000.00
    },
    "compliance": {
      "ltfrbCompliant": true,
      "insuranceValid": true,
      "taxRegistration": true,
      "businessPermit": true,
      "lastAudit": "2025-07-15",
      "nextRenewal": "2025-12-31"
    },
    "performance": {
      "averageRating": 4.6,
      "completionRate": 0.96,
      "onTimeRate": 0.89,
      "incidentRate": 0.02
    }
  }
}
```

#### Manage Fleet Drivers
```http
GET /fleets/{fleetId}/drivers?status=active&page=1&limit=20
Authorization: Bearer {token}
```

```http
POST /fleets/{fleetId}/drivers/{driverId}/assign-vehicle
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleId": "vehicle_456",
  "startDate": "2025-09-01",
  "endDate": "2025-12-31", // optional
  "shift": "day" | "night" | "flexible"
}
```

#### Vehicle Management
```http
GET /fleets/{fleetId}/vehicles
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "vehicleId": "vehicle_456",
        "plateNumber": "ABC-1234",
        "make": "Toyota",
        "model": "Vios",
        "year": 2023,
        "color": "White",
        "status": "active" | "maintenance" | "retired",
        "assignedDriver": {
          "driverId": "driver_789",
          "name": "Pedro Santos",
          "since": "2025-01-15"
        },
        "compliance": {
          "registration": {
            "valid": true,
            "expiryDate": "2026-03-15"
          },
          "insurance": {
            "valid": true,
            "provider": "Mapfre Insurance",
            "expiryDate": "2025-11-30"
          },
          "emissions": {
            "valid": true,
            "expiryDate": "2025-09-20"
          }
        },
        "maintenance": {
          "lastService": "2025-08-15",
          "nextService": "2025-11-15",
          "mileage": 45680,
          "condition": "excellent"
        },
        "performance": {
          "tripsThisMonth": 145,
          "revenueThisMonth": 28500.00,
          "averageRating": 4.7,
          "utilizationRate": 0.78
        }
      }
    ]
  }
}
```

## Payment & Billing APIs

### Payment Processing

#### Add Payment Method
```http
POST /users/{userId}/payment-methods
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "gcash" | "paymaya" | "credit_card" | "debit_card",
  "details": {
    "accountNumber": "+639123456789", // for GCash/PayMaya
    "accountName": "Juan Dela Cruz",
    // For cards
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2029",
    "cvv": "123",
    "holderName": "JUAN DELA CRUZ"
  },
  "billingAddress": {
    "street": "123 Rizal Street",
    "city": "Makati",
    "province": "Metro Manila",
    "postalCode": "1200",
    "country": "Philippines"
  },
  "setAsDefault": true
}
```

#### Process Payment
```http
POST /payments/process
Authorization: Bearer {token}
Content-Type: application/json

{
  "tripId": "trip_abc123",
  "paymentMethodId": "pm_12345",
  "amount": 175.50,
  "currency": "PHP",
  "breakdown": {
    "baseFare": 40.00,
    "distanceFare": 85.50,
    "timeFare": 15.00,
    "surgePricing": 35.00,
    "tip": 0.00
  },
  "metadata": {
    "driverId": "driver_789",
    "vehicleId": "vehicle_456"
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "transactionId": "txn_ghi789",
    "status": "completed",
    "amount": 175.50,
    "currency": "PHP",
    "paymentMethod": "GCash",
    "fraudAnalysis": {
      "riskScore": 0.05,
      "verified": true,
      "processingTime": 95
    },
    "receipt": {
      "receiptId": "rcpt_jkl012",
      "birReceiptNumber": "BIR-2025-001234",
      "downloadUrl": "https://receipts.ops-tower.ph/rcpt_jkl012.pdf"
    },
    "settlement": {
      "driverPayout": 140.40, // 80% of fare
      "platformFee": 35.10, // 20% of fare
      "settlementDate": "2025-08-31"
    }
  }
}
```

### Billing & Receipts

#### Get Transaction History
```http
GET /users/{userId}/transactions?page=1&limit=20&type=payment
Authorization: Bearer {token}
```

#### Generate Tax Report
```http
GET /users/{userId}/tax-report?year=2025&quarter=Q3
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "reportId": "tax_2025_Q3_user_12345",
    "period": {
      "year": 2025,
      "quarter": "Q3",
      "dateRange": {
        "start": "2025-07-01",
        "end": "2025-09-30"
      }
    },
    "summary": {
      "totalTransactions": 45,
      "totalAmount": 15750.00,
      "vatAmount": 1890.00, // 12% VAT
      "netAmount": 13860.00
    },
    "breakdown": {
      "rideFares": 14250.00,
      "tips": 750.00,
      "fees": 750.00
    },
    "birCompliance": {
      "officialReceipts": 45,
      "totalWithholdingTax": 0.00,
      "quarterlyFiling": "completed"
    },
    "downloadUrl": "https://reports.ops-tower.ph/tax_2025_Q3_user_12345.pdf"
  }
}
```

## Location & Routing APIs

### Location Services

#### Geocoding & Reverse Geocoding
```http
GET /location/geocode?address=SM+Mall+of+Asia,+Pasay+City
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "results": [
      {
        "address": "SM Mall of Asia, J. W. Diokno Boulevard, Pasay, Metro Manila",
        "coordinates": {
          "latitude": 14.5352,
          "longitude": 120.9722
        },
        "components": {
          "street": "J. W. Diokno Boulevard",
          "barangay": "Barangay 76",
          "municipality": "Pasay City",
          "province": "Metro Manila",
          "region": "NCR"
        },
        "accuracy": "high",
        "confidence": 0.95
      }
    ]
  }
}
```

#### Route Calculation
```http
POST /location/route
Authorization: Bearer {token}
Content-Type: application/json

{
  "origin": {
    "latitude": 14.5352,
    "longitude": 120.9722
  },
  "destination": {
    "latitude": 14.5513,
    "longitude": 121.0514
  },
  "vehicleType": "sedan",
  "preferences": {
    "avoidTolls": false,
    "avoidTraffic": true,
    "preferMainRoads": true
  },
  "departureTime": "2025-08-30T14:30:00Z"
}
```

```json
// Response
{
  "success": true,
  "data": {
    "route": {
      "distance": 12.5, // km
      "duration": 25, // minutes
      "polyline": "encoded_polyline_string",
      "waypoints": [
        {
          "latitude": 14.5352,
          "longitude": 120.9722,
          "instruction": "Head north on J. W. Diokno Boulevard"
        }
      ]
    },
    "alternatives": [
      {
        "distance": 15.2,
        "duration": 22,
        "description": "Via SLEX - fastest route with toll"
      }
    ],
    "trafficCondition": "moderate",
    "estimatedFare": 168.60,
    "riskAssessment": {
      "routeRisk": 0.1,
      "floodRisk": 0.05,
      "crimeRisk": 0.15,
      "overallSafe": true
    }
  }
}
```

### Geofencing & Areas

#### Get Area Information
```http
GET /location/area-info?lat=14.5995&lon=120.9842
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "location": {
      "latitude": 14.5995,
      "longitude": 120.9842
    },
    "area": {
      "name": "Makati Central Business District",
      "type": "commercial",
      "barangay": "Barangay Poblacion",
      "municipality": "Makati City",
      "province": "Metro Manila",
      "region": "NCR"
    },
    "operatingRules": {
      "pickupAllowed": true,
      "dropoffAllowed": true,
      "surgePricingActive": true,
      "surgePricingMultiplier": 1.3,
      "restrictions": []
    },
    "safetyInfo": {
      "crimeRate": "low",
      "lightingQuality": "excellent",
      "policePresence": "high",
      "recommendedHours": "24/7"
    },
    "nearbyLandmarks": [
      {
        "name": "Ayala Museum",
        "distance": 0.3,
        "type": "museum"
      },
      {
        "name": "Greenbelt Mall",
        "distance": 0.5,
        "type": "shopping_mall"
      }
    ]
  }
}
```

## Safety & Emergency APIs

### Emergency Services

#### Trigger Emergency Alert
```http
POST /emergency/alert
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user_12345",
  "tripId": "trip_abc123", // optional
  "emergencyType": "medical" | "security" | "vehicle" | "general",
  "location": {
    "latitude": 14.5995,
    "longitude": 120.9842,
    "accuracy": 5
  },
  "message": "Need immediate help", // optional
  "severity": "low" | "medium" | "high" | "critical"
}
```

```json
// Response
{
  "success": true,
  "data": {
    "emergencyId": "emg_mno345",
    "status": "dispatched",
    "responseTime": "5-8 minutes",
    "responders": [
      {
        "type": "police",
        "station": "Makati Police Station",
        "eta": 6
      },
      {
        "type": "medical",
        "unit": "Red Cross Ambulance",
        "eta": 8
      }
    ],
    "trackingCode": "TRACK-12345",
    "emergencyContacts": [
      {
        "name": "Maria Cruz",
        "relationship": "mother",
        "notified": true
      }
    ]
  }
}
```

#### Get Safety Incidents
```http
GET /safety/incidents?userId={userId}&status=active
Authorization: Bearer {token}
```

### Safety Features

#### Share Trip Location
```http
POST /safety/share-trip
Authorization: Bearer {token}
Content-Type: application/json

{
  "tripId": "trip_abc123",
  "contacts": [
    {
      "name": "Maria Cruz",
      "phoneNumber": "+639987654321",
      "relationship": "mother"
    }
  ],
  "shareOptions": {
    "liveLocation": true,
    "driverInfo": true,
    "estimatedArrival": true,
    "routeProgress": true
  }
}
```

#### Report Safety Concern
```http
POST /safety/report
Authorization: Bearer {token}
Content-Type: application/json

{
  "tripId": "trip_abc123",
  "reportType": "driver_behavior" | "vehicle_condition" | "route_deviation" | "harassment",
  "description": "Driver was speeding and using phone while driving",
  "severity": "medium",
  "evidence": {
    "photos": ["base64_photo_1", "base64_photo_2"],
    "audioRecording": "base64_audio",
    "location": {
      "latitude": 14.5995,
      "longitude": 120.9842
    }
  }
}
```

## AI Fraud Detection APIs

### Real-time Fraud Analysis

#### Multi-Modal Fraud Analysis
```http
POST /ai/fraud/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user_12345",
  "sessionId": "session_abc123",
  "analysisType": "comprehensive" | "quick" | "targeted",
  "data": {
    "visualData": {
      "faceImage": "base64_encoded_image",
      "documentImage": "base64_encoded_image"
    },
    "audioData": {
      "voiceRecording": "base64_encoded_audio",
      "duration": 30
    },
    "behavioralData": {
      "keystrokePattern": [120, 95, 180, 75],
      "touchPattern": [{"x": 150, "y": 200, "pressure": 0.8}],
      "deviceUsage": {}
    },
    "locationData": {
      "currentLocation": {"lat": 14.5995, "lon": 120.9842},
      "locationHistory": []
    },
    "transactionData": {
      "amount": 175.50,
      "paymentMethod": "gcash",
      "timestamp": "2025-08-30T14:30:00Z"
    }
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "analysisId": "analysis_pqr678",
    "overallRiskScore": 0.15, // 0.0 - 1.0
    "authenticity": "genuine", // genuine | suspicious | fraudulent
    "confidence": 0.94,
    "primaryConcerns": [],
    "secondaryConcerns": ["new_device"],
    "modalityScores": {
      "visual": 0.05,
      "audio": 0.10,
      "behavioral": 0.20,
      "network": 0.08,
      "textual": 0.02
    },
    "crossModalCorrelations": {
      "visualAudioConsistency": 0.92,
      "behavioralAudioAlignment": 0.88,
      "networkBehavioralMatch": 0.85,
      "textualVisualCoherence": 0.90
    },
    "recommendations": [
      "Continue monitoring",
      "Standard verification sufficient"
    ],
    "emergencyFlags": [],
    "aiSystemsUsed": [
      "llm_analysis",
      "computer_vision",
      "audio_ai",
      "behavioral_biometrics",
      "multi_modal_fusion"
    ],
    "processingTime": 85, // milliseconds
    "timestamp": "2025-08-30T14:30:00Z"
  }
}
```

### Fraud Investigation Support

#### Start AI Investigation
```http
POST /ai/investigation/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "caseId": "case_stu901",
  "investigatorId": "inv_12345",
  "query": "Analyze suspicious transaction pattern for user_67890 in the last 30 days",
  "context": {
    "userId": "user_67890",
    "timeRange": "30d",
    "suspiciousIndicators": ["high_value_transactions", "unusual_locations"],
    "relatedCases": ["case_abc123", "case_def456"]
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "investigationId": "inv_vwx234",
    "status": "in_progress",
    "analysis": "Based on the transaction patterns, the user shows signs of coordinated fraud activity. Analysis reveals 15 high-value transactions in the past 30 days, with 80% occurring in unusual locations outside their normal activity zone...",
    "findings": [
      "Unusual location pattern detected",
      "Transaction amounts 300% above user average",
      "Coordinated timing with other flagged accounts",
      "Payment method inconsistencies"
    ],
    "recommendations": [
      "Immediate account review recommended",
      "Enhanced verification for future transactions",
      "Investigation of connected accounts",
      "Manual review of all transactions above ₱500"
    ],
    "riskAssessment": 0.85,
    "relatedPatterns": [
      "Coordinated fraud ring activity",
      "Synthetic identity indicators",
      "Money laundering patterns"
    ],
    "suggestedActions": [
      "Temporary account suspension",
      "Request additional identity verification",
      "Flag connected accounts for review",
      "Escalate to law enforcement if confirmed"
    ],
    "confidence": 0.91,
    "generatedAt": "2025-08-30T14:35:00Z"
  }
}
```

## Analytics & Reporting APIs

### Business Intelligence

#### Get Platform Analytics
```http
GET /analytics/platform?period=month&date=2025-08
Authorization: Bearer {token}
```

```json
// Response
{
  "success": true,
  "data": {
    "period": {
      "type": "month",
      "date": "2025-08",
      "dateRange": {
        "start": "2025-08-01",
        "end": "2025-08-31"
      }
    },
    "overview": {
      "totalTrips": 125000,
      "totalRevenue": 43750000.00,
      "activeUsers": 85000,
      "activeDrivers": 12500,
      "averageRating": 4.7,
      "completionRate": 0.96
    },
    "growth": {
      "tripsGrowth": 0.15, // 15% vs previous month
      "revenueGrowth": 0.18,
      "userGrowth": 0.08,
      "driverGrowth": 0.12
    },
    "fraudPrevention": {
      "fraudDetectionRate": 0.94,
      "falsePositiveRate": 0.02,
      "fraudLossesPrevented": 2150000.00,
      "aiSystemPerformance": {
        "overallAccuracy": 0.96,
        "averageResponseTime": 95
      }
    },
    "regionalBreakdown": {
      "ncr": {
        "trips": 75000,
        "revenue": 26250000.00,
        "growth": 0.12
      },
      "central_luzon": {
        "trips": 25000,
        "revenue": 8750000.00,
        "growth": 0.18
      },
      "central_visayas": {
        "trips": 15000,
        "revenue": 5250000.00,
        "growth": 0.22
      },
      "davao_region": {
        "trips": 10000,
        "revenue": 3500000.00,
        "growth": 0.25
      }
    }
  }
}
```

### Performance Reports

#### Generate Custom Report
```http
POST /analytics/reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportType": "fraud_analysis" | "driver_performance" | "revenue_analysis" | "user_behavior",
  "parameters": {
    "dateRange": {
      "start": "2025-08-01",
      "end": "2025-08-31"
    },
    "filters": {
      "region": "ncr",
      "userType": "all",
      "minRiskScore": 0.5
    },
    "metrics": [
      "total_incidents",
      "detection_rate",
      "false_positives",
      "response_time",
      "financial_impact"
    ],
    "format": "pdf" | "excel" | "json"
  }
}
```

## WebSocket Real-time APIs

### Real-time Event Streaming

#### Connection Endpoint
```
wss://ws.ops-tower.ph/v1/realtime?token={jwt_token}
```

#### Subscribe to Events
```json
{
  "action": "subscribe",
  "channels": [
    "trip_updates",
    "fraud_alerts", 
    "driver_location",
    "system_notifications"
  ],
  "filters": {
    "userId": "user_12345",
    "riskThreshold": 0.5
  }
}
```

#### Real-time Event Examples

**Trip Update Event**
```json
{
  "type": "trip_update",
  "tripId": "trip_abc123",
  "status": "driver_arrived",
  "data": {
    "driverLocation": {
      "latitude": 14.5995,
      "longitude": 120.9842
    },
    "eta": 0,
    "message": "Your driver has arrived"
  },
  "timestamp": "2025-08-30T14:30:00Z"
}
```

**Fraud Alert Event**
```json
{
  "type": "fraud_alert",
  "alertId": "alert_xyz789",
  "severity": "high",
  "data": {
    "userId": "user_67890",
    "riskScore": 0.87,
    "triggeringSystems": ["computer_vision", "behavioral_ai"],
    "location": {
      "latitude": 14.5995,
      "longitude": 120.9842
    },
    "actionRequired": true,
    "details": {
      "suspiciousPatterns": ["face_verification_failed", "unusual_device"],
      "recommendedAction": "immediate_verification"
    }
  },
  "timestamp": "2025-08-30T14:30:00Z"
}
```

## Error Handling & Status Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_NUMBER",
    "message": "The provided phone number format is invalid for Philippines",
    "details": {
      "field": "phoneNumber",
      "expectedFormat": "+639XXXXXXXXX",
      "providedValue": "09123456789"
    },
    "timestamp": "2025-08-30T14:30:00Z",
    "requestId": "req_abc123"
  },
  "suggestions": [
    "Ensure phone number starts with +63",
    "Remove any spaces or special characters",
    "Verify the number has 13 total digits"
  ]
}
```

## API Rate Limits

### Tier-based Limits
- **Free**: 100 requests/hour
- **Basic**: 1,000 requests/hour
- **Professional**: 10,000 requests/hour
- **Enterprise**: 100,000 requests/hour
- **Custom**: Unlimited with SLA

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

This comprehensive API documentation provides complete integration guidance for all platform services, from basic user management to advanced AI fraud detection capabilities, specifically tailored for the Philippines market.

---

**API Version**: v1.0  
**Documentation Updated**: 2025-08-30  
**Region**: Philippines  
**Compliance**: BSP, Data Privacy Act, LTFRB Regulations