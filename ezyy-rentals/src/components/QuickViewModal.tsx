import { useState } from 'react'
import type { DeviceType } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { X, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'

interface QuickViewModalProps {
  deviceType: DeviceType
  availableCount: number
  onClose: () => void
  onAddToCart: (deviceTypeId: string, deviceType: DeviceType, quantity: number) => void
  onViewDetails: (deviceTypeId: string) => void
}

export function QuickViewModal({
  deviceType,
  availableCount,
  onClose,
  onAddToCart,
  onViewDetails,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = deviceType.images || []

  const handleQuantityChange = (value: number) => {
    const newQuantity = Math.max(1, Math.min(value, availableCount))
    setQuantity(newQuantity)
  }

  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= availableCount) {
      onAddToCart(deviceType.id, deviceType, quantity)
      onClose()
    }
  }

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <Card
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-black">{deviceType.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Section */}
            {images.length > 0 && (
              <div className="relative">
                <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-lg border-2 border-black">
                  <img
                    src={images[currentImageIndex]}
                    alt={deviceType.name}
                    className="w-full h-full object-contain"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex
                                ? 'bg-white w-6'
                                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                            }`}
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Details Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-black mb-2">{deviceType.name}</h3>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Model:</span> {deviceType.model}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">SKU:</span> {deviceType.sku}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Available:</span>{' '}
                  <span className={`font-semibold ${availableCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {availableCount} unit{availableCount !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>

              <div className="border-t-2 border-gray-200 pt-4">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-black">${deviceType.rental_rate.toFixed(2)}</span>
                  <span className="text-gray-600">/day</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Deposit: ${deviceType.deposit.toFixed(2)}
                </p>
              </div>

              {availableCount > 0 && (
                <div className="space-y-4 border-t-2 border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-black">Quantity:</label>
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

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddToCart}
                      className="flex-1 bg-black text-white hover:bg-gray-800"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                    <Button
                      onClick={() => {
                        onViewDetails(deviceType.id)
                        onClose()
                      }}
                      variant="outline"
                      className="border-black text-black hover:bg-gray-100"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

