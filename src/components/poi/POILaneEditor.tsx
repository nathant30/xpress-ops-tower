'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Move,
  Square,
  Circle,
  Navigation,
  Clock,
  Shield,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Car,
  Truck,
  Bus
} from 'lucide-react';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// Xpress Color Palette
const XpressColors = {
  rose: '#EB1D25',
  navy: '#03233A', 
  digitalBlue: '#0A4060',
  roseHover: '#d11a20',
  digitalBlueHover: '#083651'
};

interface POI {
  id: number;
  code: string;
  name: string;
  type: 'airport' | 'mall' | 'port' | 'station' | 'hospital' | 'event' | 'landmark';
  status: 'draft' | 'active' | 'paused' | 'retired';
  regionId: number;
  zoneId?: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  pickupLanes: Lane[];
  dropoffLanes: Lane[];
  restrictions: POIRestrictions;
  queuePolicy: QueuePolicy;
  metadata: Record<string, any>;
  version: number;
}

interface Lane {
  id?: string;
  name: string;
  laneType: 'fifo' | 'free';
  coordinates: number[][];
  restrictions?: LaneRestrictions;
  capacity?: number;
}

interface LaneRestrictions {
  serviceWhitelist?: string[];
  vehicleTypes?: string[];
  hours?: Array<{start: string; end: string}>;
  maxWaitTime?: number;
}

interface POIRestrictions {
  serviceWhitelist?: string[];
  vehicleTypes?: string[];
  hours?: Array<{start: string; end: string}>;
  accessFee?: number;
}

interface QueuePolicy {
  enabled: boolean;
  rotation: 'fifo' | 'weighted';
  holdingArea?: number[][];
  maxQueue?: number;
  priorityLanes?: string[];
}

interface POILaneEditorProps {
  poi: POI | null;
  onSave: (poi: POI) => void;
  onCancel: () => void;
}

type DrawingMode = 'none' | 'point' | 'line' | 'polygon' | 'boundary';

export const POILaneEditor: React.FC<POILaneEditorProps> = ({ poi, onSave, onCancel }) => {
  const [editedPOI, setEditedPOI] = useState<POI | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'location' | 'pickup' | 'dropoff' | 'restrictions' | 'queue'>('general');
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [showLayers, setShowLayers] = useState({
    pickup: true,
    dropoff: true,
    boundary: true,
    queue: true
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (poi) {
      setEditedPOI({ ...poi });
      setHasUnsavedChanges(false);
    }
  }, [poi]);

  const handleFieldChange = (field: string, value: any) => {
    if (!editedPOI) return;
    
    setEditedPOI(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const addPickupLane = () => {
    if (!editedPOI) return;
    
    const newLane: Lane = {
      id: Date.now().toString(),
      name: `Pickup Lane ${editedPOI.pickupLanes.length + 1}`,
      laneType: 'free',
      coordinates: [],
      capacity: 10
    };
    
    setEditedPOI(prev => ({
      ...prev!,
      pickupLanes: [...prev!.pickupLanes, newLane]
    }));
    setSelectedLane(newLane);
    setDrawingMode('line');
    setHasUnsavedChanges(true);
  };

  const addDropoffLane = () => {
    if (!editedPOI) return;
    
    const newLane: Lane = {
      id: Date.now().toString(),
      name: `Dropoff Lane ${editedPOI.dropoffLanes.length + 1}`,
      laneType: 'free',
      coordinates: [],
      capacity: 10
    };
    
    setEditedPOI(prev => ({
      ...prev!,
      dropoffLanes: [...prev!.dropoffLanes, newLane]
    }));
    setSelectedLane(newLane);
    setDrawingMode('line');
    setHasUnsavedChanges(true);
  };

  const updateLane = (laneId: string, isPickup: boolean, updatedLane: Lane) => {
    if (!editedPOI) return;
    
    const laneType = isPickup ? 'pickupLanes' : 'dropoffLanes';
    setEditedPOI(prev => ({
      ...prev!,
      [laneType]: prev![laneType].map(lane => 
        lane.id === laneId ? updatedLane : lane
      )
    }));
    setHasUnsavedChanges(true);
  };

  const deleteLane = (laneId: string, isPickup: boolean) => {
    if (!editedPOI) return;
    
    const laneType = isPickup ? 'pickupLanes' : 'dropoffLanes';
    setEditedPOI(prev => ({
      ...prev!,
      [laneType]: prev![laneType].filter(lane => lane.id !== laneId)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (editedPOI) {
      onSave(editedPOI);
      setHasUnsavedChanges(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
          <input
            type="text"
            value={editedPOI?.code || ''}
            onChange={(e) => handleFieldChange('code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={editedPOI?.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={editedPOI?.type || 'landmark'}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="airport">Airport</option>
            <option value="mall">Mall</option>
            <option value="port">Port</option>
            <option value="station">Station</option>
            <option value="hospital">Hospital</option>
            <option value="event">Event Venue</option>
            <option value="landmark">Landmark</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={editedPOI?.status || 'draft'}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderLocationTab = () => (
    <div className="space-y-6">
      {/* Map Tools */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Drawing Tools:</span>
          <button
            onClick={() => setDrawingMode('point')}
            className={`px-3 py-2 rounded-md text-sm ${
              drawingMode === 'point' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            <MapPin className="w-4 h-4 mr-1 inline" />
            Point
          </button>
          <button
            onClick={() => setDrawingMode('polygon')}
            className={`px-3 py-2 rounded-md text-sm ${
              drawingMode === 'polygon' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            <Square className="w-4 h-4 mr-1 inline" />
            Boundary
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Layers:</span>
          {Object.entries(showLayers).map(([layer, visible]) => (
            <button
              key={layer}
              onClick={() => setShowLayers(prev => ({ ...prev, [layer]: !visible }))}
              className={`px-2 py-1 rounded text-xs ${
                visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {visible ? <Eye className="w-3 h-3 mr-1 inline" /> : <EyeOff className="w-3 h-3 mr-1 inline" />}
              {layer}
            </button>
          ))}
        </div>
      </div>
      
      {/* Map Container */}
      <div className="h-96 bg-gray-100 rounded-lg border">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={editedPOI?.location ? [editedPOI.location.coordinates[1], editedPOI.location.coordinates[0]] : [14.5995, 120.9842]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* POI Location Marker */}
            {editedPOI?.location && (
              <Marker 
                position={[editedPOI.location.coordinates[1], editedPOI.location.coordinates[0]]}
              >
                <Popup>
                  <div>
                    <h3 className="font-semibold">{editedPOI.name}</h3>
                    <p className="text-sm text-gray-600">{editedPOI.type}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* POI Boundary */}
            {editedPOI?.boundary && showLayers.boundary && (
              <Polygon
                positions={editedPOI.boundary.coordinates[0].map(coord => [coord[1], coord[0]])}
                pathOptions={{ color: XpressColors.digitalBlue, fillOpacity: 0.2 }}
              />
            )}
            
            {/* Pickup Lanes */}
            {showLayers.pickup && editedPOI?.pickupLanes.map(lane => 
              lane.coordinates.length > 0 && (
                <Polyline
                  key={`pickup-${lane.id}`}
                  positions={lane.coordinates.map(coord => [coord[1], coord[0]])}
                  pathOptions={{ color: '#10B981', weight: 4 }}
                >
                  <Popup>
                    <div>
                      <h4 className="font-medium text-green-800">{lane.name}</h4>
                      <p className="text-xs text-gray-600">Pickup Lane • {lane.laneType}</p>
                      <p className="text-xs text-gray-600">Capacity: {lane.capacity || 'Unlimited'}</p>
                    </div>
                  </Popup>
                </Polyline>
              )
            )}
            
            {/* Dropoff Lanes */}
            {showLayers.dropoff && editedPOI?.dropoffLanes.map(lane => 
              lane.coordinates.length > 0 && (
                <Polyline
                  key={`dropoff-${lane.id}`}
                  positions={lane.coordinates.map(coord => [coord[1], coord[0]])}
                  pathOptions={{ color: XpressColors.rose, weight: 4 }}
                >
                  <Popup>
                    <div>
                      <h4 className="font-medium text-red-800">{lane.name}</h4>
                      <p className="text-xs text-gray-600">Dropoff Lane • {lane.laneType}</p>
                      <p className="text-xs text-gray-600">Capacity: {lane.capacity || 'Unlimited'}</p>
                    </div>
                  </Popup>
                </Polyline>
              )
            )}
            
            {/* Queue Holding Area */}
            {showLayers.queue && editedPOI?.queuePolicy.enabled && editedPOI?.queuePolicy.holdingArea && (
              <Polygon
                positions={editedPOI.queuePolicy.holdingArea.map(coord => [coord[1], coord[0]])}
                pathOptions={{ color: '#F59E0B', fillOpacity: 0.3 }}
              >
                <Popup>
                  <div>
                    <h4 className="font-medium text-yellow-800">Queue Holding Area</h4>
                    <p className="text-xs text-gray-600">Max Queue: {editedPOI.queuePolicy.maxQueue || 'Unlimited'}</p>
                    <p className="text-xs text-gray-600">Rotation: {editedPOI.queuePolicy.rotation}</p>
                  </div>
                </Popup>
              </Polygon>
            )}
          </MapContainer>
        )}
      </div>
      
      {/* Coordinate Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Location Coordinates</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Latitude</label>
            <input
              type="number"
              step="any"
              value={editedPOI?.location?.coordinates[1] || ''}
              onChange={(e) => {
                const lat = parseFloat(e.target.value);
                if (!isNaN(lat) && editedPOI?.location) {
                  handleFieldChange('location', {
                    ...editedPOI.location,
                    coordinates: [editedPOI.location.coordinates[0], lat]
                  });
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Longitude</label>
            <input
              type="number"
              step="any"
              value={editedPOI?.location?.coordinates[0] || ''}
              onChange={(e) => {
                const lng = parseFloat(e.target.value);
                if (!isNaN(lng) && editedPOI?.location) {
                  handleFieldChange('location', {
                    ...editedPOI.location,
                    coordinates: [lng, editedPOI.location.coordinates[1]]
                  });
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPickupTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Pickup Lanes</h3>
        <button
          onClick={addPickupLane}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Pickup Lane
        </button>
      </div>
      
      <div className="space-y-4">
        {editedPOI?.pickupLanes.map(lane => (
          <div key={lane.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-green-900">{lane.name}</h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedLane(lane)}
                  className="text-green-600 hover:text-green-800"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteLane(lane.id!, true)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium">{lane.laneType}</span>
              </div>
              <div>
                <span className="text-gray-600">Capacity:</span>
                <span className="ml-2 font-medium">{lane.capacity || 'Unlimited'}</span>
              </div>
              <div>
                <span className="text-gray-600">Points:</span>
                <span className="ml-2 font-medium">{lane.coordinates.length}</span>
              </div>
            </div>
            
            {lane.restrictions && (
              <div className="mt-2 text-sm text-gray-600">
                {lane.restrictions.serviceWhitelist && (
                  <div>Services: {lane.restrictions.serviceWhitelist.join(', ')}</div>
                )}
                {lane.restrictions.vehicleTypes && (
                  <div>Vehicles: {lane.restrictions.vehicleTypes.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {(!editedPOI?.pickupLanes || editedPOI.pickupLanes.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No pickup lanes configured</p>
            <p className="text-sm">Add a pickup lane to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDropoffTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Dropoff Lanes</h3>
        <button
          onClick={addDropoffLane}
          className="px-4 py-2 text-white rounded-lg hover:shadow-lg flex items-center"
          style={{ backgroundColor: XpressColors.rose }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Dropoff Lane
        </button>
      </div>
      
      <div className="space-y-4">
        {editedPOI?.dropoffLanes.map(lane => (
          <div key={lane.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-red-900">{lane.name}</h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedLane(lane)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteLane(lane.id!, false)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium">{lane.laneType}</span>
              </div>
              <div>
                <span className="text-gray-600">Capacity:</span>
                <span className="ml-2 font-medium">{lane.capacity || 'Unlimited'}</span>
              </div>
              <div>
                <span className="text-gray-600">Points:</span>
                <span className="ml-2 font-medium">{lane.coordinates.length}</span>
              </div>
            </div>
            
            {lane.restrictions && (
              <div className="mt-2 text-sm text-gray-600">
                {lane.restrictions.serviceWhitelist && (
                  <div>Services: {lane.restrictions.serviceWhitelist.join(', ')}</div>
                )}
                {lane.restrictions.vehicleTypes && (
                  <div>Vehicles: {lane.restrictions.vehicleTypes.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {(!editedPOI?.dropoffLanes || editedPOI.dropoffLanes.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No dropoff lanes configured</p>
            <p className="text-sm">Add a dropoff lane to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRestrictionsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Restrictions</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Services</label>
            <div className="space-y-2">
              {['rides', 'ev_taxi', 'eats', 'mart', 'activities', 'shuttles'].map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPOI?.restrictions.serviceWhitelist?.includes(service) || false}
                    onChange={(e) => {
                      const current = editedPOI?.restrictions.serviceWhitelist || [];
                      const updated = e.target.checked
                        ? [...current, service]
                        : current.filter(s => s !== service);
                      handleFieldChange('restrictions', {
                        ...editedPOI?.restrictions,
                        serviceWhitelist: updated
                      });
                    }}
                    className="mr-3 rounded"
                  />
                  <span className="text-sm capitalize">{service.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Types</label>
            <div className="space-y-2">
              {['sedan', 'mpv', 'suv', 'motorcycle', 'tricycle', 'jeepney'].map(vehicle => (
                <label key={vehicle} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPOI?.restrictions.vehicleTypes?.includes(vehicle) || false}
                    onChange={(e) => {
                      const current = editedPOI?.restrictions.vehicleTypes || [];
                      const updated = e.target.checked
                        ? [...current, vehicle]
                        : current.filter(v => v !== vehicle);
                      handleFieldChange('restrictions', {
                        ...editedPOI?.restrictions,
                        vehicleTypes: updated
                      });
                    }}
                    className="mr-3 rounded"
                  />
                  <span className="text-sm capitalize">{vehicle}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
        <div className="space-y-3">
          {editedPOI?.restrictions.hours?.map((hour, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="time"
                value={hour.start}
                onChange={(e) => {
                  const updated = [...(editedPOI?.restrictions.hours || [])];
                  updated[index] = { ...hour, start: e.target.value };
                  handleFieldChange('restrictions', {
                    ...editedPOI?.restrictions,
                    hours: updated
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="text-gray-500">to</span>
              <input
                type="time"
                value={hour.end}
                onChange={(e) => {
                  const updated = [...(editedPOI?.restrictions.hours || [])];
                  updated[index] = { ...hour, end: e.target.value };
                  handleFieldChange('restrictions', {
                    ...editedPOI?.restrictions,
                    hours: updated
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => {
                  const updated = editedPOI?.restrictions.hours?.filter((_, i) => i !== index) || [];
                  handleFieldChange('restrictions', {
                    ...editedPOI?.restrictions,
                    hours: updated
                  });
                }}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => {
              const current = editedPOI?.restrictions.hours || [];
              handleFieldChange('restrictions', {
                ...editedPOI?.restrictions,
                hours: [...current, { start: '00:00', end: '23:59' }]
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Time Range
          </button>
        </div>
      </div>
    </div>
  );

  const renderQueueTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Queue Management</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editedPOI?.queuePolicy.enabled || false}
            onChange={(e) => handleFieldChange('queuePolicy', {
              ...editedPOI?.queuePolicy,
              enabled: e.target.checked
            })}
            className="mr-2 rounded"
          />
          <span className="text-sm font-medium">Enable Queue Management</span>
        </label>
      </div>
      
      {editedPOI?.queuePolicy.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rotation Policy</label>
              <select
                value={editedPOI?.queuePolicy.rotation || 'fifo'}
                onChange={(e) => handleFieldChange('queuePolicy', {
                  ...editedPOI?.queuePolicy,
                  rotation: e.target.value as 'fifo' | 'weighted'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="fifo">First In, First Out (FIFO)</option>
                <option value="weighted">Weighted by Priority</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Queue Size</label>
              <input
                type="number"
                value={editedPOI?.queuePolicy.maxQueue || ''}
                onChange={(e) => handleFieldChange('queuePolicy', {
                  ...editedPOI?.queuePolicy,
                  maxQueue: parseInt(e.target.value) || undefined
                })}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Info className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-900">Holding Area</h4>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              Define the waiting area for queued drivers. Click on the map in the Location tab to draw the holding area polygon.
            </p>
            {editedPOI?.queuePolicy.holdingArea && (
              <div className="text-sm text-yellow-700">
                ✓ Holding area defined with {editedPOI.queuePolicy.holdingArea.length} points
              </div>
            )}
          </div>
        </div>
      )}
      
      {!editedPOI?.queuePolicy.enabled && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Queue management disabled</p>
          <p className="text-sm">Enable queue management for FIFO or priority-based driver queuing</p>
        </div>
      )}
    </div>
  );

  if (!poi && !editedPOI) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">No POI Selected</h3>
        <p className="text-gray-600">Select a POI to configure lanes and restrictions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">POI Lane Configuration</h2>
            <p className="text-gray-600">{editedPOI?.name} • {editedPOI?.type}</p>
          </div>
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <div className="flex items-center text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unsaved changes
              </div>
            )}
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white rounded-md flex items-center"
              style={{ backgroundColor: XpressColors.rose }}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'location', label: 'Location & Map', icon: MapPin },
            { id: 'pickup', label: 'Pickup Lanes', icon: Navigation },
            { id: 'dropoff', label: 'Dropoff Lanes', icon: Navigation },
            { id: 'restrictions', label: 'Restrictions', icon: Shield },
            { id: 'queue', label: 'Queue Policy', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'location' && renderLocationTab()}
        {activeTab === 'pickup' && renderPickupTab()}
        {activeTab === 'dropoff' && renderDropoffTab()}
        {activeTab === 'restrictions' && renderRestrictionsTab()}
        {activeTab === 'queue' && renderQueueTab()}
      </div>
    </div>
  );
};

export default POILaneEditor;