import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { deviceTypesService } from '@/lib/supabase-service'
import { storageService } from '@/lib/storage-service'
import type { DeviceType } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2, Upload } from 'lucide-react'

export function DeviceTypes() {
  const navigate = useNavigate()
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDeviceType, setEditingDeviceType] = useState<DeviceType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    rental_rate: '',
    deposit: '',
    model: '',
    has_subscription: false,
    subscription_cost: '',
    images: [] as string[],
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDeviceTypes()
  }, [])

  const loadDeviceTypes = async () => {
    setLoading(true)
    const { data, error } = await deviceTypesService.getAll()
    if (data) setDeviceTypes(data)
    if (error) console.error('Error loading device types:', error)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      let imageUrls = [...existingImages]
      
      // Upload new images if any
      if (selectedFiles.length > 0) {
        const uploadedUrls = await storageService.uploadDeviceTypeImages(selectedFiles)
        imageUrls = [...imageUrls, ...uploadedUrls]
      }
      
    const submitData = {
      ...formData,
      rental_rate: parseFloat(formData.rental_rate),
      deposit: parseFloat(formData.deposit),
      subscription_cost: formData.has_subscription && formData.subscription_cost ? parseFloat(formData.subscription_cost) : null,
        images: imageUrls,
    }
      
    if (editingDeviceType) {
        // Delete removed images from storage
        const removedImages = editingDeviceType.images?.filter(img => !existingImages.includes(img)) || []
        if (removedImages.length > 0) {
          await storageService.deleteImages(removedImages, 'device-types')
        }
        
      const { error } = await deviceTypesService.update(editingDeviceType.id, submitData)
      if (!error) {
        setShowForm(false)
        setEditingDeviceType(null)
        resetForm()
        loadDeviceTypes()
      }
    } else {
      const { error } = await deviceTypesService.create(submitData)
      if (!error) {
        setShowForm(false)
        resetForm()
        loadDeviceTypes()
      }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (deviceType: DeviceType) => {
    setEditingDeviceType(deviceType)
    setFormData({
      name: deviceType.name,
      sku: deviceType.sku,
      rental_rate: deviceType.rental_rate.toString(),
      deposit: deviceType.deposit.toString(),
      model: deviceType.model,
      has_subscription: deviceType.has_subscription,
      subscription_cost: deviceType.subscription_cost?.toString() ?? '',
      images: deviceType.images || [],
    })
    setExistingImages(deviceType.images || [])
    setSelectedFiles([])
    setShowForm(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url))
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this device type?')) {
      const { error } = await deviceTypesService.delete(id)
      if (!error) loadDeviceTypes()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      rental_rate: '',
      deposit: '',
      model: '',
      has_subscription: false,
      subscription_cost: '',
      images: [],
    })
    setSelectedFiles([])
    setExistingImages([])
    setEditingDeviceType(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Device Types</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage device types and pricing</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
        >
          Add Device Type
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingDeviceType ? 'Edit Device Type' : 'Add New Device Type'}
            </h2>
            <button onClick={() => {
              setShowForm(false)
              resetForm()
            }} className="text-black hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Rental Rate</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.rental_rate}
                  onChange={(e) => setFormData({ ...formData, rental_rate: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Deposit</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_subscription}
                    onChange={(e) => setFormData({ ...formData, has_subscription: e.target.checked })}
                    className="w-4 h-4 border-2 border-black rounded"
                  />
                  <span className="text-sm font-medium text-black">Requires Monthly Subscription</span>
                </label>
              </div>
              {formData.has_subscription && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Monthly Subscription Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required={formData.has_subscription}
                    value={formData.subscription_cost}
                    onChange={(e) => setFormData({ ...formData, subscription_cost: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Images</label>
                
                {/* Existing Images Preview */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Existing Images ({existingImages.length}):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative group border-2 border-gray-300 rounded overflow-hidden bg-gray-50">
                          <div className="w-full h-64 flex items-center justify-center">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(url)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Image {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 mb-1">
                      Click to upload images or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      PNG, JPG, WEBP up to 5MB each
                    </span>
                  </label>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-600 mb-2">New Images to Upload ({selectedFiles.length}):</p>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-20 object-cover border-2 border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-gray-500 truncate mt-1">{file.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="border-black text-black hover:bg-gray-100 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : editingDeviceType ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Rental Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Deposit</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Subscription</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : deviceTypes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No device types found</td>
              </tr>
            ) : (
              deviceTypes.map((deviceType) => (
                <tr 
                  key={deviceType.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/device-types/${deviceType.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">{deviceType.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{deviceType.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{deviceType.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${deviceType.rental_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${deviceType.deposit.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deviceType.has_subscription ? (
                      <span className="text-sm">
                        ${deviceType.subscription_cost?.toFixed(2) ?? '0.00'}/mo
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(deviceType)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={() => handleDelete(deviceType.id)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

