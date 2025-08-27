// Fleet Management Types for Xpress Ops Tower
// Based on PostgreSQL schema for real-time fleet operations

import { BaseEntity, Location } from './common';

// =====================================================
// ENUMS - Matching Database Schema
// =====================================================

export type ServiceType = 
  | 'ride_4w'      // 4-wheel ride service
  | 'ride_2w'      // 2-wheel ride service  
  | 'send_delivery' // Package delivery
  | 'eats_delivery' // Food delivery
  | 'mart_delivery'; // Grocery delivery

export type DriverStatus = 
  | 'active'       // Currently available for bookings
  | 'busy'         // On an active trip/delivery
  | 'offline'      // Not accepting bookings
  | 'break'        // On scheduled break
  | 'maintenance'  // Vehicle maintenance
  | 'suspended'    // Account suspended
  | 'emergency';   // In emergency/SOS situation

export type BookingStatus = 
  | 'requested'    // Customer requested
  | 'searching'    // Looking for driver
  | 'assigned'     // Driver assigned
  | 'accepted'     // Driver accepted
  | 'en_route'     // Driver heading to pickup
  | 'arrived'      // Driver at pickup location
  | 'in_progress'  // Trip/delivery in progress
  | 'completed'    // Successfully completed
  | 'cancelled'    // Cancelled by customer/driver
  | 'failed'       // Failed to complete
  | 'no_show';     // Customer/merchant no-show

export type IncidentPriority = 
  | 'critical'     // Life-threatening, <30s response
  | 'high'         // Safety concern, <60s response
  | 'medium'       // Service issue, <5min response
  | 'low';         // General inquiry, <30min response

export type IncidentStatus = 
  | 'open'         // Just reported
  | 'acknowledged' // Operator aware
  | 'in_progress'  // Being handled
  | 'escalated'    // Escalated to emergency services
  | 'resolved'     // Successfully resolved
  | 'closed';      // Case closed

export type RegionStatus = 
  | 'active'       // Fully operational
  | 'limited'      // Limited operations (LGU restrictions)
  | 'suspended'    // Operations suspended
  | 'maintenance'; // System maintenance

// =====================================================
// REGION MANAGEMENT
// =====================================================

export interface Region extends BaseEntity {
  name: string;
  code: string; // Unique region code
  countryCode: string;
  timezone: string;
  
  // Geospatial data
  boundary?: GeoJSON.Polygon;
  centerPoint?: GeoJSON.Point;
  
  // Operational parameters
  status: RegionStatus;
  maxDrivers: number;
  surgeMultiplier: number;
  
  // LGU compliance
  lguRestrictions: Record<string, unknown>;
  operatingHours: {
    start: string;
    end: string;
  };
  specialZones: Array<{
    name: string;
    boundary: GeoJSON.Polygon;
    restrictions: string[];
  }>;
  
  isActive: boolean;
}

// =====================================================
// DRIVER MANAGEMENT
// =====================================================

export interface Driver extends BaseEntity {
  driverCode: string; // Unique driver identifier
  
  // Personal information
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone: string;
  dateOfBirth?: Date;
  
  // Address and regional assignment
  address: DriverAddress;
  regionId: string;
  
  // Service capabilities
  services: ServiceType[];
  primaryService: ServiceType;
  
  // Status and verification
  status: DriverStatus;
  verificationLevel: number; // 1-5 scale
  isVerified: boolean;
  backgroundCheckDate?: Date;
  
  // Performance metrics
  rating: number; // 1.00-5.00
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  
  // Financial information
  walletBalance: number;
  earningsToday: number;
  earningsWeek: number;
  earningsMonth: number;
  
  // Vehicle and licensing
  vehicleInfo: VehicleInfo;
  licenseInfo: LicenseInfo;
  
  // Documents and certifications
  documents: DriverDocuments;
  certifications: Certification[];
  
  // Activity tracking
  lastLogin?: Date;
  isActive: boolean;
}

export interface DriverAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode?: string;
  coordinates?: GeoJSON.Point;
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  color?: string;
  type: 'motorcycle' | 'tricycle' | 'car' | 'suv' | 'van';
  registrationNumber?: string;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
    expiryDate: Date;
  };
}

export interface LicenseInfo {
  licenseNumber?: string;
  licenseType?: string;
  expiryDate?: Date;
  restrictions?: string[];
}

export interface DriverDocuments {
  profilePhoto?: DocumentFile;
  validId?: DocumentFile;
  driversLicense?: DocumentFile;
  vehicleRegistration?: DocumentFile;
  insurance?: DocumentFile;
  clearanceRecords?: DocumentFile[];
}

export interface DocumentFile {
  id: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  status: 'pending' | 'verified' | 'rejected';
}

export interface Certification {
  name: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  documentUrl?: string;
}

// =====================================================
// REAL-TIME LOCATION TRACKING
// =====================================================

export interface DriverLocation extends BaseEntity {
  driverId: string;
  
  // Location data
  location: GeoJSON.Point;
  accuracy?: number; // GPS accuracy in meters
  altitude?: number;
  bearing?: number; // Direction 0-360 degrees
  speed?: number; // km/h
  
  // Address information
  address?: string;
  regionId?: string;
  
  // Status information
  driverStatus: DriverStatus;
  isAvailable: boolean;
  
  // Metadata
  recordedAt: Date;
  expiresAt: Date; // TTL for hot data cleanup (24 hours)
}

export interface LocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number;
  speed?: number;
  timestamp: Date;
}

// =====================================================
// BOOKING MANAGEMENT
// =====================================================

export interface Booking extends BaseEntity {
  bookingReference: string; // Unique booking reference
  
  // Service details
  serviceType: ServiceType;
  status: BookingStatus;
  
  // Customer information
  customerId: string;
  customerInfo: CustomerInfo;
  
  // Driver assignment
  driverId?: string;
  assignedAt?: Date;
  acceptedAt?: Date;
  
  // Location information
  pickupLocation: GeoJSON.Point;
  pickupAddress: string;
  dropoffLocation?: GeoJSON.Point;
  dropoffAddress?: string;
  
  // Regional compliance
  regionId: string;
  
  // Service-specific details
  serviceDetails: BookingServiceDetails;
  specialInstructions?: string;
  
  // Pricing and payment
  baseFare?: number;
  surgeMultiplier: number;
  totalFare?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  
  // Timeline tracking
  requestedAt: Date;
  estimatedPickupTime?: Date;
  actualPickupTime?: Date;
  estimatedCompletionTime?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Quality metrics
  customerRating?: number; // 1-5
  driverRating?: number; // 1-5
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  rating?: number;
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface BookingServiceDetails {
  // Ride-specific details
  passengerCount?: number;
  vehiclePreference?: string;
  
  // Delivery-specific details
  packageType?: string;
  packageWeight?: number;
  packageDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  recipientName?: string;
  recipientPhone?: string;
  deliveryInstructions?: string;
  
  // Food delivery specific
  restaurantName?: string;
  estimatedPrepTime?: number;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  
  // Special requirements
  requiresInsulation?: boolean;
  fragile?: boolean;
  priority?: 'normal' | 'urgent' | 'scheduled';
}

// =====================================================
// EMERGENCY/SOS INCIDENTS
// =====================================================

export interface Incident extends BaseEntity {
  incidentCode: string; // Unique incident identifier
  
  // Classification
  priority: IncidentPriority;
  status: IncidentStatus;
  incidentType: string;
  
  // Reporter information
  reporterType: 'driver' | 'customer' | 'system' | 'operator';
  reporterId: string;
  reporterContact?: string;
  
  // Driver involvement
  driverId?: string;
  bookingId?: string;
  
  // Location information
  location?: GeoJSON.Point;
  address?: string;
  regionId?: string;
  
  // Incident details
  title: string;
  description: string;
  attachments: IncidentAttachment[];
  
  // Response tracking
  acknowledgedAt?: Date;
  acknowledgedBy?: string; // operator who acknowledged
  firstResponseTime?: number; // seconds to first response
  resolutionTime?: number; // seconds to resolution
  
  // Escalation
  escalatedAt?: Date;
  escalatedTo?: string; // emergency services, management
  externalReference?: string; // police report, hospital case
  
  // Resolution
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpAssignedTo?: string;
}

export interface IncidentAttachment {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
}

// =====================================================
// PERFORMANCE METRICS
// =====================================================

export interface DriverPerformanceDaily extends BaseEntity {
  driverId: string;
  performanceDate: Date;
  regionId?: string;
  
  // Trip metrics
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  acceptanceRate: number; // percentage
  completionRate: number; // percentage
  
  // Time metrics
  onlineHours: number;
  drivingHours: number;
  idleHours: number;
  
  // Financial metrics
  grossEarnings: number;
  netEarnings: number;
  tipsReceived: number;
  
  // Quality metrics
  averageRating?: number;
  customerComplaints: number;
  safetyIncidents: number;
  
  // Distance metrics
  totalDistanceKm: number;
  billableDistanceKm: number;
}

export interface OperationalMetricsHourly extends BaseEntity {
  metricHour: Date;
  regionId?: string;
  
  // Driver metrics
  activeDrivers: number;
  availableDrivers: number;
  busyDrivers: number;
  
  // Booking metrics
  totalRequests: number;
  successfulBookings: number;
  cancelledBookings: number;
  averageWaitTime: number; // minutes
  
  // Service metrics by type
  ride4wRequests: number;
  ride2wRequests: number;
  deliveryRequests: number;
  
  // Performance metrics
  fulfillmentRate: number; // percentage
  averageResponseTime: number; // seconds
  systemUptime: number; // percentage
  
  // Emergency metrics
  sosIncidents: number;
  averageIncidentResponseTime: number; // seconds
}

// =====================================================
// REAL-TIME DATA STRUCTURES
// =====================================================

export interface AvailableDriver {
  id: string;
  driverCode: string;
  firstName: string;
  lastName: string;
  services: ServiceType[];
  status: DriverStatus;
  rating: number;
  location: GeoJSON.Point;
  address?: string;
  lastLocationUpdate: Date;
  regionName: string;
  regionCode: string;
  distanceFromPickup?: number; // in kilometers
  estimatedArrivalTime?: number; // in minutes
}

export interface ActiveBooking {
  id: string;
  bookingReference: string;
  serviceType: ServiceType;
  status: BookingStatus;
  pickupAddress: string;
  dropoffAddress?: string;
  driverId?: string;
  driverName?: string;
  createdAt: Date;
  estimatedPickupTime?: Date;
  regionName: string;
  waitTimeSeconds?: number;
}

export interface CriticalIncident {
  id: string;
  incidentCode: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  driverName?: string;
  location?: GeoJSON.Point;
  address?: string;
  regionName: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  responseTimeSeconds?: number;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateDriverRequest {
  driverCode: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone: string;
  dateOfBirth?: string; // ISO date string
  address: DriverAddress;
  regionId: string;
  services: ServiceType[];
  primaryService: ServiceType;
  vehicleInfo?: Partial<VehicleInfo>;
  licenseInfo?: Partial<LicenseInfo>;
}

export interface UpdateDriverRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  address?: Partial<DriverAddress>;
  services?: ServiceType[];
  primaryService?: ServiceType;
  status?: DriverStatus;
  vehicleInfo?: Partial<VehicleInfo>;
  licenseInfo?: Partial<LicenseInfo>;
}

export interface CreateBookingRequest {
  serviceType: ServiceType;
  customerId: string;
  customerInfo: CustomerInfo;
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  pickupAddress: string;
  dropoffLocation?: {
    latitude: number;
    longitude: number;
  };
  dropoffAddress?: string;
  regionId: string;
  serviceDetails?: Partial<BookingServiceDetails>;
  specialInstructions?: string;
  paymentMethod?: string;
}

export interface CreateIncidentRequest {
  priority: IncidentPriority;
  incidentType: string;
  reporterType: 'driver' | 'customer' | 'system' | 'operator';
  reporterId: string;
  reporterContact?: string;
  driverId?: string;
  bookingId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  regionId?: string;
  title: string;
  description: string;
}

export interface LocationTrackingFilters {
  regionId?: string;
  status?: DriverStatus[];
  isAvailable?: boolean;
  lastUpdatedSince?: Date;
  bounds?: {
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  };
}

export interface BookingFilters {
  serviceType?: ServiceType[];
  status?: BookingStatus[];
  regionId?: string;
  driverId?: string;
  customerId?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface IncidentFilters {
  priority?: IncidentPriority[];
  status?: IncidentStatus[];
  regionId?: string;
  driverId?: string;
  incidentType?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

// =====================================================
// ANALYTICS AND REPORTING
// =====================================================

export interface PerformanceMetrics {
  totalDrivers: number;
  activeDrivers: number;
  totalBookings: number;
  completedBookings: number;
  averageResponseTime: number;
  fulfillmentRate: number;
  averageRating: number;
  totalIncidents: number;
  criticalIncidents: number;
  systemUptime: number;
}

export interface RegionalMetrics {
  regionId: string;
  regionName: string;
  metrics: PerformanceMetrics;
  trends: {
    bookingsGrowth: number; // percentage
    driverGrowth: number; // percentage
    ratingTrend: number; // change in rating
    incidentTrend: number; // change in incidents
  };
}

export interface DriverAnalytics {
  driverId: string;
  performance: DriverPerformanceDaily[];
  rankings: {
    ratingRank: number;
    earningsRank: number;
    tripsRank: number;
    reliabilityRank: number;
  };
  insights: {
    peakHours: string[];
    preferredAreas: string[];
    serviceStrengths: ServiceType[];
    improvementAreas: string[];
  };
}