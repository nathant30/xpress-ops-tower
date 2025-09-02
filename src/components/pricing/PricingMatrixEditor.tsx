'use client';

import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Settings,
  Download,
  Upload,
  Filter,
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Xpress Color Palette
const XpressColors = {
  rose: '#EB1D25',
  navy: '#03233A', 
  digitalBlue: '#0A4060',
  roseHover: '#d11a20',
  digitalBlueHover: '#083651'
};

interface Zone {
  id: number;
  code: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'retired';
}

interface PricingProfile {
  id: number;
  name: string;
  status: 'draft' | 'shadow' | 'active' | 'retired';
  regionId: number;
  serviceKey: string;
  effectiveAt?: string;
}

interface ZonePairRule {
  id?: number;
  pickupZoneId: number;
  dropZoneId: number;
  baseFare: number;
  perKm: number;
  perMin: number;
  minFare: number;
  bookingFee: number;
  surgeCap: number;
  currency: string;
  rules?: any;
}

interface Timeband {
  id?: number;
  name: string;
  dowMask: string; // 7-bit string for days of week
  startMinute: number;
  endMinute: number;
  multiplier?: number;
  additive?: number;
  priority: number;
}

interface POIOverride {
  id?: number;
  poiId: number;
  poiName: string;
  mode: 'pickup' | 'dropoff' | 'either';
  baseFare?: number;
  perKm?: number;
  perMin?: number;
  minFare?: number;
  bookingFee?: number;
  surcharge?: number;
  multiplier?: number;
}

interface PricingMatrixEditorProps {
  regionId: number;
  regionName: string;
  serviceKey: string;
  profileId?: number;
  onProfileChange?: (profileId: number) => void;
}

export const PricingMatrixEditor: React.FC<PricingMatrixEditorProps> = ({
  regionId,
  regionName,
  serviceKey,
  profileId,
  onProfileChange
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'timebands' | 'poi-overrides'>('matrix');
  const [zones, setZones] = useState<Zone[]>([]);
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PricingProfile | null>(null);
  const [zonePairRules, setZonePairRules] = useState<ZonePairRule[]>([]);
  const [timebands, setTimebands] = useState<Timeband[]>([]);
  const [poiOverrides, setPOIOverrides] = useState<POIOverride[]>([]);
  const [editingCell, setEditingCell] = useState<{pickup: number; drop: number} | null>(null);
  const [editingRule, setEditingRule] = useState<ZonePairRule | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Mock data for initial implementation
  useEffect(() => {
    const mockZones: Zone[] = [
      { id: 1, code: 'NCR-CBD', name: 'NCR Central Business District', status: 'active' },
      { id: 2, code: 'NCR-QC', name: 'Quezon City', status: 'active' },
      { id: 3, code: 'NCR-MKT', name: 'Makati', status: 'active' },
      { id: 4, code: 'NCR-BGC', name: 'Bonifacio Global City', status: 'active' },
      { id: 5, code: 'NCR-MNL', name: 'Manila', status: 'active' },
      { id: 6, code: 'NCR-PAS', name: 'Pasay', status: 'active' }
    ];

    const mockProfiles: PricingProfile[] = [
      { id: 1, name: 'NCR Rides v2025-09', status: 'active', regionId, serviceKey },
      { id: 2, name: 'NCR Rides v2025-10 Draft', status: 'draft', regionId, serviceKey },
      { id: 3, name: 'NCR Rides Shadow Test', status: 'shadow', regionId, serviceKey }
    ];

    const mockZonePairs: ZonePairRule[] = [
      { pickupZoneId: 1, dropZoneId: 2, baseFare: 45, perKm: 12, perMin: 2, minFare: 89, bookingFee: 10, surgeCap: 2.5, currency: 'PHP' },
      { pickupZoneId: 1, dropZoneId: 3, baseFare: 50, perKm: 11, perMin: 2, minFare: 95, bookingFee: 10, surgeCap: 2.5, currency: 'PHP' },
      { pickupZoneId: 2, dropZoneId: 3, baseFare: 40, perKm: 10, perMin: 2, minFare: 80, bookingFee: 10, surgeCap: 2.5, currency: 'PHP' }
    ];

    const mockTimebands: Timeband[] = [
      { id: 1, name: 'Weekday Peak', dowMask: '0111110', startMinute: 420, endMinute: 540, multiplier: 1.25, priority: 10 },
      { id: 2, name: 'Weekend Evening', dowMask: '1000001', startMinute: 1080, endMinute: 1320, multiplier: 1.15, priority: 5 }
    ];

    const mockPOIOverrides: POIOverride[] = [
      { id: 1, poiId: 101, poiName: 'NAIA Terminal 3', mode: 'pickup', surcharge: 60, multiplier: 1.15 },
      { id: 2, poiId: 102, poiName: 'SM Mall of Asia', mode: 'dropoff', surcharge: 25 }
    ];

    setZones(mockZones);
    setProfiles(mockProfiles);
    setSelectedProfile(mockProfiles[0]);
    setZonePairRules(mockZonePairs);
    setTimebands(mockTimebands);
    setPOIOverrides(mockPOIOverrides);
    setLoading(false);
  }, [regionId, serviceKey]);

  const getZonePairRule = (pickupZoneId: number, dropZoneId: number): ZonePairRule | undefined => {
    return zonePairRules.find(rule => 
      rule.pickupZoneId === pickupZoneId && rule.dropZoneId === dropZoneId
    );
  };

  const updateZonePairRule = (rule: ZonePairRule) => {
    const existingIndex = zonePairRules.findIndex(r => 
      r.pickupZoneId === rule.pickupZoneId && r.dropZoneId === rule.dropZoneId
    );
    
    if (existingIndex >= 0) {
      const newRules = [...zonePairRules];
      newRules[existingIndex] = rule;
      setZonePairRules(newRules);
    } else {
      setZonePairRules([...zonePairRules, rule]);
    }
    setHasUnsavedChanges(true);
  };

  const renderZoneMatrix = () => (
    <div className="space-y-4">
      {/* Matrix Grid */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">
                Pickup → Drop
              </th>
              {zones.map(dropZone => (
                <th key={dropZone.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r">
                  <div className="transform -rotate-45 origin-bottom-left whitespace-nowrap">
                    {dropZone.code}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map(pickupZone => (
              <tr key={pickupZone.id} className="border-t">
                <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-900 border-r">
                  {pickupZone.code}
                </td>
                {zones.map(dropZone => {
                  const rule = getZonePairRule(pickupZone.id, dropZone.id);
                  const isEditing = editingCell?.pickup === pickupZone.id && editingCell?.drop === dropZone.id;
                  const isSameZone = pickupZone.id === dropZone.id;
                  
                  return (
                    <td key={`${pickupZone.id}-${dropZone.id}`} className="border-r border-b">
                      {isSameZone ? (
                        <div className="h-16 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Same Zone</span>
                        </div>
                      ) : (
                        <div 
                          className={`h-16 p-1 cursor-pointer transition-colors ${
                            rule ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
                          } ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => {
                            setEditingCell({ pickup: pickupZone.id, drop: dropZone.id });
                            setEditingRule(rule || {
                              pickupZoneId: pickupZone.id,
                              dropZoneId: dropZone.id,
                              baseFare: 45,
                              perKm: 12,
                              perMin: 2,
                              minFare: 89,
                              bookingFee: 10,
                              surgeCap: 2.5,
                              currency: 'PHP'
                            });
                          }}
                        >
                          {rule ? (
                            <div className="text-xs space-y-1">
                              <div className="font-medium text-green-800">₱{rule.baseFare}</div>
                              <div className="text-gray-600">₱{rule.perKm}/km</div>
                              <div className="text-gray-600">Min: ₱{rule.minFare}</div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rule Editor Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Zone Pair Rule</h3>
              <button 
                onClick={() => {
                  setEditingCell(null);
                  setEditingRule(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editingRule.baseFare}
                      onChange={(e) => setEditingRule({...editingRule, baseFare: parseFloat(e.target.value)})}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">₱</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Per KM</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={editingRule.perKm}
                      onChange={(e) => setEditingRule({...editingRule, perKm: parseFloat(e.target.value)})}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">₱</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Per Minute</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={editingRule.perMin}
                      onChange={(e) => setEditingRule({...editingRule, perMin: parseFloat(e.target.value)})}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">₱</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Fare</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editingRule.minFare}
                      onChange={(e) => setEditingRule({...editingRule, minFare: parseFloat(e.target.value)})}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">₱</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editingRule.bookingFee}
                      onChange={(e) => setEditingRule({...editingRule, bookingFee: parseFloat(e.target.value)})}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">₱</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surge Cap</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRule.surgeCap}
                    onChange={(e) => setEditingRule({...editingRule, surgeCap: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingCell(null);
                  setEditingRule(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateZonePairRule(editingRule);
                  setEditingCell(null);
                  setEditingRule(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimebands = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Time-based Pricing Rules</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Timeband
        </button>
      </div>
      
      <div className="bg-white rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Range</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Multiplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {timebands.map(timeband => (
              <tr key={timeband.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {timeband.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {timeband.dowMask === '0111110' ? 'Mon-Fri' : 
                   timeband.dowMask === '1000001' ? 'Sat-Sun' : 'Custom'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {Math.floor(timeband.startMinute / 60).toString().padStart(2, '0')}:
                  {(timeband.startMinute % 60).toString().padStart(2, '0')} - 
                  {Math.floor(timeband.endMinute / 60).toString().padStart(2, '0')}:
                  {(timeband.endMinute % 60).toString().padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {timeband.multiplier ? `${timeband.multiplier}x` : 'N/A'}
                  {timeband.additive ? ` +₱${timeband.additive}` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {timeband.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPOIOverrides = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">POI-specific Pricing Overrides</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Override
        </button>
      </div>
      
      <div className="bg-white rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POI Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overrides</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {poiOverrides.map(override => (
              <tr key={override.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {override.poiName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    override.mode === 'pickup' ? 'bg-green-100 text-green-800' :
                    override.mode === 'dropoff' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {override.mode}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {override.surcharge && `+₱${override.surcharge} surcharge`}
                  {override.multiplier && `${override.multiplier}x multiplier`}
                  {override.baseFare && `₱${override.baseFare} base`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading pricing matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pricing Matrix Editor</h2>
            <p className="text-gray-600">{regionName} • {serviceKey}</p>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={selectedProfile?.id || ''}
              onChange={(e) => {
                const profile = profiles.find(p => p.id === parseInt(e.target.value));
                setSelectedProfile(profile || null);
              }}
            >
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.status})
                </option>
              ))}
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Validate
            </button>
            <button 
              className="px-4 py-2 rounded-md text-white flex items-center"
              style={{ backgroundColor: XpressColors.rose }}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              {selectedProfile?.status === 'draft' ? 'Save Draft' : 'Activate'}
            </button>
          </div>
        </div>
        
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 text-sm">You have unsaved changes</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {[
            { id: 'matrix', label: 'Zone Matrix', icon: Grid },
            { id: 'timebands', label: 'Timebands', icon: Clock },
            { id: 'poi-overrides', label: 'POI Overrides', icon: MapPin }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className="p-6">
          {activeTab === 'matrix' && renderZoneMatrix()}
          {activeTab === 'timebands' && renderTimebands()}
          {activeTab === 'poi-overrides' && renderPOIOverrides()}
        </div>
      </div>
    </div>
  );
};

export default PricingMatrixEditor;