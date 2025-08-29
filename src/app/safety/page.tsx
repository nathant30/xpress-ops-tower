'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, FileText, Clock, User, Play, Pause, Download,
  Zap, Heart, AlertCircle, Route, DollarSign, Volume2,
  Filter, Search, X, Video, Image, Shield, Ban,
  CheckCircle, XCircle, Calendar, ArrowUpRight, ArrowDownRight,
  Eye, Lock, Hash, Shield as ShieldIcon, MapPin, Car,
  Star, MessageCircle, Navigation, Phone, Send
} from 'lucide-react';
import TripRouteMap from '@/components/TripRouteMap';

interface SafetyIncident {
  id: string;
  category: 'SOS' | 'HARASSMENT' | 'ACCIDENT' | 'ROUTE_DEVIATION' | 'MEDICAL' | 'VIOLENCE' | 'FRAUD' | 'PANIC' | 'SUSPICIOUS_BEHAVIOR';
  severity: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  timestamp: Date;
  responseDeadline: Date;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  assignedOperator: string;
  tripId: string;
  tripStatus: string;
  passengerName: string;
  passengerPhone: string;
  passengerId: string;
  passengerRating: number;
  passengerTrips: number;
  driverName: string;
  driverPhone: string;
  driverId: string;
  driverRating: number;
  driverTrips: number;
  vehicleInfo: {
    plateNumber: string;
    model: string;
    color: string;
    year: string;
  };
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    timestamp?: Date;
    speed?: number;
    heading?: number;
    accuracy?: number;
  };
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
    scheduledTime: Date;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address: string;
    estimatedTime: Date;
  };
  bookingTimeline: {
    id: string;
    timestamp: Date;
    event: string;
    details: string;
  }[];
  messages: {
    id: string;
    timestamp: Date;
    sender: 'DRIVER' | 'PASSENGER';
    type: 'TEXT' | 'VOICE' | 'SYSTEM';
    content: string;
    status?: 'SENT' | 'DELIVERED' | 'READ';
  }[];
  keywordFlags?: string[];
  riskScore?: number;
  predictedOutcome?: 'RESOLVED' | 'ESCALATED' | 'REQUIRES_INTERVENTION';
  similarIncidents?: number;
  patternAnalysis?: {
    isRecurring: boolean;
    riskFactors: string[];
    recommendations: string[];
  };
  intelligence?: {
    riskAssessment: {
      score: number;
      factors: string[];
      level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    predictions: {
      outcomeConfidence: number;
      estimatedDuration: number;
      resourcesNeeded: string[];
    };
    recommendations: {
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      action: string;
      reasoning: string;
    }[];
    patterns: {
      type: string;
      frequency: number;
      context: string;
    }[];
  };
}

const mockIncidents: SafetyIncident[] = [
  {
    id: 'INC-2024-001',
    category: 'SOS',
    severity: 5,
    priority: 'CRITICAL',
    description: 'Passenger activated emergency SOS button. No response to callback attempts.',
    timestamp: new Date('2024-08-29T08:35:00'),
    responseDeadline: new Date('2024-08-29T09:05:00'),
    status: 'ACTIVE',
    assignedOperator: 'Current Operator',
    tripId: 'TRIP-789012',
    tripStatus: 'IN_PROGRESS',
    passengerName: 'Maria Santos',
    passengerPhone: '+63 917 123 4567',
    passengerId: 'PASS-456',
    passengerRating: 4.8,
    passengerTrips: 127,
    driverName: 'Juan Cruz',
    driverPhone: '+63 917 987 6543',
    driverId: 'DRV-123',
    driverRating: 4.6,
    driverTrips: 892,
    vehicleInfo: {
      plateNumber: 'ABC 1234',
      model: 'Toyota Vios',
      color: 'White',
      year: '2022'
    },
    currentLocation: {
      lat: 14.5995,
      lng: 120.9842,
      address: 'EDSA Guadalupe, Makati City',
      speed: 45,
      timestamp: new Date('2024-08-29T08:36:15')
    },
    pickupLocation: {
      lat: 14.5547,
      lng: 121.0244,
      address: 'SM Megamall, Ortigas Center, Mandaluyong',
      scheduledTime: new Date('2024-08-29T08:30:00')
    },
    dropoffLocation: {
      lat: 14.6760,
      lng: 121.0437,
      address: 'Ninoy Aquino International Airport Terminal 3, Pasay',
      estimatedTime: new Date('2024-08-29T09:15:00')
    },
    bookingTimeline: [
      {
        id: 'timeline-1',
        timestamp: new Date('2024-08-29T08:15:00'),
        event: 'Booking Created',
        details: 'Passenger requested ride to NAIA Terminal 3'
      },
      {
        id: 'timeline-2',
        timestamp: new Date('2024-08-29T08:18:00'),
        event: 'Driver Assigned',
        details: 'Juan Cruz (DRV-123) accepted the booking'
      },
      {
        id: 'timeline-3',
        timestamp: new Date('2024-08-29T08:25:00'),
        event: 'Driver Arrived',
        details: 'Driver arrived at pickup location'
      },
      {
        id: 'timeline-4',
        timestamp: new Date('2024-08-29T08:30:00'),
        event: 'Trip Started',
        details: 'Passenger entered vehicle, trip commenced'
      },
      {
        id: 'timeline-5',
        timestamp: new Date('2024-08-29T08:35:00'),
        event: 'SOS ACTIVATED',
        details: 'Emergency button pressed by passenger'
      }
    ],
    messages: [
      {
        id: 'msg-1',
        timestamp: new Date('2024-08-29T08:20:00'),
        sender: 'DRIVER',
        type: 'TEXT',
        content: 'Good morning! I\'m on my way to pick you up. ETA 5 minutes.',
        status: 'READ'
      },
      {
        id: 'msg-2',
        timestamp: new Date('2024-08-29T08:22:00'),
        sender: 'PASSENGER',
        type: 'TEXT',
        content: 'Thank you! I\'ll be waiting at the main entrance.',
        status: 'READ'
      },
      {
        id: 'msg-3',
        timestamp: new Date('2024-08-29T08:25:00'),
        sender: 'DRIVER',
        type: 'TEXT',
        content: 'I\'m here at the pickup point. White Toyota Vios ABC 1234.',
        status: 'READ'
      },
      {
        id: 'msg-4',
        timestamp: new Date('2024-08-29T08:32:00'),
        sender: 'PASSENGER',
        type: 'TEXT',
        content: 'Driver seems agitated and is driving erratically.',
        status: 'DELIVERED'
      },
      {
        id: 'msg-5',
        timestamp: new Date('2024-08-29T08:34:00'),
        sender: 'PASSENGER',
        type: 'TEXT',
        content: 'He won\'t respond to my requests to slow down. Getting scared.',
        status: 'DELIVERED'
      }
    ],
    keywordFlags: ['EMERGENCY', 'HELP', 'SOS'],
    riskScore: 92,
    predictedOutcome: 'REQUIRES_INTERVENTION',
    similarIncidents: 3,
    patternAnalysis: {
      isRecurring: false,
      riskFactors: ['No response to callback', 'Location deviation', 'Night time'],
      recommendations: ['Immediate police dispatch', 'Driver interview', 'GPS tracking']
    },
    intelligence: {
      riskAssessment: {
        score: 92,
        factors: ['SOS activation', 'No callback response', 'Route deviation detected', 'High-risk area'],
        level: 'CRITICAL'
      },
      predictions: {
        outcomeConfidence: 85,
        estimatedDuration: 45,
        resourcesNeeded: ['Police unit', 'ERT medic', 'Vehicle inspection']
      },
      recommendations: [
        {
          priority: 'HIGH',
          action: 'Dispatch emergency services immediately',
          reasoning: 'SOS with no response indicates potential emergency'
        },
        {
          priority: 'HIGH', 
          action: 'Contact driver directly via multiple channels',
          reasoning: 'Verify driver status and get real-time situation update'
        },
        {
          priority: 'MEDIUM',
          action: 'Monitor GPS location continuously',
          reasoning: 'Track vehicle movement for emergency services coordination'
        }
      ],
      patterns: [
        {
          type: 'Route Deviation',
          frequency: 15,
          context: 'Similar incidents in this area during night hours'
        },
        {
          type: 'No Response',
          frequency: 8,
          context: 'Driver-passenger communication issues reported'
        }
      ]
    }
  }
];

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  timestamp?: Date;
  showInput?: boolean;
  notes?: string;
  guidance?: {
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    timeLimit?: number; // in minutes
    prerequisites?: string[];
    tips: string[];
    warnings?: string[];
    expectedOutcome: string;
    nextSteps?: string[];
  };
}

interface ERTStaff {
  id: string;
  name: string;
  role: string;
  status: 'AVAILABLE' | 'DISPATCHED' | 'BUSY';
  eta: string;
  location: string;
  skills: string[];
  certifications: string[];
}

interface IncidentWorkflow {
  [key: string]: ProcessStep[];
}

const ertStaffData: ERTStaff[] = [
  {
    id: 'ert-001',
    name: 'Captain Rodriguez',
    role: 'ERT Lead',
    status: 'AVAILABLE',
    eta: '4:30',
    location: 'Makati Hub',
    skills: ['Crisis Management', 'Medical Response', 'Tactical Coordination', 'Hostage Negotiation'],
    certifications: ['Advanced Life Support', 'Crisis Command', 'Emergency Medicine']
  },
  {
    id: 'ert-002', 
    name: 'Medic Santos',
    role: 'Emergency Medic',
    status: 'AVAILABLE',
    eta: '5:15',
    location: 'BGC Hub',
    skills: ['Emergency Medicine', 'Trauma Care', 'CPR/AED', 'Field Surgery'],
    certifications: ['Paramedic License', 'Advanced Cardiac Life Support', 'Pediatric Advanced Life Support']
  },
  {
    id: 'ert-003',
    name: 'Officer Chen',
    role: 'Security Specialist',
    status: 'DISPATCHED',
    eta: '3:45',
    location: 'En Route',
    skills: ['Tactical Response', 'De-escalation', 'Crowd Control', 'Emergency Driving'],
    certifications: ['Tactical Operations', 'Defensive Tactics', 'Emergency Vehicle Operations']
  },
  {
    id: 'ert-004',
    name: 'Tech Martinez',
    role: 'Communications',
    status: 'AVAILABLE', 
    eta: '6:00',
    location: 'Ortigas Hub',
    skills: ['Radio Operations', 'GPS Tracking', 'System Monitoring', 'Data Analysis'],
    certifications: ['Communications Systems', 'Emergency Dispatch', 'Technical Support']
  }
];

const incidentWorkflows: IncidentWorkflow = {
  'SOS': [
    {
      id: 'verify-sos',
      title: 'Verify SOS Signal',
      description: 'Confirm emergency signal authenticity and assess immediate threat level.',
      completed: false,
      guidance: {
        priority: 'CRITICAL',
        timeLimit: 2,
        tips: [
          'Check signal timestamp and GPS accuracy',
          'Review recent passenger activity patterns',
          'Look for multiple alarm triggers or patterns'
        ],
        warnings: [
          'Never dismiss SOS as false alarm without verification',
          'Treat all signals as genuine until proven otherwise'
        ],
        expectedOutcome: 'Confirmed emergency status and threat assessment',
        nextSteps: ['Initiate contact protocols', 'Alert response teams']
      }
    },
    {
      id: 'contact-passenger-sos',
      title: 'Contact Passenger',
      description: 'Attempt immediate contact via call, SMS, and in-app messaging.',
      completed: false,
      guidance: {
        priority: 'CRITICAL',
        timeLimit: 3,
        prerequisites: ['SOS signal verified'],
        tips: [
          'Use multiple channels simultaneously (call + SMS + app)',
          'Ask yes/no questions if response is limited',
          'Listen carefully for background sounds or distress indicators',
          'Use calm, reassuring tone to avoid panic'
        ],
        warnings: [
          'If no response in 60 seconds, escalate immediately',
          'Do not end call attempt prematurely',
          'Record all communication attempts'
        ],
        expectedOutcome: 'Passenger contact established or escalation triggered',
        nextSteps: ['Begin location tracking', 'Contact driver separately']
      }
    },
    {
      id: 'track-location-sos',
      title: 'Track Real-time Location',
      description: 'Monitor GPS coordinates and movement patterns continuously.',
      completed: false,
      guidance: {
        priority: 'HIGH',
        tips: [
          'Monitor for unusual route deviations',
          'Track speed variations and stops',
          'Screenshot GPS data every 2-3 minutes',
          'Note proximity to hospitals, police stations'
        ],
        warnings: [
          'Alert if vehicle moves to isolated areas',
          'Flag sudden speed changes or erratic movement'
        ],
        expectedOutcome: 'Continuous location monitoring with anomaly detection',
        nextSteps: ['Share location with emergency services', 'Prepare route history']
      }
    },
    {
      id: 'dispatch-ert-sos',
      title: 'Dispatch Emergency Response',
      description: 'Deploy appropriate ERT personnel and coordinate with local authorities.',
      completed: false,
      guidance: {
        priority: 'CRITICAL',
        timeLimit: 5,
        prerequisites: ['Location tracking active'],
        tips: [
          'Contact police emergency line with exact coordinates',
          'Provide vehicle details: make, model, plate number',
          'Share passenger and driver information',
          'Establish communication link with dispatchers'
        ],
        warnings: [
          'Ensure all relevant emergency services are notified',
          'Do not delay for additional information gathering'
        ],
        expectedOutcome: 'Emergency services dispatched with full situational awareness',
        nextSteps: ['Maintain communication', 'Document response times']
      }
    }
  ],
  'HARASSMENT': [
    {
      id: 'document-harassment',
      title: 'Document Incident',
      description: 'Record all available details, evidence, and witness statements.',
      completed: false
    },
    {
      id: 'separate-parties',
      title: 'Separate Involved Parties', 
      description: 'Ensure passenger safety by stopping trip and coordinating pickup.',
      completed: false
    },
    {
      id: 'support-victim',
      title: 'Provide Victim Support',
      description: 'Connect passenger with support resources and counseling.',
      completed: false
    },
    {
      id: 'investigate-harassment',
      title: 'Conduct Investigation',
      description: 'Interview parties, review evidence, and determine appropriate action.',
      completed: false
    }
  ],
  'ACCIDENT': [
    {
      id: 'assess-injuries',
      title: 'Assess Injuries',
      description: 'Determine medical assistance requirements and severity.',
      completed: false
    },
    {
      id: 'secure-scene',
      title: 'Secure Accident Scene',
      description: 'Ensure area safety and coordinate with traffic authorities.',
      completed: false
    },
    {
      id: 'medical-response',
      title: 'Coordinate Medical Response',
      description: 'Deploy medical personnel and prepare for hospital transport.',
      completed: false
    },
    {
      id: 'insurance-documentation',
      title: 'Document for Insurance',
      description: 'Collect all necessary documentation for insurance claims.',
      completed: false
    }
  ],
  'MEDICAL': [
    {
      id: 'assess-medical',
      title: 'Medical Assessment',
      description: 'Evaluate symptoms and determine urgency level.',
      completed: false
    },
    {
      id: 'first-aid-guidance',
      title: 'Provide First Aid Guidance',
      description: 'Guide driver/passenger through immediate care procedures.',
      completed: false
    },
    {
      id: 'ambulance-dispatch',
      title: 'Dispatch Medical Services',
      description: 'Coordinate ambulance and paramedic response.',
      completed: false
    },
    {
      id: 'hospital-coordination',
      title: 'Hospital Coordination',
      description: 'Arrange hospital admission and notify emergency contacts.',
      completed: false
    }
  ]
};

const IncidentManagementModal = ({ incident, onClose }: { incident: SafetyIncident; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [processNotes, setProcessNotes] = useState('');
  const [workflowStep, setWorkflowStep] = useState<1 | 2>(1);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [selectedERT, setSelectedERT] = useState<string[]>([]);

  const handleIncidentTypeSelect = (type: string) => {
    setSelectedIncidentType(type);
    const steps = incidentWorkflows[type] || incidentWorkflows['SOS'];
    setProcessSteps(steps.map(step => ({ ...step, completed: false, timestamp: undefined })));
    setWorkflowStep(2);
    setSelectedERT([]); // Reset ERT selection when changing incident type
  };

  const toggleStepCompletion = (stepIndex: number) => {
    const newSteps = [...processSteps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      completed: !newSteps[stepIndex].completed,
      timestamp: !newSteps[stepIndex].completed ? new Date() : undefined
    };
    setProcessSteps(newSteps);
  };

  const toggleERTSelection = (staffId: string) => {
    setSelectedERT(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const getERTStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500';
      case 'DISPATCHED': return 'bg-blue-500';
      case 'BUSY': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter and rank ERT staff based on incident type
  const getRelevantERTStaff = () => {
    if (!selectedIncidentType) return [];

    const skillPriority: { [key: string]: string[] } = {
      'SOS': ['Crisis Management', 'Tactical Response', 'De-escalation', 'Emergency Medicine'],
      'HARASSMENT': ['De-escalation', 'Crisis Management', 'Tactical Response', 'Communications'],
      'ACCIDENT': ['Emergency Medicine', 'Trauma Care', 'Medical Response', 'Field Surgery'],
      'MEDICAL': ['Emergency Medicine', 'Trauma Care', 'CPR/AED', 'Field Surgery', 'Medical Response']
    };

    const relevantSkills = skillPriority[selectedIncidentType] || [];
    
    return ertStaffData
      .map(staff => {
        // Calculate relevance score based on matching skills
        const matchingSkills = staff.skills.filter(skill => 
          relevantSkills.includes(skill)
        ).length;
        const relevanceScore = matchingSkills / relevantSkills.length;
        
        return {
          ...staff,
          relevanceScore,
          isRelevant: matchingSkills > 0
        };
      })
      .sort((a, b) => {
        // Sort by status (AVAILABLE first) then by relevance score
        if (a.status === 'AVAILABLE' && b.status !== 'AVAILABLE') return -1;
        if (b.status === 'AVAILABLE' && a.status !== 'AVAILABLE') return 1;
        return b.relevanceScore - a.relevanceScore;
      });
  };

  // Render tab content function
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 h-full flex flex-col">
            {/* Driver & Passenger Details */}
            <div className="grid grid-cols-2 gap-4">
              {/* Passenger Details */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Passenger
                  </h4>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white text-sm">{incident.passengerRating}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-white font-semibold">{incident.passengerName}</div>
                  <div className="text-blue-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {incident.passengerPhone}
                  </div>
                  <div className="text-gray-400 text-sm">ID: {incident.passengerId}</div>
                  <div className="text-gray-400 text-sm">{incident.passengerTrips} trips completed</div>
                </div>
              </div>

              {/* Driver Details */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Driver
                  </h4>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white text-sm">{incident.driverRating}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-white font-semibold">{incident.driverName}</div>
                  <div className="text-orange-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {incident.driverPhone}
                  </div>
                  <div className="text-gray-400 text-sm">ID: {incident.driverId}</div>
                  <div className="text-gray-400 text-sm">{incident.driverTrips} trips completed</div>
                  <div className="text-gray-400 text-sm">
                    {incident.vehicleInfo.color} {incident.vehicleInfo.year} {incident.vehicleInfo.model}
                  </div>
                  <div className="text-gray-400 text-sm font-mono">
                    Plate: {incident.vehicleInfo.plateNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Route & Map */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex-1">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Trip Route & Current Location
              </h4>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                {/* Route Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <div className="text-green-400 text-sm font-medium">Pickup Location</div>
                      <div className="text-white text-sm">{incident.pickupLocation.address}</div>
                      <div className="text-gray-400 text-xs">
                        Scheduled: {incident.pickupLocation.scheduledTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 animate-pulse"></div>
                    <div>
                      <div className="text-blue-400 text-sm font-medium">Current Location</div>
                      <div className="text-white text-sm">{incident.currentLocation.address}</div>
                      <div className="text-gray-400 text-xs">
                        Last updated: {incident.currentLocation.timestamp?.toLocaleTimeString()} • 
                        Speed: {incident.currentLocation.speed} km/h
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                    <div>
                      <div className="text-red-400 text-sm font-medium">Drop-off Location</div>
                      <div className="text-white text-sm">{incident.dropoffLocation.address}</div>
                      <div className="text-gray-400 text-xs">
                        ETA: {incident.dropoffLocation.estimatedTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Google Maps with Route */}
              <TripRouteMap
                pickupLocation={{
                  lat: incident.pickupLocation.lat,
                  lng: incident.pickupLocation.lng,
                  address: incident.pickupLocation.address
                }}
                currentLocation={{
                  lat: incident.currentLocation.lat,
                  lng: incident.currentLocation.lng,
                  address: incident.currentLocation.address,
                  speed: incident.currentLocation.speed
                }}
                dropoffLocation={{
                  lat: incident.dropoffLocation.lat,
                  lng: incident.dropoffLocation.lng,
                  address: incident.dropoffLocation.address
                }}
                className="h-64"
              />
            </div>

            {/* Timeline & Messages */}
            <div className="grid grid-cols-2 gap-4">
              {/* Booking Timeline */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Booking Timeline
                </h4>
                
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {incident.bookingTimeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          event.event === 'SOS ACTIVATED' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        {index < incident.bookingTimeline.length - 1 && (
                          <div className="w-0.5 h-8 bg-slate-600 mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${
                          event.event === 'SOS ACTIVATED' ? 'text-red-400' : 'text-white'
                        }`}>
                          {event.event}
                        </div>
                        <div className="text-xs text-gray-400">
                          {event.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                          {event.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Messages
                </h4>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {incident.messages.map((message) => (
                    <div key={message.id} className={`p-2 rounded-lg text-xs ${
                      message.sender === 'DRIVER' 
                        ? 'bg-orange-900/30 border-l-2 border-orange-500' 
                        : 'bg-blue-900/30 border-l-2 border-blue-500'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${
                          message.sender === 'DRIVER' ? 'text-orange-400' : 'text-blue-400'
                        }`}>
                          {message.sender}
                        </span>
                        <span className="text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-200">{message.content}</div>
                      {message.status && (
                        <div className={`text-xs mt-1 ${
                          message.status === 'READ' ? 'text-green-400' : 
                          message.status === 'DELIVERED' ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                          {message.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'evidence':
        return (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-base font-semibold text-white mb-4">Evidence & Documentation</h3>
              
              {/* Evidence Items */}
              <div className="space-y-4">
                <div className="border border-slate-600 rounded-lg p-3 bg-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-blue-400" />
                      <div>
                        <h4 className="text-sm font-medium text-white">Emergency Call Recording</h4>
                        <p className="text-xs text-gray-400">Duration: 0:02:34 • Quality: High</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <Play size={12} />
                      </button>
                      <button className="p-1 border border-slate-500 text-gray-300 rounded hover:bg-slate-600">
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-600 rounded p-3 mb-2">
                    <h5 className="text-xs font-medium text-white mb-1">AI Transcription</h5>
                    <p className="text-xs text-gray-300 italic">
                      "Help! Something's wrong with my driver. He's acting really strange and won't stop the car. 
                      I'm scared. We're on Highway 1 heading north... please send help!"
                    </p>
                    <div className="mt-1 text-xs text-gray-400">
                      Confidence: 94% • Auto-generated
                    </div>
                  </div>

                  <div className="border-t border-slate-600 pt-2">
                    <h5 className="text-xs font-medium text-white mb-1">Chain of Custody</h5>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>• <strong>Recorded:</strong> 29/08/2024, 08:35:12</div>
                      <div>• <strong>Hash:</strong> sha256:a1b2c3d4...</div>
                      <div>• <strong>Access:</strong> Emergency Response Team Only</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="h-full bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-4" />
              <div className="text-lg font-medium mb-2">Live Map</div>
              <div className="text-sm">Real-time location tracking</div>
              <div className="mt-4 text-xs">
                Current: {incident.currentLocation.address}
              </div>
            </div>
          </div>
        );

      case 'intelligence':
        return (
          <div className="space-y-4 h-full">
            {/* Operational Intelligence Header */}
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg border border-purple-600 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-400" />
                  Operational Intelligence
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300">AI Analysis Active</span>
                </div>
              </div>
              <div className="text-gray-300 text-sm">
                Real-time risk assessment and predictive analytics for incident response optimization
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Risk Assessment */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h4 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Assessment
                </h4>
                
                {incident.intelligence?.riskAssessment && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Risk Level</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        incident.intelligence.riskAssessment.level === 'CRITICAL' ? 'bg-red-600 text-white' :
                        incident.intelligence.riskAssessment.level === 'HIGH' ? 'bg-orange-600 text-white' :
                        incident.intelligence.riskAssessment.level === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {incident.intelligence.riskAssessment.level}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Risk Score</span>
                      <span className="text-white font-bold">{incident.intelligence.riskAssessment.score}/100</span>
                    </div>
                    
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          incident.intelligence.riskAssessment.score >= 80 ? 'bg-red-500' :
                          incident.intelligence.riskAssessment.score >= 60 ? 'bg-orange-500' :
                          incident.intelligence.riskAssessment.score >= 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${incident.intelligence.riskAssessment.score}%` }}
                      ></div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-white mb-2">Risk Factors</div>
                      <div className="space-y-1">
                        {incident.intelligence.riskAssessment.factors.map((factor, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                            <span className="text-gray-300">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Predictions & Analytics */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Predictions & Analytics
                </h4>
                
                {incident.intelligence?.predictions && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Outcome Confidence</span>
                      <span className="text-white font-bold">{incident.intelligence.predictions.outcomeConfidence}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Est. Duration</span>
                      <span className="text-white font-bold">{incident.intelligence.predictions.estimatedDuration} min</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Predicted Outcome</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        incident.predictedOutcome === 'REQUIRES_INTERVENTION' ? 'bg-red-600 text-white' :
                        incident.predictedOutcome === 'ESCALATED' ? 'bg-orange-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {incident.predictedOutcome?.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-white mb-2">Resources Needed</div>
                      <div className="space-y-1">
                        {incident.intelligence.predictions.resourcesNeeded.map((resource, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-300">{resource}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                AI Recommendations
              </h4>
              
              {incident.intelligence?.recommendations && (
                <div className="space-y-3">
                  {incident.intelligence.recommendations.map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      rec.priority === 'HIGH' ? 'bg-red-900/20 border-red-500' :
                      rec.priority === 'MEDIUM' ? 'bg-orange-900/20 border-orange-500' :
                      'bg-blue-900/20 border-blue-500'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-bold text-white">{rec.action}</h5>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          rec.priority === 'HIGH' ? 'bg-red-600 text-white' :
                          rec.priority === 'MEDIUM' ? 'bg-orange-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">{rec.reasoning}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Zap className="w-3 h-3" />
                        <span>AI-generated recommendation</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pattern Analysis */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Pattern Analysis
              </h4>
              
              {incident.intelligence?.patterns && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incident.intelligence.patterns.map((pattern, index) => (
                    <div key={index} className="bg-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-bold text-white">{pattern.type}</h5>
                        <span className="text-xs text-purple-400">
                          {pattern.frequency} occurrences
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">{pattern.context}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {incident.patternAnalysis && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-bold text-purple-400">Smart Analysis</h5>
                    <span className={`px-2 py-1 rounded text-xs ${
                      incident.patternAnalysis.isRecurring 
                        ? 'bg-red-600 text-white' 
                        : 'bg-green-600 text-white'
                    }`}>
                      {incident.patternAnalysis.isRecurring ? 'Recurring Pattern' : 'Isolated Incident'}
                    </span>
                  </div>
                  
                  {incident.patternAnalysis.riskFactors.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-white mb-1">Risk Factors Identified</div>
                      <div className="space-y-1">
                        {incident.patternAnalysis.riskFactors.map((factor, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                            <span className="text-gray-300">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {incident.patternAnalysis.recommendations.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-white mb-1">Pattern-Based Recommendations</div>
                      <div className="space-y-1">
                        {incident.patternAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            <span className="text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Historical Context */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Historical Context
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{incident.similarIncidents || 0}</div>
                  <div className="text-sm text-gray-400">Similar Incidents</div>
                  <div className="text-xs text-gray-500">Last 30 days</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{incident.riskScore || 0}</div>
                  <div className="text-sm text-gray-400">Risk Score</div>
                  <div className="text-xs text-gray-500">Real-time calculated</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {incident.intelligence?.predictions.outcomeConfidence || 0}%
                  </div>
                  <div className="text-sm text-gray-400">AI Confidence</div>
                  <div className="text-xs text-gray-500">Prediction accuracy</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">Tab Content</div>
              <div className="text-sm">Content for {activeTab} tab</div>
            </div>
          </div>
        );
    }
  };

  if (!incident) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[98%] h-[95%] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4 bg-red-600 border-b border-red-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-white" />
                <h1 className="text-lg font-bold text-white">
                  {incident.id} – {incident.category} Emergency
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white text-sm">
                <span className="font-medium">Severity: {incident.severity}/5</span>
                <span className="mx-2">|</span>
                <span>Active: {Math.floor((new Date().getTime() - incident.timestamp.getTime()) / (1000 * 60))}m {Math.floor(((new Date().getTime() - incident.timestamp.getTime()) % (1000 * 60)) / 1000)}s</span>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-red-700 rounded transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Workflow */}
          <div className="w-80 border-r border-slate-700 bg-slate-800 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Emergency Workflow</h3>
              <div className="text-xs text-gray-400 mt-1">
                Step {workflowStep} of 2
              </div>
            </div>

            {/* Step 1: Incident Type Selection */}
            {workflowStep === 1 && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Step 1: Select Incident Type</h4>
                  <div className="space-y-2">
                    {['SOS', 'HARASSMENT', 'ACCIDENT', 'MEDICAL'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleIncidentTypeSelect(type)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedIncidentType === type
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        <div className="font-medium">{type}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {type === 'SOS' && 'Emergency distress signal'}
                          {type === 'HARASSMENT' && 'Inappropriate behavior incident'}
                          {type === 'ACCIDENT' && 'Vehicle collision or damage'}
                          {type === 'MEDICAL' && 'Medical emergency situation'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Workflow Steps */}
            {workflowStep === 2 && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Step 2: {selectedIncidentType} Protocol</h4>
                    <button 
                      onClick={() => setWorkflowStep(1)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Change Type
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">
                      Progress: {processSteps.filter(s => s.completed).length}/{processSteps.length} completed
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${processSteps.length > 0 ? (processSteps.filter(s => s.completed).length / processSteps.length) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {processSteps.map((step, index) => (
                      <div key={step.id} className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        step.completed 
                          ? 'bg-green-900 border-green-600' 
                          : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer ${
                            step.completed
                              ? 'bg-green-500 text-white'
                              : 'border-2 border-white text-white hover:bg-white hover:text-slate-800'
                          }`} onClick={() => toggleStepCompletion(index)}>
                            {step.completed ? '✓' : (index + 1)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <h5 className={`text-sm font-bold ${
                                  step.completed ? 'text-green-100 line-through' : 'text-white'
                                }`}>
                                  {step.title}
                                </h5>
                                
                                {/* Priority & Time Indicators */}
                                {step.guidance && (
                                  <div className="flex items-center gap-1">
                                    {step.guidance.priority === 'CRITICAL' && (
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Critical Priority"></div>
                                    )}
                                    {step.guidance.timeLimit && !step.completed && (
                                      <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded font-medium">
                                        {step.guidance.timeLimit}min
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {step.timestamp && (
                                  <span className="text-xs text-green-300">
                                    ✓ {step.timestamp.toLocaleTimeString()}
                                  </span>
                                )}
                                {step.guidance && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Toggle guidance visibility (we'll track this in state)
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                    title="Show Guidance"
                                  >
                                    <Shield className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className={`text-xs leading-relaxed mb-2 ${
                              step.completed ? 'text-green-200' : 'text-gray-300'
                            }`}>
                              {step.description}
                            </p>
                            
                            {/* Guidance Panel - Always show for current active step */}
                            {step.guidance && !step.completed && index === 0 && (
                              <div className="mt-2 p-3 bg-slate-600 border border-slate-500 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-semibold text-blue-400">Workflow Guidance</span>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                                    step.guidance.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                                    step.guidance.priority === 'HIGH' ? 'bg-orange-600 text-white' :
                                    step.guidance.priority === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                                    'bg-blue-600 text-white'
                                  }`}>
                                    {step.guidance.priority}
                                  </span>
                                </div>
                                
                                {/* Prerequisites */}
                                {step.guidance.prerequisites && step.guidance.prerequisites.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-orange-400 mb-1">Prerequisites</div>
                                    <div className="space-y-1">
                                      {step.guidance.prerequisites.map((prereq, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                                          <span className="text-gray-300">{prereq}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Tips */}
                                {step.guidance.tips.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-green-400 mb-1">Best Practices</div>
                                    <div className="space-y-1">
                                      {step.guidance.tips.map((tip, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                                          <span className="text-gray-300">{tip}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Warnings */}
                                {step.guidance.warnings && step.guidance.warnings.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-red-400 mb-1">Critical Warnings</div>
                                    <div className="space-y-1">
                                      {step.guidance.warnings.map((warning, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5" />
                                          <span className="text-gray-300">{warning}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Expected Outcome */}
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-blue-400 mb-1">Expected Outcome</div>
                                  <div className="text-xs text-gray-300">{step.guidance.expectedOutcome}</div>
                                </div>
                                
                                {/* Next Steps */}
                                {step.guidance.nextSteps && step.guidance.nextSteps.length > 0 && (
                                  <div className="border-t border-slate-500 pt-2">
                                    <div className="text-xs font-medium text-purple-400 mb-1">After Completion</div>
                                    <div className="space-y-1">
                                      {step.guidance.nextSteps.map((nextStep, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <ArrowUpRight className="w-3 h-3 text-purple-400" />
                                          <span className="text-gray-300">{nextStep}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle Panel - Main Content */}
          <div className="flex-1 flex flex-col bg-slate-900">
            {/* Tab Navigation */}
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="flex gap-1">
                {[
                  { key: 'overview', label: 'Info' },
                  { key: 'map', label: 'Map' },
                  { key: 'evidence', label: 'Evidence' },
                  { key: 'intelligence', label: 'Intelligence' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderTabContent()}
            </div>
          </div>

          {/* Right Panel - ERT Response Team */}
          <div className="w-80 border-l border-slate-700 bg-slate-800 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">ERT Response Team</h3>
              {selectedIncidentType ? (
                <div className="text-xs text-gray-400 mt-1">
                  {selectedERT.length} selected • Optimized for {selectedIncidentType}
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1">
                  Select incident type to view relevant staff
                </div>
              )}
            </div>

            {/* ERT Staff Selection - Only show after incident type is selected */}
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedIncidentType ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <div className="text-sm text-gray-400 mb-2">ERT Selection Unavailable</div>
                    <div className="text-xs text-gray-500">
                      Complete Step 1 of the Emergency Workflow<br/>
                      to view relevant ERT staff
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="text-xs font-medium text-blue-400 mb-2">
                      Recommended for {selectedIncidentType} incidents
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {getRelevantERTStaff().map((staff) => (
                      <div key={staff.id} className="relative group">
                        <div
                          className={`p-3 bg-slate-700 border rounded-lg cursor-pointer transition-all ${
                            selectedERT.includes(staff.id)
                              ? 'border-blue-500 bg-blue-900/30'
                              : staff.status === 'AVAILABLE'
                                ? staff.isRelevant 
                                  ? 'border-green-500 hover:border-green-400 bg-green-900/10'
                                  : 'border-slate-600 hover:border-slate-500'
                                : staff.status === 'DISPATCHED'
                                  ? 'border-blue-600 bg-blue-900/20'
                                  : 'border-red-600 bg-red-900/20 cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => staff.status === 'AVAILABLE' && toggleERTSelection(staff.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getERTStatusColor(staff.status)}`}></div>
                              <div className="text-sm font-semibold text-white">{staff.name}</div>
                              {staff.isRelevant && staff.status === 'AVAILABLE' && (
                                <div className="w-2 h-2 rounded-full bg-yellow-400" title="Recommended"></div>
                              )}
                              {selectedERT.includes(staff.id) && (
                                <CheckCircle className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 mb-1">{staff.role}</div>
                          <div className="text-xs text-gray-300 mb-1">ETA: {staff.eta} • {staff.location}</div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {staff.skills.slice(0, 2).map((skill) => (
                              <span 
                                key={skill} 
                                className={`px-1.5 py-0.5 rounded text-xs ${
                                  selectedIncidentType && 
                                  {
                                    'SOS': ['Crisis Management', 'Tactical Response', 'De-escalation', 'Emergency Medicine'],
                                    'HARASSMENT': ['De-escalation', 'Crisis Management', 'Tactical Response', 'Communications'],
                                    'ACCIDENT': ['Emergency Medicine', 'Trauma Care', 'Medical Response', 'Field Surgery'],
                                    'MEDICAL': ['Emergency Medicine', 'Trauma Care', 'CPR/AED', 'Field Surgery', 'Medical Response']
                                  }[selectedIncidentType]?.includes(skill)
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-600 text-gray-300'
                                }`}
                              >
                                {skill}
                              </span>
                            ))}
                            {staff.skills.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-slate-600 text-gray-300 rounded text-xs">
                                +{staff.skills.length - 2} more
                              </span>
                            )}
                          </div>
                          
                          {staff.relevanceScore > 0 && (
                            <div className="mt-2 text-xs text-green-400">
                              {Math.round(staff.relevanceScore * 100)}% skill match
                            </div>
                          )}
                        </div>

                        {/* Enhanced Hover Tooltip */}
                        <div className="absolute left-full top-0 ml-2 w-72 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{staff.name}</div>
                              <div className="text-xs text-gray-400">{staff.role}</div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${getERTStatusColor(staff.status)}`}></div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="text-xs font-medium text-blue-400 mb-2">Skills & Expertise</div>
                            <div className="flex flex-wrap gap-1">
                              {staff.skills.map((skill) => {
                                const isRelevantSkill = selectedIncidentType && 
                                  {
                                    'SOS': ['Crisis Management', 'Tactical Response', 'De-escalation', 'Emergency Medicine'],
                                    'HARASSMENT': ['De-escalation', 'Crisis Management', 'Tactical Response', 'Communications'],
                                    'ACCIDENT': ['Emergency Medicine', 'Trauma Care', 'Medical Response', 'Field Surgery'],
                                    'MEDICAL': ['Emergency Medicine', 'Trauma Care', 'CPR/AED', 'Field Surgery', 'Medical Response']
                                  }[selectedIncidentType]?.includes(skill);
                                
                                return (
                                  <span 
                                    key={skill} 
                                    className={`px-2 py-1 rounded text-xs ${
                                      isRelevantSkill
                                        ? 'bg-green-600 text-white border border-green-500'
                                        : 'bg-slate-700 text-gray-300'
                                    }`}
                                  >
                                    {skill} {isRelevantSkill && '★'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="text-xs font-medium text-yellow-400 mb-2">Certifications</div>
                            <div className="space-y-1">
                              {staff.certifications.map((cert) => (
                                <div key={cert} className="text-xs text-gray-300 flex items-center">
                                  <Shield className="w-3 h-3 mr-1 text-yellow-500" />
                                  {cert}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-700">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Response Time:</span>
                              <span className="text-white font-medium">{staff.eta}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-gray-400">Location:</span>
                              <span className="text-white font-medium">{staff.location}</span>
                            </div>
                            {staff.relevanceScore > 0 && (
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-400">Match:</span>
                                <span className="text-green-400 font-medium">{Math.round(staff.relevanceScore * 100)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <button 
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                      disabled={selectedERT.length === 0}
                    >
                      Dispatch Selected ({selectedERT.length})
                    </button>
                    <button className="w-full px-4 py-2 bg-red-600 text-white rounded font-medium text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Emergency Dispatch All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Panel - Timeline & Notes */}
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Timeline & Notes</h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-300">
                  08:35 - SOS Activated by Passenger
                </div>
                <div className="text-xs text-gray-300">
                  08:36 - Callback attempt (no response)
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add note..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <button className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SafetyPage = () => {
  const [incidents, setIncidents] = useState<SafetyIncident[]>(mockIncidents);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ACTIVE');
  const [realTimeData, setRealTimeData] = useState({
    isConnected: false,
    lastUpdate: new Date(),
    incomingIncidents: [] as SafetyIncident[],
    liveStats: {
      activeIncidents: 1,
      averageResponseTime: 4.2,
      criticalAlerts: 1,
      resolvedToday: 12
    }
  });
  const [liveUpdates, setLiveUpdates] = useState<{
    id: string;
    type: 'NEW_INCIDENT' | 'STATUS_UPDATE' | 'LOCATION_UPDATE' | 'MESSAGE_RECEIVED';
    message: string;
    timestamp: Date;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  }[]>([]);

  // Simulate real-time WebSocket connection
  useEffect(() => {
    // Simulate connection establishment
    setRealTimeData(prev => ({ ...prev, isConnected: true }));
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({ ...prev, lastUpdate: new Date() }));
      
      // Simulate periodic live updates
      if (Math.random() > 0.7) {
        const updateTypes = ['STATUS_UPDATE', 'LOCATION_UPDATE', 'MESSAGE_RECEIVED'] as const;
        const severities = ['INFO', 'WARNING'] as const;
        const messages = [
          'Location update received from EMS-07',
          'Driver contacted - situation stable',
          'GPS coordinates updated - vehicle stopped',
          'Response time: 3.2 minutes',
          'ERT team dispatched to scene',
          'Passenger safety confirmed'
        ];
        
        const newUpdate = {
          id: `update-${Date.now()}`,
          type: updateTypes[Math.floor(Math.random() * updateTypes.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date(),
          severity: severities[Math.floor(Math.random() * severities.length)]
        };
        
        setLiveUpdates(prev => [newUpdate, ...prev.slice(0, 9)]); // Keep last 10 updates
      }
    }, 5000); // Update every 5 seconds

    // Simulate critical alerts occasionally
    const criticalInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        const criticalUpdate = {
          id: `critical-${Date.now()}`,
          type: 'NEW_INCIDENT' as const,
          message: 'NEW CRITICAL INCIDENT: SOS activated in BGC area',
          timestamp: new Date(),
          severity: 'CRITICAL' as const
        };
        
        setLiveUpdates(prev => [criticalUpdate, ...prev.slice(0, 9)]);
        
        // Update live stats
        setRealTimeData(prev => ({
          ...prev,
          liveStats: {
            ...prev.liveStats,
            criticalAlerts: prev.liveStats.criticalAlerts + 1,
            activeIncidents: prev.liveStats.activeIncidents + 1
          }
        }));
      }
    }, 15000); // Check every 15 seconds

    return () => {
      clearInterval(interval);
      clearInterval(criticalInterval);
      setRealTimeData(prev => ({ ...prev, isConnected: false }));
    };
  }, []);

  // Filter incidents based on search and filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesStatus = activeStatusFilter === 'ALL' || incident.status === activeStatusFilter;
      const matchesCategory = filterCategory === 'ALL' || incident.category === filterCategory;
      const matchesPriority = filterPriority === 'ALL' || incident.priority === filterPriority;
      const matchesSearch = searchTerm === '' || 
        incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.passengerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
    });
  }, [incidents, activeStatusFilter, filterCategory, filterPriority, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-red-600 bg-red-100';
      case 'INVESTIGATING': return 'text-yellow-600 bg-yellow-100';
      case 'RESOLVED': return 'text-green-600 bg-green-100';
      case 'ESCALATED': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SOS': return AlertTriangle;
      case 'HARASSMENT': return ShieldIcon;
      case 'ACCIDENT': return AlertCircle;
      case 'MEDICAL': return Heart;
      default: return Shield;
    }
  };

  return (
    <div className="space-y-6">
      {/* Modern SaaS Header with Visual Hierarchy */}
      <div className="space-y-4">
        {/* Title Row with Right-aligned Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Safety & Security</h1>
            <p className="text-base text-gray-500 mt-1">Real-time safety monitoring and emergency response coordination</p>
          </div>

          {/* Lightweight Search and Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search incidents, drivers, passengers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors w-80 placeholder-gray-400 h-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium h-10">
                <AlertTriangle className="w-4 h-4" />
                <span>Emergency Alert</span>
              </button>
              <div className={`flex items-center text-sm bg-green-50 px-3 py-2.5 rounded-lg border border-green-200 h-10 ${
                realTimeData.isConnected ? 'text-green-700' : 'text-red-700 bg-red-50 border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  realTimeData.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className="font-medium">{realTimeData.isConnected ? 'All Systems Operational' : 'System Issues'}</span>
              </div>
            </div>
          </div>
        </div>
          
        {/* Enhanced Tab Navigation with Better Spacing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActiveStatusFilter('ACTIVE')}
              className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeStatusFilter === 'ACTIVE' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Active</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium min-w-[28px] text-center ${
                activeStatusFilter === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {incidents.filter(i => i.status === 'ACTIVE').length}
              </span>
            </button>
            <button 
              onClick={() => setActiveStatusFilter('INVESTIGATING')}
              className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeStatusFilter === 'INVESTIGATING' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Investigating</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium min-w-[28px] text-center ${
                activeStatusFilter === 'INVESTIGATING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {incidents.filter(i => i.status === 'INVESTIGATING').length}
              </span>
            </button>
            <button 
              onClick={() => setActiveStatusFilter('RESOLVED')}
              className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeStatusFilter === 'RESOLVED' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Resolved</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium min-w-[28px] text-center ${
                activeStatusFilter === 'RESOLVED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {incidents.filter(i => i.status === 'RESOLVED').length}
              </span>
            </button>
            <button 
              onClick={() => setActiveStatusFilter('ESCALATED')}
              className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                activeStatusFilter === 'ESCALATED' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Escalated</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium min-w-[28px] text-center ${
                activeStatusFilter === 'ESCALATED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {incidents.filter(i => i.status === 'ESCALATED').length}
              </span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-600 hover:text-gray-900 border border-gray-200 h-10">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                realTimeData.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                Real-time System: <span className={`font-semibold ${realTimeData.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {realTimeData.isConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Active Incidents:</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md font-semibold">
                  {realTimeData.liveStats.activeIncidents}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Avg Response:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-semibold">
                  {realTimeData.liveStats.averageResponseTime}min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Resolved Today:</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-semibold">
                  {realTimeData.liveStats.resolvedToday}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Updated: {realTimeData.lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Incidents (2/3) + Real-time Updates (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Incidents Table (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Incident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Passenger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIncidents.map((incident) => {
                    const CategoryIcon = getCategoryIcon(incident.category);
                    return (
                      <tr 
                        key={incident.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button className="mr-3 text-gray-400 hover:text-gray-600">
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{incident.id}</div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {incident.category}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{incident.passengerName}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <Star className="w-3 h-3 mr-1 text-yellow-400 fill-current" />
                              {incident.passengerRating}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{incident.driverName}</div>
                            <div className="text-xs text-gray-500">{incident.vehicleInfo.plateNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{incident.currentLocation.address}</div>
                          <div className="text-xs text-gray-500">
                            {incident.timestamp.toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            incident.status === 'ACTIVE' ? 'bg-red-100 text-red-800' :
                            incident.status === 'INVESTIGATING' ? 'bg-yellow-100 text-yellow-800' :
                            incident.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(incident.priority)}`}>
                            {incident.priority}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {incident.predictedOutcome === 'REQUIRES_INTERVENTION' ? 'High Risk' :
                             incident.predictedOutcome === 'ESCALATED' ? 'May Escalate' : 'Manageable'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedIncident(incident);
                            }}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Real-time Updates (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Real-time Updates
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">
                      Last update: {realTimeData.lastUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setLiveUpdates([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {liveUpdates.length > 0 ? (
                liveUpdates.map((update) => (
                  <div key={update.id} className={`px-6 py-3 border-b border-gray-100 last:border-b-0 ${
                    update.severity === 'CRITICAL' ? 'bg-red-50 border-l-4 border-l-red-500' :
                    update.severity === 'WARNING' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            update.type === 'NEW_INCIDENT' ? 'bg-red-100 text-red-800' :
                            update.type === 'STATUS_UPDATE' ? 'bg-blue-100 text-blue-800' :
                            update.type === 'LOCATION_UPDATE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {update.type.replace('_', ' ')}
                          </div>
                          <span className={`w-2 h-2 rounded-full ${
                            update.severity === 'CRITICAL' ? 'bg-red-500 animate-pulse' :
                            update.severity === 'WARNING' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></span>
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{update.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{update.timestamp.toLocaleTimeString()}</span>
                          <span>•</span>
                          <span className="capitalize">{update.severity.toLowerCase()} priority</span>
                        </div>
                      </div>
                      
                      {update.severity === 'CRITICAL' && (
                        <button className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No recent updates</p>
                  <p className="text-xs">Real-time updates will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Modal */}
      {selectedIncident && (
        <IncidentManagementModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
};

export default SafetyPage;