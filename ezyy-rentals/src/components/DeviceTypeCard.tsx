import { useState, useEffect } from 'react'
import type { DeviceType, Device } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShoppingCart, ChevronLeft, ChevronRight, Eye, Sparkles } from 'lucide-react'
import { ImageModal } from './ImageModal'
import { QuickViewModal } from './QuickViewModal'

interface DeviceTypeCardProps {
  deviceType: DeviceType
  availableCount: number
  totalCount?: number
  sampleDevice?: Device
  onAddToCart: (deviceTypeId: string, deviceType: DeviceType, quantity: number) => void
  onViewDetails?: (deviceTypeId: string) => void
}

export function DeviceTypeCard({ deviceType, availableCount, totalCount, onAddToCart, onViewDetails }: DeviceTypeCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  // Determine if device is popular (high availability) or new
  const isPopular = availableCount > 5
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const isNew = new Date(deviceType.created_at) > thirtyDaysAgo // Created in last 30 days

  const images = deviceType.images || []
  const hasMultipleImages = images.length > 1

  // Auto-advance slideshow
  useEffect(() => {
    if (!hasMultipleImages || isPaused || isModalOpen) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 4000) // Change image every 4 seconds

    return () => clearInterval(interval)
  }, [hasMultipleImages, isPaused, isModalOpen, images.length])

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const handleImageClick = () => {
    if (images.length > 0) {
      setIsModalOpen(true)
    }
  }

  const handleQuantityChange = (value: number) => {
    const newQuantity = Math.max(1, Math.min(value, availableCount))
    setQuantity(newQuantity)
  }

  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= availableCount) {
      onAddToCart(deviceType.id, deviceType, quantity)
    }
  }

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(deviceType.id)
    }
  }

  return (
    <>
      <Card className="flex flex-col p-0 sm:p-0 overflow-hidden hover:shadow-lg transition-all duration-300 group card-hover">
        {images.length > 0 && (
          <div
            className="w-full h-72 overflow-hidden relative group/image cursor-pointer"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={handleImageClick}
          >
            {/* Badges */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
              {isNew && (
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                  New
                </span>
              )}
              {isPopular && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Popular
                </span>
              )}
            </div>

            {/* Quick View Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsQuickViewOpen(true)
              }}
              className="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-opacity-90"
              aria-label="Quick view"
            >
              <Eye className="w-4 h-4" />
            </button>
            <img
              src={images[currentImageIndex]}
              alt={`${deviceType.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-contain transition-transform duration-300 group-hover/image:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            
            {hasMultipleImages && (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToPrevious()
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToNext()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(index)
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Image Counter */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}
      <div className="flex-1 px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Device Info */}
          <div className="cursor-pointer" onClick={handleCardClick}>
            <h3 className="text-lg font-bold text-black mb-2 hover:underline">{deviceType.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Model:</span> {deviceType.model}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Available:</span>{' '}
              {totalCount === 0 ? (
                <span className="font-semibold text-blue-600">Coming Soon</span>
              ) : (
                <span className={`font-semibold ${availableCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {availableCount} unit{availableCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          
          {/* Right Column - Pricing */}
          <div className="flex flex-col justify-center items-end">
            <p className="text-xs text-gray-600 mb-1">per day</p>
            <div className="mb-1">
              <span className="text-3xl font-bold text-black">${deviceType.rental_rate.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-600">
              Deposit: ${deviceType.deposit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-4 mt-4 px-4 pb-4">
        {availableCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-8 h-8 border-2 border-black rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={availableCount}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border-2 border-black rounded text-center"
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= availableCount}
                  className="w-8 h-8 border-2 border-black rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
            <Button
              onClick={handleAddToCart}
              className="w-full bg-black text-white hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm font-medium">
              {totalCount === 0 ? (
                <span className="text-blue-600">Coming Soon</span>
              ) : (
                <span className="text-red-600">Currently Unavailable</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {totalCount === 0
                ? 'This device type will be available soon'
                : 'Device is in catalog but not available for rental'}
            </p>
          </div>
        )}
      </div>
    </Card>

    {isModalOpen && (
      <ImageModal
        images={images}
        initialIndex={currentImageIndex}
        title={deviceType.name}
        onClose={() => setIsModalOpen(false)}
      />
    )}

    {isQuickViewOpen && (
      <QuickViewModal
        deviceType={deviceType}
        availableCount={availableCount}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails ?? (() => {})}
      />
    )}
    </>
  )
}

