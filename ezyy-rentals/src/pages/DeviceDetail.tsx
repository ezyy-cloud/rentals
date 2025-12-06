import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deviceTypesService, devicesService, accessoriesService } from '@/lib/services'
import type { DeviceType, Accessory } from '@/lib/types'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/SkeletonLoader'
import { ShareButton } from '@/components/ShareButton'
import { ShoppingCart, ArrowLeft } from 'lucide-react'

export function DeviceDetail({ deviceId }: { deviceId: string }) {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  // Support both device_id (legacy) and device_type_id
  // If deviceId is a device_type_id, we'll detect it by checking if it matches a device type
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null)
  const [availableCount, setAvailableCount] = useState(0)
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedAccessories, setSelectedAccessories] = useState<{ accessory_id: string; quantity: number }[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    loadData()
    // Set default dates with 10:00 AM default time
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    const endDate = new Date()
    endDate.setDate(today.getDate() + 7)
    endDate.setHours(10, 0, 0, 0)
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForDateTimeLocal = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    setStartDate(formatForDateTimeLocal(today))
    setEndDate(formatForDateTimeLocal(endDate))
  }, [deviceId])

  const loadData = async () => {
    setLoading(true)
    // Try to load as device type first
    const typeResult = await deviceTypesService.getById(deviceId)
    if (typeResult.data) {
      // It's a device type ID
      setDeviceType(typeResult.data)
      // Get availability count
      const availabilityResult = await devicesService.getAvailableByType()
      const availability = availabilityResult.data?.find(a => a.device_type.id === deviceId)
      setAvailableCount(availability?.available_count ?? 0)
    } else {
      // Try as device ID (legacy support)
      const deviceResult = await devicesService.getById(deviceId)
      if (deviceResult.data?.device_type) {
        setDeviceType(deviceResult.data.device_type)
        // Get availability count for this device type
        const availabilityResult = await devicesService.getAvailableByType()
        const availability = availabilityResult.data?.find(a => a.device_type.id === deviceResult.data.device_type_id)
        setAvailableCount(availability?.available_count ?? 0)
      }
    }

    const accessoriesResult = await accessoriesService.getAll()
    if (accessoriesResult.data) setAccessories(accessoriesResult.data)
    setLoading(false)
  }

  const handleAddToCart = () => {
    if (!deviceType || !startDate || !endDate) return

    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      showError('Start date cannot be in the past')
      return
    }

    if (end <= start) {
      showError('End date must be after start date')
      return
    }

    if (quantity > availableCount) {
      showError(`Only ${availableCount} unit${availableCount !== 1 ? 's' : ''} available`)
      return
    }

    addItem(deviceType.id, deviceType, quantity, startDate, endDate, selectedAccessories)
    showSuccess(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`)
    
    navigate('/cart')
  }

  const toggleAccessory = (accessoryId: string) => {
    setSelectedAccessories((prev) => {
      const existing = prev.find((a) => a.accessory_id === accessoryId)
      if (existing) {
        return prev.filter((a) => a.accessory_id !== accessoryId)
      } else {
        return [...prev, { accessory_id: accessoryId, quantity: 1 }]
      }
    })
  }

  const updateAccessoryQuantity = (accessoryId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAccessories((prev) => prev.filter((a) => a.accessory_id !== accessoryId))
    } else {
      setSelectedAccessories((prev) =>
        prev.map((a) => (a.accessory_id === accessoryId ? { ...a, quantity } : a))
      )
    }
  }

  const calculateCost = () => {
    if (!deviceType || !startDate || !endDate) return { rental: 0, deposit: 0, total: 0, accessoryCost: 0, days: 0 }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate per unit costs
    const deviceRentalCostPerUnit = deviceType.rental_rate * days
    const depositPerUnit = deviceType.deposit

    // Calculate accessory costs per unit (rental_rate × days × quantity for each accessory)
    const accessoryCostPerUnit = selectedAccessories.reduce((total, selected) => {
      const accessory = accessories.find((a) => a.id === selected.accessory_id)
      if (accessory) {
        return total + (accessory.rental_rate * days * selected.quantity)
      }
      return total
    }, 0)

    const totalRentalCostPerUnit = deviceRentalCostPerUnit + accessoryCostPerUnit
    const totalPerUnit = totalRentalCostPerUnit + depositPerUnit

    // Multiply by quantity
    const deviceRentalCost = deviceRentalCostPerUnit * quantity
    const accessoryCost = accessoryCostPerUnit * quantity
    const deposit = depositPerUnit * quantity
    const totalRentalCost = deviceRentalCost + accessoryCost
    const total = totalRentalCost + deposit

    return {
      rental: totalRentalCost,
      deposit,
      total,
      days,
      accessoryCost,
      perUnit: {
        rental: totalRentalCostPerUnit,
        deposit: depositPerUnit,
        total: totalPerUnit,
      },
    }
  }

  const cost = calculateCost()

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rectangular" width="100px" height="40px" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Skeleton variant="rectangular" height="400px" className="w-full mb-4" />
            <div className="px-4 pb-4 space-y-3">
              <Skeleton variant="text" width="60%" height="32px" />
              <Skeleton variant="text" width="40%" height="20px" />
              <Skeleton variant="text" width="50%" height="20px" />
            </div>
          </Card>
          <Card>
            <div className="p-4 space-y-4">
              <Skeleton variant="text" width="40%" height="28px" />
              <Skeleton variant="rectangular" width="100%" height="40px" />
              <Skeleton variant="rectangular" width="100%" height="40px" />
              <Skeleton variant="rectangular" width="100%" height="40px" />
              <Skeleton variant="rectangular" width="100%" height="48px" />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!deviceType) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Device type not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Browse
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => navigate('/')}
        className="border-black text-black hover:bg-gray-100"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Browse
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Type Information */}
        <Card>
          {deviceType.images && deviceType.images.length > 0 && (
            <div className="w-full h-64 mb-4 overflow-hidden rounded-t-lg">
              <img
                src={deviceType.images[0]}
                alt={deviceType.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
          {deviceType.images && deviceType.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mb-4 px-4">
              {deviceType.images.slice(1, 5).map((imageUrl, index) => (
                <div key={index} className="w-full h-20 overflow-hidden rounded border-2 border-gray-200">
                  <img
                    src={imageUrl}
                    alt={`${deviceType.name} ${index + 2}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-75"
                    onClick={() => {
                      // Could implement image gallery modal here
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="px-4 pb-4">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-black">{deviceType.name}</h1>
              <ShareButton
                url={window.location.href}
                title={`${deviceType.name} - ${deviceType.model}`}
                text={`Check out ${deviceType.name} on Ezyy Rentals`}
              />
            </div>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium text-black">Model:</span>{' '}
              <span className="text-gray-600">{deviceType.model}</span>
            </div>
            <div>
              <span className="font-medium text-black">Available:</span>{' '}
              <span className={`font-semibold ${availableCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {availableCount} unit{availableCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          </div>
        </Card>

        {/* Rental Information */}
        <Card>
          <h2 className="text-2xl font-bold text-black mb-4">Rental Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                max={availableCount}
                value={quantity}
                onChange={(e) => {
                  const newQuantity = parseInt(e.target.value) || 1
                  if (newQuantity > 0 && newQuantity <= availableCount) {
                    setQuantity(newQuantity)
                  }
                }}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                {availableCount} unit{availableCount !== 1 ? 's' : ''} available
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={(() => {
                  const now = new Date()
                  const year = now.getFullYear()
                  const month = String(now.getMonth() + 1).padStart(2, '0')
                  const day = String(now.getDate()).padStart(2, '0')
                  const hours = String(now.getHours()).padStart(2, '0')
                  const minutes = String(now.getMinutes()).padStart(2, '0')
                  return `${year}-${month}-${day}T${hours}:${minutes}`
                })()}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">End Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {accessories.length > 0 && (
              <div className="border-t-2 border-black pt-4">
                <h3 className="font-semibold text-black mb-3">Accessories</h3>
                <div className="space-y-2">
                  {accessories.map((accessory) => {
                    const selected = selectedAccessories.find((a) => a.accessory_id === accessory.id)
                    return (
                      <div key={accessory.id} className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleAccessory(accessory.id)}
                            className="w-4 h-4 border-2 border-black rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-black">{accessory.name}</span>
                            <span className="text-xs text-gray-600 ml-2">
                              ${accessory.rental_rate.toFixed(2)}/day
                            </span>
                          </div>
                        </label>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            max={accessory.quantity}
                            value={selected.quantity}
                            onChange={(e) =>
                              updateAccessoryQuantity(accessory.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 px-2 py-1 border-2 border-black rounded text-sm"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="border-t-2 border-black pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Device Rental:</span>
                  <span className="font-medium text-black">
                    ${deviceType.rental_rate.toFixed(2)}/day × {cost.days} days × {quantity} = ${((deviceType.rental_rate) * cost.days * quantity).toFixed(2)}
                  </span>
                </div>
                {cost.accessoryCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accessories:</span>
                    <span className="font-medium text-black">${cost.accessoryCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rental Cost:</span>
                  <span className="font-medium text-black">${cost.rental.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit:</span>
                  <span className="font-medium text-black">
                    ${cost.deposit.toFixed(2)} (${(cost.deposit / quantity).toFixed(2)} per unit)
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  ${cost.perUnit?.total.toFixed(2) ?? '0.00'} per unit
                </p>
                <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2">
                  <span className="text-black">Total:</span>
                  <span className="text-black">${cost.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!startDate || !endDate || cost.total === 0 || quantity > availableCount || availableCount === 0}
              className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}



