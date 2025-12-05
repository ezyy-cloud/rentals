import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { devicesService, deviceTypesService } from '@/lib/supabase-service'
import type { Device, DeviceType } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2 } from 'lucide-react'

export function Devices() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    device_type_id: '',
    condition: '',
    scratches: '',
    working_state: '',
    subscription_date: '',
  })

  useEffect(() => {
    loadDevices()
    loadDeviceTypes()
    checkAndUpdateSubscriptions()
  }, [])

  const checkAndUpdateSubscriptions = async () => {
    const { updated } = await devicesService.updateSubscriptionDates()
    if (updated && updated > 0) {
      // Reload devices if any were updated
      loadDevices()
    }
  }

  const loadDevices = async () => {
    setLoading(true)
    const { data, error } = await devicesService.getAll()
    if (data) setDevices(data)
    if (error) console.error('Error loading devices:', error)
    setLoading(false)
  }

  const loadDeviceTypes = async () => {
    const { data } = await deviceTypesService.getAll()
    if (data) setDeviceTypes(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDeviceType = deviceTypes.find(dt => dt.id === formData.device_type_id)
    const submitData = {
      ...formData,
      scratches: formData.scratches || null,
      subscription_date: selectedDeviceType?.has_subscription ? (formData.subscription_date || null) : null,
    }
    if (editingDevice) {
      const { error } = await devicesService.update(editingDevice.id, submitData)
      if (!error) {
        setShowForm(false)
        setEditingDevice(null)
        resetForm()
        loadDevices()
      }
    } else {
      const { error } = await devicesService.create(submitData)
      if (!error) {
        setShowForm(false)
        resetForm()
        loadDevices()
      }
    }
  }

  const handleEdit = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      name: device.name,
      device_type_id: device.device_type_id,
      condition: device.condition,
      scratches: device.scratches ?? '',
      working_state: device.working_state,
      subscription_date: device.subscription_date ?? '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this device?')) {
      const { error } = await devicesService.delete(id)
      if (!error) loadDevices()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      device_type_id: '',
      condition: '',
      scratches: '',
      working_state: '',
      subscription_date: '',
    })
    setEditingDevice(null)
  }

  const selectedDeviceType = deviceTypes.find(dt => dt.id === formData.device_type_id)
  const showSubscriptionDate = selectedDeviceType?.has_subscription ?? false

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Devices</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage rental devices</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
        >
          Add Device
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingDevice ? 'Edit Device' : 'Add New Device'}
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
                <label className="block text-sm font-medium text-black mb-1">Device Type</label>
                <select
                  required
                  value={formData.device_type_id}
                  onChange={(e) => setFormData({ ...formData, device_type_id: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select device type</option>
                  {deviceTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Condition</label>
                <input
                  type="text"
                  required
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g., Excellent, Good, Fair"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Working State</label>
                <select
                  required
                  value={formData.working_state}
                  onChange={(e) => setFormData({ ...formData, working_state: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select state</option>
                  <option value="Working">Working</option>
                  <option value="Not Working">Not Working</option>
                  <option value="Under Repair">Under Repair</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Scratches</label>
                <textarea
                  value={formData.scratches}
                  onChange={(e) => setFormData({ ...formData, scratches: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  rows={2}
                  placeholder="Describe any scratches or damage"
                />
              </div>
              {showSubscriptionDate && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Subscription Date
                    {selectedDeviceType?.subscription_cost && (
                      <span className="text-xs text-gray-500 ml-2">
                        (${selectedDeviceType.subscription_cost.toFixed(2)}/month)
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    required={showSubscriptionDate}
                    value={formData.subscription_date}
                    onChange={(e) => setFormData({ ...formData, subscription_date: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Next payment due date for monthly subscription
                  </p>
                </div>
              )}
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
              <Button type="submit" className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto">
                {editingDevice ? 'Update' : 'Create'}
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Device Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Working State</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Subscription</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No devices found</td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr 
                  key={device.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">{device.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.device_type?.name ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{device.condition}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{device.working_state}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.device_type?.has_subscription ? (
                      device.subscription_date ? (
                        <span className="text-sm">
                          {new Date(device.subscription_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(device)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={() => handleDelete(device.id)}
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
