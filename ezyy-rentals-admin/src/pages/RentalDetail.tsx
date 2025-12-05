import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { rentalsService } from '@/lib/supabase-service'
import type { Rental } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, CheckCircle, Download, Printer, Truck, MoreVertical } from 'lucide-react'
import { downloadRentalPDF, printRentalPDF } from '@/lib/pdf-utils'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function RentalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [rental, setRental] = useState<Rental | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  useEffect(() => {
    if (id) {
      loadRental()
    }
  }, [id])

  const loadRental = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: rentalError } = await rentalsService.getById(id)
      if (data) {
        setRental(data)
      } else if (rentalError) {
        const errorMsg = `Failed to load rental: ${rentalError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading rental'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsReturned = async () => {
    if (!id) return
    const { error } = await rentalsService.markRentalAsReturned(id)
    if (!error) {
      showSuccess('Rental marked as returned')
      loadRental()
    } else {
      showError(`Failed to mark as returned: ${error.message}`)
    }
  }

  const handleMarkAsShipped = async () => {
    if (!id) return
    const { error } = await rentalsService.markRentalAsShipped(id)
    if (!error) {
      showSuccess('Rental marked as shipped')
      loadRental()
    } else {
      showError(`Failed to mark as shipped: ${error.message}`)
    }
  }

  const handleDelete = async () => {
    if (!id || !rental) return
    if (confirm('Are you sure you want to delete this rental?')) {
      try {
        const { error } = await rentalsService.delete(id)
        if (error) {
          showError(`Failed to delete rental: ${error.message}`)
        } else {
          showSuccess('Rental deleted successfully!')
          navigate('/rentals')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/rentals?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !rental) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/rentals')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rentals
        </Button>
        <ErrorMessage message={error ?? 'Rental not found'} onRetry={loadRental} />
      </div>
    )
  }

  const primaryActions = [
    {
      label: 'Mark as Shipped',
      icon: Truck,
      onClick: handleMarkAsShipped,
      show: !rental.shipped_date && rental.delivery_method === 'shipping',
      className: 'text-blue-600',
    },
    {
      label: 'Mark as Returned',
      icon: CheckCircle,
      onClick: handleMarkAsReturned,
      show: !rental.returned_date,
      className: 'text-green-600',
    },
    {
      label: 'Download PDF',
      icon: Download,
      onClick: () => downloadRentalPDF(rental),
      show: true,
      className: 'text-blue-600',
    },
    {
      label: 'Print',
      icon: Printer,
      onClick: () => printRentalPDF(rental),
      show: true,
      className: 'text-blue-600',
    },
  ].filter(action => action.show)

  const secondaryActions = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: handleEdit,
      className: 'text-black',
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: handleDelete,
      className: 'text-red-600',
    },
  ]

  // Show first 3 actions in row, rest in dropdown
  const visibleActions = primaryActions.slice(0, 3)
  const dropdownActions = [...primaryActions.slice(3), ...secondaryActions]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/rentals')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Rental Details</h1>
            <p className="text-sm sm:text-base text-gray-600">Rental ID: {rental.id}</p>
          </div>
        </div>

        {/* Actions in top right */}
        <div className="flex items-center gap-2 relative">
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
          </div>

          {dropdownActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {showActionsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionsMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-lg shadow-lg z-20">
                    <div className="py-1">
                      {dropdownActions.map((action, index) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              action.onClick()
                              setShowActionsMenu(false)
                            }}
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
      </div>

      <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6 space-y-6">
        {/* User Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">User Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-base text-black">
                {rental.user ? `${rental.user.first_name} ${rental.user.last_name}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-base text-black">{rental.user?.email ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <p className="text-base text-black">{rental.user?.phone ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ID Number</label>
              <p className="text-base text-black">{rental.user?.id_number ?? 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Device Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Device Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Name</label>
              <p className="text-base text-black">{rental.device?.name ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Type</label>
              <p className="text-base text-black">{rental.device?.device_type?.name ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Serial Number</label>
              <p className="text-base text-black">{rental.device?.serial_number ?? 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Rental Details */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Rental Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
              <p className="text-base text-black">{rental.start_date}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
              <p className="text-base text-black">{rental.end_date}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rate</label>
              <p className="text-base text-black">${rental.rate.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Deposit</label>
              <p className="text-base text-black">${rental.deposit.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Paid</label>
              <p className="text-base text-black">${rental.total_paid.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Delivery Method</label>
              <p className="text-base text-black">
                <span className={`font-medium ${rental.delivery_method === 'shipping' ? 'text-blue-600' : 'text-gray-700'}`}>
                  {rental.delivery_method === 'shipping' ? 'Shipping' : 'Collection'}
                </span>
                {rental.delivery_method === 'shipping' && !rental.shipped_date && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    ⚠️ Pending Shipment
                  </span>
                )}
              </p>
            </div>
            {rental.delivery_method === 'shipping' && rental.shipping_address && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Shipping Address</label>
                <p className="text-base text-black">{rental.shipping_address}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Shipped Date</label>
              <p className="text-base text-black">
                {rental.shipped_date ? (
                  <span className="text-blue-600">{rental.shipped_date}</span>
                ) : (
                  <span className="text-gray-400">Not shipped</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Returned Date</label>
              <p className="text-base text-black">
                {rental.returned_date ? (
                  <span className="text-green-600">{rental.returned_date}</span>
                ) : (
                  <span className="text-gray-400">Not returned</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-base text-black">{new Date(rental.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(rental.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Accessories */}
        {rental.accessories && rental.accessories.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Accessories</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-sm font-medium text-black border-2 border-black">Accessory</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-black border-2 border-black">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {rental.accessories.map((rentalAccessory) => (
                    <tr key={rentalAccessory.id} className="border-b-2 border-black">
                      <td className="px-4 py-2 text-black">
                        {rentalAccessory.accessory?.name ?? 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-black">{rentalAccessory.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

