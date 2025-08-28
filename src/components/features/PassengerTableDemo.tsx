import React, { useMemo, useState } from 'react'
import { useServiceType } from '@/contexts/ServiceTypeContext'
import PassengerAdminPortal from './PassengerAdminPortal'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type ActivePassengerStatus = 'Regular' | 'Premium' | 'VIP' | 'New User (30 days)'
type SuspendedPassengerStatus = 'Payment Issues' | 'Multiple Cancellations' | 'Poor Rating' | 'Violation Report' | 'Under Investigation'
type BannedPassengerStatus = 'Fraud Detected' | 'Multiple Violations' | 'Abuse Report' | 'Fake Account' | 'Permanent Ban'

type PassengerStatus = ActivePassengerStatus | SuspendedPassengerStatus | BannedPassengerStatus

type PassengerService = '2W' | '4W' | 'TAXI' | 'TNVS'

type PassengerCategory = 'ACTIVE' | 'SUSPENDED' | 'BANNED'

type Passenger = {
  id: string
  name: string
  email: string
  phone: string
  status: PassengerStatus
  category: PassengerCategory
  preferred_service: PassengerService
  region: string
  signup_date: string // ISO datetime
  last_booking: string // ISO datetime
  // Operational metrics
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  completion_rate: number // 0-100
  cancellation_rate: number // 0-100
  average_rating: number // 1-5
  total_spent: number
  payment_method: 'Credit Card' | 'Digital Wallet' | 'Cash' | 'Bank Transfer'
  // Risk assessment
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical'
  is_verified: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const ACTIVE_STATUSES: ActivePassengerStatus[] = ['Regular', 'Premium', 'VIP', 'New User (30 days)']
const SUSPENDED_STATUSES: SuspendedPassengerStatus[] = ['Payment Issues', 'Multiple Cancellations', 'Poor Rating', 'Violation Report', 'Under Investigation']
const BANNED_STATUSES: BannedPassengerStatus[] = ['Fraud Detected', 'Multiple Violations', 'Abuse Report', 'Fake Account', 'Permanent Ban']

const ALL_STATUSES: PassengerStatus[] = [...ACTIVE_STATUSES, ...SUSPENDED_STATUSES, ...BANNED_STATUSES]

const SERVICES: PassengerService[] = ['2W', '4W', 'TAXI', 'TNVS']
const REGIONS = ['NCR', 'Bicol', 'Cebu', 'Davao', 'Iloilo', 'Baguio']
const PAYMENT_METHODS: Passenger['payment_method'][] = ['Credit Card', 'Digital Wallet', 'Cash', 'Bank Transfer']

const STATUS_BY_CATEGORY: Record<PassengerCategory, PassengerStatus[]> = {
  ACTIVE: ACTIVE_STATUSES,
  SUSPENDED: SUSPENDED_STATUSES,
  BANNED: BANNED_STATUSES
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────────────
function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(' ')
}

function exportCSV(rows: Passenger[], filename = 'passengers_demo.csv') {
  const headers = [
    'id',
    'name', 
    'email',
    'phone',
    'status',
    'preferred_service',
    'region',
    'total_bookings',
    'completion_rate',
    'cancellation_rate',
    'average_rating',
    'total_spent',
    'payment_method',
    'signup_date',
    'last_booking',
    'risk_level',
    'is_verified'
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const vals = [
      r.id,
      r.name,
      r.email,
      r.phone,
      r.status,
      r.preferred_service,
      r.region || '',
      r.total_bookings,
      r.completion_rate + '%',
      r.cancellation_rate + '%',
      r.average_rating,
      '₱' + r.total_spent,
      r.payment_method,
      r.signup_date,
      r.last_booking,
      r.risk_level,
      r.is_verified ? 'Verified' : 'Unverified'
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

function randomName(i: number) {
  const first = ['Maria', 'Juan', 'Ana', 'Jose', 'Grace', 'Carlo', 'Liza', 'Ramon', 'Diana', 'Paolo']
  const last = ['Santos', 'Cruz', 'Reyes', 'Garcia', 'Torres', 'Flores', 'Ramos', 'Gonzales', 'Bautista', 'Navarro']
  const f = randomChoice(first)
  const l = randomChoice(last)
  return `${f} ${l} ${i}`
}

function randomEmail(name: string) {
  const domain = randomChoice(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'])
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`
}

function randomPhone() {
  const base = 900000000 + Math.floor(Math.random() * 99999999)
  return '+639' + String(base).slice(0, 9)
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
function useMockPassengers() {
  return useMemo<Passenger[]>(() => {
    const rows: Passenger[] = []
    for (let i = 1; i <= 2000; i++) {
      // Distribute categories: 85% ACTIVE, 10% SUSPENDED, 5% BANNED
      let category: PassengerCategory
      const rand = Math.random()
      if (rand < 0.85) category = 'ACTIVE'
      else if (rand < 0.95) category = 'SUSPENDED'
      else category = 'BANNED'
      
      const status = randomChoice(STATUS_BY_CATEGORY[category])
      const preferredService = randomChoice(SERVICES)
      const region = randomChoice(REGIONS)
      const signupDays = Math.floor(Math.random() * 365) // within a year
      const lastBookingDays = Math.floor(Math.random() * 30) // within 30 days
      
      const name = randomName(i)
      const email = randomEmail(name)
      const phone = randomPhone()
      
      // Generate realistic booking metrics
      const totalBookings = Math.floor(Math.random() * 150) + 1 // 1-150 bookings
      const completedBookings = Math.floor(totalBookings * (0.85 + Math.random() * 0.12)) // 85-97% completion
      const cancelledBookings = totalBookings - completedBookings
      const completionRate = Math.round((completedBookings / totalBookings) * 100)
      const cancellationRate = Math.round((cancelledBookings / totalBookings) * 100)
      const averageRating = Math.round((4.0 + Math.random() * 1.0) * 10) / 10 // 4.0-5.0
      const totalSpent = Math.floor(totalBookings * (150 + Math.random() * 300)) // ₱150-450 per booking avg
      
      const passenger: Passenger = {
        id: String(200000 + i),
        name,
        email,
        phone,
        status,
        category,
        preferred_service: preferredService,
        region,
        signup_date: daysAgo(signupDays),
        last_booking: daysAgo(lastBookingDays),
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        completion_rate: completionRate,
        cancellation_rate: cancellationRate,
        average_rating: averageRating,
        total_spent: totalSpent,
        payment_method: randomChoice(PAYMENT_METHODS),
        risk_level: randomChoice(['Low', 'Low', 'Low', 'Medium', 'Medium', 'High', 'Critical'] as const),
        is_verified: Math.random() > 0.15 // 85% verified
      }
      
      rows.push(passenger)
    }
    return rows
  }, [])
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
interface ColumnConfig {
  key: keyof Passenger
  label: string
  width?: number
  minWidth?: number
  sortable?: boolean
}

interface PassengerTableDemoProps {
  category?: PassengerCategory
  title?: string
  description?: string
}

export default function PassengerTableDemo({ 
  category: initialCategory = 'ACTIVE',
  title,
  description
}: PassengerTableDemoProps) {
  const data = useMockPassengers()
  const { selectedServiceType } = useServiceType()
  
  // Passenger category state
  const [category, setCategory] = useState<PassengerCategory>(initialCategory)

  // Passenger profile modal
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null)
  const [showPassengerModal, setShowPassengerModal] = useState(false)

  // Column configurations
  const getDefaultColumns = (category: PassengerCategory): ColumnConfig[] => {
    const baseColumns: ColumnConfig[] = [
      { key: 'status', label: 'Status', width: 140, minWidth: 120, sortable: true },
      { key: 'name', label: 'Passenger Name', width: 180, minWidth: 150, sortable: true },
      { key: 'email', label: 'Email', width: 200, minWidth: 150, sortable: true },
      { key: 'phone', label: 'Phone', width: 140, minWidth: 120, sortable: true },
    ]

    return [
      ...baseColumns,
      { key: 'total_bookings', label: 'Total Bookings', width: 120, minWidth: 100, sortable: true },
      { key: 'completion_rate', label: 'Completion Rate %', width: 140, minWidth: 120, sortable: true },
      { key: 'average_rating', label: 'Avg Rating', width: 100, minWidth: 90, sortable: true },
      { key: 'total_spent', label: 'Total Spent', width: 120, minWidth: 100, sortable: true },
      { key: 'preferred_service', label: 'Preferred Service', width: 140, minWidth: 120, sortable: true },
      { key: 'payment_method', label: 'Payment Method', width: 140, minWidth: 120, sortable: true },
      { key: 'signup_date', label: 'Signup Date', width: 120, minWidth: 100, sortable: true },
      { key: 'last_booking', label: 'Last Booking', width: 120, minWidth: 100, sortable: true },
      { key: 'region', label: 'Region', width: 100, minWidth: 80, sortable: true },
      { key: 'risk_level', label: 'Risk Level', width: 120, minWidth: 100, sortable: true },
    ]
  }

  const defaultColumns = getDefaultColumns(category)

  // Column customization state
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`passenger-table-columns-${initialCategory}`)
      return saved ? JSON.parse(saved) : defaultColumns
    }
    return defaultColumns
  })

  // Update columns when category changes
  React.useEffect(() => {
    const newDefaultColumns = getDefaultColumns(category)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`passenger-table-columns-${category}`)
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
  const [selStatuses, setSelStatuses] = useState<PassengerStatus[]>([])
  const [region, setRegion] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  
  // Search highlighting
  const [highlightedCategories, setHighlightedCategories] = useState<Set<PassengerCategory>>(new Set())
  const [highlightedStatuses, setHighlightedStatuses] = useState<Set<PassengerStatus>>(new Set())

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Passenger>('signup_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggle<T extends string>(arr: T[], v: T) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
  }

  // Map service types from global filter to local service types
  const getFilteredByServiceType = (data: Passenger[]) => {
    if (selectedServiceType === 'ALL') return data
    
    // Map global service types to local service types
    const serviceMapping: Record<string, PassengerService> = {
      '2W': '2W',
      '4W_CAR': '4W',
      '4W_SUV': '4W', 
      '4W_TAXI': 'TAXI'
    }
    
    const localServiceType = serviceMapping[selectedServiceType]
    if (!localServiceType) return data
    
    return data.filter(passenger => passenger.preferred_service === localServiceType)
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

    // Find all passengers that match the search
    const searchResults = getFilteredByServiceType(data).filter((r) => {
      const hay = `${r.name} ${r.email} ${r.phone}`.toLowerCase()
      return hay.includes(ql)
    })

    // Extract categories and statuses from search results
    const foundCategories = new Set<PassengerCategory>()
    const foundStatuses = new Set<PassengerStatus>()
    
    searchResults.forEach((passenger) => {
      foundCategories.add(passenger.category)
      foundStatuses.add(passenger.status)
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
      // Search across ALL passengers regardless of category
      rows = rows.filter((r) => {
        const hay = `${r.name} ${r.email} ${r.phone}`.toLowerCase()
        return hay.includes(ql)
      })
    } else {
      // Only filter by category when no search query
      rows = rows.filter((r) => r.category === category)
    }

    // Apply other filters
    rows = rows.filter((r) => {
      // Skip status filter during global search to show all matching results
      if (!hasSearch && selStatuses.length && !selStatuses.includes(r.status)) return false
      if (from && new Date(r.signup_date) < new Date(from)) return false
      if (to && new Date(r.signup_date) > new Date(to + 'T23:59:59')) return false
      return true
    })

    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const va = a[sortBy]
      const vb = b[sortBy]
      if (sortBy === 'signup_date' || sortBy === 'last_booking') {
        return (new Date(va as string).getTime() - new Date(vb as string).getTime()) * dir
      }
      if (sortBy === 'risk_level') {
        const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }
        return (riskOrder[va as keyof typeof riskOrder] - riskOrder[vb as keyof typeof riskOrder]) * dir
      }
      return String(va).localeCompare(String(vb)) * dir
    })

    return rows
  }, [data, selectedServiceType, q, selStatuses, category, from, to, sortBy, sortDir])

  const total = filtered.length
  const displayRows = filtered.slice(0, 10) // Always show first 10 rows

  // Facets (counts within current filter context)
  const facetStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of filtered) m[r.status] = (m[r.status] || 0) + 1
    return m
  }, [filtered])

  const clearAll = () => {
    setQ('')
    setSelStatuses([])
    setFrom('')
    setTo('')
  }

  const onSort = (key: keyof Passenger) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const handlePassengerClick = (passenger: Passenger) => {
    setSelectedPassenger(passenger)
    setShowPassengerModal(true)
  }

  // Column management functions
  const saveColumnConfig = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`passenger-table-columns-${category}`, JSON.stringify(newColumns))
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
  const renderCellContent = (passenger: Passenger, column: ColumnConfig) => {
    switch (column.key) {
      case 'status':
        const getStatusIcon = (status: PassengerStatus) => {
          if (ACTIVE_STATUSES.includes(status as ActivePassengerStatus)) return '✅'
          if (SUSPENDED_STATUSES.includes(status as SuspendedPassengerStatus)) return '⚠️'
          if (BANNED_STATUSES.includes(status as BannedPassengerStatus)) return '❌'
          return '❓'
        }
        
        return (
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(passenger.status)}</span>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{passenger.status}</span>
              {passenger.is_verified && <span className="text-xs text-green-600">✓ Verified</span>}
            </div>
          </div>
        )
      
      case 'name':
        return (
          <div className="flex flex-col">
            <span className="font-medium">{passenger.name}</span>
            <span className="text-xs text-gray-500">ID: {passenger.id}</span>
          </div>
        )
      
      case 'email':
        return <span className="text-xs">{passenger.email}</span>
      
      case 'phone':
        return <span className="text-xs font-mono">{passenger.phone}</span>
      
      case 'total_bookings':
        return <span className="font-medium">{passenger.total_bookings}</span>
      
      case 'completion_rate':
        return (
          <span 
            className="font-medium cursor-help" 
            title={`${passenger.completed_bookings} completed / ${passenger.total_bookings} total`}
          >
            {passenger.completion_rate}%
          </span>
        )
      
      case 'average_rating':
        return (
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="font-medium">{passenger.average_rating}</span>
          </div>
        )
      
      case 'total_spent':
        return <span className="font-medium">₱{passenger.total_spent.toLocaleString()}</span>
      
      case 'preferred_service':
        return (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
            {passenger.preferred_service}
          </span>
        )
      
      case 'payment_method':
        const getPaymentIcon = (method: string) => {
          switch (method) {
            case 'Credit Card': return '💳'
            case 'Digital Wallet': return '📱'
            case 'Cash': return '💵'
            case 'Bank Transfer': return '🏦'
            default: return '💰'
          }
        }
        return (
          <div className="flex items-center gap-1">
            <span>{getPaymentIcon(passenger.payment_method)}</span>
            <span className="text-xs">{passenger.payment_method}</span>
          </div>
        )
      
      case 'signup_date':
      case 'last_booking':
        return <span className="text-xs">{formatDate(passenger[column.key] as string)}</span>
      
      case 'region':
        return passenger.region
      
      case 'risk_level':
        const getRiskColor = (risk: string) => {
          switch (risk) {
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
          }
        }
        return (
          <span className={clsx("px-2 py-1 text-xs font-medium rounded border", getRiskColor(passenger.risk_level))}>
            {passenger.risk_level}
          </span>
        )
      
      default:
        return String(passenger[column.key] || '')
    }
  }

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
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or phone…"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-36"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-36"
            />
          </div>
        </div>

        {/* Row 2: Passenger Type Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Passenger Type:</span>
          {(['ACTIVE', 'SUSPENDED', 'BANNED'] as PassengerCategory[]).map((type) => (
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
               type === 'SUSPENDED' ? 'Suspended' : 'Banned'}
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
                onClick={() => setSelStatuses((arr) => toggle(arr, s))}
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
              onClick={() => exportCSV(filtered, `passengers_${selectedServiceType.toLowerCase()}_all.csv`)}
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
            {q.trim() ? `${total} search results` : `Showing ${Math.min(10, total)} of ${total} passengers`}
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
              {displayRows.map((passenger) => (
                <tr 
                  key={passenger.id} 
                  className="even:bg-gray-50/50 hover:bg-blue-50/60 cursor-pointer transition-colors duration-150"
                  onClick={() => handlePassengerClick(passenger)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        "border-b border-gray-100 px-2 py-1.5 text-xs",
                        (column.key === 'total_bookings' || column.key === 'completion_rate' || 
                         column.key === 'average_rating' || column.key === 'total_spent') && "text-right"
                      )}
                      style={{ width: column.width, minWidth: column.minWidth }}
                    >
                      {renderCellContent(passenger, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passenger Profile Modal */}
      {showPassengerModal && selectedPassenger && (
        <PassengerAdminPortal 
          passenger={{
            id: selectedPassenger.id,
            name: selectedPassenger.name,
            phone: selectedPassenger.phone,
            email: selectedPassenger.email,
            address: selectedPassenger.region,
            dateOfBirth: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0], // Random DOB
            joinDate: selectedPassenger.signup_date.split('T')[0],
            lastActive: selectedPassenger.last_booking === 'now' ? 'Online now' : selectedPassenger.last_booking,
            rating: selectedPassenger.average_rating
          }}
          onClose={() => setShowPassengerModal(false)}
        />
      )}
    </div>
  )
}