import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionPaymentsService, devicesService } from '@/lib/supabase-service'
import type { SubscriptionPayment, Device } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2 } from 'lucide-react'

export function SubscriptionPayments() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<SubscriptionPayment | null>(null)
  const [formData, setFormData] = useState({
    device_id: '',
    payment_date: '',
    amount: '',
    payment_method: '',
    notes: '',
    status: 'Paid' as 'Paid' | 'Pending',
  })
  const [filterDevice, setFilterDevice] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const loadPayments = useCallback(async () => {
    setLoading(true)
    const { data, error } = await subscriptionPaymentsService.getAll()
    if (data) setPayments(data)
    if (error) console.error('Error loading payments:', error)
    setLoading(false)
  }, [])

  const loadDevices = useCallback(async () => {
    const { data } = await devicesService.getAll()
    if (data) {
      // Filter to only devices with subscriptions
      const devicesWithSubscriptions = data.filter(d => d.device_type?.has_subscription)
      setDevices(devicesWithSubscriptions)
    }
  }, [])

  useEffect(() => {
    // Load data on component mount
    // Note: These async functions call setState asynchronously, which is safe
    // The linter warning is a false positive for async data loading patterns
    const loadData = async () => {
      await loadPayments()
      await loadDevices()
    }
    void loadData()
  }, [loadPayments, loadDevices])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      amount: Number.parseFloat(formData.amount),
      notes: formData.notes || null,
    }
    if (editingPayment) {
      const { error } = await subscriptionPaymentsService.update(editingPayment.id, submitData)
      if (!error) {
        setShowForm(false)
        setEditingPayment(null)
        resetForm()
        loadPayments()
      }
    } else {
      const { error } = await subscriptionPaymentsService.create(submitData)
      if (!error) {
        setShowForm(false)
        resetForm()
        loadPayments()
      }
    }
  }

  const handleEdit = (payment: SubscriptionPayment) => {
    setEditingPayment(payment)
    setFormData({
      device_id: payment.device_id,
      payment_date: payment.payment_date,
      amount: payment.amount.toString(),
      payment_method: payment.payment_method,
      notes: payment.notes ?? '',
      status: payment.status,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      const { error } = await subscriptionPaymentsService.delete(id)
      if (!error) loadPayments()
    }
  }

  const resetForm = () => {
    setFormData({
      device_id: '',
      payment_date: '',
      amount: '',
      payment_method: '',
      notes: '',
      status: 'Paid',
    })
    setEditingPayment(null)
  }

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    setFormData({
      ...formData,
      device_id: deviceId,
      amount: device?.device_type?.subscription_cost?.toString() ?? '',
    })
  }

  const filteredPayments = payments.filter(payment => {
    if (filterDevice && payment.device_id !== filterDevice) return false
    if (filterStatus && payment.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Subscription Payments</h1>
          <p className="text-sm sm:text-base text-gray-600">Track subscription payments for devices</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
        >
          Add Payment
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingPayment ? 'Edit Payment' : 'Add New Payment'}
            </h2>
            <button 
              onClick={() => {
                setShowForm(false)
                resetForm()
              }} 
              className="text-black hover:text-gray-600"
              aria-label="Close form"
              title="Close form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="device-select" className="block text-sm font-medium text-black mb-1">Device</label>
                <select
                  id="device-select"
                  required
                  value={formData.device_id}
                  onChange={(e) => handleDeviceSelect(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="Select device"
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
                <label htmlFor="payment-date" className="block text-sm font-medium text-black mb-1">Payment Date</label>
                <input
                  id="payment-date"
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="Payment date"
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-black mb-1">Amount</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="Payment amount"
                />
              </div>
              <div>
                <label htmlFor="payment-method" className="block text-sm font-medium text-black mb-1">Payment Method</label>
                <select
                  id="payment-method"
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="Payment method"
                >
                  <option value="">Select method</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-black mb-1">Status</label>
                <select
                  id="status"
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Paid' | 'Pending' })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="Payment status"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-black mb-1">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                  placeholder="Additional notes about the payment"
                  aria-label="Payment notes"
                />
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
              <Button type="submit" className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto">
                {editingPayment ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-black rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-device" className="block text-sm font-medium text-black mb-1">Filter by Device</label>
            <select
              id="filter-device"
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Filter by device"
            >
              <option value="">All devices</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-black mb-1">Filter by Status</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Device</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Payment Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Payment Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            )}
            {!loading && filteredPayments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments found</td>
              </tr>
            )}
            {!loading && filteredPayments.length > 0 && (
              <>
                {filteredPayments.map((payment) => (
                <tr 
                  key={payment.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/subscription-payments/${payment.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.device?.name ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{payment.payment_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${payment.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{payment.payment_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.status === 'Paid' ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        {payment.status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {payment.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{payment.notes ?? 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(payment)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

