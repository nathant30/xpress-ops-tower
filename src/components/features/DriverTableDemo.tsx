import React, { useMemo, useState, memo } from 'react'
import { useServiceType } from '@/contexts/ServiceTypeContext'
import DriverAdminPortal from './DriverAdminPortalFixed'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type ActiveDriverStatus = 'New (30 days)' | 'Regular' | 'Salaried' | 'Team Leaders'
type PendingDriverStatus = 'ID_Verification' | 'Pending_Doc' | 'Reverification'
type SuspendedDriverStatus = 'Poor Rating' | 'Late Payments' | 'Document Expired' | 'Violation Report' | 'Under Investigation'
type BannedDriverStatus = 'Fraud Detected' | 'Multiple Violations' | 'Criminal Background' | 'Fake Documents' | 'Permanent Ban'
type InactiveDriverStatus = 'Inactive 120hr'

type DriverStatus = ActiveDriverStatus | PendingDriverStatus | SuspendedDriverStatus | BannedDriverStatus | InactiveDriverStatus

type DriverService = '2W' | '4W' | 'TAXI' | 'TNVS'

type DriverCategory = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'BANNED' | 'INACTIVE'

type DocumentStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'

type Driver = {
  id: string
  name: string
  status: DriverStatus
  category: DriverCategory
  service: DriverService
  region: string
  applied_at: string // ISO datetime
  external_id?: string
  // New operational metrics
  completed_trips: number
  completion_rate: number // 0-100
  acceptance_rate: number // 0-100
  cancellation_rate: number // 0-100
  is_online: boolean
  last_online: string // ISO datetime or "now"
  // For tooltips
  total_offered_trips: number
  accepted_trips: number
  cancelled_trips: number
  // Document verification status (for PENDING drivers)
  drivers_license_status?: DocumentStatus
  nbi_clearance_status?: DocumentStatus
  orcr_status?: DocumentStatus
  // Fraud risk assessment
  fraud_risk: 'Low' | 'Medium' | 'High' | 'Critical'
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const ACTIVE_STATUSES: ActiveDriverStatus[] = ['New (30 days)', 'Regular', 'Salaried', 'Team Leaders']
const PENDING_STATUSES: PendingDriverStatus[] = ['ID_Verification', 'Pending_Doc', 'Reverification']
const SUSPENDED_STATUSES: SuspendedDriverStatus[] = ['Poor Rating', 'Late Payments', 'Document Expired', 'Violation Report', 'Under Investigation']
const BANNED_STATUSES: BannedDriverStatus[] = ['Fraud Detected', 'Multiple Violations', 'Criminal Background', 'Fake Documents', 'Permanent Ban']
const INACTIVE_STATUSES: InactiveDriverStatus[] = ['Inactive 120hr']

const ALL_STATUSES: DriverStatus[] = [...ACTIVE_STATUSES, ...PENDING_STATUSES, ...SUSPENDED_STATUSES, ...BANNED_STATUSES, ...INACTIVE_STATUSES]

const SERVICES: DriverService[] = ['2W', '4W', 'TAXI', 'TNVS']
const REGIONS = ['NCR', 'Bicol', 'Cebu', 'Davao', 'Iloilo', 'Baguio']
const VERIFIERS = ['Alyssa', 'Mica', 'Paul', 'Rico', 'Jam', 'Kaye']

const STATUS_BY_CATEGORY: Record<DriverCategory, DriverStatus[]> = {
  ACTIVE: ACTIVE_STATUSES,
  PENDING: PENDING_STATUSES,
  SUSPENDED: SUSPENDED_STATUSES,
  BANNED: BANNED_STATUSES,
  INACTIVE: INACTIVE_STATUSES
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────────────
function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(' ')
}

function exportCSV(rows: Driver[], filename = 'drivers_demo.csv') {
  const headers = [
    'id',
    'name',
    'status',
    'online_status',
    'service',
    'region',
    'completed_trips',
    'completion_rate',
    'acceptance_rate',
    'cancellation_rate',
    'applied_at',
    'fraud_risk',
    'drivers_license_status',
    'nbi_clearance_status',
    'orcr_status',
    'external_id',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const vals = [
      r.id,
      r.name,
      r.status,
      r.is_online ? 'Online' : 'Offline',
      r.service,
      r.region || '',
      r.completed_trips,
      r.completion_rate + '%',
      r.acceptance_rate + '%',
      r.cancellation_rate + '%',
      r.applied_at,
      r.is_online ? 'Online now' : r.last_online,
      r.drivers_license_status || '',
      r.nbi_clearance_status || '',
      r.orcr_status || '',
      r.external_id || '',
    ].map((v) => '"' + String(v ?? '').replaceAll('"', '""') + '"')
    lines.push(vals.join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function randomChoice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone() {
  const base = 900000000 + Math.floor(Math.random() * 99999999)
  return '+639' + String(base).slice(0, 9)
}

function randomName(i: number) {
  const first = ['Juan', 'Maria', 'Jose', 'Ana', 'Carlo', 'Liza', 'Paolo', 'Grace', 'Ramon', 'Diana']
  const last = ['Santos', 'Reyes', 'Garcia', 'Cruz', 'Torres', 'Flores', 'Ramos', 'Gonzales', 'Bautista', 'Navarro']
  const f = randomChoice(first)
  const l = randomChoice(last)
  return `${f} ${l} ${i}`
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Data generator (2,000 synthetic rows)
// ──────────────────────────────────────────────────────────────────────────────
function useMockDrivers() {
  return useMemo<Driver[]>(() => {
    const rows: Driver[] = []
    for (let i = 1; i <= 2000; i++) {
      // Distribute categories: 60% ACTIVE, 15% PENDING, 10% SUSPENDED, 10% INACTIVE, 5% BANNED
      let category: DriverCategory
      const rand = Math.random()
      if (rand < 0.60) category = 'ACTIVE'
      else if (rand < 0.75) category = 'PENDING'
      else if (rand < 0.85) category = 'SUSPENDED'
      else if (rand < 0.95) category = 'INACTIVE'
      else category = 'BANNED'
      
      const status = randomChoice(STATUS_BY_CATEGORY[category])
      const service = randomChoice(SERVICES)
      const region = randomChoice(REGIONS)
      const appliedDays = Math.floor(Math.random() * 120) // within ~4 months
      const lastTouchDays = Math.floor(Math.random() * (appliedDays + 1))
      
      // Generate realistic operational metrics
      const completedTrips = Math.floor(Math.random() * 2950) + 50 // 50-3000
      const completionRate = Math.floor(Math.random() * 13) + 85 // 85-98%
      const acceptanceRate = Math.floor(Math.random() * 25) + 70 // 70-95%
      const cancellationRate = Math.random() * 7.5 + 0.5 // 0.5-8%
      
      // Calculate consistent numbers for tooltips
      const totalOfferedTrips = Math.floor(completedTrips / (acceptanceRate / 100))
      const acceptedTrips = Math.floor(totalOfferedTrips * (acceptanceRate / 100))
      const cancelledTrips = Math.floor(completedTrips * (cancellationRate / 100))
      
      // Set online status based on category
      let isOnline: boolean
      let lastOnlineDays: number
      
      if (category === 'INACTIVE') {
        // INACTIVE drivers are always offline for more than 10 days (240+ hours)
        isOnline = false
        lastOnlineDays = Math.floor(Math.random() * 60) + 10 // 10-70 days ago
      } else {
        isOnline = Math.random() > 0.6 // 40% online for other categories
        lastOnlineDays = isOnline ? 0 : Math.floor(Math.random() * 7) // 0-7 days ago if offline
      }
      
      // Generate document status for pending drivers
      const documentStatuses: DocumentStatus[] = ['Submitted', 'Under Review', 'Approved', 'Rejected']
      const getRandomDocStatus = () => randomChoice(documentStatuses)
      
      const driver: Driver = {
        id: String(100000 + i),
        name: randomName(i),
        status,
        category,
        service,
        region,
        applied_at: daysAgo(appliedDays),
        external_id: 'APP-' + (300000 + i),
        // Operational metrics
        completed_trips: completedTrips,
        completion_rate: completionRate,
        acceptance_rate: acceptanceRate,
        cancellation_rate: Math.round(cancellationRate * 10) / 10, // Round to 1 decimal
        is_online: isOnline,
        last_online: isOnline ? 'now' : daysAgo(lastOnlineDays),
        // For tooltips
        total_offered_trips: totalOfferedTrips,
        accepted_trips: acceptedTrips,
        cancelled_trips: cancelledTrips,
        // Fraud risk assessment
        fraud_risk: ['Low', 'Low', 'Low', 'Medium', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 7)] as 'Low' | 'Medium' | 'High' | 'Critical',
      }

      // Add document status only for pending drivers
      if (category === 'PENDING') {
        driver.drivers_license_status = getRandomDocStatus()
        driver.nbi_clearance_status = getRandomDocStatus()
        driver.orcr_status = getRandomDocStatus()
      }
      
      rows.push(driver)
    }
    return rows
  }, [])
}

// ──────────────────────────────────────────────────────────────────────────────
// Driver Profile integrated with DriverAdminPortal
// ──────────────────────────────────────────────────────────────────────────────

// Driver Profile Modal with Sidebar Layout
const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ driver, onClose }) => {
  const [activeTab, setActiveTab] = useState('Insights')

  const tabs = [
    'Insights',
    'Legal Docs',
    'Vehicles', 
    'Commerce',
    'Bookings',
    'Disciplinary',
    'Wallet',
    'Chat',
    'App History',
    'Training'
  ];

  // Generate mock driver data based on the spec
  const getDriverExtendedInfo = (driver: Driver) => {
    const getLastOnlineText = (driver: Driver) => {
      if (driver.is_online || driver.last_online === 'now') return 'Online now';
      const lastOnlineDate = new Date(driver.last_online);
      const now = new Date();
      const diffMs = now.getTime() - lastOnlineDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    };

    return {
      name: driver.name,
      driverId: driver.external_id || driver.id,
      phone: `+639${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      signupDate: formatDate(driver.applied_at),
      lastActive: getLastOnlineText(driver),
      operator: "Xpress",
      services: [driver.service === '2W' ? 'Ride - Moto' : driver.service === '4W' ? 'Ride - Car' : driver.service === 'TAXI' ? 'Taxi' : 'TNVS'],
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      dateOfBirth: `${Math.floor(Math.random() * 28) + 1} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor(Math.random() * 12)]} ${1970 + Math.floor(Math.random() * 35)}`,
      email: `${driver.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      homeAddress: `${Math.floor(Math.random() * 999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln'][Math.floor(Math.random() * 5)]}, ${driver.region}`,
      wasReferred: Math.random() > 0.7,
      referrer: Math.random() > 0.7 ? `REF${Math.floor(Math.random() * 10000)}` : 'N/A',
      xpressGears: Math.random() > 0.8 ? 'Premium Kit' : 'N/A',
      device: ['iPhone 13', 'Samsung Galaxy', 'CPH2251', 'Xiaomi Mi 11', 'Huawei P40'][Math.floor(Math.random() * 5)],
      os: Math.random() > 0.6 ? 'android' : 'ios'
    };
  };

  const driverInfo = getDriverExtendedInfo(driver);

  const performanceBadges = [
    { icon: '💎', title: 'Excellent Service', percentage: Math.floor(Math.random() * 100) },
    { icon: '🧭', title: 'Expert Navigation', percentage: Math.floor(Math.random() * 100) },
    { icon: '🧹', title: 'Neat and Tidy', percentage: Math.floor(Math.random() * 100) },
    { icon: '👍', title: 'Great Conversation', percentage: Math.floor(Math.random() * 100) },
    { icon: '🎵', title: 'Awesome Music', percentage: Math.floor(Math.random() * 100) },
    { icon: '🏍️', title: 'Cool Vehicle', percentage: Math.floor(Math.random() * 100) },
    { icon: '🌙', title: 'Late Night Hero', percentage: Math.floor(Math.random() * 100) },
    { icon: '😄', title: 'Entertaining Driver', percentage: Math.floor(Math.random() * 100) }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white h-full w-full max-w-7xl max-h-[95vh] rounded-lg overflow-hidden flex">
        {/* Left Sidebar - Driver Information */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            {/* Back Button */}
            <button 
              onClick={onClose}
              className="flex items-center text-blue-600 mb-6 hover:text-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Driver Basic Info */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{driverInfo.name}</h1>
              <p className="text-gray-600 text-sm mb-1">Driver ID: {driverInfo.driverId}</p>
              <p className="text-blue-600 text-sm font-medium">{driverInfo.phone}</p>
            </div>

            {/* Status Info */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Signup Date:</span>
                <span className="font-medium text-sm">{driverInfo.signupDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Last Active:</span>
                <span className="font-medium text-sm">{driverInfo.lastActive}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Status:</span>
                <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", 
                  driver.is_online ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                  {driver.is_online ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-4">
              <DetailRow label="Operator" value={driverInfo.operator} />
              <DetailRow label="Xpress Services" value={driverInfo.services.join(', ')} />
              <DetailRow label="Gender" value={driverInfo.gender} />
              <DetailRow label="Date of Birth" value={driverInfo.dateOfBirth} />
              <DetailRow label="Email" value={driverInfo.email} />
              <DetailRow label="Home Address" value={driverInfo.homeAddress} />
              <DetailRow label="Was referred?" value={driverInfo.wasReferred ? 'Yes' : 'No'} />
              <DetailRow label="Referrer" value={driverInfo.referrer} />
              <DetailRow label="Xpress Gears" value={driverInfo.xpressGears} />
              <DetailRow label="Device" value={driverInfo.device} />
              <DetailRow label="OS" value={driverInfo.os} />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                Add to Campaign
              </button>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Send Update Push
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Navigation Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'Insights' && (
              <div className="space-y-8">
                {/* Today's Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <MetricCard
                      title="Completion Rate"
                      value={`${driver.completion_rate}%`}
                      subtitle={`${driver.completed_trips} out of ${Math.floor(driver.completed_trips * 1.1)}`}
                      color="blue"
                    />
                    <MetricCard
                      title="Acceptance Rate"
                      value={`${driver.acceptance_rate}%`}
                      subtitle={`${driver.accepted_trips} out of ${driver.total_offered_trips}`}
                      color="blue"
                    />
                    <MetricCard
                      title="Cancellation Rate"
                      value={`${driver.cancellation_rate}%`}
                      subtitle={`${driver.cancelled_trips} out of ${driver.completed_trips}`}
                      color="gray"
                    />
                  </div>
                </div>

                {/* Performance Badges */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Badges</h3>
                  <div className="grid grid-cols-4 gap-6">
                    {performanceBadges.map((badge, index) => (
                      <div key={index} className="text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl mx-auto mb-2">
                          {badge.icon}
                        </div>
                        <h4 className="text-xs font-medium text-gray-700 mb-1">{badge.title}</h4>
                        <p className="text-lg font-bold text-gray-900">{badge.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Hours */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Hours</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Average per Day</p>
                        <p className="text-2xl font-bold text-gray-900">{Math.floor(Math.random() * 8) + 4}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total This Period</p>
                        <p className="text-2xl font-bold text-gray-900">{Math.floor(Math.random() * 40) + 20}h</p>
                      </div>
                    </div>
                    <div className="h-32 bg-white rounded border flex items-center justify-center">
                      <p className="text-gray-500">Hours chart would appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legal Docs Tab */}
            {activeTab === 'Legal Docs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Driver's License */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-lg">🪪</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Driver's License</h3>
                          <p className="text-sm text-gray-500">Professional License</p>
                        </div>
                      </div>
                      <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", 
                        driver.drivers_license_status === 'Approved' ? "bg-green-100 text-green-800" :
                        driver.drivers_license_status === 'Under Review' ? "bg-yellow-100 text-yellow-800" :
                        driver.drivers_license_status === 'Rejected' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800")}>
                        {driver.drivers_license_status || 'Not Submitted'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">License No:</span><span>N01-23-{Math.floor(Math.random() * 1000000)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Expiry:</span><span>Dec 2025</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Class:</span><span>Professional</span></div>
                    </div>
                  </div>

                  {/* NBI Clearance */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-green-600 text-lg">🛡️</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">NBI Clearance</h3>
                          <p className="text-sm text-gray-500">Background Check</p>
                        </div>
                      </div>
                      <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", 
                        driver.nbi_clearance_status === 'Approved' ? "bg-green-100 text-green-800" :
                        driver.nbi_clearance_status === 'Under Review' ? "bg-yellow-100 text-yellow-800" :
                        driver.nbi_clearance_status === 'Rejected' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800")}>
                        {driver.nbi_clearance_status || 'Not Submitted'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Reference No:</span><span>NBI-{Math.floor(Math.random() * 10000000)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Issue Date:</span><span>Jan 2024</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Valid Until:</span><span>Jan 2025</span></div>
                    </div>
                  </div>

                  {/* ORCR */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 text-lg">📋</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">ORCR</h3>
                          <p className="text-sm text-gray-500">Vehicle Registration</p>
                        </div>
                      </div>
                      <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", 
                        driver.orcr_status === 'Approved' ? "bg-green-100 text-green-800" :
                        driver.orcr_status === 'Under Review' ? "bg-yellow-100 text-yellow-800" :
                        driver.orcr_status === 'Rejected' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800")}>
                        {driver.orcr_status || 'Not Submitted'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">OR No:</span><span>OR-{Math.floor(Math.random() * 1000000)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">CR No:</span><span>CR-{Math.floor(Math.random() * 1000000)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Valid Until:</span><span>Dec 2024</span></div>
                    </div>
                  </div>

                  {/* Additional Documents */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-orange-600 text-lg">📄</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Additional Docs</h3>
                          <p className="text-sm text-gray-500">Supplementary</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Medical Certificate:</span><span className="text-green-600">✓ Valid</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Drug Test:</span><span className="text-green-600">✓ Valid</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Training Certificate:</span><span className="text-green-600">✓ Valid</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicles Tab */}
            {activeTab === 'Vehicles' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Registered Vehicle</h3>
                    <span className={clsx("px-3 py-1 rounded-full text-sm font-medium",
                      "bg-green-100 text-green-800")}>
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-6xl mb-4">
                          {driver.service === '2W' ? '🏍️' : driver.service === 'TAXI' ? '🚖' : '🚗'}
                        </div>
                        <h4 className="text-lg font-medium">{
                          driver.service === '2W' ? 'Motorcycle' : 
                          driver.service === 'TAXI' ? 'Taxi' : 'Car'
                        }</h4>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Make</label>
                          <p className="text-gray-900">{driver.service === '2W' ? ['Honda', 'Yamaha', 'Suzuki'][Math.floor(Math.random() * 3)] : ['Toyota', 'Nissan', 'Hyundai'][Math.floor(Math.random() * 3)]}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Model</label>
                          <p className="text-gray-900">{driver.service === '2W' ? ['Click 125', 'Mio', 'Raider'][Math.floor(Math.random() * 3)] : ['Vios', 'Almera', 'Accent'][Math.floor(Math.random() * 3)]}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Year</label>
                          <p className="text-gray-900">{2015 + Math.floor(Math.random() * 9)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Color</label>
                          <p className="text-gray-900">{['Red', 'Blue', 'White', 'Black', 'Silver'][Math.floor(Math.random() * 5)]}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plate Number:</span>
                            <span className="font-medium">{['ABC', 'DEF', 'GHI'][Math.floor(Math.random() * 3)]}-{Math.floor(Math.random() * 9000) + 1000}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Registration Exp:</span>
                            <span className="font-medium">Dec 2024</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Insurance:</span>
                            <span className="text-green-600 font-medium">Valid</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Commerce Tab */}
            {activeTab === 'Commerce' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">₱{(Math.random() * 5000 + 1000).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    <div className="text-sm text-gray-600">Today's Earnings</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">₱{(Math.random() * 25000 + 15000).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    <div className="text-sm text-gray-600">This Week</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">₱{(Math.random() * 100000 + 50000).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                    <div className="text-sm text-gray-600">This Month</div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                  <div className="space-y-3">
                    {Array.from({length: 8}).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 text-sm">💰</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Trip Earning</p>
                            <p className="text-xs text-gray-500">{new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">+₱{(Math.random() * 500 + 50).toFixed(0)}</p>
                          <p className="text-xs text-gray-500">Trip #{Math.floor(Math.random() * 10000)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'Bookings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{driver.completed_trips}</div>
                    <div className="text-sm text-gray-600">Total Trips</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{Math.floor(driver.completed_trips * 0.8)}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{Math.floor(driver.completed_trips * 0.15)}</div>
                    <div className="text-sm text-gray-600">Cancelled</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{Math.floor(driver.completed_trips * 0.05)}</div>
                    <div className="text-sm text-gray-600">No Show</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                  <div className="space-y-4">
                    {Array.from({length: 6}).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex items-center">
                          <div className={clsx("w-3 h-3 rounded-full mr-3", 
                            i < 4 ? "bg-green-500" : i < 5 ? "bg-yellow-500" : "bg-red-500"
                          )}></div>
                          <div>
                            <p className="font-medium">Trip to {['Makati', 'BGC', 'Ortigas', 'Alabang', 'QC', 'Mandaluyong'][i]}</p>
                            <p className="text-sm text-gray-500">{new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₱{(Math.random() * 300 + 50).toFixed(0)}</p>
                          <p className="text-sm text-gray-500">{i < 4 ? "Completed" : i < 5 ? "Cancelled" : "No Show"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Disciplinary Tab */}
            {activeTab === 'Disciplinary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{Math.floor(Math.random() * 3)}</div>
                    <div className="text-sm text-gray-600">Total Violations</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{Math.floor(Math.random() * 2)}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-sm text-gray-600">Suspensions</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Disciplinary History</h3>
                  {Math.random() > 0.7 ? (
                    <div className="space-y-4">
                      <div className="flex items-center p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-yellow-600">⚠️</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900">Late Pickup Warning</h4>
                          <p className="text-sm text-yellow-700">Driver arrived 15+ minutes late for pickup</p>
                          <p className="text-xs text-yellow-600 mt-1">{new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">Warning</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">✅</div>
                      <h4 className="text-lg font-medium text-gray-700">Clean Record</h4>
                      <p>No disciplinary actions on file</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'Wallet' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Xpress Wallet</h3>
                      <p className="text-blue-100">Driver Balance</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">₱{(Math.random() * 10000 + 1000).toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                      <p className="text-blue-100">Available Balance</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Recent Transactions</h4>
                    <div className="space-y-3">
                      {Array.from({length: 5}).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center mr-3",
                              i % 3 === 0 ? "bg-green-100" : i % 3 === 1 ? "bg-blue-100" : "bg-red-100"
                            )}>
                              <span className="text-sm">
                                {i % 3 === 0 ? "💰" : i % 3 === 1 ? "🏦" : "🔄"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {i % 3 === 0 ? "Trip Earning" : i % 3 === 1 ? "Cash Out" : "Transfer"}
                              </p>
                              <p className="text-xs text-gray-500">{new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className={clsx("text-sm font-medium",
                            i % 3 === 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {i % 3 === 0 ? "+" : "-"}₱{(Math.random() * 1000 + 100).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Payment Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                          <span className="text-blue-600 text-sm">🏦</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">BPI Savings</p>
                          <p className="text-sm text-gray-500">****-****-{Math.floor(Math.random() * 9000) + 1000}</p>
                        </div>
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded mr-3 flex items-center justify-center">
                          <span className="text-purple-600 text-sm">💳</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">GCash</p>
                          <p className="text-sm text-gray-500">+639{Math.floor(Math.random() * 1000000000).toString().slice(0,8)}***</p>
                        </div>
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'Chat' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Support Conversations</h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      New Message
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {Array.from({length: 4}).map((_, i) => (
                      <div key={i} className="flex items-start p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-sm">👤</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">Support Agent #{i + 1}</h4>
                            <span className="text-xs text-gray-500">{new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {[
                              "Account verification completed. You're all set!",
                              "Payment processing issue resolved.",
                              "Vehicle registration updated successfully.",
                              "Training schedule reminder sent."
                            ][i]}
                          </p>
                          <div className="flex items-center mt-2">
                            <span className={clsx("w-2 h-2 rounded-full mr-2", 
                              i === 0 ? "bg-green-500" : "bg-gray-400"
                            )}></span>
                            <span className="text-xs text-gray-500">
                              {i === 0 ? "Active" : "Resolved"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* App History Tab */}
            {activeTab === 'App History' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Login History</h4>
                    <div className="space-y-3">
                      {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium">{new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleTimeString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{['Mobile App', 'Web Portal'][Math.floor(Math.random() * 2)]}</p>
                            <p className="text-xs text-gray-500">{Math.floor(Math.random() * 8) + 1}h online</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">App Usage Stats</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Session</span>
                        <span className="font-medium">{Math.floor(Math.random() * 4) + 2}h 30m</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total App Time</span>
                        <span className="font-medium">{Math.floor(Math.random() * 200) + 300}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">App Version</span>
                        <span className="font-medium">v2.{Math.floor(Math.random() * 10)}.{Math.floor(Math.random() * 5)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Updated</span>
                        <span className="font-medium">{Math.floor(Math.random() * 30) + 1} days ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold mb-4">Recent Activity Log</h4>
                  <div className="space-y-3">
                    {[
                      { action: "Went online", time: "2 hours ago", icon: "🟢" },
                      { action: "Completed trip #12847", time: "3 hours ago", icon: "✅" },
                      { action: "Accepted booking", time: "3 hours ago", icon: "📝" },
                      { action: "Updated profile photo", time: "1 day ago", icon: "📷" },
                      { action: "Changed password", time: "3 days ago", icon: "🔒" },
                      { action: "Completed training module", time: "5 days ago", icon: "🎓" }
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center py-2">
                        <span className="mr-3">{activity.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm">{activity.action}</p>
                        </div>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Training Tab */}
            {activeTab === 'Training' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{Math.floor(Math.random() * 8) + 5}</div>
                    <div className="text-sm text-gray-600">Completed Modules</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{Math.floor(Math.random() * 3) + 1}</div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{Math.floor(Math.random() * 2)}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Modules</h3>
                  <div className="space-y-4">
                    {[
                      { title: "Road Safety & Traffic Rules", status: "completed", score: "95%", date: "2 weeks ago" },
                      { title: "Customer Service Excellence", status: "completed", score: "88%", date: "3 weeks ago" },
                      { title: "Vehicle Maintenance Basics", status: "in-progress", progress: 60, date: "Current" },
                      { title: "Emergency Response Procedures", status: "completed", score: "92%", date: "1 month ago" },
                      { title: "Digital Payment Systems", status: "pending", date: "Not started" }
                    ].map((module, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex items-center">
                          <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center mr-4",
                            module.status === 'completed' ? "bg-green-100" :
                            module.status === 'in-progress' ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            <span className="text-sm">
                              {module.status === 'completed' ? "✅" :
                               module.status === 'in-progress' ? "📚" : "📋"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium">{module.title}</h4>
                            <p className="text-sm text-gray-500">{module.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {module.status === 'completed' && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              {module.score}
                            </span>
                          )}
                          {module.status === 'in-progress' && (
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{width: `${module.progress}%`}}></div>
                            </div>
                          )}
                          {module.status === 'pending' && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-start">
    <span className="text-gray-600 text-sm flex-shrink-0 mr-3">{label}:</span>
    <span className="font-medium text-sm text-right text-gray-900 break-words">{value}</span>
  </div>
);

const MetricCard: React.FC<{ title: string; value: string; subtitle: string; color: string }> = ({ 
  title, value, subtitle, color 
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// Main component (enhanced sandbox)
// ──────────────────────────────────────────────────────────────────────────────
interface ColumnConfig {
  key: keyof Driver
  label: string
  width?: number
  minWidth?: number
  sortable?: boolean
}

interface DriverTableDemoProps {
  category?: DriverCategory
  title?: string
  description?: string
}

function DriverTableDemo({ 
  category: initialCategory = 'ACTIVE',
  title,
  description
}: DriverTableDemoProps) {
  const data = useMockDrivers()
  const { selectedServiceType } = useServiceType()
  
  // Driver category state
  const [category, setCategory] = useState<DriverCategory>(initialCategory)

  // Column configurations based on driver category
  const getDefaultColumns = (category: DriverCategory): ColumnConfig[] => {
    const baseColumns: ColumnConfig[] = [
      { key: 'status', label: 'Status', width: 120, minWidth: 100, sortable: true },
      { key: 'name', label: 'Driver Name', width: 180, minWidth: 150, sortable: true },
    ]

    if (category === 'PENDING') {
      return [
        ...baseColumns,
        { key: 'drivers_license_status', label: "Driver's License", width: 140, minWidth: 120, sortable: true },
        { key: 'nbi_clearance_status', label: 'NBI Clearance', width: 120, minWidth: 100, sortable: true },
        { key: 'orcr_status', label: 'ORCR', width: 100, minWidth: 80, sortable: true },
        { key: 'applied_at', label: 'Applied Date', width: 120, minWidth: 100, sortable: true },
        { key: 'region', label: 'Region', width: 100, minWidth: 80, sortable: true },
        { key: 'service', label: 'Service', width: 100, minWidth: 80, sortable: true },
        { key: 'fraud_risk', label: 'Fraud Risk', width: 120, minWidth: 100, sortable: true },
      ]
    } else {
      // ACTIVE, SUSPENDED, BANNED drivers show operational metrics
      return [
        ...baseColumns,
        { key: 'completed_trips', label: 'Completed Trips', width: 130, minWidth: 120, sortable: true },
        { key: 'completion_rate', label: 'Completion Rate %', width: 140, minWidth: 130, sortable: true },
        { key: 'acceptance_rate', label: 'Acceptance Rate %', width: 140, minWidth: 130, sortable: true },
        { key: 'cancellation_rate', label: 'Cancellation Rate %', width: 150, minWidth: 140, sortable: true },
        { key: 'applied_at', label: 'Applied Date', width: 120, minWidth: 100, sortable: true },
        { key: 'region', label: 'Region', width: 100, minWidth: 80, sortable: true },
        { key: 'service', label: 'Service', width: 100, minWidth: 80, sortable: true },
        { key: 'fraud_risk', label: 'Fraud Risk', width: 120, minWidth: 100, sortable: true },
      ]
    }
  }

  const defaultColumns = getDefaultColumns(category)

  // Column customization state
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`driver-table-columns-${initialCategory}`)
      return saved ? JSON.parse(saved) : defaultColumns
    }
    return defaultColumns
  })

  // Update columns when category changes
  React.useEffect(() => {
    const newDefaultColumns = getDefaultColumns(category)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`driver-table-columns-${category}`)
      setColumns(saved ? JSON.parse(saved) : newDefaultColumns)
    } else {
      setColumns(newDefaultColumns)
    }
  }, [category])
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<number | null>(null)
  const [resizingColumn, setResizingColumn] = useState<number | null>(null)

  // Filters
  const [q, setQ] = useState('')
  const [selStatuses, setSelStatuses] = useState<DriverStatus[]>([])
  const [region, setRegion] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  
  // Search highlighting
  const [highlightedCategories, setHighlightedCategories] = useState<Set<DriverCategory>>(new Set())
  const [highlightedStatuses, setHighlightedStatuses] = useState<Set<DriverStatus>>(new Set())
  
  // Driver profile modal
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [showDriverModal, setShowDriverModal] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Driver>('applied_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggle<T extends string>(arr: T[], v: T) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
  }

  // Map service types from global filter to local service types
  const getFilteredByServiceType = (data: Driver[]) => {
    if (selectedServiceType === 'ALL') return data
    
    // Map global service types to local service types
    const serviceMapping: Record<string, DriverService> = {
      '2W': '2W',
      '4W_CAR': '4W',
      '4W_SUV': '4W', 
      '4W_TAXI': 'TAXI'
    }
    
    const localServiceType = serviceMapping[selectedServiceType]
    if (!localServiceType) return data
    
    return data.filter(driver => driver.service === localServiceType)
  }

  // Calculate highlighted filters based on search results
  const updateHighlightedFilters = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const hasSearch = ql.length > 0
    
    if (!hasSearch) {
      setHighlightedCategories(new Set())
      setHighlightedStatuses(new Set())
      return
    }

    // Find all drivers that match the search
    const searchResults = getFilteredByServiceType(data).filter((r) => {
      const hay = `${r.name} ${r.external_id}`.toLowerCase()
      return hay.includes(ql)
    })

    // Extract categories and statuses from search results
    const foundCategories = new Set<DriverCategory>()
    const foundStatuses = new Set<DriverStatus>()
    
    searchResults.forEach((driver) => {
      foundCategories.add(driver.category)
      foundStatuses.add(driver.status)
    })

    setHighlightedCategories(foundCategories)
    setHighlightedStatuses(foundStatuses)
  }, [q, data, selectedServiceType])

  // Derived rows (filter → sort → paginate)
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const hasSearch = ql.length > 0

    // First apply global service type filtering
    let rows = getFilteredByServiceType(data)

    // Global search overrides category filter
    if (hasSearch) {
      // Search across ALL drivers regardless of category
      rows = rows.filter((r) => {
        const hay = `${r.name} ${r.external_id}`.toLowerCase()
        return hay.includes(ql)
      })
    } else {
      // Only filter by category when no search query
      rows = rows.filter((r) => r.category === category)
    }

    // Apply other filters (but not status filters during global search)
    rows = rows.filter((r) => {
      // Skip status filter during global search to show all matching results
      if (!hasSearch && selStatuses.length && !selStatuses.includes(r.status)) return false
      if (from && new Date(r.applied_at) < new Date(from)) return false
      if (to && new Date(r.applied_at) > new Date(to + 'T23:59:59')) return false
      return true
    })

    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const va = a[sortBy]
      const vb = b[sortBy]
      if (sortBy === 'applied_at') {
        return (new Date(va as string).getTime() - new Date(vb as string).getTime()) * dir
      }
      if (sortBy === 'fraud_risk') {
        const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }
        return (riskOrder[va as keyof typeof riskOrder] - riskOrder[vb as keyof typeof riskOrder]) * dir
      }
      return String(va).localeCompare(String(vb)) * dir
    })

    return rows
  }, [data, selectedServiceType, q, selStatuses, category, from, to, sortBy, sortDir])

  const total = filtered.length
  const displayRows = filtered.slice(0, 10) // Always show first 10 rows

  // Facets (counts within current filter context, except the toggled dimension)
  const facetStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of filtered) m[r.status] = (m[r.status] || 0) + 1
    return m
  }, [filtered])
  const facetService = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of filtered) m[r.service] = (m[r.service] || 0) + 1
    return m
  }, [filtered])

  const clearAll = () => {
    setQ('')
    setSelStatuses([])
    setFrom('')
    setTo('')
  }

  const onSort = (key: keyof Driver) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }


  // Column management functions
  const saveColumnConfig = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`driver-table-columns-${category}`, JSON.stringify(newColumns))
    }
  }

  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns]
    const [moved] = newColumns.splice(fromIndex, 1)
    newColumns.splice(toIndex, 0, moved)
    saveColumnConfig(newColumns)
  }

  const handleColumnResize = (columnIndex: number, newWidth: number) => {
    const newColumns = [...columns]
    const minWidth = newColumns[columnIndex].minWidth || 80
    newColumns[columnIndex].width = Math.max(newWidth, minWidth)
    saveColumnConfig(newColumns)
  }

  const resetToDefault = () => {
    saveColumnConfig(defaultColumns)
  }

  const handleDriverClick = (driver: Driver) => {
    setSelectedDriver(driver)
    setShowDriverModal(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnIndex: number) => {
    setDraggedColumn(columnIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
    e.currentTarget.style.opacity = '0.5'
  }

  const handleDragOver = (e: React.DragEvent, columnIndex: number) => {
    e.preventDefault()
    setDropTargetColumn(columnIndex)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.style.opacity = '1'
    if (draggedColumn !== null && dropTargetColumn !== null && draggedColumn !== dropTargetColumn) {
      handleColumnReorder(draggedColumn, dropTargetColumn)
    }
    setDraggedColumn(null)
    setDropTargetColumn(null)
  }

  // Render cell content based on column key
  const renderCellContent = (driver: Driver, column: ColumnConfig) => {
    switch (column.key) {
      case 'status':
        const getLastOnlineText = (driver: Driver) => {
          if (driver.is_online || driver.last_online === 'now') return 'Online now';
          const lastOnlineDate = new Date(driver.last_online);
          const now = new Date();
          const diffMs = now.getTime() - lastOnlineDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);
          if (diffHours < 1) return 'Just now';
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays === 1) return 'Yesterday';
          return `${diffDays}d ago`;
        };
        return (
          <div className="flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full", driver.is_online ? "bg-green-500" : "bg-red-500")}></span>
            <div className="flex flex-col">
              <span className={clsx("text-xs font-medium", driver.is_online ? "text-green-700" : "text-red-700")}>
                {getLastOnlineText(driver)}
              </span>
              <span className="text-xs text-gray-500">{driver.status}</span>
            </div>
          </div>
        )
      
      case 'name':
        return (
          <div className="flex flex-col">
            <span className="font-medium">{driver.name}</span>
            <span className="text-xs text-gray-500">{driver.external_id}</span>
          </div>
        )
      
      case 'completed_trips':
        return <span className="font-medium">{driver.completed_trips.toLocaleString()}</span>
      
      case 'completion_rate':
        return (
          <span 
            className="font-medium cursor-help" 
            title={`${driver.completed_trips} completed / ${driver.completed_trips} total`}
          >
            {driver.completion_rate}%
          </span>
        )
      
      case 'acceptance_rate':
        return (
          <span 
            className="font-medium cursor-help" 
            title={`${driver.accepted_trips} accepted / ${driver.total_offered_trips} offered`}
          >
            {driver.acceptance_rate}%
          </span>
        )
      
      case 'cancellation_rate':
        return (
          <span 
            className="font-medium cursor-help" 
            title={`${driver.cancelled_trips} cancelled / ${driver.completed_trips} trips`}
          >
            {driver.cancellation_rate}%
          </span>
        )
      
      case 'applied_at':
        return <span>{formatDate(driver.applied_at)}</span>
      
      case 'region':
        return driver.region
      
      case 'service':
        return (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
            {driver.service}
          </span>
        )
      
      case 'fraud_risk':
        const getFraudRiskColor = (risk: string) => {
          switch (risk) {
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
          }
        };
        const getRiskRanking = (risk: string) => {
          switch (risk) {
            case 'Low': return '★☆☆☆';
            case 'Medium': return '★★☆☆';
            case 'High': return '★★★☆';
            case 'Critical': return '★★★★';
            default: return '☆☆☆☆';
          }
        };
        return (
          <div className="flex items-center gap-2">
            <span className={clsx("px-2 py-1 text-xs font-medium rounded border", getFraudRiskColor(driver.fraud_risk))}>
              {driver.fraud_risk}
            </span>
            <span className="text-xs text-yellow-500 font-mono">{getRiskRanking(driver.fraud_risk)}</span>
          </div>
        )
      
      case 'drivers_license_status':
      case 'nbi_clearance_status':
      case 'orcr_status':
        const status = driver[column.key]
        const getStatusColor = (status: DocumentStatus) => {
          switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800'
            case 'Rejected': return 'bg-red-100 text-red-800'
            case 'Under Review': return 'bg-yellow-100 text-yellow-800'
            case 'Submitted': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
          }
        }
        return status ? (
          <span className={clsx("px-2 py-0.5 text-xs font-medium rounded-full", getStatusColor(status))}>
            {status}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      
      default:
        return String(driver[column.key] || '')
    }
  }

  // Service type context information
  const serviceTypes = [
    { id: 'ALL', name: 'All Services', icon: '🚗' },
    { id: '2W', name: 'Motorcycle', icon: '🏍️' },
    { id: '4W_CAR', name: 'Car', icon: '🚗' },
    { id: '4W_SUV', name: 'SUV', icon: '🚙' },
    { id: '4W_TAXI', name: 'Taxi', icon: '🚖' }
  ]

  const currentServiceInfo = serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0]

  return (
    <div className="mx-auto max-w-full p-2 pt-1">

      {/* Filter Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {/* Row 1: Search Box and Date Range */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-80">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
              }}
              placeholder="Search name or ID…"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-36"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-36"
            />
          </div>
        </div>

        {/* Row 2: Driver Type Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Driver Type:</span>
          {(['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE', 'BANNED'] as DriverCategory[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setCategory(type)
                setSelStatuses([])
              }}
              className={clsx(
                'rounded-full border px-2 py-1 text-xs hover:bg-gray-50',
                category === type && 'border-blue-600 bg-blue-50 text-blue-700',
                highlightedCategories.has(type) && q.trim() && 'ring-2 ring-yellow-300 bg-yellow-50'
              )}
            >
              {type === 'ACTIVE' ? 'Active' : 
               type === 'PENDING' ? 'Pending' :
               type === 'SUSPENDED' ? 'Suspended' :
               type === 'INACTIVE' ? 'Inactive' : 'Banned'}
            </button>
          ))}
        </div>

        {/* Row 3: Status Pills and Action Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Status:</span>
            {STATUS_BY_CATEGORY[category].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSelStatuses((arr) => toggle(arr, s))
                  }}
                className={clsx(
                  'rounded-full border px-2 py-1 text-xs hover:bg-gray-50',
                  selStatuses.includes(s) && 'border-blue-600 bg-blue-50 text-blue-700',
                  highlightedStatuses.has(s) && q.trim() && 'ring-2 ring-yellow-300 bg-yellow-50'
                )}
              >
                {s}
                {!!facetStatus[s] && (
                  <span className="ml-1 rounded-full bg-white/70 px-1.5">{facetStatus[s]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button onClick={clearAll} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Clear
            </button>
            <button onClick={resetToDefault} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              Reset Layout
            </button>
            <button
              onClick={() => exportCSV(filtered, `drivers_${selectedServiceType.toLowerCase()}_all.csv`)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Export all
            </button>
          </div>
        </div>



      </div>

      {/* Data Grid */}
      <div className="mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Results Counter Header */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
          <div className="text-xs text-gray-500">
            {q.trim() ? `${total} search results` : `Showing ${Math.min(10, total)} of ${total} drivers`}
          </div>
          <div className="text-xs font-medium text-gray-700">
            {total.toLocaleString()} total results
          </div>
        </div>
        
        <div className="overflow-auto max-h-[60vh]">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{ width: column.width, minWidth: column.minWidth }}
                    className={clsx(
                      "relative border-b border-gray-200 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 select-none cursor-move",
                      "hover:bg-gray-100 transition-colors",
                      draggedColumn === index && "opacity-50",
                      dropTargetColumn === index && "bg-blue-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {column.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:underline text-left flex-1"
                          onClick={() => onSort(column.key)}
                        >
                          {column.label}
                          {sortBy === column.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      ) : (
                        <span className="flex-1">{column.label}</span>
                      )}
                      
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => {
                          setResizingColumn(index)
                          const startX = e.clientX
                          const startWidth = column.width || 100
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const newWidth = startWidth + (e.clientX - startX)
                            handleColumnResize(index, newWidth)
                          }
                          
                          const handleMouseUp = () => {
                            setResizingColumn(null)
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }
                          
                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((driver) => (
                <tr 
                  key={driver.id} 
                  className="even:bg-gray-50/50 hover:bg-blue-50/60 cursor-pointer transition-colors duration-150"
                  onClick={() => handleDriverClick(driver)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        "border-b border-gray-100 px-2 py-1.5 text-xs",
                        (column.key === 'completed_trips' || column.key === 'completion_rate' || 
                         column.key === 'acceptance_rate' || column.key === 'cancellation_rate') && "text-right"
                      )}
                      style={{ width: column.width, minWidth: column.minWidth }}
                    >
                      {renderCellContent(driver, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Profile Modal */}
      {showDriverModal && selectedDriver && (
        <div className="fixed inset-0 z-50">
          <DriverAdminPortal 
            driver={{
              id: selectedDriver.id,
              name: selectedDriver.name,
              phone: `+639${Math.floor(Math.random() * 1000000000)}`,
              email: `${selectedDriver.name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
              address: selectedDriver.region,
              dateOfBirth: 'August 19, 1965',
              joinDate: selectedDriver.applied_at.split('T')[0],
              lastActive: selectedDriver.last_online === 'now' ? 'Online now' : selectedDriver.last_online,
              rating: 4.2 + (selectedDriver.completion_rate / 100) * 0.8
            }}
            onClose={() => setShowDriverModal(false)}
          />
        </div>
      )}
    </div>
  )
}

// Add displayName for debugging
DriverTableDemo.displayName = 'DriverTableDemo';

export default memo(DriverTableDemo);