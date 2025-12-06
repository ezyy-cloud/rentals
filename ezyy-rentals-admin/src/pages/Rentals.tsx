import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { rentalsService, usersService, devicesService, accessoriesService } from '@/lib/supabase-service'
import type { Rental, User, Device, Accessory } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2, CheckCircle, Download, Printer, Truck, Search, ArrowUpDown, MoreVertical } from 'lucide-react'
import { downloadRentalPDF, printRentalPDF, downloadAllRentalsPDF, printAllRentalsPDF } from '@/lib/pdf-utils'
import { TableSkeleton } from '@/components/SkeletonLoader'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

type SortField = 'start_date' | 'end_date' | 'user' | 'total_paid'
type SortOrder = 'asc' | 'desc'
type FilterStatus = 'all' | 'active' | 'returned' | 'overdue'

export function Rentals() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('start_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'collection' | 'shipping'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingRental, setEditingRental] = useState<Rental | null>(null)
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    user_id: '',
    device_id: '',
    start_date: '',
    end_date: '',
    rate: '',
    deposit: '',
    total_paid: '',
    returned_date: '',
    shipped_date: '',
    delivery_method: 'collection' as 'collection' | 'shipping',
    shipping_address: '',
  })
  const [selectedAccessories, setSelectedAccessories] = useState<{ accessory_id: string; quantity: number }[]>([])
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    loadRentals()
    loadUsers()
    loadDevices()
    loadAccessories()
  }, [])

  // Handle edit query parameter
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && rentals.length > 0) {
      const rental = rentals.find(r => r.id === editId)
      if (rental) {
        setEditingRental(rental)
        // Convert timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
        const formatForDateTimeLocal = (dateStr: string) => {
          if (!dateStr) return ''
          const date = new Date(dateStr)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }
        setFormData({
          user_id: rental.user_id,
          device_id: rental.device_id,
          start_date: formatForDateTimeLocal(rental.start_date),
          end_date: formatForDateTimeLocal(rental.end_date),
          rate: rental.rate.toString(),
          deposit: rental.deposit.toString(),
          total_paid: rental.total_paid.toString(),
          returned_date: rental.returned_date ?? '',
          shipped_date: rental.shipped_date ?? '',
          delivery_method: rental.delivery_method ?? 'collection',
          shipping_address: rental.shipping_address ?? '',
        })
        const accessories = rental.accessories?.map((ra) => ({
          accessory_id: ra.accessory_id,
          quantity: ra.quantity,
        })) ?? []
        setSelectedAccessories(accessories)
        setShowForm(true)
        setSearchParams({}) // Clear the query parameter
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rentals])

  const loadRentals = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await rentalsService.getAll()
      if (data) {
        setRentals(data)
      } else if (error) {
        const errorMsg = `Failed to load rentals: ${error.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading rentals'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await usersService.getAll()
      if (data) setUsers(data)
    } catch (err) {
      showError('Failed to load users')
    }
  }

  const loadDevices = async () => {
    try {
      const { data } = await devicesService.getAll()
      if (data) setDevices(data)
    } catch (err) {
      showError('Failed to load devices')
    }
  }

  const loadAccessories = async () => {
    try {
      const { data } = await accessoriesService.getAll()
      if (data) setAccessories(data)
    } catch (err) {
      showError('Failed to load accessories')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Convert datetime-local format to ISO string for database
      const convertToISO = (datetimeLocal: string) => {
        if (!datetimeLocal) return ''
        // datetime-local format is "YYYY-MM-DDTHH:mm" - convert to ISO
        return new Date(datetimeLocal).toISOString()
      }
      const submitData = {
        user_id: formData.user_id,
        device_id: formData.device_id,
        start_date: convertToISO(formData.start_date),
        end_date: convertToISO(formData.end_date),
        rate: parseFloat(formData.rate),
        deposit: parseFloat(formData.deposit),
        total_paid: parseFloat(formData.total_paid),
        returned_date: formData.returned_date || null,
        shipped_date: formData.shipped_date || null,
        delivery_method: formData.delivery_method,
        shipping_address: formData.delivery_method === 'shipping' ? (formData.shipping_address || null) : null,
      }
      if (editingRental) {
        const { error } = await rentalsService.update(editingRental.id, submitData, selectedAccessories)
        if (error) {
          showError(`Failed to update rental: ${error.message}`)
        } else {
          showSuccess('Rental updated successfully!')
          setShowForm(false)
          setEditingRental(null)
          resetForm()
          loadRentals()
        }
      } else {
      const { error } = await rentalsService.create(submitData, selectedAccessories)
      if (error) {
        showError(`Failed to create rental: ${error.message}`)
      } else {
        showSuccess('Rental created successfully!')
        setShowForm(false)
        resetForm()
        loadRentals()
      }
    }
  } catch {
    showError('An unexpected error occurred')
  }
  }

  const handleEdit = (rental: Rental, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingRental(rental)
    // Convert timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatForDateTimeLocal = (dateStr: string) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    setFormData({
      user_id: rental.user_id,
      device_id: rental.device_id,
      start_date: formatForDateTimeLocal(rental.start_date),
      end_date: formatForDateTimeLocal(rental.end_date),
      rate: rental.rate.toString(),
      deposit: rental.deposit.toString(),
      total_paid: rental.total_paid.toString(),
      returned_date: rental.returned_date ?? '',
      shipped_date: rental.shipped_date ?? '',
      delivery_method: rental.delivery_method ?? 'collection',
      shipping_address: rental.shipping_address ?? '',
    })
    const accessories = rental.accessories?.map((ra) => ({
      accessory_id: ra.accessory_id,
      quantity: ra.quantity,
    })) ?? []
    setSelectedAccessories(accessories)
    setShowForm(true)
  }

  const handleRowClick = (rentalId: string) => {
    navigate(`/rentals/${rentalId}`)
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (confirm('Are you sure you want to delete this rental?')) {
      try {
        const { error } = await rentalsService.delete(id)
        if (error) {
          showError(`Failed to delete rental: ${error.message}`)
        } else {
          showSuccess('Rental deleted successfully!')
          loadRentals()
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      device_id: '',
      start_date: '',
      end_date: '',
      rate: '',
      deposit: '',
      total_paid: '',
      returned_date: '',
      shipped_date: '',
      delivery_method: 'collection',
      shipping_address: '',
    })
    setSelectedAccessories([])
    setEditingRental(null)
  }

  const handleMarkAsReturned = async (rentalId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const { error } = await rentalsService.markRentalAsReturned(rentalId)
    if (!error) {
      showSuccess('Rental marked as returned')
      loadRentals()
    } else {
      showError(`Failed to mark as returned: ${error.message}`)
    }
  }

  const handleMarkAsShipped = async (rentalId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const { error } = await rentalsService.markRentalAsShipped(rentalId)
    if (!error) {
      showSuccess('Rental marked as shipped')
      loadRentals()
    } else {
      showError(`Failed to mark as shipped: ${error.message}`)
    }
  }

  const addAccessory = () => {
    setSelectedAccessories([...selectedAccessories, { accessory_id: '', quantity: 1 }])
  }

  const removeAccessory = (index: number) => {
    setSelectedAccessories(selectedAccessories.filter((_, i) => i !== index))
  }

  const updateAccessory = (index: number, field: 'accessory_id' | 'quantity', value: string | number) => {
    const updated = [...selectedAccessories]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedAccessories(updated)
  }

  const filteredAndSortedRentals = useMemo(() => {
    let filtered = [...rentals]
    const now = new Date()

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((rental) => {
        const userName = rental.user ? `${rental.user.first_name} ${rental.user.last_name}` : ''
        const deviceName = rental.device?.name || ''
        return (
          userName.toLowerCase().includes(searchLower) ||
          deviceName.toLowerCase().includes(searchLower) ||
          rental.id.toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((rental) => {
        if (filterStatus === 'returned') return !!rental.returned_date
        if (filterStatus === 'active') {
          if (rental.returned_date) return false
          const startDate = new Date(rental.start_date)
          const endDate = new Date(rental.end_date)
          return now >= startDate && now <= endDate
        }
        if (filterStatus === 'overdue') {
          if (rental.returned_date) return false
          const endDate = new Date(rental.end_date)
          return endDate < now
        }
        return true
      })
    }

    // Apply delivery method filter
    if (filterDelivery !== 'all') {
      filtered = filtered.filter((rental) => rental.delivery_method === filterDelivery)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'start_date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          break
        case 'end_date':
          comparison = new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          break
        case 'user': {
          const nameA = a.user ? `${a.user.first_name} ${a.user.last_name}` : ''
          const nameB = b.user ? `${b.user.first_name} ${b.user.last_name}` : ''
          comparison = nameA.localeCompare(nameB)
          break
        }
        case 'total_paid':
          comparison = a.total_paid - b.total_paid
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [rentals, searchTerm, sortField, sortOrder, filterStatus, filterDelivery])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Rentals</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage rental transactions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => downloadAllRentalsPDF(rentals)}
            variant="outline"
            className="border-black text-black hover:bg-gray-100 w-full sm:w-auto"
            disabled={rentals.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Download All PDF
          </Button>
          <Button
            onClick={() => printAllRentalsPDF(rentals)}
            variant="outline"
            className="border-black text-black hover:bg-gray-100 w-full sm:w-auto"
            disabled={rentals.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
          >
            New Rental
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingRental ? 'Edit Rental' : 'Add New Rental'}
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
                <label className="block text-sm font-medium text-black mb-1">User</label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Device</label>
                <select
                  required
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.device_type?.name ?? 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date || undefined}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Rate</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-black mb-1">Total Paid</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.total_paid}
                  onChange={(e) => setFormData({ ...formData, total_paid: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Shipped Date (Optional)</label>
                <input
                  type="date"
                  value={formData.shipped_date}
                  onChange={(e) => setFormData({ ...formData, shipped_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Returned Date (Optional)</label>
                <input
                  type="date"
                  value={formData.returned_date}
                  onChange={(e) => setFormData({ ...formData, returned_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Delivery Method</label>
                <select
                  required
                  value={formData.delivery_method}
                  onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value as 'collection' | 'shipping' })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="collection">Collection</option>
                  <option value="shipping">Shipping</option>
                </select>
              </div>
              {formData.delivery_method === 'shipping' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">Shipping Address</label>
                  <textarea
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                    rows={3}
                    placeholder="Enter shipping address"
                  />
                </div>
              )}
            </div>
            <div className="border-t-2 border-black pt-4 mt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-black">Accessories</h3>
                <Button
                  type="button"
                  onClick={addAccessory}
                  className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
                >
                  Add Accessory
                </Button>
              </div>
              {selectedAccessories.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                  <select
                    required
                    value={item.accessory_id}
                    onChange={(e) => updateAccessory(index, 'accessory_id', e.target.value)}
                    className="px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select accessory</option>
                    {accessories.map((accessory) => (
                      <option key={accessory.id} value={accessory.id}>
                        {accessory.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => updateAccessory(index, 'quantity', parseInt(e.target.value))}
                    className="px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Quantity"
                  />
                  <Button
                    type="button"
                    onClick={() => removeAccessory(index)}
                    variant="outline"
                    className="border-black text-black hover:bg-gray-100 w-full sm:w-auto"
                  >
                    Remove
                  </Button>
                </div>
              ))}
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
                {editingRental ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <ErrorMessage message={error} onRetry={loadRentals} />
      )}

      {/* Search and Filter */}
      <div className="bg-white border-2 border-black rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search rentals by user, device, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Search rentals"
            />
          </div>
          <div className="sm:w-48 relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="sm:w-48 relative">
            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value as 'all' | 'collection' | 'shipping')}
              className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Filter by delivery method"
            >
              <option value="all">All Delivery</option>
              <option value="collection">Collection</option>
              <option value="shipping">Shipping</option>
            </select>
          </div>
          <div className="sm:w-48 relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Sort by"
            >
              <option value="start_date">Sort by Start Date</option>
              <option value="end_date">Sort by End Date</option>
              <option value="user">Sort by User</option>
              <option value="total_paid">Sort by Total Paid</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        {(searchTerm || filterStatus !== 'all' || filterDelivery !== 'all') && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredAndSortedRentals.length} of {rentals.length} rentals
          </p>
        )}
      </div>

      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[800px]">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Device</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Shipped</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Returned</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8">
                  <TableSkeleton rows={5} columns={7} />
                </td>
              </tr>
            ) : filteredAndSortedRentals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {rentals.length === 0 ? 'No rentals found' : 'No rentals match your search criteria'}
                </td>
              </tr>
            ) : (
              filteredAndSortedRentals.map((rental) => {
                const primaryActions = [
                  {
                    label: 'Mark as Shipped',
                    icon: Truck,
                    onClick: (e: React.MouseEvent) => handleMarkAsShipped(rental.id, e),
                    show: !rental.shipped_date && rental.delivery_method === 'shipping',
                    className: 'text-blue-600',
                  },
                  {
                    label: 'Mark as Returned',
                    icon: CheckCircle,
                    onClick: (e: React.MouseEvent) => handleMarkAsReturned(rental.id, e),
                    show: !rental.returned_date,
                    className: 'text-green-600',
                  },
                  {
                    label: 'Download PDF',
                    icon: Download,
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation()
                      downloadRentalPDF(rental)
                    },
                    show: true,
                    className: 'text-blue-600',
                  },
                ].filter(action => action.show)

                const secondaryActions = [
                  {
                    label: 'Print',
                    icon: Printer,
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation()
                      printRentalPDF(rental)
                    },
                    className: 'text-blue-600',
                  },
                  {
                    label: 'Edit',
                    icon: Edit,
                    onClick: (e: React.MouseEvent) => handleEdit(rental, e),
                    className: 'text-black',
                  },
                  {
                    label: 'Delete',
                    icon: Trash2,
                    onClick: (e: React.MouseEvent) => handleDelete(rental.id, e),
                    className: 'text-red-600',
                  },
                ]

                // Show first 2 actions in row, rest in dropdown
                const visibleActions = primaryActions.slice(0, 2)
                const dropdownActions = [...primaryActions.slice(2), ...secondaryActions]

                return (
                  <tr
                    key={rental.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(rental.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rental.user ? `${rental.user.first_name} ${rental.user.last_name}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rental.device?.name ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(rental.start_date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(rental.end_date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rental.shipped_date ? (
                        <span className="text-sm text-blue-600">{rental.shipped_date}</span>
                      ) : rental.delivery_method === 'shipping' ? (
                        <span className="text-sm text-purple-600 font-semibold">Pending Shipment</span>
                      ) : (
                        <span className="text-sm text-gray-400">Not shipped</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rental.returned_date ? (
                        <span className="text-sm text-green-600">{rental.returned_date}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Not returned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {visibleActions.map((action, index) => {
                          const Icon = action.icon
                          return (
                            <button
                              key={index}
                              onClick={action.onClick}
                              className={`p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center ${action.className}`}
                              title={action.label}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          )
                        })}

                        {dropdownActions.length > 0 && (
                          <div className="relative z-[10000]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenActionsMenu(openActionsMenu === rental.id ? null : rental.id)
                              }}
                              className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>

                            {openActionsMenu === rental.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={() => setOpenActionsMenu(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-lg shadow-lg z-[9999]">
                                  <div className="py-1">
                                    {dropdownActions.map((action, index) => {
                                      const Icon = action.icon
                                      return (
                                        <button
                                          key={index}
                                          onClick={action.onClick}
                                          className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 ${action.className}`}
                                        >
                                          <Icon className="w-4 h-4" />
                                          {action.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
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

      {error && (
        <ErrorMessage message={error} onRetry={loadRentals} />
      )}
    </div>
  )
}
