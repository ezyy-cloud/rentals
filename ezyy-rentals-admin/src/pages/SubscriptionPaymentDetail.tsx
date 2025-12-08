import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subscriptionPaymentsService } from '@/lib/supabase-service'
import type { SubscriptionPayment } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function SubscriptionPaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadPayment()
    }
  }, [id])

  const loadPayment = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: paymentError } = await subscriptionPaymentsService.getById(id)
      if (data) {
        setPayment(data)
      } else if (paymentError) {
        const errorMsg = `Failed to load payment: ${paymentError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading payment'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !payment) return
    if (confirm('Are you sure you want to delete this payment?')) {
      try {
        const { error } = await subscriptionPaymentsService.delete(id)
        if (error) {
          showError(`Failed to delete payment: ${error.message}`)
        } else {
          showSuccess('Payment deleted successfully!')
          navigate('/subscription-payments')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/subscription-payments?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/subscription-payments')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subscription Payments
        </Button>
        <ErrorMessage message={error ?? 'Payment not found'} onRetry={loadPayment} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/subscription-payments')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Subscription Payment Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Payment ID: {payment.id}</p>
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
        {/* Device Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Device Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Name</label>
              <p className="text-base text-black">{payment.device?.name ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Type</label>
              <p className="text-base text-black">{payment.device?.device_type?.name ?? 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Payment Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Payment Date</label>
              <p className="text-base text-black">{payment.payment_date}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount</label>
              <p className="text-base text-black font-semibold">${payment.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Payment Method</label>
              <p className="text-base text-black">{payment.payment_method}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <p className="text-base text-black">
                <span className={`font-semibold ${
                  payment.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {payment.status}
                </span>
              </p>
            </div>
            {payment.notes && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                <p className="text-base text-black">{payment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-base text-black">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(payment.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


