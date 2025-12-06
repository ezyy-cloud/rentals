import { useState, useEffect } from 'react'
import { usersService, devicesService, rentalsService, deviceTypesService, accessoriesService } from '@/lib/supabase-service'
import { notificationsService } from '@/lib/notifications-service'
import type { Rental } from '@/lib/supabase-types'
import { AlertTriangle, Package, Calendar, Users, Smartphone, Tag, TrendingUp, Clock } from 'lucide-react'
import { StatCardSkeleton, Skeleton } from '@/components/SkeletonLoader'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export function Overview() {
  const { showError } = useToast()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDevices: 0,
    totalDeviceTypes: 0,
    totalAccessories: 0,
    activeRentals: 0,
    totalRentals: 0,
    availableDevices: 0,
    rentedDevices: 0,
    workingDevices: 0,
    nonWorkingDevices: 0,
    devicesWithSubscriptionIssues: 0,
  })
  const [alerts, setAlerts] = useState({
    pendingShipments: 0,
    overdueRentals: 0,
    upcomingReturns: 0,
    unreadNotifications: 0,
    devicesWithSubscriptionIssues: 0,
  })
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    todayRevenue: 0,
    averageRentalValue: 0,
    totalDeposits: 0,
  })
  const [recentRentals, setRecentRentals] = useState<Rental[]>([])
  const [deviceTypeStats, setDeviceTypeStats] = useState<Array<{ deviceType: { id: string; name: string }, total: number; available: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOverviewData()
    // Generate notifications on load
    notificationsService.generateNotifications()
  }, [])

  // Subscribe to real-time updates for rentals
  useRealtimeSubscription({
    table: 'rentals',
    event: '*',
    onInsert: () => {
      loadOverviewData()
    },
    onUpdate: () => {
      loadOverviewData()
    },
    onDelete: () => {
      loadOverviewData()
    },
  })

  // Subscribe to real-time updates for devices
  useRealtimeSubscription({
    table: 'devices',
    event: '*',
    onInsert: () => {
      loadOverviewData()
    },
    onUpdate: () => {
      loadOverviewData()
    },
    onDelete: () => {
      loadOverviewData()
    },
  })

  // Subscribe to real-time updates for users
  useRealtimeSubscription({
    table: 'users',
    event: '*',
    onInsert: () => {
      loadOverviewData()
    },
    onUpdate: () => {
      loadOverviewData()
    },
    onDelete: () => {
      loadOverviewData()
    },
  })

  // Subscribe to real-time updates for notifications
  useRealtimeSubscription({
    table: 'notifications',
    event: '*',
    onInsert: () => {
      // Reload to get updated unread count
      loadOverviewData()
    },
    onUpdate: () => {
      // Reload to get updated unread count
      loadOverviewData()
    },
    onDelete: () => {
      // Reload to get updated unread count
      loadOverviewData()
    },
  })

  const loadOverviewData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load all data in parallel
      const [usersResult, devicesResult, deviceTypesResult, accessoriesResult, rentalsResult] = await Promise.all([
        usersService.getAll(),
        devicesService.getAll(),
        deviceTypesService.getAll(),
        accessoriesService.getAll(),
        rentalsService.getAll(),
      ])

      const users = usersResult.data ?? []
      const devices = devicesResult.data ?? []
      const deviceTypes = deviceTypesResult.data ?? []
      const accessories = accessoriesResult.data ?? []
      const rentals = rentalsResult.data ?? []

      // Calculate active rentals (where current time is between start and end timestamp)
      const now = new Date()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const activeRentals = rentals.filter((rental) => {
        if (rental.returned_date) return false
        const startDate = new Date(rental.start_date)
        const endDate = new Date(rental.end_date)
        return now >= startDate && now <= endDate
      })

      // Calculate device status
      const workingDevices = devices.filter(d => d.working_state === 'Working').length
      const nonWorkingDevices = devices.length - workingDevices
      
      // Get rented device IDs
      const rentedDeviceIds = new Set(
        activeRentals.map(r => r.device_id)
      )
      
      // Calculate available devices (not rented, working, subscription paid if required)
      const availableDevices = devices.filter(d => {
        if (rentedDeviceIds.has(d.id)) return false
        if (d.working_state !== 'Working') return false
        // Check subscription if required
        if (d.device_type?.has_subscription) {
          if (!d.subscription_date) return false
          const subscriptionDate = new Date(d.subscription_date)
          subscriptionDate.setHours(0, 0, 0, 0)
          if (subscriptionDate < today) return false
        }
        return true
      }).length
      
      const rentedDevices = rentedDeviceIds.size
      
      // Calculate device counts per device type
      const deviceTypeStatsData = deviceTypes.map(deviceType => {
        const typeDevices = devices.filter(d => d.device_type_id === deviceType.id)
        const total = typeDevices.length
        const available = typeDevices.filter(d => {
          if (rentedDeviceIds.has(d.id)) return false
          if (d.working_state !== 'Working') return false
          // Check subscription if required
          if (deviceType.has_subscription) {
            if (!d.subscription_date) return false
            const subscriptionDate = new Date(d.subscription_date)
            subscriptionDate.setHours(0, 0, 0, 0)
            if (subscriptionDate < today) return false
          }
          return true
        }).length
        return { deviceType: { id: deviceType.id, name: deviceType.name }, total, available }
      })

      // Check for devices with subscription issues
      const devicesWithSubscriptionIssues = devices.filter((device) => {
        if (!device.device_type?.has_subscription) return false
        if (!device.subscription_date) return true
        const subscriptionDate = new Date(device.subscription_date)
        subscriptionDate.setHours(0, 0, 0, 0)
        return subscriptionDate < today
      }).length

      // Calculate alerts
      const pendingShipments = rentals.filter(r => 
        r.delivery_method === 'shipping' && !r.shipped_date && !r.returned_date
      ).length

      const overdueRentals = rentals.filter(r => {
        if (r.returned_date) return false
        const endDate = new Date(r.end_date)
        return endDate < now
      }).length

      const sevenDaysFromNow = new Date(now)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const upcomingReturns = rentals.filter(r => {
        if (r.returned_date) return false
        const endDate = new Date(r.end_date)
        return endDate >= now && endDate <= sevenDaysFromNow
      }).length

      // Get unread notifications count
      const { count: unreadNotifications } = await notificationsService.getUnreadCount()

      // Get recent rentals (last 5, sorted by created_at)
      const recent = [...rentals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      // Calculate revenue metrics
      // Revenue = total_paid - deposit (deposits are refundable, so not counted as revenue)
      // Also need to calculate rental fees from device rate × days + accessory rates × days
      const calculateRentalRevenue = (rental: Rental) => {
        const start = new Date(rental.start_date)
        const end = new Date(rental.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        const deviceRental = rental.rate * days
        
        // Calculate accessory rental costs
        const accessoryRental = (rental.accessories ?? []).reduce((sum, ra) => {
          const accessory = ra.accessory
          if (accessory) {
            return sum + (accessory.rental_rate * days * ra.quantity)
          }
          return sum
        }, 0)
        
        return deviceRental + accessoryRental
      }

      const totalRevenue = rentals.reduce((sum, rental) => sum + calculateRentalRevenue(rental), 0)
      const totalDeposits = rentals.reduce((sum, rental) => sum + rental.deposit, 0)
      
      // Monthly revenue (current month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = rentals
        .filter((rental) => {
          const rentalDate = new Date(rental.created_at)
          return rentalDate.getMonth() === currentMonth && rentalDate.getFullYear() === currentYear
        })
        .reduce((sum, rental) => sum + calculateRentalRevenue(rental), 0)

      // Today's revenue (reuse the today variable already declared above)
      const todayRevenue = rentals
        .filter((rental) => {
          const rentalDate = new Date(rental.created_at)
          rentalDate.setHours(0, 0, 0, 0)
          return rentalDate.getTime() === today.getTime()
        })
        .reduce((sum, rental) => sum + calculateRentalRevenue(rental), 0)

      // Average rental value (revenue only, excluding deposits)
      const averageRentalValue = rentals.length > 0 ? totalRevenue / rentals.length : 0

      setStats({
        totalUsers: users.length,
        totalDevices: devices.length,
        totalDeviceTypes: deviceTypes.length,
        totalAccessories: accessories.length,
        activeRentals: activeRentals.length,
        totalRentals: rentals.length,
        availableDevices,
        rentedDevices,
        workingDevices,
        nonWorkingDevices,
        devicesWithSubscriptionIssues,
      })
      setAlerts({
        pendingShipments,
        overdueRentals,
        upcomingReturns,
        unreadNotifications: unreadNotifications ?? 0,
        devicesWithSubscriptionIssues,
      })
      setRevenue({
        totalRevenue,
        monthlyRevenue,
        todayRevenue,
        averageRentalValue,
        totalDeposits,
      })
      setRecentRentals(recent)
      setDeviceTypeStats(deviceTypeStatsData)
    } catch (err) {
      const errorMsg = 'Failed to load overview data. Please try again.'
      setError(errorMsg)
      showError(errorMsg)
      console.error('Error loading overview data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const totalAlerts = alerts.pendingShipments + alerts.overdueRentals + alerts.devicesWithSubscriptionIssues

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Platform Overview</h1>
        <p className="text-sm sm:text-base text-gray-600">Real-time status of your rental platform</p>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={loadOverviewData} />
      )}

      {/* Critical Alerts Section */}
      {totalAlerts > 0 && (
        <div className="bg-red-50 border-2 border-red-500 p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg sm:text-xl font-bold text-red-600">Action Required</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {alerts.pendingShipments > 0 && (
              <div className="bg-white border-2 border-red-300 p-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Shipments</p>
                    <p className="text-2xl font-bold text-red-600">{alerts.pendingShipments}</p>
                  </div>
                  <Package className="w-8 h-8 text-red-400" />
                </div>
              </div>
            )}
            {alerts.overdueRentals > 0 && (
              <div className="bg-white border-2 border-red-300 p-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue Rentals</p>
                    <p className="text-2xl font-bold text-red-600">{alerts.overdueRentals}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-red-400" />
                </div>
              </div>
            )}
            {alerts.devicesWithSubscriptionIssues > 0 && (
              <div className="bg-white border-2 border-red-300 p-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Subscription Issues</p>
                    <p className="text-2xl font-bold text-red-600">{alerts.devicesWithSubscriptionIssues}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Active Rentals</h3>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.activeRentals}</p>
              <p className="text-xs text-gray-500 mt-1">of {stats.totalRentals} total</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Available Devices</h3>
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.availableDevices}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.rentedDevices} currently rented</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Upcoming Returns</h3>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{alerts.upcomingReturns}</p>
              <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Unread Notifications</h3>
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{alerts.unreadNotifications}</p>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </div>
          </>
        )}
      </div>

      {/* Revenue Section */}
      <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
        <h2 className="text-lg sm:text-xl font-bold text-black mb-4">Revenue Overview</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton variant="text" width="120px" height="16px" className="mb-2" />
                <Skeleton variant="text" width="80px" height="32px" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
              <p className="text-2xl font-bold text-black">${revenue.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Revenue</h3>
              <p className="text-2xl font-bold text-black">${revenue.monthlyRevenue.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Revenue</h3>
              <p className="text-2xl font-bold text-black">${revenue.todayRevenue.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Rental Value</h3>
              <p className="text-2xl font-bold text-black">${revenue.averageRentalValue.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Deposits</h3>
              <p className="text-2xl font-bold text-black">${revenue.totalDeposits.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.totalUsers}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Devices</h3>
                <Smartphone className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.totalDevices}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.workingDevices} working, {stats.nonWorkingDevices} needs repair
              </p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Accessories</h3>
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.totalAccessories}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Rentals</h3>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">{stats.totalRentals}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Device Status</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-black">
                {stats.totalDevices > 0 
                  ? Math.round((stats.workingDevices / stats.totalDevices) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Devices operational</p>
            </div>
          </div>
          
          {/* Device Types Breakdown - Own Row */}
          <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-black">Device Types Breakdown</h3>
              <Tag className="w-5 h-5 text-gray-400" />
            </div>
            {deviceTypeStats.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {deviceTypeStats.map(({ deviceType, total, available }) => (
                  <div key={deviceType.id} className="border-2 border-gray-200 rounded p-3">
                    <p className="text-sm font-medium text-black mb-1">{deviceType.name}</p>
                    <p className="text-lg font-bold text-black">{available}/{total}</p>
                    <p className="text-xs text-gray-500">available/total</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No device types found</p>
            )}
          </div>
        </>
      )}

      {/* Recent Activity */}
      <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
        <h2 className="text-lg sm:text-xl font-bold text-black mb-4">Recent Rentals</h2>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-gray-200 pb-4">
                <Skeleton variant="text" width="40%" height="20px" className="mb-2" />
                <Skeleton variant="text" width="60%" height="16px" className="mb-1" />
                <Skeleton variant="text" width="30%" height="14px" />
              </div>
            ))}
          </div>
        ) : recentRentals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No recent rentals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRentals.map((rental) => (
              <div key={rental.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                  <div className="flex-1">
                    <p className="font-semibold text-black">
                      {rental.user ? `${rental.user.first_name} ${rental.user.last_name}` : 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {rental.device?.name ?? 'Unknown Device'} • {rental.device?.device_type?.name ?? 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(rental.start_date)} - {formatDate(rental.end_date)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right mt-2 sm:mt-0">
                    <p className="font-semibold text-black">${rental.total_paid.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      Rate: ${rental.rate.toFixed(2)}/day
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
