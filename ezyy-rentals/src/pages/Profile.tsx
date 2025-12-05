import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usersService } from '@/lib/services'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { User, Save } from 'lucide-react'

export function Profile() {
  const { appUser, refreshAppUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    address: '',
    city: '',
    country: '',
    id_number: '',
    date_of_birth: '',
    next_of_kin_first_name: '',
    next_of_kin_last_name: '',
    next_of_kin_phone_number: '',
  })

  useEffect(() => {
    if (appUser) {
      setFormData({
        first_name: appUser.first_name,
        last_name: appUser.last_name,
        telephone: appUser.telephone,
        address: appUser.address,
        city: appUser.city ?? '',
        country: appUser.country ?? '',
        id_number: appUser.id_number,
        date_of_birth: appUser.date_of_birth,
        next_of_kin_first_name: appUser.next_of_kin_first_name,
        next_of_kin_last_name: appUser.next_of_kin_last_name,
        next_of_kin_phone_number: appUser.next_of_kin_phone_number,
      })
    }
  }, [appUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUser) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await usersService.update(appUser.id, formData)
      if (error) {
        const errorMsg = error.message
        setError(errorMsg)
        showError(errorMsg)
      } else {
        setSuccess(true)
        showSuccess('Profile updated successfully!')
        await refreshAppUser()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      const errorMsg = 'An error occurred while updating your profile'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
          <div className="text-lg text-black">Loading...</div>
        </div>
      </div>
    )
  }

  if (!appUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You must be logged in to view your profile</p>
        <Button onClick={() => window.location.reload()} className="bg-black text-white hover:bg-gray-800">
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      {success && (
        <div className="bg-green-50 border-2 border-green-500 text-green-700 px-4 py-3 rounded">
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black">
              {appUser.first_name} {appUser.last_name}
            </h2>
            <p className="text-gray-600">{appUser.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => updateField('telephone', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">ID Number *</label>
                <input
                  type="text"
                  required
                  value={formData.id_number}
                  onChange={(e) => updateField('id_number', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-6">
            <h3 className="text-lg font-semibold text-black mb-4">Next of Kin Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.next_of_kin_first_name}
                  onChange={(e) => updateField('next_of_kin_first_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.next_of_kin_last_name}
                  onChange={(e) => updateField('next_of_kin_last_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.next_of_kin_phone_number}
                  onChange={(e) => updateField('next_of_kin_phone_number', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-black text-white hover:bg-gray-800"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

