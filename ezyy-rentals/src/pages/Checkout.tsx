import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { rentalsService, accessoriesService } from '@/lib/services'
import { supabase } from '@/lib/supabase'
import type { Accessory } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorMessage } from '@/components/ErrorMessage'
import { CheckoutSteps } from '@/components/CheckoutSteps'
import { CheckCircle, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react'

export function Checkout() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const { items, clearCart, getTotalCost } = useCart()
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<'collection' | 'shipping'>('collection')
  const [shippingAddress, setShippingAddress] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

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
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

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

  const handleCheckout = async () => {
    if (!appUser) {
      const errorMsg = 'You must be logged in to checkout'
      setError(errorMsg)
      showError(errorMsg)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const today = new Date().toISOString().split('T')[0]
      const allRentalPromises: Promise<{ data: any; error: any }>[] = []

      // For each cart item, create multiple rentals (one per quantity)
      for (const item of items) {
        const deviceType = item.device_type
        if (!deviceType) {
          throw new Error(`Device type not found`)
        }

        // Get available devices of this type
        const { data: availableDevices, error: devicesError } = await supabase
          .from('devices')
          .select('*, device_type:device_types(*)')
          .eq('device_type_id', item.device_type_id)
          .eq('working_state', 'Working')

        if (devicesError || !availableDevices) {
          throw new Error(`Failed to fetch available devices: ${devicesError?.message ?? 'Unknown error'}`)
        }

        // Get active rentals to filter out rented devices
        const { data: activeRentals } = await supabase
          .from('rentals')
          .select('device_id')
          .is('returned_date', null)
          .gte('end_date', today)

        const rentedDeviceIds = new Set(activeRentals?.map(r => r.device_id) ?? [])

        // Filter available devices
        const trulyAvailable = availableDevices.filter((device) => {
          if (rentedDeviceIds.has(device.id)) return false

          // Check subscription if required
          if (deviceType.has_subscription) {
            if (!device.subscription_date) return false
            const subscriptionDate = new Date(device.subscription_date)
            const todayDate = new Date(today)
            todayDate.setHours(0, 0, 0, 0)
            if (subscriptionDate < todayDate) return false
          }

          return true
        })

        if (trulyAvailable.length < item.quantity) {
          throw new Error(
            `Not enough devices available for ${deviceType.name}. Requested: ${item.quantity}, Available: ${trulyAvailable.length}`
          )
        }

        // Calculate cost per unit
        const cost = calculateItemCost(item)
        const costPerUnit = cost.perUnit

        // Create a rental for each device (quantity times)
        for (let i = 0; i < item.quantity; i++) {
          const device = trulyAvailable[i]
          
          allRentalPromises.push(
            rentalsService.create(
          {
            user_id: appUser.id,
                device_id: device.id,
            start_date: item.start_date,
            end_date: item.end_date,
            rate: deviceType.rental_rate,
            deposit: deviceType.deposit,
                total_paid: costPerUnit.total, // Per unit cost
                delivery_method: deliveryMethod,
                shipping_address: deliveryMethod === 'shipping' ? (shippingAddress || appUser.address) : null,
                returned_date: null,
                shipped_date: null,
          },
          item.accessories
        )
          )
        }
      }

      // Execute all rental creations
      const results = await Promise.all(allRentalPromises)

      // Check for errors
      const hasError = results.some((result) => result.error)
      if (hasError) {
        const firstError = results.find((result) => result.error)
        throw new Error(firstError?.error?.message ?? 'Failed to create rental')
      }

      // Clear cart and show success
      clearCart()
      setSuccess(true)
      showSuccess('Rental request submitted successfully!')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during checkout'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Calculate total using calculateItemCost to include accessories
  const totalCost = items.reduce((total, item) => {
    const cost = calculateItemCost(item)
    return total + cost.total
  }, 0)

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-black mb-2">Checkout Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your rental request has been submitted. You can view your rentals in the "My Rentals" section.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate('/rentals')}
            className="bg-black text-white hover:bg-gray-800"
          >
            View My Rentals
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-black text-black hover:bg-gray-100"
          >
            Continue Browsing
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Your cart is empty</p>
        <Button
          onClick={() => navigate('/cart')}
          className="bg-black text-white hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>
      </div>
    )
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Checkout</h1>
        <p className="text-gray-600">Review your order and complete your rental</p>
      </div>

      <CheckoutSteps currentStep={currentStep} />

      {error && (
        <ErrorMessage message={error} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Review Order */}
          {currentStep === 1 && (
        <Card>
              <h2 className="text-xl font-bold text-black mb-4">Review Your Order</h2>
          <div className="space-y-4">
            {items.map((item) => {
              const cost = calculateItemCost(item)
              const deviceType = item.device_type

              return (
                <div key={item.device_type_id} className="border-b-2 border-gray-200 pb-4 last:border-0">
                  <h3 className="font-semibold text-black mb-2">
                    {deviceType.name} × {item.quantity}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Model: {deviceType.model}</p>
                    <p>
                      Rental Period: {item.start_date} to {item.end_date} ({cost.days} days)
                    </p>
                    <p>Device Rate: ${deviceType.rental_rate.toFixed(2)}/day</p>
                    {cost.accessoryCost > 0 && (
                      <p>Accessories: ${cost.accessoryCost.toFixed(2)}</p>
                    )}
                        <p>Deposit: ${cost.deposit.toFixed(2)}</p>
                  </div>
                  <p className="text-right font-bold text-black mt-2">
                    ${cost.total.toFixed(2)}
                  </p>
                </div>
              )
            })}
          </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleNext} className="bg-black text-white hover:bg-gray-800">
                  Continue to Delivery
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
          </div>
        </Card>
          )}

          {/* Step 2: Delivery */}
          {currentStep === 2 && (
        <Card>
              <h2 className="text-xl font-bold text-black mb-4">Delivery Information</h2>
          {appUser ? (
                <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-black mb-3">Delivery Method</h3>
                <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded hover:border-black transition-colors">
                    <input
                      type="radio"
                      name="delivery_method"
                      value="collection"
                      checked={deliveryMethod === 'collection'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'collection' | 'shipping')}
                      className="w-4 h-4 border-2 border-black"
                    />
                    <div>
                      <span className="font-medium text-black">Collection</span>
                      <p className="text-sm text-gray-600">Pick up from our location</p>
                    </div>
                  </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded hover:border-black transition-colors">
                    <input
                      type="radio"
                      name="delivery_method"
                      value="shipping"
                      checked={deliveryMethod === 'shipping'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'collection' | 'shipping')}
                      className="w-4 h-4 border-2 border-black"
                    />
                    <div>
                      <span className="font-medium text-black">Shipping</span>
                      <p className="text-sm text-gray-600">Ship to address</p>
                    </div>
                  </label>
                </div>

                {deliveryMethod === 'shipping' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-black mb-1">
                          Shipping Address
                    </label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder={appUser.address}
                      className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                      rows={3}
                    />
                    {shippingAddress === '' && (
                      <p className="text-xs text-gray-500 mt-1">
                        If left empty, your home address will be used: {appUser.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
                  <div className="flex gap-4 pt-4">
                    <Button onClick={handleBack} variant="outline" className="border-black text-black hover:bg-gray-100">
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1 bg-black text-white hover:bg-gray-800">
                      Continue to Payment
                      <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">You must be logged in to checkout</p>
                  <Button onClick={() => navigate('/login')} className="bg-black text-white hover:bg-gray-800">
                Sign In
              </Button>
            </div>
          )}
        </Card>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Payment</h2>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Payment processing will be integrated here. For now, clicking "Complete Rental" will create the rental order.
                </p>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Payment integration placeholder. In production, this would connect to a payment gateway.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-black text-black hover:bg-gray-100">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="flex-1 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {loading ? 'Processing...' : 'Complete Rental'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sticky Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-6">
            <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => {
                const cost = calculateItemCost(item)
                return (
                  <div key={item.device_type_id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{item.device_type.name} × {item.quantity}</span>
                      <span className="font-medium text-black">${cost.total.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {appUser && (
              <div className="border-t-2 border-gray-200 pt-3 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-black">{appUser.first_name} {appUser.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="text-black capitalize">{deliveryMethod}</span>
                </div>
              </div>
            )}
            <div className="border-t-2 border-black pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span className="text-black">Total</span>
                <span className="text-black">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {currentStep > 1 && (
      <Button
        variant="outline"
          onClick={() => navigate('/cart')}
        className="border-black text-black hover:bg-gray-100"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cart
      </Button>
      )}
    </div>
  )
}

