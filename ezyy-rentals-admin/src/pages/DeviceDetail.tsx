import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { devicesService } from '@/lib/supabase-service'
import type { Device } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadDevice()
    }
  }, [id])

  const loadDevice = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: deviceError } = await devicesService.getById(id)
      if (data) {
        setDevice(data)
      } else if (deviceError) {
        const errorMsg = `Failed to load device: ${deviceError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading device'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !device) return
    if (confirm('Are you sure you want to delete this device?')) {
      try {
        const { error } = await devicesService.delete(id)
        if (error) {
          showError(`Failed to delete device: ${error.message}`)
        } else {
          showSuccess('Device deleted successfully!')
          navigate('/devices')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/devices?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/devices')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Devices
        </Button>
        <ErrorMessage message={error ?? 'Device not found'} onRetry={loadDevice} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/devices')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Device Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Device ID: {device.id}</p>
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
              <p className="text-base text-black">{device.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Type</label>
              <p className="text-base text-black">{device.device_type?.name ?? 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Condition Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Condition Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Condition</label>
              <p className="text-base text-black">{device.condition}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Working State</label>
              <p className="text-base text-black">
                <span className={`font-semibold ${
                  device.working_state === 'Working' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {device.working_state}
                </span>
              </p>
            </div>
            {device.scratches && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Scratches/Damage</label>
                <p className="text-base text-black">{device.scratches}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Information */}
        {device.device_type?.has_subscription && (
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Subscription Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Subscription Date</label>
                <p className="text-base text-black">
                  {device.subscription_date ? (
                    <span className="text-green-600">{device.subscription_date}</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Not set</span>
                  )}
                </p>
              </div>
              {device.device_type.subscription_cost && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Subscription Cost (per month)</label>
                  <p className="text-base text-black">${device.device_type.subscription_cost.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-base text-black">{new Date(device.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(device.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

