import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usersService } from '@/lib/supabase-service'
import type { User } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadUser()
    }
  }, [id])

  const loadUser = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: userError } = await usersService.getById(id)
      if (data) {
        setUser(data)
      } else if (userError) {
        const errorMsg = `Failed to load user: ${userError.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading user'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !user) return
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const { error } = await usersService.delete(id)
        if (error) {
          showError(`Failed to delete user: ${error.message}`)
        } else {
          showSuccess('User deleted successfully!')
          navigate('/users')
        }
      } catch (err) {
        showError('An unexpected error occurred')
      }
    }
  }

  const handleEdit = () => {
    if (id) {
      navigate(`/users?edit=${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/users')}
          variant="outline"
          className="border-black text-black hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
        <ErrorMessage message={error ?? 'User not found'} onRetry={loadUser} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/users')}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">User Details</h1>
            <p className="text-sm sm:text-base text-gray-600">User ID: {user.id}</p>
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
        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <p className="text-base text-black">{user.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <p className="text-base text-black">{user.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-base text-black">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <p className="text-base text-black">{user.telephone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ID Number</label>
              <p className="text-base text-black">{user.id_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
              <p className="text-base text-black">{user.date_of_birth}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Address Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
              <p className="text-base text-black">{user.address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
              <p className="text-base text-black">{user.city ?? 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
              <p className="text-base text-black">{user.country ?? 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Next of Kin Information */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Next of Kin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <p className="text-base text-black">{user.next_of_kin_first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <p className="text-base text-black">{user.next_of_kin_last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
              <p className="text-base text-black">{user.next_of_kin_phone_number}</p>
            </div>
          </div>
        </div>

        {/* Profile Picture */}
        {user.profile_picture && (
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Profile Picture</h2>
            <div className="flex justify-start">
              <img
                src={user.profile_picture}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-32 h-32 object-cover rounded-lg border-2 border-black"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
              <p className="text-base text-black">{new Date(user.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Updated At</label>
              <p className="text-base text-black">{new Date(user.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

