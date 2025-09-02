"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Settings, TrendingUp, MapPin, Car, DollarSign, AlertTriangle, X, Save, Copy, Activity, Eye, User, BarChart3, Shield, Play } from 'lucide-react'

interface PricingProfile {
  id: number
  region_id: string
  service_key: 'tnvs' | 'taxi' | 'special' | 'pop'
  vehicle_type?: '4_seat' | '6_seat'
  name: string
  status: 'draft' | 'active' | 'retired' | 'shadow'
  booking_fee: number
  transparency_mode: 'summary_only' | 'detailed_breakdown'
  effective_at: string
  notes?: string
}

interface PricingComponent {
  key: string
  value_numeric: number | null
  unit: string | null
  description: string | null
  publish: boolean
  sort_order: number
}

interface EarningsPolicy {
  driver_comp_model: 'commission' | 'salaried' | 'lease' | 'hybrid'
  fare_recipient: 'driver' | 'xpress' | 'partner_fleet'
  revenue_split: Record<string, any>
}

interface FareLine {
  label: string
  amount: number
  meta?: string
  publish: boolean
}

interface PreviewResponse {
  breakdown: FareLine[]
  total: number
  driverEarnings: number
  companyTake: number
  notes: string[]
}

interface ProfileBundle {
  profile: PricingProfile
  components: PricingComponent[]
  linkedProfiles: {
    surge: number[]
    surcharges: number[]
    tolls: number[]
    special: number[]
    pop: number[]
  }
  earningsPolicy: EarningsPolicy | null
  permissions: {
    role: string
    canSeeSecretSauce: boolean
  }
}

interface TNVSFare {
  id: number
  profile_id: number
  vehicle_type: '4_seat' | '6_seat'
  base_fare: number
  per_km: number
  per_min: number
  min_fare: number
  surge_cap: number
  new_rider_cap: number
  loyal_rider_threshold: number
}

interface TaxiFare {
  id: number
  profile_id: number
  flagdown: number
  per_km: number
  per_min: number
  night_surcharge_pct: number
  airport_surcharge: number
  xpress_booking_fee_flat: number
  ltfrb_compliant: boolean
  surge_blocked: boolean
}

interface Toll {
  id: number
  name: string
  route_code: string
  amount: number
  region_id: string
  auto_detect: boolean
  active: boolean
}

export default function PricingManagement() {
  const [activeTab, setActiveTab] = useState('profiles')
  const [profiles, setProfiles] = useState<PricingProfile[]>([])
  const [tnvsFares, setTnvsFares] = useState<TNVSFare[]>([])
  const [taxiFares, setTaxiFares] = useState<TaxiFare[]>([])
  const [tolls, setTolls] = useState<Toll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  
  // v3.1 Delta states
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [profileBundle, setProfileBundle] = useState<ProfileBundle | null>(null)
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [previewPerspective, setPreviewPerspective] = useState<'rider' | 'driver'>('rider')
  const [riderViewMode, setRiderViewMode] = useState<'summary_only' | 'detailed_breakdown'>('summary_only')
  const [showComponentModal, setShowComponentModal] = useState(false)
  const [showEarningsModal, setShowEarningsModal] = useState(false)
  const [editingComponent, setEditingComponent] = useState<PricingComponent | null>(null)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSurgeModal, setShowSurgeModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingType, setEditingType] = useState<'profile' | 'tnvs' | 'taxi' | 'toll'>('profile')
  
  // Form states
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPricingData()
  }, [])
  
  useEffect(() => {
    if (selectedProfileId && (previewPerspective || riderViewMode)) {
      fetchPreview(selectedProfileId)
    }
  }, [previewPerspective, riderViewMode])

  const fetchPricingData = async () => {
    try {
      setLoading(true)
      
      const [profilesRes, tnvsRes, taxiRes, tollsRes] = await Promise.all([
        fetch('/api/pricing/profiles'),
        fetch('/api/pricing/tnvs-fares'),
        fetch('/api/pricing/taxi-fares'), 
        fetch('/api/pricing/tolls')
      ])

      if (!profilesRes.ok || !tnvsRes.ok || !taxiRes.ok || !tollsRes.ok) {
        throw new Error('Failed to fetch pricing data')
      }

      const [profilesData, tnvsData, taxiData, tollsData] = await Promise.all([
        profilesRes.json(),
        tnvsRes.json(),
        taxiRes.json(),
        tollsRes.json()
      ])

      setProfiles(profilesData)
      setTnvsFares(tnvsData)
      setTaxiFares(taxiData)
      setTolls(tollsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // v3.1 Delta functions
  const fetchProfileBundle = async (profileId: number) => {
    try {
      const response = await fetch(`/api/pricing/profiles/${profileId}`)
      if (!response.ok) throw new Error('Failed to fetch profile details')
      const bundle = await response.json()
      setProfileBundle(bundle)
      await fetchPreview(profileId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile details')
    }
  }
  
  const fetchPreview = async (profileId: number) => {
    try {
      const response = await fetch(`/api/pricing/profiles/${profileId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: 14.5995, lon: 120.9842 }, // Makati CBD
          destination: { lat: 14.5547, lon: 121.0244 }, // BGC
          timestamp: new Date().toISOString(),
          perspective: previewPerspective,
          riderView: riderViewMode
        })
      })
      if (!response.ok) throw new Error('Failed to compute preview')
      const preview = await response.json()
      setPreviewData(preview)
    } catch (err) {
      console.error('Preview error:', err)
    }
  }
  
  const updateComponent = async (profileId: number, component: PricingComponent) => {
    try {
      const response = await fetch(`/api/pricing/profiles/${profileId}/components`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upserts: [component]
        })
      })
      if (!response.ok) throw new Error('Failed to update component')
      await fetchProfileBundle(profileId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update component')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'retired': return 'bg-gray-100 text-gray-800'
      case 'shadow': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getServiceIcon = (serviceKey: string) => {
    switch (serviceKey) {
      case 'tnvs': return <Car className="h-4 w-4" />
      case 'taxi': return <Car className="h-4 w-4 text-yellow-600" />
      case 'special': return <MapPin className="h-4 w-4 text-blue-600" />
      case 'pop': return <MapPin className="h-4 w-4 text-purple-600" />
      default: return <Car className="h-4 w-4" />
    }
  }

  // Handler functions
  const handleCreateNew = () => {
    setFormData({
      region_id: 'NCR',
      service_key: 'tnvs',
      vehicle_type: '4_seat',
      name: '',
      status: 'draft',
      booking_fee: 69.00,
      notes: ''
    })
    setEditingType('profile')
    setShowCreateModal(true)
  }

  const handleEdit = (item: any, type: 'profile' | 'tnvs' | 'taxi' | 'toll') => {
    setEditingItem(item)
    setEditingType(type)
    setFormData({ ...item })
    setShowEditModal(true)
  }
  
  const handleProfileSelect = async (profileId: number) => {
    setSelectedProfileId(profileId)
    await fetchProfileBundle(profileId)
  }
  
  const handleComponentEdit = (component: PricingComponent) => {
    setEditingComponent(component)
    setShowComponentModal(true)
  }
  
  const handleComponentSave = async () => {
    if (!selectedProfileId || !editingComponent) return
    await updateComponent(selectedProfileId, editingComponent)
    setShowComponentModal(false)
    setEditingComponent(null)
  }

  const handleSettings = (item: any) => {
    setEditingItem(item)
    setFormData({ ...item })
    setShowSettingsModal(true)
  }

  const handleDelete = async (id: number, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return
    
    try {
      const response = await fetch(`/api/pricing/${type}s/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPricingData()
        setError(null)
      } else {
        throw new Error(`Failed to delete ${type}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${type}`)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const endpoint = editingItem 
        ? `/api/pricing/${editingType === 'profile' ? 'profiles' : editingType + '-fares'}/${editingItem.id}`
        : `/api/pricing/${editingType === 'profile' ? 'profiles' : editingType + '-fares'}`
      
      const response = await fetch(endpoint, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchPricingData()
        setShowCreateModal(false)
        setShowEditModal(false)
        setShowSettingsModal(false)
        setError(null)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowSettingsModal(false)
    setShowSurgeModal(false)
    setEditingItem(null)
    setFormData({})
  }

  const filteredProfiles = profiles.filter(profile => {
    const regionMatch = selectedRegion === 'all' || profile.region_id === selectedRegion
    const serviceMatch = selectedService === 'all' || profile.service_key === selectedService
    return regionMatch && serviceMatch
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pricing data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pricing & Fares Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure and manage pricing for TNVS, Taxi, Special Regional, and POP services
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Profiles</p>
                <p className="text-2xl font-bold">{profiles.filter(p => p.status === 'active').length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">TNVS Fares</p>
                <p className="text-2xl font-bold">{tnvsFares.length}</p>
              </div>
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tolls</p>
                <p className="text-2xl font-bold">{tolls.filter(t => t.active).length}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Surge Active</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <select 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Regions</option>
            <option value="NCR">NCR</option>
            <option value="BORA">Boracay</option>
            <option value="CAV">Cavite</option>
            <option value="BTN">Bataan</option>
          </select>

          <select 
            value={selectedService} 
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Services</option>
            <option value="tnvs">TNVS</option>
            <option value="taxi">Taxi</option>
            <option value="special">Special Regional</option>
            <option value="pop">POP</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Profile
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profiles">Pricing Profiles</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced Editor</TabsTrigger>
          <TabsTrigger value="tnvs">TNVS Fares</TabsTrigger>
          <TabsTrigger value="taxi">Taxi Fares</TabsTrigger>
          <TabsTrigger value="surge">Surge Control</TabsTrigger>
          <TabsTrigger value="tolls">Tolls</TabsTrigger>
        </TabsList>
        
        <TabsContent value="enhanced" className="space-y-4">
          {selectedProfileId ? (
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-16rem)]">
              {/* Left Panel - Profile Metadata */}
              <div className="col-span-3">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Profile Settings
                      <Button size="sm" variant="outline" onClick={() => setSelectedProfileId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileBundle && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Profile Name</label>
                          <div className="text-lg font-semibold">{profileBundle.profile.name}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Region</label>
                            <div className="text-sm">{profileBundle.profile.region_id}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Service</label>
                            <div className="text-sm capitalize">{profileBundle.profile.service_key}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Badge className={getStatusColor(profileBundle.profile.status)}>
                            {profileBundle.profile.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Transparency Mode</label>
                          <select
                            className="w-full px-3 py-2 text-sm border rounded-md"
                            value={profileBundle.profile.transparency_mode}
                            onChange={(e) => {
                              // Update transparency mode
                            }}
                          >
                            <option value="summary_only">Summary Only</option>
                            <option value="detailed_breakdown">Detailed Breakdown</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Notes</label>
                          <textarea
                            className="w-full px-3 py-2 text-sm border rounded-md"
                            rows={3}
                            value={profileBundle.profile.notes || ''}
                            onChange={(e) => {
                              // Update notes
                            }}
                          />
                        </div>
                        
                        {profileBundle.earningsPolicy && (
                          <div className="border-t pt-4 space-y-2">
                            <h4 className="font-medium">Earnings Policy</h4>
                            <div className="text-sm space-y-1">
                              <div>Model: {profileBundle.earningsPolicy.driver_comp_model}</div>
                              <div>Recipient: {profileBundle.earningsPolicy.fare_recipient}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setShowEarningsModal(true)}>
                              <Settings className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Center Panel - Components */}
              <div className="col-span-5">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Fare Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profileBundle?.components.map((component, index) => (
                        <div key={component.key} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium capitalize">
                                {component.key.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {component.description || 'No description'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="font-medium">
                                  ₱{component.value_numeric?.toFixed(2) || '0.00'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {component.unit || 'fixed'}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={component.publish ? 'default' : 'secondary'}>
                                  {component.publish ? 'Published' : 'Internal'}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => handleComponentEdit(component)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          No components configured
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right Panel - Live Preview */}
              <div className="col-span-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Live Preview
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={previewPerspective === 'rider' ? 'default' : 'outline'}
                          onClick={() => {
                            setPreviewPerspective('rider')
                            selectedProfileId && fetchPreview(selectedProfileId)
                          }}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Rider
                        </Button>
                        <Button
                          size="sm"
                          variant={previewPerspective === 'driver' ? 'default' : 'outline'}
                          onClick={() => {
                            setPreviewPerspective('driver')
                            selectedProfileId && fetchPreview(selectedProfileId)
                          }}
                        >
                          <Car className="h-4 w-4 mr-1" />
                          Driver
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewData ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-2">Sample Trip: Makati CBD → BGC</div>
                          <div className="text-lg font-semibold">Total: ₱{previewData.total.toFixed(2)}</div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Fare Breakdown</h4>
                          {previewData.breakdown.map((line, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium">{line.label}</span>
                                {line.meta && (
                                  <span className="text-gray-500 ml-2">({line.meta})</span>
                                )}
                                {!line.publish && (
                                  <Badge variant="secondary" className="ml-2 text-xs">Internal</Badge>
                                )}
                              </div>
                              <span className="font-medium">₱{line.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {previewPerspective === 'driver' && (
                          <div className="border-t pt-4 space-y-2">
                            <h4 className="font-medium">Earnings Split</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-600">Driver Earnings</div>
                                <div className="font-semibold text-green-600">₱{previewData.driverEarnings.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Company Take</div>
                                <div className="font-semibold">₱{previewData.companyTake.toFixed(2)}</div>
                              </div>
                            </div>
                            {previewData.notes.length > 0 && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {previewData.notes.map((note, idx) => (
                                  <div key={idx}>• {note}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {previewPerspective === 'rider' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">View Mode</label>
                            <select
                              className="w-full px-3 py-2 text-sm border rounded-md"
                              value={riderViewMode}
                              onChange={(e) => {
                                setRiderViewMode(e.target.value as 'summary_only' | 'detailed_breakdown')
                                selectedProfileId && fetchPreview(selectedProfileId)
                              }}
                            >
                              <option value="summary_only">Summary Only</option>
                              <option value="detailed_breakdown">Detailed Breakdown</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Play className="h-8 w-8 mx-auto mb-2" />
                        Select a profile to see live preview
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Enhanced Pricing Editor</h3>
                <p className="text-gray-600 mb-4">Select a profile from the table below to access the enhanced editor</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProfiles.map((profile) => (
                      <tr key={profile.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.region_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            {getServiceIcon(profile.service_key)}
                            <span className="capitalize">{profile.service_key}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.vehicle_type || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(profile.status)}>
                            {profile.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{profile.booking_fee?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleProfileSelect(profile.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(profile, 'profile')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleSettings(profile)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tnvs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>TNVS Fare Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Fare</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per KM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Fare</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surge Cap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tnvsFares.map((fare) => (
                      <tr key={fare.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">{fare.vehicle_type?.replace('_', '-')}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.base_fare?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.per_km?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.per_min?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.min_fare?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fare.surge_cap}x</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(fare, 'tnvs')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Taxi Fare Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flagdown</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per KM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Surcharge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Airport Surcharge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LTFRB Compliant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxiFares.map((fare) => (
                      <tr key={fare.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.flagdown?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.per_km?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.per_min?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fare.night_surcharge_pct}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{fare.airport_surcharge?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={fare.ltfrb_compliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {fare.ltfrb_compliant ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(fare, 'taxi')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Surge Pricing Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Surge Control Panel</h3>
                <p className="text-muted-foreground">Configure dynamic pricing triggers and caps</p>
                <Button className="mt-4" onClick={() => setShowSurgeModal(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Surge
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tolls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Toll Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toll Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Detect</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tolls.map((toll) => (
                      <tr key={toll.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{toll.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">{toll.route_code}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{toll.amount?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{toll.region_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={toll.auto_detect ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {toll.auto_detect ? 'Enabled' : 'Manual'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={toll.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {toll.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(toll, 'toll')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(toll.id, 'toll')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {showCreateModal ? 'Create New Profile' : `Edit ${editingType.charAt(0).toUpperCase() + editingType.slice(1)}`}
              </h2>
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {editingType === 'profile' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., NCR Premium TNVS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.region_id || 'NCR'}
                        onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                      >
                        <option value="NCR">NCR</option>
                        <option value="BORA">Boracay</option>
                        <option value="CAV">Cavite</option>
                        <option value="BTN">Bataan</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.service_key || 'tnvs'}
                        onChange={(e) => setFormData({ ...formData, service_key: e.target.value })}
                      >
                        <option value="tnvs">TNVS</option>
                        <option value="taxi">Taxi</option>
                        <option value="special">Special Regional</option>
                        <option value="pop">POP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.vehicle_type || '4_seat'}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      >
                        <option value="4_seat">4-Seat</option>
                        <option value="6_seat">6-Seat</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.status || 'draft'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="shadow">Shadow</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Booking Fee (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.booking_fee || 69.00}
                        onChange={(e) => setFormData({ ...formData, booking_fee: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes or description"
                    />
                  </div>
                </>
              )}

              {editingType === 'tnvs' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.vehicle_type || '4_seat'}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      >
                        <option value="4_seat">4-Seat</option>
                        <option value="6_seat">6-Seat</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.base_fare || 45.00}
                        onChange={(e) => setFormData({ ...formData, base_fare: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per KM (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.per_km || 12.00}
                        onChange={(e) => setFormData({ ...formData, per_km: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per Min (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.per_min || 2.00}
                        onChange={(e) => setFormData({ ...formData, per_min: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Fare (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.min_fare || 89.00}
                        onChange={(e) => setFormData({ ...formData, min_fare: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Surge Cap (x)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.surge_cap || 2.0}
                        onChange={(e) => setFormData({ ...formData, surge_cap: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              )}

              {editingType === 'toll' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Toll Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Skyway Stage 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Route Code</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.route_code || ''}
                        onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                        placeholder="e.g., SLEX_SKYWAY_1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.amount || 62.00}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.region_id || 'NCR'}
                        onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                      >
                        <option value="NCR">NCR</option>
                        <option value="CAV">Cavite</option>
                        <option value="BTN">Bataan</option>
                        <option value="LAG">Laguna</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-detect"
                        className="rounded border-gray-300"
                        checked={formData.auto_detect || false}
                        onChange={(e) => setFormData({ ...formData, auto_detect: e.target.checked })}
                      />
                      <label htmlFor="auto-detect" className="text-sm font-medium text-gray-700">Auto Detect</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="active"
                        className="rounded border-gray-300"
                        checked={formData.active !== false}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      />
                      <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {showCreateModal ? 'Create' : 'Update'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Profile Settings</h2>
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Profile Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{editingItem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Region:</span>
                    <span className="font-medium">{editingItem?.region_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium capitalize">{editingItem?.service_key}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusColor(editingItem?.status)}>
                      {editingItem?.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => {
                  handleCloseModal()
                  handleEdit(editingItem, 'profile')
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button className="w-full" variant="outline" onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(JSON.stringify(editingItem, null, 2))
                  }
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Configuration
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={() => handleDelete(editingItem.id, 'profile')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surge Control Modal */}
      {showSurgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Surge Pricing Configuration</h2>
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surge Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="multiplicative">Multiplicative (1.1x - 2.0x)</option>
                    <option value="additive">Additive (+₱ Fixed)</option>
                    <option value="predictive">Predictive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Triggers</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="weather" className="rounded border-gray-300" />
                    <label htmlFor="weather" className="text-sm">Weather conditions</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="traffic" className="rounded border-gray-300" />
                    <label htmlFor="traffic" className="text-sm">Traffic conditions</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="events" className="rounded border-gray-300" />
                    <label htmlFor="events" className="text-sm">Special events</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="demand" className="rounded border-gray-300" />
                    <label htmlFor="demand" className="text-sm">High demand</label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Demand-Supply Ratio Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2.0"
                />
                <p className="text-xs text-gray-500 mt-1">Activate surge when demand exceeds supply by this ratio</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">⚠️ Current Status</h3>
                <div className="space-y-1 text-sm text-yellow-700">
                  <p>• Surge is currently <strong>ACTIVE</strong> in NCR (1.5x)</p>
                  <p>• Last triggered: High demand at NAIA Terminal 3</p>
                  <p>• Estimated duration: 15-30 minutes</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Component Edit Modal */}
      {showComponentModal && editingComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Component</h2>
              <Button variant="outline" size="sm" onClick={() => setShowComponentModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
                <div className="text-lg font-medium capitalize">
                  {editingComponent.key.replace('_', ' ')}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingComponent.value_numeric || 0}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    value_numeric: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingComponent.unit || 'fixed'}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    unit: e.target.value
                  })}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="per_km">Per KM</option>
                  <option value="per_min">Per Minute</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={editingComponent.description || ''}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    description: e.target.value
                  })}
                  placeholder="Rider-facing description of this component"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="publish"
                  checked={editingComponent.publish}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    publish: e.target.checked
                  })}
                />
                <label htmlFor="publish" className="text-sm font-medium text-gray-700">
                  Show to riders
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowComponentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleComponentSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Earnings Policy Modal */}
      {showEarningsModal && profileBundle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Earnings Policy Configuration</h2>
              <Button variant="outline" size="sm" onClick={() => setShowEarningsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compensation Model</label>
                  <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="commission">Commission-based</option>
                    <option value="salaried">Salaried</option>
                    <option value="lease">Lease Agreement</option>
                    <option value="hybrid">Hybrid Model</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fare Recipient</label>
                  <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="driver">Driver</option>
                    <option value="xpress">Xpress</option>
                    <option value="partner_fleet">Partner Fleet</option>
                  </select>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Revenue Split</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver %</label>
                    <input
                      type="number"
                      step="0.01"
                      max="1"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xpress %</label>
                    <input
                      type="number"
                      step="0.01"
                      max="1"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.20"
                    />
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="booking-fee-xpress" />
                    <label htmlFor="booking-fee-xpress" className="text-sm">Booking fee goes to Xpress</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="tolls-reimbursed" />
                    <label htmlFor="tolls-reimbursed" className="text-sm">Tolls reimbursed to driver</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowEarningsModal(false)}>
                Cancel
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}