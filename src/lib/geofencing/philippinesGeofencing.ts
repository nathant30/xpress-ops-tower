/**
 * Philippines Geofencing System for Xpress Ops Tower
 * Location-based services, compliance zones, and regional management
 * Supports 7,641+ islands with specific regional regulations
 */

import { redis } from '@/lib/redis';
import { realtimeLocationTracker } from '@/lib/realtime/realtimeLocationTracker';
import { logger } from '@/lib/security/productionLogger';

export interface Geofence {
  id: string;
  name: string;
  description: string;
  type: 'circle' | 'polygon' | 'administrative';
  geometry: CircleGeometry | PolygonGeometry;
  properties: GeofenceProperties;
  rules: GeofenceRules;
  region: PhilippinesRegion;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CircleGeometry {
  center: { lat: number; lng: number };
  radius: number; // meters
}

export interface PolygonGeometry {
  coordinates: Array<{ lat: number; lng: number }>;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface GeofenceProperties {
  category: 'compliance' | 'business' | 'safety' | 'operational' | 'restricted';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timezone: string;
  currency: 'PHP';
  languages: string[];
  metadata: Record<string, any>;
}

export interface GeofenceRules {
  entry: GeofenceAction[];
  exit: GeofenceAction[];
  dwell: GeofenceAction[];
  dwellTime?: number; // seconds
  allowedVehicleTypes: ('2W' | '4W_CAR' | '4W_SUV' | '4W_TAXI')[];
  allowedHours?: {
    start: string; // "HH:mm"
    end: string;
  };
  restrictions?: {
    maxSpeed?: number; // km/h
    requiresPermit?: boolean;
    tollRequired?: boolean;
    environmentalRestrictions?: string[];
  };
  compliance?: {
    ltfrb?: boolean; // Land Transportation Franchising and Regulatory Board
    bir?: boolean;   // Bureau of Internal Revenue
    bsp?: boolean;   // Bangko Sentral ng Pilipinas
    dof?: boolean;   // Department of Finance
    lgus?: string[]; // Local Government Units
  };
}

export interface GeofenceAction {
  type: 'alert' | 'webhook' | 'notification' | 'fare_adjustment' | 'restriction' | 'compliance_check';
  target: 'driver' | 'passenger' | 'operator' | 'system';
  config: {
    message?: string;
    webhookUrl?: string;
    fareMultiplier?: number;
    restrictionType?: 'block' | 'warning' | 'require_approval';
    complianceChecks?: string[];
  };
}

export interface PhilippinesRegion {
  id: string;
  name: string;
  type: 'region' | 'province' | 'city' | 'municipality' | 'barangay';
  administrativeCode: string; // PSGC code
  parentRegion?: string;
  majorIsland: 'Luzon' | 'Visayas' | 'Mindanao';
  coordinates: {
    center: { lat: number; lng: number };
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  driverId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: { lat: number; lng: number };
  timestamp: number;
  vehicleType: string;
  additionalData: {
    speed?: number;
    bearing?: number;
    accuracy?: number;
    duration?: number; // for dwell events
  };
  triggeredActions: GeofenceActionResult[];
}

export interface GeofenceActionResult {
  actionType: string;
  status: 'success' | 'failed' | 'pending';
  result?: any;
  error?: string;
  timestamp: number;
}

class PhilippinesGeofencingService {
  private static instance: PhilippinesGeofencingService;
  private geofences = new Map<string, Geofence>();
  private activeEvents = new Map<string, GeofenceEvent>();
  private driverStates = new Map<string, Map<string, { insideGeofence: boolean; entryTime?: number }>>();

  constructor() {
    this.initializePhilippinesGeofences();
  }

  static getInstance(): PhilippinesGeofencingService {
    if (!PhilippinesGeofencingService.instance) {
      PhilippinesGeofencingService.instance = new PhilippinesGeofencingService();
    }
    return PhilippinesGeofencingService.instance;
  }

  /**
   * Initialize Philippines-specific geofences
   */
  private async initializePhilippinesGeofences(): Promise<void> {
    logger.info('Initializing Philippines geofencing system...');

    // Major airports
    await this.createAirportGeofences();
    
    // Business districts
    await this.createBusinessDistrictGeofences();
    
    // Tourist destinations
    await this.createTouristDestinationGeofences();
    
    // Compliance zones
    await this.createComplianceGeofences();
    
    // Safety and restricted areas
    await this.createSafetyGeofences();
    
    // Transportation hubs
    await this.createTransportationHubGeofences();

    logger.info(`Philippines geofencing initialized: ${this.geofences.size} geofences loaded`);
  }

  /**
   * Create airport geofences with special rules
   */
  private async createAirportGeofences(): Promise<void> {
    const airports = [
      {
        id: 'naia',
        name: 'Ninoy Aquino International Airport',
        location: { lat: 14.5086, lng: 121.0194 },
        region: 'ncr',
        terminals: 4
      },
      {
        id: 'clark',
        name: 'Clark International Airport',
        location: { lat: 15.1859, lng: 120.5603 },
        region: 'central_luzon',
        terminals: 1
      },
      {
        id: 'cebu_mactan',
        name: 'Mactan-Cebu International Airport',
        location: { lat: 10.3075, lng: 123.9792 },
        region: 'cebu',
        terminals: 2
      },
      {
        id: 'davao',
        name: 'Francisco Bangoy International Airport',
        location: { lat: 7.1253, lng: 125.6456 },
        region: 'davao',
        terminals: 1
      }
    ];

    for (const airport of airports) {
      const geofence: Geofence = {
        id: `airport_${airport.id}`,
        name: airport.name,
        description: `Airport zone with special pickup/dropoff regulations`,
        type: 'circle',
        geometry: {
          center: airport.location,
          radius: 2000 // 2km radius
        },
        properties: {
          category: 'compliance',
          priority: 'high',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl'],
          metadata: {
            airportCode: airport.id.toUpperCase(),
            terminals: airport.terminals,
            operatingHours: '24/7',
            specialFees: true
          }
        },
        rules: {
          entry: [
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `Entering ${airport.name}. Airport regulations apply. Additional fees may apply.`
              }
            },
            {
              type: 'fare_adjustment',
              target: 'system',
              config: {
                fareMultiplier: 1.2 // 20% airport surcharge
              }
            }
          ],
          exit: [
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: 'Exiting airport zone. Standard rates now apply.'
              }
            }
          ],
          dwell: [],
          dwellTime: 300, // 5 minutes
          allowedVehicleTypes: ['4W_CAR', '4W_SUV', '4W_TAXI'],
          restrictions: {
            maxSpeed: 30,
            requiresPermit: true,
            tollRequired: false
          },
          compliance: {
            ltfrb: true,
            bir: true
          }
        },
        region: this.getRegionData(airport.region),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Create business district geofences
   */
  private async createBusinessDistrictGeofences(): Promise<void> {
    const businessDistricts = [
      {
        id: 'makati_cbd',
        name: 'Makati Central Business District',
        coordinates: [
          { lat: 14.5547, lng: 121.0244 },
          { lat: 14.5640, lng: 121.0280 },
          { lat: 14.5598, lng: 121.0355 },
          { lat: 14.5505, lng: 121.0319 }
        ],
        region: 'ncr'
      },
      {
        id: 'bgc',
        name: 'Bonifacio Global City',
        coordinates: [
          { lat: 14.5515, lng: 121.0453 },
          { lat: 14.5599, lng: 121.0531 },
          { lat: 14.5469, lng: 121.0614 },
          { lat: 14.5385, lng: 121.0536 }
        ],
        region: 'ncr'
      },
      {
        id: 'cebu_it_park',
        name: 'Cebu IT Park',
        coordinates: [
          { lat: 10.3267, lng: 123.9066 },
          { lat: 10.3300, lng: 123.9100 },
          { lat: 10.3250, lng: 123.9150 },
          { lat: 10.3217, lng: 123.9116 }
        ],
        region: 'cebu'
      }
    ];

    for (const district of businessDistricts) {
      const bounds = this.calculateBounds(district.coordinates);
      
      const geofence: Geofence = {
        id: `business_${district.id}`,
        name: district.name,
        description: `Major business district with high demand`,
        type: 'polygon',
        geometry: {
          coordinates: district.coordinates,
          bounds
        },
        properties: {
          category: 'business',
          priority: 'high',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl'],
          metadata: {
            peakHours: ['07:00-09:00', '17:00-20:00'],
            avgWaitTime: 3,
            demandMultiplier: 1.5
          }
        },
        rules: {
          entry: [
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `Entering ${district.name}. High demand area - expect more ride requests.`
              }
            }
          ],
          exit: [],
          dwell: [
            {
              type: 'alert',
              target: 'system',
              config: {
                message: 'Driver dwelling in business district - potential high-value rides available'
              }
            }
          ],
          dwellTime: 600, // 10 minutes
          allowedVehicleTypes: ['2W', '4W_CAR', '4W_SUV', '4W_TAXI'],
          allowedHours: {
            start: '05:00',
            end: '23:00'
          }
        },
        region: this.getRegionData(district.region),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Create safety and restricted area geofences
   */
  private async createSafetyGeofences(): Promise<void> {
    const safetyZones = [
      {
        id: 'malacanang',
        name: 'Malacañang Palace Complex',
        location: { lat: 14.5958, lng: 120.9933 },
        radius: 500,
        restrictions: ['high_security', 'no_stopping', 'government_clearance_required']
      },
      {
        id: 'camp_crame',
        name: 'Camp Crame (PNP Headquarters)',
        location: { lat: 14.6104, lng: 121.0539 },
        radius: 300,
        restrictions: ['restricted_access', 'security_clearance']
      },
      {
        id: 'subic_bay',
        name: 'Subic Bay Freeport Zone',
        location: { lat: 14.8225, lng: 120.2711 },
        radius: 5000,
        restrictions: ['special_economic_zone', 'customs_area']
      }
    ];

    for (const zone of safetyZones) {
      const geofence: Geofence = {
        id: `safety_${zone.id}`,
        name: zone.name,
        description: `Restricted area with special security requirements`,
        type: 'circle',
        geometry: {
          center: zone.location,
          radius: zone.radius
        },
        properties: {
          category: 'safety',
          priority: 'critical',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl'],
          metadata: {
            restrictions: zone.restrictions,
            securityLevel: 'high',
            requiresEscort: true
          }
        },
        rules: {
          entry: [
            {
              type: 'alert',
              target: 'system',
              config: {
                message: `SECURITY ALERT: Driver entering restricted area ${zone.name}`
              }
            },
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `WARNING: You are entering a restricted security zone. Comply with all security requirements.`
              }
            },
            {
              type: 'compliance_check',
              target: 'system',
              config: {
                complianceChecks: ['security_clearance', 'vehicle_inspection', 'driver_background']
              }
            }
          ],
          exit: [
            {
              type: 'alert',
              target: 'system',
              config: {
                message: `Driver exited restricted area ${zone.name}`
              }
            }
          ],
          dwell: [],
          allowedVehicleTypes: ['4W_CAR', '4W_SUV', '4W_TAXI'],
          restrictions: {
            maxSpeed: 20,
            requiresPermit: true,
            environmentalRestrictions: ['no_photography', 'escort_required']
          },
          compliance: {
            ltfrb: true,
            bir: true
          }
        },
        region: this.getRegionData('ncr'),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Create compliance geofences for regulatory requirements
   */
  private async createComplianceGeofences(): Promise<void> {
    const complianceZones = [
      {
        id: 'manila_port',
        name: 'Port of Manila',
        location: { lat: 14.5833, lng: 120.9667 },
        radius: 1500,
        compliance: ['customs', 'port_authority', 'security_clearance']
      },
      {
        id: 'clark_freeport',
        name: 'Clark Freeport Zone',
        location: { lat: 15.1800, lng: 120.5600 },
        radius: 8000,
        compliance: ['special_economic_zone', 'customs', 'cdc_permit']
      }
    ];

    for (const zone of complianceZones) {
      const geofence: Geofence = {
        id: `compliance_${zone.id}`,
        name: zone.name,
        description: `Compliance zone with special regulatory requirements`,
        type: 'circle',
        geometry: {
          center: zone.location,
          radius: zone.radius
        },
        properties: {
          category: 'compliance',
          priority: 'high',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl'],
          metadata: {
            complianceRequirements: zone.compliance,
            operatingAuthority: 'Multiple agencies',
            specialProcedures: true
          }
        },
        rules: {
          entry: [
            {
              type: 'compliance_check',
              target: 'system',
              config: {
                complianceChecks: zone.compliance
              }
            },
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `Entering ${zone.name}. Compliance verification in progress.`
              }
            }
          ],
          exit: [],
          dwell: [],
          allowedVehicleTypes: ['4W_CAR', '4W_SUV', '4W_TAXI'],
          restrictions: {
            requiresPermit: true
          },
          compliance: {
            ltfrb: true,
            bir: true,
            bsp: zone.name.includes('Port'),
            dof: true
          }
        },
        region: this.getRegionData('ncr'),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Create transportation hub geofences
   */
  private async createTransportationHubGeofences(): Promise<void> {
    const transportHubs = [
      {
        id: 'edsa_busway',
        name: 'EDSA Busway Stations',
        coordinates: [
          // Simplified EDSA corridor
          { lat: 14.6500, lng: 121.0300 },
          { lat: 14.5300, lng: 121.0100 },
          { lat: 14.5250, lng: 121.0150 },
          { lat: 14.6450, lng: 121.0350 }
        ]
      },
      {
        id: 'lrt_mrt_network',
        name: 'LRT/MRT Network Buffer Zone',
        coordinates: [
          // Major train stations buffer
          { lat: 14.6080, lng: 121.0348 }, // North Avenue
          { lat: 14.5547, lng: 121.0244 }, // Ayala
          { lat: 14.5540, lng: 121.0300 }, // Buendia
          { lat: 14.6060, lng: 121.0380 }  // Quezon Ave
        ]
      }
    ];

    for (const hub of transportHubs) {
      const bounds = this.calculateBounds(hub.coordinates);
      
      const geofence: Geofence = {
        id: `transport_${hub.id}`,
        name: hub.name,
        description: `Transportation hub with integrated mobility services`,
        type: 'polygon',
        geometry: {
          coordinates: hub.coordinates,
          bounds
        },
        properties: {
          category: 'operational',
          priority: 'medium',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl'],
          metadata: {
            integratedTransport: true,
            parkingAvailable: false,
            peakUsage: ['06:00-09:00', '17:00-20:00']
          }
        },
        rules: {
          entry: [
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `Near public transport hub. Consider multimodal trip options.`
              }
            }
          ],
          exit: [],
          dwell: [],
          allowedVehicleTypes: ['2W', '4W_CAR', '4W_SUV', '4W_TAXI'],
          restrictions: {
            maxSpeed: 25
          }
        },
        region: this.getRegionData('ncr'),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Create tourist destination geofences
   */
  private async createTouristDestinationGeofences(): Promise<void> {
    const touristSpots = [
      {
        id: 'intramuros',
        name: 'Intramuros Historic District',
        location: { lat: 14.5889, lng: 120.9750 },
        radius: 800
      },
      {
        id: 'boracay_station1',
        name: 'Boracay White Beach Station 1',
        location: { lat: 11.9674, lng: 121.9248 },
        radius: 500
      },
      {
        id: 'bohol_chocolate_hills',
        name: 'Chocolate Hills Complex',
        location: { lat: 9.9333, lng: 124.1667 },
        radius: 2000
      }
    ];

    for (const spot of touristSpots) {
      const geofence: Geofence = {
        id: `tourist_${spot.id}`,
        name: spot.name,
        description: `Tourist destination with special services`,
        type: 'circle',
        geometry: {
          center: spot.location,
          radius: spot.radius
        },
        properties: {
          category: 'business',
          priority: 'medium',
          timezone: 'Asia/Manila',
          currency: 'PHP',
          languages: ['en', 'tl', 'es', 'ja', 'ko', 'zh'],
          metadata: {
            touristDestination: true,
            multilingualSupport: true,
            seasonalDemand: true,
            culturalSite: true
          }
        },
        rules: {
          entry: [
            {
              type: 'notification',
              target: 'driver',
              config: {
                message: `Entering ${spot.name}. Tourist area - multilingual support recommended.`
              }
            },
            {
              type: 'fare_adjustment',
              target: 'system',
              config: {
                fareMultiplier: 1.1 // 10% tourist area surcharge
              }
            }
          ],
          exit: [],
          dwell: [],
          allowedVehicleTypes: ['2W', '4W_CAR', '4W_SUV', '4W_TAXI'],
          allowedHours: {
            start: '06:00',
            end: '22:00'
          }
        },
        region: this.getRegionData(spot.id.includes('boracay') ? 'aklan' : 'ncr'),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.geofences.set(geofence.id, geofence);
      await redis.setex(`geofence:${geofence.id}`, 86400, JSON.stringify(geofence));
    }
  }

  /**
   * Check if a point is inside any geofences
   */
  async checkGeofences(
    driverId: string,
    location: { lat: number; lng: number },
    vehicleType: string
  ): Promise<GeofenceEvent[]> {
    const events: GeofenceEvent[] = [];
    
    for (const [geofenceId, geofence] of this.geofences.entries()) {
      if (!geofence.isActive) continue;

      const isCurrentlyInside = this.isPointInGeofence(location, geofence);
      const wasInside = await this.getDriverGeofenceState(driverId, geofenceId);

      let event: GeofenceEvent | null = null;

      if (!wasInside && isCurrentlyInside) {
        // Entry event
        event = await this.createGeofenceEvent(
          driverId, geofence, 'enter', location, vehicleType
        );
        await this.setDriverGeofenceState(driverId, geofenceId, true);
      } else if (wasInside && !isCurrentlyInside) {
        // Exit event
        event = await this.createGeofenceEvent(
          driverId, geofence, 'exit', location, vehicleType
        );
        await this.setDriverGeofenceState(driverId, geofenceId, false);
      } else if (wasInside && isCurrentlyInside) {
        // Check for dwell event
        const entryTime = await this.getDriverGeofenceEntryTime(driverId, geofenceId);
        const dwellTime = entryTime ? Date.now() - entryTime : 0;
        
        if (geofence.rules.dwellTime && dwellTime >= geofence.rules.dwellTime * 1000) {
          event = await this.createGeofenceEvent(
            driverId, geofence, 'dwell', location, vehicleType, dwellTime
          );
        }
      }

      if (event) {
        events.push(event);
        await this.processGeofenceEvent(event);
      }
    }

    return events;
  }

  /**
   * Helper methods
   */
  private isPointInGeofence(point: { lat: number; lng: number }, geofence: Geofence): boolean {
    if (geofence.type === 'circle') {
      const geometry = geofence.geometry as CircleGeometry;
      const distance = this.calculateDistance(
        point.lat, point.lng,
        geometry.center.lat, geometry.center.lng
      );
      return distance <= geometry.radius;
    } else if (geofence.type === 'polygon') {
      const geometry = geofence.geometry as PolygonGeometry;
      return this.isPointInPolygon(point, geometry.coordinates);
    }
    return false;
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
    const x = point.lat;
    const y = point.lng;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateBounds(coordinates: { lat: number; lng: number }[]): PolygonGeometry['bounds'] {
    let north = -90, south = 90, east = -180, west = 180;
    
    coordinates.forEach(coord => {
      north = Math.max(north, coord.lat);
      south = Math.min(south, coord.lat);
      east = Math.max(east, coord.lng);
      west = Math.min(west, coord.lng);
    });

    return { north, south, east, west };
  }

  private getRegionData(regionId: string): PhilippinesRegion {
    const regions: Record<string, PhilippinesRegion> = {
      'ncr': {
        id: 'ncr',
        name: 'National Capital Region',
        type: 'region',
        administrativeCode: '130000000',
        majorIsland: 'Luzon',
        coordinates: {
          center: { lat: 14.5995, lng: 121.0308 },
          bounds: { north: 14.8, south: 14.3, east: 121.2, west: 120.8 }
        }
      },
      'cebu': {
        id: 'cebu',
        name: 'Cebu Province',
        type: 'province',
        administrativeCode: '072200000',
        majorIsland: 'Visayas',
        coordinates: {
          center: { lat: 10.3157, lng: 123.8854 },
          bounds: { north: 11.3, south: 9.3, east: 124.5, west: 123.2 }
        }
      },
      'davao': {
        id: 'davao',
        name: 'Davao Region',
        type: 'region',
        administrativeCode: '110000000',
        majorIsland: 'Mindanao',
        coordinates: {
          center: { lat: 7.1907, lng: 125.4553 },
          bounds: { north: 8.5, south: 5.5, east: 126.5, west: 124.0 }
        }
      }
    };

    return regions[regionId] || regions['ncr'];
  }

  private async createGeofenceEvent(
    driverId: string,
    geofence: Geofence,
    eventType: 'enter' | 'exit' | 'dwell',
    location: { lat: number; lng: number },
    vehicleType: string,
    duration?: number
  ): Promise<GeofenceEvent> {
    const event: GeofenceEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      geofenceId: geofence.id,
      driverId,
      eventType,
      location,
      timestamp: Date.now(),
      vehicleType,
      additionalData: {
        duration: duration ? Math.floor(duration / 1000) : undefined
      },
      triggeredActions: []
    };

    // Execute actions
    const actions = geofence.rules[eventType];
    for (const action of actions) {
      const result = await this.executeGeofenceAction(action, event, geofence);
      event.triggeredActions.push(result);
    }

    this.activeEvents.set(event.id, event);
    await redis.setex(`geofence:event:${event.id}`, 3600, JSON.stringify(event));

    return event;
  }

  private async executeGeofenceAction(
    action: GeofenceAction,
    event: GeofenceEvent,
    geofence: Geofence
  ): Promise<GeofenceActionResult> {
    const result: GeofenceActionResult = {
      actionType: action.type,
      status: 'pending',
      timestamp: Date.now()
    };

    try {
      switch (action.type) {
        case 'alert':
          await redis.publish('system:alert', JSON.stringify({
            type: 'geofence_event',
            message: action.config.message,
            event,
            geofence
          }));
          result.status = 'success';
          break;

        case 'notification':
          await redis.publish(`driver:${event.driverId}:notification`, JSON.stringify({
            type: 'geofence_notification',
            message: action.config.message,
            timestamp: Date.now()
          }));
          result.status = 'success';
          break;

        case 'fare_adjustment':
          await redis.setex(
            `fare_adjustment:${event.driverId}`,
            3600,
            JSON.stringify({
              multiplier: action.config.fareMultiplier,
              reason: `Geofence: ${geofence.name}`,
              validUntil: Date.now() + 3600000
            })
          );
          result.status = 'success';
          break;

        case 'compliance_check':
          // Trigger compliance verification process
          await redis.publish('compliance:check', JSON.stringify({
            driverId: event.driverId,
            checks: action.config.complianceChecks,
            geofenceId: geofence.id,
            eventId: event.id
          }));
          result.status = 'success';
          break;

        default:
          result.status = 'failed';
          result.error = `Unknown action type: ${action.type}`;
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  private async processGeofenceEvent(event: GeofenceEvent): Promise<void> {
    // Publish event for real-time processing
    await redis.publish('geofence:events', JSON.stringify(event));
    
    logger.info(`Geofence event: Driver ${event.driverId} ${event.eventType} ${event.geofenceId}`);
  }

  private async getDriverGeofenceState(driverId: string, geofenceId: string): Promise<boolean> {
    const state = await redis.get(`driver:${driverId}:geofence:${geofenceId}`);
    return state === 'true';
  }

  private async setDriverGeofenceState(driverId: string, geofenceId: string, inside: boolean): Promise<void> {
    const key = `driver:${driverId}:geofence:${geofenceId}`;
    if (inside) {
      await redis.setex(key, 86400, 'true');
      await redis.setex(`${key}:entry_time`, 86400, Date.now().toString());
    } else {
      await redis.del(key);
      await redis.del(`${key}:entry_time`);
    }
  }

  private async getDriverGeofenceEntryTime(driverId: string, geofenceId: string): Promise<number | null> {
    const entryTime = await redis.get(`driver:${driverId}:geofence:${geofenceId}:entry_time`);
    return entryTime ? parseInt(entryTime) : null;
  }

  /**
   * Public API methods
   */
  async getActiveGeofences(): Promise<Geofence[]> {
    return Array.from(this.geofences.values()).filter(g => g.isActive);
  }

  async getGeofenceById(geofenceId: string): Promise<Geofence | null> {
    return this.geofences.get(geofenceId) || null;
  }

  async getGeofencesByRegion(regionId: string): Promise<Geofence[]> {
    return Array.from(this.geofences.values()).filter(g => g.region.id === regionId);
  }
}

// Export singleton instance
export const philippinesGeofencingService = PhilippinesGeofencingService.getInstance();
export default PhilippinesGeofencingService;