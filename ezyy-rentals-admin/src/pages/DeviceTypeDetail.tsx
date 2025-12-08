import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { deviceTypesService } from '@/lib/supabase-service'
import type { DeviceType } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function DeviceTypeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadDeviceType()
    }
  }, [id])

  const loadDeviceType = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: deviceTypeError } = await deviceTypesService.getById(id)
      if (data) {
        setDeviceType(data)
      } else if (deviceTypeError) {
        const errorMsg = `Failed to load device type: ${deviceTypeError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading device type'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !deviceType) return
    if (confirm('Are you sure you want to delete this device type?')) {
      try {
        const { error } = await deviceTypesService.delete(id)
        if (error) {
          showError(`Failed to delete device type: ${error.message}`)
        } else {
          showSuccess('Device type deleted successfully!')
          navigate('/device-types')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/device-types?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !deviceType) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/device-types')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Device Types
        </Button>
        <ErrorMessage message={error ?? 'Device type not found'} onRetry={loadDeviceType} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/device-types')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Device Type Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Device Type ID: {deviceType.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-base text-black">{deviceType.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SKU</label>
              <p className="text-base text-black">{deviceType.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Model</label>
              <p className="text-base text-black">{deviceType.model}</p>
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Pricing Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rental Rate (per day)</label>
              <p className="text-base text-black">${deviceType.rental_rate.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Deposit</label>
              <p className="text-base text-black">${deviceType.deposit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Subscription Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Has Subscription</label>
              <p className="text-base text-black">
                {deviceType.has_subscription ? (
                  <span className="text-green-600 font-semibold">Yes</span>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </p>
            </div>
            {deviceType.has_subscription && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Subscription Cost (per month)</label>
                <p className="text-base text-black">
                  {deviceType.subscription_cost ? `$${deviceType.subscription_cost.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        {deviceType.images && deviceType.images.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Images</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {deviceType.images.map((imageUrl, index) => (
                <div key={index} className="relative group border-2 border-gray-300 rounded overflow-hidden bg-gray-50">
                  <div className="w-full h-48 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt={`${deviceType.name} ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-base text-black">{new Date(deviceType.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(deviceType.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


