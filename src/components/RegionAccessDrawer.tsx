'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Shield, Clock, AlertTriangle, Plus, Trash2, Save } from 'lucide-react';
import type { 
  RegionAccessDrawerProps, 
  UserRegionAccess, 
  AccessLevel, 
  Grant, 
  Override,
  SaveGrantsPayload,
  CreateOverridePayload 
} from '@/types/regionalAccess';

export function RegionAccessDrawer({ 
  userId, 
  open, 
  onClose, 
  canEdit = true,
  requireDualApproval = false,
  onRequestApproval 
}: RegionAccessDrawerProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'overrides' | 'audit'>('matrix');
  const [data, setData] = useState<UserRegionAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grants, setGrants] = useState<Record<string, AccessLevel>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Override form state
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    regionId: '',
    accessLevel: 'read' as AccessLevel,
    endsAt: '',
    reason: ''
  });

  // Fetch data when drawer opens
  useEffect(() => {
    if (open && userId) {
      fetchUserRegions();
    }
  }, [open, userId]);

  // Initialize grants when data loads
  useEffect(() => {
    if (data) {
      const initialGrants: Record<string, AccessLevel> = {};
      data.regions.forEach(region => {
        const grant = data.grants.find(g => g.regionId === region.id);
        initialGrants[region.id] = grant?.accessLevel || 'none';
      });
      setGrants(initialGrants);
      setHasChanges(false);
    }
  }, [data]);

  const fetchUserRegions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/regions`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch user regions');
      }
    } catch (error) {
      console.error('Error fetching user regions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantChange = (regionId: string, level: AccessLevel) => {
    setGrants(prev => ({ ...prev, [regionId]: level }));
    setHasChanges(true);
  };

  const handleSaveGrants = async () => {
    if (!data || !hasChanges) return;

    try {
      setSaving(true);
      
      // Build grants and removals
      const newGrants: Grant[] = [];
      const removals: string[] = [];

      Object.entries(grants).forEach(([regionId, level]) => {
        if (level === 'none') {
          const existingGrant = data.grants.find(g => g.regionId === regionId);
          if (existingGrant) {
            removals.push(regionId);
          }
        } else {
          newGrants.push({ regionId, accessLevel: level as Exclude<AccessLevel, 'none'> });
        }
      });

      const payload: SaveGrantsPayload = { grants: newGrants, removals };

      const response = await fetch(`/api/admin/users/${userId}/regions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchUserRegions(); // Refresh data
        setHasChanges(false);
      } else {
        console.error('Failed to save grants');
      }
    } catch (error) {
      console.error('Error saving grants:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideForm.regionId || !overrideForm.endsAt || !overrideForm.reason) {
      return;
    }

    try {
      const payload: CreateOverridePayload = {
        regionId: overrideForm.regionId,
        accessLevel: overrideForm.accessLevel as Exclude<AccessLevel, 'none'>,
        endsAt: overrideForm.endsAt,
        reason: overrideForm.reason
      };

      const response = await fetch(`/api/admin/users/${userId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowOverrideForm(false);
        setOverrideForm({ regionId: '', accessLevel: 'read', endsAt: '', reason: '' });
        await fetchUserRegions(); // Refresh data
      } else {
        console.error('Failed to create override');
      }
    } catch (error) {
      console.error('Error creating override:', error);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/overrides?overrideId=${overrideId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchUserRegions(); // Refresh data
      } else {
        console.error('Failed to delete override');
      }
    } catch (error) {
      console.error('Error deleting override:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pilot': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Regional Access</h2>
              <p className="text-sm text-gray-600">
                {data?.user.name} ({data?.user.email})
              </p>
            </div>
            {data?.user.role && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {data.user.role}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'matrix', label: 'Access Matrix', icon: Shield },
                  { id: 'overrides', label: 'Overrides', icon: Clock },
                  { id: 'audit', label: 'Audit', icon: AlertTriangle }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : (
                <>
                  {activeTab === 'matrix' && data && (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Region</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">None</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">Read</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">Write</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">Manage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.regions.map(region => (
                              <tr key={region.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{region.name}</span>
                                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(region.status)}`}>
                                      {region.status}
                                    </span>
                                  </div>
                                </td>
                                {(['none', 'read', 'write', 'manage'] as AccessLevel[]).map(level => (
                                  <td key={level} className="text-center py-3 px-4">
                                    <input
                                      type="radio"
                                      name={`region-${region.id}`}
                                      checked={grants[region.id] === level}
                                      onChange={() => canEdit && handleGrantChange(region.id, level)}
                                      disabled={!canEdit}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {hasChanges && canEdit && (
                        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
                          <button
                            onClick={() => {
                              if (data) {
                                const initialGrants: Record<string, AccessLevel> = {};
                                data.regions.forEach(region => {
                                  const grant = data.grants.find(g => g.regionId === region.id);
                                  initialGrants[region.id] = grant?.accessLevel || 'none';
                                });
                                setGrants(initialGrants);
                                setHasChanges(false);
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Discard
                          </button>
                          <button
                            onClick={handleSaveGrants}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'overrides' && data && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Active Overrides</h3>
                        {canEdit && (
                          <button
                            onClick={() => setShowOverrideForm(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                            Add Override
                          </button>
                        )}
                      </div>

                      {data.overrides.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No active overrides
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {data.overrides.map(override => (
                            <div key={override.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {data.regions.find(r => r.id === override.regionId)?.name}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="capitalize">{override.accessLevel}</span> access
                                    · Expires in {formatTimeRemaining(override.endsAt)}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {override.reason}
                                  </div>
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteOverride(override.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Override Form Modal */}
                      {showOverrideForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center">
                          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
                            <h4 className="text-lg font-medium mb-4">Add Override</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Region
                                </label>
                                <select
                                  value={overrideForm.regionId}
                                  onChange={(e) => setOverrideForm(prev => ({ ...prev, regionId: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                >
                                  <option value="">Select region...</option>
                                  {data?.regions.map(region => (
                                    <option key={region.id} value={region.id}>
                                      {region.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Access Level
                                </label>
                                <select
                                  value={overrideForm.accessLevel}
                                  onChange={(e) => setOverrideForm(prev => ({ ...prev, accessLevel: e.target.value as AccessLevel }))}
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                >
                                  <option value="read">Read</option>
                                  <option value="write">Write</option>
                                  <option value="manage">Manage</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  End Date & Time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={overrideForm.endsAt}
                                  onChange={(e) => setOverrideForm(prev => ({ ...prev, endsAt: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Reason
                                </label>
                                <textarea
                                  value={overrideForm.reason}
                                  onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                                  rows={3}
                                  className="w-full border border-gray-300 rounded px-3 py-2"
                                  placeholder="Explain why this override is needed..."
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                onClick={() => {
                                  setShowOverrideForm(false);
                                  setOverrideForm({ regionId: '', accessLevel: 'read', endsAt: '', reason: '' });
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleCreateOverride}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                              >
                                Create Override
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="text-center py-8 text-gray-500">
                      Audit functionality coming soon...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6">
            <h4 className="font-medium text-gray-900 mb-4">Capabilities</h4>
            {data?.capabilities.length ? (
              <div className="space-y-2">
                {data.capabilities.map(capability => (
                  <div key={capability} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{capability.replace(':', ': ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No additional capabilities</div>
            )}

            <div className="mt-8">
              <h4 className="font-medium text-gray-900 mb-4">Warnings</h4>
              <div className="space-y-3">
                {data && data.grants.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-yellow-800">No regions assigned</span>
                  </div>
                )}
                {data?.overrides.map(override => {
                  const timeLeft = new Date(override.endsAt).getTime() - Date.now();
                  const hoursLeft = timeLeft / (1000 * 60 * 60);
                  if (hoursLeft < 24) {
                    return (
                      <div key={override.id} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <Clock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-yellow-800">
                          Override for {data.regions.find(r => r.id === override.regionId)?.name} expires soon
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}