import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { devicesService, deviceTypesService } from '@/lib/services'
import type { DeviceTypeAvailability, DeviceType } from '@/lib/types'
import { DeviceTypeCard } from '@/components/DeviceTypeCard'
import { HeroSection } from '@/components/HeroSection'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { DeviceCardSkeleton } from '@/components/SkeletonLoader'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Search, Filter, CheckCircle, ArrowUpDown, X } from 'lucide-react'

type SortOption = 'name' | 'price-low' | 'price-high' | 'availability'

export function Home() {
  const navigate = useNavigate()
  const { showSuccess } = useToast()
  const [deviceTypeAvailabilities, setDeviceTypeAvailabilities] = useState<DeviceTypeAvailability[]>([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [availabilityResult, typesResult] = await Promise.all([
        devicesService.getAvailableByType(),
        deviceTypesService.getAll(),
      ])
      
      if (availabilityResult.error) {
        setError(`Failed to load devices: ${availabilityResult.error.message}`)
      } else {
        setDeviceTypeAvailabilities(availabilityResult.data ?? [])
      }
      
      if (!typesResult.error) {
        setDeviceTypes(typesResult.data ?? [])
      }
    } catch (err) {
      setError('An unexpected error occurred while loading devices')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (deviceTypeId: string, deviceType: DeviceType, quantity: number) => {
    // Calculate default dates (today to 7 days from now)
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(today.getDate() + 7)

    const startDateStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    addItem(deviceTypeId, deviceType, quantity, startDateStr, endDateStr)
    showSuccess(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`)
    
    // Navigate to cart
    navigate('/cart')
  }

  const filteredAndSortedDeviceTypes = useMemo(() => {
    let filtered = deviceTypeAvailabilities.filter((availability) => {
    const searchLower = searchTerm.toLowerCase()
    const deviceType = availability.device_type
    const matchesSearch =
      !searchTerm ||
      deviceType.name.toLowerCase().includes(searchLower) ||
      deviceType.model.toLowerCase().includes(searchLower) ||
      deviceType.sku.toLowerCase().includes(searchLower)
    
    const matchesType = !selectedType || deviceType.id === selectedType
      const matchesPrice = deviceType.rental_rate >= priceRange[0] && deviceType.rental_rate <= priceRange[1]

      // Show all devices in catalog, even if unavailable (removed availability.available_count > 0 filter)
      // Show all devices in catalog, even if unavailable (removed availability.available_count > 0 filter)
      return matchesSearch && matchesType && matchesPrice
  })

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const deviceA = a.device_type
      const deviceB = b.device_type

      switch (sortBy) {
        case 'price-low':
          return deviceA.rental_rate - deviceB.rental_rate
        case 'price-high':
          return deviceB.rental_rate - deviceA.rental_rate
        case 'availability':
          return b.available_count - a.available_count
        case 'name':
        default:
          return deviceA.name.localeCompare(deviceB.name)
      }
    })

    return filtered
  }, [deviceTypeAvailabilities, searchTerm, selectedType, sortBy, priceRange])

  const featuredDevices = filteredAndSortedDeviceTypes.slice(0, 3)
  
  const maxPrice = useMemo(() => {
    if (deviceTypeAvailabilities.length === 0) return 1000
    return Math.max(...deviceTypeAvailabilities.map(a => a.device_type.rental_rate), 1000)
  }, [deviceTypeAvailabilities])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <HeroSection />

      {/* How It Works Section */}
      <div className="bg-gray-50 border-2 border-black rounded-lg p-8">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-black mb-2">Browse & Select</h3>
            <p className="text-sm text-gray-600">Choose from our wide selection of premium devices</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-black mb-2">Rent & Enjoy</h3>
            <p className="text-sm text-gray-600">Select your rental period and add to cart</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-black mb-2">Return & Repeat</h3>
            <p className="text-sm text-gray-600">Return when done or extend your rental</p>
          </div>
        </div>
      </div>

      {/* Featured Devices Section */}
      {!loading && !error && featuredDevices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">Featured Devices</h2>
              <p className="text-gray-600">Popular choices from our collection</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {featuredDevices.map((availability) => (
              <DeviceTypeCard
                key={availability.device_type.id}
                deviceType={availability.device_type}
                availableCount={availability.available_count}
                totalCount={availability.total_count}
                sampleDevice={availability.sample_device}
                onAddToCart={handleAddToCart}
                onViewDetails={(deviceTypeId) => navigate(`/device/${deviceTypeId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Devices Section */}
      <div id="devices-section">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">All Devices</h2>
        <p className="text-gray-600">Browse our catalog of devices</p>
          </div>
          {!loading && !error && filteredAndSortedDeviceTypes.length > 0 && (
            <p className="text-sm text-gray-600">
              {filteredAndSortedDeviceTypes.length} device type{filteredAndSortedDeviceTypes.length !== 1 ? 's' : ''} in catalog
            </p>
          )}
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-black rounded-lg p-4 space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search devices by name, model, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Filter by device type"
            >
              <option value="">All Device Types</option>
              {deviceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48 relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Sort devices"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="availability">Availability</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="border-t-2 border-gray-200 pt-4">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm font-medium text-black hover:text-gray-700"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {showAdvancedFilters ? ' (Hide)' : ' (Show)'}
          </button>
          {showAdvancedFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Price Range: ${priceRange[0]} - ${priceRange[1]} / day
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPriceRange([0, 50])
              setShowAdvancedFilters(true)
            }}
            className="px-3 py-1 text-sm border-2 border-gray-300 rounded hover:border-black transition-colors"
          >
            Under $50/day
          </button>
          <button
            onClick={() => {
              setSelectedType('')
              setSearchTerm('')
            }}
            className="px-3 py-1 text-sm border-2 border-gray-300 rounded hover:border-black transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={loadData} />
        </div>
      )}

      {/* Device Types Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <DeviceCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-black text-white hover:bg-gray-800">
            Retry
          </Button>
        </div>
      ) : filteredAndSortedDeviceTypes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            {deviceTypeAvailabilities.length === 0
              ? 'No devices found in the catalog.'
              : 'No device types found matching your criteria.'}
          </p>
          {deviceTypeAvailabilities.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your search or filter, or check back later.
            </p>
          )}
        </div>
      ) : (
        <>
          {filteredAndSortedDeviceTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedDeviceTypes.map((availability) => (
            <DeviceTypeCard
              key={availability.device_type.id}
              deviceType={availability.device_type}
              availableCount={availability.available_count}
              totalCount={availability.total_count}
              sampleDevice={availability.sample_device}
              onAddToCart={handleAddToCart}
                  onViewDetails={(deviceTypeId) => navigate(`/device/${deviceTypeId}`)}
            />
          ))}
        </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {deviceTypeAvailabilities.length === 0
                  ? 'No devices found in the catalog.'
                  : 'No device types found matching your criteria.'}
              </p>
              {deviceTypeAvailabilities.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Try adjusting your search or filter, or check back later.
                </p>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}

