import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { accessoriesService } from '@/lib/services'
import type { Accessory } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Trash2, ShoppingBag, ArrowRight, Heart, RotateCcw, Package } from 'lucide-react'

export function Cart() {
  const navigate = useNavigate()
  const { showSuccess } = useToast()
  const { items, savedForLater, lastRemovedItem, removeItem, updateItem, saveForLater, moveToCart, undoRemove } = useCart()
  const [accessories, setAccessories] = useState<Accessory[]>([])

  useEffect(() => {
    loadAccessories()
  }, [])

  const loadAccessories = async () => {
    const { data } = await accessoriesService.getAll()
    if (data) setAccessories(data)
  }


  const calculateItemCost = (item: typeof items[0]) => {
    const deviceType = item.device_type
    if (!deviceType) return { rental: 0, deposit: 0, total: 0, days: 0, accessoryCost: 0, perUnit: { rental: 0, deposit: 0, total: 0 } }

    const start = new Date(item.start_date)
    const end = new Date(item.end_date)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate per unit costs
    const deviceRentalCostPerUnit = deviceType.rental_rate * days
    const depositPerUnit = deviceType.deposit

    // Calculate accessory costs per unit (rental_rate × days × quantity for each accessory)
    const accessoryCostPerUnit = (item.accessories ?? []).reduce((total, selected) => {
      const accessory = accessories.find((a) => a.id === selected.accessory_id)
      if (accessory) {
        return total + (accessory.rental_rate * days * selected.quantity)
      }
      return total
    }, 0)

    const totalRentalCostPerUnit = deviceRentalCostPerUnit + accessoryCostPerUnit
    const totalPerUnit = totalRentalCostPerUnit + depositPerUnit

    // Multiply by quantity
    const deviceRentalCost = deviceRentalCostPerUnit * item.quantity
    const accessoryCost = accessoryCostPerUnit * item.quantity
    const deposit = depositPerUnit * item.quantity
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

  // Calculate total using calculateItemCost to include accessories
  const totalCost = items.reduce((total, item) => {
    const cost = calculateItemCost(item)
    return total + cost.total
  }, 0)

  if (items.length === 0) {
    return (
      <div className="max-w-5xl lg:max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Start browsing devices to add them to your cart</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-black text-white hover:bg-gray-800 mx-auto"
          >
            Browse Devices
          </Button>
        </div>

        {/* Saved for Later Section */}
        {savedForLater.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-black mb-4">Saved for Later</h2>
            <div className="space-y-4 lg:space-y-6">
              {savedForLater.map((item) => {
                const deviceType = item.device_type
                return (
                  <Card key={item.device_type_id} className="p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center justify-between gap-4 lg:gap-8">
                      <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
                        {deviceType.images && deviceType.images.length > 0 && (
                          <div className="w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 overflow-hidden rounded border-2 border-gray-200">
                            <img
                              src={deviceType.images[0]}
                              alt={deviceType.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-black text-base lg:text-lg">{deviceType.name}</h3>
                          <p className="text-sm lg:text-base text-gray-600">${deviceType.rental_rate.toFixed(2)}/day</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          moveToCart(item.device_type_id)
                          showSuccess('Item moved to cart')
                        }}
                        className="bg-black text-white hover:bg-gray-800 flex-shrink-0"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Move to Cart
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Shopping Cart</h1>
        <p className="text-gray-600">
          {items.reduce((sum, item) => sum + item.quantity, 0)} item{items.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''} in your cart
        </p>
        {lastRemovedItem && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              Item removed from cart
            </span>
            <Button
              onClick={undoRemove}
              variant="outline"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Undo
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const cost = calculateItemCost(item)
            const deviceType = item.device_type

            return (
              <Card key={item.device_type_id} className="p-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-0">
                  <div className="flex-1 sm:flex-[0_0_50%] p-4 sm:p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{deviceType.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Model:</span> {deviceType.model}
                    </p>
                    <div className="mt-4 space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1
                            if (newQuantity > 0) {
                              updateItem(item.device_type_id, { quantity: newQuantity })
                            }
                          }}
                          className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                          aria-label="Quantity"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={item.start_date}
                          onChange={(e) =>
                            updateItem(item.device_type_id, { start_date: e.target.value })
                          }
                          className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                          aria-label="Start date and time"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={item.end_date}
                          onChange={(e) =>
                            updateItem(item.device_type_id, { end_date: e.target.value })
                          }
                          min={item.start_date || undefined}
                          className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                          aria-label="End date and time"
                        />
                      </div>
                    </div>

                    {/* Accessory Picker */}
                    {(() => {
                      // Filter accessories to only show those associated with this device type
                      // Show accessories if: no device types specified (universal) OR device type is in the list
                      const filteredAccessories = accessories.filter(
                        (acc) => {
                          const deviceTypeIds = acc.device_type_ids || []
                          // If no device types specified, it's universal (works with all)
                          if (deviceTypeIds.length === 0) return true
                          // Check if this device type is in the list
                          return deviceTypeIds.includes(deviceType.id)
                        }
                      )
                      return filteredAccessories.length > 0 && (
                        <div className="mt-4 border-t-2 border-gray-200 pt-4">
                          <p className="text-sm font-medium text-black mb-3">Add Accessories:</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {filteredAccessories.map((accessory) => {
                            const selected = item.accessories?.find((a) => a.accessory_id === accessory.id)
                            const isAvailable = accessory.quantity > 0

                            return (
                              <div
                                key={accessory.id}
                                className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded border-2 ${
                                  selected ? 'border-black bg-gray-50' : 'border-gray-200'
                                } ${!isAvailable ? 'opacity-50' : ''}`}
                              >
                                {/* Checkbox - Far Left */}
                                <input
                                  type="checkbox"
                                  checked={!!selected}
                                  onChange={() => {
                                    const currentAccessories = item.accessories || []
                                    if (selected) {
                                      // Remove accessory
                                      const updated = currentAccessories.filter(
                                        (a) => a.accessory_id !== accessory.id
                                      )
                                      updateItem(item.device_type_id, { accessories: updated })
                                    } else {
                                      // Add accessory
                                      const updated = [
                                        ...currentAccessories,
                                        { accessory_id: accessory.id, quantity: 1 },
                                      ]
                                      updateItem(item.device_type_id, { accessories: updated })
                                    }
                                  }}
                                  disabled={!isAvailable}
                                  className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-black rounded flex-shrink-0 cursor-pointer"
                                />
                                
                                {/* Accessory Image */}
                                {accessory.images && accessory.images.length > 0 && (
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 overflow-hidden rounded border border-gray-300">
                                    <img
                                      src={accessory.images[0]}
                                      alt={accessory.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Name and Price */}
                                <div className="flex-1 min-w-0">
                                  <label className="text-sm font-medium text-black cursor-pointer block">
                                    {accessory.name}
                                  </label>
                                  <p className="text-xs text-gray-600">
                                    ${accessory.rental_rate.toFixed(2)}/day
                                    {!isAvailable && ' • Out of stock'}
                                  </p>
                                </div>

                                {/* Quantity Selector */}
                                {selected && isAvailable && (
                                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentAccessories = item.accessories || []
                                        const updated = currentAccessories.map((a) =>
                                          a.accessory_id === accessory.id
                                            ? { ...a, quantity: Math.max(1, a.quantity - 1) }
                                            : a
                                        )
                                        updateItem(item.device_type_id, { accessories: updated })
                                      }}
                                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black rounded flex items-center justify-center hover:bg-gray-100 text-xs sm:text-sm"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={accessory.quantity}
                                      value={selected.quantity}
                                      onChange={(e) => {
                                        const newQuantity = parseInt(e.target.value) || 1
                                        const currentAccessories = item.accessories || []
                                        const updated = currentAccessories.map((a) =>
                                          a.accessory_id === accessory.id
                                            ? { ...a, quantity: Math.min(accessory.quantity, Math.max(1, newQuantity)) }
                                            : a
                                        )
                                        updateItem(item.device_type_id, { accessories: updated })
                                      }}
                                      className="w-8 sm:w-12 px-0.5 sm:px-1 py-0.5 sm:py-1 border-2 border-black rounded text-center text-xs sm:text-sm"
                                      aria-label={`${accessory.name} quantity`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentAccessories = item.accessories || []
                                        const updated = currentAccessories.map((a) =>
                                          a.accessory_id === accessory.id
                                            ? { ...a, quantity: Math.min(accessory.quantity, a.quantity + 1) }
                                            : a
                                        )
                                        updateItem(item.device_type_id, { accessories: updated })
                                      }}
                                      disabled={selected.quantity >= accessory.quantity}
                                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Selected Accessories Summary */}
                    {item.accessories && item.accessories.length > 0 && (
                      <div className="mt-4 border-t-2 border-gray-200 pt-4">
                        <p className="text-sm font-medium text-black mb-2">Selected Accessories:</p>
                        <div className="space-y-2">
                          {item.accessories.map((acc) => {
                            const accessory = accessories.find((a) => a.id === acc.accessory_id)
                            if (!accessory) return null
                            return (
                              <div key={acc.accessory_id} className="flex items-center gap-2 text-sm">
                                {accessory.images && accessory.images.length > 0 && (
                                  <div className="w-8 h-8 flex-shrink-0 overflow-hidden rounded border border-gray-300">
                                    <img
                                      src={accessory.images[0]}
                                      alt={accessory.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                )}
                                <span className="text-gray-600">
                                  {acc.quantity}x {accessory.name}
                                </span>
                                <span className="text-gray-500">
                                  (${accessory.rental_rate.toFixed(2)}/day)
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {cost.accessoryCost > 0 && (
                          <p className="text-sm font-medium text-gray-700 mt-2">
                            Accessories Total: ${cost.accessoryCost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sm:flex-[0_0_50%] flex flex-col">
                    {/* Device Image */}
                    {deviceType.images && deviceType.images.length > 0 && (
                      <div className="w-full h-48 sm:h-64 overflow-hidden flex-shrink-0 bg-white flex items-center justify-center sm:justify-end">
                        <img
                          src={deviceType.images[0]}
                          alt={deviceType.name}
                          className="h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Pricing Info */}
                    <div className="text-right p-4 sm:p-6">
                      <p className="text-sm text-gray-600">
                        {cost.days} day{cost.days !== 1 ? 's' : ''} × {item.quantity} unit{item.quantity !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        Rate: ${deviceType?.rental_rate.toFixed(2) ?? '0.00'}/day
                      </p>
                      {cost.accessoryCost > 0 && (
                        <p className="text-sm text-gray-600">
                          Accessories: ${cost.accessoryCost.toFixed(2)}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Deposit: ${cost.deposit.toFixed(2)} (${(cost.deposit / item.quantity).toFixed(2)} per unit)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ${cost.perUnit.total.toFixed(2)} per unit
                      </p>
                      <p className="text-lg font-bold text-black mt-2">
                        ${cost.total.toFixed(2)}
                      </p>
                    </div>
                    
                    {/* Remove Button */}
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          saveForLater(item.device_type_id)
                          showSuccess('Item saved')
                        }}
                        className="flex-1 border-gray-500 text-gray-700 hover:bg-gray-50"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    <Button
                      variant="outline"
                        onClick={() => {
                          removeItem(item.device_type_id)
                          showSuccess('Item removed from cart')
                        }}
                        className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                    </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => {
                const cost = calculateItemCost(item)
                return (
                  <div key={item.device_type_id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.device_type.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-black">${cost.total.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
            <div className="border-t-2 border-black pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span className="text-black">Total</span>
                <span className="text-black">${totalCost.toFixed(2)}</span>
              </div>
              <Button
                onClick={() => navigate('/checkout')}
                className="w-full bg-black text-white hover:bg-gray-800"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Saved for Later Section */}
      {savedForLater.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-black mb-4">Saved for Later</h2>
          <div className="space-y-4">
            {savedForLater.map((item) => {
              const deviceType = item.device_type
              return (
                <Card key={item.device_type_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {deviceType.images && deviceType.images.length > 0 && (
                        <div className="w-20 h-20 overflow-hidden rounded border-2 border-gray-200">
                          <img
                            src={deviceType.images[0]}
                            alt={deviceType.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-black">{deviceType.name}</h3>
                        <p className="text-sm text-gray-600">${deviceType.rental_rate.toFixed(2)}/day</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        moveToCart(item.device_type_id)
                        showSuccess('Item moved to cart')
                      }}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Move to Cart
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

