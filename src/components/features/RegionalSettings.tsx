// Xpress Ops Tower - Regional Settings Interface
// LGU compliance controls and regional configuration

'use client';

import React, { useState } from 'react';
import { 
  MapPin, Shield, Clock, DollarSign, FileText, Users, 
  AlertTriangle, CheckCircle, Settings, Save, RefreshCw,
  Phone, Mail, Building2, Scale, Calendar, Info, Edit,
  Flag, Globe, Car, CreditCard, Bell
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';

interface RegionalSettingsProps {
  regionId: string;
  userRole?: 'admin' | 'operator' | 'supervisor';
}

interface LGURegion {
  id: string;
  name: string;
  type: 'city' | 'municipality' | 'province' | 'region';
  parentId?: string;
  isActive: boolean;
  settings: RegionSettings;
}

interface RegionSettings {
  // Basic Information
  officialName: string;
  abbreviation: string;
  timezone: string;
  currency: string;
  language: string;
  
  // Contact Information
  contactInfo: {
    address: string;
    phone: string;
    email: string;
    website?: string;
    emergencyContact: string;
  };
  
  // Operational Settings
  operationalHours: {
    start: string;
    end: string;
    days: string[];
  };
  
  // Compliance Settings
  compliance: {
    permitRequired: boolean;
    permitNumber?: string;
    permitExpiry?: string;
    franchiseRequired: boolean;
    franchiseNumber?: string;
    franchiseExpiry?: string;
    ltfrb: {
      required: boolean;
      certificateNumber?: string;
      validUntil?: string;
    };
    lto: {
      required: boolean;
      registrationRequired: boolean;
      orCrRequired: boolean;
    };
  };
  
  // Fare Structure
  fareStructure: {
    basefare: number;
    minimumFare: number;
    perKmRate: number;
    perMinuteRate: number;
    surcharges: {
      nightTime: number; // percentage
      holiday: number; // percentage
      airport: number; // flat fee
      toll: boolean; // pass through
    };
    maximumFare?: number;
  };
  
  // Driver Requirements
  driverRequirements: {
    minimumAge: number;
    driversLicenseRequired: boolean;
    professionalLicenseRequired: boolean;
    medicalCertificateRequired: boolean;
    drugTestRequired: boolean;
    criminalBackgroundCheck: boolean;
    trainingRequired: boolean;
    trainingHours?: number;
  };
  
  // Vehicle Requirements
  vehicleRequirements: {
    minimumYear: number;
    maximumAge: number; // in years
    insuranceRequired: boolean;
    comprehensiveInsurance: boolean;
    inspectionRequired: boolean;
    inspectionInterval: number; // in months
    emissionTestRequired: boolean;
    gpsRequired: boolean;
    dashcamRequired: boolean;
    panicButtonRequired: boolean;
  };
  
  // Service Areas
  serviceAreas: {
    allowedZones: string[];
    restrictedZones: string[];
    airportAccess: boolean;
    expresswayAccess: boolean;
    interCityTravel: boolean;
  };
  
  // Emergency Response
  emergencyResponse: {
    enabled: boolean;
    responseTimeTarget: number; // in minutes
    escalationLevels: string[];
    contactNumbers: string[];
    hospitalList: string[];
    policeStations: string[];
  };
  
  // Reporting Requirements
  reporting: {
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    incidentReporting: boolean;
    revenueReporting: boolean;
    contactPerson: string;
    submissionDeadline: string;
    submissionMethod: 'email' | 'portal' | 'physical';
  };
}

export const RegionalSettings: React.FC<RegionalSettingsProps> = ({
  regionId,
  userRole = 'operator'
}) => {
  const [selectedTab, setSelectedTab] = useState<'general' | 'compliance' | 'fares' | 'requirements' | 'emergency'>('general');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Mock region data - would come from API
  const [regionSettings, setRegionSettings] = useState<LGURegion>({
    id: 'NCR-MM-001',
    name: 'Metro Manila',
    type: 'region',
    isActive: true,
    settings: {
      officialName: 'National Capital Region - Metro Manila',
      abbreviation: 'NCR-MM',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      language: 'Filipino/English',
      
      contactInfo: {
        address: 'City Hall, Ermita, Manila, Metro Manila 1000',
        phone: '+63 2 8527 4961',
        email: 'transport@manila.gov.ph',
        website: 'https://manila.gov.ph',
        emergencyContact: '+63 2 8527 0000'
      },
      
      operationalHours: {
        start: '05:00',
        end: '23:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      
      compliance: {
        permitRequired: true,
        permitNumber: 'TNC-2024-MM-001',
        permitExpiry: '2024-12-31',
        franchiseRequired: true,
        franchiseNumber: 'FR-MM-2024-001',
        franchiseExpiry: '2024-12-31',
        ltfrb: {
          required: true,
          certificateNumber: 'LTFRB-NCR-2024-001',
          validUntil: '2024-12-31'
        },
        lto: {
          required: true,
          registrationRequired: true,
          orCrRequired: true
        }
      },
      
      fareStructure: {
        basefare: 40,
        minimumFare: 40,
        perKmRate: 13.50,
        perMinuteRate: 2.00,
        surcharges: {
          nightTime: 20, // 20% surcharge
          holiday: 15, // 15% surcharge
          airport: 50, // ₱50 flat fee
          toll: true
        },
        maximumFare: 2000
      },
      
      driverRequirements: {
        minimumAge: 21,
        driversLicenseRequired: true,
        professionalLicenseRequired: true,
        medicalCertificateRequired: true,
        drugTestRequired: true,
        criminalBackgroundCheck: true,
        trainingRequired: true,
        trainingHours: 40
      },
      
      vehicleRequirements: {
        minimumYear: 2015,
        maximumAge: 10,
        insuranceRequired: true,
        comprehensiveInsurance: true,
        inspectionRequired: true,
        inspectionInterval: 6,
        emissionTestRequired: true,
        gpsRequired: true,
        dashcamRequired: true,
        panicButtonRequired: true
      },
      
      serviceAreas: {
        allowedZones: ['NCR', 'Metro Manila', 'Rizal', 'Cavite', 'Laguna', 'Bulacan'],
        restrictedZones: ['Military Bases', 'Private Subdivisions'],
        airportAccess: true,
        expresswayAccess: true,
        interCityTravel: true
      },
      
      emergencyResponse: {
        enabled: true,
        responseTimeTarget: 10,
        escalationLevels: ['Support', 'Supervisor', 'Emergency Services', 'LGU Contact'],
        contactNumbers: ['+63 2 8527 0000', '+63 917 837 4642'],
        hospitalList: ['Manila General Hospital', 'Philippine General Hospital', 'St. Luke\'s Medical Center'],
        policeStations: ['Manila Police District', 'Makati Police Station', 'BGC Police Substation']
      },
      
      reporting: {
        dailyReports: true,
        weeklyReports: true,
        monthlyReports: true,
        incidentReporting: true,
        revenueReporting: true,
        contactPerson: 'Regional Transport Officer',
        submissionDeadline: '5th of following month',
        submissionMethod: 'portal'
      }
    }
  });

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setHasChanges(false);
  };

  // Update setting handler
  const updateSetting = (path: string, value: any) => {
    setRegionSettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated.settings as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return updated;
    });
    setHasChanges(true);
  };

  // Get compliance status
  const getComplianceStatus = () => {
    const { compliance } = regionSettings.settings;
    const now = new Date();
    
    let status: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
    
    // Check permit expiry
    if (compliance.permitRequired && compliance.permitExpiry) {
      const permitExpiry = new Date(compliance.permitExpiry);
      const daysUntilExpiry = Math.floor((permitExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        status = 'non_compliant';
      } else if (daysUntilExpiry < 30) {
        status = 'warning';
      }
    }
    
    return status;
  };

  const complianceStatus = getComplianceStatus();

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'fares', label: 'Fare Structure', icon: DollarSign },
    { id: 'requirements', label: 'Requirements', icon: FileText },
    { id: 'emergency', label: 'Emergency Response', icon: AlertTriangle }
  ];

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center space-x-2">
              <Flag className="h-6 w-6 text-blue-600" />
              <span>Regional Settings</span>
            </h1>
            <p className="text-neutral-600 mt-1">
              {regionSettings.settings.officialName} ({regionSettings.settings.abbreviation})
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge 
              variant={complianceStatus === 'compliant' ? 'success' : complianceStatus === 'warning' ? 'warning' : 'danger'}
            >
              {complianceStatus === 'compliant' ? 'Compliant' : 
               complianceStatus === 'warning' ? 'Warning' : 'Non-Compliant'}
            </Badge>
            
            {hasChanges && (
              <Button 
                variant="primary"
                leftIcon={saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-xpress-600 text-xpress-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* General Settings Tab */}
        {selectedTab === 'general' && (
          <div className="max-w-4xl space-y-6">
            {/* Basic Information */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Official Name
                    </label>
                    <input
                      type="text"
                      value={regionSettings.settings.officialName}
                      onChange={(e) => updateSetting('officialName', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Abbreviation
                    </label>
                    <input
                      type="text"
                      value={regionSettings.settings.abbreviation}
                      onChange={(e) => updateSetting('abbreviation', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={regionSettings.settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    >
                      <option value="Asia/Manila">Asia/Manila (PHT)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={regionSettings.settings.currency}
                      onChange={(e) => updateSetting('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    >
                      <option value="PHP">Philippine Peso (₱)</option>
                      <option value="USD">US Dollar ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Contact Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={regionSettings.settings.contactInfo.address}
                      onChange={(e) => updateSetting('contactInfo.address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regionSettings.settings.contactInfo.phone}
                        onChange={(e) => updateSetting('contactInfo.phone', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={regionSettings.settings.contactInfo.email}
                        onChange={(e) => updateSetting('contactInfo.email', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={regionSettings.settings.contactInfo.website || ''}
                        onChange={(e) => updateSetting('contactInfo.website', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        value={regionSettings.settings.contactInfo.emergencyContact}
                        onChange={(e) => updateSetting('contactInfo.emergencyContact', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Operational Hours */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Operational Hours</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={regionSettings.settings.operationalHours.start}
                      onChange={(e) => updateSetting('operationalHours.start', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={regionSettings.settings.operationalHours.end}
                      onChange={(e) => updateSetting('operationalHours.end', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Operating Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={regionSettings.settings.operationalHours.days.includes(day)}
                          onChange={(e) => {
                            const days = regionSettings.settings.operationalHours.days;
                            if (e.target.checked) {
                              updateSetting('operationalHours.days', [...days, day]);
                            } else {
                              updateSetting('operationalHours.days', days.filter(d => d !== day));
                            }
                          }}
                          className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                        />
                        <span className="text-sm capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Compliance Tab */}
        {selectedTab === 'compliance' && (
          <div className="max-w-4xl space-y-6">
            {/* Permits & Licenses */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">Permits & Licenses</h3>
                  <Badge 
                    variant={complianceStatus === 'compliant' ? 'success' : complianceStatus === 'warning' ? 'warning' : 'danger'}
                  >
                    {complianceStatus === 'compliant' ? 'All Valid' : 
                     complianceStatus === 'warning' ? 'Expiring Soon' : 'Expired'}
                  </Badge>
                </div>
                
                <div className="space-y-6">
                  {/* TNC Permit */}
                  <div className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-neutral-900">TNC Operating Permit</h4>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={regionSettings.settings.compliance.permitRequired}
                          onChange={(e) => updateSetting('compliance.permitRequired', e.target.checked)}
                          className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                        />
                        <span className="text-sm text-neutral-600">Required</span>
                      </label>
                    </div>
                    
                    {regionSettings.settings.compliance.permitRequired && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Permit Number
                          </label>
                          <input
                            type="text"
                            value={regionSettings.settings.compliance.permitNumber || ''}
                            onChange={(e) => updateSetting('compliance.permitNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={regionSettings.settings.compliance.permitExpiry || ''}
                            onChange={(e) => updateSetting('compliance.permitExpiry', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Franchise */}
                  <div className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-neutral-900">Franchise Certificate</h4>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={regionSettings.settings.compliance.franchiseRequired}
                          onChange={(e) => updateSetting('compliance.franchiseRequired', e.target.checked)}
                          className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                        />
                        <span className="text-sm text-neutral-600">Required</span>
                      </label>
                    </div>
                    
                    {regionSettings.settings.compliance.franchiseRequired && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Franchise Number
                          </label>
                          <input
                            type="text"
                            value={regionSettings.settings.compliance.franchiseNumber || ''}
                            onChange={(e) => updateSetting('compliance.franchiseNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={regionSettings.settings.compliance.franchiseExpiry || ''}
                            onChange={(e) => updateSetting('compliance.franchiseExpiry', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LTFRB */}
                  <div className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-neutral-900">LTFRB Certificate</h4>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={regionSettings.settings.compliance.ltfrb.required}
                          onChange={(e) => updateSetting('compliance.ltfrb.required', e.target.checked)}
                          className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                        />
                        <span className="text-sm text-neutral-600">Required</span>
                      </label>
                    </div>
                    
                    {regionSettings.settings.compliance.ltfrb.required && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Certificate Number
                          </label>
                          <input
                            type="text"
                            value={regionSettings.settings.compliance.ltfrb.certificateNumber || ''}
                            onChange={(e) => updateSetting('compliance.ltfrb.certificateNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={regionSettings.settings.compliance.ltfrb.validUntil || ''}
                            onChange={(e) => updateSetting('compliance.ltfrb.validUntil', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Other tabs would be implemented similarly... */}
        {selectedTab === 'fares' && (
          <div className="max-w-4xl">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Fare Structure</h3>
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Fare Configuration</h4>
                  <p className="text-neutral-600">Fare structure configuration interface will be implemented here</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === 'requirements' && (
          <div className="max-w-4xl">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Driver & Vehicle Requirements</h3>
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Requirements Configuration</h4>
                  <p className="text-neutral-600">Driver and vehicle requirements interface will be implemented here</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === 'emergency' && (
          <div className="max-w-4xl">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Emergency Response Settings</h3>
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Emergency Configuration</h4>
                  <p className="text-neutral-600">Emergency response configuration interface will be implemented here</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionalSettings;