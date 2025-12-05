import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { rentalsService } from '@/lib/services'
import type { Rental } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/SkeletonLoader'
import { Calendar, Package, DollarSign, Clock } from 'lucide-react'

export function MyRentals() {
  const { appUser } = useAuth()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    if (appUser) {
      loadRentals()
    }
  }, [appUser])

  const loadRentals = async () => {
    if (!appUser) return

    setLoading(true)
    const { data, error } = await rentalsService.getUserRentals(appUser.id)
    if (data) setRentals(data)
    if (error) console.error('Error loading rentals:', error)
    setLoading(false)
  }

  const filteredRentals = rentals.filter((rental) => {
    if (filter === 'active') {
      return !rental.returned_date
    }
    if (filter === 'completed') {
      return !!rental.returned_date
    }
    return true
  })

  const rentalStats = useMemo(() => {
    const active = rentals.filter(r => !r.returned_date).length
    const completed = rentals.filter(r => !!r.returned_date).length
    const totalSpent = rentals.reduce((sum, r) => sum + r.total_paid, 0)
    const totalDevices = rentals.length

    return { active, completed, totalSpent, totalDevices }
  }, [rentals])

  const getRentalStatus = (rental: Rental) => {
    if (rental.returned_date) {
      return { text: 'Returned', color: 'text-green-600' }
    }
    const today = new Date()
    const endDate = new Date(rental.end_date)
    if (endDate < today) {
      return { text: 'Overdue', color: 'text-red-600' }
    }
    return { text: 'Active', color: 'text-blue-600' }
  }

  if (!appUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You must be logged in to view your rentals</p>
        <Button onClick={() => window.location.reload()} className="bg-black text-white hover:bg-gray-800">
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">My Rentals</h1>
        <p className="text-gray-600">View and manage your device rentals</p>
      </div>

      {/* Rental Statistics */}
      {!loading && rentals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Rentals</p>
                <p className="text-2xl font-bold text-black">{rentalStats.totalDevices}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-blue-600">{rentalStats.active}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600">{rentalStats.completed}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-black">${rentalStats.totalSpent.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-black text-white' : 'border-black text-black'}
        >
          All
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-black text-white' : 'border-black text-black'}
        >
          Active
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-black text-white' : 'border-black text-black'}
        >
          Completed
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="p-4 space-y-3">
                <Skeleton variant="text" width="40%" height="24px" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton variant="text" width="80%" height="16px" />
                  <Skeleton variant="text" width="80%" height="16px" />
                </div>
                <Skeleton variant="text" width="60%" height="16px" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredRentals.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">No rentals found</h2>
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? "You haven't made any rentals yet"
              : filter === 'active'
              ? 'You have no active rentals'
              : 'You have no completed rentals'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRentals.map((rental) => {
            const status = getRentalStatus(rental)
            const deviceType = rental.device?.device_type

            return (
              <Card key={rental.id}>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-black">
                        {rental.device?.name ?? 'Unknown Device'}
                      </h3>
                      <span className={`font-semibold ${status.color}`}>{status.text}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">
                          <span className="font-medium text-black">Device Type:</span>{' '}
                          {deviceType?.name ?? 'N/A'}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <span className="font-medium text-black">Model:</span>{' '}
                          {deviceType?.model ?? 'N/A'}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium text-black">Condition:</span>{' '}
                          {rental.device?.condition ?? 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-600 mb-1 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium text-black">Start:</span>{' '}
                          {new Date(rental.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-gray-600 mb-1 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium text-black">End:</span>{' '}
                          {new Date(rental.end_date).toLocaleDateString()}
                        </p>
                        {rental.returned_date && (
                          <p className="text-gray-600 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="font-medium text-black">Returned:</span>{' '}
                            {new Date(rental.returned_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {rental.accessories && rental.accessories.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-black mb-1">Accessories:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {rental.accessories.map((acc) => (
                            <li key={acc.id}>
                              {acc.quantity}x {acc.accessory?.name ?? 'Unknown'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="sm:w-48 border-l-0 sm:border-l-2 border-t-2 sm:border-t-0 border-black pl-0 sm:pl-4 pt-4 sm:pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-medium text-black">${rental.rate.toFixed(2)}/day</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Deposit:</span>
                        <span className="font-medium text-black">${rental.deposit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Paid:</span>
                        <span className="font-medium text-black">${rental.total_paid.toFixed(2)}</span>
                      </div>
                      <div className="border-t-2 border-black pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span className="text-black">Total:</span>
                          <span className="text-black">${rental.total_paid.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

