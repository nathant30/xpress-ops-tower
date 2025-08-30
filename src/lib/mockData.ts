// Mock Data Services for Xpress Ops Tower
import { 
  Driver, 
  Booking, 
  DriverLocation, 
  Incident, 
  Region,
  PerformanceMetrics,
  ServiceType,
  DriverStatus,
  BookingStatus,
  IncidentPriority,
  IncidentStatus
} from '@/types';

// Filter interfaces
interface DriverFilters {
  status?: DriverStatus;
  region?: string;
  serviceType?: ServiceType;
  vehicleType?: string;
  limit?: number;
  offset?: number;
}

interface BookingFilters {
  status?: BookingStatus;
  driverId?: string;
  passengerId?: string;
  region?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

interface LocationFilters {
  region?: string;
  status?: DriverStatus;
  limit?: number;
  lastUpdate?: Date;
}

interface IncidentFilters {
  priority?: IncidentPriority;
  status?: IncidentStatus;
  region?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

// Creation/update data types
interface CreateDriverData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  vehicleInfo?: Partial<Driver['vehicleInfo']>;
  regionId: string;
}

interface UpdateDriverData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  status?: DriverStatus;
  vehicleInfo?: Partial<Driver['vehicleInfo']>;
  regionId?: string;
  performanceMetrics?: Partial<PerformanceMetrics>;
}

interface CreateBookingData {
  passengerId: string;
  pickupLocation: { latitude: number; longitude: number; address: string };
  dropoffLocation: { latitude: number; longitude: number; address: string };
  serviceType: ServiceType;
  scheduledAt?: Date;
  notes?: string;
}

interface UpdateBookingData {
  status?: BookingStatus;
  driverId?: string;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  actualFare?: number;
  rating?: number;
  notes?: string;
}

interface UpdateLocationData {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  status?: DriverStatus;
}

interface CreateIncidentData {
  type: string;
  description: string;
  driverId?: string;
  bookingId?: string;
  location: { latitude: number; longitude: number; address?: string };
  priority: IncidentPriority;
  reportedBy: string;
}

// Mock regions data (Philippines focus)
export const mockRegions: Region[] = [
  {
    id: 'reg-001',
    name: 'Metro Manila',
    code: 'MM',
    countryCode: 'PH',
    timezone: 'Asia/Manila',
    status: 'active',
    maxDrivers: 10000,
    surgeMultiplier: 1.0,
    lguRestrictions: {},
    operatingHours: { start: '05:00', end: '23:00' },
    specialZones: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
  {
    id: 'reg-002',
    name: 'Cebu City',
    code: 'CC',
    countryCode: 'PH',
    timezone: 'Asia/Manila',
    status: 'active',
    maxDrivers: 5000,
    surgeMultiplier: 1.2,
    lguRestrictions: {},
    operatingHours: { start: '05:00', end: '22:00' },
    specialZones: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
];

// Mock users data for authentication
export const mockUsers = [
  {
    id: 'usr-demo',
    email: 'admin@xpress.ops',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'admin',
    password: '$2a$12$S.jxM4rEth04DGpK/Gsom.iLuJkRJv0AR5RmmAfoqeRz0H3xVINt6', // password: "demo123"
    regionId: 'reg-001',
    permissions: ['drivers:read', 'drivers:write', 'bookings:read', 'analytics:read', 'system:admin'],
    mfaEnabled: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-29'),
  },
  {
    id: 'usr-001',
    email: 'admin@xpress.ph',
    firstName: 'Maria',
    lastName: 'Santos',
    role: 'admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5h.dYmKqMC', // password: "admin123"
    regionId: 'reg-001',
    permissions: ['drivers:read', 'drivers:write', 'bookings:read', 'analytics:read', 'system:admin'],
    mfaEnabled: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
  {
    id: 'usr-002',
    email: 'dispatcher@xpress.ph',
    firstName: 'Jose',
    lastName: 'Rizal',
    role: 'dispatcher',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5h.dYmKqMC', // password: "admin123"
    regionId: 'reg-001',
    permissions: ['drivers:read', 'drivers:write', 'bookings:read', 'bookings:write'],
    mfaEnabled: true,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
  {
    id: 'usr-003',
    email: 'analyst@xpress.ph',
    firstName: 'Ana',
    lastName: 'Cruz',
    role: 'analyst',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5h.dYmKqMC', // password: "admin123"
    regionId: 'reg-001',
    permissions: ['drivers:read', 'bookings:read', 'analytics:read'],
    mfaEnabled: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
  {
    id: 'usr-004',
    email: 'safety@xpress.ph',
    firstName: 'Roberto',
    lastName: 'Del Rosario',
    role: 'safety_monitor',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5h.dYmKqMC', // password: "admin123"
    regionId: 'reg-001',
    permissions: ['drivers:read', 'incidents:read', 'incidents:write'],
    mfaEnabled: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  }
];

// Mock drivers data
export const mockDrivers: Driver[] = [
  {
    id: 'drv-001',
    driverCode: 'XPR001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    middleName: 'Santos',
    email: 'juan.delacruz@example.com',
    phone: '+639171234567',
    dateOfBirth: new Date('1990-05-15'),
    address: {
      street: '123 Rizal Street',
      barangay: 'Poblacion',
      city: 'Manila',
      province: 'Metro Manila',
      postalCode: '1000',
      coordinates: {
        type: 'Point',
        coordinates: [120.9822, 14.6042]
      }
    },
    regionId: 'reg-001',
    services: ['ride_4w', 'send_delivery'],
    primaryService: 'ride_4w',
    status: 'active',
    verificationLevel: 5,
    isVerified: true,
    backgroundCheckDate: new Date('2024-01-01'),
    rating: 4.8,
    totalTrips: 2547,
    completedTrips: 2456,
    cancelledTrips: 91,
    walletBalance: 12500.75,
    earningsToday: 1850.25,
    earningsWeek: 9500.50,
    earningsMonth: 42500.00,
    vehicleInfo: {
      make: 'Toyota',
      model: 'Vios',
      year: 2020,
      plateNumber: 'ABC-1234',
      color: 'White',
      type: 'car',
      registrationNumber: 'REG-001',
      insuranceDetails: {
        provider: 'Philippine AXA Life',
        policyNumber: 'POL-001',
        expiryDate: new Date('2025-12-31')
      }
    },
    licenseInfo: {
      licenseNumber: 'LIC-001',
      licenseType: 'Professional',
      expiryDate: new Date('2026-05-15'),
      restrictions: []
    },
    documents: {
      profilePhoto: {
        id: 'doc-001',
        filename: 'profile.jpg',
        url: '/uploads/profile.jpg',
        uploadedAt: new Date('2024-01-01'),
        verifiedAt: new Date('2024-01-02'),
        status: 'verified'
      }
    },
    certifications: [],
    lastLogin: new Date('2024-08-27T08:00:00Z'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-27'),
  },
  {
    id: 'drv-002',
    driverCode: 'XPR002',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@example.com',
    phone: '+639179876543',
    dateOfBirth: new Date('1985-10-22'),
    address: {
      street: '456 Quezon Avenue',
      barangay: 'Santo Domingo',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1104',
      coordinates: {
        type: 'Point',
        coordinates: [121.0437, 14.6760]
      }
    },
    regionId: 'reg-001',
    services: ['ride_2w', 'eats_delivery'],
    primaryService: 'ride_2w',
    status: 'busy',
    verificationLevel: 4,
    isVerified: true,
    rating: 4.9,
    totalTrips: 3242,
    completedTrips: 3180,
    cancelledTrips: 62,
    walletBalance: 8750.50,
    earningsToday: 2100.00,
    earningsWeek: 11200.25,
    earningsMonth: 38900.75,
    vehicleInfo: {
      make: 'Honda',
      model: 'Click',
      year: 2019,
      plateNumber: 'XYZ-5678',
      color: 'Blue',
      type: 'motorcycle',
    },
    licenseInfo: {
      licenseNumber: 'LIC-002',
      licenseType: 'Professional',
      expiryDate: new Date('2026-10-22'),
      restrictions: []
    },
    documents: {
      profilePhoto: {
        id: 'doc-002',
        filename: 'profile2.jpg',
        url: '/uploads/profile2.jpg',
        uploadedAt: new Date('2024-02-01'),
        verifiedAt: new Date('2024-02-02'),
        status: 'verified'
      }
    },
    certifications: [],
    lastLogin: new Date('2024-08-27T09:30:00Z'),
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-08-27'),
  }
];

// Mock driver locations
export const mockDriverLocations: DriverLocation[] = [
  {
    id: 'loc-001',
    driverId: 'drv-001',
    location: {
      type: 'Point',
      coordinates: [120.9822, 14.6042]
    },
    accuracy: 5,
    bearing: 45,
    speed: 25,
    address: 'Rizal Street, Manila',
    regionId: 'reg-001',
    driverStatus: 'active',
    isAvailable: true,
    recordedAt: new Date('2024-08-27T10:00:00Z'),
    expiresAt: new Date('2024-08-28T10:00:00Z'),
    createdAt: new Date('2024-08-27T10:00:00Z'),
    updatedAt: new Date('2024-08-27T10:00:00Z'),
  },
  {
    id: 'loc-002',
    driverId: 'drv-002',
    location: {
      type: 'Point',
      coordinates: [121.0437, 14.6760]
    },
    accuracy: 3,
    bearing: 180,
    speed: 30,
    address: 'Quezon Avenue, Quezon City',
    regionId: 'reg-001',
    driverStatus: 'busy',
    isAvailable: false,
    recordedAt: new Date('2024-08-27T10:05:00Z'),
    expiresAt: new Date('2024-08-28T10:05:00Z'),
    createdAt: new Date('2024-08-27T10:05:00Z'),
    updatedAt: new Date('2024-08-27T10:05:00Z'),
  }
];

// Mock bookings
export const mockBookings: Booking[] = [
  {
    id: 'bkg-001',
    bookingReference: 'XPR-20240827-001',
    serviceType: 'ride_4w',
    status: 'in_progress',
    customerId: 'cust-001',
    customerInfo: {
      name: 'Roberto Silva',
      phone: '+639181234567',
      email: 'roberto.silva@example.com',
      rating: 4.5
    },
    driverId: 'drv-002',
    assignedAt: new Date('2024-08-27T09:00:00Z'),
    acceptedAt: new Date('2024-08-27T09:01:00Z'),
    pickupLocation: {
      type: 'Point',
      coordinates: [121.0437, 14.6760]
    },
    pickupAddress: 'SM North EDSA, Quezon City',
    dropoffLocation: {
      type: 'Point',
      coordinates: [121.0170, 14.6537]
    },
    dropoffAddress: 'Ayala Triangle, Makati City',
    regionId: 'reg-001',
    serviceDetails: {
      passengerCount: 1,
      vehiclePreference: 'sedan'
    },
    baseFare: 150.00,
    surgeMultiplier: 1.0,
    totalFare: 285.50,
    paymentStatus: 'processing',
    paymentMethod: 'cash',
    requestedAt: new Date('2024-08-27T08:58:00Z'),
    estimatedPickupTime: new Date('2024-08-27T09:05:00Z'),
    actualPickupTime: new Date('2024-08-27T09:03:00Z'),
    estimatedCompletionTime: new Date('2024-08-27T09:45:00Z'),
    createdAt: new Date('2024-08-27T08:58:00Z'),
    updatedAt: new Date('2024-08-27T09:03:00Z'),
  },
  {
    id: 'bkg-002',
    bookingReference: 'XPR-20240827-002',
    serviceType: 'eats_delivery',
    status: 'completed',
    customerId: 'cust-002',
    customerInfo: {
      name: 'Ana Reyes',
      phone: '+639189876543',
      email: 'ana.reyes@example.com',
      rating: 4.8
    },
    driverId: 'drv-001',
    assignedAt: new Date('2024-08-27T07:30:00Z'),
    acceptedAt: new Date('2024-08-27T07:31:00Z'),
    pickupLocation: {
      type: 'Point',
      coordinates: [120.9822, 14.6042]
    },
    pickupAddress: 'McDonald\'s Rizal Avenue, Manila',
    dropoffLocation: {
      type: 'Point',
      coordinates: [120.9853, 14.6095]
    },
    dropoffAddress: 'University Belt, Manila',
    regionId: 'reg-001',
    serviceDetails: {
      restaurantName: 'McDonald\'s',
      estimatedPrepTime: 10,
      orderItems: [
        { name: 'Big Mac Meal', quantity: 1, price: 250.00 },
        { name: 'Apple Pie', quantity: 2, price: 35.00 }
      ]
    },
    baseFare: 45.00,
    surgeMultiplier: 1.0,
    totalFare: 65.00,
    paymentStatus: 'completed',
    paymentMethod: 'gcash',
    requestedAt: new Date('2024-08-27T07:28:00Z'),
    estimatedPickupTime: new Date('2024-08-27T07:45:00Z'),
    actualPickupTime: new Date('2024-08-27T07:43:00Z'),
    estimatedCompletionTime: new Date('2024-08-27T08:15:00Z'),
    completedAt: new Date('2024-08-27T08:12:00Z'),
    customerRating: 5,
    driverRating: 5,
    createdAt: new Date('2024-08-27T07:28:00Z'),
    updatedAt: new Date('2024-08-27T08:12:00Z'),
  }
];

// Mock incidents/alerts
export const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    incidentCode: 'SOS-20240827-001',
    priority: 'critical',
    status: 'in_progress',
    incidentType: 'SOS Alert',
    reporterType: 'driver',
    reporterId: 'drv-001',
    reporterContact: '+639171234567',
    driverId: 'drv-001',
    bookingId: 'bkg-001',
    location: {
      type: 'Point',
      coordinates: [121.0170, 14.6537]
    },
    address: 'Ayala Avenue, Makati City',
    regionId: 'reg-001',
    title: 'Driver Emergency - Vehicle Breakdown',
    description: 'Driver reported vehicle breakdown with passenger on board. Engine overheating, vehicle stopped safely.',
    attachments: [],
    acknowledgedAt: new Date('2024-08-27T09:15:30Z'),
    acknowledgedBy: 'op-001',
    firstResponseTime: 30,
    followUpRequired: true,
    followUpDate: new Date('2024-08-27T12:00:00Z'),
    createdAt: new Date('2024-08-27T09:15:00Z'),
    updatedAt: new Date('2024-08-27T09:15:30Z'),
  },
  {
    id: 'inc-002',
    incidentCode: 'REP-20240827-002',
    priority: 'medium',
    status: 'resolved',
    incidentType: 'Service Complaint',
    reporterType: 'customer',
    reporterId: 'cust-003',
    reporterContact: '+639185555555',
    driverId: 'drv-002',
    bookingId: 'bkg-003',
    title: 'Customer Complaint - Delayed Pickup',
    description: 'Customer reported driver was 15 minutes late for pickup. Driver apologized, trip completed without further issues.',
    attachments: [],
    acknowledgedAt: new Date('2024-08-26T14:20:00Z'),
    acknowledgedBy: 'op-002',
    firstResponseTime: 300,
    resolvedAt: new Date('2024-08-26T14:45:00Z'),
    resolvedBy: 'op-002',
    resolutionNotes: 'Spoke with both customer and driver. Driver was stuck in traffic due to accident on EDSA. Customer was offered service credit.',
    followUpRequired: false,
    createdAt: new Date('2024-08-26T14:15:00Z'),
    updatedAt: new Date('2024-08-26T14:45:00Z'),
  }
];

// Mock analytics data
export const mockPerformanceMetrics: PerformanceMetrics = {
  totalDrivers: 15420,
  activeDrivers: 8965,
  totalBookings: 45230,
  completedBookings: 42847,
  averageResponseTime: 180, // seconds
  fulfillmentRate: 94.7, // percentage
  averageRating: 4.7,
  totalIncidents: 23,
  criticalIncidents: 2,
  systemUptime: 99.8 // percentage
};

// Helper functions for mock data operations
export class MockDataService {
  // Driver operations
  static getDrivers(filters?: DriverFilters) {
    let drivers = [...mockDrivers];
    
    if (filters?.status) {
      drivers = drivers.filter(d => filters.status.includes(d.status));
    }
    
    if (filters?.region) {
      drivers = drivers.filter(d => d.regionId === filters.region);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      drivers = drivers.filter(d => 
        d.firstName.toLowerCase().includes(search) ||
        d.lastName.toLowerCase().includes(search) ||
        d.driverCode.toLowerCase().includes(search)
      );
    }
    
    return drivers;
  }
  
  static getDriverById(id: string) {
    return mockDrivers.find(d => d.id === id);
  }
  
  static createDriver(driverData: CreateDriverData): Driver {
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      ...driverData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDrivers.push(newDriver);
    return newDriver;
  }
  
  static updateDriver(id: string, updates: UpdateDriverData): Driver | null {
    const index = mockDrivers.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    mockDrivers[index] = {
      ...mockDrivers[index],
      ...updates,
      updatedAt: new Date()
    };
    return mockDrivers[index];
  }
  
  static deleteDriver(id: string): boolean {
    const index = mockDrivers.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    mockDrivers.splice(index, 1);
    return true;
  }
  
  // Booking operations
  static getBookings(filters?: BookingFilters) {
    let bookings = [...mockBookings];
    
    if (filters?.status) {
      bookings = bookings.filter(b => filters.status.includes(b.status));
    }
    
    if (filters?.serviceType) {
      bookings = bookings.filter(b => filters.serviceType.includes(b.serviceType));
    }
    
    if (filters?.driverId) {
      bookings = bookings.filter(b => b.driverId === filters.driverId);
    }
    
    return bookings;
  }
  
  static getBookingById(id: string) {
    return mockBookings.find(b => b.id === id);
  }
  
  static createBooking(bookingData: CreateBookingData): Booking {
    const newBooking: Booking = {
      id: `bkg-${Date.now()}`,
      bookingReference: `XPR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-3)}`,
      ...bookingData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockBookings.push(newBooking);
    return newBooking;
  }
  
  static updateBooking(id: string, updates: UpdateBookingData): Booking | null {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    mockBookings[index] = {
      ...mockBookings[index],
      ...updates,
      updatedAt: new Date()
    };
    return mockBookings[index];
  }
  
  // Location operations
  static getDriverLocations(filters?: LocationFilters) {
    let locations = [...mockDriverLocations];
    
    if (filters?.regionId) {
      locations = locations.filter(l => l.regionId === filters.regionId);
    }
    
    if (filters?.isAvailable !== undefined) {
      locations = locations.filter(l => l.isAvailable === filters.isAvailable);
    }
    
    if (filters?.status) {
      locations = locations.filter(l => filters.status.includes(l.driverStatus));
    }
    
    return locations;
  }
  
  static updateDriverLocation(driverId: string, locationData: UpdateLocationData): DriverLocation {
    const index = mockDriverLocations.findIndex(l => l.driverId === driverId);
    
    const updatedLocation: DriverLocation = {
      id: index >= 0 ? mockDriverLocations[index].id : `loc-${Date.now()}`,
      driverId,
      ...locationData,
      recordedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: index >= 0 ? mockDriverLocations[index].createdAt : new Date(),
      updatedAt: new Date(),
    };
    
    if (index >= 0) {
      mockDriverLocations[index] = updatedLocation;
    } else {
      mockDriverLocations.push(updatedLocation);
    }
    
    return updatedLocation;
  }
  
  // Incident/Alert operations
  static getIncidents(filters?: IncidentFilters) {
    let incidents = [...mockIncidents];
    
    if (filters?.priority) {
      incidents = incidents.filter(i => filters.priority.includes(i.priority));
    }
    
    if (filters?.status) {
      incidents = incidents.filter(i => filters.status.includes(i.status));
    }
    
    if (filters?.regionId) {
      incidents = incidents.filter(i => i.regionId === filters.regionId);
    }
    
    return incidents;
  }
  
  static getIncidentById(id: string) {
    return mockIncidents.find(i => i.id === id);
  }
  
  static createIncident(incidentData: CreateIncidentData): Incident {
    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      incidentCode: `${incidentData.priority?.toUpperCase() === 'CRITICAL' ? 'SOS' : 'REP'}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-3)}`,
      ...incidentData,
      attachments: [],
      followUpRequired: incidentData.priority === 'critical' || incidentData.priority === 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockIncidents.push(newIncident);
    return newIncident;
  }
  
  static updateIncident(id: string, updates: any): Incident | null {
    const index = mockIncidents.findIndex(i => i.id === id);
    if (index === -1) return null;
    
    mockIncidents[index] = {
      ...mockIncidents[index],
      ...updates,
      updatedAt: new Date()
    };
    return mockIncidents[index];
  }
  
  // Analytics operations
  static getPerformanceMetrics() {
    return mockPerformanceMetrics;
  }
  
  static getRegionalMetrics() {
    return mockRegions.map(region => ({
      regionId: region.id,
      regionName: region.name,
      metrics: mockPerformanceMetrics,
      trends: {
        bookingsGrowth: Math.random() * 20 - 10, // -10% to +10%
        driverGrowth: Math.random() * 15 - 5, // -5% to +10%
        ratingTrend: Math.random() * 0.4 - 0.2, // -0.2 to +0.2
        incidentTrend: Math.random() * 10 - 5, // -5 to +5
      }
    }));
  }

  // User authentication operations
  static getUserByEmail(email: string) {
    return mockUsers.find(u => u.email === email);
  }

  static getUserById(id: string) {
    return mockUsers.find(u => u.id === id);
  }

  static updateUserLastLogin(userId: string) {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
    }
  }

  static verifyMfaCode(userId: string, code: string): boolean {
    // Mock MFA verification - in real implementation, verify TOTP/SMS code
    const user = mockUsers.find(u => u.id === userId);
    if (!user || !user.mfaEnabled) return false;
    
    // Simple mock verification - accept any 6-digit code for demo
    return /^\d{6}$/.test(code);
  }

  static createUser(userData: any) {
    const newUser = {
      id: `usr-${Date.now()}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  }

  static updateUser(id: string, updates: any) {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    mockUsers[index] = {
      ...mockUsers[index],
      ...updates,
      updatedAt: new Date()
    };
    return mockUsers[index];
  }
}