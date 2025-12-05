import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { accessoriesService, deviceTypesService } from '@/lib/supabase-service'
import type { Accessory, DeviceType } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function AccessoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [accessory, setAccessory] = useState<Accessory | null>(null)
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadAccessory()
      loadDeviceTypes()
    }
  }, [id])

  const loadAccessory = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: accessoryError } = await accessoriesService.getById(id)
      if (data) {
        setAccessory(data)
      } else if (accessoryError) {
        const errorMsg = `Failed to load accessory: ${accessoryError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading accessory'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const loadDeviceTypes = async () => {
    const { data } = await deviceTypesService.getAll()
    if (data) setDeviceTypes(data)
  }

  const handleDelete = async () => {
    if (!id || !accessory) return
    if (confirm('Are you sure you want to delete this accessory?')) {
      try {
        const { error } = await accessoriesService.delete(id)
        if (error) {
          showError(`Failed to delete accessory: ${error.message}`)
        } else {
          showSuccess('Accessory deleted successfully!')
          navigate('/accessories')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/accessories?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !accessory) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/accessories')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accessories
        </Button>
        <ErrorMessage message={error ?? 'Accessory not found'} onRetry={loadAccessory} />
      </div>
    )
  }

  const associatedDeviceTypes = (accessory.device_type_ids || []).map(id => 
    deviceTypes.find(dt => dt.id === id)
  ).filter(Boolean) as DeviceType[]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/accessories')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Accessory Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Accessory ID: {accessory.id}</p>
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
              <p className="text-base text-black">{accessory.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
              <p className="text-base text-black">{accessory.quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rental Rate (per day)</label>
              <p className="text-base text-black">${accessory.rental_rate.toFixed(2)}</p>
            </div>
            {accessory.description && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                <p className="text-base text-black">{accessory.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Device Types */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Compatible Device Types</h2>
          {associatedDeviceTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {associatedDeviceTypes.map((dt) => (
                <span
                  key={dt.id}
                  className="inline-block bg-gray-100 text-black text-sm px-3 py-1 rounded border border-gray-300"
                >
                  {dt.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Compatible with all device types</p>
          )}
        </div>

        {/* Images */}
        {accessory.images && accessory.images.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Images</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {accessory.images.map((imageUrl, index) => (
                <div key={index} className="relative group border-2 border-gray-300 rounded overflow-hidden bg-gray-50">
                  <div className="w-full h-48 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt={`${accessory.name} ${index + 1}`}
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
              <p className="text-base text-black">{new Date(accessory.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(accessory.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

