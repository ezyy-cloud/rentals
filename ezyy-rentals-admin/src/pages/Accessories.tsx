import { useState, useEffect, useRef } from 'react'
import { accessoriesService, deviceTypesService } from '@/lib/supabase-service'
import { storageService } from '@/lib/storage-service'
import type { Accessory, DeviceType } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2, Upload } from 'lucide-react'

export function Accessories() {
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    rental_rate: '',
    images: [] as string[],
  })
  const [selectedDeviceTypeIds, setSelectedDeviceTypeIds] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAccessories()
    loadDeviceTypes()
  }, [])

  const loadAccessories = async () => {
    setLoading(true)
    const { data, error } = await accessoriesService.getAll()
    if (data) setAccessories(data)
    if (error) console.error('Error loading accessories:', error)
    setLoading(false)
  }

  const loadDeviceTypes = async () => {
    const { data } = await deviceTypesService.getAll()
    if (data) setDeviceTypes(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      let imageUrls = [...existingImages]
      
      // Upload new images if any
      if (selectedFiles.length > 0) {
        const uploadedUrls = await storageService.uploadAccessoryImages(selectedFiles)
        imageUrls = [...imageUrls, ...uploadedUrls]
      }
      
    const submitData = {
      ...formData,
      description: formData.description || null,
      quantity: parseInt(formData.quantity),
        rental_rate: parseFloat(formData.rental_rate),
        images: imageUrls,
        device_type_id: null, // Using junction table now, but keeping for backward compatibility
        device_type_ids: selectedDeviceTypeIds,
    }
      
    if (editingAccessory) {
        // Delete removed images from storage
        const removedImages = editingAccessory.images?.filter(img => !existingImages.includes(img)) || []
        if (removedImages.length > 0) {
          await storageService.deleteImages(removedImages, 'accessories')
        }
        
      const { error } = await accessoriesService.update(editingAccessory.id, submitData)
      if (!error) {
        setShowForm(false)
        setEditingAccessory(null)
        resetForm()
        loadAccessories()
      }
    } else {
      const { error } = await accessoriesService.create(submitData)
      if (!error) {
        setShowForm(false)
        resetForm()
        loadAccessories()
      }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (accessory: Accessory) => {
    setEditingAccessory(accessory)
    setFormData({
      name: accessory.name,
      description: accessory.description ?? '',
      quantity: accessory.quantity.toString(),
      rental_rate: accessory.rental_rate.toString(),
      images: accessory.images || [],
    })
    setSelectedDeviceTypeIds(accessory.device_type_ids || [])
    setExistingImages(accessory.images || [])
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
    if (confirm('Are you sure you want to delete this accessory?')) {
      const { error } = await accessoriesService.delete(id)
      if (!error) loadAccessories()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: '',
      rental_rate: '',
      images: [],
    })
    setSelectedDeviceTypeIds([])
    setSelectedFiles([])
    setExistingImages([])
    setEditingAccessory(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleDeviceType = (deviceTypeId: string) => {
    setSelectedDeviceTypeIds(prev => 
      prev.includes(deviceTypeId)
        ? prev.filter(id => id !== deviceTypeId)
        : [...prev, deviceTypeId]
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Accessories</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage rental accessories</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
        >
          Add Accessory
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingAccessory ? 'Edit Accessory' : 'Add New Accessory'}
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
                <label className="block text-sm font-medium text-black mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Rental Rate (per day)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.rental_rate}
                  onChange={(e) => setFormData({ ...formData, rental_rate: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Device Types</label>
                <div className="border-2 border-black rounded p-3 max-h-48 overflow-y-auto">
                  {deviceTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">No device types available</p>
                  ) : (
                    <div className="space-y-2">
                      {deviceTypes.map((dt) => {
                        const isSelected = selectedDeviceTypeIds.includes(dt.id)
                        return (
                          <label
                            key={dt.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDeviceType(dt.id)}
                              className="w-4 h-4 border-2 border-black rounded"
                            />
                            <span className="text-sm text-black">{dt.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select device types this accessory is compatible with. Leave all unchecked for universal compatibility.
                </p>
              </div>
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
                    id="accessory-image-upload"
                  />
                  <label
                    htmlFor="accessory-image-upload"
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
                {uploading ? 'Uploading...' : editingAccessory ? 'Update' : 'Create'}
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Device Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Rental Rate (per day)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : accessories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No accessories found</td>
              </tr>
            ) : (
              accessories.map((accessory) => {
                const associatedDeviceTypes = (accessory.device_type_ids || []).map(id => 
                  deviceTypes.find(dt => dt.id === id)
                ).filter(Boolean) as DeviceType[]
                
                return (
                <tr key={accessory.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{accessory.name}</td>
                  <td className="px-6 py-4">{accessory.description ?? 'N/A'}</td>
                    <td className="px-6 py-4">
                      {associatedDeviceTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {associatedDeviceTypes.map((dt) => (
                            <span
                              key={dt.id}
                              className="inline-block bg-gray-100 text-black text-xs px-2 py-1 rounded border border-gray-300"
                            >
                              {dt.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">All Devices</span>
                      )}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">{accessory.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${accessory.rental_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(accessory)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={() => handleDelete(accessory.id)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

